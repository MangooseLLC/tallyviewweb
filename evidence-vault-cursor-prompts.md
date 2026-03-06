# EvidenceVault.sol — Cursor Prompt Guide

> Drop this file into your project root alongside the prior prompt guides.
> Run these prompts sequentially after all four prior contracts are complete and tested.
> Add all prior contract files to Cursor context for every prompt.

---

## Context: What EvidenceVault Does

EvidenceVault is the investigation evidence contract. It anchors evidence onchain with chain-of-custody metadata, creating cryptographically verifiable records that prove what evidence existed at what time, who submitted it, and how it was classified. Evidence can be "sealed" by a regulator, restricting access to authorized investigators and counsel.

This is the contract that matters most for FCA (False Claims Act) litigation. In fraud cases, one of the hardest evidentiary challenges is establishing *when you knew what*. The defense argues evidence was fabricated, backdated, or selectively compiled after the fact. When evidence is hashed and committed to a publicly verifiable chain with a provable timestamp, that argument collapses. The chain proves the evidence existed in a specific form at a specific time.

**The investigation pipeline EvidenceVault supports:**
- **Tip:** An anonymous whistleblower submits a tip. The tip is hashed onchain, and the submitter receives a transaction hash as a receipt proving their tip existed at that time. Critical for qui tam cases where provable priority of tip submission determines standing.
- **Analysis:** The AI engine or an investigator produces analysis outputs (evidence briefs, financial summaries, pattern matches). These are hashed and anchored with metadata.
- **Discovery:** As an investigation progresses, additional evidence is submitted and linked to a case. Each submission extends the chain of custody.
- **Filing:** When a case moves to formal filing (qui tam complaint, AG enforcement action), the evidence chain provides the foundation for the legal record.
- **Recovery:** Recovered funds are tracked, closing the loop on the fraud lifecycle.

### How EvidenceVault References Other Contracts

- **AuditLedger:** org validation (is the target org registered?)
- **AnomalyRegistry:** evidence entries can reference escalated anomalies. When an anomaly is escalated in AnomalyRegistry, the investigator can create evidence entries in EvidenceVault linking back to the anomaly index. This creates a traceable path: AI detection → escalation → evidence collection → investigation.
- **EntityGraph:** relationship data from EntityGraph can be referenced as evidence (e.g., "the shared vendor pattern identified in EntityGraph edge X is evidence of procurement steering"). This is a soft reference via hash, not a hard import.

### What Lives Onchain vs. Offchain

**Onchain (EvidenceVault):**
- Evidence metadata: who submitted what, when, with what classification
- Hash of the actual evidence document/data (the content stays offchain)
- Case assignment (which case this evidence belongs to)
- Chain of custody: every status change, every access grant, every seal
- Investigation stage tracking (Tip → Analysis → Discovery → Filing → Recovery)
- Seal status (unsealed or sealed by a regulator)

**Offchain (SaaS layer):**
- The actual evidence documents (financial records, analysis reports, evidence briefs)
- The investigator workbench where analysis happens
- Detailed case management workflow
- Communication between investigators and counsel
- The AI analysis that produces evidence briefs

### Key Design Principles

1. **Evidence is immutable.** Once submitted, evidence metadata cannot be altered. The hash, timestamp, submitter, and classification are permanent. This is what makes it admissible-grade.

2. **Sealing is a forward-only restriction.** A regulator can seal evidence (restricting access to authorized parties). Sealed evidence cannot be unsealed. This protects active investigations from premature disclosure.

3. **Chain of custody is automatic.** Every action on an evidence entry (submission, sealing, case stage change) is an onchain event with a timestamp and actor. The custody chain builds itself.

4. **Per-case access control.** Investigators are granted access to specific cases, not global access. A regulator authorizes an investigator for Case X, and that investigator can then submit and view evidence for Case X only. This maps to how real investigations work — need-to-know basis.

5. **Closing and sealing are independent.** A case can be sealed at any stage (restricts access). A case can be closed at any stage (ends the investigation). A case can be both sealed and closed, or sealed but still active, or closed but unsealed.

---

## Prompt 1: Extend TallyviewTypes.sol

