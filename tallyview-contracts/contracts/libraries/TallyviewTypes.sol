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
}
