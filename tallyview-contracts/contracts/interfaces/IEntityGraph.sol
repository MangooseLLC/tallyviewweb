// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TallyviewTypes} from "../libraries/TallyviewTypes.sol";

/// @title IEntityGraph
/// @author Tallyview
/// @notice Cross-organizational relationship graph for nonprofit fraud pattern
///         detection on the Tallyview Avalanche L1.
///
///         EntityGraph is a **data layer, not a detection layer.** It stores confirmed
///         relationship edges between entities (people, vendors, addresses) and
///         organizations. The SaaS AI layer detects suspicious patterns from those
///         relationships and writes findings to AnomalyRegistry. This separation means
///         detection logic can evolve without contract upgrades.
///
///         The power is in the *cross.* A single nonprofit's accounting system knows its
///         own board members and its own vendors. But it has no visibility into whether
///         board member John Reeves also serves on three other nonprofit boards, all of
///         which use Reeves & Associates LLC as a vendor. That pattern — shared governance
///         overlapping with shared vendor relationships — is a classic fraud indicator.
///         EntityGraph makes it visible onchain.
///
///         Entities are privacy-preserving. A person named "John Reeves" is stored as
///         identityHash = keccak256(abi.encodePacked("john-reeves-1965-03-15")) with a
///         human-readable label for dashboard display. The raw identifying information
///         stays offchain. This lets the contract store cross-organizational relationships
///         without putting PII onchain, while still enabling graph queries ("which
///         organizations share entity X?").
///
///         The key queries:
///           - getOrgsForEntity: "Where else does this vendor/board member/address appear?"
///           - getSharedEntities: "What do these two nonprofits have in common?"
///
///         These are the queries that power conflict-of-interest detection across the
///         network. When a regulator asks "show me all organizations connected to this
///         vendor," getOrgsForEntity answers without relying on Tallyview's analysis.
///
///         Edges are immutable records. Deactivating an edge sets status to Inactive and
///         records endDate, but never deletes the edge. The historical record of who was
///         connected to whom, and when, matters for investigations.
///
///         EntityGraph references IAuditLedger for org validation — it does not duplicate
///         org storage. It does NOT import IComplianceEngine or IAnomalyRegistry. It is
///         a standalone data layer with no circular dependencies.
///
///         Rich events on every state change enable real-time dashboard consumption via
///         Avalanche's sub-second finality. Investigator dashboards can show real-time
///         relationship maps as edges are created.
interface IEntityGraph {
    // -------------------------------------------------------------------------
    //  Errors
    // -------------------------------------------------------------------------

    error EntityNotFound();
    error EntityNotActive();
    error EntityAlreadyExists();
    error EdgeNotFound();
    error EdgeAlreadyExists();
    error EdgeAlreadyInactive();
    error OrgNotRegistered();
    error OrgNotActive();
    error Unauthorized();
    error ZeroAddress();
    error EmptyLabel();
    error LabelTooLong();

    // -------------------------------------------------------------------------
    //  Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new entity is registered in the graph.
    ///         The label is intentionally excluded — same rationale as AnomalyRegistry
    ///         (avoid string gas costs in events). The label is readable from
    ///         getEntity(entityId) after the event fires. The event carries the entityId
    ///         and entityType — enough for dashboard filtering and indexing.
    event EntityCreated(
        bytes32 indexed entityId,
        TallyviewTypes.EntityType entityType
    );

    /// @notice Emitted when an entity is soft-deactivated. The entity data remains
    ///         onchain and queryable. Existing edges are NOT automatically deactivated —
    ///         edges have independent lifecycles.
    event EntityDeactivated(bytes32 indexed entityId);

    /// @notice Emitted when a relationship edge is created between an entity and
    ///         an organization. The three indexed parameters enable efficient filtering:
    ///         by edge, by entity, or by org.
    event EdgeCreated(
        bytes32 indexed edgeId,
        bytes32 indexed entityId,
        address indexed org,
        TallyviewTypes.RelationshipType relationshipType
    );

    /// @notice Emitted when a relationship edge is deactivated (board member resigned,
    ///         vendor contract terminated). The edge data remains onchain — only status
    ///         and endDate are updated.
    event EdgeDeactivated(bytes32 indexed edgeId);

    // -------------------------------------------------------------------------
    //  Entity Management
    // -------------------------------------------------------------------------