```
We're building EvidenceVault.sol, the fifth and final core contract for Tallyview's Avalanche L1. Extend TallyviewTypes.sol with the types EvidenceVault needs.

Add these to the existing TallyviewTypes library (keep everything from prior contracts):

ENUMS:

- EvidenceClassification: Tip, FinancialRecord, AnalysisReport, WitnessStatement, CommunicationRecord, PublicFiling, InternalDocument, AIGeneratedBrief, Other

- InvestigationStage: Tip, Analysis, Discovery, Filing, Recovery, Closed

- SealStatus: Unsealed, Sealed

STRUCTS:

- Case: an investigation case
  - address targetOrg (the nonprofit under investigation — matches AuditLedger address)
  - string title (brief case description, max 200 characters)
  - InvestigationStage stage
  - address leadInvestigator (primary investigator assigned)
  - uint48 openedAt
  - uint48 closedAt (0 if still open)
  - bool sealed (if true, only authorized parties can view case evidence)

- EvidenceEntry: a single piece of evidence
  - bytes32 caseId (which case this evidence belongs to)
  - address submitter (who submitted this evidence)
  - EvidenceClassification classification
  - string description (brief description, max 200 characters)
  - bytes32 contentHash (hash of the actual evidence document/data — content stays offchain)
  - bytes32 relatedAnomalyId (optional link to an AnomalyRegistry anomaly index, encoded as bytes32. bytes32(0) if none.)
  - bytes32 relatedEntityId (optional link to an EntityGraph entity. bytes32(0) if none.)
  - uint48 submittedAt
  - SealStatus sealStatus

IMPORTANT: Do NOT store the mapping key (caseId, evidenceIndex) inside the struct.

DESIGN NOTE: relatedAnomalyId and relatedEntityId are soft references — bytes32 values that can be decoded by the SaaS layer to look up the corresponding AnomalyRegistry anomaly or EntityGraph entity. EvidenceVault does NOT import IAnomalyRegistry or IEntityGraph. These are cross-contract breadcrumbs, not hard dependencies.
```

---

## Prompt 2: The Interface

