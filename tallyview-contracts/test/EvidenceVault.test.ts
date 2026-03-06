import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AuditLedger, EvidenceVault } from "../typechain-types";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
const REGULATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGULATOR_ROLE"));

const TEST_EIN_HASH = ethers.solidityPackedKeccak256(["string"], ["12-3456789"]);

const TEST_CASE_ID = ethers.keccak256(ethers.toUtf8Bytes("CASE-2026-001"));
const TEST_CASE_TITLE = "UCHS Financial Irregularities Investigation";
const TEST_CONTENT_HASH = ethers.keccak256(ethers.toUtf8Bytes("evidence-document-001.pdf"));
const TEST_DESCRIPTION = "CEO compensation analysis — peer benchmark comparison";

const ZERO_BYTES32 = ethers.ZeroHash;

// Enum indices matching TallyviewTypes
const Stage = {
  Tip: 0, Analysis: 1, Discovery: 2, Filing: 3, Recovery: 4, Closed: 5,
};
const Classification = {
  Tip: 0, FinancialRecord: 1, AnalysisReport: 2, WitnessStatement: 3,
  CommunicationRecord: 4, PublicFiling: 5, InternalDocument: 6,
  AIGeneratedBrief: 7, Other: 8,
};
const SealStatus = { Unsealed: 0, Sealed: 1 };

// ---------------------------------------------------------------------------
//  Fixture
// ---------------------------------------------------------------------------

async function deployFixture() {
  const [admin, systemRelay, orgSigner, regulatorSigner, investigatorA, investigatorB, anotherOrgSigner, unauthorized] =
    await ethers.getSigners();

  // Deploy AuditLedger
  const AuditLedgerFactory = await ethers.getContractFactory("AuditLedger");
  const alProxy = await upgrades.deployProxy(AuditLedgerFactory, [false], {
    initializer: "initialize",
    kind: "uups",
  });
  const auditLedger = (await alProxy.waitForDeployment()) as unknown as AuditLedger;
  await auditLedger.grantRole(SYSTEM_ROLE, systemRelay.address);

  // Register test org
  await auditLedger.registerOrganization(orgSigner.address, "test-org", TEST_EIN_HASH);

  // Deploy EvidenceVault
  const EVFactory = await ethers.getContractFactory("EvidenceVault");
  const evProxy = await upgrades.deployProxy(
    EVFactory,
    [await auditLedger.getAddress()],
    { initializer: "initialize", kind: "uups" },
  );
  const evidenceVault = (await evProxy.waitForDeployment()) as unknown as EvidenceVault;

  // Grant roles on EvidenceVault
  await evidenceVault.grantRole(SYSTEM_ROLE, systemRelay.address);
  await evidenceVault.grantRole(REGULATOR_ROLE, regulatorSigner.address);

  return {
    evidenceVault,
    auditLedger,
    admin,
    systemRelay,
    orgSigner,
    regulatorSigner,
    investigatorA,
    investigatorB,
    anotherOrgSigner,
    unauthorized,
  };
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

async function createTestCase(
  ev: EvidenceVault,
  targetOrg: string,
  leadInvestigator: string,
  caseId: string = TEST_CASE_ID,
): Promise<string> {
  await ev.createCase(caseId, targetOrg, TEST_CASE_TITLE, leadInvestigator);
  return caseId;
}

async function submitTestEvidence(
  ev: EvidenceVault,
  caseId: string,
): Promise<bigint> {
  const tx = await ev.submitEvidence(
    caseId,
    Classification.FinancialRecord,
    TEST_DESCRIPTION,
    TEST_CONTENT_HASH,
    ZERO_BYTES32,
    ZERO_BYTES32,
  );
  const receipt = await tx.wait();
  const log = receipt!.logs.find(
    (l) => ev.interface.parseLog({ topics: [...l.topics], data: l.data })?.name === "EvidenceSubmitted",
  );
  const parsed = ev.interface.parseLog({ topics: [...log!.topics], data: log!.data });
  return parsed!.args.evidenceIndex;
}

function uniqueCaseId(seed: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(seed));
}

function longString(len: number): string {
  return "A".repeat(len);
}

// ===========================================================================
//  Tests
// ===========================================================================

