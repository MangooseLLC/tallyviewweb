// Demonstrate the full AnomalyRegistry lifecycle: recording AI-detected findings,
// reviewing, resolving, escalating, and the forward-only status enforcement that
// prevents suppression.
//
// Prerequisite: AuditLedger deployed with "lighthouse-academies" registered.
//               AnomalyRegistry deployed and linked to AuditLedger.
//               Signer must hold ADMIN_ROLE + SYSTEM_ROLE on AnomalyRegistry.
//
// Usage: npx hardhat run scripts/demo-anomaly-lifecycle.ts --network tallyview-testnet

import { ethers } from "hardhat";

const Severity = ["Info", "Low", "Medium", "High", "Critical"] as const;
const Category = [
  "FinancialHealth", "Governance", "FraudPattern", "CompensationOutlier",
  "VendorConcentration", "ExpenseAllocation", "RevenueAnomaly", "RelatedParty",
  "DocumentProvenance", "Custom",
] as const;

async function main() {
  // ---------------------------------------------------------------------------
  //  Step 1 — Setup
  // ---------------------------------------------------------------------------

  const auditLedgerAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!auditLedgerAddress) throw new Error("AUDIT_LEDGER_ADDRESS not set");
  const anomalyRegistryAddress = process.env.ANOMALY_REGISTRY_ADDRESS;
  if (!anomalyRegistryAddress) throw new Error("ANOMALY_REGISTRY_ADDRESS not set");

  const auditLedger = await ethers.getContractAt("AuditLedger", auditLedgerAddress);
  const registry = await ethers.getContractAt("AnomalyRegistry", anomalyRegistryAddress);

  const [signer] = await ethers.getSigners();
  console.log("Running demo with signer:", signer.address);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  if (!(await registry.hasRole(SYSTEM_ROLE, signer.address))) {
    const tx = await registry.grantRole(SYSTEM_ROLE, signer.address);
    await tx.wait();
    console.log("Granted SYSTEM_ROLE to signer for demo.");
  }

  const orgAddress = await auditLedger.resolveByName("lighthouse-academies");
  if (orgAddress === ethers.ZeroAddress) {
    throw new Error('"lighthouse-academies" not registered in AuditLedger');
  }
  console.log(`Resolved "lighthouse-academies" → ${orgAddress}`);

  const ZERO_RULE = ethers.ZeroHash;

  // ---------------------------------------------------------------------------
  //  Step 2 — Record anomalies (as system relay)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 2: Record Anomalies ==========");

  const anomalies = [
    {
      severity: 3,  // High
      category: 3,  // CompensationOutlier
      title: "CEO total compensation exceeds peer benchmark by 340%",
      confidence: 9200,
      evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("evidence-compensation-outlier")),
    },
    {
      severity: 2,  // Medium
      category: 5,  // ExpenseAllocation
      title: "Program expense ratio dropped 12 points year-over-year",
      confidence: 7800,
      evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("evidence-expense-allocation")),
    },
    {
      severity: 4,  // Critical
      category: 2,  // FraudPattern
      title: "Vendor concentration: 73% of payments to single unverified vendor",
      confidence: 8800,
      evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("evidence-vendor-concentration")),
    },
  ];

  for (let i = 0; i < anomalies.length; i++) {
    const a = anomalies[i];
    const tx = await registry.recordAnomaly(
      orgAddress,
      a.severity,
      a.category,
      a.title,
      a.confidence,
      a.evidenceHash,
      ZERO_RULE,
    );
    await tx.wait();
    console.log(`  Recorded anomaly #${i}: ${Severity[a.severity]} ${Category[a.category]}`);
  }

  // ---------------------------------------------------------------------------
  //  Step 3 — Review (as admin)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 3: Review Anomalies ==========");

  const reviewNote0 = ethers.keccak256(ethers.toUtf8Bytes("review-note-compensation"));
  let tx = await registry.reviewAnomaly(0, reviewNote0);
  await tx.wait();
  console.log(`  Reviewed anomaly #0 — reviewer: ${signer.address}`);

  const reviewNote2 = ethers.keccak256(ethers.toUtf8Bytes("review-note-vendor"));
  tx = await registry.reviewAnomaly(2, reviewNote2);
  await tx.wait();
  console.log(`  Reviewed anomaly #2 — reviewer: ${signer.address}`);

  // ---------------------------------------------------------------------------
  //  Step 4 — Resolve and Escalate
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 4: Resolve & Escalate ==========");

  const resolveNote = ethers.keccak256(
    ethers.toUtf8Bytes("compensation within board-approved range after review"),
  );
  tx = await registry.resolveAnomaly(0, resolveNote);
  await tx.wait();
  console.log("  Resolved anomaly #0 — false positive after review");

  const escalateNote = ethers.keccak256(
    ethers.toUtf8Bytes("vendor concentration warrants investigation"),
  );
  tx = await registry.escalateAnomaly(2, escalateNote);
  await tx.wait();
  console.log("  Escalated anomaly #2 — referred for investigation");

  // ---------------------------------------------------------------------------
  //  Step 5 — Try invalid transition (demonstrate forward-only)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 5: Forward-Only Enforcement ==========");

  try {
    const dummyNote = ethers.keccak256(ethers.toUtf8Bytes("attempt-re-review"));
    const reTx = await registry.reviewAnomaly(0, dummyNote);
    await reTx.wait();
    console.log("  ERROR: re-review should have reverted");
  } catch {
    console.log(
      "  Cannot re-review anomaly #0 — status is Resolved (forward-only lifecycle)",
    );
  }

  // ---------------------------------------------------------------------------
  //  Step 6 — Summary
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 6: Anomaly Summary ==========");

  const [total, open, critical] = await registry.getOrgAnomalySummary(orgAddress);
  console.log(`  Total: ${total}, Open: ${open}, Critical: ${critical}`);
  console.log("  (anomaly #1 = New, #0 = Resolved, #2 = Escalated)");
  console.log("  Expected: total = 3, open = 1 (anomaly #1 is New), critical = 1");

  console.log("\n--- Demo complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