```
Create IEvidenceVault.sol — the interface for the EvidenceVault contract. Import TallyviewTypes.sol for all struct and enum types.

EvidenceVault anchors investigation evidence onchain with chain-of-custody metadata. It supports the full investigation pipeline: Tip → Analysis → Discovery → Filing → Recovery → Closed. Evidence is immutable once submitted. Cases can be sealed by regulators to restrict access. Investigators are granted per-case access.

CUSTOM ERRORS:
- CaseNotFound()
- CaseAlreadyExists()
- CaseIsClosed()
- CaseAlreadySealed()
- EvidenceNotFound()
- EvidenceAlreadySealed()
- InvalidStageTransition()
- NotCaseAuthorized()
- CannotRevokeLead()
- OrgNotRegistered()
- Unauthorized()
- ZeroAddress()
- EmptyDescription()
- DescriptionTooLong()
- ZeroContentHash()

NOTE on naming: the error is CaseIsClosed (not CaseClosed) to avoid collision with the CaseClosed event name. Solidity allows same-name events and errors but it's confusing for readability.

EVENTS:
- CaseCreated(bytes32 indexed caseId, address indexed targetOrg, address indexed leadInvestigator)
- CaseStageChanged(bytes32 indexed caseId, TallyviewTypes.InvestigationStage oldStage, TallyviewTypes.InvestigationStage newStage)
- CaseSealed(bytes32 indexed caseId, address indexed sealedBy)
- CaseClosed(bytes32 indexed caseId)
- InvestigatorAuthorized(bytes32 indexed caseId, address indexed investigator)
- InvestigatorRevoked(bytes32 indexed caseId, address indexed investigator)
- EvidenceSubmitted(uint256 indexed evidenceIndex, bytes32 indexed caseId, address indexed submitter, TallyviewTypes.EvidenceClassification classification)
- EvidenceSealed(uint256 indexed evidenceIndex, bytes32 indexed caseId, address indexed sealedBy)

NOTE on CaseCreated: the title is NOT included in the event (same rationale as prior contracts — avoid string gas costs). Readable from getCase().

FUNCTIONS:

Case management:
- createCase(bytes32 caseId, address targetOrg, string calldata title, address leadInvestigator) — open a new investigation case. Only ADMIN_ROLE or SYSTEM_ROLE.
- updateCaseStage(bytes32 caseId, TallyviewTypes.InvestigationStage newStage) — advance the investigation stage. Forward-only, but CANNOT set stage to Closed — use closeCase for that. Only ADMIN_ROLE or SYSTEM_ROLE.
- sealCase(bytes32 caseId) — seal the entire case. All existing evidence becomes Sealed. Cannot be unsealed. Only ADMIN_ROLE or REGULATOR_ROLE.
- closeCase(bytes32 caseId) — close the case. Sets closedAt timestamp, stage to Closed. Only ADMIN_ROLE. This is the only way to close a case.
- authorizeInvestigator(bytes32 caseId, address investigator) — grant an investigator access to this case's evidence. Only ADMIN_ROLE, SYSTEM_ROLE, or REGULATOR_ROLE.
- revokeInvestigator(bytes32 caseId, address investigator) — revoke access. Cannot revoke the lead investigator. Only ADMIN_ROLE or REGULATOR_ROLE.

Evidence submission:
- submitEvidence(bytes32 caseId, TallyviewTypes.EvidenceClassification classification, string calldata description, bytes32 contentHash, bytes32 relatedAnomalyId, bytes32 relatedEntityId) → uint256 — submit evidence to a case. Returns the evidence index. Caller must be authorized for this case. Case must not be closed.
- sealEvidence(uint256 evidenceIndex) — seal a specific evidence entry. Reverts if already sealed (EvidenceAlreadySealed). Only ADMIN_ROLE or REGULATOR_ROLE.

Queries:
- getCase(bytes32 caseId) → Case
- getCasesForOrg(address org) → bytes32[] — all caseIds targeting an org
- getEvidence(uint256 evidenceIndex) → EvidenceEntry
- getEvidenceCount() → uint256
- getEvidenceForCase(bytes32 caseId) → uint256[] — all evidence indices for a case
- isCaseAuthorized(bytes32 caseId, address account) → bool — check if an address can submit evidence to this case
- getCaseSummary(bytes32 caseId) → (uint256 evidenceCount, TallyviewTypes.InvestigationStage stage, bool sealed)

DESIGN NOTES:
- EvidenceVault references IAuditLedger for org validation on case creation only. The target org must be registered but does NOT need to be active — you can investigate deactivated orgs.
- Per-case access control for evidence submission: authorized per-case investigators, lead investigator, ADMIN_ROLE, SYSTEM_ROLE. This is checked by _isCaseAuthorized. NOTE: REGULATOR_ROLE is NOT in this list. Regulators seal and authorize, but submit evidence through authorized investigators. If a regulator needs to submit, they authorize themselves for the case first.
- REGULATOR_ROLE is new for this contract. State AG staff, federal investigators, or oversight officials. They can seal cases/evidence and authorize/revoke investigators. They cannot create or close cases (that's ADMIN only) and cannot submit evidence directly (they work through authorized investigators).
- Evidence uses a monotonic uint256 counter (array index) for guaranteed uniqueness.
- Investigation stages are forward-only via updateCaseStage: Tip → Analysis → Discovery → Filing → Recovery. The Closed stage is excluded from updateCaseStage — use closeCase instead. This preserves the admin-only closure gate. Stage skipping is allowed (Tip → Discovery is valid if analysis happened offchain). Validation: uint8(newStage) > uint8(currentStage) && newStage != InvestigationStage.Closed.
- Sealing is forward-only. Once sealed, cannot be unsealed. Sealed evidence and sealed cases use separate errors: EvidenceAlreadySealed and CaseAlreadySealed.
- Closing and sealing are independent lifecycle events. A case can be sealed but still active. A case can be closed but unsealed.
- contentHash must not be bytes32(0) — use ZeroContentHash error.
- relatedAnomalyId and relatedEntityId are optional soft references. No imports of IAnomalyRegistry or IEntityGraph.
- Submitting evidence with classification = Tip is how whistleblower tips get anchored. The relay submits on behalf of the whistleblower — only the relay address appears onchain.
```

---

## Prompt 3: The Implementation