    /// @notice Register an entity (person, vendor, or address) in the relationship graph.
    ///         Entities exist independently of organizations — a person can be registered
    ///         before being linked to any org. The relay computes deterministic entityIds
    ///         from the offchain entity resolution pipeline, allowing the same entity to
    ///         be referenced consistently across multiple edge creations.
    /// @dev    Only SYSTEM_ROLE or ADMIN_ROLE. Reverts with EntityAlreadyExists if the
    ///         entityId is already registered (check: createdAt > 0). Label must be
    ///         non-empty and at most MAX_LABEL_LENGTH bytes.
    /// @param entityId     Caller-provided unique identifier (typically keccak256 of a
    ///                     deterministic string from the entity resolution pipeline).
    /// @param entityType   Classification: Person, Vendor, or Address.
    /// @param identityHash Privacy-preserving fingerprint of the real identity data
    ///                     (e.g., keccak256 of "john-reeves-1965-03-15" for a person,
    ///                     EIN/name hash for a vendor, normalized address string for an
    ///                     address). Separate from entityId to give the relay flexibility
    ///                     in ID schemes.
    /// @param label        Human-readable name for dashboard display (e.g., "John Reeves",
    ///                     "Reeves & Associates LLC", "1847 NW Flanders St, Portland OR").
    ///                     Required on creation, max 100 bytes.
    function createEntity(
        bytes32 entityId,
        TallyviewTypes.EntityType entityType,
        bytes32 identityHash,
        string calldata label
    ) external;

    /// @notice Soft-deactivate an entity. The entity data remains onchain and queryable.
    ///         Existing edges are NOT automatically deactivated — edges have independent
    ///         lifecycles. New edges cannot be created for a deactivated entity.
    /// @dev    Only ADMIN_ROLE. Entity must exist and be active.
    /// @param entityId The entity to deactivate.
    function deactivateEntity(bytes32 entityId) external;

    /// @notice Retrieve the full entity record by its identifier.
    /// @param entityId The entity's identifier.
    /// @return The stored Entity struct. Check createdAt > 0 to confirm the entity
    ///         exists — an uninitialized struct returns all zero values.
    function getEntity(
        bytes32 entityId
    ) external view returns (TallyviewTypes.Entity memory);

    /// @notice Check whether an entity is currently active.
    /// @param entityId The entity's identifier.
    /// @return True if the entity exists and is active.
    function isEntityActive(bytes32 entityId) external view returns (bool);

    // -------------------------------------------------------------------------
    //  Relationship Edges
    // -------------------------------------------------------------------------

    /// @notice Create a relationship edge between an entity and an organization.
    ///         The entity must be active and the org must be registered and active in
    ///         AuditLedger. The relay computes deterministic edgeIds from the offchain
    ///         pipeline (e.g., keccak256 of "edge-reeves-orgA-board").
    ///
    ///         If this is the first edge connecting this entity to this org, the contract
    ///         updates the cross-organizational index arrays (entities-per-org and
    ///         orgs-per-entity). Subsequent edges between the same entity and org (e.g.,
    ///         same person as both BoardMember and KeyEmployee) create new edge records
    ///         without duplicating the index entries.
    /// @dev    Only SYSTEM_ROLE or ADMIN_ROLE. Reverts with EdgeAlreadyExists if the
    ///         edgeId is already registered (check: stored entityId != bytes32(0)).
    /// @param edgeId           Caller-provided unique identifier for this edge.
    /// @param entityId         The entity in this relationship. Must reference an
    ///                         existing, active entity.
    /// @param org              The organization. Must be registered and active in
    ///                         AuditLedger.
    /// @param relationshipType The role the entity plays (BoardMember, VendorPayee, etc.).
    /// @param startDate        When the relationship began or was first detected
    ///                         (unix timestamp).
    /// @param evidenceHash     Hash of supporting data from the SaaS layer — the
    ///                         accounting record, board resolution, or filing that
    ///                         establishes this relationship.
    function createEdge(
        bytes32 edgeId,
        bytes32 entityId,
        address org,
        TallyviewTypes.RelationshipType relationshipType,
        uint48 startDate,
        bytes32 evidenceHash
    ) external;

