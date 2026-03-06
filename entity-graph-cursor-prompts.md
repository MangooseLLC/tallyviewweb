# EntityGraph.sol — Cursor Prompt Guide

> Drop this file into your project root alongside the prior prompt guides.
> Run these prompts sequentially after AuditLedger, ComplianceEngine, and AnomalyRegistry are complete and tested.
> Add all prior contract files to Cursor context for every prompt.

---

## Context: What EntityGraph Does

EntityGraph stores relationship edges between entities onchain: board members serving on organizations, vendors receiving payments from organizations, and shared addresses across organizations. This is the substrate for cross-organizational fraud pattern detection — the capability that no single-tenant accounting system can replicate.

The power of EntityGraph is in the *cross*. A single nonprofit's accounting system knows its own board members and its own vendors. But it has no visibility into whether board member John Reeves also serves on three other nonprofit boards, all of which use Reeves & Associates LLC as a vendor. That pattern — shared governance overlapping with shared vendor relationships — is a classic fraud indicator. EntityGraph makes it visible onchain.

**Real-world patterns EntityGraph detects:**
- Board member serves on multiple nonprofit boards that share a vendor (conflict-of-interest network)
- Vendor receives payments from multiple nonprofits at the same address (shell company indicator)
- Multiple nonprofits share a registered address (common in fraud rings)
- Executive at one nonprofit is a vendor to another nonprofit in the same network
- Vendor concentration: one vendor receives a disproportionate share of payments across multiple orgs

The SaaS layer does the detection — parsing accounting data, matching names and addresses, resolving entity identities. EntityGraph receives the confirmed relationship edges and stores them onchain where they become permanent, queryable, and cross-referenceable by regulators and investigators.

### How EntityGraph References Other Contracts

- **AuditLedger:** org validation (is the org registered and active?)
- **AnomalyRegistry:** when EntityGraph reveals a suspicious pattern, the AI engine may record an anomaly in AnomalyRegistry referencing the relationship. But EntityGraph itself doesn't import IAnomalyRegistry — it's a data layer, not a detection layer.
- **EvidenceVault (future):** relationship data from EntityGraph can be referenced as evidence in investigations.

### What Lives Onchain vs. Offchain

**Onchain (EntityGraph):**
- Entity identifiers (hashed names/IDs for people, vendors, addresses)
- Relationship edges: who connects to which organization, in what role
- Timestamps of when relationships were recorded
- Active/inactive status on edges (people leave boards, vendor contracts end)

**Offchain (SaaS layer):**
- Entity resolution (matching "John Reeves", "J. Reeves", "John A. Reeves" as the same person)
- Name and address normalization
- Payment data that identifies vendor relationships
- The actual detection logic that identifies suspicious patterns
- Detailed relationship analysis and visualization

### Key Design Principle

EntityGraph is a **data layer, not a detection layer.** It stores confirmed relationships. The SaaS AI layer detects suspicious patterns from those relationships and writes findings to AnomalyRegistry. EntityGraph's value is making relationships queryable onchain so that anyone with the right access tier can verify connections independently — a regulator can query "show me all organizations connected to this vendor" without relying on Tallyview's analysis.

---

## Prompt 1: Extend TallyviewTypes.sol