```
Implement EvidenceVault.sol based on the IEvidenceVault interface.

ARCHITECTURE:
- UUPS upgradeable (same pattern as prior contracts)
- AccessControlUpgradeable with ADMIN_ROLE, SYSTEM_ROLE, REGULATOR_ROLE (public bytes32 constants)
- Initialize accepts AuditLedger proxy address:
  function initialize(address auditLedgerAddress) public initializer
- Store IAuditLedger reference for org validation

STORAGE DESIGN:
- IAuditLedger public auditLedger (set in initialize)
- mapping(bytes32 => TallyviewTypes.Case) for cases
- mapping(address => bytes32[]) for caseIds per org
- mapping(bytes32 => mapping(address => bool)) for per-case investigator authorization
- TallyviewTypes.EvidenceEntry[] public evidence (flat array — index IS the ID)
- mapping(bytes32 => uint256[]) for evidence indices per case
- uint256 public constant MAX_DESCRIPTION_LENGTH = 200
- uint256[50] private __gap

CASE MANAGEMENT:
- createCase:
  - Only ADMIN_ROLE or SYSTEM_ROLE
  - Validate target org is registered via auditLedger.isOrganizationRegistered() — do NOT check isOrganizationActive (you investigate deactivated orgs)
  - Revert if caseId already exists (check openedAt > 0 as sentinel)
  - Revert if title empty: bytes(title).length == 0 (EmptyDescription)
  - Revert if title too long: bytes(title).length > MAX_DESCRIPTION_LENGTH (DescriptionTooLong)
  - Revert if leadInvestigator is zero address (ZeroAddress)
  - Store Case: stage = Tip, openedAt = uint48(block.timestamp), closedAt = 0, sealed = false
  - Automatically authorize the lead investigator: set per-case mapping to true
  - Push caseId to org's cases array
  - Emit CaseCreated

- updateCaseStage:
  - Only ADMIN_ROLE or SYSTEM_ROLE
  - Case must exist and not be closed (closedAt == 0, revert CaseIsClosed)
  - Forward-only: require uint8(newStage) > uint8(currentStage)
  - CANNOT set to Closed: require newStage != InvestigationStage.Closed (revert InvalidStageTransition). Use closeCase instead.
  - Emit CaseStageChanged with old and new stage

- sealCase:
  - Only ADMIN_ROLE or REGULATOR_ROLE
  - Case must exist (CaseNotFound)
  - Revert if already sealed (CaseAlreadySealed)
  - Set sealed = true
  - Iterate all evidence indices for this case, set each to SealStatus.Sealed (skip any already sealed)
  - Emit CaseSealed

- closeCase:
  - Only ADMIN_ROLE
  - Case must exist
  - Revert if already closed: closedAt > 0 (CaseIsClosed)
  - Set closedAt = uint48(block.timestamp)
  - Record old stage, set stage = Closed
  - Emit CaseClosed
  - Emit CaseStageChanged with old stage and Closed

- authorizeInvestigator:
  - Only ADMIN_ROLE, SYSTEM_ROLE, or REGULATOR_ROLE
  - Case must exist (CaseNotFound)
  - Revert if investigator is zero address (ZeroAddress)
  - Set per-case authorization mapping to true
  - Emit InvestigatorAuthorized

- revokeInvestigator:
  - Only ADMIN_ROLE or REGULATOR_ROLE
  - Case must exist (CaseNotFound)
  - Cannot revoke the lead investigator: revert CannotRevokeLead if investigator == case.leadInvestigator
  - Set per-case authorization mapping to false
  - Emit InvestigatorRevoked

EVIDENCE SUBMISSION:
- submitEvidence:
  - Case must exist (CaseNotFound)
  - Case must not be closed: closedAt > 0 reverts with CaseIsClosed
  - Caller must pass _isCaseAuthorized check. Revert NotCaseAuthorized if not.
  - Revert if description empty (EmptyDescription) or too long (DescriptionTooLong) — use bytes(description).length
  - Revert if contentHash is bytes32(0) (ZeroContentHash)
  - Determine sealStatus: if case.sealed == true, new evidence inherits SealStatus.Sealed. Otherwise SealStatus.Unsealed.
  - Push new EvidenceEntry to array with submittedAt = uint48(block.timestamp)
  - Get index = evidence.length - 1
  - Push index to case's evidence array
  - Emit EvidenceSubmitted
  - Return index

- sealEvidence:
  - Only ADMIN_ROLE or REGULATOR_ROLE
  - Evidence must exist: index < evidence.length (EvidenceNotFound)
  - Revert if already sealed: sealStatus == Sealed (EvidenceAlreadySealed)
  - Set sealStatus = Sealed
  - Emit EvidenceSealed

QUERIES:
- getCase: lookup by caseId. Revert CaseNotFound if openedAt == 0.
- getCasesForOrg: return org's caseIds array
- getEvidence: index read. Revert EvidenceNotFound if index >= evidence.length.
- getEvidenceCount: return evidence.length
- getEvidenceForCase: return case's evidence indices array
- isCaseAuthorized: delegates to _isCaseAuthorized
- getCaseSummary: return (evidence indices array length for case, case.stage, case.sealed)

INTERNAL HELPERS:
- _isCaseAuthorized(bytes32 caseId, address caller) → bool:
  - Return true if any of:
    1. Per-case authorization mapping is true for this caller
    2. caller == case.leadInvestigator
    3. caller has ADMIN_ROLE
    4. caller has SYSTEM_ROLE
  - NOTE: REGULATOR_ROLE is NOT included. Regulators seal and authorize but don't submit evidence directly. If they need to submit, they authorize themselves for the case first.
  - Return false otherwise

STYLE:
- Same conventions as prior contracts: NatSpec, custom errors from interface, _underscore internals, __gap
- MAX_DESCRIPTION_LENGTH as named public constant
- NatSpec should emphasize evidence immutability
- NatSpec on sealCase should explain forward-only sealing
- NatSpec on submitEvidence with classification = Tip should explain whistleblower tip anchoring
- NatSpec on updateCaseStage should explain why Closed is excluded (use closeCase)
- NatSpec on _isCaseAuthorized should list all four authorization paths and explain why REGULATOR_ROLE is excluded
```

