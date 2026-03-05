# ComplianceEngine.sol — Cursor Prompt Guide

> Drop this file into your project root alongside the AuditLedger prompt guide.
> Run these prompts sequentially after AuditLedger is complete and tested.
> Add the deployed AuditLedger contract files to Cursor context for every prompt.

---

## Context: What ComplianceEngine Does

ComplianceEngine is the active enforcement layer for nonprofit financial compliance. Where AuditLedger is a passive record ("here's what the books looked like"), ComplianceEngine enforces boundaries ("here's what the rules say, and here's whether the org is following them").

**This is NOT just grant tracking.** Nonprofits operate under many compliance boundaries simultaneously:

- **Restricted fund spending limits** — donor-restricted contributions, foundation grants, government contracts, endowment draw limits — each with conditions on how money can be spent
- **Overhead / administrative cost ratio thresholds** — set by funders, boards, or as internal policy (e.g., "admin costs cannot exceed 15% of total expenses")
- **Filing deadlines** — IRS 990 filing (4.5 months after fiscal year end + extensions), state charitable registration renewals, audit report due dates, grant reporting deadlines
- **Audit opinion tracking** — whether the org received a clean opinion, qualified opinion, or adverse findings

The SaaS layer does the heavy analysis — parsing accounting data, mapping transactions to categories, calculating ratios. ComplianceEngine receives the *results* of that analysis as onchain state and enforces the boundaries. The contract tracks thresholds, records violations, and emits events that dashboards consume in real time.

The core abstraction is a **ComplianceRule** — a boundary with a type, a threshold, an entity it applies to, and enforcement logic. Grants, restricted funds, overhead limits, and filing deadlines are all instances of compliance rules with different parameters.

### How ComplianceEngine References AuditLedger

ComplianceEngine imports IAuditLedger and calls it to:
- Validate that an org is registered and active before accepting compliance rules
- Reference the org's address-based identity (same address used everywhere)

ComplianceEngine does NOT duplicate org registration, name resolution, or audit storage.

### What Lives Onchain vs. Offchain

**Onchain (ComplianceEngine):**
- Compliance rules with thresholds (spending caps, ratio limits, deadline dates)
- Current values reported against those rules (spending totals, ratio snapshots)
- Rule status (Compliant / AtRisk / Violated)
- Filing deadline status (Pending / Approaching / Overdue / Met)
- Violation records (timestamped, immutable, linked to the rule that was breached)

**Offchain (SaaS layer):**
- Transaction parsing and categorization
- AI-powered expense allocation (program vs. admin vs. fundraising)
- Ratio calculations from raw accounting data
- Peer benchmarking and trend analysis
- Board report generation

The relay submits summarized compliance data to the contract. The contract enforces the rules and emits events. The dashboard reads the events.

---

## Prompt 1: Extend TallyviewTypes.sol

```
We're building ComplianceEngine.sol, the second of five core contracts for Tallyview's Avalanche L1. Before writing the contract, extend TallyviewTypes.sol with the types ComplianceEngine needs.

Add these to the existing TallyviewTypes library (keep what's already there for AuditLedger):

ENUMS:

- RuleType: SpendingCap, OverheadRatio, CustomThreshold
  SpendingCap = restricted fund, grant, or contract with a dollar limit
  OverheadRatio = administrative cost ceiling in basis points
  CustomThreshold = extensible catch-all for future rule types (audit opinion scores, program output minimums, etc.)

- RuleStatus: Compliant, AtRisk, Violated

- DeadlineStatus: Pending, Approaching, Overdue, Met

STRUCTS:

- ComplianceRule: a compliance boundary applied to an organization
  - address org (the nonprofit — matches their AuditLedger address)
  - address setBy (who created this rule — foundation, regulator, board, or system)
  - RuleType ruleType
  - string label (human-readable description, e.g., "Ford Foundation Grant #2026-417", "Board overhead ceiling", "HUD CoC spending restriction")
  - uint128 threshold (the limit — dollar amount in cents for SpendingCap, basis points for OverheadRatio, raw value for CustomThreshold)
  - uint128 currentValue (running value reported against this rule — spending total, current ratio, etc.)
  - uint48 startDate (when the rule takes effect)
  - uint48 endDate (when the rule expires — 0 for indefinite rules like board-set overhead limits)
  - RuleStatus status
  - bool active

- FilingDeadline: tracks a regulatory or reporting deadline
  - address org
  - string filingType (e.g., "990", "990-PF", "990-EZ", "state-registration-CA", "state-registration-NY", "audit-report", "grant-report-ford-2026")
  - uint48 dueDate
  - uint48 completedDate (0 if not yet completed)
  - DeadlineStatus status

- Violation: a recorded compliance violation
  - bytes32 ruleId (the compliance rule that was breached, or bytes32(0) if deadline-related)
  - bytes32 deadlineId (the deadline that was missed, or bytes32(0) if rule-related)
  - address org
  - string violationType (e.g., "spending-cap-breach", "overhead-exceeded", "deadline-missed", "custom-threshold-breach")
  - uint128 thresholdValue (the limit that was set)
  - uint128 actualValue (the value that breached the limit)
  - uint48 timestamp
  - bytes32 evidenceHash (hash of supporting data from the SaaS layer)

IMPORTANT: Do NOT store the mapping key inside the struct. The ruleId, deadlineId, and violation index are external identifiers — the struct only contains data that isn't already the key.

Keep struct packing reasonable — clarity first, not gas optimization. We control gas costs on our own L1.
```