```
We're building EntityGraph.sol, the fourth of five core contracts for Tallyview's Avalanche L1. Extend TallyviewTypes.sol with the types EntityGraph needs.

Add these to the existing TallyviewTypes library (keep everything from prior contracts):

ENUMS:

- EntityType: Person, Vendor, Address
  Person = board member, executive, key employee, related individual
  Vendor = company or individual receiving payments from a nonprofit
  Address = a physical or mailing address shared across entities

- RelationshipType: BoardMember, Executive, KeyEmployee, VendorPayee, RegisteredAddress, MailingAddress, RelatedParty, Custom

- EdgeStatus: Active, Inactive

STRUCTS:

- Entity: a person, vendor, or address in the graph
  - EntityType entityType
  - bytes32 identityHash (hash of the entity's identifying information — name + DOB for people, EIN/name for vendors, normalized address string for addresses. Raw PII stays offchain.)
  - string label (human-readable label for dashboard display, e.g., "John Reeves", "Reeves & Associates LLC", "1847 NW Flanders St". Required on creation, max 100 characters.)
  - uint48 createdAt
  - bool active

- RelationshipEdge: a connection between an entity and an organization
  - bytes32 entityId (the entity in this relationship — references the Entity)
  - address org (the organization — matches AuditLedger address)
  - RelationshipType relationshipType
  - uint48 startDate (when the relationship began or was first detected)
  - uint48 endDate (0 if current/ongoing)
  - EdgeStatus status
  - bytes32 evidenceHash (hash of supporting data from the SaaS layer — the accounting record, board resolution, or filing that establishes this relationship)

IMPORTANT: Do NOT store the mapping key (entityId for entities, edgeId for edges) inside the struct itself. entityId and edgeId are external lookup keys. However, RelationshipEdge DOES store entityId and org because an edge needs to know what it connects — these are data fields, not the edge's own key.

DESIGN NOTE: Entities are hashed. A person named "John Reeves" is stored as identityHash = keccak256(abi.encodePacked("john-reeves-1965-03-15")) with a human-readable label. The raw identifying information stays offchain. This lets the contract store cross-organizational relationships without putting PII onchain, while still enabling graph queries ("which organizations share entity X?").
```

---

## Prompt 2: The Interface

```
Create IEntityGraph.sol — the interface for the EntityGraph contract. Import TallyviewTypes.sol for all struct and enum types.

EntityGraph stores relationship edges between entities (people, vendors, addresses) and organizations. It enables cross-organizational queries: "Does this board member appear on other organizations?" "Does this vendor receive payments from multiple nonprofits?" "Do these organizations share a registered address?" This is the substrate for fraud pattern detection that no single-tenant accounting system can provide.

CUSTOM ERRORS:
- EntityNotFound()
- EntityNotActive()
- EntityAlreadyExists()
- EdgeNotFound()
- EdgeAlreadyExists()
- EdgeAlreadyInactive()
- OrgNotRegistered()
- OrgNotActive()
- Unauthorized()
- ZeroAddress()
- EmptyLabel()
- LabelTooLong()

EVENTS:
- EntityCreated(bytes32 indexed entityId, TallyviewTypes.EntityType entityType)
- EntityDeactivated(bytes32 indexed entityId)
- EdgeCreated(bytes32 indexed edgeId, bytes32 indexed entityId, address indexed org, TallyviewTypes.RelationshipType relationshipType)
- EdgeDeactivated(bytes32 indexed edgeId)

NOTE on EntityCreated: the label is NOT included in the event (same rationale as AnomalyRegistry — avoid string gas costs in events). The label is readable from getEntity(entityId) after the event fires.

FUNCTIONS:

Entity management:
- createEntity(bytes32 entityId, TallyviewTypes.EntityType entityType, bytes32 identityHash, string calldata label) — register an entity in the graph. entityId is caller-provided (typically keccak256 of a deterministic identifier). Only SYSTEM_ROLE or ADMIN_ROLE.
- deactivateEntity(bytes32 entityId) — soft deactivation. Only ADMIN_ROLE.
- getEntity(bytes32 entityId) → Entity
- isEntityActive(bytes32 entityId) → bool

Relationship edges:
- createEdge(bytes32 edgeId, bytes32 entityId, address org, TallyviewTypes.RelationshipType relationshipType, uint48 startDate, bytes32 evidenceHash) — create a relationship between an entity and an organization. Entity must be active. Org must be registered and active. Only SYSTEM_ROLE or ADMIN_ROLE.
- deactivateEdge(bytes32 edgeId) — mark a relationship as ended (board member resigned, vendor contract terminated). Sets endDate = now, status = Inactive. Cannot deactivate an already-inactive edge. Only SYSTEM_ROLE or ADMIN_ROLE.
- getEdge(bytes32 edgeId) → RelationshipEdge
- isEdgeActive(bytes32 edgeId) → bool

Cross-organizational queries (the core value):
- getEdgesForEntity(bytes32 entityId) → bytes32[] — all edges (all orgs) for a given entity. "Where does this person/vendor appear?"
- getEdgesForOrg(address org) → bytes32[] — all edges for an organization. "Who is connected to this nonprofit?"
- getEntitiesForOrg(address org) → bytes32[] — unique entity IDs connected to an org
- getOrgsForEntity(bytes32 entityId) → address[] — all organizations connected to an entity. THE key fraud detection query: "Which nonprofits share this board member/vendor/address?"
- getSharedEntities(address orgA, address orgB) → bytes32[] — entities that appear in edges for BOTH organizations. "What do these two nonprofits have in common?"
- getOrgGraphSummary(address org) → (uint256 totalEdges, uint256 activeEdges, uint256 uniqueEntities) — quick health check for dashboard

DESIGN NOTES:
- EntityGraph references IAuditLedger for org validation on edge creation. Both isOrganizationRegistered and isOrganizationActive are checked. Entities exist independently of orgs (a person can exist in the graph before being linked to any org).
- entityId is caller-provided, not auto-generated. The relay computes deterministic IDs from the offchain entity resolution pipeline. This allows the same entity to be referenced consistently across multiple edge creations without the contract needing to do entity resolution.
- identityHash is a separate field from entityId. entityId is the lookup key. identityHash is the privacy-preserving fingerprint of the real identity data. They can be the same value, but separating them gives flexibility for the relay to use different ID schemes.
- getOrgsForEntity is the most important query in the contract. When a regulator asks "where else does this vendor operate?", this is the function that answers. It needs to be correct and complete.
- getSharedEntities is the cross-organizational overlap detector. Two orgs sharing 3+ entities (same board members, same vendors, same address) is a strong fraud signal. The SaaS layer calls this and feeds results to AnomalyRegistry.
- Edges are immutable records. Deactivating an edge sets status to Inactive and records endDate, but does NOT delete the edge. The historical record of who was connected to whom, and when, matters for investigations. Deactivating an already-inactive edge reverts with EdgeAlreadyInactive to prevent overwriting the original endDate.
- Labels are required on entity creation (non-empty, max 100 characters). For a future production upgrade, privacy-sensitive environments could introduce label encryption or redaction. For the competition, readable labels make the demo stronger.
```

