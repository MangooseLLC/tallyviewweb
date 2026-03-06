# AnomalyRegistry.sol — Cursor Prompt Guide

> Drop this file into your project root alongside the AuditLedger and ComplianceEngine prompt guides.
> Run these prompts sequentially after AuditLedger and ComplianceEngine are complete and tested.
> Add all prior contract files to Cursor context for every prompt.

---

## Context: What AnomalyRegistry Does

AnomalyRegistry is the immutable record of AI-detected findings. When Tallyview's offchain AI engine detects something wrong in a nonprofit's financial data, the finding gets timestamped and written to this contract. Once it's onchain, it can never be deleted or hidden. Only its status can move forward.

This is the contract that changes governance dynamics. Today, a nonprofit board member can pressure staff to bury a concerning finding. A finance director can quietly adjust a report. An executive director can dismiss a red flag before the board sees it. With AnomalyRegistry, the finding exists onchain permanently the moment the AI engine detects it. The status can progress (New → Reviewed → Resolved or Escalated), but the finding itself and the timestamp of its detection are immutable.

**Real-world example:** In the UCHS fraud case ($1.2M embezzled over four years), the CEO had sole financial authority, the board was passive and unpaid, and every governance question on the 990 was answered "No." The accounting system recorded whatever the CEO told it to. If Tallyview's AI had been ingesting that data, AnomalyRegistry would have flagged: CEO compensation patterns that don't match the disclosed amount, cash outflows that don't reconcile with authorized expenses, chronic negative net assets despite revenue nearly doubling, and expense patterns that diverge from peer organizations. Each of those findings would be timestamped onchain. The board can't claim they didn't know.

### What Lives in AnomalyRegistry vs. Offchain

**Onchain (AnomalyRegistry):**
- The anomaly finding: what type it is, how severe, which org, when detected
- AI confidence score (how certain the engine is)
- Hash of the underlying evidence (the raw data stays offchain, but the hash proves what evidence existed at detection time)
- Status lifecycle: New → Reviewed → Resolved / Escalated
- Who reviewed it, when, and any notes hash

**Offchain (SaaS layer):**
- The actual AI detection logic (anomaly detection models, fraud typology matching, peer benchmarking)
- The raw accounting data that triggered the finding
- Detailed analysis reports and visualizations
- The evidence documents themselves (the contract stores only the hash)

The AI detection logic stays offchain intentionally. It can iterate rapidly (new models, better training data, updated fraud typologies) without requiring contract upgrades. The contract is pure record-keeping: what was found, when, how severe, and what happened to the finding.

### How AnomalyRegistry References Other Contracts

- **AuditLedger:** org validation (is the org registered and active?)
- **ComplianceEngine:** anomalies may reference a compliance rule that was breached, creating a link between the compliance violation and the AI-detected pattern. This is optional — not every anomaly relates to a specific compliance rule.
- **EvidenceVault (future):** severe anomalies that get escalated may generate evidence entries in EvidenceVault for investigation. For now, AnomalyRegistry stands alone. EvidenceVault will reference it later.

### The Key Design Principle

**Status can only move forward.** New → Reviewed → Resolved or Escalated. You cannot go from Reviewed back to New. You cannot go from Escalated back to Reviewed. You definitely cannot delete a finding. This forward-only lifecycle is what makes AnomalyRegistry an accountability tool rather than just a notification system.

---

## Prompt 1: Extend TallyviewTypes.sol