---

## Prompt 2: The Interface

```
Create IComplianceEngine.sol — the interface for the ComplianceEngine contract. Import TallyviewTypes.sol for all struct and enum types.

ComplianceEngine is the active enforcement layer for nonprofit financial compliance. It handles ANY compliance boundary a nonprofit operates under — restricted fund spending limits, foundation grant caps, overhead ratio ceilings, government contract restrictions, and regulatory filing deadlines. The core abstraction is a ComplianceRule: a boundary with a type, a threshold, and enforcement logic.

CUSTOM ERRORS:
- RuleNotFound()
- RuleAlreadyExists()
- RuleNotActive()
- RuleExpired()
- DeadlineNotFound()
- DeadlineAlreadyExists()
- DeadlineAlreadyCompleted()
- InvalidDateRange()
- InvalidDeadlineTransition()
- OrgNotRegistered()
- OrgNotActive()
- Unauthorized()
- ZeroAmount()
- ZeroAddress()

NOTE: There is intentionally no error for "spending exceeds cap." When a value crosses the threshold, the contract does NOT revert — it records the breach, transitions status to Violated, and creates a violation record. We want to track HOW FAR over the org went, not block the relay from reporting reality. The contract is a record of truth, not a gatekeeper.

EVENTS:
- RuleCreated(bytes32 indexed ruleId, address indexed org, TallyviewTypes.RuleType ruleType, string label, uint128 threshold)
- RuleDeactivated(bytes32 indexed ruleId)
- ValueReported(bytes32 indexed ruleId, address indexed org, uint128 amount, uint128 newTotal)
- RuleStatusChanged(bytes32 indexed ruleId, address indexed org, TallyviewTypes.RuleStatus oldStatus, TallyviewTypes.RuleStatus newStatus)
- ViolationRecorded(uint256 indexed violationIndex, bytes32 indexed ruleId, address indexed org, string violationType)
- DeadlineCreated(bytes32 indexed deadlineId, address indexed org, string filingType, uint48 dueDate)
- DeadlineStatusChanged(bytes32 indexed deadlineId, address indexed org, TallyviewTypes.DeadlineStatus oldStatus, TallyviewTypes.DeadlineStatus newStatus)
- DeadlineCompleted(bytes32 indexed deadlineId, address indexed org)

FUNCTIONS:

Compliance rules:
- createRule(bytes32 ruleId, address org, address setBy, TallyviewTypes.RuleType ruleType, string calldata label, uint128 threshold, uint48 startDate, uint48 endDate) — create a compliance rule. endDate of 0 means indefinite (e.g., a board-set overhead ceiling with no expiration). Only ADMIN_ROLE, SYSTEM_ROLE, or FUNDER_ROLE.
- reportValue(bytes32 ruleId, uint128 amount) — relay reports an incremental value against a rule. For SpendingCap rules, this adds to currentValue (spending accumulates). For OverheadRatio and CustomThreshold rules, this REPLACES currentValue (it's a snapshot, not cumulative). Automatically transitions status and records violations if thresholds are breached. Does NOT revert on breach. Only SYSTEM_ROLE.
- updateRuleStatus(bytes32 ruleId, TallyviewTypes.RuleStatus newStatus) — manual override (e.g., Violated → Compliant after review determines a data error). Only ADMIN_ROLE or SYSTEM_ROLE.
- deactivateRule(bytes32 ruleId) — deactivate a rule. Only ADMIN_ROLE.

Filing deadlines:
- createDeadline(bytes32 deadlineId, address org, string calldata filingType, uint48 dueDate) — create a filing deadline. Only ADMIN_ROLE or SYSTEM_ROLE.
- markDeadlineCompleted(bytes32 deadlineId) — mark as met. Only SYSTEM_ROLE or ADMIN_ROLE.
- updateDeadlineStatus(bytes32 deadlineId, TallyviewTypes.DeadlineStatus newStatus) — transition status as dates approach/pass. Transitioning to Overdue auto-creates a violation. Only valid transitions: Pending → Approaching, Pending → Overdue, Approaching → Overdue. Only SYSTEM_ROLE or ADMIN_ROLE.

Queries:
- getRule(bytes32 ruleId) → ComplianceRule
- getRulesForOrg(address org) → bytes32[] — all ruleIds for an org
- getViolation(uint256 index) → Violation — violations use a monotonic counter for guaranteed uniqueness
- getViolationCount() → uint256
- getViolationsForOrg(address org) → uint256[] — violation indices for an org
- getViolationsForRule(bytes32 ruleId) → uint256[] — violation indices for a specific rule
- getDeadline(bytes32 deadlineId) → FilingDeadline
- getDeadlinesForOrg(address org) → bytes32[]
- getOrgComplianceSummary(address org) → (uint256 activeRules, uint256 totalViolations, uint256 overdueDeadlines) — quick health check for dashboard

DESIGN NOTES:
- ComplianceEngine references IAuditLedger for org validation. It does NOT duplicate org storage.
- setBy is an explicit parameter on createRule (not msg.sender) because SYSTEM_ROLE creates rules on behalf of foundations, boards, and regulators.
- reportValue behaves differently based on RuleType:
  - SpendingCap: currentValue += amount (spending accumulates over time)
  - OverheadRatio: currentValue = amount (each report is a fresh snapshot — the ratio right now)
  - CustomThreshold: currentValue = amount (same as OverheadRatio — snapshot)
  This distinction is critical. A grant has a running spending total. An overhead ratio is recalculated each period.
- Violations use a monotonic uint256 counter (array index). No hashed IDs. Guarantees uniqueness even with multiple violations in the same block.
- Arrays for enumeration are simple push arrays. We control gas on our own L1.
- reportValue checks if the rule has expired (endDate > 0 && block.timestamp > endDate) and reverts with RuleExpired.
- Rich events for real-time dashboard consumption via Avalanche's sub-second finality.
```