---

## Prompt 3: The Implementation

```
Implement EntityGraph.sol based on the IEntityGraph interface.

ARCHITECTURE:
- UUPS upgradeable (same pattern as prior contracts)
- AccessControlUpgradeable with ADMIN_ROLE, SYSTEM_ROLE (public bytes32 constants)
- Initialize accepts AuditLedger proxy address:
  function initialize(address auditLedgerAddress) public initializer
- Store IAuditLedger reference for org validation on edge creation

STORAGE DESIGN:
- IAuditLedger public auditLedger (set in initialize)
- mapping(bytes32 => TallyviewTypes.Entity) for entities
- mapping(bytes32 => TallyviewTypes.RelationshipEdge) for edges
- mapping(bytes32 => bytes32[]) for edgeIds per entity (entityId → edgeIds)
- mapping(address => bytes32[]) for edgeIds per org (org → edgeIds)
- mapping(address => bytes32[]) for entityIds per org (org → unique entityIds — maintained separately from edges for efficient lookup)
- mapping(bytes32 => address[]) for orgs per entity (entityId → org addresses — the key fraud query index)
- mapping(bytes32 => mapping(address => bool)) for deduplication: has this entity already been linked to this org in the entityIds and orgs arrays? Prevents duplicate entries in the enumeration arrays when multiple edges connect the same entity to the same org (e.g., same person is both BoardMember and KeyEmployee).
- uint256 public constant MAX_LABEL_LENGTH = 100
- uint256[50] private __gap

ENTITY CREATION:
- createEntity:
  - Only SYSTEM_ROLE or ADMIN_ROLE
  - Revert if entityId already exists (check createdAt > 0 as sentinel)
  - Revert if label is empty: bytes(label).length == 0 (EmptyLabel)
  - Revert if label too long: bytes(label).length > MAX_LABEL_LENGTH (LabelTooLong)
  - Store Entity with createdAt = uint48(block.timestamp), active = true
  - Emit EntityCreated

EDGE CREATION:
- createEdge:
  - Only SYSTEM_ROLE or ADMIN_ROLE
  - Entity must exist (check createdAt > 0) — revert EntityNotFound if not
  - Entity must be active — revert EntityNotActive if not
  - Org must be registered AND active via auditLedger — revert OrgNotRegistered or OrgNotActive
  - Revert if edgeId already exists (check that stored entityId != bytes32(0) as sentinel — a valid edge always has a non-zero entityId)
  - Store RelationshipEdge with endDate = 0, status = Active
  - Push edgeId to entity's edges array
  - Push edgeId to org's edges array
  - If this entity+org combination is new (check deduplication mapping):
    - Push entityId to org's entities array
    - Push org address to entity's orgs array
    - Set deduplication flag to true
  - Emit EdgeCreated

EDGE DEACTIVATION:
- deactivateEdge:
  - Only SYSTEM_ROLE or ADMIN_ROLE
  - Edge must exist (EdgeNotFound)
  - Edge must be currently Active — revert EdgeAlreadyInactive if status is already Inactive (prevents overwriting the original endDate)
  - Set endDate = uint48(block.timestamp), status = Inactive
  - Do NOT remove from arrays — history is permanent
  - Emit EdgeDeactivated

ENTITY DEACTIVATION:
- deactivateEntity:
  - Only ADMIN_ROLE
  - Entity must exist and be active
  - Set active = false
  - Do NOT deactivate associated edges automatically — edges have independent lifecycles
  - Emit EntityDeactivated

CROSS-ORGANIZATIONAL QUERIES:
- getEdgesForEntity: return the entity's edgeIds array
- getEdgesForOrg: return the org's edgeIds array
- getEntitiesForOrg: return the org's entityIds array (deduplicated at write time)
- getOrgsForEntity: return the entity's orgs array (deduplicated at write time)
- getSharedEntities(orgA, orgB):
  - Get entityIds for orgA (shorter list) and entityIds for orgB
  - Use a nested loop approach: for each entityId in the SHORTER list, check if it appears in the longer list
  - NOTE: Solidity does not support mappings in memory. Use a simple nested loop. For view calls on our L1, O(n*m) is acceptable for reasonable entity counts (hundreds per org, not millions).
  - Two-pass: first count matches, then allocate uint256[] memory and fill
  - Return the array of shared entityIds
- getOrgGraphSummary: 
  - totalEdges = org's edgeIds array length
  - activeEdges = iterate org's edgeIds, count where status == Active
  - uniqueEntities = org's entityIds array length (already deduplicated)
  - Return (totalEdges, activeEdges, uniqueEntities)

STYLE:
- Same conventions as prior contracts: NatSpec, custom errors from interface, _underscore internals, __gap
- MAX_LABEL_LENGTH as a named public constant
- NatSpec should emphasize that this is a data layer, not a detection layer
- NatSpec on getOrgsForEntity should explain this is the key cross-organizational query for fraud detection
- NatSpec on getSharedEntities should explain this powers the "what do these orgs have in common?" analysis
```