```
We're building AnomalyRegistry.sol, the third of five core contracts for Tallyview's Avalanche L1. Extend TallyviewTypes.sol with the types AnomalyRegistry needs.

Add these to the existing TallyviewTypes library (keep everything from AuditLedger and ComplianceEngine):

ENUMS:

- AnomalySeverity: Info, Low, Medium, High, Critical

- AnomalyCategory: FinancialHealth, Governance, FraudPattern, CompensationOutlier, VendorConcentration, ExpenseAllocation, RevenueAnomaly, RelatedParty, DocumentProvenance, Custom

- AnomalyStatus: New, Reviewed, Resolved, Escalated

STRUCTS:

- Anomaly: a detected finding
  - address org (the nonprofit this anomaly was detected for)
  - AnomalySeverity severity
  - AnomalyCategory category
  - string title (brief description, e.g., "CEO compensation exceeds peer benchmark by 340%" — max 200 characters, validated on recording)
  - uint16 confidenceBps (AI confidence score in basis points, e.g., 8500 = 85%. Must be between 1 and 10000 inclusive.)
  - bytes32 evidenceHash (hash of the underlying analysis/data from the SaaS layer)
  - bytes32 relatedRuleId (optional link to a ComplianceEngine rule, bytes32(0) if none)
  - uint48 detectedAt (timestamp of onchain recording)
  - AnomalyStatus status
  - address reviewedBy (address of reviewer, address(0) if not yet reviewed)
  - uint48 reviewedAt (timestamp of review, 0 if not yet reviewed)
  - bytes32 reviewNoteHash (hash of reviewer's notes, bytes32(0) if none)

IMPORTANT: Do NOT store the anomaly index inside the struct. The index in the anomalies array IS the unique identifier.

The AnomalyCategory enum covers the major patterns Tallyview's AI engine detects. Custom is the extensible catch-all. The categories map to the fraud typology database that powers the detection engine offchain.
```

---

## Prompt 2: The Interface

```
Create IAnomalyRegistry.sol — the interface for the AnomalyRegistry contract. Import TallyviewTypes.sol for all struct and enum types.

AnomalyRegistry is the immutable record of AI-detected findings for nonprofit financial oversight. When the offchain AI engine detects an anomaly (vendor concentration, expense drift, compensation outlier, governance red flag), the finding is written here with a severity level, category, confidence score, and evidence hash. The core principle: findings cannot be deleted or hidden — only their status can progress forward.

CUSTOM ERRORS:
- AnomalyNotFound()
- InvalidStatusTransition()
- OrgNotRegistered()
- OrgNotActive()
- Unauthorized()
- ZeroAddress()
- EmptyTitle()
- TitleTooLong()
- InvalidConfidence()

EVENTS:
- AnomalyRecorded(uint256 indexed anomalyIndex, address indexed org, TallyviewTypes.AnomalySeverity severity, TallyviewTypes.AnomalyCategory category)
- AnomalyStatusChanged(uint256 indexed anomalyIndex, address indexed org, TallyviewTypes.AnomalyStatus oldStatus, TallyviewTypes.AnomalyStatus newStatus)
- AnomalyReviewed(uint256 indexed anomalyIndex, address indexed org, address indexed reviewer)
- AnomalyEscalated(uint256 indexed anomalyIndex, address indexed org)

NOTE on AnomalyRecorded: the title is NOT included in the event. It's a potentially long string that would increase event gas costs. The title is readable from getAnomaly(index) after the event fires. The event carries the index, org, severity, and category — enough for dashboard filtering and alerting.

FUNCTIONS:

Recording:
- recordAnomaly(address org, TallyviewTypes.AnomalySeverity severity, TallyviewTypes.AnomalyCategory category, string calldata title, uint16 confidenceBps, bytes32 evidenceHash, bytes32 relatedRuleId) → uint256 — record a new finding. Returns the anomaly index. Only SYSTEM_ROLE (the AI engine relay writes findings).

Status lifecycle:
- reviewAnomaly(uint256 anomalyIndex, bytes32 reviewNoteHash) — mark a finding as reviewed. Records who reviewed it and when. Can only be called on New anomalies. Only ADMIN_ROLE, SYSTEM_ROLE, or REVIEWER_ROLE.
- resolveAnomaly(uint256 anomalyIndex, bytes32 reviewNoteHash) — mark a finding as resolved (investigated, determined to be false positive or addressed). Can only be called on Reviewed anomalies. Only ADMIN_ROLE or REVIEWER_ROLE. NOTE: SYSTEM_ROLE intentionally CANNOT resolve — the system should not auto-close its own findings.
- escalateAnomaly(uint256 anomalyIndex, bytes32 reviewNoteHash) — escalate a finding for investigation (sent to regulator, flagged for EvidenceVault). Can only be called on Reviewed anomalies. Only ADMIN_ROLE, SYSTEM_ROLE, or REVIEWER_ROLE.

Queries:
- getAnomaly(uint256 anomalyIndex) → Anomaly
- getAnomalyCount() → uint256 — total anomalies across all orgs
- getAnomaliesForOrg(address org) → uint256[] — anomaly indices for an org
- getAnomaliesByStatus(address org, TallyviewTypes.AnomalyStatus status) → uint256[] — filtered by status for an org
- getAnomaliesBySeverity(address org, TallyviewTypes.AnomalySeverity severity) → uint256[] — filtered by severity for an org
- getOrgAnomalySummary(address org) → (uint256 total, uint256 open, uint256 critical) — quick health check. "open" = New + Reviewed (not yet resolved/escalated). "critical" = count of Critical severity findings regardless of status.

DESIGN NOTES:
- Anomalies use a monotonic uint256 counter (array index) for guaranteed uniqueness, same pattern as ComplianceEngine violations.
- Status transitions are strictly forward-only:
  - New → Reviewed (someone looked at it)
  - Reviewed → Resolved (investigated, addressed or false positive)
  - Reviewed → Escalated (needs investigation, sent to regulator/investigator)
  - No other transitions are valid. You cannot un-escalate. You cannot un-review. You cannot go backwards. InvalidStatusTransition is the single error used for all invalid transitions.
- reviewAnomaly is a separate step from resolve/escalate. This matters: reviewing means "a human has seen this finding." Resolving or escalating is the decision about what to do. The two-step process creates an audit trail of who saw what and when they decided.
- evidenceHash is the hash of the underlying analysis from the SaaS layer. The full evidence stays offchain, but the hash proves what evidence existed at detection time. If the evidence is later altered, the hash mismatch proves tampering.
- relatedRuleId optionally links the anomaly to a ComplianceEngine rule. If the AI detects that spending on a specific grant looks wrong, it can tie the anomaly to that grant's ruleId. bytes32(0) means the anomaly is standalone. AnomalyRegistry does NOT import IComplianceEngine — this is pure metadata.
- REVIEWER_ROLE is a new role for this contract. Foundation program officers, board audit committee members, or regulator staff who need to review findings but shouldn't have full ADMIN or SYSTEM access.
- Filtered queries (getAnomaliesByStatus, getAnomaliesBySeverity) iterate the org's anomaly indices and filter. This is fine on our own L1 — no gas concern for view calls.
- The resolve/escalate functions always overwrite reviewNoteHash with the provided value. If the caller wants to preserve the original review notes, they pass the same hash. No conditional "only update if non-zero" logic — that's ambiguous and bytes32(0) is a valid "no notes" value.
```

