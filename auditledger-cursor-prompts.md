# AuditLedger.sol — Cursor Prompt Guide

> Drop this file into your project root so Claude in Cursor has full context.
> Run these prompts sequentially. Each one builds on the previous output.

---

## Context: What You're Building

Tallyview is an accountability intelligence platform for the $2.6T nonprofit sector. It connects to nonprofits' existing accounting systems and produces two products: compliance automation for the nonprofit, and cross-organizational oversight intelligence for foundations, regulators, and investigators.

The platform runs on a **purpose-built Avalanche L1** (Subnet-EVM). The blockchain is the immutable accountability substrate underneath a Next.js SaaS layer. Raw accounting data stays offchain. Only cryptographic commitments (hashes, attestations, status flags) go onchain.

**This is being judged in Avalanche's Build Games 2026 competition.** Evaluation criteria: technical implementation quality, use of Avalanche technologies, MVP architecture design, and UX design. The code needs to be elegant and clean — not over-engineered, not a hackathon prototype. Think production-quality contract design that a Solidity auditor would respect.

AuditLedger is the **foundation contract** that all four other contracts (ComplianceEngine, AnomalyRegistry, EntityGraph, EvidenceVault) will reference. Get this one right and everything else builds on it cleanly.

### Key Architecture Decision: Address-Based Org Identity with Human-Readable Names

Every registered nonprofit gets an **Avalanche address** on the Tallyview L1. This is the org's onchain identity. The Tallyview relay service operates it on the nonprofit's behalf through account abstraction — the nonprofit never touches a wallet, seed phrase, or signs a transaction. They interact with the SaaS dashboard. The relay handles all onchain submissions.

Each org also gets a **human-readable name** (e.g., `unitedway-la`) with forward resolution (name → address) and reverse resolution (address → name). This makes organizations discoverable onchain — a foundation program officer or donor can search by name in the Tallyview dashboard, which calls resolveByName() on the contract via viem, gets back the address, and pulls the org's full attestation history. The user never knows they're hitting the chain. The search feels normal. The trust layer underneath is onchain.

The naming interface is designed so it can be swapped out for a dedicated naming protocol (AKA Protocol) in the future without changing any contracts that depend on it. For now, it lives directly in AuditLedger's org registration.

An EIN hash (bytes32) is stored as metadata on the org record for offchain cross-referencing with the SaaS layer, but it is **not** the primary key. The address is.

---

## Prompt 1: Project Scaffold

```
I'm building smart contracts for Tallyview, a nonprofit accountability platform on a purpose-built Avalanche L1 (Subnet-EVM). This is for the Avalanche Build Games 2026 competition — judged on technical implementation quality, use of Avalanche technologies, MVP architecture, and UX design.

Set up the Hardhat project structure with TypeScript:

tallyview-contracts/
├── contracts/
│   ├── AuditLedger.sol
│   ├── interfaces/
│   │   └── IAuditLedger.sol
│   └── libraries/
│       └── TallyviewTypes.sol
├── test/
│   └── AuditLedger.test.ts
├── scripts/
│   └── deploy-audit-ledger.ts
├── hardhat.config.ts
├── package.json
├── tsconfig.json
└── .env.example

Use Hardhat with TypeScript. Target Solidity ^0.8.20. Install these dependencies:
- hardhat
- @nomicfoundation/hardhat-toolbox (includes ethers v6, chai, typechain, etc.)
- @openzeppelin/contracts (for ERC1967Proxy used in deployment)
- @openzeppelin/contracts-upgradeable (for UUPS proxy + AccessControlUpgradeable)
- @openzeppelin/hardhat-upgrades (for deployProxy/upgradeProxy helpers)
- dotenv

The chain is Subnet-EVM compatible so standard EVM tooling works natively.

Create hardhat.config.ts configured for:
- Solidity 0.8.20
- Optimizer enabled, 200 runs
- Network: "tallyview-testnet" pointing to Avalanche Fuji RPC https://api.avax-test.network/ext/bc/C/rpc (placeholder — we'll update with our L1 RPC once deployed)
- Network: "localhost" for local testing

Create .env.example with placeholders for:
- PRIVATE_KEY
- RELAY_ADDRESS
- TALLYVIEW_RPC_URL

Also create a TallyviewTypes.sol library that defines shared types the entire contract system will use. Since these types are shared across all five contracts, they live in the library, not in any individual interface:

- An enum called Role with values: None, Nonprofit, Foundation, Regulator, Investigator, System

- A struct called OrgRecord: registration data for an organization
  - string name (human-readable identifier, e.g. "unitedway-la")
  - bytes32 einHash (keccak256 of EIN, for offchain cross-referencing)
  - uint48 registeredAt (timestamp of registration)
  - uint16 latestYear (year of most recent audit submission, 0 if none)
  - uint8 latestMonth (month of most recent audit submission, 0 if none)
  - bool active

- A struct called AuditEntry: the record of a single monthly financial attestation
  - bytes32 merkleRoot (hash of the period's financial data)
  - bytes32 schemaHash (hash of the mapping schema used — so verifiers know how data was structured)
  - uint48 timestamp (when submitted onchain)
  - address submitter (who submitted — could be the org's address or the Tallyview relay)

Keep it minimal. Only what AuditLedger actually needs right now. We'll extend TallyviewTypes as we build the other four contracts.
```