---

## Prompt 3: The Implementation

```
Implement ComplianceEngine.sol based on the IComplianceEngine interface.

ARCHITECTURE:
- UUPS upgradeable (same pattern as AuditLedger)
- AccessControlUpgradeable with ADMIN_ROLE, SYSTEM_ROLE, FUNDER_ROLE (public bytes32 constants)
- Initialize accepts AuditLedger proxy address:
  function initialize(address auditLedgerAddress) public initializer
- Store IAuditLedger reference for org validation

STORAGE DESIGN:
- IAuditLedger public auditLedger (set in initialize)
- mapping(bytes32 => TallyviewTypes.ComplianceRule) for rules
- mapping(address => bytes32[]) for ruleIds per org
- TallyviewTypes.Violation[] public violations (flat array — index IS the ID)
- mapping(address => uint256[]) for violation indices per org
- mapping(bytes32 => uint256[]) for violation indices per rule
- mapping(bytes32 => TallyviewTypes.FilingDeadline) for deadlines
- mapping(address => bytes32[]) for deadlineIds per org
- uint256 public constant AT_RISK_THRESHOLD_BPS = 9000 (90%)
- uint256[50] private __gap

RULE CREATION:
- createRule:
  - Validate org registered and active via _validateOrg helper
  - Revert if setBy is zero address (ZeroAddress)
  - Revert if ruleId already exists (check stored org != address(0) as sentinel)
  - Revert if threshold is zero (ZeroAmount)
  - If endDate > 0, revert if startDate >= endDate (InvalidDateRange)
  - endDate of 0 is valid — means the rule has no expiration
  - Store ComplianceRule: currentValue = 0, status = Compliant, active = true
  - Push ruleId to org's rules array
  - Emit RuleCreated
  - Access: ADMIN_ROLE, SYSTEM_ROLE, or FUNDER_ROLE

VALUE REPORTING:
- reportValue:
  - Only SYSTEM_ROLE
  - Rule must exist and be active
  - Revert if amount is zero (ZeroAmount)
  - If endDate > 0 and block.timestamp > endDate: revert RuleExpired
  - Update currentValue based on ruleType:
    - SpendingCap: currentValue += amount (cumulative)
    - OverheadRatio: currentValue = amount (snapshot replacement)
    - CustomThreshold: currentValue = amount (snapshot replacement)
  - Emit ValueReported with amount and new currentValue
  - Check thresholds — IMPORTANT: check Violated FIRST, then AtRisk. A single report that crosses both thresholds should result in ONE status change to Violated, not two.
    - If currentValue > threshold AND status != Violated:
      - Record old status, set to Violated
      - Determine violationType from ruleType: SpendingCap → "spending-cap-breach", OverheadRatio → "overhead-exceeded", CustomThreshold → "custom-threshold-breach"
      - Call _recordViolation
      - Emit RuleStatusChanged
    - Else if currentValue > _atRiskThreshold(threshold) AND status == Compliant:
      - Set to AtRisk
      - Emit RuleStatusChanged
  - Once Violated, further reports still update currentValue but do NOT create additional violations for the same breach.

- _atRiskThreshold(uint128 threshold) → uint128:
  - Returns (threshold * AT_RISK_THRESHOLD_BPS) / 10000
  - IMPORTANT: For very large thresholds, (threshold * 9000) could overflow uint128. Safe approach: if threshold > type(uint128).max / AT_RISK_THRESHOLD_BPS, return threshold - 1 (effectively treating anything near max as always at risk). For realistic nonprofit grant sizes (under $1B = 100_000_000_000 cents) this will never overflow, but the guard shows good engineering practice for competition judges.

STATUS OVERRIDE:
- updateRuleStatus:
  - ADMIN_ROLE or SYSTEM_ROLE
  - Rule must exist
  - Allows any direction (Violated → Compliant for corrections)
  - Emit RuleStatusChanged

DEACTIVATION:
- deactivateRule:
  - ADMIN_ROLE only
  - Rule must exist and be active
  - Set active = false
  - Emit RuleDeactivated

DEADLINE LOGIC:
- createDeadline:
  - _validateOrg
  - Revert if deadlineId exists (check dueDate > 0 as sentinel)
  - Revert if dueDate <= block.timestamp (InvalidDateRange)
  - Store: status = Pending, completedDate = 0
  - Push to org's deadlines array
  - Emit DeadlineCreated

- markDeadlineCompleted:
  - SYSTEM_ROLE or ADMIN_ROLE
  - Must exist, revert if completedDate > 0 (DeadlineAlreadyCompleted)
  - Set completedDate = uint48(block.timestamp), status = Met
  - Emit DeadlineCompleted and DeadlineStatusChanged

- updateDeadlineStatus:
  - SYSTEM_ROLE or ADMIN_ROLE
  - Must exist and not be completed (completedDate == 0)
  - Validate transitions: only Pending → Approaching, Pending → Overdue, Approaching → Overdue. Revert with InvalidDeadlineTransition otherwise.
  - If transitioning to Overdue: _recordViolation with ruleId = bytes32(0), deadlineId = deadlineId, type "deadline-missed", threshold = dueDate cast to uint128, actual = block.timestamp cast to uint128
  - Emit DeadlineStatusChanged

INTERNAL HELPERS:
- _recordViolation(bytes32 ruleId, bytes32 deadlineId, address org, string memory violationType, uint128 thresholdValue, uint128 actualValue, bytes32 evidenceHash) → uint256
  - Push new Violation to violations array
  - Index = violations.length - 1
  - Push index to org's violations array
  - If ruleId != bytes32(0), push index to rule's violations array
  - Emit ViolationRecorded
  - Return index

- _validateOrg(address org): calls auditLedger, reverts with OrgNotRegistered or OrgNotActive

- _violationTypeForRule(TallyviewTypes.RuleType ruleType) → string: returns the appropriate violation type string

QUERY FUNCTIONS:
- Straightforward reads
- getOrgComplianceSummary loops org's arrays for counts. Fine on our L1.

STYLE:
- Same conventions as AuditLedger: NatSpec, custom errors from interface, _underscore internals, __gap
- AT_RISK_THRESHOLD_BPS as a named public constant
- _recordViolation reused everywhere
- Clear NatSpec explaining the cumulative vs. snapshot distinction on reportValue
```