---

## Prompt 3: The Implementation

```
Implement AnomalyRegistry.sol based on the IAnomalyRegistry interface.

ARCHITECTURE:
- UUPS upgradeable (same pattern as AuditLedger and ComplianceEngine)
- AccessControlUpgradeable with ADMIN_ROLE, SYSTEM_ROLE, REVIEWER_ROLE (public bytes32 constants)
- Initialize accepts AuditLedger proxy address:
  function initialize(address auditLedgerAddress) public initializer
- Store IAuditLedger reference for org validation

STORAGE DESIGN:
- IAuditLedger public auditLedger (set in initialize)
- TallyviewTypes.Anomaly[] public anomalies (flat array — index IS the ID)
- mapping(address => uint256[]) for anomaly indices per org
- uint256 public constant MAX_TITLE_LENGTH = 200
- uint256 public constant MAX_CONFIDENCE_BPS = 10000
- uint256[50] private __gap

RECORDING LOGIC:
- recordAnomaly:
  - Only SYSTEM_ROLE
  - Validate org registered and active via _validateOrg
  - Revert if title is empty bytes (EmptyTitle) — check bytes(title).length == 0
  - Revert if title exceeds MAX_TITLE_LENGTH (TitleTooLong) — check bytes(title).length > MAX_TITLE_LENGTH
  - Revert if confidenceBps is zero or greater than MAX_CONFIDENCE_BPS (InvalidConfidence) — must be 1 to 10000
  - Push new Anomaly to array with:
    - detectedAt = uint48(block.timestamp)
    - status = New
    - reviewedBy = address(0)
    - reviewedAt = 0
    - reviewNoteHash = bytes32(0)
  - Get index = anomalies.length - 1
  - Push index to org's anomalies array
  - Emit AnomalyRecorded
  - Return index

STATUS LIFECYCLE:
- reviewAnomaly:
  - ADMIN_ROLE, SYSTEM_ROLE, or REVIEWER_ROLE
  - Anomaly must exist (index < anomalies.length), revert AnomalyNotFound if not
  - Current status must be New. Revert with InvalidStatusTransition if not.
  - Set status = Reviewed
  - Set reviewedBy = msg.sender
  - Set reviewedAt = uint48(block.timestamp)
  - Set reviewNoteHash = the provided hash
  - Emit AnomalyStatusChanged(index, org, New, Reviewed)
  - Emit AnomalyReviewed(index, org, msg.sender)

- resolveAnomaly:
  - ADMIN_ROLE or REVIEWER_ROLE only. NOT SYSTEM_ROLE — the system should not auto-close its own findings.
  - Anomaly must exist
  - Current status must be Reviewed. Revert with InvalidStatusTransition if not.
  - Set status = Resolved
  - Set reviewNoteHash = the provided hash (always overwrite — no conditional logic)
  - Emit AnomalyStatusChanged(index, org, Reviewed, Resolved)

- escalateAnomaly:
  - ADMIN_ROLE, SYSTEM_ROLE, or REVIEWER_ROLE
  - Anomaly must exist
  - Current status must be Reviewed. Revert with InvalidStatusTransition if not.
  - Set status = Escalated
  - Set reviewNoteHash = the provided hash (always overwrite)
  - Emit AnomalyStatusChanged(index, org, Reviewed, Escalated)
  - Emit AnomalyEscalated(index, org)

QUERY FUNCTIONS:
- getAnomaly: straightforward index read. Revert with AnomalyNotFound if index >= anomalies.length.
- getAnomalyCount: return anomalies.length
- getAnomaliesForOrg: return the org's index array
- getAnomaliesByStatus and getAnomaliesBySeverity:
  - These need a two-pass approach in Solidity: first count matches, then allocate a memory array and fill it.
  - Pass 1: iterate the org's indices, count how many match the filter
  - Pass 2: allocate uint256[] memory result = new uint256[](count), iterate again and fill
  - This avoids dynamic memory array issues in Solidity. Fine on our L1 for view calls.
- getOrgAnomalySummary:
  - total = org's anomaly indices length
  - open = count where status is New or Reviewed
  - critical = count where severity is Critical (regardless of status — a resolved Critical finding still counts as a Critical finding that happened)
  - Return (total, open, critical)

INTERNAL HELPERS:
- _validateOrg(address org): same pattern as ComplianceEngine — calls auditLedger

STYLE:
- Same conventions as prior contracts: NatSpec, custom errors from interface, _underscore internals, __gap
- Clear NatSpec on the status lifecycle explaining forward-only transitions
- NatSpec on recordAnomaly should explain that the AI engine runs offchain and only the finding metadata hits the chain
- The Anomaly struct includes relatedRuleId which optionally links to ComplianceEngine — NatSpec should mention this cross-contract reference but clarify it's metadata only, not a hard dependency
- MAX_TITLE_LENGTH and MAX_CONFIDENCE_BPS as named public constants
```