---

## Prompt 2: The Interface

```
Now create IAuditLedger.sol — the interface for the AuditLedger contract. It should import TallyviewTypes.sol and use the OrgRecord and AuditEntry structs defined there.

Here's what AuditLedger does: Nonprofits (or the Tallyview relay service acting on their behalf) submit cryptographic hashes of their monthly financial data. Each submission is a Merkle root representing that organization's books for a given month. This creates an immutable onchain timeline: "Organization X's financials looked like THIS on date Y." If the books are later altered, the hash mismatch is provable.

IMPORTANT DESIGN DECISION — ADDRESS-BASED ORG IDENTITY:

Each registered nonprofit is identified by an Avalanche address on the Tallyview L1. This is the org's onchain identity. The Tallyview relay operates it via account abstraction — the nonprofit never touches a wallet. They use the SaaS dashboard.

Each org also gets a human-readable name (like "unitedway-la") with:
- Forward resolution: name → address
- Reverse resolution: address → name

This makes orgs discoverable onchain. A foundation officer searches by name in the dashboard, which calls resolveByName() on the contract, gets the address, and loads the org's attestation history. The naming interface is designed so it can later be replaced by a dedicated naming protocol (AKA Protocol) without changing dependent contracts.

An EIN hash (bytes32) is stored as metadata for offchain cross-referencing with the SaaS layer, but it is NOT the primary key. The address is.

The interface should define:

CUSTOM ERRORS:
- OrgNotRegistered()
- OrgAlreadyRegistered()
- OrgNotActive()
- NameAlreadyTaken()
- InvalidName()
- PeriodAlreadySubmitted()
- Unauthorized()
- InvalidPeriod()
- ZeroAddress()
- ZeroMerkleRoot()

EVENTS:
- AuditSubmitted(address indexed org, uint16 indexed year, uint8 indexed month, bytes32 merkleRoot)
- OrganizationRegistered(address indexed org, string name)
- OrganizationDeactivated(address indexed org)
- OrganizationNameUpdated(address indexed org, string oldName, string newName)

FUNCTIONS:

Organization management:
- registerOrganization(address org, string calldata name, bytes32 einHash) — register a nonprofit with its address, human-readable name, and EIN hash
- updateOrganizationName(address org, string calldata newName) — update the name (admin only, for corrections)
- deactivateOrganization(address org) — soft deactivation (not deletion — history is permanent)

Name resolution (grouped together — these are the functions that get swapped when we migrate to AKA Protocol):
- resolveByName(string calldata name) → address — forward resolution: name to address. Returns address(0) if name is not registered. Does NOT revert on unknown names.
- nameOf(address org) → string — reverse resolution: address to name. Returns empty string if address has no name. Does NOT revert.
- isNameTaken(string calldata name) → bool

Audit operations:
- submitAudit(address org, uint16 year, uint8 month, bytes32 merkleRoot, bytes32 schemaHash) — submit a monthly attestation
- getAudit(address org, uint16 year, uint8 month) → AuditEntry — retrieve a specific period's entry
- getLatestAudit(address org) → (uint16 year, uint8 month, AuditEntry) — most recent submission
- hasAuditForPeriod(address org, uint16 year, uint8 month) → bool

Organization queries:
- getOrganization(address org) → OrgRecord
- isOrganizationRegistered(address org) → bool
- isOrganizationActive(address org) → bool
- getSubmissionCount(address org) → uint256

DESIGN NOTES:
- Do NOT define structs in the interface. Import OrgRecord and AuditEntry from TallyviewTypes.sol.
- Use address as the primary key for all org lookups. This is an Avalanche address on the Tallyview L1.
- The name resolution functions (resolveByName, nameOf, isNameTaken) should be grouped together in the interface with a NatSpec section comment like "/// @notice --- Name Resolution ---". This makes it obvious which functions get swapped when we migrate to AKA Protocol.
- resolveByName returns address(0) for unknown names — it does NOT revert. The SaaS dashboard needs to handle "not found" gracefully.
- The interface should be clean enough that a foundation developer reading it immediately understands the contract's purpose and verification model.

Write only the interface. No implementation yet. Make it elegant — someone evaluating this for a competition should look at the interface and immediately understand what the contract does and why.
```