describe("EvidenceVault", function () {
  // -----------------------------------------------------------------------
  //  Deployment & Initialization
  // -----------------------------------------------------------------------

  describe("Deployment & Initialization", function () {
    it("deploys correctly with AuditLedger reference", async function () {
      const { evidenceVault, auditLedger } = await loadFixture(deployFixture);
      expect(await evidenceVault.getAddress()).to.be.properAddress;
      expect(await evidenceVault.auditLedger()).to.equal(
        await auditLedger.getAddress(),
      );
    });

    it("admin has DEFAULT_ADMIN_ROLE and ADMIN_ROLE", async function () {
      const { evidenceVault, admin } = await loadFixture(deployFixture);
      expect(await evidenceVault.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
      expect(await evidenceVault.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("system relay has SYSTEM_ROLE", async function () {
      const { evidenceVault, systemRelay } = await loadFixture(deployFixture);
      expect(await evidenceVault.hasRole(SYSTEM_ROLE, systemRelay.address)).to.be.true;
    });

    it("regulator has REGULATOR_ROLE", async function () {
      const { evidenceVault, regulatorSigner } = await loadFixture(deployFixture);
      expect(await evidenceVault.hasRole(REGULATOR_ROLE, regulatorSigner.address)).to.be.true;
    });

    it("cannot initialize twice", async function () {
      const { evidenceVault, auditLedger } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.initialize(await auditLedger.getAddress()),
      ).to.be.revertedWithCustomError(evidenceVault, "InvalidInitialization");
    });

    it("cannot initialize with zero address", async function () {
      const EVFactory = await ethers.getContractFactory("EvidenceVault");
      await expect(
        upgrades.deployProxy(EVFactory, [ethers.ZeroAddress], {
          initializer: "initialize",
          kind: "uups",
        }),
      ).to.be.revertedWithCustomError(EVFactory, "ZeroAddress");
    });
  });

  // -----------------------------------------------------------------------
  //  Case Creation
  // -----------------------------------------------------------------------

  describe("Case Creation", function () {
    it("admin can create a case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address),
      ).to.not.be.reverted;
    });

    it("system relay can create a case", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.connect(systemRelay).createCase(
          TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address,
        ),
      ).to.not.be.reverted;
    });

    it("cannot create for unregistered org", async function () {
      const { evidenceVault, unauthorized, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.createCase(TEST_CASE_ID, unauthorized.address, TEST_CASE_TITLE, investigatorA.address),
      ).to.be.revertedWithCustomError(evidenceVault, "OrgNotRegistered");
    });

    it("CAN create for deactivated org", async function () {
      const { evidenceVault, auditLedger, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address),
      ).to.not.be.reverted;
    });

    it("cannot create duplicate caseId", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address);

      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, "Another title", investigatorA.address),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseAlreadyExists");
    });

    it("cannot create with empty title", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, "", investigatorA.address),
      ).to.be.revertedWithCustomError(evidenceVault, "EmptyDescription");
    });

    it("cannot create with title over 200 characters", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, longString(201), investigatorA.address),
      ).to.be.revertedWithCustomError(evidenceVault, "DescriptionTooLong");
    });

    it("title at exactly 200 characters succeeds", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, longString(200), investigatorA.address),
      ).to.not.be.reverted;
    });

    it("cannot create with zero address lead investigator", async function () {
      const { evidenceVault, orgSigner } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(evidenceVault, "ZeroAddress");
    });

    it("emits CaseCreated with correct args (no title in event)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address),
      )
        .to.emit(evidenceVault, "CaseCreated")
        .withArgs(TEST_CASE_ID, orgSigner.address, investigatorA.address);
    });

    it("getCase returns correct fields", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address);

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.targetOrg).to.equal(orgSigner.address);
      expect(c.title).to.equal(TEST_CASE_TITLE);
      expect(c.stage).to.equal(Stage.Tip);
      expect(c.leadInvestigator).to.equal(investigatorA.address);
      expect(c.openedAt).to.be.greaterThan(0);
      expect(c.closedAt).to.equal(0);
      expect(c.isSealed).to.be.false;
    });

    it("lead investigator is automatically authorized", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address);

      expect(await evidenceVault.isCaseAuthorized(TEST_CASE_ID, investigatorA.address)).to.be.true;
    });

    it("getCasesForOrg includes the new caseId", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address);

      const cases = await evidenceVault.getCasesForOrg(orgSigner.address);
      expect(cases).to.include(TEST_CASE_ID);
    });

    it("unauthorized cannot create", async function () {
      const { evidenceVault, orgSigner, investigatorA, unauthorized } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.connect(unauthorized).createCase(
          TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("regulator cannot create", async function () {
      const { evidenceVault, orgSigner, investigatorA, regulatorSigner } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.connect(regulatorSigner).createCase(
          TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Investigation Stage Progression
  // -----------------------------------------------------------------------

  describe("Investigation Stage Progression", function () {
    it("admin can advance stage: Tip → Analysis", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis),
      ).to.not.be.reverted;

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.stage).to.equal(Stage.Analysis);
    });

    it("system relay can advance stage", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(systemRelay).updateCaseStage(TEST_CASE_ID, Stage.Analysis),
      ).to.not.be.reverted;
    });

    it("can skip stages: Tip → Discovery", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Discovery),
      ).to.not.be.reverted;

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.stage).to.equal(Stage.Discovery);
    });

    it("can advance through full pipeline: Tip → Analysis → Discovery → Filing → Recovery", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis);
      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Discovery);
      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Filing);
      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Recovery);

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.stage).to.equal(Stage.Recovery);
    });

    it("emits CaseStageChanged with correct old and new stage", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis))
        .to.emit(evidenceVault, "CaseStageChanged")
        .withArgs(TEST_CASE_ID, Stage.Tip, Stage.Analysis);
    });

    it("cannot go backwards: Analysis → Tip", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis);

      await expect(
        evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Tip),
      ).to.be.revertedWithCustomError(evidenceVault, "InvalidStageTransition");
    });

    it("cannot advance a closed case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.closeCase(TEST_CASE_ID);

      await expect(
        evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseIsClosed");
    });

    it("cannot use updateCaseStage to set stage to Closed", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Closed),
      ).to.be.revertedWithCustomError(evidenceVault, "InvalidStageTransition");
    });

    it("unauthorized cannot update stage", async function () {
      const { evidenceVault, orgSigner, investigatorA, unauthorized } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(unauthorized).updateCaseStage(TEST_CASE_ID, Stage.Analysis),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("cannot update stage on nonexistent case", async function () {
      const { evidenceVault } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.updateCaseStage(uniqueCaseId("nonexistent"), Stage.Analysis),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseNotFound");
    });
  });

  // -----------------------------------------------------------------------
  //  Case Closure
  // -----------------------------------------------------------------------

  describe("Case Closure", function () {
    it("admin can close a case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(evidenceVault.closeCase(TEST_CASE_ID)).to.not.be.reverted;
    });

    it("after closure: closedAt > 0, stage = Closed", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.closeCase(TEST_CASE_ID);

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.closedAt).to.be.greaterThan(0);
      expect(c.stage).to.equal(Stage.Closed);
    });

    it("emits CaseClosed", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(evidenceVault.closeCase(TEST_CASE_ID))
        .to.emit(evidenceVault, "CaseClosed")
        .withArgs(TEST_CASE_ID);
    });

    it("emits CaseStageChanged with old stage and Closed", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Discovery);

      await expect(evidenceVault.closeCase(TEST_CASE_ID))
        .to.emit(evidenceVault, "CaseStageChanged")
        .withArgs(TEST_CASE_ID, Stage.Discovery, Stage.Closed);
    });

    it("cannot submit new evidence to closed case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.closeCase(TEST_CASE_ID);

      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseIsClosed");
    });

    it("cannot advance stage on closed case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.closeCase(TEST_CASE_ID);

      await expect(
        evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseIsClosed");
    });

    it("cannot close already-closed case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.closeCase(TEST_CASE_ID);

      await expect(
        evidenceVault.closeCase(TEST_CASE_ID),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseIsClosed");
    });

    it("case data and evidence still readable after closure", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      const idx = await submitTestEvidence(
        evidenceVault.connect(investigatorA) as unknown as EvidenceVault,
        TEST_CASE_ID,
      );
      await evidenceVault.closeCase(TEST_CASE_ID);

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.title).to.equal(TEST_CASE_TITLE);

      const e = await evidenceVault.getEvidence(idx);
      expect(e.contentHash).to.equal(TEST_CONTENT_HASH);
    });

    it("system relay cannot close", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(systemRelay).closeCase(TEST_CASE_ID),
      ).to.be.revertedWithCustomError(evidenceVault, "AccessControlUnauthorizedAccount");
    });

    it("regulator cannot close", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(regulatorSigner).closeCase(TEST_CASE_ID),
      ).to.be.revertedWithCustomError(evidenceVault, "AccessControlUnauthorizedAccount");
    });
  });

  // -----------------------------------------------------------------------
  //  Investigator Authorization
  // -----------------------------------------------------------------------

  describe("Investigator Authorization", function () {
    it("admin can authorize an investigator for a case", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address),
      ).to.not.be.reverted;
    });

    it("system relay can authorize", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(systemRelay).authorizeInvestigator(TEST_CASE_ID, investigatorB.address),
      ).to.not.be.reverted;
    });

    it("regulator can authorize", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(regulatorSigner).authorizeInvestigator(TEST_CASE_ID, investigatorB.address),
      ).to.not.be.reverted;
    });

    it("isCaseAuthorized returns true after authorization", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      expect(await evidenceVault.isCaseAuthorized(TEST_CASE_ID, investigatorB.address)).to.be.false;
      await evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address);
      expect(await evidenceVault.isCaseAuthorized(TEST_CASE_ID, investigatorB.address)).to.be.true;
    });

    it("unauthorized address cannot authorize", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB, unauthorized } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(unauthorized).authorizeInvestigator(TEST_CASE_ID, investigatorB.address),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("admin can revoke an investigator", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address);

      await expect(
        evidenceVault.revokeInvestigator(TEST_CASE_ID, investigatorB.address),
      ).to.not.be.reverted;
    });

    it("regulator can revoke", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address);

      await expect(
        evidenceVault.connect(regulatorSigner).revokeInvestigator(TEST_CASE_ID, investigatorB.address),
      ).to.not.be.reverted;
    });

    it("cannot revoke the lead investigator", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.revokeInvestigator(TEST_CASE_ID, investigatorA.address),
      ).to.be.revertedWithCustomError(evidenceVault, "CannotRevokeLead");
    });

    it("isCaseAuthorized returns false after revocation", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address);
      await evidenceVault.revokeInvestigator(TEST_CASE_ID, investigatorB.address);

      expect(await evidenceVault.isCaseAuthorized(TEST_CASE_ID, investigatorB.address)).to.be.false;
    });

    it("emits InvestigatorAuthorized", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address))
        .to.emit(evidenceVault, "InvestigatorAuthorized")
        .withArgs(TEST_CASE_ID, investigatorB.address);
    });

    it("emits InvestigatorRevoked", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address);

      await expect(evidenceVault.revokeInvestigator(TEST_CASE_ID, investigatorB.address))
        .to.emit(evidenceVault, "InvestigatorRevoked")
        .withArgs(TEST_CASE_ID, investigatorB.address);
    });

    it("cannot authorize zero address", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.authorizeInvestigator(TEST_CASE_ID, ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(evidenceVault, "ZeroAddress");
    });

    it("regulator is NOT case-authorized by default", async function () {
      const { evidenceVault, orgSigner, investigatorA, regulatorSigner } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      expect(await evidenceVault.isCaseAuthorized(TEST_CASE_ID, regulatorSigner.address)).to.be.false;
    });

    it("authorize on nonexistent case reverts", async function () {
      const { evidenceVault, investigatorB } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.authorizeInvestigator(uniqueCaseId("nonexistent"), investigatorB.address),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseNotFound");
    });

    it("revoke on nonexistent case reverts", async function () {
      const { evidenceVault, investigatorB } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.revokeInvestigator(uniqueCaseId("nonexistent"), investigatorB.address),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseNotFound");
    });
  });

  // -----------------------------------------------------------------------
  //  Evidence Submission
  // -----------------------------------------------------------------------

  describe("Evidence Submission", function () {
    it("lead investigator can submit evidence", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.not.be.reverted;
    });

    it("authorized investigator (investigatorB) can submit", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address);

      await expect(
        evidenceVault.connect(investigatorB).submitEvidence(
          TEST_CASE_ID, Classification.AnalysisReport, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.not.be.reverted;
    });

    it("system relay can submit evidence", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(systemRelay).submitEvidence(
          TEST_CASE_ID, Classification.Tip, "Anonymous tip about financial irregularities",
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.not.be.reverted;
    });

    it("admin can submit evidence", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.not.be.reverted;
    });

    it("regulator CANNOT submit evidence directly", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(regulatorSigner).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "NotCaseAuthorized");
    });

    it("regulator authorizes themselves, then CAN submit", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await evidenceVault.connect(regulatorSigner).authorizeInvestigator(
        TEST_CASE_ID, regulatorSigner.address,
      );

      await expect(
        evidenceVault.connect(regulatorSigner).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.not.be.reverted;
    });

    it("returns correct evidence index (first = 0, second = 1)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      const lead = evidenceVault.connect(investigatorA) as unknown as EvidenceVault;

      const idx0 = await submitTestEvidence(lead, TEST_CASE_ID);
      expect(idx0).to.equal(0n);

      const idx1 = await submitTestEvidence(lead, TEST_CASE_ID);
      expect(idx1).to.equal(1n);
    });

    it("emits EvidenceSubmitted with correct args", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      )
        .to.emit(evidenceVault, "EvidenceSubmitted")
        .withArgs(0, TEST_CASE_ID, investigatorA.address, Classification.FinancialRecord);
    });

    it("getEvidence returns correct fields", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.connect(investigatorA).submitEvidence(
        TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
        TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.caseId).to.equal(TEST_CASE_ID);
      expect(e.submitter).to.equal(investigatorA.address);
      expect(e.classification).to.equal(Classification.FinancialRecord);
      expect(e.description).to.equal(TEST_DESCRIPTION);
      expect(e.contentHash).to.equal(TEST_CONTENT_HASH);
      expect(e.submittedAt).to.be.greaterThan(0);
      expect(e.sealStatus).to.equal(SealStatus.Unsealed);
      expect(e.relatedAnomalyId).to.equal(ZERO_BYTES32);
      expect(e.relatedEntityId).to.equal(ZERO_BYTES32);
    });

    it("getEvidenceCount increments", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      expect(await evidenceVault.getEvidenceCount()).to.equal(0);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);
      expect(await evidenceVault.getEvidenceCount()).to.equal(1);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);
      expect(await evidenceVault.getEvidenceCount()).to.equal(2);
    });

    it("getEvidenceForCase includes the new index", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);

      const indices = await evidenceVault.getEvidenceForCase(TEST_CASE_ID);
      expect(indices.length).to.equal(1);
      expect(indices[0]).to.equal(0n);
    });

    it("cannot submit to nonexistent case", async function () {
      const { evidenceVault, investigatorA } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          uniqueCaseId("nonexistent"), Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseNotFound");
    });

    it("cannot submit to closed case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.closeCase(TEST_CASE_ID);

      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseIsClosed");
    });

    it("non-authorized investigator cannot submit", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(investigatorB).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "NotCaseAuthorized");
    });

    it("cannot submit with empty description", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, "",
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "EmptyDescription");
    });

    it("cannot submit with description over 200 characters", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, longString(201),
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "DescriptionTooLong");
    });

    it("cannot submit with zero contentHash", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(investigatorA).submitEvidence(
          TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
          ZERO_BYTES32, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.be.revertedWithCustomError(evidenceVault, "ZeroContentHash");
    });

    it("can submit with relatedAnomalyId and relatedEntityId", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      const anomalyRef = ethers.keccak256(ethers.toUtf8Bytes("anomaly-42"));
      const entityRef = ethers.keccak256(ethers.toUtf8Bytes("entity-john-reeves"));

      await evidenceVault.connect(investigatorA).submitEvidence(
        TEST_CASE_ID, Classification.AnalysisReport, TEST_DESCRIPTION,
        TEST_CONTENT_HASH, anomalyRef, entityRef,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.relatedAnomalyId).to.equal(anomalyRef);
      expect(e.relatedEntityId).to.equal(entityRef);
    });

    it("can submit with both related IDs as bytes32(0)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await evidenceVault.connect(investigatorA).submitEvidence(
        TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
        TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.relatedAnomalyId).to.equal(ZERO_BYTES32);
      expect(e.relatedEntityId).to.equal(ZERO_BYTES32);
    });
  });

  // -----------------------------------------------------------------------
  //  Whistleblower Tip Submission
  // -----------------------------------------------------------------------

  describe("Whistleblower Tip Submission", function () {
    it("system relay submits evidence with classification = Tip", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(systemRelay).submitEvidence(
          TEST_CASE_ID, Classification.Tip,
          "Anonymous tip: CEO steering contracts to spouse company",
          TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
        ),
      ).to.not.be.reverted;
    });

    it("evidence stored with relay as submitter (whistleblower identity protected)", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await evidenceVault.connect(systemRelay).submitEvidence(
        TEST_CASE_ID, Classification.Tip,
        "Anonymous tip about procurement irregularities",
        TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.submitter).to.equal(systemRelay.address);
      expect(e.classification).to.equal(Classification.Tip);
    });

    it("timestamp proves tip existed at a specific time", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await evidenceVault.connect(systemRelay).submitEvidence(
        TEST_CASE_ID, Classification.Tip,
        "Whistleblower tip about vendor kickbacks",
        TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.submittedAt).to.be.greaterThan(0);
    });

    it("can submit multiple tips to the same case", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      const relay = evidenceVault.connect(systemRelay);

      await relay.submitEvidence(
        TEST_CASE_ID, Classification.Tip, "First tip about irregularities",
        TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
      );
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("evidence-002.pdf"));
      await relay.submitEvidence(
        TEST_CASE_ID, Classification.Tip, "Second tip with additional details",
        hash2, ZERO_BYTES32, ZERO_BYTES32,
      );

      expect(await evidenceVault.getEvidenceCount()).to.equal(2);
      const indices = await evidenceVault.getEvidenceForCase(TEST_CASE_ID);
      expect(indices.length).to.equal(2);
    });
  });

  // -----------------------------------------------------------------------
  //  Evidence Sealing
  // -----------------------------------------------------------------------

  describe("Evidence Sealing", function () {
    it("regulator can seal individual evidence", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);

      await expect(
        evidenceVault.connect(regulatorSigner).sealEvidence(0),
      ).to.not.be.reverted;
    });

    it("admin can seal individual evidence", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);

      await expect(evidenceVault.sealEvidence(0)).to.not.be.reverted;
    });

    it("after sealing: sealStatus = Sealed", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);
      await evidenceVault.sealEvidence(0);

      const e = await evidenceVault.getEvidence(0);
      expect(e.sealStatus).to.equal(SealStatus.Sealed);
    });

    it("emits EvidenceSealed with correct args", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);

      await expect(evidenceVault.connect(regulatorSigner).sealEvidence(0))
        .to.emit(evidenceVault, "EvidenceSealed")
        .withArgs(0, TEST_CASE_ID, regulatorSigner.address);
    });

    it("cannot seal already-sealed evidence", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);
      await evidenceVault.sealEvidence(0);

      await expect(
        evidenceVault.sealEvidence(0),
      ).to.be.revertedWithCustomError(evidenceVault, "EvidenceAlreadySealed");
    });

    it("unauthorized cannot seal", async function () {
      const { evidenceVault, orgSigner, investigatorA, unauthorized } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);

      await expect(
        evidenceVault.connect(unauthorized).sealEvidence(0),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("system relay cannot seal evidence", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await submitTestEvidence(evidenceVault.connect(investigatorA) as unknown as EvidenceVault, TEST_CASE_ID);

      await expect(
        evidenceVault.connect(systemRelay).sealEvidence(0),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("cannot seal nonexistent evidence", async function () {
      const { evidenceVault } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.sealEvidence(999),
      ).to.be.revertedWithCustomError(evidenceVault, "EvidenceNotFound");
    });
  });

  // -----------------------------------------------------------------------
  //  Case Sealing
  // -----------------------------------------------------------------------

  describe("Case Sealing", function () {
    it("regulator can seal a case", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(regulatorSigner).sealCase(TEST_CASE_ID),
      ).to.not.be.reverted;
    });

    it("admin can seal a case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(evidenceVault.sealCase(TEST_CASE_ID)).to.not.be.reverted;
    });

    it("emits CaseSealed", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(evidenceVault.connect(regulatorSigner).sealCase(TEST_CASE_ID))
        .to.emit(evidenceVault, "CaseSealed")
        .withArgs(TEST_CASE_ID, regulatorSigner.address);
    });

    it("after sealing: case.isSealed = true", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.sealCase(TEST_CASE_ID);

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.isSealed).to.be.true;
    });

    it("all existing evidence for the case becomes Sealed", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      const lead = evidenceVault.connect(investigatorA) as unknown as EvidenceVault;

      await submitTestEvidence(lead, TEST_CASE_ID);
      await submitTestEvidence(lead, TEST_CASE_ID);
      await submitTestEvidence(lead, TEST_CASE_ID);

      await evidenceVault.sealCase(TEST_CASE_ID);

      for (let i = 0; i < 3; i++) {
        const e = await evidenceVault.getEvidence(i);
        expect(e.sealStatus).to.equal(SealStatus.Sealed);
      }
    });

    it("cannot seal already-sealed case", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.sealCase(TEST_CASE_ID);

      await expect(
        evidenceVault.sealCase(TEST_CASE_ID),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseAlreadySealed");
    });

    it("new evidence submitted to a sealed case inherits Sealed status", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.sealCase(TEST_CASE_ID);

      await evidenceVault.connect(investigatorA).submitEvidence(
        TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
        TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.sealStatus).to.equal(SealStatus.Sealed);
    });

    it("system relay cannot seal a case", async function () {
      const { evidenceVault, systemRelay, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(systemRelay).sealCase(TEST_CASE_ID),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("unauthorized cannot seal", async function () {
      const { evidenceVault, orgSigner, investigatorA, unauthorized } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(unauthorized).sealCase(TEST_CASE_ID),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("sealCase on nonexistent case reverts", async function () {
      const { evidenceVault } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.sealCase(uniqueCaseId("nonexistent")),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseNotFound");
    });
  });

  // -----------------------------------------------------------------------
  //  Case Summary
  // -----------------------------------------------------------------------

  describe("Case Summary", function () {
    it("getCaseSummary returns correct values", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      const [count0, stage0, sealed0] = await evidenceVault.getCaseSummary(TEST_CASE_ID);
      expect(count0).to.equal(0);
      expect(stage0).to.equal(Stage.Tip);
      expect(sealed0).to.be.false;
    });

    it("summary reflects evidence, stage advancement, and sealing", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      const lead = evidenceVault.connect(investigatorA) as unknown as EvidenceVault;

      await submitTestEvidence(lead, TEST_CASE_ID);
      await submitTestEvidence(lead, TEST_CASE_ID);
      await submitTestEvidence(lead, TEST_CASE_ID);

      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Discovery);
      await evidenceVault.sealCase(TEST_CASE_ID);

      const [count, stage, sealed] = await evidenceVault.getCaseSummary(TEST_CASE_ID);
      expect(count).to.equal(3);
      expect(stage).to.equal(Stage.Discovery);
      expect(sealed).to.be.true;
    });
  });

  // -----------------------------------------------------------------------
  //  Cross-Contract Integration
  // -----------------------------------------------------------------------

  describe("Cross-Contract Integration", function () {
    it("can create case for a deactivated org", async function () {
      const { evidenceVault, auditLedger, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        evidenceVault.createCase(TEST_CASE_ID, orgSigner.address, TEST_CASE_TITLE, investigatorA.address),
      ).to.not.be.reverted;

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.targetOrg).to.equal(orgSigner.address);
    });

    it("evidence with relatedAnomalyId is stored correctly (soft reference)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      const anomalyRef = ethers.keccak256(ethers.toUtf8Bytes("anomaly-index-7"));
      await evidenceVault.connect(investigatorA).submitEvidence(
        TEST_CASE_ID, Classification.AnalysisReport, TEST_DESCRIPTION,
        TEST_CONTENT_HASH, anomalyRef, ZERO_BYTES32,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.relatedAnomalyId).to.equal(anomalyRef);
      expect(e.relatedEntityId).to.equal(ZERO_BYTES32);
    });

    it("evidence with relatedEntityId is stored correctly (soft reference)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      const entityRef = ethers.keccak256(ethers.toUtf8Bytes("entity-john-reeves"));
      await evidenceVault.connect(investigatorA).submitEvidence(
        TEST_CASE_ID, Classification.FinancialRecord, TEST_DESCRIPTION,
        TEST_CONTENT_HASH, ZERO_BYTES32, entityRef,
      );

      const e = await evidenceVault.getEvidence(0);
      expect(e.relatedAnomalyId).to.equal(ZERO_BYTES32);
      expect(e.relatedEntityId).to.equal(entityRef);
    });
  });

  // -----------------------------------------------------------------------
  //  Edge Cases
  // -----------------------------------------------------------------------

  describe("Edge Cases", function () {
    it("multiple cases for the same org", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      const id1 = uniqueCaseId("CASE-001");
      const id2 = uniqueCaseId("CASE-002");

      await evidenceVault.createCase(id1, orgSigner.address, "First investigation", investigatorA.address);
      await evidenceVault.createCase(id2, orgSigner.address, "Second investigation", investigatorA.address);

      const cases = await evidenceVault.getCasesForOrg(orgSigner.address);
      expect(cases.length).to.equal(2);
      expect(cases).to.include(id1);
      expect(cases).to.include(id2);
    });

    it("same investigator authorized for multiple cases independently", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      const id1 = uniqueCaseId("CASE-001");
      const id2 = uniqueCaseId("CASE-002");

      await evidenceVault.createCase(id1, orgSigner.address, "Case one", investigatorA.address);
      await evidenceVault.createCase(id2, orgSigner.address, "Case two", investigatorA.address);

      await evidenceVault.authorizeInvestigator(id1, investigatorB.address);

      expect(await evidenceVault.isCaseAuthorized(id1, investigatorB.address)).to.be.true;
      expect(await evidenceVault.isCaseAuthorized(id2, investigatorB.address)).to.be.false;
    });

    it("getEvidence with invalid index reverts", async function () {
      const { evidenceVault } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.getEvidence(999),
      ).to.be.revertedWithCustomError(evidenceVault, "EvidenceNotFound");
    });

    it("getCase with nonexistent caseId reverts", async function () {
      const { evidenceVault } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.getCase(uniqueCaseId("nonexistent")),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseNotFound");
    });

    it("revoked investigator's previously submitted evidence is still readable", async function () {
      const { evidenceVault, orgSigner, investigatorA, investigatorB } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.authorizeInvestigator(TEST_CASE_ID, investigatorB.address);

      await evidenceVault.connect(investigatorB).submitEvidence(
        TEST_CASE_ID, Classification.WitnessStatement, "Witness interview transcript",
        TEST_CONTENT_HASH, ZERO_BYTES32, ZERO_BYTES32,
      );

      await evidenceVault.revokeInvestigator(TEST_CASE_ID, investigatorB.address);

      const e = await evidenceVault.getEvidence(0);
      expect(e.submitter).to.equal(investigatorB.address);
      expect(e.description).to.equal("Witness interview transcript");
    });

    it("closing and sealing are independent (seal then close)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.sealCase(TEST_CASE_ID);

      const cBeforeClose = await evidenceVault.getCase(TEST_CASE_ID);
      expect(cBeforeClose.isSealed).to.be.true;
      expect(cBeforeClose.closedAt).to.equal(0);

      await evidenceVault.closeCase(TEST_CASE_ID);

      const cAfterClose = await evidenceVault.getCase(TEST_CASE_ID);
      expect(cAfterClose.isSealed).to.be.true;
      expect(cAfterClose.closedAt).to.be.greaterThan(0);
      expect(cAfterClose.stage).to.equal(Stage.Closed);
    });

    it("closing and sealing are independent (close then seal)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.closeCase(TEST_CASE_ID);

      await expect(evidenceVault.sealCase(TEST_CASE_ID)).to.not.be.reverted;

      const c = await evidenceVault.getCase(TEST_CASE_ID);
      expect(c.isSealed).to.be.true;
      expect(c.closedAt).to.be.greaterThan(0);
    });

    it("regulator cannot advance stage", async function () {
      const { evidenceVault, regulatorSigner, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);

      await expect(
        evidenceVault.connect(regulatorSigner).updateCaseStage(TEST_CASE_ID, Stage.Analysis),
      ).to.be.revertedWithCustomError(evidenceVault, "Unauthorized");
    });

    it("same-stage transition reverts (Analysis → Analysis)", async function () {
      const { evidenceVault, orgSigner, investigatorA } = await loadFixture(deployFixture);
      await createTestCase(evidenceVault, orgSigner.address, investigatorA.address);
      await evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis);

      await expect(
        evidenceVault.updateCaseStage(TEST_CASE_ID, Stage.Analysis),
      ).to.be.revertedWithCustomError(evidenceVault, "InvalidStageTransition");
    });

    it("getCaseSummary reverts for nonexistent case", async function () {
      const { evidenceVault } = await loadFixture(deployFixture);
      await expect(
        evidenceVault.getCaseSummary(uniqueCaseId("nonexistent")),
      ).to.be.revertedWithCustomError(evidenceVault, "CaseNotFound");
    });
  });
});
