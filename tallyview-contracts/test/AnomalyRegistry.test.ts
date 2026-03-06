import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AuditLedger, AnomalyRegistry } from "../typechain-types";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
const REVIEWER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REVIEWER_ROLE"));

const TEST_EIN_HASH = ethers.solidityPackedKeccak256(["string"], ["12-3456789"]);

const TEST_TITLE = "CEO compensation exceeds peer benchmark by 340%";
const TEST_CONFIDENCE = 8500; // 85%
const TEST_EVIDENCE_HASH = ethers.keccak256(ethers.toUtf8Bytes("evidence-package-001"));
const RELATED_RULE_ID = ethers.ZeroHash;
const NON_ZERO_RULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FORD-GRANT-2026-417"));
const REVIEW_NOTE_HASH = ethers.keccak256(ethers.toUtf8Bytes("review-notes-001"));
const RESOLVE_NOTE_HASH = ethers.keccak256(ethers.toUtf8Bytes("resolve-notes-001"));
const ESCALATE_NOTE_HASH = ethers.keccak256(ethers.toUtf8Bytes("escalate-notes-001"));

// Enum indices matching TallyviewTypes
const Severity = { Info: 0, Low: 1, Medium: 2, High: 3, Critical: 4 };
const Category = {
  FinancialHealth: 0, Governance: 1, FraudPattern: 2, CompensationOutlier: 3,
  VendorConcentration: 4, ExpenseAllocation: 5, RevenueAnomaly: 6,
  RelatedParty: 7, DocumentProvenance: 8, Custom: 9,
};
const Status = { New: 0, Reviewed: 1, Resolved: 2, Escalated: 3 };

// ---------------------------------------------------------------------------
//  Fixture
// ---------------------------------------------------------------------------

