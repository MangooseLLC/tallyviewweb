// Demonstrate the full EvidenceVault investigation pipeline: whistleblower tip
// anchoring, multi-role evidence submission, stage progression, case sealing,
// and the chain-of-custody model that makes evidence admissible-grade.
//
// This demo walks through a complete investigation lifecycle from anonymous tip
// to sealed case, demonstrating all three roles: admin, system relay, regulator.
//
// Prerequisite: AuditLedger deployed with "lighthouse-academies" registered.
//               EvidenceVault deployed and linked to AuditLedger.
//               At least 5 signers available (admin, systemRelay, investigatorA,
//               investigatorB, regulatorSigner).
//
// Usage: npx hardhat run scripts/demo-evidence-lifecycle.ts --network tallyview-testnet

import { ethers } from "hardhat";

const StageName = [
  "Tip", "Analysis", "Discovery", "Filing", "Recovery", "Closed",
] as const;

async function main() {
  // ---------------------------------------------------------------------------
  //  Step 1 — Setup
  // ---------------------------------------------------------------------------

  const auditLedgerAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!auditLedgerAddress) throw new Error("AUDIT_LEDGER_ADDRESS not set");
  const evidenceVaultAddress = process.env.EVIDENCE_VAULT_ADDRESS;
  if (!evidenceVaultAddress) throw new Error("EVIDENCE_VAULT_ADDRESS not set");

  const auditLedger = await ethers.getContractAt("AuditLedger", auditLedgerAddress);
  const vault = await ethers.getContractAt("EvidenceVault", evidenceVaultAddress);

  const signers = await ethers.getSigners();
  const [admin, systemRelay, investigatorA, investigatorB, regulatorSigner] = signers;
  console.log("Running demo with signers:");
  console.log("  Admin (deployer):  ", admin.address);
  console.log("  System relay:      ", systemRelay.address);
  console.log("  Investigator A:    ", investigatorA.address);
  console.log("  Investigator B:    ", investigatorB.address);
  console.log("  Regulator:         ", regulatorSigner.address);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  const REGULATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGULATOR_ROLE"));

  if (!(await vault.hasRole(SYSTEM_ROLE, systemRelay.address))) {
    const tx = await vault.grantRole(SYSTEM_ROLE, systemRelay.address);
    await tx.wait();
    console.log("Granted SYSTEM_ROLE to system relay.");
  }

  if (!(await vault.hasRole(REGULATOR_ROLE, regulatorSigner.address))) {
    const tx = await vault.grantRole(REGULATOR_ROLE, regulatorSigner.address);
    await tx.wait();
    console.log("Granted REGULATOR_ROLE to regulator signer.");
  }

  const orgAddress = await auditLedger.resolveByName("lighthouse-academies");
  if (orgAddress === ethers.ZeroAddress) {
    throw new Error('"lighthouse-academies" not registered in AuditLedger');
  }
  console.log(`Resolved "lighthouse-academies" → ${orgAddress}`);

  // ---------------------------------------------------------------------------
  //  Step 2 — Create a case (as admin)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 2: Create Investigation Case ==========");

  const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-2026-UCHS"));
  const caseTitle =
    "Financial irregularities \u2014 CEO compensation and vendor concentration";

  let tx = await vault.createCase(
    caseId,
    orgAddress,
    caseTitle,
    investigatorA.address,
  );
  await tx.wait();
  console.log(`Opened case: ${caseTitle}`);
  console.log(`Lead investigator: ${investigatorA.address}`);

  // ---------------------------------------------------------------------------
  //  Step 3 — Authorize additional investigator (as regulator)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 3: Authorize Investigator ==========");

  tx = await vault.connect(regulatorSigner).authorizeInvestigator(
    caseId,
    investigatorB.address,
  );
  await tx.wait();
  console.log(`Regulator authorized investigator: ${investigatorB.address}`);

  // ---------------------------------------------------------------------------
  //  Step 4 — Submit evidence (demonstrating the pipeline)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 4: Submit Evidence ==========");

  // Evidence 1: Whistleblower tip (as system relay)
  const tipHash = ethers.keccak256(
    ethers.toUtf8Bytes("anonymous-tip-ceo-vendor-steering-2026"),
  );
  const tipTx = await vault.connect(systemRelay).submitEvidence(
    caseId,
    0, // EvidenceClassification.Tip
    "Anonymous tip: CEO steering contracts to spouse's company",
    tipHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
  );
  await tipTx.wait();
  const tipIndex = await vault.getEvidenceCount() - 1n;
  console.log(
    `  Submitted tip #${tipIndex} \u2014 tx hash: ${tipTx.hash} (serves as whistleblower receipt)`,
  );

  // Evidence 2: AI analysis report (as lead investigator)
  const analysisHash = ethers.keccak256(
    ethers.toUtf8Bytes("ai-evidence-brief-vendor-concentration-2026"),
  );
  const relatedAnomalyId = ethers.keccak256(
    ethers.toUtf8Bytes("anomaly-vendor-concentration-73pct"),
  );
  const analysisTx = await vault.connect(investigatorA).submitEvidence(
    caseId,
    2, // EvidenceClassification.AnalysisReport
    "AI-generated evidence brief \u2014 vendor concentration analysis",
    analysisHash,
    relatedAnomalyId,
    ethers.ZeroHash,
  );
  await analysisTx.wait();
  const analysisIndex = await vault.getEvidenceCount() - 1n;
  console.log(
    `  Submitted analysis #${analysisIndex} \u2014 linked to anomaly finding`,
  );

  // Evidence 3: Financial record (as investigatorB)
  const financialHash = ethers.keccak256(
    ethers.toUtf8Bytes("bank-records-related-party-payments-2026"),
  );
  const relatedEntityId = ethers.keccak256(
    ethers.toUtf8Bytes("entity-vendor-reeves-associates"),
  );
  const financialTx = await vault.connect(investigatorB).submitEvidence(
    caseId,
    1, // EvidenceClassification.FinancialRecord
    "Bank records showing payments to related-party vendor",
    financialHash,
    ethers.ZeroHash,
    relatedEntityId,
  );
  await financialTx.wait();
  const financialIndex = await vault.getEvidenceCount() - 1n;
  console.log(
    `  Submitted financial record #${financialIndex} \u2014 linked to entity graph`,
  );

  // ---------------------------------------------------------------------------
  //  Step 5 — Advance the investigation (as admin)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 5: Advance Investigation Stage ==========");

  // Tip → Analysis
  tx = await vault.updateCaseStage(caseId, 1); // InvestigationStage.Analysis
  await tx.wait();
  console.log(`  Stage: ${StageName[0]} \u2192 ${StageName[1]}`);

  // Analysis → Discovery
  tx = await vault.updateCaseStage(caseId, 2); // InvestigationStage.Discovery
  await tx.wait();
  console.log(`  Stage: ${StageName[1]} \u2192 ${StageName[2]}`);

  // ---------------------------------------------------------------------------
  //  Step 6 — Seal the case (as regulator)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 6: Seal Case ==========");

  tx = await vault.connect(regulatorSigner).sealCase(caseId);
  await tx.wait();
  console.log(
    "  Case sealed by regulator \u2014 evidence restricted to authorized parties",
  );

  // Submit one more evidence entry — should inherit Sealed status
  const sealedEvidenceHash = ethers.keccak256(
    ethers.toUtf8Bytes("post-seal-supplemental-analysis-2026"),
  );
  const sealedTx = await vault.connect(investigatorA).submitEvidence(
    caseId,
    2, // EvidenceClassification.AnalysisReport
    "Supplemental analysis after case sealed",
    sealedEvidenceHash,
    ethers.ZeroHash,
    ethers.ZeroHash,
  );
  await sealedTx.wait();
  const sealedIndex = await vault.getEvidenceCount() - 1n;
  const sealedEntry = await vault.getEvidence(sealedIndex);
  console.log(
    `  New evidence #${sealedIndex} automatically inherited Sealed status` +
    ` (sealStatus = ${Number(sealedEntry.sealStatus) === 1 ? "Sealed" : "Unsealed"})`,
  );

  // ---------------------------------------------------------------------------
  //  Step 7 — Summary
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 7: Investigation Summary ==========");

  const [evidenceCount, stage, isSealed] = await vault.getCaseSummary(caseId);
  console.log(`  Evidence count: ${evidenceCount}`);
  console.log(`  Stage:          ${StageName[Number(stage)]}`);
  console.log(`  Sealed:         ${isSealed}`);

  console.log(
    "\n  Investigation pipeline complete \u2014 all evidence timestamped with " +
    "cryptographic chain of custody",
  );
  console.log(
    "  4 evidence entries, each with provable timestamp, submitter identity, " +
    "and classification",
  );

  console.log("\n--- Demo complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