---

## Prompt 4: Tests

```
Write comprehensive Hardhat tests for EvidenceVault in test/EvidenceVault.test.ts using TypeScript, ethers v6, and Chai.

SETUP:
- deployFixture() that:
  - Deploys AuditLedger through UUPS proxy
  - Grants SYSTEM_ROLE on AuditLedger to systemRelay
  - Registers test org (orgSigner.address, name "test-org")
  - Deploys EvidenceVault through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
  - Grants SYSTEM_ROLE on EvidenceVault to systemRelay
  - Grants REGULATOR_ROLE on EvidenceVault to regulatorSigner
  - Returns: { evidenceVault, auditLedger, admin, systemRelay, orgSigner, regulatorSigner, investigatorA, investigatorB, unauthorized }

- Helper constants:
  - TEST_CASE_ID = keccak256 of "CASE-2026-001"
  - TEST_CASE_TITLE = "UCHS Financial Irregularities Investigation"
  - TEST_CONTENT_HASH = keccak256 of "evidence-document-001.pdf"
  - TEST_DESCRIPTION = "CEO compensation analysis — peer benchmark comparison"

- Helpers:
  - createTestCase() — creates a case targeting the test org with investigatorA as lead, returns caseId
  - submitTestEvidence(caseId) — submits a FinancialRecord evidence entry as the lead investigator, returns evidence index

TEST CATEGORIES:

describe("Deployment & Initialization")
  - Deploys correctly with AuditLedger reference
  - Roles assigned properly (systemRelay has SYSTEM_ROLE, regulatorSigner has REGULATOR_ROLE)
  - Cannot initialize twice

describe("Case Creation")
  - Admin can create a case
  - System relay can create a case
  - Cannot create for unregistered org (OrgNotRegistered)
  - CAN create for deactivated org (investigation of deactivated org is valid — deactivate in AuditLedger first, then create case)
  - Cannot create duplicate caseId (CaseAlreadyExists)
  - Cannot create with empty title (EmptyDescription)
  - Cannot create with title over 200 characters (DescriptionTooLong)
  - Cannot create with zero address lead investigator (ZeroAddress)
  - Emits CaseCreated with correct args (caseId, targetOrg, leadInvestigator — no title in event)
  - getCase returns correct fields (targetOrg, title, stage == Tip, leadInvestigator, openedAt > 0, closedAt == 0, sealed == false)
  - Lead investigator is automatically authorized (isCaseAuthorized returns true)
  - getCasesForOrg includes the new caseId
  - Unauthorized cannot create
  - Regulator cannot create (REGULATOR_ROLE does not have create access)

describe("Investigation Stage Progression")
  - Admin can advance stage: Tip → Analysis
  - System relay can advance stage
  - Can skip stages: Tip → Discovery (analysis happened offchain)
  - Can advance through pipeline: Tip → Analysis → Discovery → Filing → Recovery
  - Emits CaseStageChanged with correct old and new stage
  - Cannot go backwards: Analysis → Tip (InvalidStageTransition)
  - Cannot advance a closed case (CaseIsClosed)
  - Cannot use updateCaseStage to set stage to Closed (InvalidStageTransition) — must use closeCase
  - Unauthorized cannot update stage

describe("Case Closure")
  - Admin can close a case
  - After closure: closedAt > 0, stage = Closed
  - Emits CaseClosed
  - Emits CaseStageChanged with old stage and Closed
  - Cannot submit new evidence to closed case (CaseIsClosed)
  - Cannot advance stage on closed case (CaseIsClosed)
  - Cannot close already-closed case (CaseIsClosed)
  - Case data and evidence still readable after closure
  - Non-admin cannot close (system relay cannot close, regulator cannot close)

describe("Investigator Authorization")
  - Admin can authorize an investigator for a case
  - System relay can authorize
  - Regulator can authorize
  - isCaseAuthorized returns true after authorization
  - Unauthorized address cannot authorize
  - Admin can revoke an investigator
  - Regulator can revoke
  - Cannot revoke the lead investigator (CannotRevokeLead)
  - isCaseAuthorized returns false after revocation
  - Emits InvestigatorAuthorized and InvestigatorRevoked
  - Cannot authorize zero address (ZeroAddress)
  - Regulator is NOT case-authorized by default (isCaseAuthorized returns false for regulator unless explicitly authorized)

describe("Evidence Submission")
  - Lead investigator can submit evidence
  - Authorized investigator (investigatorB, authorized via authorizeInvestigator) can submit
  - System relay can submit evidence (acting on behalf of whistleblower for tips)
  - Admin can submit evidence
  - Regulator CANNOT submit evidence directly (NotCaseAuthorized) — must authorize themselves first
  - Regulator authorizes themselves, then CAN submit
  - Returns correct evidence index (first = 0, second = 1)
  - Emits EvidenceSubmitted with correct args (index, caseId, submitter, classification)
  - getEvidence returns correct fields (caseId, submitter, classification, description, contentHash, submittedAt > 0, sealStatus == Unsealed)
  - getEvidenceCount increments
  - getEvidenceForCase includes the new index
  - Cannot submit to nonexistent case (CaseNotFound)
  - Cannot submit to closed case (CaseIsClosed)
  - Non-authorized investigator cannot submit (NotCaseAuthorized)
  - Cannot submit with empty description (EmptyDescription)
  - Cannot submit with description over 200 characters (DescriptionTooLong)
  - Cannot submit with zero contentHash (ZeroContentHash)
  - Can submit with relatedAnomalyId and relatedEntityId (non-zero bytes32)
  - Can submit with both related IDs as bytes32(0) (standalone evidence)

describe("Whistleblower Tip Submission")
  - System relay submits evidence with classification = Tip
  - Evidence stored with relay as submitter (whistleblower identity protected)
  - Timestamp proves tip existed at a specific time (submittedAt > 0)
  - Can submit multiple tips to the same case

describe("Evidence Sealing")
  - Regulator can seal individual evidence
  - Admin can seal individual evidence
  - After sealing: sealStatus = Sealed
  - Emits EvidenceSealed with correct args (index, caseId, sealer)
  - Cannot seal already-sealed evidence (EvidenceAlreadySealed)
  - Unauthorized cannot seal
  - System relay cannot seal evidence

describe("Case Sealing")
  - Regulator can seal a case
  - Admin can seal a case
  - Emits CaseSealed
  - After sealing: case.sealed = true
  - All existing evidence for the case becomes Sealed
  - Cannot seal already-sealed case (CaseAlreadySealed)
  - New evidence submitted to a sealed case inherits Sealed status automatically
  - System relay cannot seal a case
  - Unauthorized cannot seal

describe("Case Summary")
  - getCaseSummary returns correct values
  - Create case, submit 3 evidence entries, advance to Discovery, seal — summary reflects (3 evidence, Discovery, sealed)

describe("Cross-Contract Integration")
  - Can create case for a deactivated org
  - Evidence with relatedAnomalyId is stored correctly (soft reference)
  - Evidence with relatedEntityId is stored correctly (soft reference)

describe("Edge Cases")
  - Multiple cases for the same org
  - Same investigator authorized for multiple cases independently
  - getEvidence with invalid index reverts (EvidenceNotFound)
  - getCase with nonexistent caseId reverts (CaseNotFound)
  - Revoked investigator's previously submitted evidence is still readable (evidence is immutable)

Use same conventions as prior tests: loadFixture, descriptive names, revertedWithCustomError, emit().withArgs().
```

