// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TallyviewTypes} from "../libraries/TallyviewTypes.sol";

/// @title IComplianceEngine
/// @author Tallyview
/// @notice Active enforcement layer for nonprofit financial compliance on the
///         Tallyview Avalanche L1.
///
///         Nonprofits operate under many compliance boundaries simultaneously:
///         restricted fund spending limits, foundation grant caps, overhead ratio
///         ceilings, government contract restrictions, and regulatory filing
///         deadlines. ComplianceEngine encodes these boundaries as onchain rules
///         and enforces them automatically as data flows in from the SaaS layer.
///
///         The core abstraction is a **ComplianceRule** — a boundary with a type
///         (SpendingCap, OverheadRatio, CustomThreshold), a threshold, and an
///         organization it applies to. The Tallyview relay reports values against
///         rules; the contract checks thresholds, transitions status, and records
///         violations. Filing deadlines are tracked separately with their own
///         lifecycle (Pending → Approaching → Overdue / Met).
///
///         Where AuditLedger is a passive record ("here's what the books looked
///         like"), ComplianceEngine is an active enforcer ("here's what the rules
///         say, and here's whether the org is following them").
///
///         This contract references IAuditLedger for org validation — it does NOT
///         duplicate org registration or name resolution. It reads from AuditLedger,
///         never writes to it.
///
///         Events are designed for real-time dashboard consumption. On Avalanche's
///         sub-second finality, a foundation program officer sees compliance
///         alerts the moment the relay reports data — not minutes later.
interface IComplianceEngine {
    // -------------------------------------------------------------------------
    //  Errors
    // -------------------------------------------------------------------------

    error RuleNotFound();
    error RuleAlreadyExists();
    error RuleNotActive();
    error RuleExpired();
    error DeadlineNotFound();
    error DeadlineAlreadyExists();
    error DeadlineAlreadyCompleted();
    error InvalidDateRange();
    error InvalidDeadlineTransition();
    error OrgNotRegistered();
    error OrgNotActive();
    error Unauthorized();
    error ZeroAmount();
    error ZeroAddress();

    // -------------------------------------------------------------------------
    //  Events — Compliance Rules
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new compliance rule is created for an org.
    /// @param ruleId    Unique identifier for this rule.
    /// @param org       The nonprofit the rule applies to.
    /// @param ruleType  The category of compliance boundary.
    /// @param label     Human-readable description (e.g. "Ford Foundation Grant #2026-417").
    /// @param threshold The limit value — dollars in cents for SpendingCap,
    ///                  basis points for OverheadRatio, raw value for CustomThreshold.
    event RuleCreated(
        bytes32 indexed ruleId,
        address indexed org,
        TallyviewTypes.RuleType ruleType,
        string label,
        uint128 threshold
    );

    /// @notice Emitted when a rule is deactivated. The rule data remains readable.
    event RuleDeactivated(bytes32 indexed ruleId);

    /// @notice Emitted when the relay reports a value against a rule.
    /// @param ruleId   The rule being reported against.
    /// @param org      The nonprofit.
    /// @param amount   The value reported in this transaction.
    /// @param newTotal The updated currentValue after applying the report
    ///                 (cumulative for SpendingCap, snapshot for others).
    event ValueReported(
        bytes32 indexed ruleId,
        address indexed org,
        uint128 amount,
        uint128 newTotal
    );

    /// @notice Emitted when a rule's compliance status transitions.
    ///         Transitions happen automatically on threshold breach (Compliant → AtRisk,
    ///         Compliant/AtRisk → Violated) or manually via admin override.
    event RuleStatusChanged(
        bytes32 indexed ruleId,
        address indexed org,
        TallyviewTypes.RuleStatus oldStatus,
        TallyviewTypes.RuleStatus newStatus
    );

    /// @notice Emitted when a compliance violation is recorded.
    ///         Violations are immutable once created. The violationIndex is the
    ///         violation's position in the flat violations array.
    /// @param violationIndex Monotonic index — the violation's unique ID.
    /// @param ruleId         The rule that was breached (bytes32(0) for deadline violations).
    /// @param org            The nonprofit.
    /// @param violationType  Category string (e.g. "spending-cap-breach", "overhead-exceeded").
    event ViolationRecorded(
        uint256 indexed violationIndex,
        bytes32 indexed ruleId,
        address indexed org,
        string violationType
    );