---

## Prompt 4: Tests

```
Write comprehensive Hardhat tests for AnomalyRegistry in test/AnomalyRegistry.test.ts using TypeScript, ethers v6, and Chai.

SETUP:
- deployFixture() that:
  - Deploys AuditLedger through UUPS proxy
  - Grants SYSTEM_ROLE on AuditLedger to systemRelay
  - Registers test org (orgSigner.address, name "test-org")
  - Registers second org (anotherOrgSigner.address, name "another-org")
  - Deploys AnomalyRegistry through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
  - Grants SYSTEM_ROLE on AnomalyRegistry to systemRelay
  - Grants REVIEWER_ROLE on AnomalyRegistry to reviewerSigner
  - Returns: { anomalyRegistry, auditLedger, admin, systemRelay, orgSigner, reviewerSigner, anotherOrgSigner, unauthorized }

- Helper constants:
  - TEST_TITLE = "CEO compensation exceeds peer benchmark by 340%"
  - TEST_CONFIDENCE = 8500 (85%)
  - TEST_EVIDENCE_HASH = keccak256 of "evidence-package-001"
  - RELATED_RULE_ID = bytes32(0) (standalone anomaly for most tests)

- Helper: recordTestAnomaly() — records a High severity, FinancialHealth category anomaly with defaults, returns the index

TEST CATEGORIES:

describe("Deployment & Initialization")
  - Deploys correctly with AuditLedger reference
  - auditLedger() returns correct address
  - Roles assigned properly (systemRelay has SYSTEM_ROLE, reviewerSigner has REVIEWER_ROLE)
  - Cannot initialize twice

describe("Recording Anomalies")
  - System relay can record an anomaly for a registered org
  - Returns the correct anomaly index (first = 0, second = 1, etc.)
  - Emits AnomalyRecorded with correct args (index, org, severity, category — no title in event)
  - getAnomaly returns correct fields (org, severity, category, title, confidenceBps, evidenceHash, relatedRuleId, detectedAt > 0, status == New, reviewedBy == address(0), reviewedAt == 0)
  - getAnomalyCount increments with each recording
  - getAnomaliesForOrg includes the new index
  - Can record anomaly with relatedRuleId linking to a ComplianceEngine rule (non-zero bytes32)
  - Cannot record for unregistered org (OrgNotRegistered)
  - Cannot record for deactivated org (OrgNotActive)
  - Cannot record with empty title (EmptyTitle)
  - Cannot record with title over 200 characters (TitleTooLong)
  - Cannot record with zero confidence (InvalidConfidence)
  - Cannot record with confidence over 10000 (InvalidConfidence)
  - Confidence of exactly 10000 (100%) succeeds
  - Confidence of exactly 1 succeeds
  - Non-system-role cannot record (Unauthorized or AccessControl error)
  - Can record multiple anomalies for the same org — each gets a unique index

describe("Status Lifecycle — Review")
  - Reviewer can review a New anomaly
  - Admin can review a New anomaly
  - System role can review a New anomaly
  - After review: status = Reviewed, reviewedBy = caller address, reviewedAt > 0, reviewNoteHash set correctly
  - Emits AnomalyStatusChanged(index, org, New, Reviewed)
  - Emits AnomalyReviewed(index, org, reviewer address)
  - Cannot review an anomaly that's already Reviewed (InvalidStatusTransition)
  - Cannot review an anomaly that's Resolved (InvalidStatusTransition)
  - Cannot review an anomaly that's Escalated (InvalidStatusTransition)
  - Unauthorized address cannot review
  - Reviewing with reviewNoteHash = bytes32(0) succeeds (notes are optional)

describe("Status Lifecycle — Resolve")
  - Reviewer can resolve a Reviewed anomaly
  - Admin can resolve a Reviewed anomaly
  - After resolve: status = Resolved, reviewNoteHash updated to the new hash
  - Emits AnomalyStatusChanged(index, org, Reviewed, Resolved)
  - Cannot resolve a New anomaly (InvalidStatusTransition)
  - Cannot resolve an already Resolved anomaly (InvalidStatusTransition)
  - Cannot resolve an Escalated anomaly (InvalidStatusTransition)
  - SYSTEM_ROLE cannot resolve (AccessControl error) — the system should not auto-close its own findings

describe("Status Lifecycle — Escalate")
  - Reviewer can escalate a Reviewed anomaly
  - Admin can escalate
  - System role can escalate (AI engine can recommend escalation)
  - After escalate: status = Escalated, reviewNoteHash updated
  - Emits AnomalyStatusChanged(index, org, Reviewed, Escalated)
  - Emits AnomalyEscalated(index, org)
  - Cannot escalate a New anomaly (InvalidStatusTransition)
  - Cannot escalate an already Escalated anomaly (InvalidStatusTransition)
  - Cannot escalate a Resolved anomaly (InvalidStatusTransition)

describe("Forward-Only Status Enforcement")
  - Full lifecycle: New → Reviewed → Resolved. Confirm all transitions work.
  - Full lifecycle: New → Reviewed → Escalated. Confirm all transitions work.
  - Attempt every invalid transition and confirm revert with InvalidStatusTransition:
    - Reviewed → New
    - Resolved → New
    - Resolved → Reviewed
    - Resolved → Escalated
    - Escalated → New
    - Escalated → Reviewed
    - Escalated → Resolved

describe("Filtered Queries")
  - Record 5 anomalies: 2 High, 2 Medium, 1 Critical
  - Review anomalies 0 and 1. Resolve anomaly 0. Escalate anomaly 1.
  - getAnomaliesByStatus(org, New) returns indices [2, 3, 4]
  - getAnomaliesByStatus(org, Resolved) returns [0]
  - getAnomaliesByStatus(org, Escalated) returns [1]
  - getAnomaliesByStatus(org, Reviewed) returns [] (both reviewed ones moved to Resolved/Escalated)
  - getAnomaliesBySeverity(org, High) returns the 2 High indices
  - getAnomaliesBySeverity(org, Critical) returns the 1 Critical index
  - getAnomaliesBySeverity(org, Info) returns [] (no Info anomalies)

describe("Org Anomaly Summary")
  - Record 5 anomalies: 1 Critical (index 0), 2 High (1, 2), 2 Medium (3, 4)
  - Review anomalies 0, 1, 2. Resolve anomaly 0.
  - State: index 0 = Resolved, 1 = Reviewed, 2 = Reviewed, 3 = New, 4 = New
  - getOrgAnomalySummary returns: total = 5, open = 4 (2 New + 2 Reviewed), critical = 1 (index 0, even though Resolved)

describe("Cross-Contract Integration")
  - Deactivating org in AuditLedger prevents new anomaly recording
  - Existing anomalies for deactivated org are still readable
  - Existing anomalies for deactivated org can still have status updated (review/resolve/escalate)

describe("Edge Cases")
  - Two different orgs can have anomalies independently
  - getAnomaly with invalid index (>= anomalies.length) reverts with AnomalyNotFound
  - Record anomaly with each AnomalyCategory value to confirm enum handling
  - Record anomaly with each AnomalySeverity value
  - A different person can resolve/escalate than the person who reviewed (program officer reviews, senior director decides)

Use same conventions as prior tests: loadFixture, descriptive names, revertedWithCustomError, emit().withArgs().
```