---

## Prompt 4: Tests

```
Write comprehensive Hardhat tests for EntityGraph in test/EntityGraph.test.ts using TypeScript, ethers v6, and Chai.

SETUP:
- deployFixture() that:
  - Deploys AuditLedger through UUPS proxy
  - Grants SYSTEM_ROLE on AuditLedger to systemRelay
  - Registers three orgs on AuditLedger: "org-alpha" (orgA.address), "org-beta" (orgB.address), "org-gamma" (orgC.address) — three orgs enables meaningful cross-org testing
  - Deploys EntityGraph through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
  - Grants SYSTEM_ROLE on EntityGraph to systemRelay
  - Returns: { entityGraph, auditLedger, admin, systemRelay, orgA, orgB, orgC, unauthorized }

- Helper constants:
  - PERSON_ENTITY_ID = keccak256 of "person-john-reeves"
  - VENDOR_ENTITY_ID = keccak256 of "vendor-reeves-associates"
  - ADDRESS_ENTITY_ID = keccak256 of "addr-1847-nw-flanders"
  - PERSON_IDENTITY_HASH = keccak256 of "john-reeves-1965-03-15"
  - VENDOR_IDENTITY_HASH = keccak256 of "reeves-associates-llc-47-1234567"
  - ADDRESS_IDENTITY_HASH = keccak256 of "1847-nw-flanders-st-portland-or-97209"
  - EDGE_ID_1 through EDGE_ID_6 = keccak256 of deterministic strings like "edge-reeves-orgA-board"

- Helpers:
  - createTestPerson() — creates John Reeves as a Person entity, returns entityId
  - createTestVendor() — creates Reeves & Associates LLC as a Vendor entity, returns entityId
  - createTestAddress() — creates 1847 NW Flanders St as an Address entity, returns entityId
  - linkEntityToOrg(entityId, orgAddress, edgeId, relationshipType) — creates an edge

TEST CATEGORIES:

describe("Deployment & Initialization")
  - Deploys correctly with AuditLedger reference
  - Roles assigned properly
  - Cannot initialize twice

describe("Entity Creation")
  - System relay can create a Person entity
  - Admin can create a Vendor entity
  - Can create an Address entity
  - Cannot create duplicate entityId (EntityAlreadyExists)
  - Cannot create with empty label (EmptyLabel)
  - Cannot create with label over 100 characters (LabelTooLong)
  - Label of exactly 100 characters succeeds
  - Emits EntityCreated with correct args (entityId, entityType — no label in event)
  - getEntity returns correct fields (entityType, identityHash, label, createdAt > 0, active)
  - isEntityActive returns true after creation
  - Unauthorized cannot create

describe("Edge Creation")
  - System relay can create an edge linking an entity to an org
  - Edge stored correctly: entityId, org, relationshipType, startDate, endDate == 0, status == Active, evidenceHash
  - Emits EdgeCreated with correct args
  - Cannot create edge for nonexistent entity (EntityNotFound)
  - Cannot create edge for deactivated entity (EntityNotActive)
  - Cannot create edge for unregistered org (OrgNotRegistered)
  - Cannot create edge for deactivated org (OrgNotActive — deactivate in AuditLedger first)
  - Cannot create duplicate edgeId (EdgeAlreadyExists)
  - getEdgesForEntity includes the new edge
  - getEdgesForOrg includes the new edge
  - getEntitiesForOrg includes the entity
  - getOrgsForEntity includes the org
  - Unauthorized cannot create edges

describe("Deduplication")
  - Same entity linked to same org via two different relationship types (BoardMember AND KeyEmployee) with different edgeIds
  - getEntitiesForOrg returns the entityId only ONCE (not duplicated)
  - getOrgsForEntity returns the org only ONCE
  - But getEdgesForOrg returns BOTH edges
  - And getEdgesForEntity returns BOTH edges

describe("Cross-Organizational Queries — The Core Value")
  - Setup: John Reeves (Person) linked to orgA as BoardMember AND linked to orgB as BoardMember
  - getOrgsForEntity(personEntityId) returns [orgA, orgB] — "John Reeves serves on both boards"
  - Setup: Reeves & Associates (Vendor) linked to orgA as VendorPayee AND linked to orgB as VendorPayee
  - getOrgsForEntity(vendorEntityId) returns [orgA, orgB] — "This vendor works with both orgs"
  - getSharedEntities(orgA, orgB) returns both entityIds — "These orgs share a board member AND a vendor"
  - getSharedEntities(orgA, orgC) returns [] — orgC has no shared entities with orgA
  - getSharedEntities(orgA, orgA) returns all entities for orgA (self-comparison edge case)

describe("Fraud Pattern Scenario")
  - Full scenario: John Reeves serves on boards of orgA, orgB, and orgC. Reeves & Associates LLC receives payments from orgA and orgB. All three orgs share address 1847 NW Flanders St.
  - getOrgsForEntity(personId) returns [orgA, orgB, orgC]
  - getOrgsForEntity(vendorId) returns [orgA, orgB]
  - getOrgsForEntity(addressId) returns [orgA, orgB, orgC]
  - getSharedEntities(orgA, orgB) returns [personId, vendorId, addressId] — three shared entities, strong fraud signal
  - getSharedEntities(orgB, orgC) returns [personId, addressId] — two shared entities
  - getSharedEntities(orgA, orgC) returns [personId, addressId]
  - getOrgGraphSummary(orgA) returns correct counts

describe("Edge Deactivation")
  - System relay can deactivate an edge
  - After deactivation: endDate > 0, status = Inactive
  - Emits EdgeDeactivated
  - Cannot deactivate an already-inactive edge (EdgeAlreadyInactive)
  - Edge data still readable (history is permanent)
  - Edge still appears in getEdgesForEntity and getEdgesForOrg (not removed from arrays)
  - Entity and org still appear in cross-org queries (the historical connection matters)
  - getOrgGraphSummary shows reduced activeEdges count but same totalEdges

describe("Entity Deactivation")
  - Admin can deactivate an entity
  - Emits EntityDeactivated
  - isEntityActive returns false
  - Associated edges are NOT automatically deactivated
  - Cannot create new edges for deactivated entity (EntityNotActive)
  - Entity data still readable
  - Non-admin cannot deactivate

describe("Cross-Contract Integration")
  - Deactivating org in AuditLedger prevents new edge creation for that org
  - Existing edges for deactivated org are still queryable

describe("Edge Cases")
  - Entity with no edges: getEdgesForEntity returns empty array
  - Org with no edges: getEdgesForOrg returns empty array, getEntitiesForOrg returns empty array
  - getSharedEntities with one empty org: returns empty array
  - Multiple relationship types between same entity and same org all work independently
  - getEntity/getEdge for nonexistent IDs: verify behavior (returns default struct with zero values — or add explicit revert if preferred)

Use same conventions as prior tests: loadFixture, descriptive names, revertedWithCustomError, emit().withArgs().
```

