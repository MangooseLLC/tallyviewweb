import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AuditLedger, EntityGraph } from "../typechain-types";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));

const TEST_EIN_HASH = ethers.solidityPackedKeccak256(["string"], ["12-3456789"]);

// Entity IDs
const PERSON_ENTITY_ID = ethers.keccak256(ethers.toUtf8Bytes("person-john-reeves"));
const VENDOR_ENTITY_ID = ethers.keccak256(ethers.toUtf8Bytes("vendor-reeves-associates"));
const ADDRESS_ENTITY_ID = ethers.keccak256(ethers.toUtf8Bytes("addr-1847-nw-flanders"));

// Identity hashes
const PERSON_IDENTITY_HASH = ethers.keccak256(ethers.toUtf8Bytes("john-reeves-1965-03-15"));
const VENDOR_IDENTITY_HASH = ethers.keccak256(ethers.toUtf8Bytes("reeves-associates-llc-47-1234567"));
const ADDRESS_IDENTITY_HASH = ethers.keccak256(ethers.toUtf8Bytes("1847-nw-flanders-st-portland-or-97209"));

// Edge IDs
const EDGE_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-orgA-board"));
const EDGE_ID_2 = ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-orgB-board"));
const EDGE_ID_3 = ethers.keccak256(ethers.toUtf8Bytes("edge-vendor-orgA-payee"));
const EDGE_ID_4 = ethers.keccak256(ethers.toUtf8Bytes("edge-vendor-orgB-payee"));
const EDGE_ID_5 = ethers.keccak256(ethers.toUtf8Bytes("edge-addr-orgA-registered"));
const EDGE_ID_6 = ethers.keccak256(ethers.toUtf8Bytes("edge-addr-orgB-registered"));

const EVIDENCE_HASH = ethers.keccak256(ethers.toUtf8Bytes("evidence-package-001"));
const START_DATE = 1704067200; // 2024-01-01T00:00:00Z

// Enum indices matching TallyviewTypes
const EntityType = { Person: 0, Vendor: 1, Address: 2 };
const RelationshipType = {
  BoardMember: 0, Executive: 1, KeyEmployee: 2, VendorPayee: 3,
  RegisteredAddress: 4, MailingAddress: 5, RelatedParty: 6, Custom: 7,
};
const EdgeStatus = { Active: 0, Inactive: 1 };

// Labels
const PERSON_LABEL = "John Reeves";
const VENDOR_LABEL = "Reeves & Associates LLC";
const ADDRESS_LABEL = "1847 NW Flanders St, Portland OR";

// ---------------------------------------------------------------------------
//  Fixture
// ---------------------------------------------------------------------------

