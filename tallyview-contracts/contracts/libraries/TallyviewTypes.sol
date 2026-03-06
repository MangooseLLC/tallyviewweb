// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TallyviewTypes
/// @notice Shared types for the Tallyview contract system.
///         Lives in a library so all five contracts (AuditLedger, ComplianceEngine,
///         AnomalyRegistry, EntityGraph, EvidenceVault) reference the same definitions.
library TallyviewTypes {
    /// @notice Access roles across the Tallyview platform.
    enum Role {
        None,
        Nonprofit,
        Foundation,
        Regulator,
        Investigator,
        System
    }

    /// @notice Registration data for a nonprofit organization.
    ///         The org's Avalanche address is the primary key (stored as the mapping key,
    ///         not inside this struct). The human-readable name provides discoverability
    ///         via forward/reverse resolution.
    struct OrgRecord {
        string name;
        bytes32 einHash;
        uint48 registeredAt;
        uint16 latestYear;
        uint8 latestMonth;
        bool active;
    }

    /// @notice A single monthly financial attestation.
    ///         The merkleRoot commits to the org's financial data for the period.
    ///         A zero merkleRoot means no entry exists — submitting bytes32(0) is rejected.
    struct AuditEntry {
        bytes32 merkleRoot;
        bytes32 schemaHash;
        uint48 timestamp;
        address submitter;
    }

    // -------------------------------------------------------------------------
    //  ComplianceEngine Types
    // -------------------------------------------------------------------------

    /// @notice The category of compliance boundary a rule enforces.
    ///         SpendingCap  — restricted fund, grant, or contract with a dollar limit.
    ///         OverheadRatio — administrative cost ceiling expressed in basis points.
    ///         CustomThreshold — extensible catch-all for future rule types
    ///         (audit opinion scores, program output minimums, etc.).
    enum RuleType {
        SpendingCap,
        OverheadRatio,
        CustomThreshold
    }

    /// @notice Compliance health of a rule. Transitions are driven automatically
    ///         by value reports or manually by an admin override.
    enum RuleStatus {
        Compliant,
        AtRisk,
        Violated
    }

    /// @notice Lifecycle state of a regulatory or reporting deadline.
    enum DeadlineStatus {
        Pending,
        Approaching,
        Overdue,
        Met
    }

    /// @notice A compliance boundary applied to an organization.
    ///         The mapping key is a bytes32 ruleId — not stored in the struct.
    ///         For SpendingCap rules, currentValue accumulates (spending adds up).
    ///         For OverheadRatio and CustomThreshold rules, currentValue is replaced
    ///         on each report (it represents a point-in-time snapshot, not a running total).
    struct ComplianceRule {
        address org;
        address setBy;
        RuleType ruleType;
        string label;
        uint128 threshold;
        uint128 currentValue;
        uint48 startDate;
        uint48 endDate;
        RuleStatus status;
        bool active;
    }

    /// @notice A regulatory or reporting deadline tracked onchain.
    ///         The mapping key is a bytes32 deadlineId — not stored in the struct.
    ///         completedDate is 0 until the deadline is marked as met.
    struct FilingDeadline {
        address org;
        string filingType;
        uint48 dueDate;
        uint48 completedDate;
        DeadlineStatus status;
    }

    /// @notice An immutable compliance violation record.
    ///         Violations are stored in a flat array; the array index is the unique ID.
    ///         Exactly one of ruleId or deadlineId is non-zero — ruleId for threshold
    ///         breaches, deadlineId for missed filings. Both are bytes32(0) only if
    ///         a future violation category is added that relates to neither.
    struct Violation {
        bytes32 ruleId;
        bytes32 deadlineId;
        address org;
        uint48 timestamp;
        string violationType;
        uint128 thresholdValue;
        uint128 actualValue;
        bytes32 evidenceHash;
    }

    // -------------------------------------------------------------------------
    //  AnomalyRegistry Types
    // -------------------------------------------------------------------------

    /// @notice Severity level of an AI-detected anomaly.
    ///         Ordered from least to most severe so uint8 comparisons are meaningful.
    enum AnomalySeverity {
        Info,
        Low,
        Medium,
        High,
        Critical
    }

    /// @notice Category of anomaly detected by the offchain AI engine.
    ///         Maps to the fraud typology database that powers detection.
    ///         Custom is the extensible catch-all for patterns outside the
    ///         predefined categories.
    enum AnomalyCategory {
        FinancialHealth,
        Governance,
        FraudPattern,
        CompensationOutlier,
        VendorConcentration,
        ExpenseAllocation,
        RevenueAnomaly,
        RelatedParty,
        DocumentProvenance,
        Custom
    }

    /// @notice Lifecycle status of an anomaly finding.
    ///         Transitions are strictly forward-only:
    ///           New → Reviewed → Resolved
    ///           New → Reviewed → Escalated
    ///         No backward transitions are permitted. A finding cannot be
    ///         un-reviewed, un-resolved, or un-escalated.
    enum AnomalyStatus {
        New,
        Reviewed,
        Resolved,
        Escalated
    }

    /// @notice A single AI-detected anomaly finding.
    ///         Stored in a flat array in AnomalyRegistry; the array index IS
    ///         the unique identifier — not stored inside the struct.
    ///         The offchain AI engine performs detection; only the finding
    ///         metadata is recorded onchain as a permanent, immutable record.
    ///         relatedRuleId optionally links to a ComplianceEngine rule
    ///         (pure metadata — no hard dependency on IComplianceEngine).
    ///
    ///         Field order is optimized for EVM storage packing (6 slots instead
    ///         of 8). Small fields (enums, uint16, uint48) are grouped so they
    ///         share slots with address fields.
    struct Anomaly {
        address org;              // 20 bytes ─┐
        AnomalySeverity severity; //  1 byte   │
        AnomalyCategory category; //  1 byte   │ slot 0: 31/32
        uint16 confidenceBps;     //  2 bytes   │
        uint48 detectedAt;        //  6 bytes   │
        AnomalyStatus status;     //  1 byte  ─┘
        string title;             // ────────── slot 1 (pointer)
        bytes32 evidenceHash;     // ────────── slot 2
        bytes32 relatedRuleId;    // ────────── slot 3
        address reviewedBy;       // 20 bytes ─┐ slot 4: 26/32
        uint48 reviewedAt;        //  6 bytes ─┘
        bytes32 reviewNoteHash;   // ────────── slot 5
    }

    // -------------------------------------------------------------------------
    //  EntityGraph Types
    // -------------------------------------------------------------------------

    /// @notice Classification of an entity in the relationship graph.
    ///         Person  — board member, executive, key employee, or related individual.
    ///         Vendor  — company or individual receiving payments from a nonprofit.
    ///         Address — a physical or mailing address shared across entities.
    enum EntityType {
        Person,
        Vendor,
        Address
    }

    /// @notice The role an entity plays in its relationship with an organization.
    ///         BoardMember       — serves on the org's board of directors.
    ///         Executive         — officer-level (CEO, CFO, COO, etc.).
    ///         KeyEmployee       — highly compensated or decision-making staff.
    ///         VendorPayee       — receives payments from the org.
    ///         RegisteredAddress — the org's official registered address.
    ///         MailingAddress    — the org's mailing or correspondence address.
    ///         RelatedParty      — related individual per IRS definitions.
    ///         Custom            — extensible catch-all for relationship types
    ///                            outside the predefined categories.
    enum RelationshipType {
        BoardMember,
        Executive,
        KeyEmployee,
        VendorPayee,
        RegisteredAddress,
        MailingAddress,
        RelatedParty,
        Custom
    }

    /// @notice Whether a relationship edge is currently active or has ended.
    enum EdgeStatus {
        Active,
        Inactive
    }

    /// @notice A person, vendor, or address in the relationship graph.
    ///         Entities are privacy-preserving: identityHash is a keccak256
    ///         fingerprint of the real identity data (e.g., name + DOB for people,
    ///         EIN/name for vendors, normalized string for addresses). Raw PII
    ///         stays offchain. The label field provides a human-readable name for
    ///         dashboard display.
    ///
    ///         The mapping key (entityId) is NOT stored inside the struct.
    ///
    ///         Field order is optimized for EVM storage packing (3 slots).
    struct Entity {
        EntityType entityType;   //  1 byte  ─┐
        uint48 createdAt;        //  6 bytes  │ slot 0: 8/32
        bool active;             //  1 byte  ─┘
        bytes32 identityHash;    // ────────── slot 1
        string label;            // ────────── slot 2 (pointer)
    }

    /// @notice A directed relationship between an entity and an organization.
    ///         Edges are immutable records — deactivation sets status to Inactive
    ///         and records endDate, but never deletes the edge. Historical
    ///         connections matter for investigations.
    ///
    ///         entityId and org are data fields (what the edge connects), NOT the
    ///         edge's own key. The mapping key (edgeId) is NOT stored in the struct.
    ///
    ///         Field order is optimized for EVM storage packing (4 slots).
    struct RelationshipEdge {
        bytes32 entityId;                    // ────────── slot 0
        address org;                         // 20 bytes ─┐
        RelationshipType relationshipType;   //  1 byte   │
        EdgeStatus status;                   //  1 byte   │ slot 1: 28/32
        uint48 startDate;                    //  6 bytes ─┘
        uint48 endDate;                      //  6 bytes ── slot 2: 6/32
        bytes32 evidenceHash;                // ────────── slot 3
    }

    // -------------------------------------------------------------------------
    //  EvidenceVault Types
    // -------------------------------------------------------------------------

    /// @notice Classification of a piece of investigation evidence.
    ///         Maps to the evidence taxonomy used by investigators and counsel.
    ///         Tip is the entry point — anonymous whistleblower submissions
    ///         anchored onchain for temporal priority (critical for qui tam standing).
    enum EvidenceClassification {
        Tip,
        FinancialRecord,
        AnalysisReport,
        WitnessStatement,
        CommunicationRecord,
        PublicFiling,
        InternalDocument,
        AIGeneratedBrief,
        Other
    }

    /// @notice Stage of an investigation's lifecycle.
    ///         Stages are forward-only: Tip → Analysis → Discovery → Filing →
    ///         Recovery → Closed. Stage skipping is permitted (analysis may
    ///         happen offchain). The Closed stage can only be set via closeCase,
    ///         not updateCaseStage, preserving the admin-only closure gate.
    enum InvestigationStage {
        Tip,
        Analysis,
        Discovery,
        Filing,
        Recovery,
        Closed
    }

    /// @notice Whether an evidence entry is sealed (access-restricted).
    ///         Sealing is forward-only — once Sealed, cannot revert to Unsealed.
    ///         Sealed evidence is visible only to authorized investigators and
    ///         counsel, protecting active investigations from premature disclosure.
    enum SealStatus {
        Unsealed,
        Sealed
    }

    /// @notice An investigation case targeting a nonprofit organization.
    ///         Cases track the full investigation pipeline from tip to closure.
    ///         Investigators are granted per-case access (need-to-know basis).
    ///         Sealing restricts evidence visibility; closing ends evidence
    ///         submission. These are independent lifecycle events — a case can
    ///         be sealed but still active, or closed but unsealed.
    ///
    ///         The mapping key (caseId) is NOT stored inside the struct.
    ///
    ///         Field order is optimized for EVM storage packing (3 slots).
    struct Case {
        address targetOrg;                   // 20 bytes ─┐
        InvestigationStage stage;            //  1 byte   │
        uint48 openedAt;                     //  6 bytes  │ slot 0: 28/32
        bool isSealed;                       //  1 byte  ─┘
        address leadInvestigator;            // 20 bytes ─┐
        uint48 closedAt;                     //  6 bytes ─┘ slot 1: 26/32
        string title;                        // ────────── slot 2 (pointer)
    }

    /// @notice A single piece of investigation evidence with chain-of-custody
    ///         metadata. Evidence is immutable once submitted — the hash,
    ///         timestamp, submitter, and classification are permanent. This
    ///         immutability is what makes evidence admissible-grade: the chain
    ///         proves the evidence existed in a specific form at a specific time.
    ///
    ///         relatedAnomalyId and relatedEntityId are soft references — bytes32
    ///         values decoded by the SaaS layer to look up AnomalyRegistry
    ///         anomalies or EntityGraph entities. EvidenceVault does NOT import
    ///         IAnomalyRegistry or IEntityGraph. These are cross-contract
    ///         breadcrumbs, not hard dependencies.
    ///
    ///         Stored in a flat array; the array index IS the unique identifier
    ///         — not stored inside the struct.
    ///
    ///         Field order is optimized for EVM storage packing (6 slots).
    struct EvidenceEntry {
        bytes32 caseId;                      // ────────── slot 0
        address submitter;                   // 20 bytes ─┐
        EvidenceClassification classification; // 1 byte  │
        uint48 submittedAt;                  //  6 bytes  │ slot 1: 28/32
        SealStatus sealStatus;               //  1 byte  ─┘
        string description;                  // ────────── slot 2 (pointer)
        bytes32 contentHash;                 // ────────── slot 3
        bytes32 relatedAnomalyId;            // ────────── slot 4
        bytes32 relatedEntityId;             // ────────── slot 5
    }
}