    /// @notice Deactivate a relationship edge — mark it as ended (board member resigned,
    ///         vendor contract terminated, address no longer in use).
    ///         Sets endDate to block.timestamp and status to Inactive. The edge data
    ///         remains onchain and in all index arrays — history is permanent.
    ///         Deactivating an already-inactive edge reverts with EdgeAlreadyInactive
    ///         to prevent overwriting the original endDate timestamp.
    /// @dev    Only SYSTEM_ROLE or ADMIN_ROLE. Edge must exist and be currently Active.
    /// @param edgeId The edge to deactivate.
    function deactivateEdge(bytes32 edgeId) external;

    /// @notice Retrieve the full relationship edge record.
    /// @param edgeId The edge's identifier.
    /// @return The stored RelationshipEdge struct. Check entityId != bytes32(0) to
    ///         confirm the edge exists — an uninitialized struct returns all zero values.
    function getEdge(
        bytes32 edgeId
    ) external view returns (TallyviewTypes.RelationshipEdge memory);

    /// @notice Check whether a relationship edge is currently active.
    /// @param edgeId The edge's identifier.
    /// @return True if the edge exists and has status Active.
    function isEdgeActive(bytes32 edgeId) external view returns (bool);

    // -------------------------------------------------------------------------
    //  Cross-Organizational Queries
    // -------------------------------------------------------------------------

    /// @notice Get all edge IDs for a given entity across all organizations.
    ///         Answers: "Where does this person/vendor/address appear?"
    ///         Returns both active and inactive edges — the full relationship history.
    /// @param entityId The entity's identifier.
    /// @return An array of bytes32 edgeIds (may be empty).
    function getEdgesForEntity(
        bytes32 entityId
    ) external view returns (bytes32[] memory);

    /// @notice Get all edge IDs for a given organization.
    ///         Answers: "Who is connected to this nonprofit?"
    ///         Returns both active and inactive edges.
    /// @param org The org's address.
    /// @return An array of bytes32 edgeIds (may be empty).
    function getEdgesForOrg(
        address org
    ) external view returns (bytes32[] memory);

    /// @notice Get unique entity IDs connected to an organization.
    ///         Deduplicated at write time — an entity connected via multiple
    ///         relationship types (e.g., both BoardMember and KeyEmployee) appears
    ///         only once.
    /// @param org The org's address.
    /// @return An array of bytes32 entityIds (may be empty, always unique).
    function getEntitiesForOrg(
        address org
    ) external view returns (bytes32[] memory);

    /// @notice Get all organizations connected to an entity.
    ///         **THE key fraud detection query.** When a regulator asks "where else
    ///         does this vendor operate?" or "which other boards does this person
    ///         serve on?", this is the function that answers. Deduplicated at write
    ///         time — an org connected via multiple edge types appears only once.
    ///
    ///         Combined with Avalanche's sub-second finality, this query powers
    ///         real-time relationship maps on the investigator dashboard.
    /// @param entityId The entity's identifier.
    /// @return An array of org addresses (may be empty, always unique).
    function getOrgsForEntity(
        bytes32 entityId
    ) external view returns (address[] memory);

    /// @notice Find entities that appear in edges for BOTH organizations.
    ///         **The cross-organizational overlap detector.** Two orgs sharing 3+
    ///         entities (same board members, same vendors, same address) is a strong
    ///         fraud signal. The SaaS layer calls this and feeds results to
    ///         AnomalyRegistry.
    ///
    ///         Uses a nested loop (O(n*m)) — Solidity does not support mappings in
    ///         memory. For view calls on the Tallyview L1, this is acceptable for
    ///         reasonable entity counts (hundreds per org, not millions).
    /// @param orgA The first organization's address.
    /// @param orgB The second organization's address.
    /// @return An array of bytes32 entityIds that appear in both orgs (may be empty).
    function getSharedEntities(
        address orgA,
        address orgB
    ) external view returns (bytes32[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @notice Quick graph health check for an organization.
    ///         Returns counts suitable for dashboard summary cards. Combined with
    ///         Avalanche's sub-second finality, this gives investigators a real-time
    ///         relationship snapshot.
    /// @param org The org's address.
    /// @return totalEdges     Total relationship edges ever recorded for this org
    ///                        (active and inactive).
    /// @return activeEdges    Edges with status == Active (current relationships).
    /// @return uniqueEntities Count of unique entities connected to this org
    ///                        (deduplicated at write time).
    function getOrgGraphSummary(
        address org
    )
        external
        view
        returns (
            uint256 totalEdges,
            uint256 activeEdges,
            uint256 uniqueEntities
        );
}
