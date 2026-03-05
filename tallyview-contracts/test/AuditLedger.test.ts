import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AuditLedger } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const TEST_ORG_NAME = "test-org";
const TEST_EIN_HASH = ethers.solidityPackedKeccak256(["string"], ["12-3456789"]);
const TEST_MERKLE_ROOT = ethers.solidityPackedKeccak256(["string"], ["test-financial-data"]);
const TEST_SCHEMA_HASH = ethers.solidityPackedKeccak256(["string"], ["schema-v1"]);

const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

const ZERO_ADDRESS = ethers.ZeroAddress;
const ZERO_BYTES32 = ethers.ZeroHash;

// ---------------------------------------------------------------------------
//  Fixture
// ---------------------------------------------------------------------------

async function deployFixture() {
  const [admin, systemRelay, orgSigner, anotherOrgSigner, unauthorized] =
    await ethers.getSigners();

  const AuditLedgerFactory = await ethers.getContractFactory("AuditLedger");
  const proxy = await upgrades.deployProxy(AuditLedgerFactory, [false], {
    initializer: "initialize",
    kind: "uups",
  });
  const auditLedger = (await proxy.waitForDeployment()) as unknown as AuditLedger;

  await auditLedger.grantRole(SYSTEM_ROLE, systemRelay.address);

  return { auditLedger, admin, systemRelay, orgSigner, anotherOrgSigner, unauthorized };
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

async function registerTestOrg(
  contract: AuditLedger,
  orgAddress: string,
  name: string = TEST_ORG_NAME,
) {
  await contract.registerOrganization(orgAddress, name, TEST_EIN_HASH);
}

function uniqueMerkleRoot(seed: string): string {
  return ethers.solidityPackedKeccak256(["string"], [seed]);
}

// ===========================================================================
//  Tests
// ===========================================================================

describe("AuditLedger", function () {
  // -----------------------------------------------------------------------
  //  Deployment & Initialization
  // -----------------------------------------------------------------------

  describe("Deployment & Initialization", function () {
    it("deploys and initializes correctly through proxy", async function () {
      const { auditLedger } = await loadFixture(deployFixture);
      expect(await auditLedger.getAddress()).to.be.properAddress;
    });

    it("admin has DEFAULT_ADMIN_ROLE", async function () {
      const { auditLedger, admin } = await loadFixture(deployFixture);
      expect(await auditLedger.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("admin has ADMIN_ROLE", async function () {
      const { auditLedger, admin } = await loadFixture(deployFixture);
      expect(await auditLedger.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("system relay has SYSTEM_ROLE", async function () {
      const { auditLedger, systemRelay } = await loadFixture(deployFixture);
      expect(await auditLedger.hasRole(SYSTEM_ROLE, systemRelay.address)).to.be.true;
    });

    it("cannot call initialize again", async function () {
      const { auditLedger } = await loadFixture(deployFixture);
      await expect(auditLedger.initialize(false)).to.be.revertedWithCustomError(
        auditLedger,
        "InvalidInitialization",
      );
    });

    it("isProvisionedOnSubnet returns true when avalanche mode is off", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      expect(await auditLedger.isProvisionedOnSubnet(orgSigner.address)).to.be.true;
    });
  });

  // -----------------------------------------------------------------------
  //  Organization Registration
  // -----------------------------------------------------------------------

  describe("Organization Registration", function () {
    it("admin can register an org with name and EIN hash", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      expect(await auditLedger.isOrganizationRegistered(orgSigner.address)).to.be.true;
    });

    it("non-admin cannot register", async function () {
      const { auditLedger, orgSigner, unauthorized } = await loadFixture(deployFixture);
      const unauth = auditLedger.connect(unauthorized);

      await expect(
        unauth.registerOrganization(orgSigner.address, TEST_ORG_NAME, TEST_EIN_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "AccessControlUnauthorizedAccount");
    });

    it("cannot register same address twice", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger.registerOrganization(orgSigner.address, "another-name", TEST_EIN_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "OrgAlreadyRegistered");
    });

    it("cannot register with a name already taken by another org", async function () {
      const { auditLedger, orgSigner, anotherOrgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address, "shared-name");

      await expect(
        auditLedger.registerOrganization(anotherOrgSigner.address, "shared-name", TEST_EIN_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "NameAlreadyTaken");
    });

    it("emits OrganizationRegistered event with correct args", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);

      await expect(
        auditLedger.registerOrganization(orgSigner.address, TEST_ORG_NAME, TEST_EIN_HASH),
      )
        .to.emit(auditLedger, "OrganizationRegistered")
        .withArgs(orgSigner.address, TEST_ORG_NAME);
    });

    it("isOrganizationRegistered returns true after registration, false before", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);

      expect(await auditLedger.isOrganizationRegistered(orgSigner.address)).to.be.false;
      await registerTestOrg(auditLedger, orgSigner.address);
      expect(await auditLedger.isOrganizationRegistered(orgSigner.address)).to.be.true;
    });

    it("isOrganizationActive returns true after registration", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      expect(await auditLedger.isOrganizationActive(orgSigner.address)).to.be.true;
    });

    it("getOrganization returns correct OrgRecord fields", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      const record = await auditLedger.getOrganization(orgSigner.address);
      expect(record.name).to.equal(TEST_ORG_NAME);
      expect(record.einHash).to.equal(TEST_EIN_HASH);
      expect(record.active).to.be.true;
      expect(record.registeredAt).to.be.gt(0);
      expect(record.latestYear).to.equal(0);
      expect(record.latestMonth).to.equal(0);
    });

    it("zero address registration reverts", async function () {
      const { auditLedger } = await loadFixture(deployFixture);

      await expect(
        auditLedger.registerOrganization(ZERO_ADDRESS, TEST_ORG_NAME, TEST_EIN_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "ZeroAddress");
    });
  });

  // -----------------------------------------------------------------------
  //  Name Resolution
  // -----------------------------------------------------------------------

  describe("Name Resolution", function () {
    it("resolveByName returns correct address after registration", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      expect(await auditLedger.resolveByName(TEST_ORG_NAME)).to.equal(orgSigner.address);
    });

    it("resolveByName returns address(0) for unknown names (does NOT revert)", async function () {
      const { auditLedger } = await loadFixture(deployFixture);

      expect(await auditLedger.resolveByName("nonexistent-org")).to.equal(ZERO_ADDRESS);
    });

    it("nameOf returns correct name after registration", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      expect(await auditLedger.nameOf(orgSigner.address)).to.equal(TEST_ORG_NAME);
    });

    it("nameOf returns empty string for unregistered address (does NOT revert)", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);

      expect(await auditLedger.nameOf(orgSigner.address)).to.equal("");
    });

    it("isNameTaken returns true for taken names, false for available", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);

      expect(await auditLedger.isNameTaken(TEST_ORG_NAME)).to.be.false;
      await registerTestOrg(auditLedger, orgSigner.address);
      expect(await auditLedger.isNameTaken(TEST_ORG_NAME)).to.be.true;
    });

    it("forward and reverse resolution are consistent", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      const resolvedAddress = await auditLedger.resolveByName(TEST_ORG_NAME);
      const resolvedName = await auditLedger.nameOf(resolvedAddress);
      expect(resolvedName).to.equal(TEST_ORG_NAME);
      expect(resolvedAddress).to.equal(orgSigner.address);
    });

    it("name update by admin: old name freed, new name resolves, reverse updated", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address, "old-name");

      await auditLedger.updateOrganizationName(orgSigner.address, "new-name");

      expect(await auditLedger.resolveByName("old-name")).to.equal(ZERO_ADDRESS);
      expect(await auditLedger.resolveByName("new-name")).to.equal(orgSigner.address);
      expect(await auditLedger.nameOf(orgSigner.address)).to.equal("new-name");

      const record = await auditLedger.getOrganization(orgSigner.address);
      expect(record.name).to.equal("new-name");
    });

    it("cannot update to a name taken by another org", async function () {
      const { auditLedger, orgSigner, anotherOrgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address, "org-one");
      await registerTestOrg(auditLedger, anotherOrgSigner.address, "org-two");

      await expect(
        auditLedger.updateOrganizationName(orgSigner.address, "org-two"),
      ).to.be.revertedWithCustomError(auditLedger, "NameAlreadyTaken");
    });

    it("updateOrganizationName on unregistered org reverts", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);

      await expect(
        auditLedger.updateOrganizationName(orgSigner.address, "new-name"),
      ).to.be.revertedWithCustomError(auditLedger, "OrgNotRegistered");
    });

    it("non-admin cannot update name", async function () {
      const { auditLedger, orgSigner, unauthorized } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger.connect(unauthorized).updateOrganizationName(orgSigner.address, "new-name"),
      ).to.be.revertedWithCustomError(auditLedger, "AccessControlUnauthorizedAccount");
    });

    it("emits OrganizationNameUpdated with old and new name", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address, "old-name");

      await expect(auditLedger.updateOrganizationName(orgSigner.address, "new-name"))
        .to.emit(auditLedger, "OrganizationNameUpdated")
        .withArgs(orgSigner.address, "old-name", "new-name");
    });
  });

  // -----------------------------------------------------------------------
  //  Name Validation
  // -----------------------------------------------------------------------

  describe("Name Validation", function () {
    it("valid names succeed: 'unitedway-la', 'org123', 'abc'", async function () {
      const { auditLedger, orgSigner, anotherOrgSigner } = await loadFixture(deployFixture);
      const signers = await ethers.getSigners();

      await expect(
        auditLedger.registerOrganization(orgSigner.address, "unitedway-la", TEST_EIN_HASH),
      ).to.not.be.reverted;
      await expect(
        auditLedger.registerOrganization(anotherOrgSigner.address, "org123", TEST_EIN_HASH),
      ).to.not.be.reverted;
      await expect(
        auditLedger.registerOrganization(signers[5].address, "abc", TEST_EIN_HASH),
      ).to.not.be.reverted;
    });

    const invalidNames = [
      { name: "", label: "empty string" },
      { name: "ab", label: "too short (2 chars)" },
      { name: "-starts-hyphen", label: "starts with hyphen" },
      { name: "ends-hyphen-", label: "ends with hyphen" },
      { name: "has spaces", label: "contains spaces" },
      { name: "UPPERCASE", label: "uppercase letters" },
      { name: "a".repeat(33), label: "longer than 32 chars" },
      { name: "special!chars", label: "special characters" },
    ];

    for (const { name, label } of invalidNames) {
      it(`rejects invalid name: ${label}`, async function () {
        const { auditLedger, orgSigner } = await loadFixture(deployFixture);

        await expect(
          auditLedger.registerOrganization(orgSigner.address, name, TEST_EIN_HASH),
        ).to.be.revertedWithCustomError(auditLedger, "InvalidName");
      });
    }
  });

  // -----------------------------------------------------------------------
  //  Audit Submission — Happy Path
  // -----------------------------------------------------------------------

  describe("Audit Submission — Happy Path", function () {
    it("org's own address can submit", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      const orgContract = auditLedger.connect(orgSigner);
      await expect(
        orgContract.submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.not.be.reverted;
    });

    it("system relay with SYSTEM_ROLE can submit for any registered org", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      const relayContract = auditLedger.connect(systemRelay);
      await expect(
        relayContract.submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.not.be.reverted;
    });

    it("emits AuditSubmitted with correct indexed args", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      )
        .to.emit(auditLedger, "AuditSubmitted")
        .withArgs(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT);
    });

    it("getAudit returns correct AuditEntry fields after submission", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await auditLedger
        .connect(systemRelay)
        .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH);

      const entry = await auditLedger.getAudit(orgSigner.address, 2026, 1);
      expect(entry.merkleRoot).to.equal(TEST_MERKLE_ROOT);
      expect(entry.schemaHash).to.equal(TEST_SCHEMA_HASH);
      expect(entry.timestamp).to.be.gt(0);
      expect(entry.submitter).to.equal(systemRelay.address);
    });

    it("getLatestAudit returns correct year, month, and entry", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await auditLedger
        .connect(systemRelay)
        .submitAudit(orgSigner.address, 2026, 3, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH);

      const [year, month, entry] = await auditLedger.getLatestAudit(orgSigner.address);
      expect(year).to.equal(2026);
      expect(month).to.equal(3);
      expect(entry.merkleRoot).to.equal(TEST_MERKLE_ROOT);
    });

    it("hasAuditForPeriod returns true after submission, false before", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      expect(await auditLedger.hasAuditForPeriod(orgSigner.address, 2026, 1)).to.be.false;

      await auditLedger
        .connect(systemRelay)
        .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH);

      expect(await auditLedger.hasAuditForPeriod(orgSigner.address, 2026, 1)).to.be.true;
    });

    it("getSubmissionCount returns 1 after first submission", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await auditLedger
        .connect(systemRelay)
        .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH);

      expect(await auditLedger.getSubmissionCount(orgSigner.address)).to.equal(1);
    });
  });

  // -----------------------------------------------------------------------
  //  Audit Submission — Guards
  // -----------------------------------------------------------------------

  describe("Audit Submission — Guards", function () {
    it("reverts for unregistered org address", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "OrgNotRegistered");
    });

    it("reverts for deactivated org", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "OrgNotActive");
    });

    it("reverts when unauthorized address calls", async function () {
      const { auditLedger, orgSigner, unauthorized } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(unauthorized)
          .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "Unauthorized");
    });

    it("reverts on duplicate submission for same org+year+month", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await auditLedger
        .connect(systemRelay)
        .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(
            orgSigner.address,
            2026,
            1,
            uniqueMerkleRoot("different-data"),
            TEST_SCHEMA_HASH,
          ),
      ).to.be.revertedWithCustomError(auditLedger, "PeriodAlreadySubmitted");
    });

    it("reverts when merkleRoot is bytes32(0)", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 1, ZERO_BYTES32, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "ZeroMerkleRoot");
    });

    it("reverts on invalid month 0", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 0, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "InvalidPeriod");
    });

    it("reverts on invalid month 13", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 13, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "InvalidPeriod");
    });

    it("reverts on invalid year 2020 (boundary)", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2020, 6, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "InvalidPeriod");
    });

    it("boundary months 1 and 12 succeed", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 1, uniqueMerkleRoot("jan"), TEST_SCHEMA_HASH),
      ).to.not.be.reverted;

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 12, uniqueMerkleRoot("dec"), TEST_SCHEMA_HASH),
      ).to.not.be.reverted;
    });

    it("year 2021 succeeds (first valid year)", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2021, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.not.be.reverted;
    });
  });

  // -----------------------------------------------------------------------
  //  Multiple Submissions & Latest Tracking
  // -----------------------------------------------------------------------

  describe("Multiple Submissions & Latest Tracking", function () {
    it("sequential submissions are each stored correctly via getAudit", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      const relay = auditLedger.connect(systemRelay);

      const janRoot = uniqueMerkleRoot("jan-2026");
      const febRoot = uniqueMerkleRoot("feb-2026");
      const marRoot = uniqueMerkleRoot("mar-2026");

      await relay.submitAudit(orgSigner.address, 2026, 1, janRoot, TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2026, 2, febRoot, TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2026, 3, marRoot, TEST_SCHEMA_HASH);

      expect((await auditLedger.getAudit(orgSigner.address, 2026, 1)).merkleRoot).to.equal(janRoot);
      expect((await auditLedger.getAudit(orgSigner.address, 2026, 2)).merkleRoot).to.equal(febRoot);
      expect((await auditLedger.getAudit(orgSigner.address, 2026, 3)).merkleRoot).to.equal(marRoot);
    });

    it("getLatestAudit reflects chronologically most recent (Mar 2026)", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      const relay = auditLedger.connect(systemRelay);

      await relay.submitAudit(orgSigner.address, 2026, 1, uniqueMerkleRoot("jan"), TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2026, 2, uniqueMerkleRoot("feb"), TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2026, 3, uniqueMerkleRoot("mar"), TEST_SCHEMA_HASH);

      const [year, month] = await auditLedger.getLatestAudit(orgSigner.address);
      expect(year).to.equal(2026);
      expect(month).to.equal(3);
    });

    it("out-of-order submission: Mar first, then Jan — latest stays Mar", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      const relay = auditLedger.connect(systemRelay);

      await relay.submitAudit(orgSigner.address, 2026, 3, uniqueMerkleRoot("mar"), TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2026, 1, uniqueMerkleRoot("jan"), TEST_SCHEMA_HASH);

      const [year, month] = await auditLedger.getLatestAudit(orgSigner.address);
      expect(year).to.equal(2026);
      expect(month).to.equal(3);
    });

    it("getSubmissionCount returns 3 after three submissions", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      const relay = auditLedger.connect(systemRelay);

      await relay.submitAudit(orgSigner.address, 2026, 1, uniqueMerkleRoot("jan"), TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2026, 2, uniqueMerkleRoot("feb"), TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2026, 3, uniqueMerkleRoot("mar"), TEST_SCHEMA_HASH);

      expect(await auditLedger.getSubmissionCount(orgSigner.address)).to.equal(3);
    });

    it("Dec 2025 submitted after Mar 2026 — latest is still Mar 2026", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      const relay = auditLedger.connect(systemRelay);

      await relay.submitAudit(orgSigner.address, 2026, 3, uniqueMerkleRoot("mar-2026"), TEST_SCHEMA_HASH);
      await relay.submitAudit(orgSigner.address, 2025, 12, uniqueMerkleRoot("dec-2025"), TEST_SCHEMA_HASH);

      const [year, month] = await auditLedger.getLatestAudit(orgSigner.address);
      expect(year).to.equal(2026);
      expect(month).to.equal(3);
    });
  });

  // -----------------------------------------------------------------------
  //  Organization Deactivation
  // -----------------------------------------------------------------------

  describe("Organization Deactivation", function () {
    it("admin can deactivate an org", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await auditLedger.deactivateOrganization(orgSigner.address);
      expect(await auditLedger.isOrganizationActive(orgSigner.address)).to.be.false;
    });

    it("emits OrganizationDeactivated event", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(auditLedger.deactivateOrganization(orgSigner.address))
        .to.emit(auditLedger, "OrganizationDeactivated")
        .withArgs(orgSigner.address);
    });

    it("isOrganizationActive returns false after deactivation", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      await auditLedger.deactivateOrganization(orgSigner.address);

      expect(await auditLedger.isOrganizationActive(orgSigner.address)).to.be.false;
    });

    it("deactivated org cannot submit new audits", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "OrgNotActive");
    });

    it("deactivated org's name still resolves via resolveByName", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      await auditLedger.deactivateOrganization(orgSigner.address);

      expect(await auditLedger.resolveByName(TEST_ORG_NAME)).to.equal(orgSigner.address);
      expect(await auditLedger.nameOf(orgSigner.address)).to.equal(TEST_ORG_NAME);
    });

    it("past audit entries for deactivated org are still readable", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await auditLedger
        .connect(systemRelay)
        .submitAudit(orgSigner.address, 2026, 1, TEST_MERKLE_ROOT, TEST_SCHEMA_HASH);

      await auditLedger.deactivateOrganization(orgSigner.address);

      const entry = await auditLedger.getAudit(orgSigner.address, 2026, 1);
      expect(entry.merkleRoot).to.equal(TEST_MERKLE_ROOT);
      expect(entry.schemaHash).to.equal(TEST_SCHEMA_HASH);
    });

    it("deactivating an already-deactivated org reverts", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);
      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        auditLedger.deactivateOrganization(orgSigner.address),
      ).to.be.revertedWithCustomError(auditLedger, "OrgNotActive");
    });

    it("non-admin cannot deactivate", async function () {
      const { auditLedger, orgSigner, unauthorized } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await expect(
        auditLedger.connect(unauthorized).deactivateOrganization(orgSigner.address),
      ).to.be.revertedWithCustomError(auditLedger, "AccessControlUnauthorizedAccount");
    });
  });

  // -----------------------------------------------------------------------
  //  Edge Cases
  // -----------------------------------------------------------------------

  describe("Organization Queries", function () {
    it("getLatestAudit returns zeros for org with no submissions", async function () {
      const { auditLedger, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      const [year, month, entry] = await auditLedger.getLatestAudit(orgSigner.address);
      expect(year).to.equal(0);
      expect(month).to.equal(0);
      expect(entry.merkleRoot).to.equal(ZERO_BYTES32);
      expect(entry.timestamp).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("two different orgs can submit for the same year+month independently", async function () {
      const { auditLedger, systemRelay, orgSigner, anotherOrgSigner } =
        await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address, "org-alpha");
      await registerTestOrg(auditLedger, anotherOrgSigner.address, "org-beta");
      const relay = auditLedger.connect(systemRelay);

      await expect(
        relay.submitAudit(orgSigner.address, 2026, 6, uniqueMerkleRoot("alpha-jun"), TEST_SCHEMA_HASH),
      ).to.not.be.reverted;

      await expect(
        relay.submitAudit(anotherOrgSigner.address, 2026, 6, uniqueMerkleRoot("beta-jun"), TEST_SCHEMA_HASH),
      ).to.not.be.reverted;
    });

    it("same org, same period, different callers — second reverts with PeriodAlreadySubmitted", async function () {
      const { auditLedger, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await registerTestOrg(auditLedger, orgSigner.address);

      await auditLedger
        .connect(orgSigner)
        .submitAudit(orgSigner.address, 2026, 6, uniqueMerkleRoot("org-submit"), TEST_SCHEMA_HASH);

      await expect(
        auditLedger
          .connect(systemRelay)
          .submitAudit(orgSigner.address, 2026, 6, uniqueMerkleRoot("relay-submit"), TEST_SCHEMA_HASH),
      ).to.be.revertedWithCustomError(auditLedger, "PeriodAlreadySubmitted");
    });
  });
});
