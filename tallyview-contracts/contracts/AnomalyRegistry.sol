// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {TallyviewTypes} from "./libraries/TallyviewTypes.sol";
import {IAuditLedger} from "./interfaces/IAuditLedger.sol";
import {IAnomalyRegistry} from "./interfaces/IAnomalyRegistry.sol";

/// @title AnomalyRegistry
/// @author Tallyview
/// @notice Immutable record of AI-detected findings for nonprofit financial oversight
///         on the Tallyview Avalanche L1.
///
///         When Tallyview's offchain AI engine detects an anomaly — vendor concentration,
///         expense drift, compensation outlier, governance red flag — the finding metadata
///         is written here permanently. The detection logic stays offchain where it can
///         iterate rapidly with new models and fraud typologies. The contract is pure
///         record-keeping: what was found, when, how severe, and what happened to it.
///
///         The core principle: findings cannot be deleted or hidden. Once an anomaly is
///         recorded onchain, only its status can progress forward:
///
///           New → Reviewed → Resolved
///           New → Reviewed → Escalated
///
///         No backward transitions. This forward-only lifecycle is what makes
///         AnomalyRegistry an accountability tool — a board member cannot pressure
///         staff to bury a concerning finding after the fact.
///
///         Reviewing and resolving/escalating are deliberately separate steps.
///         "Reviewed" means a human has seen the finding. "Resolved" or "Escalated"
///         is the decision about what to do. The two-step process creates an audit
///         trail of who saw what and when they decided.
///
///         SYSTEM_ROLE (the AI engine relay) can record findings and escalate them,
///         but intentionally CANNOT resolve them. The system should not auto-close
///         its own findings.
/// @dev UUPS upgradeable. Deployed behind an ERC1967 proxy.
///      References IAuditLedger for org validation — does not duplicate org storage.
///      The relatedRuleId field optionally links a finding to a ComplianceEngine rule
///      (pure metadata — AnomalyRegistry does NOT import IComplianceEngine).
contract AnomalyRegistry is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IAnomalyRegistry
{
    // -------------------------------------------------------------------------
    //  Roles
    // -------------------------------------------------------------------------

    /// @notice Platform administrators. Can review, resolve, escalate findings
    ///         and authorize upgrades.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Granted to the Tallyview relay service. Can record anomalies
    ///         (sole writer), review findings, and escalate — but cannot resolve.
    bytes32 public constant SYSTEM_ROLE = keccak256("SYSTEM_ROLE");

    /// @notice Foundation program officers, board audit committee members, or
    ///         regulator staff who need to review findings but shouldn't have
    ///         full ADMIN or SYSTEM access.
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    // -------------------------------------------------------------------------
    //  Constants
    // -------------------------------------------------------------------------

    /// @notice Maximum byte length for anomaly titles. Enforced on recording.
    uint256 public constant MAX_TITLE_LENGTH = 200;

    /// @notice Maximum confidence score in basis points (10000 = 100%).
    uint256 public constant MAX_CONFIDENCE_BPS = 10000;

    // -------------------------------------------------------------------------
    //  Storage
    // -------------------------------------------------------------------------

    /// @notice Reference to the AuditLedger contract for org validation.
    ///         Set once in initialize; follows proxy upgrades automatically.
    IAuditLedger public auditLedger;

    /// @dev Flat array of all anomalies. The array index IS the unique ID —
    ///      monotonic counter guarantees uniqueness even within the same block.
    TallyviewTypes.Anomaly[] public anomalies;

    /// @dev Anomaly indices per organization for enumeration and filtered queries.
    mapping(address => uint256[]) private _orgAnomalies;

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
    ///         the IAuditLedger reference used for org validation.
    /// @param auditLedgerAddress The deployed AuditLedger proxy address.
    function initialize(address auditLedgerAddress) public initializer {
        if (auditLedgerAddress == address(0)) revert ZeroAddress();

        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        auditLedger = IAuditLedger(auditLedgerAddress);
    }

    // -------------------------------------------------------------------------
    //  Recording
    // -------------------------------------------------------------------------

    /// @inheritdoc IAnomalyRegistry
    /// @dev The offchain AI engine runs detection (anomaly models, fraud typology
    ///      matching, peer benchmarking). Only the finding metadata hits the chain.
    ///      The full evidence stays offchain — evidenceHash proves what evidence
    ///      existed at detection time.
    ///
    ///      relatedRuleId optionally links to a ComplianceEngine rule. If the AI
    ///      detects that spending on a specific grant looks wrong, it can tie the
    ///      anomaly to that grant's ruleId. bytes32(0) means standalone. This is
    ///      pure metadata — no import dependency on IComplianceEngine.
    function recordAnomaly(
        address org,
        TallyviewTypes.AnomalySeverity severity,
        TallyviewTypes.AnomalyCategory category,
        string calldata title,
        uint16 confidenceBps,
        bytes32 evidenceHash,
        bytes32 relatedRuleId
    ) external returns (uint256 anomalyIndex) {
        if (!hasRole(SYSTEM_ROLE, msg.sender)) revert Unauthorized();

        _validateOrg(org);

        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(title).length > MAX_TITLE_LENGTH) revert TitleTooLong();
        if (confidenceBps == 0 || confidenceBps > MAX_CONFIDENCE_BPS) {
            revert InvalidConfidence();
        }

        anomalies.push(
            TallyviewTypes.Anomaly({
                org: org,
                severity: severity,
                category: category,
                confidenceBps: confidenceBps,
                detectedAt: uint48(block.timestamp),
                status: TallyviewTypes.AnomalyStatus.New,
                title: title,
                evidenceHash: evidenceHash,
                relatedRuleId: relatedRuleId,
                reviewedBy: address(0),
                reviewedAt: 0,
                reviewNoteHash: bytes32(0)
            })
        );

        anomalyIndex = anomalies.length - 1;

        _orgAnomalies[org].push(anomalyIndex);

        emit AnomalyRecorded(anomalyIndex, org, severity, category);
    }

    // -------------------------------------------------------------------------
    //  Status Lifecycle
    // -------------------------------------------------------------------------

    /// @inheritdoc IAnomalyRegistry
    /// @dev Forward-only: New → Reviewed. Records the reviewer's identity and
    ///      timestamp for the audit trail.
    function reviewAnomaly(
        uint256 anomalyIndex,
        bytes32 reviewNoteHash
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(SYSTEM_ROLE, msg.sender)
                && !hasRole(REVIEWER_ROLE, msg.sender)
        ) revert Unauthorized();

        if (anomalyIndex >= anomalies.length) revert AnomalyNotFound();

        TallyviewTypes.Anomaly storage a = anomalies[anomalyIndex];
        if (a.status != TallyviewTypes.AnomalyStatus.New) {
            revert InvalidStatusTransition();
        }

        a.status = TallyviewTypes.AnomalyStatus.Reviewed;
        a.reviewedBy = msg.sender;
        a.reviewedAt = uint48(block.timestamp);
        a.reviewNoteHash = reviewNoteHash;

        emit AnomalyStatusChanged(
            anomalyIndex,
            a.org,
            TallyviewTypes.AnomalyStatus.New,
            TallyviewTypes.AnomalyStatus.Reviewed
        );
        emit AnomalyReviewed(anomalyIndex, a.org, msg.sender);
    }

    /// @inheritdoc IAnomalyRegistry
    /// @dev Forward-only: Reviewed → Resolved. SYSTEM_ROLE intentionally excluded —
    ///      the system should not auto-close its own findings.
    ///      Always overwrites reviewNoteHash unconditionally.
    function resolveAnomaly(
        uint256 anomalyIndex,
        bytes32 reviewNoteHash
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(REVIEWER_ROLE, msg.sender)
        ) revert Unauthorized();

        if (anomalyIndex >= anomalies.length) revert AnomalyNotFound();

        TallyviewTypes.Anomaly storage a = anomalies[anomalyIndex];
        if (a.status != TallyviewTypes.AnomalyStatus.Reviewed) {
            revert InvalidStatusTransition();
        }

        a.status = TallyviewTypes.AnomalyStatus.Resolved;
        a.reviewNoteHash = reviewNoteHash;

        emit AnomalyStatusChanged(
            anomalyIndex,
            a.org,
            TallyviewTypes.AnomalyStatus.Reviewed,
            TallyviewTypes.AnomalyStatus.Resolved
        );
    }

    /// @inheritdoc IAnomalyRegistry
    /// @dev Forward-only: Reviewed → Escalated. SYSTEM_ROLE can escalate (the AI
    ///      engine can recommend escalation) but cannot resolve.
    ///      Always overwrites reviewNoteHash unconditionally.
    ///      In a future integration, the AnomalyEscalated event may trigger
    ///      downstream actions in EvidenceVault for investigation evidence
    ///      collection with chain-of-custody.
    function escalateAnomaly(
        uint256 anomalyIndex,
        bytes32 reviewNoteHash
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(SYSTEM_ROLE, msg.sender)
                && !hasRole(REVIEWER_ROLE, msg.sender)
        ) revert Unauthorized();

        if (anomalyIndex >= anomalies.length) revert AnomalyNotFound();

        TallyviewTypes.Anomaly storage a = anomalies[anomalyIndex];
        if (a.status != TallyviewTypes.AnomalyStatus.Reviewed) {
            revert InvalidStatusTransition();
        }

        a.status = TallyviewTypes.AnomalyStatus.Escalated;
        a.reviewNoteHash = reviewNoteHash;

        emit AnomalyStatusChanged(
            anomalyIndex,
            a.org,
            TallyviewTypes.AnomalyStatus.Reviewed,
            TallyviewTypes.AnomalyStatus.Escalated
        );
        emit AnomalyEscalated(anomalyIndex, a.org);
    }

    // -------------------------------------------------------------------------
    //  Queries — Individual Anomalies
    // -------------------------------------------------------------------------

    /// @inheritdoc IAnomalyRegistry
    function getAnomaly(
        uint256 anomalyIndex
    ) external view returns (TallyviewTypes.Anomaly memory) {
        if (anomalyIndex >= anomalies.length) revert AnomalyNotFound();
        return anomalies[anomalyIndex];
    }

    /// @inheritdoc IAnomalyRegistry
    function getAnomalyCount() external view returns (uint256) {
        return anomalies.length;
    }

    /// @inheritdoc IAnomalyRegistry
    function getAnomaliesForOrg(
        address org
    ) external view returns (uint256[] memory) {
        return _orgAnomalies[org];
    }

    // -------------------------------------------------------------------------
    //  Queries — Filtered
    // -------------------------------------------------------------------------

    /// @inheritdoc IAnomalyRegistry
    /// @dev Two-pass approach: count matches first, then allocate and fill.
    ///      Avoids dynamic memory array issues in Solidity. Fine for view calls
    ///      on the Tallyview L1 where gas is not a concern.
    function getAnomaliesByStatus(
        address org,
        TallyviewTypes.AnomalyStatus status
    ) external view returns (uint256[] memory) {
        uint256[] storage indices = _orgAnomalies[org];
        uint256 len = indices.length;

        uint256 count;
        for (uint256 i; i < len; ) {
            if (anomalies[indices[i]].status == status) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }

        uint256[] memory result = new uint256[](count);
        uint256 cursor;
        for (uint256 i; i < len; ) {
            if (anomalies[indices[i]].status == status) {
                result[cursor] = indices[i];
                unchecked { ++cursor; }
            }
            unchecked { ++i; }
        }

        return result;
    }

    /// @inheritdoc IAnomalyRegistry
    /// @dev Same two-pass pattern as getAnomaliesByStatus.
    function getAnomaliesBySeverity(
        address org,
        TallyviewTypes.AnomalySeverity severity
    ) external view returns (uint256[] memory) {
        uint256[] storage indices = _orgAnomalies[org];
        uint256 len = indices.length;

        uint256 count;
        for (uint256 i; i < len; ) {
            if (anomalies[indices[i]].severity == severity) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }

        uint256[] memory result = new uint256[](count);
        uint256 cursor;
        for (uint256 i; i < len; ) {
            if (anomalies[indices[i]].severity == severity) {
                result[cursor] = indices[i];
                unchecked { ++cursor; }
            }
            unchecked { ++i; }
        }

        return result;
    }

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @inheritdoc IAnomalyRegistry
    function getOrgAnomalySummary(
        address org
    )
        external
        view
        returns (
            uint256 total,
            uint256 open,
            uint256 critical
        )
    {
        uint256[] storage indices = _orgAnomalies[org];
        total = indices.length;

        for (uint256 i; i < total; ) {
            TallyviewTypes.Anomaly storage a = anomalies[indices[i]];

            if (
                a.status == TallyviewTypes.AnomalyStatus.New
                    || a.status == TallyviewTypes.AnomalyStatus.Reviewed
            ) {
                unchecked { ++open; }
            }

            if (a.severity == TallyviewTypes.AnomalySeverity.Critical) {
                unchecked { ++critical; }
            }

            unchecked { ++i; }
        }
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