---

## Prompt 3: The Implementation

```
Now implement AuditLedger.sol based on the IAuditLedger interface. Import TallyviewTypes.sol for the shared structs.

ARCHITECTURE CONSTRAINTS:
- UUPS upgradeable (OpenZeppelin UUPSUpgradeable + Initializable)
- Access control: use OpenZeppelin AccessControlUpgradeable with custom roles
- Define roles as public bytes32 constants: SYSTEM_ROLE (the Tallyview relay that submits on behalf of orgs), ADMIN_ROLE
- An org's own address OR any address with SYSTEM_ROLE can submit audits for that org
- Only ADMIN_ROLE can register, deactivate, and update names
- This contract will be deployed on our own Avalanche L1 where we control gas costs, so don't over-optimize for gas. Optimize for readability and correctness.

STORAGE DESIGN:
- mapping(address => TallyviewTypes.OrgRecord) for org registration data
- mapping(bytes32 => address) for forward name resolution — key is keccak256(abi.encodePacked(name)), value is org address. Using bytes32 key (not string) because Solidity hashes string keys internally anyway, and this makes the hashing explicit and consistent.
- mapping(address => string) for reverse name resolution (address → name)
- mapping(bytes32 => TallyviewTypes.AuditEntry) for audit entries, keyed by _periodKey(address org, uint16 year, uint8 month). Write a clean internal _periodKey function using keccak256(abi.encodePacked(org, year, month)).
- mapping(address => uint256) for submission count per org

NAME VALIDATION:
- Write an internal _validateName function
- Rules: lowercase a-z, digits 0-9, hyphens allowed (not at start or end), minimum 3 characters, maximum 32 characters
- Revert with InvalidName() if validation fails
- Write an internal _nameHash function that returns keccak256(abi.encodePacked(name)) — used as the key for the forward resolution mapping

AUDIT SUBMISSION LOGIC:
- submitAudit should:
  - Revert if org isn't registered or isn't active
  - Revert if caller is neither the org's own address nor has SYSTEM_ROLE
  - Revert if merkleRoot is bytes32(0) — we use zero merkleRoot as the "entry does not exist" check, so submitting zero would break that invariant. Use the ZeroMerkleRoot() error.
  - Revert if an entry already exists for this org+period (check that stored merkleRoot != bytes32(0))
  - Validate the period (month 1-12, year > 2020 and < 2100)
  - Store the AuditEntry with uint48(block.timestamp) and msg.sender
  - Update the org's latestYear and latestMonth if this submission is chronologically more recent (compare year first, then month)
  - Increment the submission count
  - Emit AuditSubmitted

ORGANIZATION REGISTRATION:
  - Revert if address is zero (ZeroAddress)
  - Revert if org address is already registered — check registeredAt > 0 as the indicator
  - Revert if name is already taken (check forward resolution mapping)
  - Validate the name
  - Store OrgRecord with registeredAt = uint48(block.timestamp), active = true, latestYear = 0, latestMonth = 0
  - Set forward resolution: _nameHash(name) → org address
  - Set reverse resolution: org address → name
  - Emit OrganizationRegistered

NAME UPDATE:
  - Only ADMIN_ROLE
  - Org must be registered
  - Release the old name: delete forward mapping for _nameHash(oldName)
  - Validate new name, check it's not taken
  - Set new forward and reverse mappings
  - Update the name field in OrgRecord
  - Emit OrganizationNameUpdated with old and new name

DEACTIVATION:
  - Only ADMIN_ROLE
  - Org must be registered and currently active
  - Set active = false on OrgRecord
  - Do NOT delete name mappings — the name stays reserved and the history stays discoverable
  - Emit OrganizationDeactivated

VIEW FUNCTIONS:
  - resolveByName: hash the input name, look up forward mapping, return result (address(0) if not found — no revert)
  - nameOf: look up reverse mapping, return result (empty string if not found — no revert)
  - isNameTaken: hash the input name, check if forward mapping value is non-zero address
  - getAudit, getLatestAudit, hasAuditForPeriod, getOrganization, isOrganizationRegistered, isOrganizationActive, getSubmissionCount: straightforward reads

STYLE:
- NatSpec comments on every external function. Brief, clear, no filler.
- Group storage variables with comments explaining each mapping's purpose.
- Custom errors defined in the interface, not redefined in the implementation.
- Name internal functions with underscore prefix: _periodKey, _nameHash, _validateName
- Add uint256[50] private __gap at the end for future upgrade storage slots

This needs to feel like a contract written by someone who knows what they're doing, not a tutorial example. Clean, purposeful, no dead code. Every line should earn its place.
```

