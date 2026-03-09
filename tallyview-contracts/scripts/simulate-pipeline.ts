// Standalone SaaS-to-chain pipeline simulation.
// Mirrors lib/pipeline/ logic using ethers (no cross-project imports).
// Writes Apr, May, Jun 2026 data to avoid conflicting with existing on-chain records.
//
// Prerequisite: AuditLedger deployed with "lighthouse-academies" registered.
//               AnomalyRegistry deployed and linked to AuditLedger.
//               Signer must hold SYSTEM_ROLE on both contracts.
//
// Usage: npx hardhat run scripts/simulate-pipeline.ts --network fuji

import { ethers } from "hardhat";

async function main() {
  // ---------------------------------------------------------------------------
  //  Setup
  // ---------------------------------------------------------------------------

  const auditLedgerAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!auditLedgerAddress) throw new Error("AUDIT_LEDGER_ADDRESS not set");
  const anomalyRegistryAddress = process.env.ANOMALY_REGISTRY_ADDRESS;
  if (!anomalyRegistryAddress) throw new Error("ANOMALY_REGISTRY_ADDRESS not set");

  const auditLedger = await ethers.getContractAt("AuditLedger", auditLedgerAddress);
  const registry = await ethers.getContractAt("AnomalyRegistry", anomalyRegistryAddress);

  const [signer] = await ethers.getSigners();
  console.log("Pipeline simulation — signer:", signer.address);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));

  for (const contract of [auditLedger, registry]) {
    if (!(await contract.hasRole(SYSTEM_ROLE, signer.address))) {
      const tx = await contract.grantRole(SYSTEM_ROLE, signer.address);
      await tx.wait();
      console.log(`Granted SYSTEM_ROLE on ${await contract.getAddress()}`);
    }
  }

  const orgAddress = await auditLedger.resolveByName("lighthouse-academies");
  if (orgAddress === ethers.ZeroAddress) {
    throw new Error('"lighthouse-academies" not registered in AuditLedger');
  }
  console.log(`Resolved "lighthouse-academies" → ${orgAddress}\n`);

  // ---------------------------------------------------------------------------
  //  Mock financial data for Apr–Jun 2026
  // ---------------------------------------------------------------------------

  const months = [
    {
      year: 2026, month: 4, label: "Apr 2026",
      revenue: { grants: 415_000_00, donations: 78_000_00, programFees: 64_000_00, investment: 3_900_00 },
      expenses: { program: 388_000_00, management: 97_000_00, fundraising: 41_000_00 },
    },
    {
      year: 2026, month: 5, label: "May 2026",
      revenue: { grants: 405_000_00, donations: 82_000_00, programFees: 61_000_00, investment: 3_500_00 },
      expenses: { program: 392_000_00, management: 94_000_00, fundraising: 43_000_00 },
    },
    {
      year: 2026, month: 6, label: "Jun 2026",
      revenue: { grants: 430_000_00, donations: 95_000_00, programFees: 66_000_00, investment: 4_100_00 },
      expenses: { program: 401_000_00, management: 101_000_00, fundraising: 48_000_00 },
    },
  ];

  const SCHEMA_HASH = ethers.keccak256(
    ethers.toUtf8Bytes("tallyview-quickbooks-v1:revenue,expenses,vendors,balance")
  );

  // ---------------------------------------------------------------------------
  //  Step 1: Submit attestations for each month
  // ---------------------------------------------------------------------------

  console.log("========== STEP 1: Monthly Attestations ==========\n");

  for (const m of months) {
    const dataJson = JSON.stringify({
      revenue: m.revenue,
      expenses: m.expenses,
      month: `${m.year}-${String(m.month).padStart(2, "0")}`,
    });

    // NOTE: This is a simplified single-hash approach for the Hardhat demo script.
    // The production pipeline (lib/pipeline/hash.ts) builds a proper 4-leaf Merkle
    // tree (revenue, expenses, vendors, balance) so the roots will differ for the
    // same input data. This is intentional — the two code paths are independent.
    const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes(dataJson));

    const alreadySubmitted = await auditLedger.hasAuditForPeriod(orgAddress, m.year, m.month);
    if (alreadySubmitted) {
      console.log(`  ${m.label}: Already attested — skipping`);
      continue;
    }

    const tx = await auditLedger.submitAudit(orgAddress, m.year, m.month, merkleRoot, SCHEMA_HASH);
    const receipt = await tx.wait();
    console.log(`  ${m.label}: Attested — merkleRoot ${merkleRoot.slice(0, 18)}…`);
    console.log(`           tx: ${receipt?.hash}`);
  }

  // ---------------------------------------------------------------------------
  //  Step 2: Run anomaly detection and record findings
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 2: Anomaly Detection ==========\n");

  // Compute aggregate expense ratios for Q2
  const totalExpenses = months.reduce(
    (sum, m) => sum + m.expenses.program + m.expenses.management + m.expenses.fundraising,
    0
  );
  const totalMgmt = months.reduce((sum, m) => sum + m.expenses.management, 0);
  const totalProgram = months.reduce((sum, m) => sum + m.expenses.program, 0);
  const mgmtRatio = totalMgmt / totalExpenses;
  const programRatio = totalProgram / totalExpenses;

  console.log(`  Program ratio: ${(programRatio * 100).toFixed(1)}%`);
  console.log(`  Management ratio: ${(mgmtRatio * 100).toFixed(1)}%`);

  const ZERO_RULE = ethers.ZeroHash;
  const findings: Array<{
    severity: number;
    category: number;
    title: string;
    confidence: number;
    evidenceHash: string;
  }> = [];

  // Revenue spike check — Jun 2026 revenue vs Apr-May average
  const aprRevTotal = months[0].revenue.grants + months[0].revenue.donations + months[0].revenue.programFees + months[0].revenue.investment;
  const mayRevTotal = months[1].revenue.grants + months[1].revenue.donations + months[1].revenue.programFees + months[1].revenue.investment;
  const junRevTotal = months[2].revenue.grants + months[2].revenue.donations + months[2].revenue.programFees + months[2].revenue.investment;
  const avgRevAprMay = (aprRevTotal + mayRevTotal) / 2;
  const junDeviation = Math.abs(junRevTotal - avgRevAprMay) / avgRevAprMay;

  if (junDeviation > 0.15) {
    findings.push({
      severity: 2, // Medium
      category: 6, // RevenueAnomaly
      title: `Revenue spike in Jun 2026: ${(junDeviation * 100).toFixed(1)}% above prior 2-month average`,
      confidence: 7500,
      evidenceHash: ethers.keccak256(
        ethers.toUtf8Bytes(`pipeline-revenue-anomaly-jun2026-${junRevTotal}`)
      ),
    });
  }

  // Management ratio check
  if (mgmtRatio > 0.18) {
    findings.push({
      severity: 1, // Low
      category: 5, // ExpenseAllocation
      title: `Q2 2026 management expense ratio ${(mgmtRatio * 100).toFixed(1)}% — monitor for upward trend`,
      confidence: 7200,
      evidenceHash: ethers.keccak256(
        ethers.toUtf8Bytes(`pipeline-mgmt-ratio-q2-2026-${mgmtRatio}`)
      ),
    });
  }

  if (findings.length === 0) {
    console.log("  No anomalies detected for Q2 2026.\n");
  } else {
    for (const f of findings) {
      const tx = await registry.recordAnomaly(
        orgAddress,
        f.severity,
        f.category,
        f.title,
        f.confidence,
        f.evidenceHash,
        ZERO_RULE
      );
      await tx.wait();
      console.log(`  Recorded: [Sev ${f.severity}] ${f.title}`);
    }
  }

  // ---------------------------------------------------------------------------
  //  Step 3: Summary
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 3: Pipeline Summary ==========\n");

  const [latestYear, latestMonth, latestEntry] = await auditLedger.getLatestAudit(orgAddress);
  console.log(`  Latest attestation: ${latestYear}/${latestMonth}`);
  console.log(`  Merkle root: ${latestEntry.merkleRoot}`);
  console.log(`  Timestamp: ${new Date(Number(latestEntry.timestamp) * 1000).toISOString()}`);

  const [total, open, critical] = await registry.getOrgAnomalySummary(orgAddress);
  console.log(`\n  Anomaly summary: total=${total}, open=${open}, critical=${critical}`);

  const submissionCount = await auditLedger.getSubmissionCount(orgAddress);
  console.log(`  Total attestations: ${submissionCount}`);

  // 990 progress for 9 months (Oct-Jun)
  const monthsProcessed = 9;
  const completion = Math.min(95, Math.round((monthsProcessed / 12) * 100));
  console.log(`\n  990 progress: ${completion}% (${monthsProcessed} of 12 months)`);

  console.log("\n--- Pipeline simulation complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