---

## Prompt 5: Deploy Script

```
Write scripts/deploy-anomaly-registry.ts using TypeScript.

It should:
- Import { ethers, upgrades } from "hardhat"
- Read AUDIT_LEDGER_ADDRESS from environment
- Deploy AnomalyRegistry through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
- Grant SYSTEM_ROLE to process.env.RELAY_ADDRESS
- Retrieve implementation address via upgrades.erc1967.getImplementationAddress()
- Log proxy address, implementation address, and linked AuditLedger address
- Throw if AUDIT_LEDGER_ADDRESS or RELAY_ADDRESS not set

Also create scripts/demo-anomaly-lifecycle.ts that demonstrates the anomaly registry in action:

Step 1 — Setup:
- Connect to deployed AnomalyRegistry and AuditLedger
- Resolve "lighthouse-academies" via AuditLedger.resolveByName()

Step 2 — Record anomalies (as system relay):
- Anomaly 0: High severity, CompensationOutlier, "CEO total compensation exceeds peer benchmark by 340%", 92% confidence
- Anomaly 1: Medium severity, ExpenseAllocation, "Program expense ratio dropped 12 points year-over-year", 78% confidence
- Anomaly 2: Critical severity, FraudPattern, "Vendor concentration: 73% of payments to single unverified vendor", 88% confidence
- Log each: "Recorded anomaly #{index}: [severity] [category]"

Step 3 — Review (as admin):
- Review anomaly 0 with a note hash
- Review anomaly 2 with a note hash
- Log: "Reviewed anomaly #0 — reviewer: {address}"
- Log: "Reviewed anomaly #2 — reviewer: {address}"

Step 4 — Resolve and Escalate:
- Resolve anomaly 0 (compensation was within board-approved range after review)
- Log: "Resolved anomaly #0 — false positive after review"
- Escalate anomaly 2 (vendor concentration warrants investigation)
- Log: "Escalated anomaly #2 — referred for investigation"

Step 5 — Try invalid transition (demonstrate forward-only):
- Attempt to review anomaly 0 again (should revert — it's already Resolved)
- Catch the error and log: "Cannot re-review anomaly #0 — status is Resolved (forward-only lifecycle)"

Step 6 — Summary:
- Call getOrgAnomalySummary and log: "Total: {total}, Open: {open}, Critical: {critical}"
- Anomaly 1 is still New (never reviewed), anomaly 0 is Resolved, anomaly 2 is Escalated
- Expected: total = 3, open = 1 (anomaly 1 is New), critical = 1 (anomaly 2 is Critical)

The demo walks a judge through the full lifecycle including the forward-only enforcement. Step 5 is the key moment — showing that the contract prevents suppression.

// Usage: npx hardhat run scripts/demo-anomaly-lifecycle.ts --network tallyview-testnet
```