---

## Prompt 4: Tests

```
Write comprehensive Hardhat tests for AuditLedger in test/AuditLedger.test.ts using TypeScript, ethers v6, and Chai.

Use @openzeppelin/hardhat-upgrades to deploy the contract through a UUPS proxy in the test setup. Use loadFixture from @nomicfoundation/hardhat-toolbox for efficient test setup.

IMPORTANT: When testing "org's own address can submit", the org address used in registerOrganization must be the SAME address as the signer calling submitAudit. In the fixture, get a signer, use signer.address for registration, then connect the contract to that signer when testing org-initiated submissions. Example:
  const orgContract = auditLedger.connect(orgSigner);
  await orgContract.submitAudit(orgSigner.address, 2026, 1, merkleRoot, schemaHash);

SETUP:
- deployFixture() function that:
  - Gets signers: [admin, systemRelay, orgSigner, anotherOrgSigner, unauthorized]
  - Deploys AuditLedger through UUPS proxy via upgrades.deployProxy(factory, [], { initializer: 'initialize', kind: 'uups' })
  - Grants SYSTEM_ROLE to systemRelay.address
  - Returns: { auditLedger (contract instance connected to admin), admin, systemRelay, orgSigner, anotherOrgSigner, unauthorized }
- Helper constants: TEST_ORG_NAME = "test-org", TEST_EIN_HASH = keccak256 of "12-3456789", TEST_MERKLE_ROOT = keccak256 of "test-financial-data", TEST_SCHEMA_HASH = keccak256 of "schema-v1"
- Helper function: registerTestOrg(contract, orgAddress, name?) that calls registerOrganization with defaults

TEST CATEGORIES (use describe blocks):

describe("Deployment & Initialization")
  - Contract deploys and initializes correctly through proxy
  - Admin has ADMIN_ROLE and DEFAULT_ADMIN_ROLE
  - System relay has SYSTEM_ROLE
  - Cannot call initialize again (reverts)

describe("Organization Registration")
  - Admin can register an org with name and EIN hash
  - Non-admin cannot register (reverts with AccessControl error)
  - Cannot register same address twice (OrgAlreadyRegistered)
  - Cannot register with a name already taken by another org (NameAlreadyTaken)
  - Emits OrganizationRegistered event with correct args
  - isOrganizationRegistered returns true after registration, false before
  - isOrganizationActive returns true after registration
  - getOrganization returns correct OrgRecord fields (name, einHash, active, registeredAt > 0, latestYear == 0, latestMonth == 0)
  - Zero address registration reverts (ZeroAddress)

describe("Name Resolution")
  - resolveByName returns correct address after registration
  - resolveByName returns address(0) for unknown/unregistered names (does NOT revert)
  - nameOf returns correct name after registration
  - nameOf returns empty string for unregistered address (does NOT revert)
  - isNameTaken returns true for taken names, false for available
  - Forward and reverse resolution are consistent with each other
  - Name update by admin: old name is freed (resolveByName returns address(0)), new name resolves to org, reverse resolves to new name
  - Cannot update to a name taken by another org
  - Non-admin cannot update name
  - Emits OrganizationNameUpdated with old and new name

describe("Name Validation")
  - Valid names succeed: "unitedway-la", "org123", "abc"
  - Invalid names revert with InvalidName(): empty string, "ab" (too short), "-starts-hyphen", "ends-hyphen-", "has spaces", "UPPERCASE", string longer than 32 chars, "special!chars"

describe("Audit Submission — Happy Path")
  - Org's own address can submit: connect contract to orgSigner, call submitAudit with orgSigner.address as the org param
  - System relay with SYSTEM_ROLE can submit for any registered org
  - Emits AuditSubmitted with correct indexed args (org address, year, month, merkleRoot)
  - getAudit returns correct AuditEntry fields after submission (merkleRoot, schemaHash, timestamp > 0, correct submitter address)
  - getLatestAudit returns correct year, month, and entry
  - hasAuditForPeriod returns true after submission, false before
  - getSubmissionCount returns 1 after first submission

describe("Audit Submission — Guards")
  - Reverts for unregistered org address (OrgNotRegistered)
  - Reverts for deactivated org (OrgNotActive)
  - Reverts when unauthorized address calls (Unauthorized) — use unauthorized signer
  - Reverts on duplicate: submit same org+year+month twice (PeriodAlreadySubmitted)
  - Reverts when merkleRoot is bytes32(0) (ZeroMerkleRoot)
  - Reverts on invalid month 0 (InvalidPeriod)
  - Reverts on invalid month 13 (InvalidPeriod)
  - Reverts on invalid year 2020 (InvalidPeriod) — boundary, should fail if rule is year > 2020
  - Boundary months 1 and 12 succeed
  - Year 2021 succeeds (first valid year)

describe("Multiple Submissions & Latest Tracking")
  - Submit Jan 2026, Feb 2026, Mar 2026 — each stored correctly via getAudit
  - getLatestAudit reflects Mar 2026 (chronologically most recent)
  - Submit out of order: Mar 2026 first, then Jan 2026 — getLatestAudit still returns Mar 2026
  - getSubmissionCount returns 3 after three submissions
  - Submit Dec 2025 after Mar 2026 — latest is still Mar 2026

describe("Organization Deactivation")
  - Admin can deactivate an org
  - Emits OrganizationDeactivated event
  - isOrganizationActive returns false after deactivation
  - Deactivated org cannot submit new audits (OrgNotActive)
  - Deactivated org's name still resolves via resolveByName (history is permanent)
  - Past audit entries for deactivated org are still readable via getAudit
  - Non-admin cannot deactivate

describe("Edge Cases")
  - Two different orgs can submit for the same year+month independently
  - Same org, same period, different callers (org address then system relay) — first succeeds, second reverts with PeriodAlreadySubmitted

Use expect(...).to.be.revertedWithCustomError(contract, "ErrorName") for custom error checks. Use expect(...).to.emit(contract, "EventName").withArgs(...) for event checks. Use ethers.solidityPackedKeccak256 for generating test hashes.
```