---

## Prompt 4: Tests

```
Write comprehensive Hardhat tests for ComplianceEngine in test/ComplianceEngine.test.ts using TypeScript, ethers v6, and Chai.

IMPORTANT: Some tests require time manipulation. Use:
  import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  await time.increase(86400 * 30); // advance 30 days
  await time.increaseTo(targetTimestamp); // advance to specific time

SETUP:
- deployFixture() that:
  - Deploys AuditLedger through UUPS proxy
  - Grants SYSTEM_ROLE on AuditLedger to systemRelay
  - Registers test org on AuditLedger (orgSigner.address, name "test-org")
  - Registers second org (anotherOrgSigner.address, name "another-org")
  - Deploys ComplianceEngine through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
  - Grants SYSTEM_ROLE on ComplianceEngine to systemRelay
  - Grants FUNDER_ROLE on ComplianceEngine to funderSigner
  - Returns: { complianceEngine, auditLedger, admin, systemRelay, orgSigner, funderSigner, anotherOrgSigner, unauthorized }

- Helper constants:
  - SPENDING_RULE_ID = keccak256 of "FORD-GRANT-2026-417"
  - OVERHEAD_RULE_ID = keccak256 of "BOARD-OVERHEAD-CEILING"
  - DEADLINE_ID = keccak256 of "990-FY2025"
  - SPENDING_CAP = 15000000 (representing $150,000.00 in cents)
  - OVERHEAD_MAX_BPS = 1500 (15%)
  - Start date = current block timestamp
  - End date = current timestamp + 365 days
  - INDEFINITE_END = 0

- Helper: createTestSpendingRule() — creates a SpendingCap rule with defaults
- Helper: createTestOverheadRule() — creates an OverheadRatio rule with endDate = 0 (indefinite)
- Helper: createTestDeadline() — creates a 990 filing deadline 90 days from now

TEST CATEGORIES:

describe("Deployment & Initialization")
  - Deploys correctly with AuditLedger reference
  - auditLedger() returns correct address
  - Roles assigned properly
  - Cannot initialize twice

describe("Rule Creation")
  - Admin can create a SpendingCap rule for a registered org
  - Admin can create an OverheadRatio rule with endDate = 0 (indefinite — no InvalidDateRange)
  - Admin can create a CustomThreshold rule
  - Funder role can create a rule
  - System role can create a rule
  - Cannot create rule for unregistered org (OrgNotRegistered)
  - Cannot create rule for deactivated org (OrgNotActive — deactivate in AuditLedger first)
  - Cannot create duplicate ruleId (RuleAlreadyExists)
  - Cannot create with zero threshold (ZeroAmount)
  - Cannot create with zero address setBy (ZeroAddress)
  - Cannot create with startDate >= endDate when endDate > 0 (InvalidDateRange)
  - Emits RuleCreated with correct args including ruleType and label
  - getRule returns correct fields (org, setBy, ruleType, label, threshold, currentValue == 0, status == Compliant, active)
  - getRulesForOrg includes the new ruleId
  - Unauthorized cannot create

describe("Spending Cap Value Reporting")
  - System relay reports spending: currentValue accumulates (report 5000000, then 3000000 — total 8000000)
  - Emits ValueReported with amount and new total
  - Cannot report zero amount (ZeroAmount)
  - Cannot report on nonexistent rule (RuleNotFound)
  - Cannot report on deactivated rule (RuleNotActive)
  - Cannot report on expired rule — use time.increaseTo past endDate (RuleExpired)
  - Non-system-role cannot report (Unauthorized or AccessControl error)

describe("Overhead Ratio Value Reporting")
  - System relay reports ratio: currentValue is REPLACED not accumulated
  - Report 1200, then 1400 — currentValue is 1400, not 2600
  - Emits ValueReported correctly
  - Same error checks as spending cap

describe("Automatic Status Transitions — Spending Cap")
  - Status stays Compliant when value is under 90% of threshold
  - Status changes to AtRisk when value crosses 90% (e.g., 13500001 of 15000000)
  - Emits RuleStatusChanged(ruleId, org, Compliant, AtRisk)
  - Status changes to Violated when value exceeds threshold (15000001)
  - Emits RuleStatusChanged(ruleId, org, AtRisk, Violated)
  - Violation auto-created with type "spending-cap-breach"
  - Emits ViolationRecorded
  - Violation has correct thresholdValue and actualValue
  - getViolationsForOrg and getViolationsForRule include the violation index
  - CRITICAL: Single report jumping from 80% to 110% — ONE status change to Violated, ONE violation, NOT two events
  - Further reports past Violated still update currentValue but create NO additional violations or status changes

describe("Automatic Status Transitions — Overhead Ratio")
  - Under 90% of max: stays Compliant
  - Over 90% of max (e.g., 1351 bps when max is 1500): AtRisk
  - Over max (1501 bps): Violated + violation with type "overhead-exceeded"
  - Since overhead is snapshot-based, reporting a value BELOW max after being AtRisk: what happens? Status should stay AtRisk (the relay/admin uses updateRuleStatus to manually restore Compliant after review). Verify this is the behavior.

describe("Filing Deadlines")
  - Create deadline for registered org
  - Cannot create for unregistered org (OrgNotRegistered)
  - Cannot create with due date in past (InvalidDateRange)
  - Cannot create duplicate (DeadlineAlreadyExists)
  - Emits DeadlineCreated
  - getDeadline returns correct fields
  - markDeadlineCompleted: sets completedDate > 0, status = Met
  - Cannot complete already-completed deadline (DeadlineAlreadyCompleted)
  - Emits DeadlineCompleted and DeadlineStatusChanged
  - updateDeadlineStatus: Pending → Approaching succeeds
  - updateDeadlineStatus: Approaching → Overdue succeeds and creates "deadline-missed" violation
  - Invalid transition (Overdue → Pending) reverts (InvalidDeadlineTransition)
  - Met deadline cannot have status updated (already completed)
  - getDeadlinesForOrg includes the deadline

describe("Compliance Summary")
  - Create 2 SpendingCap rules + 1 OverheadRatio rule, violate 1, mark 1 deadline overdue
  - getOrgComplianceSummary returns (3 activeRules, 2 totalViolations, 1 overdueDeadlines) — spending violation + deadline violation

describe("Rule Deactivation")
  - Admin can deactivate a rule
  - Emits RuleDeactivated
  - Deactivated rule rejects new value reports (RuleNotActive)
  - Rule data still readable after deactivation
  - Non-admin cannot deactivate

describe("Manual Status Override")
  - Admin can update status (Violated → Compliant after data correction)
  - System role can update status
  - Emits RuleStatusChanged
  - Unauthorized cannot update

describe("Cross-Contract Integration")
  - Deactivating org in AuditLedger prevents new rule creation in ComplianceEngine
  - Existing rules for deactivated org still queryable
  - Value can still be reported on existing rules for deactivated org (rule was created when org was active — we track reality)

describe("Multiple Rule Types for Same Org")
  - One org can have SpendingCap + OverheadRatio + deadline simultaneously
  - Violations from different rule types all appear in getViolationsForOrg
  - Summary counts them all correctly

Use same conventions as AuditLedger tests: loadFixture, descriptive names, revertedWithCustomError, emit().withArgs().
```