async function deployFixture() {
  const [admin, systemRelay, orgSigner, reviewerSigner, anotherOrgSigner, unauthorized] =
    await ethers.getSigners();

  // Deploy AuditLedger
  const AuditLedgerFactory = await ethers.getContractFactory("AuditLedger");
  const alProxy = await upgrades.deployProxy(AuditLedgerFactory, [false], {
    initializer: "initialize",
    kind: "uups",
  });
  const auditLedger = (await alProxy.waitForDeployment()) as unknown as AuditLedger;
  await auditLedger.grantRole(SYSTEM_ROLE, systemRelay.address);

  // Register orgs
  await auditLedger.registerOrganization(orgSigner.address, "test-org", TEST_EIN_HASH);
  await auditLedger.registerOrganization(anotherOrgSigner.address, "another-org", TEST_EIN_HASH);

  // Deploy AnomalyRegistry
  const ARFactory = await ethers.getContractFactory("AnomalyRegistry");
  const arProxy = await upgrades.deployProxy(
    ARFactory,
    [await auditLedger.getAddress()],
    { initializer: "initialize", kind: "uups" },
  );
  const anomalyRegistry = (await arProxy.waitForDeployment()) as unknown as AnomalyRegistry;

  await anomalyRegistry.grantRole(SYSTEM_ROLE, systemRelay.address);
  await anomalyRegistry.grantRole(REVIEWER_ROLE, reviewerSigner.address);

  return {
    anomalyRegistry,
    auditLedger,
    admin,
    systemRelay,
    orgSigner,
    reviewerSigner,
    anotherOrgSigner,
    unauthorized,
  };
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

async function recordTestAnomaly(
  ar: AnomalyRegistry,
  orgAddress: string,
  severity = Severity.High,
  category = Category.FinancialHealth,
): Promise<bigint> {
  const tx = await ar.recordAnomaly(
    orgAddress,
    severity,
    category,
    TEST_TITLE,
    TEST_CONFIDENCE,
    TEST_EVIDENCE_HASH,
    RELATED_RULE_ID,
  );
  const receipt = await tx.wait();
  const log = receipt!.logs.find(
    (l) => ar.interface.parseLog({ topics: [...l.topics], data: l.data })?.name === "AnomalyRecorded",
  );
  const parsed = ar.interface.parseLog({ topics: [...log!.topics], data: log!.data });
  return parsed!.args.anomalyIndex;
}

// ===========================================================================
//  Tests
// ===========================================================================

describe("AnomalyRegistry", function () {
  // -----------------------------------------------------------------------
  //  Deployment & Initialization
  // -----------------------------------------------------------------------

  describe("Deployment & Initialization", function () {
    it("deploys correctly with AuditLedger reference", async function () {
      const { anomalyRegistry } = await loadFixture(deployFixture);
      expect(await anomalyRegistry.getAddress()).to.be.properAddress;
    });

    it("auditLedger() returns correct address", async function () {
      const { anomalyRegistry, auditLedger } = await loadFixture(deployFixture);
      expect(await anomalyRegistry.auditLedger()).to.equal(
        await auditLedger.getAddress(),
      );
    });

    it("system relay has SYSTEM_ROLE", async function () {
      const { anomalyRegistry, systemRelay } = await loadFixture(deployFixture);
      expect(await anomalyRegistry.hasRole(SYSTEM_ROLE, systemRelay.address)).to.be.true;
    });

    it("reviewer has REVIEWER_ROLE", async function () {
      const { anomalyRegistry, reviewerSigner } = await loadFixture(deployFixture);
      expect(await anomalyRegistry.hasRole(REVIEWER_ROLE, reviewerSigner.address)).to.be.true;
    });

    it("admin has DEFAULT_ADMIN_ROLE and ADMIN_ROLE", async function () {
      const { anomalyRegistry, admin } = await loadFixture(deployFixture);
      expect(await anomalyRegistry.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
      expect(await anomalyRegistry.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("cannot initialize twice", async function () {
      const { anomalyRegistry, auditLedger } = await loadFixture(deployFixture);
      await expect(
        anomalyRegistry.initialize(await auditLedger.getAddress()),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidInitialization");
    });

    it("cannot initialize with zero address", async function () {
      const ARFactory = await ethers.getContractFactory("AnomalyRegistry");
      await expect(
        upgrades.deployProxy(ARFactory, [ethers.ZeroAddress], {
          initializer: "initialize",
          kind: "uups",
        }),
      ).to.be.revertedWithCustomError(ARFactory, "ZeroAddress");
    });
  });

  // -----------------------------------------------------------------------
  //  Recording Anomalies
  // -----------------------------------------------------------------------

  describe("Recording Anomalies", function () {
    it("system relay can record an anomaly for a registered org", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      await expect(
        relay.recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.not.be.reverted;
    });

    it("returns the correct anomaly index (first = 0, second = 1)", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      const idx0 = await recordTestAnomaly(relay, orgSigner.address);
      expect(idx0).to.equal(0n);

      const idx1 = await recordTestAnomaly(relay, orgSigner.address);
      expect(idx1).to.equal(1n);
    });

    it("emits AnomalyRecorded with correct args (no title in event)", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      )
        .to.emit(anomalyRegistry, "AnomalyRecorded")
        .withArgs(0, orgSigner.address, Severity.High, Category.FinancialHealth);
    });

    it("getAnomaly returns correct fields", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);
      await recordTestAnomaly(relay, orgSigner.address);

      const a = await anomalyRegistry.getAnomaly(0);
      expect(a.org).to.equal(orgSigner.address);
      expect(a.severity).to.equal(Severity.High);
      expect(a.category).to.equal(Category.FinancialHealth);
      expect(a.title).to.equal(TEST_TITLE);
      expect(a.confidenceBps).to.equal(TEST_CONFIDENCE);
      expect(a.evidenceHash).to.equal(TEST_EVIDENCE_HASH);
      expect(a.relatedRuleId).to.equal(RELATED_RULE_ID);
      expect(a.detectedAt).to.be.gt(0);
      expect(a.status).to.equal(Status.New);
      expect(a.reviewedBy).to.equal(ethers.ZeroAddress);
      expect(a.reviewedAt).to.equal(0);
      expect(a.reviewNoteHash).to.equal(ethers.ZeroHash);
    });

    it("getAnomalyCount increments with each recording", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      expect(await anomalyRegistry.getAnomalyCount()).to.equal(0);
      await recordTestAnomaly(relay, orgSigner.address);
      expect(await anomalyRegistry.getAnomalyCount()).to.equal(1);
      await recordTestAnomaly(relay, orgSigner.address);
      expect(await anomalyRegistry.getAnomalyCount()).to.equal(2);
    });

    it("getAnomaliesForOrg includes the new index", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      await recordTestAnomaly(relay, orgSigner.address);
      await recordTestAnomaly(relay, orgSigner.address);

      const indices = await anomalyRegistry.getAnomaliesForOrg(orgSigner.address);
      expect(indices).to.deep.equal([0n, 1n]);
    });

    it("can record anomaly with relatedRuleId linking to a ComplianceEngine rule", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await anomalyRegistry.connect(systemRelay).recordAnomaly(
        orgSigner.address,
        Severity.High,
        Category.FinancialHealth,
        TEST_TITLE,
        TEST_CONFIDENCE,
        TEST_EVIDENCE_HASH,
        NON_ZERO_RULE_ID,
      );

      const a = await anomalyRegistry.getAnomaly(0);
      expect(a.relatedRuleId).to.equal(NON_ZERO_RULE_ID);
    });

    it("cannot record for unregistered org", async function () {
      const { anomalyRegistry, systemRelay, unauthorized } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          unauthorized.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "OrgNotRegistered");
    });

    it("cannot record for deactivated org", async function () {
      const { anomalyRegistry, auditLedger, systemRelay, orgSigner } =
        await loadFixture(deployFixture);
      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "OrgNotActive");
    });

    it("cannot record with empty title", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          "",
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "EmptyTitle");
    });

    it("cannot record with title over 200 characters", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const longTitle = "A".repeat(201);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          longTitle,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "TitleTooLong");
    });

    it("title of exactly 200 bytes succeeds", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const maxTitle = "A".repeat(200);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          maxTitle,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.not.be.reverted;
    });

    it("cannot record with zero confidence", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          0,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidConfidence");
    });

    it("cannot record with confidence over 10000", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          10001,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidConfidence");
    });

    it("confidence of exactly 10000 (100%) succeeds", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          10000,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.not.be.reverted;
    });

    it("confidence of exactly 1 succeeds", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          1,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.not.be.reverted;
    });

    it("non-system-role cannot record", async function () {
      const { anomalyRegistry, orgSigner, admin } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(admin).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "Unauthorized");
    });

    it("can record multiple anomalies for the same org — each gets a unique index", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      const idx0 = await recordTestAnomaly(relay, orgSigner.address);
      const idx1 = await recordTestAnomaly(relay, orgSigner.address);
      const idx2 = await recordTestAnomaly(relay, orgSigner.address);

      expect(idx0).to.equal(0n);
      expect(idx1).to.equal(1n);
      expect(idx2).to.equal(2n);
    });
  });

  // -----------------------------------------------------------------------
  //  Status Lifecycle — Review
  // -----------------------------------------------------------------------

  describe("Status Lifecycle — Review", function () {
    it("reviewer can review a New anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("admin can review a New anomaly", async function () {
      const { anomalyRegistry, systemRelay, admin, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(admin).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("system role can review a New anomaly", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(systemRelay).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("after review: status = Reviewed, reviewedBy = caller, reviewedAt > 0, reviewNoteHash set", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      const a = await anomalyRegistry.getAnomaly(0);
      expect(a.status).to.equal(Status.Reviewed);
      expect(a.reviewedBy).to.equal(reviewerSigner.address);
      expect(a.reviewedAt).to.be.gt(0);
      expect(a.reviewNoteHash).to.equal(REVIEW_NOTE_HASH);
    });

    it("emits AnomalyStatusChanged(index, org, New, Reviewed)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      )
        .to.emit(anomalyRegistry, "AnomalyStatusChanged")
        .withArgs(0, orgSigner.address, Status.New, Status.Reviewed);
    });

    it("emits AnomalyReviewed(index, org, reviewer)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      )
        .to.emit(anomalyRegistry, "AnomalyReviewed")
        .withArgs(0, orgSigner.address, reviewerSigner.address);
    });

    it("cannot review an anomaly that is already Reviewed", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("cannot review an anomaly that is Resolved", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("cannot review an anomaly that is Escalated", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("unauthorized address cannot review", async function () {
      const { anomalyRegistry, systemRelay, unauthorized, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(unauthorized).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "Unauthorized");
    });

    it("reviewing with reviewNoteHash = bytes32(0) succeeds (notes are optional)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, ethers.ZeroHash),
      ).to.not.be.reverted;

      const a = await anomalyRegistry.getAnomaly(0);
      expect(a.reviewNoteHash).to.equal(ethers.ZeroHash);
    });
  });

  // -----------------------------------------------------------------------
  //  Status Lifecycle — Resolve
  // -----------------------------------------------------------------------

  describe("Status Lifecycle — Resolve", function () {
    it("reviewer can resolve a Reviewed anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("admin can resolve a Reviewed anomaly", async function () {
      const { anomalyRegistry, systemRelay, admin, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(admin).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("after resolve: status = Resolved, reviewNoteHash updated", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      const a = await anomalyRegistry.getAnomaly(0);
      expect(a.status).to.equal(Status.Resolved);
      expect(a.reviewNoteHash).to.equal(RESOLVE_NOTE_HASH);
    });

    it("emits AnomalyStatusChanged(index, org, Reviewed, Resolved)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      )
        .to.emit(anomalyRegistry, "AnomalyStatusChanged")
        .withArgs(0, orgSigner.address, Status.Reviewed, Status.Resolved);
    });

    it("cannot resolve a New anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("cannot resolve an already Resolved anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("cannot resolve an Escalated anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("SYSTEM_ROLE cannot resolve — the system should not auto-close its own findings", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(systemRelay).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "Unauthorized");
    });

    it("unauthorized address cannot resolve", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, unauthorized, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(unauthorized).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Status Lifecycle — Escalate
  // -----------------------------------------------------------------------

  describe("Status Lifecycle — Escalate", function () {
    it("reviewer can escalate a Reviewed anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("admin can escalate", async function () {
      const { anomalyRegistry, systemRelay, admin, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(admin).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("system role can escalate (AI engine can recommend escalation)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(systemRelay).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.not.be.reverted;
    });

    it("after escalate: status = Escalated, reviewNoteHash updated", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);

      const a = await anomalyRegistry.getAnomaly(0);
      expect(a.status).to.equal(Status.Escalated);
      expect(a.reviewNoteHash).to.equal(ESCALATE_NOTE_HASH);
    });

    it("emits AnomalyStatusChanged(index, org, Reviewed, Escalated)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      )
        .to.emit(anomalyRegistry, "AnomalyStatusChanged")
        .withArgs(0, orgSigner.address, Status.Reviewed, Status.Escalated);
    });

    it("emits AnomalyEscalated(index, org)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      )
        .to.emit(anomalyRegistry, "AnomalyEscalated")
        .withArgs(0, orgSigner.address);
    });

    it("cannot escalate a New anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("cannot escalate an already Escalated anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("cannot escalate a Resolved anomaly", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("unauthorized address cannot escalate", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, unauthorized, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(unauthorized).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Forward-Only Status Enforcement
  // -----------------------------------------------------------------------

  describe("Forward-Only Status Enforcement", function () {
    it("full lifecycle: New → Reviewed → Resolved", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Reviewed);

      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);
      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Resolved);
    });

    it("full lifecycle: New → Reviewed → Escalated", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Reviewed);

      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);
      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Escalated);
    });

    it("Reviewed → New is invalid (cannot un-review)", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      // reviewAnomaly requires New status — calling it on Reviewed reverts
      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("Resolved → New is invalid", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("Resolved → Reviewed is invalid", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      // No function transitions to Reviewed from any state other than New
      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("Resolved → Escalated is invalid", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("Escalated → New is invalid", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("Escalated → Reviewed is invalid", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);

      // reviewAnomaly requires New, not Escalated
      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });

    it("Escalated → Resolved is invalid", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH);

      await expect(
        anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "InvalidStatusTransition");
    });
  });

  // -----------------------------------------------------------------------
  //  Filtered Queries
  // -----------------------------------------------------------------------

  describe("Filtered Queries", function () {
    async function setupFilteredFixture() {
      const fixture = await loadFixture(deployFixture);
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } = fixture;
      const relay = anomalyRegistry.connect(systemRelay);

      // Record 5 anomalies: index 0 = High, 1 = High, 2 = Medium, 3 = Medium, 4 = Critical
      await recordTestAnomaly(relay, orgSigner.address, Severity.High, Category.FinancialHealth);
      await recordTestAnomaly(relay, orgSigner.address, Severity.High, Category.CompensationOutlier);
      await recordTestAnomaly(relay, orgSigner.address, Severity.Medium, Category.ExpenseAllocation);
      await recordTestAnomaly(relay, orgSigner.address, Severity.Medium, Category.VendorConcentration);
      await recordTestAnomaly(relay, orgSigner.address, Severity.Critical, Category.FraudPattern);

      // Review 0 and 1
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(1, REVIEW_NOTE_HASH);

      // Resolve 0, escalate 1
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).escalateAnomaly(1, ESCALATE_NOTE_HASH);

      return fixture;
    }

    it("getAnomaliesByStatus(org, New) returns [2, 3, 4]", async function () {
      const { anomalyRegistry, orgSigner } = await setupFilteredFixture();
      const result = await anomalyRegistry.getAnomaliesByStatus(orgSigner.address, Status.New);
      expect(result).to.deep.equal([2n, 3n, 4n]);
    });

    it("getAnomaliesByStatus(org, Resolved) returns [0]", async function () {
      const { anomalyRegistry, orgSigner } = await setupFilteredFixture();
      const result = await anomalyRegistry.getAnomaliesByStatus(orgSigner.address, Status.Resolved);
      expect(result).to.deep.equal([0n]);
    });

    it("getAnomaliesByStatus(org, Escalated) returns [1]", async function () {
      const { anomalyRegistry, orgSigner } = await setupFilteredFixture();
      const result = await anomalyRegistry.getAnomaliesByStatus(orgSigner.address, Status.Escalated);
      expect(result).to.deep.equal([1n]);
    });

    it("getAnomaliesByStatus(org, Reviewed) returns [] (both moved on)", async function () {
      const { anomalyRegistry, orgSigner } = await setupFilteredFixture();
      const result = await anomalyRegistry.getAnomaliesByStatus(orgSigner.address, Status.Reviewed);
      expect(result).to.deep.equal([]);
    });

    it("getAnomaliesBySeverity(org, High) returns the 2 High indices", async function () {
      const { anomalyRegistry, orgSigner } = await setupFilteredFixture();
      const result = await anomalyRegistry.getAnomaliesBySeverity(orgSigner.address, Severity.High);
      expect(result).to.deep.equal([0n, 1n]);
    });

    it("getAnomaliesBySeverity(org, Critical) returns the 1 Critical index", async function () {
      const { anomalyRegistry, orgSigner } = await setupFilteredFixture();
      const result = await anomalyRegistry.getAnomaliesBySeverity(orgSigner.address, Severity.Critical);
      expect(result).to.deep.equal([4n]);
    });

    it("getAnomaliesBySeverity(org, Info) returns [] (no Info anomalies)", async function () {
      const { anomalyRegistry, orgSigner } = await setupFilteredFixture();
      const result = await anomalyRegistry.getAnomaliesBySeverity(orgSigner.address, Severity.Info);
      expect(result).to.deep.equal([]);
    });
  });

  // -----------------------------------------------------------------------
  //  Org Anomaly Summary
  // -----------------------------------------------------------------------

  describe("Org Anomaly Summary", function () {
    it("returns correct total, open, and critical counts", async function () {
      const { anomalyRegistry, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      // Record 5: index 0 = Critical, 1 = High, 2 = High, 3 = Medium, 4 = Medium
      await recordTestAnomaly(relay, orgSigner.address, Severity.Critical, Category.FraudPattern);
      await recordTestAnomaly(relay, orgSigner.address, Severity.High, Category.FinancialHealth);
      await recordTestAnomaly(relay, orgSigner.address, Severity.High, Category.CompensationOutlier);
      await recordTestAnomaly(relay, orgSigner.address, Severity.Medium, Category.ExpenseAllocation);
      await recordTestAnomaly(relay, orgSigner.address, Severity.Medium, Category.VendorConcentration);

      // Review 0, 1, 2
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(1, REVIEW_NOTE_HASH);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(2, REVIEW_NOTE_HASH);

      // Resolve 0
      await anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH);

      // State: 0 = Resolved, 1 = Reviewed, 2 = Reviewed, 3 = New, 4 = New
      const [total, open, critical] = await anomalyRegistry.getOrgAnomalySummary(orgSigner.address);

      expect(total).to.equal(5);
      expect(open).to.equal(4);     // 2 New + 2 Reviewed
      expect(critical).to.equal(1); // index 0, even though Resolved
    });
  });

  // -----------------------------------------------------------------------
  //  Cross-Contract Integration
  // -----------------------------------------------------------------------

  describe("Cross-Contract Integration", function () {
    it("deactivating org in AuditLedger prevents new anomaly recording", async function () {
      const { anomalyRegistry, auditLedger, systemRelay, orgSigner } =
        await loadFixture(deployFixture);
      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        anomalyRegistry.connect(systemRelay).recordAnomaly(
          orgSigner.address,
          Severity.High,
          Category.FinancialHealth,
          TEST_TITLE,
          TEST_CONFIDENCE,
          TEST_EVIDENCE_HASH,
          RELATED_RULE_ID,
        ),
      ).to.be.revertedWithCustomError(anomalyRegistry, "OrgNotActive");
    });

    it("existing anomalies for deactivated org are still readable", async function () {
      const { anomalyRegistry, auditLedger, systemRelay, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await auditLedger.deactivateOrganization(orgSigner.address);

      const a = await anomalyRegistry.getAnomaly(0);
      expect(a.org).to.equal(orgSigner.address);
      expect(a.title).to.equal(TEST_TITLE);
    });

    it("existing anomalies for deactivated org can still have status updated", async function () {
      const { anomalyRegistry, auditLedger, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      await auditLedger.deactivateOrganization(orgSigner.address);

      // Review still works
      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.not.be.reverted;

      // Resolve still works
      await expect(
        anomalyRegistry.connect(reviewerSigner).resolveAnomaly(0, RESOLVE_NOTE_HASH),
      ).to.not.be.reverted;

      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Resolved);
    });

    it("escalation still works on anomalies for deactivated org", async function () {
      const { anomalyRegistry, auditLedger, systemRelay, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      await auditLedger.deactivateOrganization(orgSigner.address);

      await expect(
        anomalyRegistry.connect(reviewerSigner).escalateAnomaly(0, ESCALATE_NOTE_HASH),
      ).to.not.be.reverted;

      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Escalated);
    });
  });

  // -----------------------------------------------------------------------
  //  Edge Cases
  // -----------------------------------------------------------------------

  describe("Edge Cases", function () {
    it("two different orgs can have anomalies independently", async function () {
      const { anomalyRegistry, systemRelay, orgSigner, anotherOrgSigner } =
        await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      await recordTestAnomaly(relay, orgSigner.address);
      await recordTestAnomaly(relay, orgSigner.address);
      await recordTestAnomaly(relay, anotherOrgSigner.address);

      const org1Indices = await anomalyRegistry.getAnomaliesForOrg(orgSigner.address);
      const org2Indices = await anomalyRegistry.getAnomaliesForOrg(anotherOrgSigner.address);

      expect(org1Indices).to.deep.equal([0n, 1n]);
      expect(org2Indices).to.deep.equal([2n]);
    });

    it("getAnomaly with invalid index reverts with AnomalyNotFound", async function () {
      const { anomalyRegistry } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.getAnomaly(0),
      ).to.be.revertedWithCustomError(anomalyRegistry, "AnomalyNotFound");

      await expect(
        anomalyRegistry.getAnomaly(999),
      ).to.be.revertedWithCustomError(anomalyRegistry, "AnomalyNotFound");
    });

    it("reviewAnomaly with invalid index reverts with AnomalyNotFound", async function () {
      const { anomalyRegistry, reviewerSigner } = await loadFixture(deployFixture);

      await expect(
        anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH),
      ).to.be.revertedWithCustomError(anomalyRegistry, "AnomalyNotFound");
    });

    it("record anomaly with each AnomalyCategory value", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      const categories = Object.values(Category);
      for (const cat of categories) {
        await expect(
          relay.recordAnomaly(
            orgSigner.address,
            Severity.Medium,
            cat,
            TEST_TITLE,
            TEST_CONFIDENCE,
            TEST_EVIDENCE_HASH,
            RELATED_RULE_ID,
          ),
        ).to.not.be.reverted;
      }

      expect(await anomalyRegistry.getAnomalyCount()).to.equal(categories.length);
    });

    it("record anomaly with each AnomalySeverity value", async function () {
      const { anomalyRegistry, systemRelay, orgSigner } = await loadFixture(deployFixture);
      const relay = anomalyRegistry.connect(systemRelay);

      const severities = Object.values(Severity);
      for (const sev of severities) {
        await expect(
          relay.recordAnomaly(
            orgSigner.address,
            sev,
            Category.FinancialHealth,
            TEST_TITLE,
            TEST_CONFIDENCE,
            TEST_EVIDENCE_HASH,
            RELATED_RULE_ID,
          ),
        ).to.not.be.reverted;
      }

      expect(await anomalyRegistry.getAnomalyCount()).to.equal(severities.length);
    });

    it("a different person can resolve than the person who reviewed", async function () {
      const { anomalyRegistry, systemRelay, admin, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      // Reviewer reviews
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);
      expect((await anomalyRegistry.getAnomaly(0)).reviewedBy).to.equal(reviewerSigner.address);

      // Admin resolves (different person)
      await anomalyRegistry.connect(admin).resolveAnomaly(0, RESOLVE_NOTE_HASH);
      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Resolved);
    });

    it("a different person can escalate than the person who reviewed", async function () {
      const { anomalyRegistry, systemRelay, admin, reviewerSigner, orgSigner } =
        await loadFixture(deployFixture);
      await recordTestAnomaly(anomalyRegistry.connect(systemRelay), orgSigner.address);

      // Reviewer reviews
      await anomalyRegistry.connect(reviewerSigner).reviewAnomaly(0, REVIEW_NOTE_HASH);

      // Admin escalates (different person)
      await anomalyRegistry.connect(admin).escalateAnomaly(0, ESCALATE_NOTE_HASH);
      expect((await anomalyRegistry.getAnomaly(0)).status).to.equal(Status.Escalated);
    });
  });
});
