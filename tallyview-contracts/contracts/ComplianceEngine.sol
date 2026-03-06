// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {TallyviewTypes} from "./libraries/TallyviewTypes.sol";
import {IAuditLedger} from "./interfaces/IAuditLedger.sol";
import {IComplianceEngine} from "./interfaces/IComplianceEngine.sol";

/// @title ComplianceEngine
/// @author Tallyview
/// @notice Active enforcement layer for nonprofit financial compliance on the
///         Tallyview Avalanche L1.
///
///         Encodes compliance rules as onchain state: restricted fund spending limits,
///         foundation grant caps, overhead ratio ceilings, government contract
///         restrictions, and regulatory filing deadlines.
///
///         The core abstraction is a ComplianceRule — a boundary with a type, a
///         threshold, and enforcement logic. The SaaS layer does the heavy analysis;
///         the relay submits summarized results here. The contract enforces boundaries,
///         records violations, and emits events that dashboards consume in real time
///         via Avalanche's sub-second finality.
///
///         When a reported value crosses a threshold the contract does NOT revert.
///         It records the breach, transitions status to Violated, and creates an
///         immutable violation record. The contract is a record of truth, not a
///         gatekeeper.
/// @dev UUPS upgradeable. Deployed behind an ERC1967 proxy.
///      References IAuditLedger for org validation — does not duplicate org storage.
contract ComplianceEngine is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IComplianceEngine
{
    // -------------------------------------------------------------------------
    //  Roles
    // -------------------------------------------------------------------------

    /// @notice Platform administrators. Can create rules, override statuses,
    ///         deactivate rules, manage deadlines, and authorize upgrades.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Granted to the Tallyview relay service. Can create rules on behalf
    ///         of foundations/boards/regulators, report values, and manage deadlines.
    bytes32 public constant SYSTEM_ROLE = keccak256("SYSTEM_ROLE");

    /// @notice Granted to foundation accounts. Can create compliance rules
    ///         (e.g. grant spending caps) for their grantee organizations.
    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");

    // -------------------------------------------------------------------------
    //  Constants
    // -------------------------------------------------------------------------

    /// @notice Threshold at which a rule transitions from Compliant to AtRisk,
    ///         expressed in basis points of the rule's threshold value.
    ///         9000 = 90% — when currentValue exceeds 90% of the threshold, the
    ///         rule is considered at risk of violation.
    uint256 public constant AT_RISK_THRESHOLD_BPS = 9000;

    // -------------------------------------------------------------------------
    //  Storage
    // -------------------------------------------------------------------------

    /// @notice Reference to the AuditLedger contract for org validation.
    ///         Set once in initialize; follows proxy upgrades automatically.
    IAuditLedger public auditLedger;

    /// @dev Compliance rules keyed by caller-provided ruleId.
    ///      A stored org of address(0) means the rule does not exist.
    mapping(bytes32 => TallyviewTypes.ComplianceRule) private _rules;

    /// @dev RuleIds per organization for enumeration.
    mapping(address => bytes32[]) private _orgRules;

    /// @dev Flat array of all violations. The array index IS the unique ID —
    ///      monotonic counter guarantees uniqueness even within the same block.
    TallyviewTypes.Violation[] public violations;

    /// @dev Violation indices per organization.
    mapping(address => uint256[]) private _orgViolations;

    /// @dev Violation indices per rule.
    mapping(bytes32 => uint256[]) private _ruleViolations;

    /// @dev Filing deadlines keyed by caller-provided deadlineId.
    ///      A stored dueDate of 0 means the deadline does not exist.
    mapping(bytes32 => TallyviewTypes.FilingDeadline) private _deadlines;

    /// @dev DeadlineIds per organization for enumeration.
    mapping(address => bytes32[]) private _orgDeadlines;

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
    //  Compliance Rules
    // -------------------------------------------------------------------------

    /// @inheritdoc IComplianceEngine
    function createRule(
        bytes32 ruleId,
        address org,
        address setBy,
        TallyviewTypes.RuleType ruleType,
        string calldata label,
        uint128 threshold,
        uint48 startDate,
        uint48 endDate
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(SYSTEM_ROLE, msg.sender)
                && !hasRole(FUNDER_ROLE, msg.sender)
        ) revert Unauthorized();

        _validateOrg(org);

        if (setBy == address(0)) revert ZeroAddress();
        if (_rules[ruleId].org != address(0)) revert RuleAlreadyExists();
        if (threshold == 0) revert ZeroAmount();
        if (endDate > 0 && startDate >= endDate) revert InvalidDateRange();

        _rules[ruleId] = TallyviewTypes.ComplianceRule({
            org: org,
            setBy: setBy,
            ruleType: ruleType,
            label: label,
            threshold: threshold,
            currentValue: 0,
            startDate: startDate,
            endDate: endDate,
            status: TallyviewTypes.RuleStatus.Compliant,
            active: true
        });

        _orgRules[org].push(ruleId);

        emit RuleCreated(ruleId, org, ruleType, label, threshold);
    }

    /// @inheritdoc IComplianceEngine
    /// @dev reportValue behaves differently based on RuleType:
    ///      - SpendingCap:     currentValue += amount (spending accumulates over
    ///                         the life of the grant/fund)
    ///      - OverheadRatio:   currentValue = amount (each report is a fresh
    ///                         snapshot — the ratio right now)
    ///      - CustomThreshold: currentValue = amount (snapshot, same as OverheadRatio)
    ///
    ///      Threshold checks evaluate Violated FIRST, then AtRisk. A single report
    ///      that crosses both thresholds produces ONE status change to Violated and
    ///      ONE violation record — not two separate transitions.
    ///
    ///      Once Violated, further reports still update currentValue (we track how
    ///      far over the org went) but do NOT create additional violations.
    function reportValue(bytes32 ruleId, uint128 amount) external {
        if (!hasRole(SYSTEM_ROLE, msg.sender)) revert Unauthorized();

        TallyviewTypes.ComplianceRule storage rule = _rules[ruleId];
        if (rule.org == address(0)) revert RuleNotFound();
        if (!rule.active) revert RuleNotActive();
        if (amount == 0) revert ZeroAmount();
        if (rule.endDate > 0 && block.timestamp > rule.endDate) {
            revert RuleExpired();
        }

        if (rule.ruleType == TallyviewTypes.RuleType.SpendingCap) {
            rule.currentValue += amount;
        } else {
            rule.currentValue = amount;
        }

        emit ValueReported(ruleId, rule.org, amount, rule.currentValue);

        // Violated check first — a single jump from below AtRisk to above
        // threshold produces one Violated transition, not Compliant→AtRisk
        // followed by AtRisk→Violated.
        if (
            rule.currentValue > rule.threshold
                && rule.status != TallyviewTypes.RuleStatus.Violated
        ) {
            TallyviewTypes.RuleStatus oldStatus = rule.status;
            rule.status = TallyviewTypes.RuleStatus.Violated;

            _recordViolation(
                ruleId,
                bytes32(0),
                rule.org,
                _violationTypeForRule(rule.ruleType),
                rule.threshold,
                rule.currentValue,
                bytes32(0)
            );

            emit RuleStatusChanged(ruleId, rule.org, oldStatus, TallyviewTypes.RuleStatus.Violated);
        } else if (
            rule.currentValue > _atRiskThreshold(rule.threshold)
                && rule.status == TallyviewTypes.RuleStatus.Compliant
        ) {
            rule.status = TallyviewTypes.RuleStatus.AtRisk;

            emit RuleStatusChanged(
                ruleId,
                rule.org,
                TallyviewTypes.RuleStatus.Compliant,
                TallyviewTypes.RuleStatus.AtRisk
            );
        }
    }

    /// @inheritdoc IComplianceEngine
    function updateRuleStatus(
        bytes32 ruleId,
        TallyviewTypes.RuleStatus newStatus
    ) external {
        if (!hasRole(ADMIN_ROLE, msg.sender) && !hasRole(SYSTEM_ROLE, msg.sender)) {
            revert Unauthorized();
        }

        TallyviewTypes.ComplianceRule storage rule = _rules[ruleId];
        if (rule.org == address(0)) revert RuleNotFound();

        TallyviewTypes.RuleStatus oldStatus = rule.status;
        rule.status = newStatus;

        emit RuleStatusChanged(ruleId, rule.org, oldStatus, newStatus);
    }

    /// @inheritdoc IComplianceEngine
    function deactivateRule(bytes32 ruleId) external {
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized();

        TallyviewTypes.ComplianceRule storage rule = _rules[ruleId];
        if (rule.org == address(0)) revert RuleNotFound();
        if (!rule.active) revert RuleNotActive();

        rule.active = false;

        emit RuleDeactivated(ruleId);
    }

    // -------------------------------------------------------------------------
    //  Filing Deadlines
    // -------------------------------------------------------------------------

    /// @inheritdoc IComplianceEngine
    function createDeadline(
        bytes32 deadlineId,
        address org,
        string calldata filingType,
        uint48 dueDate
    ) external {
        if (!hasRole(ADMIN_ROLE, msg.sender) && !hasRole(SYSTEM_ROLE, msg.sender)) {
            revert Unauthorized();
        }

        _validateOrg(org);

        if (_deadlines[deadlineId].dueDate > 0) revert DeadlineAlreadyExists();
        if (dueDate <= block.timestamp) revert InvalidDateRange();

        _deadlines[deadlineId] = TallyviewTypes.FilingDeadline({
            org: org,
            filingType: filingType,
            dueDate: dueDate,
            completedDate: 0,
            status: TallyviewTypes.DeadlineStatus.Pending
        });

        _orgDeadlines[org].push(deadlineId);

        emit DeadlineCreated(deadlineId, org, filingType, dueDate);
    }

    /// @inheritdoc IComplianceEngine
    function markDeadlineCompleted(bytes32 deadlineId) external {
        if (!hasRole(SYSTEM_ROLE, msg.sender) && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert Unauthorized();
        }

        TallyviewTypes.FilingDeadline storage dl = _deadlines[deadlineId];
        if (dl.dueDate == 0) revert DeadlineNotFound();
        if (dl.completedDate > 0) revert DeadlineAlreadyCompleted();

        dl.completedDate = uint48(block.timestamp);

        TallyviewTypes.DeadlineStatus oldStatus = dl.status;
        dl.status = TallyviewTypes.DeadlineStatus.Met;

        emit DeadlineCompleted(deadlineId, dl.org);
        emit DeadlineStatusChanged(deadlineId, dl.org, oldStatus, TallyviewTypes.DeadlineStatus.Met);
    }

    /// @inheritdoc IComplianceEngine
    function updateDeadlineStatus(
        bytes32 deadlineId,
        TallyviewTypes.DeadlineStatus newStatus
    ) external {
        if (!hasRole(SYSTEM_ROLE, msg.sender) && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert Unauthorized();
        }

        TallyviewTypes.FilingDeadline storage dl = _deadlines[deadlineId];
        if (dl.dueDate == 0) revert DeadlineNotFound();
        if (dl.completedDate > 0) revert DeadlineAlreadyCompleted();

        TallyviewTypes.DeadlineStatus oldStatus = dl.status;

        // Only three valid transitions:
        //   Pending → Approaching
        //   Pending → Overdue
        //   Approaching → Overdue
        bool valid = (
            oldStatus == TallyviewTypes.DeadlineStatus.Pending
                && newStatus == TallyviewTypes.DeadlineStatus.Approaching
        ) || (
            oldStatus == TallyviewTypes.DeadlineStatus.Pending
                && newStatus == TallyviewTypes.DeadlineStatus.Overdue
        ) || (
            oldStatus == TallyviewTypes.DeadlineStatus.Approaching
                && newStatus == TallyviewTypes.DeadlineStatus.Overdue
        );

        if (!valid) revert InvalidDeadlineTransition();

        dl.status = newStatus;

        if (newStatus == TallyviewTypes.DeadlineStatus.Overdue) {
            _recordViolation(
                bytes32(0),
                deadlineId,
                dl.org,
                "deadline-missed",
                uint128(dl.dueDate),
                uint128(block.timestamp),
                bytes32(0)
            );
        }

        emit DeadlineStatusChanged(deadlineId, dl.org, oldStatus, newStatus);
    }

    // -------------------------------------------------------------------------
    //  Queries — Compliance Rules
    // -------------------------------------------------------------------------

    /// @inheritdoc IComplianceEngine
    function getRule(
        bytes32 ruleId
    ) external view returns (TallyviewTypes.ComplianceRule memory) {
        return _rules[ruleId];
    }

    /// @inheritdoc IComplianceEngine
    function getRulesForOrg(
        address org
    ) external view returns (bytes32[] memory) {
        return _orgRules[org];
    }

    // -------------------------------------------------------------------------
    //  Queries — Violations
    // -------------------------------------------------------------------------

    /// @inheritdoc IComplianceEngine
    function getViolation(
        uint256 index
    ) external view returns (TallyviewTypes.Violation memory) {
        return violations[index];
    }

    /// @inheritdoc IComplianceEngine
    function getViolationCount() external view returns (uint256) {
        return violations.length;
    }

    /// @inheritdoc IComplianceEngine
    function getViolationsForOrg(
        address org
    ) external view returns (uint256[] memory) {
        return _orgViolations[org];
    }

    /// @inheritdoc IComplianceEngine
    function getViolationsForRule(
        bytes32 ruleId
    ) external view returns (uint256[] memory) {
        return _ruleViolations[ruleId];
    }

    // -------------------------------------------------------------------------
    //  Queries — Filing Deadlines
    // -------------------------------------------------------------------------

    /// @inheritdoc IComplianceEngine
    function getDeadline(
        bytes32 deadlineId
    ) external view returns (TallyviewTypes.FilingDeadline memory) {
        return _deadlines[deadlineId];
    }

    /// @inheritdoc IComplianceEngine
    function getDeadlinesForOrg(
        address org
    ) external view returns (bytes32[] memory) {
        return _orgDeadlines[org];
    }

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @inheritdoc IComplianceEngine
    function getOrgComplianceSummary(
        address org
    )
        external
        view
        returns (
            uint256 activeRules,
            uint256 totalViolations,
            uint256 overdueDeadlines
        )
    {
        bytes32[] storage ruleIds = _orgRules[org];
        for (uint256 i; i < ruleIds.length; ) {
            if (_rules[ruleIds[i]].active) {
                unchecked { ++activeRules; }
            }
            unchecked { ++i; }
        }

        totalViolations = _orgViolations[org].length;

        bytes32[] storage deadlineIds = _orgDeadlines[org];
        for (uint256 i; i < deadlineIds.length; ) {
            if (_deadlines[deadlineIds[i]].status == TallyviewTypes.DeadlineStatus.Overdue) {
                unchecked { ++overdueDeadlines; }
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

    /// @dev Record an immutable violation. Pushes to the flat violations array,
    ///      indexes by org and (if applicable) by rule, and emits ViolationRecorded.
    /// @return index The monotonic index of the new violation.
    function _recordViolation(
        bytes32 ruleId,
        bytes32 deadlineId,
        address org,
        string memory violationType,
        uint128 thresholdValue,
        uint128 actualValue,
        bytes32 evidenceHash
    ) internal returns (uint256 index) {
        violations.push(
            TallyviewTypes.Violation({
                ruleId: ruleId,
                deadlineId: deadlineId,
                org: org,
                timestamp: uint48(block.timestamp),
                violationType: violationType,
                thresholdValue: thresholdValue,
                actualValue: actualValue,
                evidenceHash: evidenceHash
            })
        );

        index = violations.length - 1;

        _orgViolations[org].push(index);
        if (ruleId != bytes32(0)) {
            _ruleViolations[ruleId].push(index);
        }

        emit ViolationRecorded(index, ruleId, org, violationType);
    }

    /// @dev Validate that an org is registered and active in AuditLedger.
    ///      Reverts with OrgNotRegistered or OrgNotActive.
    function _validateOrg(address org) internal view {
        if (!auditLedger.isOrganizationRegistered(org)) revert OrgNotRegistered();
        if (!auditLedger.isOrganizationActive(org)) revert OrgNotActive();
    }

    /// @dev Compute the at-risk threshold for a given rule threshold.
    ///      Returns (threshold * AT_RISK_THRESHOLD_BPS) / 10000.
    ///      The multiplication is performed in uint256 so it cannot overflow, but
    ///      the uint128 guard is retained as a defensive best-practice signal:
    ///      for threshold > ~3.8 × 10^34 we short-circuit to threshold − 1
    ///      (effectively treating anything near uint128 max as always at risk).
    ///      Realistic nonprofit values (under $1B = 10^11 cents) never trigger this.
    function _atRiskThreshold(uint128 threshold) internal pure returns (uint128) {
        if (threshold > type(uint128).max / AT_RISK_THRESHOLD_BPS) {
            return threshold - 1;
        }
        return uint128((uint256(threshold) * AT_RISK_THRESHOLD_BPS) / 10_000);
    }

    /// @dev Map a RuleType to its violation type string.
    function _violationTypeForRule(
        TallyviewTypes.RuleType ruleType
    ) internal pure returns (string memory) {
        if (ruleType == TallyviewTypes.RuleType.SpendingCap) {
            return "spending-cap-breach";
        }
        if (ruleType == TallyviewTypes.RuleType.OverheadRatio) {
            return "overhead-exceeded";
        }
        return "custom-threshold-breach";
    }
}
