// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TallyviewTypes} from "../libraries/TallyviewTypes.sol";

/// @title IAnomalyRegistry
/// @author Tallyview
/// @notice Immutable record of AI-detected findings for nonprofit financial oversight
///         on the Tallyview Avalanche L1.
///
///         When Tallyview's offchain AI engine detects an anomaly — vendor concentration,
///         expense drift, compensation outlier, governance red flag — the finding is
///         written here with a severity level, category, confidence score, and evidence
///         hash. The detection logic stays offchain (it iterates rapidly with new models
///         and fraud typologies). The contract is pure record-keeping: what was found,
///         when, how severe, and what happened to the finding.
///
///         The core principle: findings cannot be deleted or hidden. Once an anomaly is
///         recorded onchain, only its status can progress forward:
///
///           New → Reviewed → Resolved
///           New → Reviewed → Escalated
///
///         No backward transitions. You cannot un-review a finding, un-resolve it, or
///         un-escalate it. This forward-only lifecycle is what makes AnomalyRegistry an
///         accountability tool rather than a notification system — a board member cannot
///         pressure staff to bury a concerning finding after the fact.
///
///         Reviewing and resolving/escalating are separate steps. "Reviewed" means a
///         human has seen the finding. "Resolved" or "Escalated" is the decision about
///         what to do. The two-step process creates an audit trail of who saw what and
///         when they decided.
///
///         AnomalyRegistry references IAuditLedger for org validation — it does not
///         duplicate org storage. The optional relatedRuleId field links a finding to
///         a ComplianceEngine rule (pure metadata, no hard import dependency).
///
///         Rich events on every state change enable real-time dashboard consumption
///         via Avalanche's sub-second finality. Foundation program officers see new
///         findings almost instantly.
interface IAnomalyRegistry {
    // -------------------------------------------------------------------------
    //  Errors
    // -------------------------------------------------------------------------

    error AnomalyNotFound();
    error InvalidStatusTransition();
    error OrgNotRegistered();
    error OrgNotActive();
    error Unauthorized();
    error ZeroAddress();
    error EmptyTitle();
    error TitleTooLong();
    error InvalidConfidence();

    // -------------------------------------------------------------------------
    //  Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new anomaly finding is recorded onchain.
    ///         The title is intentionally excluded — it's a potentially long string
    ///         that would increase event gas costs. Consumers read the title via
    ///         getAnomaly(anomalyIndex) after the event fires. The event carries the
    ///         index, org, severity, and category — enough for dashboard filtering
    ///         and real-time alerting.
    event AnomalyRecorded(
        uint256 indexed anomalyIndex,
        address indexed org,
        TallyviewTypes.AnomalySeverity severity,
        TallyviewTypes.AnomalyCategory category
    );

    /// @notice Emitted when an anomaly transitions between lifecycle states.
    ///         Only forward transitions are valid (New → Reviewed, Reviewed → Resolved,
    ///         Reviewed → Escalated). The contract reverts on any other transition.
    event AnomalyStatusChanged(
        uint256 indexed anomalyIndex,
        address indexed org,
        TallyviewTypes.AnomalyStatus oldStatus,
        TallyviewTypes.AnomalyStatus newStatus
    );

    /// @notice Emitted when a human reviews a finding. Separate from
    ///         AnomalyStatusChanged to provide the reviewer's address as an
    ///         indexed topic for auditor queries ("show me everything this
    ///         person reviewed").
    event AnomalyReviewed(
        uint256 indexed anomalyIndex,
        address indexed org,
        address indexed reviewer
    );

    /// @notice Emitted when a finding is escalated for investigation.
    ///         In a future integration, EvidenceVault may listen for this event
    ///         to initiate chain-of-custody evidence collection for the escalated
    ///         finding.
    event AnomalyEscalated(
        uint256 indexed anomalyIndex,
        address indexed org
    );

    // -------------------------------------------------------------------------
    //  Recording
    // -------------------------------------------------------------------------

    /// @notice Record an AI-detected anomaly finding onchain.
    ///         The offchain AI engine runs detection (anomaly models, fraud typology
    ///         matching, peer benchmarking). The relay submits the finding metadata
    ///         here. The full evidence stays offchain — evidenceHash proves what
    ///         evidence existed at detection time. If the evidence is later altered,
    ///         the hash mismatch proves tampering.
    /// @dev    Only SYSTEM_ROLE. The AI engine relay is the sole writer of findings.
    ///         Title is validated: must be non-empty and at most MAX_TITLE_LENGTH
    ///         bytes. Confidence must be 1–10000 basis points inclusive.
    /// @param org            The nonprofit's address. Must be registered and active
    ///                       in AuditLedger.
    /// @param severity       How severe the finding is (Info through Critical).
    /// @param category       The type of anomaly detected (maps to the offchain
    ///                       fraud typology database).
    /// @param title          Brief human-readable description (e.g. "CEO compensation
    ///                       exceeds peer benchmark by 340%"). Max 200 bytes.
    /// @param confidenceBps  AI confidence score in basis points (8500 = 85%).
    ///                       Must be between 1 and 10000 inclusive.
    /// @param evidenceHash   Hash of the underlying analysis/data from the SaaS layer.
    /// @param relatedRuleId  Optional link to a ComplianceEngine rule. Pass bytes32(0)
    ///                       for standalone anomalies with no rule association.
    /// @return anomalyIndex  The monotonic index of the new finding in the anomalies
    ///                       array. This index is the finding's permanent unique ID.
    function recordAnomaly(
        address org,
        TallyviewTypes.AnomalySeverity severity,
        TallyviewTypes.AnomalyCategory category,
        string calldata title,
        uint16 confidenceBps,
        bytes32 evidenceHash,
        bytes32 relatedRuleId
    ) external returns (uint256 anomalyIndex);