    // -------------------------------------------------------------------------
    //  Events — Filing Deadlines
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new filing deadline is created.
    event DeadlineCreated(
        bytes32 indexed deadlineId,
        address indexed org,
        string filingType,
        uint48 dueDate
    );

    /// @notice Emitted when a deadline's lifecycle status transitions.
    event DeadlineStatusChanged(
        bytes32 indexed deadlineId,
        address indexed org,
        TallyviewTypes.DeadlineStatus oldStatus,
        TallyviewTypes.DeadlineStatus newStatus
    );

    /// @notice Emitted when a deadline is marked as met.
    event DeadlineCompleted(
        bytes32 indexed deadlineId,
        address indexed org
    );

    // -------------------------------------------------------------------------
    //  Compliance Rules
    // -------------------------------------------------------------------------

    /// @notice Create a compliance rule for a registered, active organization.
    ///         The rule defines a boundary (spending cap, overhead ceiling, or custom
    ///         threshold) that the relay will report values against over time.
    /// @param ruleId    Unique identifier. Typically keccak256 of a human-readable
    ///                  grant or policy name (e.g. keccak256("FORD-GRANT-2026-417")).
    /// @param org       The nonprofit this rule applies to. Must be registered and
    ///                  active in AuditLedger.
    /// @param setBy     Who created this rule — a foundation, regulator, board, or
    ///                  the system itself. Explicit because SYSTEM_ROLE often creates
    ///                  rules on behalf of other entities.
    /// @param ruleType  SpendingCap, OverheadRatio, or CustomThreshold.
    /// @param label     Human-readable description for dashboard display.
    /// @param threshold The limit. Dollars in cents for SpendingCap, basis points
    ///                  for OverheadRatio, raw value for CustomThreshold.
    /// @param startDate When the rule takes effect.
    /// @param endDate   When the rule expires. 0 means indefinite — the rule has
    ///                  no expiration (e.g. a board-set overhead ceiling).
    function createRule(
        bytes32 ruleId,
        address org,
        address setBy,
        TallyviewTypes.RuleType ruleType,
        string calldata label,
        uint128 threshold,
        uint48 startDate,
        uint48 endDate
    ) external;

    /// @notice Report a value against a compliance rule. Called by the relay as
    ///         accounting data flows in from the SaaS layer.
    ///
    ///         Behavior depends on the rule's type:
    ///         - **SpendingCap**: currentValue += amount (spending accumulates).
    ///           A grant has a running total — each report adds new spending.
    ///         - **OverheadRatio**: currentValue = amount (snapshot replacement).
    ///           The ratio is recalculated each period; the latest value is what matters.
    ///         - **CustomThreshold**: currentValue = amount (same as OverheadRatio).
    ///
    ///         After updating currentValue, the contract checks thresholds and
    ///         automatically transitions status:
    ///         - Over 90% of threshold → AtRisk (if currently Compliant)
    ///         - Over threshold → Violated (if not already Violated) + auto-violation
    ///
    ///         The contract does NOT revert on breach. It records the overspend so
    ///         we can track how far over the org went. The contract is a record of
    ///         truth, not a gatekeeper.
    /// @param ruleId The rule to report against. Must exist and be active.
    /// @param amount The value to report — spending delta, current ratio, etc.
    function reportValue(bytes32 ruleId, uint128 amount) external;

    /// @notice Manually override a rule's compliance status. Used when a review
    ///         determines a violation was a data error, or to restore status after
    ///         corrective action. No restrictions on transition direction.
    /// @param ruleId    The rule to update.
    /// @param newStatus The new compliance status.
    function updateRuleStatus(
        bytes32 ruleId,
        TallyviewTypes.RuleStatus newStatus
    ) external;

    /// @notice Deactivate a compliance rule. The rule data remains readable but
    ///         no new values can be reported against it.
    /// @param ruleId The rule to deactivate. Must exist and be active.
    function deactivateRule(bytes32 ruleId) external;

    // -------------------------------------------------------------------------
    //  Filing Deadlines
    // -------------------------------------------------------------------------