---

## Prompt 5: Deploy Script

```
Write scripts/deploy-compliance-engine.ts using TypeScript.

It should:
- Import { ethers, upgrades } from "hardhat"
- Read AUDIT_LEDGER_ADDRESS from environment
- Deploy ComplianceEngine through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
- Grant SYSTEM_ROLE to process.env.RELAY_ADDRESS
- Retrieve implementation address via upgrades.erc1967.getImplementationAddress()
- Log proxy address, implementation address, and linked AuditLedger address
- Throw if AUDIT_LEDGER_ADDRESS or RELAY_ADDRESS not set

Also create scripts/demo-compliance-lifecycle.ts that demonstrates the compliance engine in action:

Step 1 — Setup:
- Connect to deployed ComplianceEngine and AuditLedger
- Resolve "lighthouse-academies" via AuditLedger.resolveByName() to get org address

Step 2 — Create a restricted fund rule:
- ruleId: keccak256 of "FORD-GRANT-2026-417"
- Type: SpendingCap
- Label: "Ford Foundation Grant #2026-417 — Youth Workforce Program"
- Threshold: 15000000 ($150,000)
- 12-month period
- Log: "Created spending rule: $150,000 cap for Ford Foundation grant"

Step 3 — Create an overhead ratio rule:
- ruleId: keccak256 of "BOARD-OVERHEAD-CEILING"
- Type: OverheadRatio
- Label: "Board-mandated administrative cost ceiling"
- Threshold: 1500 (15%)
- endDate: 0 (indefinite)
- Log: "Created overhead rule: 15% max admin costs (indefinite)"

Step 4 — Create a 990 filing deadline:
- deadlineId: keccak256 of "990-FY2025"
- filingType: "990"
- dueDate: 6 months from now
- Log: "Created 990 filing deadline"

Step 5 — Report spending lifecycle:
- Report $45,000 → log status (Compliant, 30%)
- Report $95,000 → log status (AtRisk, 93%)
- Report $20,000 → log status (Violated, 107%, auto-violation created)

Step 6 — Report overhead ratio:
- Report 1200 bps (12%) → log status (Compliant)
- Report 1501 bps (15.01%) → log status (Violated, auto-violation)

Step 7 — Summary:
- Call getOrgComplianceSummary and log all counts

This demo walks a judge through the entire compliance lifecycle. The console output tells the story.

// Usage: npx hardhat run scripts/demo-compliance-lifecycle.ts --network tallyview-testnet
```