async function deployFixture() {
  const [admin, systemRelay, orgA, orgB, orgC, unauthorized] =
    await ethers.getSigners();

  // Deploy AuditLedger
  const AuditLedgerFactory = await ethers.getContractFactory("AuditLedger");
  const alProxy = await upgrades.deployProxy(AuditLedgerFactory, [false], {
    initializer: "initialize",
    kind: "uups",
  });
  const auditLedger = (await alProxy.waitForDeployment()) as unknown as AuditLedger;
  await auditLedger.grantRole(SYSTEM_ROLE, systemRelay.address);

  // Register three orgs
  await auditLedger.registerOrganization(orgA.address, "org-alpha", TEST_EIN_HASH);
  await auditLedger.registerOrganization(orgB.address, "org-beta", TEST_EIN_HASH);
  await auditLedger.registerOrganization(orgC.address, "org-gamma", TEST_EIN_HASH);

  // Deploy EntityGraph
  const EGFactory = await ethers.getContractFactory("EntityGraph");
  const egProxy = await upgrades.deployProxy(
    EGFactory,
    [await auditLedger.getAddress()],
    { initializer: "initialize", kind: "uups" },
  );
  const entityGraph = (await egProxy.waitForDeployment()) as unknown as EntityGraph;
  await entityGraph.grantRole(SYSTEM_ROLE, systemRelay.address);

  return { entityGraph, auditLedger, admin, systemRelay, orgA, orgB, orgC, unauthorized };
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

async function createTestPerson(eg: EntityGraph): Promise<string> {
  await eg.createEntity(PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, PERSON_LABEL);
  return PERSON_ENTITY_ID;
}

async function createTestVendor(eg: EntityGraph): Promise<string> {
  await eg.createEntity(VENDOR_ENTITY_ID, EntityType.Vendor, VENDOR_IDENTITY_HASH, VENDOR_LABEL);
  return VENDOR_ENTITY_ID;
}

async function createTestAddress(eg: EntityGraph): Promise<string> {
  await eg.createEntity(ADDRESS_ENTITY_ID, EntityType.Address, ADDRESS_IDENTITY_HASH, ADDRESS_LABEL);
  return ADDRESS_ENTITY_ID;
}

async function linkEntityToOrg(
  eg: EntityGraph,
  entityId: string,
  orgAddress: string,
  edgeId: string,
  relationshipType: number,
) {
  await eg.createEdge(edgeId, entityId, orgAddress, relationshipType, START_DATE, EVIDENCE_HASH);
}

// ===========================================================================
//  Tests
// ===========================================================================

describe("EntityGraph", function () {
  // -----------------------------------------------------------------------
  //  Deployment & Initialization
  // -----------------------------------------------------------------------

  describe("Deployment & Initialization", function () {
    it("deploys correctly with AuditLedger reference", async function () {
      const { entityGraph, auditLedger } = await loadFixture(deployFixture);
      expect(await entityGraph.getAddress()).to.be.properAddress;
      expect(await entityGraph.auditLedger()).to.equal(await auditLedger.getAddress());
    });

    it("admin has DEFAULT_ADMIN_ROLE and ADMIN_ROLE", async function () {
      const { entityGraph, admin } = await loadFixture(deployFixture);
      expect(await entityGraph.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
      expect(await entityGraph.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("system relay has SYSTEM_ROLE", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      expect(await entityGraph.hasRole(SYSTEM_ROLE, systemRelay.address)).to.be.true;
    });

    it("cannot initialize twice", async function () {
      const { entityGraph, auditLedger } = await loadFixture(deployFixture);
      await expect(
        entityGraph.initialize(await auditLedger.getAddress()),
      ).to.be.revertedWithCustomError(entityGraph, "InvalidInitialization");
    });

    it("cannot initialize with zero address", async function () {
      const EGFactory = await ethers.getContractFactory("EntityGraph");
      await expect(
        upgrades.deployProxy(EGFactory, [ethers.ZeroAddress], {
          initializer: "initialize",
          kind: "uups",
        }),
      ).to.be.revertedWithCustomError(EGFactory, "ZeroAddress");
    });
  });

  // -----------------------------------------------------------------------
  //  Entity Creation
  // -----------------------------------------------------------------------

  describe("Entity Creation", function () {
    it("system relay can create a Person entity", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);

      await expect(
        relay.createEntity(PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, PERSON_LABEL),
      ).to.not.be.reverted;
    });

    it("admin can create a Vendor entity", async function () {
      const { entityGraph } = await loadFixture(deployFixture);

      await expect(
        entityGraph.createEntity(VENDOR_ENTITY_ID, EntityType.Vendor, VENDOR_IDENTITY_HASH, VENDOR_LABEL),
      ).to.not.be.reverted;
    });

    it("can create an Address entity", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);

      await expect(
        entityGraph.connect(systemRelay).createEntity(
          ADDRESS_ENTITY_ID, EntityType.Address, ADDRESS_IDENTITY_HASH, ADDRESS_LABEL,
        ),
      ).to.not.be.reverted;
    });

    it("cannot create duplicate entityId (EntityAlreadyExists)", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      await expect(
        relay.createEntity(PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, PERSON_LABEL),
      ).to.be.revertedWithCustomError(entityGraph, "EntityAlreadyExists");
    });

    it("cannot create with empty label (EmptyLabel)", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);

      await expect(
        entityGraph.connect(systemRelay).createEntity(
          PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, "",
        ),
      ).to.be.revertedWithCustomError(entityGraph, "EmptyLabel");
    });

    it("cannot create with label over 100 bytes (LabelTooLong)", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      const longLabel = "A".repeat(101);

      await expect(
        entityGraph.connect(systemRelay).createEntity(
          PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, longLabel,
        ),
      ).to.be.revertedWithCustomError(entityGraph, "LabelTooLong");
    });

    it("label of exactly 100 bytes succeeds", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      const maxLabel = "A".repeat(100);

      await expect(
        entityGraph.connect(systemRelay).createEntity(
          PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, maxLabel,
        ),
      ).to.not.be.reverted;
    });

    it("emits EntityCreated with correct args (no label in event)", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);

      await expect(
        entityGraph.connect(systemRelay).createEntity(
          PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, PERSON_LABEL,
        ),
      )
        .to.emit(entityGraph, "EntityCreated")
        .withArgs(PERSON_ENTITY_ID, EntityType.Person);
    });

    it("getEntity returns correct fields", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      const entity = await entityGraph.getEntity(PERSON_ENTITY_ID);
      expect(entity.entityType).to.equal(EntityType.Person);
      expect(entity.identityHash).to.equal(PERSON_IDENTITY_HASH);
      expect(entity.label).to.equal(PERSON_LABEL);
      expect(entity.createdAt).to.be.gt(0);
      expect(entity.active).to.be.true;
    });

    it("isEntityActive returns true after creation", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      expect(await entityGraph.isEntityActive(PERSON_ENTITY_ID)).to.be.true;
    });

    it("cannot create entity with zero entityId", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);

      await expect(
        entityGraph.connect(systemRelay).createEntity(
          ethers.ZeroHash, EntityType.Person, PERSON_IDENTITY_HASH, PERSON_LABEL,
        ),
      ).to.be.revertedWithCustomError(entityGraph, "EntityNotFound");
    });

    it("unauthorized cannot create entities", async function () {
      const { entityGraph, unauthorized } = await loadFixture(deployFixture);

      await expect(
        entityGraph.connect(unauthorized).createEntity(
          PERSON_ENTITY_ID, EntityType.Person, PERSON_IDENTITY_HASH, PERSON_LABEL,
        ),
      ).to.be.revertedWithCustomError(entityGraph, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Edge Creation
  // -----------------------------------------------------------------------

  describe("Edge Creation", function () {
    it("system relay can create an edge linking an entity to an org", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      ).to.not.be.reverted;
    });

    it("edge stored correctly with all fields", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      const edge = await entityGraph.getEdge(EDGE_ID_1);
      expect(edge.entityId).to.equal(PERSON_ENTITY_ID);
      expect(edge.org).to.equal(orgA.address);
      expect(edge.relationshipType).to.equal(RelationshipType.BoardMember);
      expect(edge.startDate).to.equal(START_DATE);
      expect(edge.endDate).to.equal(0);
      expect(edge.status).to.equal(EdgeStatus.Active);
      expect(edge.evidenceHash).to.equal(EVIDENCE_HASH);
    });

    it("emits EdgeCreated with correct args", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      )
        .to.emit(entityGraph, "EdgeCreated")
        .withArgs(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember);
    });

    it("cannot create edge for nonexistent entity (EntityNotFound)", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const fakeEntityId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent-entity"));

      await expect(
        entityGraph.connect(systemRelay).createEdge(
          EDGE_ID_1, fakeEntityId, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH,
        ),
      ).to.be.revertedWithCustomError(entityGraph, "EntityNotFound");
    });

    it("cannot create edge for deactivated entity (EntityNotActive)", async function () {
      const { entityGraph, systemRelay, orgA, admin } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await entityGraph.connect(admin).deactivateEntity(PERSON_ENTITY_ID);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      ).to.be.revertedWithCustomError(entityGraph, "EntityNotActive");
    });

    it("cannot create edge for unregistered org (OrgNotRegistered)", async function () {
      const { entityGraph, systemRelay, unauthorized } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, unauthorized.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      ).to.be.revertedWithCustomError(entityGraph, "OrgNotRegistered");
    });

    it("cannot create edge for deactivated org (OrgNotActive)", async function () {
      const { entityGraph, auditLedger, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await auditLedger.deactivateOrganization(orgA.address);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      ).to.be.revertedWithCustomError(entityGraph, "OrgNotActive");
    });

    it("cannot create duplicate edgeId (EdgeAlreadyExists)", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.KeyEmployee, START_DATE, EVIDENCE_HASH),
      ).to.be.revertedWithCustomError(entityGraph, "EdgeAlreadyExists");
    });

    it("getEdgesForEntity includes the new edge", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      const edges = await entityGraph.getEdgesForEntity(PERSON_ENTITY_ID);
      expect(edges).to.deep.equal([EDGE_ID_1]);
    });

    it("getEdgesForOrg includes the new edge", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      const edges = await entityGraph.getEdgesForOrg(orgA.address);
      expect(edges).to.deep.equal([EDGE_ID_1]);
    });

    it("getEntitiesForOrg includes the entity", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      const entities = await entityGraph.getEntitiesForOrg(orgA.address);
      expect(entities).to.deep.equal([PERSON_ENTITY_ID]);
    });

    it("getOrgsForEntity includes the org", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      const orgs = await entityGraph.getOrgsForEntity(PERSON_ENTITY_ID);
      expect(orgs).to.deep.equal([orgA.address]);
    });

    it("admin can create an edge", async function () {
      const { entityGraph, systemRelay, admin, orgA } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      await expect(
        entityGraph.connect(admin).createEdge(
          EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH,
        ),
      ).to.not.be.reverted;
    });

    it("cannot create edge with zero edgeId", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      await expect(
        relay.createEdge(ethers.ZeroHash, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      ).to.be.revertedWithCustomError(entityGraph, "EdgeNotFound");
    });

    it("unauthorized cannot create edges", async function () {
      const { entityGraph, systemRelay, unauthorized, orgA } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      await expect(
        entityGraph.connect(unauthorized).createEdge(
          EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH,
        ),
      ).to.be.revertedWithCustomError(entityGraph, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Deduplication
  // -----------------------------------------------------------------------

  describe("Deduplication", function () {
    it("same entity linked to same org via two relationship types — index arrays deduplicated, edge arrays not", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      const edgeKeyEmployee = ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-orgA-keyemp"));
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, edgeKeyEmployee, RelationshipType.KeyEmployee);

      // Entity appears only ONCE in org's entities
      const entities = await entityGraph.getEntitiesForOrg(orgA.address);
      expect(entities).to.deep.equal([PERSON_ENTITY_ID]);

      // Org appears only ONCE in entity's orgs
      const orgs = await entityGraph.getOrgsForEntity(PERSON_ENTITY_ID);
      expect(orgs).to.deep.equal([orgA.address]);

      // But BOTH edges appear in edge arrays
      const entityEdges = await entityGraph.getEdgesForEntity(PERSON_ENTITY_ID);
      expect(entityEdges).to.have.lengthOf(2);
      expect(entityEdges).to.include(EDGE_ID_1);
      expect(entityEdges).to.include(edgeKeyEmployee);

      const orgEdges = await entityGraph.getEdgesForOrg(orgA.address);
      expect(orgEdges).to.have.lengthOf(2);
      expect(orgEdges).to.include(EDGE_ID_1);
      expect(orgEdges).to.include(edgeKeyEmployee);
    });
  });

  // -----------------------------------------------------------------------
  //  Cross-Organizational Queries — The Core Value
  // -----------------------------------------------------------------------

  describe("Cross-Organizational Queries — The Core Value", function () {
    it("getOrgsForEntity returns multiple orgs when entity is linked across orgs", async function () {
      const { entityGraph, systemRelay, orgA, orgB } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgB.address, EDGE_ID_2, RelationshipType.BoardMember);

      const orgs = await entityGraph.getOrgsForEntity(PERSON_ENTITY_ID);
      expect(orgs).to.have.lengthOf(2);
      expect(orgs).to.include(orgA.address);
      expect(orgs).to.include(orgB.address);
    });

    it("vendor entity linked to multiple orgs — getOrgsForEntity returns both", async function () {
      const { entityGraph, systemRelay, orgA, orgB } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestVendor(relay);

      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgA.address, EDGE_ID_3, RelationshipType.VendorPayee);
      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgB.address, EDGE_ID_4, RelationshipType.VendorPayee);

      const orgs = await entityGraph.getOrgsForEntity(VENDOR_ENTITY_ID);
      expect(orgs).to.have.lengthOf(2);
      expect(orgs).to.include(orgA.address);
      expect(orgs).to.include(orgB.address);
    });

    it("getSharedEntities returns entities shared between two orgs", async function () {
      const { entityGraph, systemRelay, orgA, orgB } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);

      await createTestPerson(relay);
      await createTestVendor(relay);

      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgB.address, EDGE_ID_2, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgA.address, EDGE_ID_3, RelationshipType.VendorPayee);
      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgB.address, EDGE_ID_4, RelationshipType.VendorPayee);

      const shared = await entityGraph.getSharedEntities(orgA.address, orgB.address);
      expect(shared).to.have.lengthOf(2);
      expect(shared).to.include(PERSON_ENTITY_ID);
      expect(shared).to.include(VENDOR_ENTITY_ID);
    });

    it("getSharedEntities returns empty when orgs share no entities", async function () {
      const { entityGraph, systemRelay, orgA, orgC } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      const shared = await entityGraph.getSharedEntities(orgA.address, orgC.address);
      expect(shared).to.deep.equal([]);
    });

    it("getSharedEntities self-comparison returns all entities for the org", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);

      await createTestPerson(relay);
      await createTestVendor(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgA.address, EDGE_ID_3, RelationshipType.VendorPayee);

      const shared = await entityGraph.getSharedEntities(orgA.address, orgA.address);
      expect(shared).to.have.lengthOf(2);
      expect(shared).to.include(PERSON_ENTITY_ID);
      expect(shared).to.include(VENDOR_ENTITY_ID);
    });
  });

  // -----------------------------------------------------------------------
  //  Fraud Pattern Scenario
  // -----------------------------------------------------------------------

  describe("Fraud Pattern Scenario", function () {
    async function setupFraudScenario() {
      const fixture = await loadFixture(deployFixture);
      const { entityGraph, systemRelay, orgA, orgB, orgC } = fixture;
      const relay = entityGraph.connect(systemRelay);

      await createTestPerson(relay);
      await createTestVendor(relay);
      await createTestAddress(relay);

      // John Reeves → boards of orgA, orgB, orgC
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgB.address, EDGE_ID_2, RelationshipType.BoardMember);
      const edgeReevesOrgC = ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-orgC-board"));
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgC.address, edgeReevesOrgC, RelationshipType.BoardMember);

      // Reeves & Associates → vendor for orgA, orgB
      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgA.address, EDGE_ID_3, RelationshipType.VendorPayee);
      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgB.address, EDGE_ID_4, RelationshipType.VendorPayee);

      // 1847 NW Flanders → registered address for orgA, orgB, orgC
      await linkEntityToOrg(relay, ADDRESS_ENTITY_ID, orgA.address, EDGE_ID_5, RelationshipType.RegisteredAddress);
      await linkEntityToOrg(relay, ADDRESS_ENTITY_ID, orgB.address, EDGE_ID_6, RelationshipType.RegisteredAddress);
      const edgeAddrOrgC = ethers.keccak256(ethers.toUtf8Bytes("edge-addr-orgC-registered"));
      await linkEntityToOrg(relay, ADDRESS_ENTITY_ID, orgC.address, edgeAddrOrgC, RelationshipType.RegisteredAddress);

      return fixture;
    }

    it("getOrgsForEntity(person) returns all three orgs", async function () {
      const { entityGraph, orgA, orgB, orgC } = await loadFixture(setupFraudScenario);

      const orgs = await entityGraph.getOrgsForEntity(PERSON_ENTITY_ID);
      expect(orgs).to.have.lengthOf(3);
      expect(orgs).to.include(orgA.address);
      expect(orgs).to.include(orgB.address);
      expect(orgs).to.include(orgC.address);
    });

    it("getOrgsForEntity(vendor) returns orgA and orgB", async function () {
      const { entityGraph, orgA, orgB } = await loadFixture(setupFraudScenario);

      const orgs = await entityGraph.getOrgsForEntity(VENDOR_ENTITY_ID);
      expect(orgs).to.have.lengthOf(2);
      expect(orgs).to.include(orgA.address);
      expect(orgs).to.include(orgB.address);
    });

    it("getOrgsForEntity(address) returns all three orgs", async function () {
      const { entityGraph, orgA, orgB, orgC } = await loadFixture(setupFraudScenario);

      const orgs = await entityGraph.getOrgsForEntity(ADDRESS_ENTITY_ID);
      expect(orgs).to.have.lengthOf(3);
      expect(orgs).to.include(orgA.address);
      expect(orgs).to.include(orgB.address);
      expect(orgs).to.include(orgC.address);
    });

    it("getSharedEntities(orgA, orgB) returns 3 shared entities — strong fraud signal", async function () {
      const { entityGraph, orgA, orgB } = await loadFixture(setupFraudScenario);

      const shared = await entityGraph.getSharedEntities(orgA.address, orgB.address);
      expect(shared).to.have.lengthOf(3);
      expect(shared).to.include(PERSON_ENTITY_ID);
      expect(shared).to.include(VENDOR_ENTITY_ID);
      expect(shared).to.include(ADDRESS_ENTITY_ID);
    });

    it("getSharedEntities(orgB, orgC) returns person and address (2 shared)", async function () {
      const { entityGraph, orgB, orgC } = await loadFixture(setupFraudScenario);

      const shared = await entityGraph.getSharedEntities(orgB.address, orgC.address);
      expect(shared).to.have.lengthOf(2);
      expect(shared).to.include(PERSON_ENTITY_ID);
      expect(shared).to.include(ADDRESS_ENTITY_ID);
    });

    it("getSharedEntities(orgA, orgC) returns person and address (2 shared)", async function () {
      const { entityGraph, orgA, orgC } = await loadFixture(setupFraudScenario);

      const shared = await entityGraph.getSharedEntities(orgA.address, orgC.address);
      expect(shared).to.have.lengthOf(2);
      expect(shared).to.include(PERSON_ENTITY_ID);
      expect(shared).to.include(ADDRESS_ENTITY_ID);
    });

    it("getOrgGraphSummary(orgA) returns correct counts", async function () {
      const { entityGraph, orgA } = await loadFixture(setupFraudScenario);

      const [totalEdges, activeEdges, uniqueEntities] = await entityGraph.getOrgGraphSummary(orgA.address);
      expect(totalEdges).to.equal(3);  // person + vendor + address edges
      expect(activeEdges).to.equal(3); // all active
      expect(uniqueEntities).to.equal(3);
    });
  });

  // -----------------------------------------------------------------------
  //  Edge Deactivation
  // -----------------------------------------------------------------------

  describe("Edge Deactivation", function () {
    it("system relay can deactivate an edge", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      await expect(relay.deactivateEdge(EDGE_ID_1)).to.not.be.reverted;
    });

    it("after deactivation: endDate > 0, status = Inactive", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await relay.deactivateEdge(EDGE_ID_1);

      const edge = await entityGraph.getEdge(EDGE_ID_1);
      expect(edge.endDate).to.be.gt(0);
      expect(edge.status).to.equal(EdgeStatus.Inactive);
    });

    it("emits EdgeDeactivated", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      await expect(relay.deactivateEdge(EDGE_ID_1))
        .to.emit(entityGraph, "EdgeDeactivated")
        .withArgs(EDGE_ID_1);
    });

    it("cannot deactivate an already-inactive edge (EdgeAlreadyInactive)", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await relay.deactivateEdge(EDGE_ID_1);

      await expect(
        relay.deactivateEdge(EDGE_ID_1),
      ).to.be.revertedWithCustomError(entityGraph, "EdgeAlreadyInactive");
    });

    it("edge data still readable after deactivation (history is permanent)", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await relay.deactivateEdge(EDGE_ID_1);

      const edge = await entityGraph.getEdge(EDGE_ID_1);
      expect(edge.entityId).to.equal(PERSON_ENTITY_ID);
      expect(edge.org).to.equal(orgA.address);
      expect(edge.relationshipType).to.equal(RelationshipType.BoardMember);
      expect(edge.evidenceHash).to.equal(EVIDENCE_HASH);
    });

    it("edge still appears in getEdgesForEntity and getEdgesForOrg (not removed)", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await relay.deactivateEdge(EDGE_ID_1);

      expect(await entityGraph.getEdgesForEntity(PERSON_ENTITY_ID)).to.deep.equal([EDGE_ID_1]);
      expect(await entityGraph.getEdgesForOrg(orgA.address)).to.deep.equal([EDGE_ID_1]);
    });

    it("entity and org still appear in cross-org queries after edge deactivation", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await relay.deactivateEdge(EDGE_ID_1);

      expect(await entityGraph.getEntitiesForOrg(orgA.address)).to.deep.equal([PERSON_ENTITY_ID]);
      expect(await entityGraph.getOrgsForEntity(PERSON_ENTITY_ID)).to.deep.equal([orgA.address]);
    });

    it("getOrgGraphSummary shows reduced activeEdges but same totalEdges", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await createTestVendor(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, VENDOR_ENTITY_ID, orgA.address, EDGE_ID_3, RelationshipType.VendorPayee);

      // Before deactivation
      let [total, active, unique] = await entityGraph.getOrgGraphSummary(orgA.address);
      expect(total).to.equal(2);
      expect(active).to.equal(2);
      expect(unique).to.equal(2);

      // Deactivate one edge
      await relay.deactivateEdge(EDGE_ID_1);

      [total, active, unique] = await entityGraph.getOrgGraphSummary(orgA.address);
      expect(total).to.equal(2);  // unchanged
      expect(active).to.equal(1); // reduced
      expect(unique).to.equal(2); // unchanged
    });

    it("admin can deactivate an edge", async function () {
      const { entityGraph, systemRelay, admin, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      await expect(
        entityGraph.connect(admin).deactivateEdge(EDGE_ID_1),
      ).to.not.be.reverted;
    });

    it("unauthorized cannot deactivate edges", async function () {
      const { entityGraph, systemRelay, unauthorized, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      await expect(
        entityGraph.connect(unauthorized).deactivateEdge(EDGE_ID_1),
      ).to.be.revertedWithCustomError(entityGraph, "Unauthorized");
    });

    it("isEdgeActive returns false after deactivation", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      expect(await entityGraph.isEdgeActive(EDGE_ID_1)).to.be.true;
      await relay.deactivateEdge(EDGE_ID_1);
      expect(await entityGraph.isEdgeActive(EDGE_ID_1)).to.be.false;
    });
  });

  // -----------------------------------------------------------------------
  //  Entity Deactivation
  // -----------------------------------------------------------------------

  describe("Entity Deactivation", function () {
    it("admin can deactivate an entity", async function () {
      const { entityGraph, systemRelay, admin } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      await expect(
        entityGraph.connect(admin).deactivateEntity(PERSON_ENTITY_ID),
      ).to.not.be.reverted;
    });

    it("emits EntityDeactivated", async function () {
      const { entityGraph, systemRelay, admin } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      await expect(entityGraph.connect(admin).deactivateEntity(PERSON_ENTITY_ID))
        .to.emit(entityGraph, "EntityDeactivated")
        .withArgs(PERSON_ENTITY_ID);
    });

    it("isEntityActive returns false after deactivation", async function () {
      const { entityGraph, systemRelay, admin } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      expect(await entityGraph.isEntityActive(PERSON_ENTITY_ID)).to.be.true;
      await entityGraph.connect(admin).deactivateEntity(PERSON_ENTITY_ID);
      expect(await entityGraph.isEntityActive(PERSON_ENTITY_ID)).to.be.false;
    });

    it("associated edges are NOT automatically deactivated", async function () {
      const { entityGraph, systemRelay, admin, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      await entityGraph.connect(admin).deactivateEntity(PERSON_ENTITY_ID);

      const edge = await entityGraph.getEdge(EDGE_ID_1);
      expect(edge.status).to.equal(EdgeStatus.Active);
      expect(await entityGraph.isEdgeActive(EDGE_ID_1)).to.be.true;
    });

    it("cannot create new edges for deactivated entity (EntityNotActive)", async function () {
      const { entityGraph, systemRelay, admin, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await entityGraph.connect(admin).deactivateEntity(PERSON_ENTITY_ID);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      ).to.be.revertedWithCustomError(entityGraph, "EntityNotActive");
    });

    it("entity data still readable after deactivation", async function () {
      const { entityGraph, systemRelay, admin } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));
      await entityGraph.connect(admin).deactivateEntity(PERSON_ENTITY_ID);

      const entity = await entityGraph.getEntity(PERSON_ENTITY_ID);
      expect(entity.entityType).to.equal(EntityType.Person);
      expect(entity.identityHash).to.equal(PERSON_IDENTITY_HASH);
      expect(entity.label).to.equal(PERSON_LABEL);
      expect(entity.active).to.be.false;
    });

    it("non-admin (system relay) cannot deactivate entities", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      await expect(
        entityGraph.connect(systemRelay).deactivateEntity(PERSON_ENTITY_ID),
      ).to.be.revertedWithCustomError(entityGraph, "Unauthorized");
    });

    it("unauthorized cannot deactivate entities", async function () {
      const { entityGraph, systemRelay, unauthorized } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      await expect(
        entityGraph.connect(unauthorized).deactivateEntity(PERSON_ENTITY_ID),
      ).to.be.revertedWithCustomError(entityGraph, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Cross-Contract Integration
  // -----------------------------------------------------------------------

  describe("Cross-Contract Integration", function () {
    it("deactivating org in AuditLedger prevents new edge creation", async function () {
      const { entityGraph, auditLedger, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await auditLedger.deactivateOrganization(orgA.address);

      await expect(
        relay.createEdge(EDGE_ID_1, PERSON_ENTITY_ID, orgA.address, RelationshipType.BoardMember, START_DATE, EVIDENCE_HASH),
      ).to.be.revertedWithCustomError(entityGraph, "OrgNotActive");
    });

    it("existing edges for deactivated org are still queryable", async function () {
      const { entityGraph, auditLedger, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      await auditLedger.deactivateOrganization(orgA.address);

      const edge = await entityGraph.getEdge(EDGE_ID_1);
      expect(edge.entityId).to.equal(PERSON_ENTITY_ID);
      expect(edge.org).to.equal(orgA.address);

      const edges = await entityGraph.getEdgesForOrg(orgA.address);
      expect(edges).to.deep.equal([EDGE_ID_1]);

      const entities = await entityGraph.getEntitiesForOrg(orgA.address);
      expect(entities).to.deep.equal([PERSON_ENTITY_ID]);
    });
  });

  // -----------------------------------------------------------------------
  //  Edge Cases
  // -----------------------------------------------------------------------

  describe("Edge Cases", function () {
    it("entity with no edges: getEdgesForEntity returns empty array", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      await createTestPerson(entityGraph.connect(systemRelay));

      expect(await entityGraph.getEdgesForEntity(PERSON_ENTITY_ID)).to.deep.equal([]);
    });

    it("org with no edges: getEdgesForOrg and getEntitiesForOrg return empty arrays", async function () {
      const { entityGraph, orgC } = await loadFixture(deployFixture);

      expect(await entityGraph.getEdgesForOrg(orgC.address)).to.deep.equal([]);
      expect(await entityGraph.getEntitiesForOrg(orgC.address)).to.deep.equal([]);
    });

    it("getSharedEntities with one empty org returns empty array", async function () {
      const { entityGraph, systemRelay, orgA, orgC } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, EDGE_ID_1, RelationshipType.BoardMember);

      const shared = await entityGraph.getSharedEntities(orgA.address, orgC.address);
      expect(shared).to.deep.equal([]);
    });

    it("multiple relationship types between same entity and same org all work independently", async function () {
      const { entityGraph, systemRelay, orgA } = await loadFixture(deployFixture);
      const relay = entityGraph.connect(systemRelay);
      await createTestPerson(relay);

      const edgeBoard = ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-orgA-board-2"));
      const edgeKeyEmp = ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-orgA-keyemp-2"));
      const edgeExec = ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-orgA-exec"));

      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, edgeBoard, RelationshipType.BoardMember);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, edgeKeyEmp, RelationshipType.KeyEmployee);
      await linkEntityToOrg(relay, PERSON_ENTITY_ID, orgA.address, edgeExec, RelationshipType.Executive);

      // Three edges, one entity
      const edges = await entityGraph.getEdgesForOrg(orgA.address);
      expect(edges).to.have.lengthOf(3);

      const entities = await entityGraph.getEntitiesForOrg(orgA.address);
      expect(entities).to.have.lengthOf(1);

      // Each edge has correct relationship type
      expect((await entityGraph.getEdge(edgeBoard)).relationshipType).to.equal(RelationshipType.BoardMember);
      expect((await entityGraph.getEdge(edgeKeyEmp)).relationshipType).to.equal(RelationshipType.KeyEmployee);
      expect((await entityGraph.getEdge(edgeExec)).relationshipType).to.equal(RelationshipType.Executive);
    });

    it("getEntity for nonexistent ID returns default struct with zero values", async function () {
      const { entityGraph } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));

      const entity = await entityGraph.getEntity(fakeId);
      expect(entity.createdAt).to.equal(0);
      expect(entity.active).to.be.false;
      expect(entity.identityHash).to.equal(ethers.ZeroHash);
      expect(entity.label).to.equal("");
    });

    it("getEdge for nonexistent ID returns default struct with zero values", async function () {
      const { entityGraph } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));

      const edge = await entityGraph.getEdge(fakeId);
      expect(edge.entityId).to.equal(ethers.ZeroHash);
      expect(edge.org).to.equal(ethers.ZeroAddress);
      expect(edge.startDate).to.equal(0);
      expect(edge.endDate).to.equal(0);
      expect(edge.evidenceHash).to.equal(ethers.ZeroHash);
    });

    it("isEntityActive returns false for nonexistent entity", async function () {
      const { entityGraph } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));
      expect(await entityGraph.isEntityActive(fakeId)).to.be.false;
    });

    it("isEdgeActive returns false for nonexistent edge", async function () {
      const { entityGraph } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));
      expect(await entityGraph.isEdgeActive(fakeId)).to.be.false;
    });

    it("cannot deactivate nonexistent entity (EntityNotFound)", async function () {
      const { entityGraph, admin } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));

      await expect(
        entityGraph.connect(admin).deactivateEntity(fakeId),
      ).to.be.revertedWithCustomError(entityGraph, "EntityNotFound");
    });

    it("cannot deactivate nonexistent edge (EdgeNotFound)", async function () {
      const { entityGraph, systemRelay } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));

      await expect(
        entityGraph.connect(systemRelay).deactivateEdge(fakeId),
      ).to.be.revertedWithCustomError(entityGraph, "EdgeNotFound");
    });
  });
});