---

## Prompt 5: Deploy Script

```
Write scripts/deploy-entity-graph.ts using TypeScript.

It should:
- Import { ethers, upgrades } from "hardhat"
- Read AUDIT_LEDGER_ADDRESS from environment
- Deploy EntityGraph through UUPS proxy: upgrades.deployProxy(factory, [auditLedgerAddress], { initializer: 'initialize', kind: 'uups' })
- Grant SYSTEM_ROLE to process.env.RELAY_ADDRESS
- Retrieve implementation address via upgrades.erc1967.getImplementationAddress()
- Log proxy address, implementation address, and linked AuditLedger address
- Throw if AUDIT_LEDGER_ADDRESS or RELAY_ADDRESS not set

Also create scripts/demo-entity-graph.ts that demonstrates the cross-organizational detection capability:

IMPORTANT: This script assumes "lighthouse-academies" is already registered in AuditLedger (from the AuditLedger demo script). It also needs two additional orgs. Register them explicitly at the start:
- Register orgB with name "northwest-community-health" at a second signer address
- Register orgC with name "pacific-youth-services" at a third signer address

Step 1 — Create entities (as system relay):
- John Reeves (Person), label "John Reeves", identityHash from "john-reeves-1965-03-15"
- Reeves & Associates LLC (Vendor), label "Reeves & Associates LLC"
- 1847 NW Flanders St (Address), label "1847 NW Flanders St, Portland OR"
- Log: "Created 3 entities: 1 person, 1 vendor, 1 address"

Step 2 — Create relationship edges:
- John Reeves → lighthouse-academies as BoardMember
- John Reeves → northwest-community-health as BoardMember
- Reeves & Associates → lighthouse-academies as VendorPayee
- Reeves & Associates → northwest-community-health as VendorPayee
- 1847 NW Flanders → lighthouse-academies as RegisteredAddress
- 1847 NW Flanders → northwest-community-health as RegisteredAddress
- Log each: "Linked {entity label} to {org name} as {relationship type}"

Step 3 — Cross-organizational queries:
- getOrgsForEntity(John Reeves) → log "John Reeves serves on {count} organization boards"
- getOrgsForEntity(Reeves & Associates) → log "Reeves & Associates receives payments from {count} organizations"
- getSharedEntities(orgA, orgB) → log "lighthouse-academies and northwest-community-health share {count} entities"
- Log each shared entity's label
- getOrgGraphSummary for lighthouse-academies

Step 4 — Narrative conclusion:
- Log: "FRAUD SIGNAL: Board member John Reeves governs both organizations and controls Reeves & Associates LLC, which receives payments from both. All entities share the same registered address."

This demo is the "aha moment" for the investigator persona. The graph makes a fraud network visible in one query.

// Usage: npx hardhat run scripts/demo-entity-graph.ts --network tallyview-testnet
```

