// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TallyviewTypes} from "../libraries/TallyviewTypes.sol";

/// @title IComplianceEngine
/// @author Tallyview
/// @notice Active enforcement layer for nonprofit financial compliance on the
///         Tallyview Avalanche L1.
///
///         Where AuditLedger is a passive record ("here's what the books looked like"),
///         ComplianceEngine enforces boundaries ("here's what the rules say, and here's
///         whether the org is following them").
///
///         The core abstraction is a ComplianceRule — a boundary with a type, a
///         threshold, and enforcement logic. Grants, restricted funds, overhead limits,
///         and government contract restrictions are all instances of compliance rules
///         with different parameters.
///
///         ComplianceEngine does NOT duplicate org registration or audit storage.
///         It references IAuditLedger for org validation — same address-based identity
///         used everywhere on the Tallyview chain.
///
///         When a reported value crosses a threshold the contract does NOT revert.
///         It records the breach, transitions status to Violated, and creates an
///         immutable violation record. The contract is a record of truth, not a
///         gatekeeper — we want to track HOW FAR over an org went, not block the
///         relay from reporting reality.
///
///         Rich events on every state change enable real-time dashboard consumption
///         via Avalanche's sub-second finality.
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
    //  Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new compliance rule is created for an organization.
    event RuleCreated(
        bytes32 indexed ruleId,
        address indexed org,
        TallyviewTypes.RuleType ruleType,
        string label,
        uint128 threshold
    );

    /// @notice Emitted when a rule is soft-deactivated. The rule data remains
    ///         onchain but no further value reports are accepted.
    event RuleDeactivated(bytes32 indexed ruleId);

    /// @notice Emitted when the relay reports a value against a compliance rule.
    ///         For SpendingCap rules, newTotal reflects cumulative spending.
    ///         For OverheadRatio and CustomThreshold rules, newTotal is the
    ///         snapshot value that replaced the previous one.
    event ValueReported(
        bytes32 indexed ruleId,
        address indexed org,
        uint128 amount,
        uint128 newTotal
    );

    /// @notice Emitted when a rule transitions between compliance states.
    ///         Automatic transitions happen during reportValue (Compliant → AtRisk,
    ///         Compliant → Violated, AtRisk → Violated). Manual transitions happen
    ///         via updateRuleStatus (e.g. Violated → Compliant after data correction).
    event RuleStatusChanged(
        bytes32 indexed ruleId,
        address indexed org,
        TallyviewTypes.RuleStatus oldStatus,
        TallyviewTypes.RuleStatus newStatus
    );

    /// @notice Emitted when a violation is recorded. Violations are immutable —
    ///         they cannot be deleted or modified after creation.
    event ViolationRecorded(
        uint256 indexed violationIndex,
        bytes32 indexed ruleId,
        address indexed org,
        string violationType
    );

    /// @notice Emitted when a filing deadline is created for an organization.
    event DeadlineCreated(
        bytes32 indexed deadlineId,
        address indexed org,
        string filingType,
        uint48 dueDate
    );

    /// @notice Emitted when a deadline transitions between lifecycle states.
    ///         Transitioning to Overdue auto-creates a "deadline-missed" violation.
    event DeadlineStatusChanged(
        bytes32 indexed deadlineId,
        address indexed org,
        TallyviewTypes.DeadlineStatus oldStatus,
        TallyviewTypes.DeadlineStatus newStatus
    );

    /// @notice Emitted when a filing deadline is marked as met.
    event DeadlineCompleted(
        bytes32 indexed deadlineId,
        address indexed org
    );

    // -------------------------------------------------------------------------
    //  Compliance Rules
    // -------------------------------------------------------------------------

    /// @notice Create a compliance rule — a boundary applied to an organization.
    ///         Rules represent any compliance constraint: restricted fund spending
    ///         limits, foundation grant caps, overhead ratio ceilings, government
    ///         contract restrictions, or custom thresholds.
    /// @dev    setBy is an explicit parameter (not msg.sender) because SYSTEM_ROLE
    ///         creates rules on behalf of foundations, boards, and regulators.
    ///         Only ADMIN_ROLE, SYSTEM_ROLE, or FUNDER_ROLE.
    /// @param ruleId    Unique identifier for this rule (typically a keccak256 hash
    ///                  of a human-readable label like "FORD-GRANT-2026-417").
    /// @param org       The nonprofit's address. Must be registered and active in
    ///                  AuditLedger.
    /// @param setBy     The entity that established this rule (foundation, regulator,
    ///                  board, or system). Must not be address(0).
    /// @param ruleType  The category of compliance boundary.
    /// @param label     Human-readable description (e.g. "Ford Foundation Grant
    ///                  #2026-417", "Board overhead ceiling").
    /// @param threshold The limit — dollar amount in cents for SpendingCap, basis
    ///                  points for OverheadRatio, raw value for CustomThreshold.
    ///                  Must not be zero.
    /// @param startDate When the rule takes effect (unix timestamp).
    /// @param endDate   When the rule expires (unix timestamp). Pass 0 for indefinite
    ///                  rules (e.g. a board-set overhead ceiling with no expiration).
    ///                  If non-zero, must be greater than startDate.
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

    /// @notice Report a value against a compliance rule.
    ///         The relay calls this to relay financial data from the SaaS layer.
    ///
    ///         Behavior depends on RuleType:
    ///         - SpendingCap:      currentValue += amount (spending accumulates
    ///                             over the life of the grant/fund)
    ///         - OverheadRatio:    currentValue = amount (each report is a fresh
    ///                             snapshot — the ratio right now)
    ///         - CustomThreshold:  currentValue = amount (snapshot, same as
    ///                             OverheadRatio)
    ///
    ///         Automatically transitions status and records violations when
    ///         thresholds are breached. Does NOT revert on breach — the violation
    ///         is recorded and execution continues.
    ///
    ///         Reverts with RuleExpired if endDate > 0 and block.timestamp > endDate.
    /// @dev    Only SYSTEM_ROLE.
    /// @param ruleId The rule to report against.
    /// @param amount The value to report. For SpendingCap, this is the incremental
    ///               spend. For OverheadRatio/CustomThreshold, this is the new
    ///               snapshot value. Must not be zero.
    function reportValue(bytes32 ruleId, uint128 amount) external;

    /// @notice Manually override a rule's compliance status.
    ///         Allows any direction (e.g. Violated → Compliant after review
    ///         determines a data error was the cause of the breach).
    /// @dev    Only ADMIN_ROLE or SYSTEM_ROLE.
    /// @param ruleId    The rule to update.
    /// @param newStatus The new compliance status.
    function updateRuleStatus(
        bytes32 ruleId,
        TallyviewTypes.RuleStatus newStatus
    ) external;

    /// @notice Deactivate a compliance rule. The rule data remains onchain and
    ///         queryable, but no further value reports are accepted.
    /// @dev    Only ADMIN_ROLE.
    /// @param ruleId The rule to deactivate.
    function deactivateRule(bytes32 ruleId) external;

    // -------------------------------------------------------------------------
    //  Filing Deadlines
    // -------------------------------------------------------------------------

    /// @notice Create a filing deadline for an organization.
    ///         Deadlines track regulatory or reporting obligations: IRS 990 filings,
    ///         state charitable registration renewals, audit report due dates,
    ///         grant reporting deadlines, etc.
    /// @dev    Only ADMIN_ROLE or SYSTEM_ROLE.
    /// @param deadlineId  Unique identifier (e.g. keccak256 of "990-FY2025").
    /// @param org         The nonprofit's address. Must be registered and active.
    /// @param filingType  The type of filing (e.g. "990", "990-PF", "990-EZ",
    ///                    "state-registration-CA", "audit-report",
    ///                    "grant-report-ford-2026").
    /// @param dueDate     Unix timestamp of the deadline. Must be in the future.
    function createDeadline(
        bytes32 deadlineId,
        address org,
        string calldata filingType,
        uint48 dueDate
    ) external;

    /// @notice Mark a filing deadline as completed.
    ///         Sets completedDate to block.timestamp and transitions status to Met.
    /// @dev    Only SYSTEM_ROLE or ADMIN_ROLE.
    /// @param deadlineId The deadline to mark complete.
    function markDeadlineCompleted(bytes32 deadlineId) external;

    /// @notice Transition a deadline's lifecycle status.
    ///         Valid transitions: Pending → Approaching, Pending → Overdue,
    ///         Approaching → Overdue. All other transitions revert.
    ///         Transitioning to Overdue automatically creates a "deadline-missed"
    ///         violation record.
    /// @dev    Only SYSTEM_ROLE or ADMIN_ROLE.
    /// @param deadlineId The deadline to update.
    /// @param newStatus  The target lifecycle status.
    function updateDeadlineStatus(
        bytes32 deadlineId,
        TallyviewTypes.DeadlineStatus newStatus
    ) external;

    // -------------------------------------------------------------------------
    //  Queries — Compliance Rules
    // -------------------------------------------------------------------------

    /// @notice Retrieve the full compliance rule for a given ruleId.
    /// @param ruleId The rule's identifier.
    /// @return The stored ComplianceRule. Check org != address(0) to confirm
    ///         the rule exists.
    function getRule(
        bytes32 ruleId
    ) external view returns (TallyviewTypes.ComplianceRule memory);

    /// @notice Get all ruleIds associated with an organization.
    /// @param org The org's address.
    /// @return An array of bytes32 ruleIds (may be empty).
    function getRulesForOrg(
        address org
    ) external view returns (bytes32[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Violations
    // -------------------------------------------------------------------------

    /// @notice Retrieve a violation by its monotonic index.
    ///         Violations use a flat array — the index IS the unique identifier,
    ///         guaranteeing uniqueness even with multiple violations in the same block.
    /// @param index The violation's array index.
    /// @return The stored Violation record.
    function getViolation(
        uint256 index
    ) external view returns (TallyviewTypes.Violation memory);

    /// @notice Get the total number of recorded violations across all orgs.
    /// @return The current length of the violations array.
    function getViolationCount() external view returns (uint256);

    /// @notice Get all violation indices for an organization.
    /// @param org The org's address.
    /// @return An array of uint256 indices into the violations array.
    function getViolationsForOrg(
        address org
    ) external view returns (uint256[] memory);

    /// @notice Get all violation indices associated with a specific rule.
    /// @param ruleId The rule's identifier.
    /// @return An array of uint256 indices into the violations array.
    function getViolationsForRule(
        bytes32 ruleId
    ) external view returns (uint256[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Filing Deadlines
    // -------------------------------------------------------------------------

    /// @notice Retrieve the full filing deadline for a given deadlineId.
    /// @param deadlineId The deadline's identifier.
    /// @return The stored FilingDeadline. Check dueDate > 0 to confirm the
    ///         deadline exists.
    function getDeadline(
        bytes32 deadlineId
    ) external view returns (TallyviewTypes.FilingDeadline memory);

    /// @notice Get all deadlineIds associated with an organization.
    /// @param org The org's address.
    /// @return An array of bytes32 deadlineIds (may be empty).
    function getDeadlinesForOrg(
        address org
    ) external view returns (bytes32[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @notice Quick compliance health check for an organization.
    ///         Returns counts suitable for dashboard summary cards.
    ///         Combined with Avalanche's sub-second finality, this gives foundation
    ///         program officers a real-time compliance snapshot — status changes
    ///         from reportValue or updateDeadlineStatus are reflected in under a second.
    /// @param org The org's address.
    /// @return activeRules      Number of active compliance rules for this org.
    /// @return totalViolations  Total number of violations recorded for this org.
    /// @return overdueDeadlines Number of deadlines with status == Overdue.
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
