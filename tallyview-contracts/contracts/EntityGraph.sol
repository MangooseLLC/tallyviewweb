// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {TallyviewTypes} from "./libraries/TallyviewTypes.sol";
import {IAuditLedger} from "./interfaces/IAuditLedger.sol";
import {IEntityGraph} from "./interfaces/IEntityGraph.sol";

/// @title EntityGraph
/// @author Tallyview
/// @notice Cross-organizational relationship graph for nonprofit fraud pattern
///         detection on the Tallyview Avalanche L1.
///
///         EntityGraph is a data layer, not a detection layer. It stores confirmed
///         relationship edges between entities (people, vendors, addresses) and
///         organizations. The SaaS AI layer detects suspicious patterns from those
///         relationships and writes findings to AnomalyRegistry. This separation
///         means detection logic can evolve without contract upgrades.
///
///         The power is in the cross. A single nonprofit's accounting system knows
///         its own board members and its own vendors. But it has no visibility into
///         whether board member John Reeves also serves on three other nonprofit
///         boards, all of which use Reeves & Associates LLC as a vendor. That
///         pattern — shared governance overlapping with shared vendor relationships —
///         is a classic fraud indicator. EntityGraph makes it visible onchain.
///
///         Entities are privacy-preserving: identityHash is a keccak256 fingerprint
///         of the real identity data (name + DOB for people, EIN/name for vendors,
///         normalized string for addresses). Raw PII stays offchain. The label field
///         provides a human-readable name for dashboard display.
///
///         Edges are immutable records. Deactivating an edge sets status to Inactive
///         and records endDate, but never deletes the edge. The historical record of
///         who was connected to whom, and when, matters for investigations.
/// @dev UUPS upgradeable. Deployed behind an ERC1967 proxy.
///      References IAuditLedger for org validation on edge creation — does not
///      duplicate org storage. Does NOT import IComplianceEngine or IAnomalyRegistry.
///      Standalone data layer with no circular dependencies.
contract EntityGraph is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IEntityGraph
{
    // -------------------------------------------------------------------------
    //  Roles
    // -------------------------------------------------------------------------

    /// @notice Platform administrators. Can create entities, create/deactivate edges,
    ///         deactivate entities, and authorize upgrades.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Granted to the Tallyview relay service. Can create entities and
    ///         create/deactivate edges. The relay is the primary writer — it
    ///         receives confirmed relationships from the SaaS entity resolution
    ///         pipeline and commits them onchain.
    bytes32 public constant SYSTEM_ROLE = keccak256("SYSTEM_ROLE");

    // -------------------------------------------------------------------------
    //  Constants
    // -------------------------------------------------------------------------

    /// @notice Maximum byte length for entity labels. Enforced on creation.
    uint256 public constant MAX_LABEL_LENGTH = 100;

    // -------------------------------------------------------------------------
    //  Storage
    // -------------------------------------------------------------------------

    /// @notice Reference to the AuditLedger contract for org validation.
    ///         Set once in initialize; follows proxy upgrades automatically.
    IAuditLedger public auditLedger;

    /// @dev Entities keyed by caller-provided entityId.
    ///      A stored createdAt of 0 means the entity does not exist.
    mapping(bytes32 => TallyviewTypes.Entity) private _entities;

    /// @dev Relationship edges keyed by caller-provided edgeId.
    ///      A stored entityId of bytes32(0) means the edge does not exist.
    mapping(bytes32 => TallyviewTypes.RelationshipEdge) private _edges;

    /// @dev Edge IDs per entity for enumeration.
    mapping(bytes32 => bytes32[]) private _entityEdges;

    /// @dev Edge IDs per organization for enumeration.
    mapping(address => bytes32[]) private _orgEdges;

    /// @dev Unique entity IDs per organization (deduplicated at write time).
    mapping(address => bytes32[]) private _orgEntities;

    /// @dev Unique org addresses per entity — the key fraud query index.
    ///      "Which organizations share this board member/vendor/address?"
    mapping(bytes32 => address[]) private _entityOrgs;

    /// @dev Deduplication guard: has this entity already been linked to this org
    ///      in the _orgEntities and _entityOrgs arrays? Prevents duplicate entries
    ///      when multiple edges connect the same entity to the same org (e.g., same
    ///      person is both BoardMember and KeyEmployee).
    mapping(bytes32 => mapping(address => bool)) private _entityOrgLinked;

    /// @dev Reserved storage for future upgrades.
    uint256[50] private __gap;

    // -------------------------------------------------------------------------
    //  Initialization
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the contract. Called once through the proxy.
    ///         Grants the deployer DEFAULT_ADMIN_ROLE and ADMIN_ROLE, and stores
    ///         the IAuditLedger reference used for org validation on edge creation.
    /// @param auditLedgerAddress The deployed AuditLedger proxy address.
    function initialize(address auditLedgerAddress) public initializer {
        if (auditLedgerAddress == address(0)) revert ZeroAddress();

        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        auditLedger = IAuditLedger(auditLedgerAddress);
    }

    // -------------------------------------------------------------------------
    //  Entity Management
    // -------------------------------------------------------------------------

    /// @inheritdoc IEntityGraph
    /// @dev The relay computes deterministic entityIds from the offchain entity
    ///      resolution pipeline (e.g., keccak256 of a normalized name + DOB).
    ///      This allows the same entity to be referenced consistently across
    ///      multiple edge creations without onchain entity resolution.
    function createEntity(
        bytes32 entityId,
        TallyviewTypes.EntityType entityType,
        bytes32 identityHash,
        string calldata label
    ) external {
        if (
            !hasRole(SYSTEM_ROLE, msg.sender)
                && !hasRole(ADMIN_ROLE, msg.sender)
        ) revert Unauthorized();

        if (entityId == bytes32(0)) revert EntityNotFound();
        if (_entities[entityId].createdAt > 0) revert EntityAlreadyExists();
        if (bytes(label).length == 0) revert EmptyLabel();
        if (bytes(label).length > MAX_LABEL_LENGTH) revert LabelTooLong();

        _entities[entityId] = TallyviewTypes.Entity({
            entityType: entityType,
            createdAt: uint48(block.timestamp),
            active: true,
            identityHash: identityHash,
            label: label
        });

        emit EntityCreated(entityId, entityType);
    }

    /// @inheritdoc IEntityGraph
    /// @dev Edges are NOT automatically deactivated — they have independent
    ///      lifecycles. A deactivated entity's existing edges remain active
    ///      until explicitly deactivated via deactivateEdge.
    function deactivateEntity(bytes32 entityId) external {
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized();

        TallyviewTypes.Entity storage entity = _entities[entityId];
        if (entity.createdAt == 0) revert EntityNotFound();
        if (!entity.active) revert EntityNotActive();

        entity.active = false;

        emit EntityDeactivated(entityId);
    }

    /// @inheritdoc IEntityGraph
    function getEntity(
        bytes32 entityId
    ) external view returns (TallyviewTypes.Entity memory) {
        return _entities[entityId];
    }

    /// @inheritdoc IEntityGraph
    function isEntityActive(
        bytes32 entityId
    ) external view returns (bool) {
        TallyviewTypes.Entity storage entity = _entities[entityId];
        return entity.createdAt > 0 && entity.active;
    }

    // -------------------------------------------------------------------------
    //  Relationship Edges
    // -------------------------------------------------------------------------

    /// @inheritdoc IEntityGraph
    /// @dev Validates entity existence + active status and org registered + active
    ///      status before storing. Updates four index arrays:
    ///        1. edgeId → entity's edges
    ///        2. edgeId → org's edges
    ///        3. entityId → org's entities (deduplicated)
    ///        4. org → entity's orgs (deduplicated)
    ///      The deduplication mapping prevents duplicate entries in arrays 3 and 4
    ///      when multiple edges connect the same entity to the same org.
    function createEdge(
        bytes32 edgeId,
        bytes32 entityId,
        address org,
        TallyviewTypes.RelationshipType relationshipType,
        uint48 startDate,
        bytes32 evidenceHash
    ) external {
        if (
            !hasRole(SYSTEM_ROLE, msg.sender)
                && !hasRole(ADMIN_ROLE, msg.sender)
        ) revert Unauthorized();

        TallyviewTypes.Entity storage entity = _entities[entityId];
        if (entity.createdAt == 0) revert EntityNotFound();
        if (!entity.active) revert EntityNotActive();

        _validateOrg(org);

        if (edgeId == bytes32(0)) revert EdgeNotFound();
        if (_edges[edgeId].entityId != bytes32(0)) revert EdgeAlreadyExists();

        _edges[edgeId] = TallyviewTypes.RelationshipEdge({
            entityId: entityId,
            org: org,
            relationshipType: relationshipType,
            status: TallyviewTypes.EdgeStatus.Active,
            startDate: startDate,
            endDate: 0,
            evidenceHash: evidenceHash
        });

        _entityEdges[entityId].push(edgeId);
        _orgEdges[org].push(edgeId);

        if (!_entityOrgLinked[entityId][org]) {
            _orgEntities[org].push(entityId);
            _entityOrgs[entityId].push(org);
            _entityOrgLinked[entityId][org] = true;
        }

        emit EdgeCreated(edgeId, entityId, org, relationshipType);
    }

    /// @inheritdoc IEntityGraph
    /// @dev Sets endDate and status but does NOT remove the edge from any arrays.
    ///      History is permanent — investigators need to see when relationships
    ///      existed and when they ended. Reverts on already-inactive edges to
    ///      preserve the original endDate timestamp.
    function deactivateEdge(bytes32 edgeId) external {
        if (
            !hasRole(SYSTEM_ROLE, msg.sender)
                && !hasRole(ADMIN_ROLE, msg.sender)
        ) revert Unauthorized();

        TallyviewTypes.RelationshipEdge storage edge = _edges[edgeId];
        if (edge.entityId == bytes32(0)) revert EdgeNotFound();
        if (edge.status == TallyviewTypes.EdgeStatus.Inactive) {
            revert EdgeAlreadyInactive();
        }

        edge.endDate = uint48(block.timestamp);
        edge.status = TallyviewTypes.EdgeStatus.Inactive;

        emit EdgeDeactivated(edgeId);
    }

    /// @inheritdoc IEntityGraph
    function getEdge(
        bytes32 edgeId
    ) external view returns (TallyviewTypes.RelationshipEdge memory) {
        return _edges[edgeId];
    }

    /// @inheritdoc IEntityGraph
    function isEdgeActive(bytes32 edgeId) external view returns (bool) {
        TallyviewTypes.RelationshipEdge storage edge = _edges[edgeId];
        return edge.entityId != bytes32(0)
            && edge.status == TallyviewTypes.EdgeStatus.Active;
    }

    // -------------------------------------------------------------------------
    //  Cross-Organizational Queries
    // -------------------------------------------------------------------------

    /// @inheritdoc IEntityGraph
    function getEdgesForEntity(
        bytes32 entityId
    ) external view returns (bytes32[] memory) {
        return _entityEdges[entityId];
    }

    /// @inheritdoc IEntityGraph
    function getEdgesForOrg(
        address org
    ) external view returns (bytes32[] memory) {
        return _orgEdges[org];
    }

    /// @inheritdoc IEntityGraph
    function getEntitiesForOrg(
        address org
    ) external view returns (bytes32[] memory) {
        return _orgEntities[org];
    }

    /// @inheritdoc IEntityGraph
    /// @dev The key cross-organizational query for fraud detection. Returns all
    ///      organizations connected to an entity — deduplicated at write time.
    ///      When a regulator asks "where else does this vendor operate?", this
    ///      function answers directly from the onchain index.
    function getOrgsForEntity(
        bytes32 entityId
    ) external view returns (address[] memory) {
        return _entityOrgs[entityId];
    }

    /// @inheritdoc IEntityGraph
    /// @dev Two-pass nested loop: count matches first, then allocate and fill.
    ///      Iterates the SHORTER entity list against the longer one for efficiency.
    ///      Solidity does not support mappings in memory, so a simple nested loop
    ///      is the only option. O(n*m) is acceptable for view calls on the
    ///      Tallyview L1 with reasonable entity counts (hundreds per org).
    function getSharedEntities(
        address orgA,
        address orgB
    ) external view returns (bytes32[] memory) {
        bytes32[] storage entitiesA = _orgEntities[orgA];
        bytes32[] storage entitiesB = _orgEntities[orgB];

        bytes32[] storage shorter = entitiesA.length <= entitiesB.length
            ? entitiesA
            : entitiesB;
        bytes32[] storage longer = entitiesA.length <= entitiesB.length
            ? entitiesB
            : entitiesA;

        uint256 shortLen = shorter.length;
        uint256 longLen = longer.length;

        uint256 count;
        for (uint256 i; i < shortLen; ) {
            bytes32 eid = shorter[i];
            for (uint256 j; j < longLen; ) {
                if (longer[j] == eid) {
                    unchecked { ++count; }
                    break;
                }
                unchecked { ++j; }
            }
            unchecked { ++i; }
        }

        bytes32[] memory result = new bytes32[](count);
        uint256 cursor;
        for (uint256 i; i < shortLen; ) {
            bytes32 eid = shorter[i];
            for (uint256 j; j < longLen; ) {
                if (longer[j] == eid) {
                    result[cursor] = eid;
                    unchecked { ++cursor; }
                    break;
                }
                unchecked { ++j; }
            }
            unchecked { ++i; }
        }

        return result;
    }

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @inheritdoc IEntityGraph
    /// @dev activeEdges requires iteration because edges can be deactivated
    ///      independently. totalEdges and uniqueEntities are O(1) reads from
    ///      array lengths.
    function getOrgGraphSummary(
        address org
    )
        external
        view
        returns (
            uint256 totalEdges,
            uint256 activeEdges,
            uint256 uniqueEntities
        )
    {
        bytes32[] storage edgeIds = _orgEdges[org];
        totalEdges = edgeIds.length;

        for (uint256 i; i < totalEdges; ) {
            if (_edges[edgeIds[i]].status == TallyviewTypes.EdgeStatus.Active) {
                unchecked { ++activeEdges; }
            }
            unchecked { ++i; }
        }

        uniqueEntities = _orgEntities[org].length;
    }

    // -------------------------------------------------------------------------
    //  UUPS
    // -------------------------------------------------------------------------

    /// @dev Only ADMIN_ROLE can authorize upgrades.
    function _authorizeUpgrade(
        address
    ) internal override onlyRole(ADMIN_ROLE) {}

    // -------------------------------------------------------------------------
    //  Internal Helpers
    // -------------------------------------------------------------------------

    /// @dev Validate that an org is registered and active in AuditLedger.
    ///      Reverts with OrgNotRegistered or OrgNotActive.
    function _validateOrg(address org) internal view {
        if (!auditLedger.isOrganizationRegistered(org)) revert OrgNotRegistered();
        if (!auditLedger.isOrganizationActive(org)) revert OrgNotActive();
    }
}