---

## Prompt 6: Review Pass

```
Review EntityGraph contract, interface, TallyviewTypes additions, tests, and deploy scripts. Same criteria as prior reviews:

1. CORRECTNESS:
   - Does the deduplication logic work correctly? When entity X is linked to org Y via two different edge types, getEntitiesForOrg(Y) should return X once, not twice. Verify the mapping(bytes32 => mapping(address => bool)) guard works.
   - Does getOrgsForEntity return correct results after multiple edges are created for the same entity across different orgs?
   - Does getSharedEntities use the nested loop correctly? Confirm it's a view function. Confirm no Solidity memory mapping attempts (not supported). Two-pass pattern: count then allocate.
   - Does createEdge check BOTH entity active AND org active? An inactive entity should not gain new relationships. An inactive org should not gain new relationships.
   - Can the same edgeId be reused after deactivation? No — deactivation doesn't delete the edge. Confirm the existence check prevents reuse.
   - Does deactivateEdge revert if the edge is already inactive? (EdgeAlreadyInactive) This prevents overwriting the original endDate timestamp.
   - Does deactivateEntity prevent new edge creation for that entity? Confirm.
   - Label validation: bytes(label).length, not string length. Max 100 characters. Empty reverts.

2. ELEGANCE:
   - Is the deduplication logic clean? The bool mapping approach is straightforward and readable.
   - Four index arrays (edges per entity, edges per org, entities per org, orgs per entity) is a lot of storage. Confirm each serves a distinct query need and none are redundant.
   - Is getSharedEntities implemented as a clean nested loop with two-pass allocation?
   - MAX_LABEL_LENGTH as named constant used consistently.

3. AVALANCHE-SPECIFIC:
   - Same TxAllowList consideration as prior contracts
   - EntityGraph queries with sub-second finality means the investigator dashboard can show real-time relationship maps. Worth noting in NatSpec.

4. CROSS-CONTRACT:
   - AuditLedger reference for org validation only (both registered AND active). EntityGraph doesn't write to AuditLedger.
   - No imports of IComplianceEngine or IAnomalyRegistry. EntityGraph is a standalone data layer.
   - No circular dependencies.

5. UPGRADEABILITY: __gap, multiple index arrays and deduplication mappings safe across upgrades, storage layout clean.

6. NATSPEC: Would a judge understand: (a) this is the cross-organizational relationship layer, (b) the "shared entities" query is what makes fraud patterns visible, (c) entities are privacy-preserving (hashed identities, labels for convenience), (d) this is a data layer, not a detection layer?

7. TEST COVERAGE: The fraud pattern scenario test is the most important. It proves the contract can answer "what do these organizations have in common?" Also verify: deduplication, edge deactivation preserving endDate, entity deactivation preventing new edges, label validation.

Suggest specific improvements with diffs.
```