---

## Prompt 6: Review Pass

```
Review AnomalyRegistry contract, interface, TallyviewTypes additions, tests, and deploy scripts. Same criteria as prior reviews:

1. CORRECTNESS:
   - Is the forward-only status lifecycle enforced correctly? Walk through every possible transition and confirm only New → Reviewed, Reviewed → Resolved, Reviewed → Escalated are allowed.
   - Can SYSTEM_ROLE resolve? It should NOT. Can SYSTEM_ROLE escalate? It SHOULD. Confirm the access control on each function.
   - Is confidenceBps validated correctly? Must be >= 1 and <= 10000. Confirm both bounds.
   - Is title length validated? bytes(title).length, not title.length (Solidity string .length is not available — must cast to bytes). Confirm.
   - Does getAnomaliesByStatus use the two-pass pattern (count then allocate) or does it use a dynamic approach? Two-pass is cleaner in Solidity. Confirm.
   - getOrgAnomalySummary: "open" = New + Reviewed, "critical" = all Critical regardless of status. Walk through the test scenario to confirm the expected numbers.
   - Can resolve/escalate be called by someone who didn't review? Yes — intentionally. A program officer reviews, a senior director decides. Confirm this is the design.
   - What happens if reviewNoteHash is bytes32(0)? It's allowed — notes are optional. Confirm no zero-check.

2. ELEGANCE:
   - Is the status transition check clean? Should be a single internal _validateTransition function or inline checks. Not duplicated per-function.
   - Are the filtered query functions using the two-pass pattern consistently?
   - Is the AnomalyCategory enum the right size? 10 categories for an MVP is reasonable. Custom is the escape hatch.
   - Any dead code? Any unused errors?

3. AVALANCHE-SPECIFIC:
   - Same TxAllowList consideration as prior contracts
   - AnomalyRecorded events with sub-second finality means the foundation dashboard shows new findings almost instantly. Worth noting in NatSpec.
   - AnomalyEscalated events could trigger downstream actions in EvidenceVault in a future integration. NatSpec should mention this.

4. CROSS-CONTRACT:
   - AuditLedger reference correct and follows proxy upgrades.
   - relatedRuleId is metadata only — AnomalyRegistry does NOT import IComplianceEngine. Confirm.
   - No circular dependencies.

5. UPGRADEABILITY: __gap, dynamic anomalies array safe, storage layout clean.

6. NATSPEC: Would a judge understand: (a) this is where AI findings become permanent onchain records, (b) the forward-only lifecycle prevents suppression, (c) the contract stores findings not detection logic, (d) SYSTEM_ROLE records and can escalate but cannot resolve?

7. TEST COVERAGE: Forward-only transitions are the highest-priority area. Every valid and invalid transition should be covered. Also: system-can't-resolve access control, confidence bounds, title length, filtered query correctness, summary arithmetic.

Suggest specific improvements with diffs.
```

---

## Notes

**Add to Cursor context for every AnomalyRegistry prompt:**
- This prompt guide
- The AuditLedger and ComplianceEngine prompt guides
- The Tallyview Avalanche L1 strategy document
- All AuditLedger and ComplianceEngine source files
- All AnomalyRegistry files generated by previous prompts

**Key design principle: Forward-only status.** This is the single most important aspect of AnomalyRegistry. The contract is not a to-do list where items can be dismissed. It's a permanent record where findings can only progress. This is what makes it an accountability tool. The NatSpec, the tests, and the demo script should all reinforce this narrative.

**Key relationship:** AnomalyRegistry depends on AuditLedger for org validation (same as ComplianceEngine). It has an optional soft link to ComplianceEngine via relatedRuleId but no hard import dependency. EvidenceVault (built later) will reference AnomalyRegistry for escalated findings.

**After AnomalyRegistry:** EntityGraph is next — cross-organizational relationship mapping (board members, vendors, addresses across entities). Then EvidenceVault — investigation evidence with chain-of-custody.