---

## Prompt 5: Deploy Script

```
Write the Hardhat deployment script in scripts/deploy-audit-ledger.ts using TypeScript.

It should:
- Import { ethers, upgrades } from "hardhat"
- Use upgrades.deployProxy(AuditLedgerFactory, [], { initializer: 'initialize', kind: 'uups' }) to deploy
- The proxy address is the return value: const auditLedger = await upgrades.deployProxy(...)
- Grant SYSTEM_ROLE to the relay address from process.env.RELAY_ADDRESS
- Retrieve the implementation address via: await upgrades.erc1967.getImplementationAddress(await auditLedger.getAddress())
- Log the proxy address, implementation address, and admin (deployer) address to console
- Throw an error if RELAY_ADDRESS is not set in environment

Also create scripts/register-test-org.ts that:
- Connects to the deployed AuditLedger at process.env.AUDIT_LEDGER_ADDRESS using ethers.getContractAt()
- Registers a test organization:
  - Address: process.env.ORG_ADDRESS
  - Name: "lighthouse-academies" (the founder's charter school network — good demo narrative)
  - EIN hash: ethers.solidityPackedKeccak256(["string"], ["12-3456789"])
- Submits a sample audit entry for January 2026 with a dummy Merkle root and schema hash
- Calls resolveByName("lighthouse-academies") and logs the returned address
- Calls nameOf(orgAddress) and logs the returned name
- Calls getAudit for the submitted period and logs the merkleRoot and timestamp
- Logs everything clearly so the output works as a live demo

These are helpers for demo and the Build Games live showcase. Keep both scripts clean and minimal. Add a comment at the top of each explaining what it does and how to run it:
// Usage: npx hardhat run scripts/deploy-audit-ledger.ts --network tallyview-testnet
```