---

## Notes

**Add to Cursor context for every EntityGraph prompt:**
- This prompt guide
- The AuditLedger prompt guide (EntityGraph references AuditLedger for org validation)
- The Tallyview Avalanche L1 strategy document
- All AuditLedger source files (contract, interface, types)
- All EntityGraph files generated by previous prompts
- ComplianceEngine and AnomalyRegistry source files are helpful for architecture context but not required — EntityGraph doesn't depend on them

**Key design principle: Data layer, not detection layer.** EntityGraph stores relationships. The SaaS AI layer detects patterns from those relationships and writes findings to AnomalyRegistry. This separation means detection logic can evolve without contract upgrades.

**Key query: getSharedEntities.** This is what makes EntityGraph valuable for the competition. It answers "what do two organizations have in common?" — the query that powers conflict-of-interest detection across the network. The demo script should make this the climactic moment.

**Privacy consideration:** Entity labels contain names and addresses — human-readable for dashboard convenience but potentially sensitive. The identityHash field provides the privacy-preserving alternative. For the competition, labels make the demo compelling. For production, a future upgrade could introduce label encryption or redaction.

**After EntityGraph:** EvidenceVault is the final contract — investigation evidence with chain-of-custody. It references AnomalyRegistry for escalated findings and EntityGraph for relationship evidence.