---

## Prompt 5: Deploy Script

```
Write scripts/deploy-evidence-vault.ts using TypeScript.

It should:
- Import { ethers, upgrades } from "hardhat"
- Read AUDIT_LEDGER_ADDRESS from environment
- Deploy EvidenceVault through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
- Grant SYSTEM_ROLE to process.env.RELAY_ADDRESS
- Retrieve implementation address via upgrades.erc1967.getImplementationAddress()
- Log proxy address, implementation address, and linked AuditLedger address
- Throw if AUDIT_LEDGER_ADDRESS or RELAY_ADDRESS not set

Also create scripts/demo-evidence-lifecycle.ts that demonstrates the investigation pipeline:

IMPORTANT: This script should grant REGULATOR_ROLE to a specific signer so the regulator role is properly demonstrated (not just admin acting as regulator).

Step 1 — Setup:
- Connect to deployed EvidenceVault and AuditLedger
- Resolve "lighthouse-academies" to get the target org address
- Get signers: admin (deployer), systemRelay, investigatorA (lead), investigatorB (additional), regulatorSigner
- Grant REGULATOR_ROLE to regulatorSigner on EvidenceVault

Step 2 — Create a case (as admin):
- caseId: keccak256 of "CASE-2026-UCHS"
- Title: "Financial irregularities — CEO compensation and vendor concentration"
- Lead investigator: investigatorA
- Log: "Opened case: Financial irregularities — CEO compensation and vendor concentration"
- Log: "Lead investigator: {investigatorA.address}"

Step 3 — Authorize additional investigator (as regulator):
- Regulator authorizes investigatorB
- Log: "Regulator authorized investigator: {investigatorB.address}"

Step 4 — Submit evidence (demonstrating the pipeline):
- Evidence 1 (as system relay, classification = Tip): "Anonymous tip: CEO steering contracts to spouse's company"
  - Log: "Submitted tip #{index} — tx hash: {tx.hash} (serves as whistleblower receipt)"
- Evidence 2 (as lead investigator, classification = AnalysisReport): "AI-generated evidence brief — vendor concentration analysis"
  - Include a relatedAnomalyId (simulating link to AnomalyRegistry finding)
  - Log: "Submitted analysis #{index} — linked to anomaly finding"
- Evidence 3 (as investigatorB, classification = FinancialRecord): "Bank records showing payments to related-party vendor"
  - Include a relatedEntityId (simulating link to EntityGraph vendor entity)
  - Log: "Submitted financial record #{index} — linked to entity graph"

Step 5 — Advance the investigation (as admin):
- Tip → Analysis → Discovery
- Log each stage change

Step 6 — Seal the case (as regulator — demonstrating REGULATOR_ROLE):
- regulatorSigner seals the case
- Log: "Case sealed by regulator — evidence restricted to authorized parties"
- Submit one more evidence entry (as lead investigator) — log that it inherits Sealed status
- Log: "New evidence #{index} automatically inherited Sealed status"

Step 7 — Summary:
- getCaseSummary and log: evidence count, stage, sealed status
- Log: "Investigation pipeline complete — all evidence timestamped with cryptographic chain of custody"
- Log: "4 evidence entries, each with provable timestamp, submitter identity, and classification"

This demo walks a judge through a complete investigation lifecycle from whistleblower tip to sealed case, properly demonstrating all three roles (admin, system relay, regulator).

// Usage: npx hardhat run scripts/demo-evidence-lifecycle.ts --network tallyview-testnet
```