---

## Prompt 6: Review Pass

```
Review the AuditLedger contract, interface, types library, tests, and deploy scripts we just built. This is for a competition judged on technical implementation quality and use of Avalanche technologies. Check for:

1. CORRECTNESS:
   - Any logic bugs or edge cases we missed?
   - Is the latest period tracking correct when audits are submitted out of chronological order? Walk through: submit Mar 2026, then Jan 2026 — does latestYear/latestMonth still show Mar 2026?
   - Confirm that submitting merkleRoot of bytes32(0) is rejected with ZeroMerkleRoot.
   - Does _periodKey produce collisions? Verify the abi.encodePacked packing is safe (address is 20 bytes, uint16 is 2 bytes, uint8 is 1 byte — 23 bytes total, no ambiguity).
   - Reentrancy: confirm no external calls that could be exploited.
   - Is registeredAt > 0 a safe "is registered" check? (It is — block.timestamp is always > 0 for mined transactions.)

2. ELEGANCE: Is there any dead code, unnecessary complexity, or patterns that don't earn their place? Could any function be simpler without losing functionality? Is the name validation clean or bloated?

3. AVALANCHE-SPECIFIC: Are we leveraging Subnet-EVM capabilities properly? The TxAllowList precompile lives at 0x0200000000000000000000000000000000000002 and the ContractDeployerAllowList at 0x0200000000000000000000000000000000000000. Consider:
   - Should we check the TxAllowList in critical functions as an additional layer showing Avalanche-native design?
   - The IAllowList interface is available via @avalabs/subnet-evm-contracts: import "@avalabs/subnet-evm-contracts/contracts/interfaces/IAllowList.sol"
   - IAllowList functions: setAdmin(address), setEnabled(address), setNone(address), readAllowList(address) → uint256 (0=None, 1=Enabled, 2=Admin, 3=Manager)
   - Even a light integration — like an optional modifier that checks TxAllowList status — would signal to judges that this contract is designed for Avalanche specifically, not generic EVM
   - IMPORTANT: The TxAllowList precompile does NOT exist in local Hardhat test networks. Any Avalanche-native integration needs to degrade gracefully in local tests — for example, an immutable bool set at deploy time, or a try/catch around the precompile call, or a separate test config.

4. NAMING LAYER DESIGN: Is the name resolution cleanly separated from the audit logic? Could a future upgrade swap the resolution to an external naming protocol (AKA Protocol) without breaking anything? Are there any storage layout issues that would make this migration harder?

5. INTERFACE CLARITY: If a foundation developer or auditor reads IAuditLedger.sol, do they immediately understand: (a) that orgs are identified by address with human-readable names, (b) that audit entries are immutable monthly attestations, and (c) how to verify an org's financial history?

6. UPGRADEABILITY: Is the UUPS pattern implemented correctly? Is there a uint256[50] private __gap? No storage collisions with proxy? Will the name resolution mappings survive an upgrade cleanly?

7. NATSPEC: Are the comments clear, accurate, and competition-worthy? Would a judge scanning the code quickly understand the design intent?

8. TEST COVERAGE: Did the tests miss anything? Are there any assertions that could pass vacuously (e.g., checking a default zero value that happens to match expected output)?

Suggest specific improvements. Show the diffs. Don't add complexity for its own sake — only changes that make the contract cleaner, more correct, or more demonstrably Avalanche-native.
```

