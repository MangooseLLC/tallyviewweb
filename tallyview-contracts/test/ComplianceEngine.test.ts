import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AuditLedger, ComplianceEngine } from "../typechain-types";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
const FUNDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FUNDER_ROLE"));

const SPENDING_RULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FORD-GRANT-2026-417"));
const OVERHEAD_RULE_ID = ethers.keccak256(ethers.toUtf8Bytes("BOARD-OVERHEAD-CEILING"));
const CUSTOM_RULE_ID = ethers.keccak256(ethers.toUtf8Bytes("CUSTOM-RULE-001"));
const DEADLINE_ID = ethers.keccak256(ethers.toUtf8Bytes("990-FY2025"));

const SPENDING_CAP = 15_000_000; // $150,000.00 in cents
const OVERHEAD_MAX_BPS = 1500; // 15%
const INDEFINITE_END = 0;

const ONE_DAY = 86400;
const ONE_YEAR = ONE_DAY * 365;
const NINETY_DAYS = ONE_DAY * 90;

const TEST_EIN_HASH = ethers.solidityPackedKeccak256(["string"], ["12-3456789"]);

// Enum indices matching TallyviewTypes
const RuleType = { SpendingCap: 0, OverheadRatio: 1, CustomThreshold: 2 };
const RuleStatus = { Compliant: 0, AtRisk: 1, Violated: 2 };
const DeadlineStatus = { Pending: 0, Approaching: 1, Overdue: 2, Met: 3 };

// ---------------------------------------------------------------------------
//  Fixture
// ---------------------------------------------------------------------------