---

## Prompt 6: Review Pass

```
Review ComplianceEngine contract, interface, TallyviewTypes additions, tests, and deploy scripts. Same criteria as AuditLedger:

1. CORRECTNESS:
   - Does _atRiskThreshold handle the overflow edge case? For uint128, (threshold * 9000) overflows if threshold > ~3.8 × 10^34. Realistic grant sizes (under $1B = 10^11 cents) are safe, but add the guard for good practice.
   - Does reportValue correctly distinguish cumulative (SpendingCap) from snapshot (OverheadRatio, CustomThreshold)? Walk through both paths.
   - Single-jump from 80% to 110%: ONE status change, ONE violation. Confirmed?
   - Once Violated, further reports update currentValue but no new violations. Confirmed?
   - Snapshot-based rule (OverheadRatio) reported below threshold after being AtRisk: status stays AtRisk (requires manual override). Is this the intended behavior? It should be — the relay reported a concerning value, and even if the next snapshot is clean, a human should review.
   - Deadline: can someone call updateDeadlineStatus on a Met deadline? Should revert.
   - Are violation indices stable? Pushing to a dynamic array means indices never change. Confirmed.

2. ELEGANCE:
   - Is the cumulative vs. snapshot distinction handled cleanly in reportValue? Should be a simple if/else on ruleType, not duplicated logic paths.
   - _recordViolation reused everywhere?
   - _violationTypeForRule clean?
   - AT_RISK_THRESHOLD_BPS used consistently?

3. AVALANCHE-SPECIFIC:
   - Same TxAllowList consideration
   - NatSpec should note that real-time events + sub-second finality = foundation dashboards see compliance changes in under a second. This is a key Avalanche differentiator for the demo.
   - Hardhat local testing caveat for precompile integration.

4. CROSS-CONTRACT:
   - AuditLedger reference set once in initialize, follows proxy upgrades automatically.
   - No circular dependencies.

5. UPGRADEABILITY: __gap, storage layout, dynamic violations array safe across upgrades.

6. NATSPEC: Competition-worthy. Judge should understand: rules are the abstraction, spending/overhead/custom are instances, violations are automatic and immutable.

7. TEST COVERAGE: Especially cumulative vs. snapshot behavior, single-jump edge case, time-dependent deadline tests, multi-rule-type scenarios.

Suggest specific improvements with diffs.
```

---

## Notes

**Add to Cursor context for every ComplianceEngine prompt:**
- This prompt guide
- The AuditLedger prompt guide
- The Tallyview Avalanche L1 strategy document
- All AuditLedger source files
- All ComplianceEngine files generated by previous prompts

**Key design decision: ComplianceRule as the core abstraction.** This contract is not a grant tracker. It enforces ANY compliance boundary — restricted funds, overhead ceilings, government contract limits, board-mandated policies. The RuleType enum and the cumulative vs. snapshot distinction on reportValue are what make this general-purpose rather than grant-specific.

**Key relationship:** ComplianceEngine depends on AuditLedger for org validation. Tests deploy AuditLedger first, register orgs, then deploy ComplianceEngine.

**After ComplianceEngine:** AnomalyRegistry is next — the immutable record of AI-detected findings (New → Reviewed → Resolved / Escalated).