---

## Notes for Running These Prompts

**In Cursor, add these files to context for every prompt:**
- This prompt guide (so Claude knows the full picture)
- The Tallyview Avalanche L1 strategy document (PDF or docx) for architecture context
- Any files generated by previous prompts

**After AuditLedger is solid, the same six-prompt pattern works for the next four contracts:**
- ComplianceEngine (references AuditLedger for period data and org validation)
- AnomalyRegistry (references AuditLedger for org validation, stores AI-detected findings)
- EntityGraph (uses address-based org identity for relationship edges, shares TallyviewTypes)
- EvidenceVault (references AnomalyRegistry entries, stores investigation chain-of-custody)

Each subsequent contract should import IAuditLedger and reference the deployed AuditLedger for org lookups and name resolution rather than duplicating that logic.

**Avalanche-specific details for Cursor context:**
- TxAllowList precompile address: `0x0200000000000000000000000000000000000002`
- ContractDeployerAllowList: `0x0200000000000000000000000000000000000000`
- IAllowList interface: `setAdmin(address)`, `setEnabled(address)`, `setNone(address)`, `readAllowList(address) → uint256` (0=None, 1=Enabled, 2=Admin, 3=Manager)
- Install: `npm install @avalabs/subnet-evm-contracts`
- Avalanche Fuji testnet RPC: `https://api.avax-test.network/ext/bc/C/rpc`
- Subnet-EVM is fully EVM-compatible — Hardhat, Foundry, Remix all work natively
- IMPORTANT: TxAllowList precompile does not exist in local Hardhat network. Any Avalanche-native integration must degrade gracefully in local test environments.

**Naming layer future path:**
The name resolution built into AuditLedger is intentionally designed as a self-contained module that can be extracted to a standalone NameRegistry contract or replaced by AKA Protocol in a future upgrade. The key constraint: dependent contracts (ComplianceEngine, AnomalyRegistry, etc.) should call IAuditLedger for org lookups and name resolution, never storing their own name mappings. This keeps the migration path clean.