async function deployFixture() {
  const [admin, systemRelay, orgSigner, funderSigner, anotherOrgSigner, unauthorized] =
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

  // Deploy ComplianceEngine
  const CEFactory = await ethers.getContractFactory("ComplianceEngine");
  const ceProxy = await upgrades.deployProxy(
    CEFactory,
    [await auditLedger.getAddress()],
    { initializer: "initialize", kind: "uups" },
  );
  const complianceEngine = (await ceProxy.waitForDeployment()) as unknown as ComplianceEngine;

  await complianceEngine.grantRole(SYSTEM_ROLE, systemRelay.address);
  await complianceEngine.grantRole(FUNDER_ROLE, funderSigner.address);

  return {
    complianceEngine,
    auditLedger,
    admin,
    systemRelay,
    orgSigner,
    funderSigner,
    anotherOrgSigner,
    unauthorized,
  };
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

async function createTestSpendingRule(
  ce: ComplianceEngine,
  orgAddress: string,
  setBy: string,
) {
  const now = await time.latest();
  await ce.createRule(
    SPENDING_RULE_ID,
    orgAddress,
    setBy,
    RuleType.SpendingCap,
    "Ford Foundation Grant #2026-417",
    SPENDING_CAP,
    now,
    now + ONE_YEAR,
  );
}

async function createTestOverheadRule(
  ce: ComplianceEngine,
  orgAddress: string,
  setBy: string,
) {
  const now = await time.latest();
  await ce.createRule(
    OVERHEAD_RULE_ID,
    orgAddress,
    setBy,
    RuleType.OverheadRatio,
    "Board overhead ceiling",
    OVERHEAD_MAX_BPS,
    now,
    INDEFINITE_END,
  );
}

async function createTestDeadline(
  ce: ComplianceEngine,
  orgAddress: string,
) {
  const now = await time.latest();
  await ce.createDeadline(DEADLINE_ID, orgAddress, "990", now + NINETY_DAYS);
}

// ===========================================================================
//  Tests
// ===========================================================================

describe("ComplianceEngine", function () {
  // -----------------------------------------------------------------------
  //  Deployment & Initialization
  // -----------------------------------------------------------------------

  describe("Deployment & Initialization", function () {
    it("deploys correctly with AuditLedger reference", async function () {
      const { complianceEngine } = await loadFixture(deployFixture);
      expect(await complianceEngine.getAddress()).to.be.properAddress;
    });

    it("auditLedger() returns correct address", async function () {
      const { complianceEngine, auditLedger } = await loadFixture(deployFixture);
      expect(await complianceEngine.auditLedger()).to.equal(
        await auditLedger.getAddress(),
      );
    });

    it("admin has DEFAULT_ADMIN_ROLE and ADMIN_ROLE", async function () {
      const { complianceEngine, admin } = await loadFixture(deployFixture);
      expect(await complianceEngine.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
      expect(await complianceEngine.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("system relay has SYSTEM_ROLE", async function () {
      const { complianceEngine, systemRelay } = await loadFixture(deployFixture);
      expect(await complianceEngine.hasRole(SYSTEM_ROLE, systemRelay.address)).to.be.true;
    });

    it("funder has FUNDER_ROLE", async function () {
      const { complianceEngine, funderSigner } = await loadFixture(deployFixture);
      expect(await complianceEngine.hasRole(FUNDER_ROLE, funderSigner.address)).to.be.true;
    });

    it("cannot initialize twice", async function () {
      const { complianceEngine, auditLedger } = await loadFixture(deployFixture);
      await expect(
        complianceEngine.initialize(await auditLedger.getAddress()),
      ).to.be.revertedWithCustomError(complianceEngine, "InvalidInitialization");
    });

    it("cannot initialize with zero address", async function () {
      const CEFactory = await ethers.getContractFactory("ComplianceEngine");
      await expect(
        upgrades.deployProxy(CEFactory, [ethers.ZeroAddress], {
          initializer: "initialize",
          kind: "uups",
        }),
      ).to.be.revertedWithCustomError(CEFactory, "ZeroAddress");
    });
  });

  // -----------------------------------------------------------------------
  //  Rule Creation
  // -----------------------------------------------------------------------

  describe("Rule Creation", function () {
    it("admin can create a SpendingCap rule for a registered org", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.org).to.equal(orgSigner.address);
      expect(rule.ruleType).to.equal(RuleType.SpendingCap);
      expect(rule.active).to.be.true;
    });

    it("admin can create an OverheadRatio rule with endDate = 0 (indefinite)", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);

      const rule = await complianceEngine.getRule(OVERHEAD_RULE_ID);
      expect(rule.ruleType).to.equal(RuleType.OverheadRatio);
      expect(rule.endDate).to.equal(0);
      expect(rule.active).to.be.true;
    });

    it("admin can create a CustomThreshold rule", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      const now = await time.latest();

      await complianceEngine.createRule(
        CUSTOM_RULE_ID,
        orgSigner.address,
        admin.address,
        RuleType.CustomThreshold,
        "Custom audit score minimum",
        8000,
        now,
        now + ONE_YEAR,
      );

      const rule = await complianceEngine.getRule(CUSTOM_RULE_ID);
      expect(rule.ruleType).to.equal(RuleType.CustomThreshold);
    });

    it("funder role can create a rule", async function () {
      const { complianceEngine, orgSigner, funderSigner } = await loadFixture(deployFixture);
      const now = await time.latest();

      await complianceEngine.connect(funderSigner).createRule(
        SPENDING_RULE_ID,
        orgSigner.address,
        funderSigner.address,
        RuleType.SpendingCap,
        "Funder grant",
        SPENDING_CAP,
        now,
        now + ONE_YEAR,
      );

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.setBy).to.equal(funderSigner.address);
    });

    it("system role can create a rule", async function () {
      const { complianceEngine, orgSigner, systemRelay, admin } =
        await loadFixture(deployFixture);
      const now = await time.latest();

      await complianceEngine.connect(systemRelay).createRule(
        SPENDING_RULE_ID,
        orgSigner.address,
        admin.address,
        RuleType.SpendingCap,
        "System-created rule",
        SPENDING_CAP,
        now,
        now + ONE_YEAR,
      );

      expect((await complianceEngine.getRule(SPENDING_RULE_ID)).org).to.equal(
        orgSigner.address,
      );
    });

    it("cannot create rule for unregistered org", async function () {
      const { complianceEngine, unauthorized, admin } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          unauthorized.address,
          admin.address,
          RuleType.SpendingCap,
          "Bad rule",
          SPENDING_CAP,
          now,
          now + ONE_YEAR,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "OrgNotRegistered");
    });

    it("cannot create rule for deactivated org", async function () {
      const { complianceEngine, auditLedger, orgSigner, admin } =
        await loadFixture(deployFixture);
      await auditLedger.deactivateOrganization(orgSigner.address);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          admin.address,
          RuleType.SpendingCap,
          "Bad rule",
          SPENDING_CAP,
          now,
          now + ONE_YEAR,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "OrgNotActive");
    });

    it("cannot create duplicate ruleId", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          admin.address,
          RuleType.SpendingCap,
          "Duplicate",
          SPENDING_CAP,
          now,
          now + ONE_YEAR,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "RuleAlreadyExists");
    });

    it("cannot create with zero threshold", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          admin.address,
          RuleType.SpendingCap,
          "Zero threshold",
          0,
          now,
          now + ONE_YEAR,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "ZeroAmount");
    });

    it("cannot create with zero address setBy", async function () {
      const { complianceEngine, orgSigner } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          ethers.ZeroAddress,
          RuleType.SpendingCap,
          "Zero setBy",
          SPENDING_CAP,
          now,
          now + ONE_YEAR,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "ZeroAddress");
    });

    it("cannot create with startDate >= endDate when endDate > 0", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          admin.address,
          RuleType.SpendingCap,
          "Bad dates",
          SPENDING_CAP,
          now + ONE_YEAR,
          now,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "InvalidDateRange");

      // Equal dates should also fail
      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          admin.address,
          RuleType.SpendingCap,
          "Equal dates",
          SPENDING_CAP,
          now,
          now,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "InvalidDateRange");
    });

    it("emits RuleCreated with correct args", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          admin.address,
          RuleType.SpendingCap,
          "Ford Foundation Grant #2026-417",
          SPENDING_CAP,
          now,
          now + ONE_YEAR,
        ),
      )
        .to.emit(complianceEngine, "RuleCreated")
        .withArgs(
          SPENDING_RULE_ID,
          orgSigner.address,
          RuleType.SpendingCap,
          "Ford Foundation Grant #2026-417",
          SPENDING_CAP,
        );
    });

    it("getRule returns correct fields", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.org).to.equal(orgSigner.address);
      expect(rule.setBy).to.equal(admin.address);
      expect(rule.ruleType).to.equal(RuleType.SpendingCap);
      expect(rule.label).to.equal("Ford Foundation Grant #2026-417");
      expect(rule.threshold).to.equal(SPENDING_CAP);
      expect(rule.currentValue).to.equal(0);
      expect(rule.status).to.equal(RuleStatus.Compliant);
      expect(rule.active).to.be.true;
    });

    it("getRulesForOrg includes the new ruleId", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      const rules = await complianceEngine.getRulesForOrg(orgSigner.address);
      expect(rules).to.include(SPENDING_RULE_ID);
    });

    it("unauthorized cannot create", async function () {
      const { complianceEngine, orgSigner, unauthorized } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.connect(unauthorized).createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          unauthorized.address,
          RuleType.SpendingCap,
          "Unauthorized",
          SPENDING_CAP,
          now,
          now + ONE_YEAR,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Spending Cap Value Reporting
  // -----------------------------------------------------------------------

  describe("Spending Cap Value Reporting", function () {
    it("currentValue accumulates across multiple reports", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      const relay = complianceEngine.connect(systemRelay);

      await relay.reportValue(SPENDING_RULE_ID, 5_000_000);
      await relay.reportValue(SPENDING_RULE_ID, 3_000_000);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.currentValue).to.equal(8_000_000);
    });

    it("emits ValueReported with amount and new total", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 5_000_000),
      )
        .to.emit(complianceEngine, "ValueReported")
        .withArgs(SPENDING_RULE_ID, orgSigner.address, 5_000_000, 5_000_000);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 3_000_000),
      )
        .to.emit(complianceEngine, "ValueReported")
        .withArgs(SPENDING_RULE_ID, orgSigner.address, 3_000_000, 8_000_000);
    });

    it("cannot report zero amount", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 0),
      ).to.be.revertedWithCustomError(complianceEngine, "ZeroAmount");
    });

    it("cannot report on nonexistent rule", async function () {
      const { complianceEngine, systemRelay } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));

      await expect(
        complianceEngine.connect(systemRelay).reportValue(fakeId, 1000),
      ).to.be.revertedWithCustomError(complianceEngine, "RuleNotFound");
    });

    it("cannot report on deactivated rule", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      await complianceEngine.deactivateRule(SPENDING_RULE_ID);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 1000),
      ).to.be.revertedWithCustomError(complianceEngine, "RuleNotActive");
    });

    it("cannot report on expired rule", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      await time.increaseTo(Number(rule.endDate) + 1);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 1000),
      ).to.be.revertedWithCustomError(complianceEngine, "RuleExpired");
    });

    it("non-system-role cannot report", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.reportValue(SPENDING_RULE_ID, 1000),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Overhead Ratio Value Reporting
  // -----------------------------------------------------------------------

  describe("Overhead Ratio Value Reporting", function () {
    it("currentValue is REPLACED not accumulated", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);
      const relay = complianceEngine.connect(systemRelay);

      await relay.reportValue(OVERHEAD_RULE_ID, 1200);
      expect((await complianceEngine.getRule(OVERHEAD_RULE_ID)).currentValue).to.equal(1200);

      await relay.reportValue(OVERHEAD_RULE_ID, 1400);
      expect((await complianceEngine.getRule(OVERHEAD_RULE_ID)).currentValue).to.equal(1400);
    });

    it("emits ValueReported with snapshot value as newTotal", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(OVERHEAD_RULE_ID, 1200),
      )
        .to.emit(complianceEngine, "ValueReported")
        .withArgs(OVERHEAD_RULE_ID, orgSigner.address, 1200, 1200);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(OVERHEAD_RULE_ID, 1400),
      )
        .to.emit(complianceEngine, "ValueReported")
        .withArgs(OVERHEAD_RULE_ID, orgSigner.address, 1400, 1400);
    });

    it("same error checks as spending cap", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(OVERHEAD_RULE_ID, 0),
      ).to.be.revertedWithCustomError(complianceEngine, "ZeroAmount");

      await expect(
        complianceEngine.reportValue(OVERHEAD_RULE_ID, 1000),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Automatic Status Transitions — Spending Cap
  // -----------------------------------------------------------------------

  describe("Automatic Status Transitions — Spending Cap", function () {
    it("stays Compliant when value is under 90% of threshold", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      // 90% of 15,000,000 = 13,500,000. Report 13,499,999 — just under.
      await complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 13_499_999);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.status).to.equal(RuleStatus.Compliant);
    });

    it("changes to AtRisk when value crosses 90%", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      // 13,500,001 > 13,500,000 (90% of 15,000,000)
      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 13_500_001),
      )
        .to.emit(complianceEngine, "RuleStatusChanged")
        .withArgs(
          SPENDING_RULE_ID,
          orgSigner.address,
          RuleStatus.Compliant,
          RuleStatus.AtRisk,
        );

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.status).to.equal(RuleStatus.AtRisk);
    });

    it("changes to Violated when value exceeds threshold", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      const relay = complianceEngine.connect(systemRelay);

      // Move to AtRisk first
      await relay.reportValue(SPENDING_RULE_ID, 13_500_001);

      // Push past threshold
      await expect(relay.reportValue(SPENDING_RULE_ID, 1_500_000))
        .to.emit(complianceEngine, "RuleStatusChanged")
        .withArgs(
          SPENDING_RULE_ID,
          orgSigner.address,
          RuleStatus.AtRisk,
          RuleStatus.Violated,
        );

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.status).to.equal(RuleStatus.Violated);
    });

    it("auto-creates violation with type 'spending-cap-breach'", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      // One big report that breaches
      await complianceEngine
        .connect(systemRelay)
        .reportValue(SPENDING_RULE_ID, 15_000_001);

      const violation = await complianceEngine.getViolation(0);
      expect(violation.ruleId).to.equal(SPENDING_RULE_ID);
      expect(violation.org).to.equal(orgSigner.address);
      expect(violation.violationType).to.equal("spending-cap-breach");
      expect(violation.thresholdValue).to.equal(SPENDING_CAP);
      expect(violation.actualValue).to.equal(15_000_001);
    });

    it("emits ViolationRecorded on breach", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 15_000_001),
      )
        .to.emit(complianceEngine, "ViolationRecorded")
        .withArgs(0, SPENDING_RULE_ID, orgSigner.address, "spending-cap-breach");
    });

    it("getViolationsForOrg and getViolationsForRule include violation index", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await complianceEngine
        .connect(systemRelay)
        .reportValue(SPENDING_RULE_ID, 15_000_001);

      const orgViolations = await complianceEngine.getViolationsForOrg(orgSigner.address);
      expect(orgViolations).to.deep.equal([0n]);

      const ruleViolations = await complianceEngine.getViolationsForRule(SPENDING_RULE_ID);
      expect(ruleViolations).to.deep.equal([0n]);
    });

    it("CRITICAL: single jump from 80% to 110% — ONE status change, ONE violation", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      // Report 80% first — stays Compliant
      await complianceEngine
        .connect(systemRelay)
        .reportValue(SPENDING_RULE_ID, 12_000_000);

      // Now report enough to jump to 110% in one shot (needs 4,500,001 more)
      const tx = complianceEngine
        .connect(systemRelay)
        .reportValue(SPENDING_RULE_ID, 4_500_001);

      // Should emit exactly ONE RuleStatusChanged (Compliant→Violated)
      await expect(tx)
        .to.emit(complianceEngine, "RuleStatusChanged")
        .withArgs(
          SPENDING_RULE_ID,
          orgSigner.address,
          RuleStatus.Compliant,
          RuleStatus.Violated,
        );

      // Should emit exactly ONE ViolationRecorded
      await expect(tx)
        .to.emit(complianceEngine, "ViolationRecorded")
        .withArgs(0, SPENDING_RULE_ID, orgSigner.address, "spending-cap-breach");

      // Only 1 violation total
      expect(await complianceEngine.getViolationCount()).to.equal(1);
    });

    it("further reports past Violated update currentValue but create no new violations", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      const relay = complianceEngine.connect(systemRelay);

      // Breach
      await relay.reportValue(SPENDING_RULE_ID, 15_000_001);
      expect(await complianceEngine.getViolationCount()).to.equal(1);

      // Additional reports
      await relay.reportValue(SPENDING_RULE_ID, 5_000_000);
      await relay.reportValue(SPENDING_RULE_ID, 3_000_000);

      // Still only 1 violation
      expect(await complianceEngine.getViolationCount()).to.equal(1);

      // But currentValue is updated
      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.currentValue).to.equal(23_000_001);
      expect(rule.status).to.equal(RuleStatus.Violated);
    });
  });

  // -----------------------------------------------------------------------
  //  Automatic Status Transitions — Overhead Ratio
  // -----------------------------------------------------------------------

  describe("Automatic Status Transitions — Overhead Ratio", function () {
    it("stays Compliant under 90% of max", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);

      // 90% of 1500 = 1350. Report 1349 — under.
      await complianceEngine.connect(systemRelay).reportValue(OVERHEAD_RULE_ID, 1349);

      const rule = await complianceEngine.getRule(OVERHEAD_RULE_ID);
      expect(rule.status).to.equal(RuleStatus.Compliant);
    });

    it("changes to AtRisk over 90% of max", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);

      // 1351 > 1350 (90% of 1500)
      await expect(
        complianceEngine.connect(systemRelay).reportValue(OVERHEAD_RULE_ID, 1351),
      )
        .to.emit(complianceEngine, "RuleStatusChanged")
        .withArgs(
          OVERHEAD_RULE_ID,
          orgSigner.address,
          RuleStatus.Compliant,
          RuleStatus.AtRisk,
        );
    });

    it("changes to Violated over max with 'overhead-exceeded' violation", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(OVERHEAD_RULE_ID, 1501),
      )
        .to.emit(complianceEngine, "ViolationRecorded")
        .withArgs(0, OVERHEAD_RULE_ID, orgSigner.address, "overhead-exceeded");

      const violation = await complianceEngine.getViolation(0);
      expect(violation.violationType).to.equal("overhead-exceeded");
      expect(violation.thresholdValue).to.equal(OVERHEAD_MAX_BPS);
      expect(violation.actualValue).to.equal(1501);
    });

    it("reporting below threshold after AtRisk — status stays AtRisk", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);
      const relay = complianceEngine.connect(systemRelay);

      // Push to AtRisk
      await relay.reportValue(OVERHEAD_RULE_ID, 1400);
      expect((await complianceEngine.getRule(OVERHEAD_RULE_ID)).status).to.equal(
        RuleStatus.AtRisk,
      );

      // Report clean value — snapshot replaces, but status does NOT auto-revert
      await relay.reportValue(OVERHEAD_RULE_ID, 1000);
      const rule = await complianceEngine.getRule(OVERHEAD_RULE_ID);
      expect(rule.currentValue).to.equal(1000);
      expect(rule.status).to.equal(RuleStatus.AtRisk);
    });
  });

  // -----------------------------------------------------------------------
  //  Filing Deadlines
  // -----------------------------------------------------------------------

  describe("Filing Deadlines", function () {
    it("creates deadline for registered org", async function () {
      const { complianceEngine, orgSigner } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      const dl = await complianceEngine.getDeadline(DEADLINE_ID);
      expect(dl.org).to.equal(orgSigner.address);
      expect(dl.filingType).to.equal("990");
      expect(dl.status).to.equal(DeadlineStatus.Pending);
      expect(dl.completedDate).to.equal(0);
    });

    it("cannot create for unregistered org", async function () {
      const { complianceEngine, unauthorized } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.createDeadline(DEADLINE_ID, unauthorized.address, "990", now + NINETY_DAYS),
      ).to.be.revertedWithCustomError(complianceEngine, "OrgNotRegistered");
    });

    it("cannot create with due date in past", async function () {
      const { complianceEngine, orgSigner } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine.createDeadline(DEADLINE_ID, orgSigner.address, "990", now - 1),
      ).to.be.revertedWithCustomError(complianceEngine, "InvalidDateRange");
    });

    it("cannot create duplicate", async function () {
      const { complianceEngine, orgSigner } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);
      const now = await time.latest();

      await expect(
        complianceEngine.createDeadline(DEADLINE_ID, orgSigner.address, "990-PF", now + NINETY_DAYS),
      ).to.be.revertedWithCustomError(complianceEngine, "DeadlineAlreadyExists");
    });

    it("emits DeadlineCreated", async function () {
      const { complianceEngine, orgSigner } = await loadFixture(deployFixture);
      const now = await time.latest();
      const dueDate = now + NINETY_DAYS;

      await expect(
        complianceEngine.createDeadline(DEADLINE_ID, orgSigner.address, "990", dueDate),
      )
        .to.emit(complianceEngine, "DeadlineCreated")
        .withArgs(DEADLINE_ID, orgSigner.address, "990", dueDate);
    });

    it("getDeadline returns correct fields", async function () {
      const { complianceEngine, orgSigner } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      const dl = await complianceEngine.getDeadline(DEADLINE_ID);
      expect(dl.org).to.equal(orgSigner.address);
      expect(dl.filingType).to.equal("990");
      expect(dl.dueDate).to.be.gt(0);
      expect(dl.completedDate).to.equal(0);
      expect(dl.status).to.equal(DeadlineStatus.Pending);
    });

    it("markDeadlineCompleted sets completedDate and status = Met", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      await complianceEngine.connect(systemRelay).markDeadlineCompleted(DEADLINE_ID);

      const dl = await complianceEngine.getDeadline(DEADLINE_ID);
      expect(dl.completedDate).to.be.gt(0);
      expect(dl.status).to.equal(DeadlineStatus.Met);
    });

    it("cannot complete already-completed deadline", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);
      await complianceEngine.connect(systemRelay).markDeadlineCompleted(DEADLINE_ID);

      await expect(
        complianceEngine.connect(systemRelay).markDeadlineCompleted(DEADLINE_ID),
      ).to.be.revertedWithCustomError(complianceEngine, "DeadlineAlreadyCompleted");
    });

    it("emits DeadlineCompleted and DeadlineStatusChanged on completion", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      const tx = complianceEngine.connect(systemRelay).markDeadlineCompleted(DEADLINE_ID);

      await expect(tx)
        .to.emit(complianceEngine, "DeadlineCompleted")
        .withArgs(DEADLINE_ID, orgSigner.address);

      await expect(tx)
        .to.emit(complianceEngine, "DeadlineStatusChanged")
        .withArgs(
          DEADLINE_ID,
          orgSigner.address,
          DeadlineStatus.Pending,
          DeadlineStatus.Met,
        );
    });

    it("Pending → Approaching succeeds", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      await expect(
        complianceEngine
          .connect(systemRelay)
          .updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Approaching),
      )
        .to.emit(complianceEngine, "DeadlineStatusChanged")
        .withArgs(
          DEADLINE_ID,
          orgSigner.address,
          DeadlineStatus.Pending,
          DeadlineStatus.Approaching,
        );

      const dl = await complianceEngine.getDeadline(DEADLINE_ID);
      expect(dl.status).to.equal(DeadlineStatus.Approaching);
    });

    it("Approaching → Overdue succeeds and creates 'deadline-missed' violation", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);
      const relay = complianceEngine.connect(systemRelay);

      await relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Approaching);

      const tx = relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Overdue);

      await expect(tx)
        .to.emit(complianceEngine, "ViolationRecorded")
        .withArgs(0, ethers.ZeroHash, orgSigner.address, "deadline-missed");

      const violation = await complianceEngine.getViolation(0);
      expect(violation.deadlineId).to.equal(DEADLINE_ID);
      expect(violation.ruleId).to.equal(ethers.ZeroHash);
      expect(violation.violationType).to.equal("deadline-missed");
    });

    it("Pending → Overdue succeeds directly (skipping Approaching) and creates violation", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      const tx = complianceEngine
        .connect(systemRelay)
        .updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Overdue);

      await expect(tx)
        .to.emit(complianceEngine, "DeadlineStatusChanged")
        .withArgs(
          DEADLINE_ID,
          orgSigner.address,
          DeadlineStatus.Pending,
          DeadlineStatus.Overdue,
        );

      await expect(tx)
        .to.emit(complianceEngine, "ViolationRecorded")
        .withArgs(0, ethers.ZeroHash, orgSigner.address, "deadline-missed");

      const dl = await complianceEngine.getDeadline(DEADLINE_ID);
      expect(dl.status).to.equal(DeadlineStatus.Overdue);
    });

    it("invalid transition (Overdue → Pending) reverts", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);
      const relay = complianceEngine.connect(systemRelay);

      await relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Approaching);
      await relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Overdue);

      await expect(
        relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Pending),
      ).to.be.revertedWithCustomError(complianceEngine, "InvalidDeadlineTransition");
    });

    it("Met deadline cannot have status updated", async function () {
      const { complianceEngine, orgSigner, systemRelay } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);
      await complianceEngine.connect(systemRelay).markDeadlineCompleted(DEADLINE_ID);

      await expect(
        complianceEngine
          .connect(systemRelay)
          .updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Overdue),
      ).to.be.revertedWithCustomError(complianceEngine, "DeadlineAlreadyCompleted");
    });

    it("getDeadlinesForOrg includes the deadline", async function () {
      const { complianceEngine, orgSigner } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      const deadlines = await complianceEngine.getDeadlinesForOrg(orgSigner.address);
      expect(deadlines).to.include(DEADLINE_ID);
    });

    it("unauthorized cannot create deadline", async function () {
      const { complianceEngine, orgSigner, unauthorized } = await loadFixture(deployFixture);
      const now = await time.latest();

      await expect(
        complianceEngine
          .connect(unauthorized)
          .createDeadline(DEADLINE_ID, orgSigner.address, "990", now + NINETY_DAYS),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });

    it("unauthorized cannot mark deadline completed", async function () {
      const { complianceEngine, orgSigner, unauthorized } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      await expect(
        complianceEngine.connect(unauthorized).markDeadlineCompleted(DEADLINE_ID),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });

    it("unauthorized cannot update deadline status", async function () {
      const { complianceEngine, orgSigner, unauthorized } = await loadFixture(deployFixture);
      await createTestDeadline(complianceEngine, orgSigner.address);

      await expect(
        complianceEngine
          .connect(unauthorized)
          .updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Approaching),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });

    it("cannot mark nonexistent deadline completed", async function () {
      const { complianceEngine, systemRelay } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));

      await expect(
        complianceEngine.connect(systemRelay).markDeadlineCompleted(fakeId),
      ).to.be.revertedWithCustomError(complianceEngine, "DeadlineNotFound");
    });

    it("cannot update nonexistent deadline status", async function () {
      const { complianceEngine, systemRelay } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));

      await expect(
        complianceEngine
          .connect(systemRelay)
          .updateDeadlineStatus(fakeId, DeadlineStatus.Approaching),
      ).to.be.revertedWithCustomError(complianceEngine, "DeadlineNotFound");
    });
  });

  // -----------------------------------------------------------------------
  //  Compliance Summary
  // -----------------------------------------------------------------------

  describe("Compliance Summary", function () {
    it("returns correct counts across rules, violations, and deadlines", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      const relay = complianceEngine.connect(systemRelay);
      const now = await time.latest();

      // 2 SpendingCap rules
      await complianceEngine.createRule(
        SPENDING_RULE_ID,
        orgSigner.address,
        admin.address,
        RuleType.SpendingCap,
        "Grant A",
        SPENDING_CAP,
        now,
        now + ONE_YEAR,
      );

      const rule2Id = ethers.keccak256(ethers.toUtf8Bytes("GRANT-B"));
      await complianceEngine.createRule(
        rule2Id,
        orgSigner.address,
        admin.address,
        RuleType.SpendingCap,
        "Grant B",
        10_000_000,
        now,
        now + ONE_YEAR,
      );

      // 1 OverheadRatio rule
      await complianceEngine.createRule(
        OVERHEAD_RULE_ID,
        orgSigner.address,
        admin.address,
        RuleType.OverheadRatio,
        "Overhead",
        OVERHEAD_MAX_BPS,
        now,
        INDEFINITE_END,
      );

      // Violate the spending rule (1 violation)
      await relay.reportValue(SPENDING_RULE_ID, SPENDING_CAP + 1);

      // Create and mark deadline overdue (1 violation)
      await complianceEngine.createDeadline(
        DEADLINE_ID,
        orgSigner.address,
        "990",
        now + NINETY_DAYS,
      );
      await relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Overdue);

      const [activeRules, totalViolations, overdueDeadlines] =
        await complianceEngine.getOrgComplianceSummary(orgSigner.address);

      expect(activeRules).to.equal(3);
      expect(totalViolations).to.equal(2); // spending + deadline
      expect(overdueDeadlines).to.equal(1);
    });
  });

  // -----------------------------------------------------------------------
  //  Rule Deactivation
  // -----------------------------------------------------------------------

  describe("Rule Deactivation", function () {
    it("admin can deactivate a rule", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await complianceEngine.deactivateRule(SPENDING_RULE_ID);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.active).to.be.false;
    });

    it("emits RuleDeactivated", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(complianceEngine.deactivateRule(SPENDING_RULE_ID))
        .to.emit(complianceEngine, "RuleDeactivated")
        .withArgs(SPENDING_RULE_ID);
    });

    it("deactivated rule rejects new value reports", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      await complianceEngine.deactivateRule(SPENDING_RULE_ID);

      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 1000),
      ).to.be.revertedWithCustomError(complianceEngine, "RuleNotActive");
    });

    it("rule data still readable after deactivation", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      await complianceEngine.deactivateRule(SPENDING_RULE_ID);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.org).to.equal(orgSigner.address);
      expect(rule.label).to.equal("Ford Foundation Grant #2026-417");
      expect(rule.active).to.be.false;
    });

    it("non-admin cannot deactivate", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.connect(systemRelay).deactivateRule(SPENDING_RULE_ID),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });
  });

  // -----------------------------------------------------------------------
  //  Manual Status Override
  // -----------------------------------------------------------------------

  describe("Manual Status Override", function () {
    it("admin can override Violated → Compliant", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      // Force Violated
      await complianceEngine
        .connect(systemRelay)
        .reportValue(SPENDING_RULE_ID, SPENDING_CAP + 1);
      expect((await complianceEngine.getRule(SPENDING_RULE_ID)).status).to.equal(
        RuleStatus.Violated,
      );

      await complianceEngine.updateRuleStatus(SPENDING_RULE_ID, RuleStatus.Compliant);
      expect((await complianceEngine.getRule(SPENDING_RULE_ID)).status).to.equal(
        RuleStatus.Compliant,
      );
    });

    it("system role can update status", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine
          .connect(systemRelay)
          .updateRuleStatus(SPENDING_RULE_ID, RuleStatus.AtRisk),
      )
        .to.emit(complianceEngine, "RuleStatusChanged")
        .withArgs(
          SPENDING_RULE_ID,
          orgSigner.address,
          RuleStatus.Compliant,
          RuleStatus.AtRisk,
        );
    });

    it("emits RuleStatusChanged", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine.updateRuleStatus(SPENDING_RULE_ID, RuleStatus.Violated),
      )
        .to.emit(complianceEngine, "RuleStatusChanged")
        .withArgs(
          SPENDING_RULE_ID,
          orgSigner.address,
          RuleStatus.Compliant,
          RuleStatus.Violated,
        );
    });

    it("unauthorized cannot update status", async function () {
      const { complianceEngine, orgSigner, admin, unauthorized } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await expect(
        complianceEngine
          .connect(unauthorized)
          .updateRuleStatus(SPENDING_RULE_ID, RuleStatus.Violated),
      ).to.be.revertedWithCustomError(complianceEngine, "Unauthorized");
    });

    it("cannot update status of nonexistent rule", async function () {
      const { complianceEngine } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));

      await expect(
        complianceEngine.updateRuleStatus(fakeId, RuleStatus.Violated),
      ).to.be.revertedWithCustomError(complianceEngine, "RuleNotFound");
    });

    it("cannot deactivate nonexistent rule", async function () {
      const { complianceEngine } = await loadFixture(deployFixture);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));

      await expect(
        complianceEngine.deactivateRule(fakeId),
      ).to.be.revertedWithCustomError(complianceEngine, "RuleNotFound");
    });
  });

  // -----------------------------------------------------------------------
  //  Cross-Contract Integration
  // -----------------------------------------------------------------------

  describe("Cross-Contract Integration", function () {
    it("deactivating org in AuditLedger prevents new rule creation", async function () {
      const { complianceEngine, auditLedger, orgSigner, admin } =
        await loadFixture(deployFixture);
      await auditLedger.deactivateOrganization(orgSigner.address);
      const now = await time.latest();

      await expect(
        complianceEngine.createRule(
          SPENDING_RULE_ID,
          orgSigner.address,
          admin.address,
          RuleType.SpendingCap,
          "Bad",
          SPENDING_CAP,
          now,
          now + ONE_YEAR,
        ),
      ).to.be.revertedWithCustomError(complianceEngine, "OrgNotActive");
    });

    it("existing rules for deactivated org still queryable", async function () {
      const { complianceEngine, auditLedger, orgSigner, admin } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await auditLedger.deactivateOrganization(orgSigner.address);

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.org).to.equal(orgSigner.address);
      expect(rule.active).to.be.true;
    });

    it("value can still be reported on existing rules for deactivated org", async function () {
      const { complianceEngine, auditLedger, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);

      await auditLedger.deactivateOrganization(orgSigner.address);

      // Rule was created when org was active — we track reality
      await expect(
        complianceEngine.connect(systemRelay).reportValue(SPENDING_RULE_ID, 5_000_000),
      ).to.not.be.reverted;

      const rule = await complianceEngine.getRule(SPENDING_RULE_ID);
      expect(rule.currentValue).to.equal(5_000_000);
    });
  });

  // -----------------------------------------------------------------------
  //  Multiple Rule Types for Same Org
  // -----------------------------------------------------------------------

  describe("Multiple Rule Types for Same Org", function () {
    it("one org can have SpendingCap + OverheadRatio + deadline simultaneously", async function () {
      const { complianceEngine, orgSigner, admin } = await loadFixture(deployFixture);

      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);
      await createTestDeadline(complianceEngine, orgSigner.address);

      const rules = await complianceEngine.getRulesForOrg(orgSigner.address);
      expect(rules.length).to.equal(2);

      const deadlines = await complianceEngine.getDeadlinesForOrg(orgSigner.address);
      expect(deadlines.length).to.equal(1);
    });

    it("violations from different rule types all appear in getViolationsForOrg", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      const relay = complianceEngine.connect(systemRelay);

      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);
      await createTestDeadline(complianceEngine, orgSigner.address);

      // Spending violation
      await relay.reportValue(SPENDING_RULE_ID, SPENDING_CAP + 1);

      // Overhead violation
      await relay.reportValue(OVERHEAD_RULE_ID, OVERHEAD_MAX_BPS + 1);

      // Deadline violation
      await relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Overdue);

      const orgViolations = await complianceEngine.getViolationsForOrg(orgSigner.address);
      expect(orgViolations.length).to.equal(3);

      // Verify types
      expect((await complianceEngine.getViolation(0)).violationType).to.equal(
        "spending-cap-breach",
      );
      expect((await complianceEngine.getViolation(1)).violationType).to.equal(
        "overhead-exceeded",
      );
      expect((await complianceEngine.getViolation(2)).violationType).to.equal(
        "deadline-missed",
      );
    });

    it("summary counts them all correctly", async function () {
      const { complianceEngine, orgSigner, admin, systemRelay } =
        await loadFixture(deployFixture);
      const relay = complianceEngine.connect(systemRelay);

      await createTestSpendingRule(complianceEngine, orgSigner.address, admin.address);
      await createTestOverheadRule(complianceEngine, orgSigner.address, admin.address);
      await createTestDeadline(complianceEngine, orgSigner.address);

      await relay.reportValue(SPENDING_RULE_ID, SPENDING_CAP + 1);
      await relay.reportValue(OVERHEAD_RULE_ID, OVERHEAD_MAX_BPS + 1);
      await relay.updateDeadlineStatus(DEADLINE_ID, DeadlineStatus.Overdue);

      const [activeRules, totalViolations, overdueDeadlines] =
        await complianceEngine.getOrgComplianceSummary(orgSigner.address);

      expect(activeRules).to.equal(2);
      expect(totalViolations).to.equal(3);
      expect(overdueDeadlines).to.equal(1);
    });
  });
});