---

## Prompt 6: Review Pass

```
Review EvidenceVault contract, interface, TallyviewTypes additions, tests, and deploy scripts. Same criteria as prior reviews:

1. CORRECTNESS:
   - Does updateCaseStage correctly exclude Closed? Validation should be: uint8(newStage) > uint8(currentStage) AND newStage != InvestigationStage.Closed. Both checks needed.
   - Does closeCase correctly emit both CaseClosed and CaseStageChanged? Walk through the logic.
   - Does sealCase correctly seal all existing evidence? Iterates evidence indices and sets each to Sealed (skipping already-sealed). Confirm no off-by-one.
   - Does new evidence submitted to a sealed case inherit Sealed status? submitEvidence checks case.sealed and sets sealStatus accordingly. Confirm.
   - Is _isCaseAuthorized correct? Four paths: per-case mapping, lead investigator, ADMIN_ROLE, SYSTEM_ROLE. REGULATOR_ROLE is NOT included. Confirm.
   - Can a regulator submit evidence after authorizing themselves? Yes — authorizeInvestigator sets the per-case mapping, then _isCaseAuthorized returns true. Confirm the self-authorization flow works.
   - Can someone call closeCase then updateCaseStage? updateCaseStage checks closedAt > 0 and reverts with CaseIsClosed. Confirm.
   - Can someone call closeCase on a case and then submit evidence? submitEvidence checks closedAt > 0. Confirm.
   - Is the error naming collision resolved? CaseIsClosed (error) vs CaseClosed (event). Confirm they're distinct.
   - Sentinel for "case exists": openedAt > 0. Confirm safe.
   - Can the lead investigator be revoked? No — CannotRevokeLead. Confirm this check compares against case.leadInvestigator.

2. ELEGANCE:
   - Is _isCaseAuthorized clean and reused in submitEvidence and isCaseAuthorized query?
   - MAX_DESCRIPTION_LENGTH used for both case titles and evidence descriptions? Confirm.
   - sealed (case-level) and sealStatus (evidence-level) are distinct. Confirm no confusion.
   - Any dead code or unused errors?

3. AVALANCHE-SPECIFIC:
   - Same TxAllowList consideration as prior contracts
   - Evidence timestamps with sub-second finality provide legally meaningful precision. NatSpec should note.
   - Permissioned access tiers from the architecture doc map to EvidenceVault: public (case existence), permissioned (case metadata), restricted (sealed evidence). NatSpec should reference.
   - Hardhat local testing caveat for precompile integration.

4. CROSS-CONTRACT:
   - AuditLedger reference for org validation on case creation only. Org registered but NOT required active.
   - relatedAnomalyId and relatedEntityId are soft references. No IAnomalyRegistry or IEntityGraph imports. Confirm.
   - No circular dependencies.

5. UPGRADEABILITY: __gap, dynamic evidence array safe, per-case mappings safe across upgrades.

6. NATSPEC: Would a judge understand: (a) evidence is immutable with chain-of-custody, (b) sealing protects active investigations and cannot be reversed, (c) the pipeline maps to real investigation workflows, (d) whistleblower tips get temporal priority, (e) per-case access maps to need-to-know, (f) REGULATOR_ROLE seals but doesn't submit directly?

7. TEST COVERAGE: Key areas: _isCaseAuthorized all four paths, regulator NOT authorized by default, regulator self-authorization flow, sealed case evidence inheritance, updateCaseStage excluding Closed, closeCase vs updateCaseStage separation, CannotRevokeLead, whistleblower tip flow, CaseIsClosed vs CaseClosed naming.

Suggest specific improvements with diffs.
```