    // -------------------------------------------------------------------------
    //  Status Lifecycle
    // -------------------------------------------------------------------------

    /// @notice Mark a finding as reviewed — a human has seen it.
    ///         Records who reviewed it (msg.sender) and when (block.timestamp).
    ///         This is the first step in the two-step process: review first, then
    ///         decide (resolve or escalate).
    /// @dev    Only ADMIN_ROLE, SYSTEM_ROLE, or REVIEWER_ROLE.
    ///         Current status must be New. Reverts with InvalidStatusTransition
    ///         if the anomaly is in any other state.
    /// @param anomalyIndex   The finding's index. Reverts with AnomalyNotFound
    ///                       if out of bounds.
    /// @param reviewNoteHash Hash of the reviewer's notes. Pass bytes32(0) if no
    ///                       notes — notes are optional.
    function reviewAnomaly(
        uint256 anomalyIndex,
        bytes32 reviewNoteHash
    ) external;

    /// @notice Mark a finding as resolved — investigated, determined to be a false
    ///         positive or already addressed.
    ///         Always overwrites reviewNoteHash with the provided value. If the caller
    ///         wants to preserve the original review notes, they pass the same hash.
    /// @dev    Only ADMIN_ROLE or REVIEWER_ROLE. SYSTEM_ROLE intentionally CANNOT
    ///         resolve — the system should not auto-close its own findings.
    ///         Current status must be Reviewed. Reverts with InvalidStatusTransition
    ///         if the anomaly is in any other state.
    /// @param anomalyIndex   The finding's index. Reverts with AnomalyNotFound
    ///                       if out of bounds.
    /// @param reviewNoteHash Hash of the resolution notes. Overwrites the existing
    ///                       reviewNoteHash unconditionally.
    function resolveAnomaly(
        uint256 anomalyIndex,
        bytes32 reviewNoteHash
    ) external;

    /// @notice Escalate a finding for investigation — sent to regulator, flagged
    ///         for EvidenceVault. Escalation is permanent; an escalated finding
    ///         cannot be un-escalated or resolved after the fact.
    ///         Always overwrites reviewNoteHash with the provided value.
    /// @dev    Only ADMIN_ROLE, SYSTEM_ROLE, or REVIEWER_ROLE. SYSTEM_ROLE can
    ///         escalate (the AI engine can recommend escalation) but cannot resolve.
    ///         Current status must be Reviewed. Reverts with InvalidStatusTransition
    ///         if the anomaly is in any other state.
    /// @param anomalyIndex   The finding's index. Reverts with AnomalyNotFound
    ///                       if out of bounds.
    /// @param reviewNoteHash Hash of the escalation notes. Overwrites the existing
    ///                       reviewNoteHash unconditionally.
    function escalateAnomaly(
        uint256 anomalyIndex,
        bytes32 reviewNoteHash
    ) external;

    // -------------------------------------------------------------------------
    //  Queries — Individual Anomalies
    // -------------------------------------------------------------------------

    /// @notice Retrieve the full anomaly record by its monotonic index.
    ///         Anomalies use a flat array — the index IS the unique identifier,
    ///         guaranteeing uniqueness even with multiple findings in the same block.
    /// @param anomalyIndex The finding's array index.
    /// @return The stored Anomaly record. Reverts with AnomalyNotFound if out of
    ///         bounds.
    function getAnomaly(
        uint256 anomalyIndex
    ) external view returns (TallyviewTypes.Anomaly memory);

    /// @notice Get the total number of recorded anomalies across all orgs.
    /// @return The current length of the anomalies array.
    function getAnomalyCount() external view returns (uint256);

    /// @notice Get all anomaly indices for an organization.
    /// @param org The org's address.
    /// @return An array of uint256 indices into the anomalies array (may be empty).
    function getAnomaliesForOrg(
        address org
    ) external view returns (uint256[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Filtered
    // -------------------------------------------------------------------------

    /// @notice Get anomaly indices for an org filtered by lifecycle status.
    ///         Iterates the org's anomaly indices and returns only those matching
    ///         the requested status. Safe for view calls on the Tallyview L1 — no
    ///         gas concern for iteration.
    /// @param org    The org's address.
    /// @param status The lifecycle status to filter by.
    /// @return An array of matching anomaly indices (may be empty).
    function getAnomaliesByStatus(
        address org,
        TallyviewTypes.AnomalyStatus status
    ) external view returns (uint256[] memory);

    /// @notice Get anomaly indices for an org filtered by severity level.
    ///         Same iteration pattern as getAnomaliesByStatus.
    /// @param org      The org's address.
    /// @param severity The severity level to filter by.
    /// @return An array of matching anomaly indices (may be empty).
    function getAnomaliesBySeverity(
        address org,
        TallyviewTypes.AnomalySeverity severity
    ) external view returns (uint256[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @notice Quick anomaly health check for an organization.
    ///         Returns counts suitable for dashboard summary cards.
    ///         Combined with Avalanche's sub-second finality, this gives foundation
    ///         program officers a real-time anomaly snapshot.
    /// @param org The org's address.
    /// @return total    Total anomalies ever recorded for this org.
    /// @return open     Anomalies not yet resolved or escalated (status is New or
    ///                  Reviewed). These are findings that still need a decision.
    /// @return critical Count of Critical-severity findings regardless of status.
    ///                  A resolved Critical finding still counts — it happened.
    function getOrgAnomalySummary(
        address org
    )
        external
        view
        returns (
            uint256 total,
            uint256 open,
            uint256 critical
        );
}