    /// @notice Create a filing deadline for a registered, active organization.
    ///         Tracks regulatory or reporting deadlines (IRS 990, state registrations,
    ///         grant reports, audit submissions) with automatic violation creation
    ///         when deadlines are missed.
    /// @param deadlineId Unique identifier. Typically keccak256 of a descriptive
    ///                   string (e.g. keccak256("990-FY2025")).
    /// @param org        The nonprofit. Must be registered and active in AuditLedger.
    /// @param filingType Category string (e.g. "990", "990-PF", "state-registration-CA",
    ///                   "audit-report", "grant-report-ford-2026").
    /// @param dueDate    When the filing is due. Must be in the future.
    function createDeadline(
        bytes32 deadlineId,
        address org,
        string calldata filingType,
        uint48 dueDate
    ) external;

    /// @notice Mark a filing deadline as completed. Sets the completion timestamp
    ///         and transitions status to Met.
    /// @param deadlineId The deadline to complete. Must not already be completed.
    function markDeadlineCompleted(bytes32 deadlineId) external;

    /// @notice Transition a deadline's lifecycle status. Called by the relay or
    ///         admin as dates approach or pass.
    ///
    ///         Valid transitions: Pending → Approaching, Pending → Overdue,
    ///         Approaching → Overdue. All other transitions revert.
    ///
    ///         Transitioning to Overdue automatically creates a "deadline-missed"
    ///         violation record.
    /// @param deadlineId The deadline to update. Must exist and not be completed.
    /// @param newStatus  The new deadline status.
    function updateDeadlineStatus(
        bytes32 deadlineId,
        TallyviewTypes.DeadlineStatus newStatus
    ) external;

    // -------------------------------------------------------------------------
    //  Queries — Rules
    // -------------------------------------------------------------------------

    /// @notice Retrieve the full compliance rule for a given ruleId.
    /// @param ruleId The rule's unique identifier.
    /// @return The ComplianceRule struct. All fields are zero if the rule
    ///         does not exist — check org != address(0) to confirm existence.
    function getRule(
        bytes32 ruleId
    ) external view returns (TallyviewTypes.ComplianceRule memory);

    /// @notice Get all ruleIds associated with an organization.
    /// @param org The org's address.
    /// @return Array of ruleIds. Empty if the org has no rules.
    function getRulesForOrg(
        address org
    ) external view returns (bytes32[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Violations
    // -------------------------------------------------------------------------

    /// @notice Retrieve a violation by its array index.
    ///         Violations use a monotonic counter — the index is the violation's
    ///         unique, permanent identifier.
    /// @param index The violation's position in the flat violations array.
    /// @return The Violation struct.
    function getViolation(
        uint256 index
    ) external view returns (TallyviewTypes.Violation memory);

    /// @notice Total number of violations recorded across all orgs and rules.
    /// @return The length of the violations array.
    function getViolationCount() external view returns (uint256);

    /// @notice Get all violation indices for an organization.
    /// @param org The org's address.
    /// @return Array of indices into the violations array.
    function getViolationsForOrg(
        address org
    ) external view returns (uint256[] memory);

    /// @notice Get all violation indices for a specific compliance rule.
    /// @param ruleId The rule's unique identifier.
    /// @return Array of indices into the violations array.
    function getViolationsForRule(
        bytes32 ruleId
    ) external view returns (uint256[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Deadlines
    // -------------------------------------------------------------------------

    /// @notice Retrieve the full filing deadline for a given deadlineId.
    /// @param deadlineId The deadline's unique identifier.
    /// @return The FilingDeadline struct. All fields are zero if the deadline
    ///         does not exist — check dueDate > 0 to confirm existence.
    function getDeadline(
        bytes32 deadlineId
    ) external view returns (TallyviewTypes.FilingDeadline memory);

    /// @notice Get all deadlineIds associated with an organization.
    /// @param org The org's address.
    /// @return Array of deadlineIds. Empty if the org has no deadlines.
    function getDeadlinesForOrg(
        address org
    ) external view returns (bytes32[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Dashboard
    // -------------------------------------------------------------------------

    /// @notice Quick compliance health check for an organization. Designed for
    ///         dashboard display — one call returns the key indicators.
    /// @param org The org's address.
    /// @return activeRules      Number of active compliance rules for this org.
    /// @return totalViolations  Total violations recorded against this org.
    /// @return overdueDeadlines Number of deadlines currently in Overdue status.
    function getOrgComplianceSummary(
        address org
    )
        external
        view
        returns (
            uint256 activeRules,
            uint256 totalViolations,
            uint256 overdueDeadlines
        );
}