---

## Notes

**Add to Cursor context for every EvidenceVault prompt:**
- This prompt guide
- The AuditLedger prompt guide (EvidenceVault references AuditLedger for org validation)
- The Tallyview Avalanche L1 strategy document
- All AuditLedger source files (contract, interface, types)
- All EvidenceVault files generated by previous prompts
- AnomalyRegistry and EntityGraph files for architecture context (EvidenceVault has soft references to both)

**Key design principle: Chain of custody is automatic.** Every write to EvidenceVault is an onchain event with a timestamp and actor. The custody chain builds itself from the transaction history.

**Key demo moment: Whistleblower tip anchoring.** The relay submits a tip on behalf of an anonymous whistleblower. The transaction hash serves as a receipt proving temporal priority. For qui tam cases, this is legally significant.

**Per-case access control: four paths.** Per-case mapping, lead investigator, ADMIN_ROLE, SYSTEM_ROLE. REGULATOR_ROLE is deliberately excluded from evidence submission — regulators work through the authorization system. This is the most complex access pattern in the five-contract system and should be tested thoroughly.

**Closing vs. sealing.** These are independent. A case can be sealed at any stage (restricts access). A case can be closed at any stage (ends the investigation). The distinction matters: a sealed open case is still accepting evidence (just with restricted visibility). A closed unsealed case has all evidence publicly readable but no longer accepts new submissions.

**This completes the five core contracts.** The full system: AuditLedger (immutable financial timeline) → ComplianceEngine (rule enforcement) → AnomalyRegistry (AI findings) → EntityGraph (cross-org relationships) → EvidenceVault (investigation evidence). Each contract references AuditLedger for org identity. The contracts form a pipeline from passive record-keeping to active enforcement to investigation support.
