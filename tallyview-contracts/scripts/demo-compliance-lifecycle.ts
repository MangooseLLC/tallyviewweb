// Demonstrate the full ComplianceEngine lifecycle: rule creation, value reporting,
// automatic status transitions, deadline tracking, and violation recording.
//
// Prerequisite: AuditLedger deployed with "lighthouse-academies" registered.
//               ComplianceEngine deployed and linked to AuditLedger.
//               Signer must hold ADMIN_ROLE + SYSTEM_ROLE on ComplianceEngine.
//
// Usage: npx hardhat run scripts/demo-compliance-lifecycle.ts --network tallyview-testnet

import { ethers } from "hardhat";

const RuleStatus = ["Compliant", "AtRisk", "Violated"] as const;

async function main() {
  // ---------------------------------------------------------------------------
  //  Step 1 — Setup
  // ---------------------------------------------------------------------------

  const auditLedgerAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!auditLedgerAddress) throw new Error("AUDIT_LEDGER_ADDRESS not set");
  const complianceEngineAddress = process.env.COMPLIANCE_ENGINE_ADDRESS;
  if (!complianceEngineAddress) throw new Error("COMPLIANCE_ENGINE_ADDRESS not set");

  const auditLedger = await ethers.getContractAt("AuditLedger", auditLedgerAddress);
  const engine = await ethers.getContractAt("ComplianceEngine", complianceEngineAddress);

  const [signer] = await ethers.getSigners();
  console.log("Running demo with signer:", signer.address);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  if (!(await engine.hasRole(SYSTEM_ROLE, signer.address))) {
    const tx = await engine.grantRole(SYSTEM_ROLE, signer.address);
    await tx.wait();
    console.log("Granted SYSTEM_ROLE to signer for demo.");
  }

  const orgAddress = await auditLedger.resolveByName("lighthouse-academies");
  if (orgAddress === ethers.ZeroAddress) {
    throw new Error('"lighthouse-academies" not registered in AuditLedger');
  }
  console.log(`Resolved "lighthouse-academies" → ${orgAddress}`);

  const now = (await ethers.provider.getBlock("latest"))!.timestamp;

  // ---------------------------------------------------------------------------
  //  Step 2 — Create a restricted fund rule (SpendingCap)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 2: Restricted Fund Rule ==========");

  const SPENDING_RULE_ID = ethers.keccak256(ethers.toUtf8Bytes("FORD-GRANT-2026-417"));
  const SPENDING_CAP = 15_000_000; // $150,000.00 in cents
  const startDate = now;
  const endDate = now + 365 * 24 * 60 * 60; // 12-month period

  let tx = await engine.createRule(
    SPENDING_RULE_ID,
    orgAddress,
    signer.address,           // setBy — demo uses signer as the funder
    0,                         // RuleType.SpendingCap
    "Ford Foundation Grant #2026-417 \u2014 Youth Workforce Program",
    SPENDING_CAP,
    startDate,
    endDate,
  );
  await tx.wait();
  console.log("Created spending rule: $150,000 cap for Ford Foundation grant");

  // ---------------------------------------------------------------------------
  //  Step 3 — Create an overhead ratio rule (OverheadRatio, indefinite)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 3: Overhead Ratio Rule ==========");

  const OVERHEAD_RULE_ID = ethers.keccak256(ethers.toUtf8Bytes("BOARD-OVERHEAD-CEILING"));
  const OVERHEAD_MAX_BPS = 1500; // 15%

  tx = await engine.createRule(
    OVERHEAD_RULE_ID,
    orgAddress,
    signer.address,
    1,                         // RuleType.OverheadRatio
    "Board-mandated administrative cost ceiling",
    OVERHEAD_MAX_BPS,
    startDate,
    0,                         // indefinite — no expiration
  );
  await tx.wait();
  console.log("Created overhead rule: 15% max admin costs (indefinite)");

  // ---------------------------------------------------------------------------
  //  Step 4 — Create a 990 filing deadline
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 4: 990 Filing Deadline ==========");

  const DEADLINE_ID = ethers.keccak256(ethers.toUtf8Bytes("990-FY2025"));
  const dueDate = now + 180 * 24 * 60 * 60; // ~6 months from now

  tx = await engine.createDeadline(DEADLINE_ID, orgAddress, "990", dueDate);
  await tx.wait();
  console.log(
    `Created 990 filing deadline (due ${new Date(dueDate * 1000).toISOString().slice(0, 10)})`,
  );

  // ---------------------------------------------------------------------------
  //  Step 5 — Report spending lifecycle
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 5: Spending Reports ==========");

  // Report $45,000 → Compliant, 30%
  tx = await engine.reportValue(SPENDING_RULE_ID, 4_500_000);
  await tx.wait();
  let rule = await engine.getRule(SPENDING_RULE_ID);
  console.log(
    `  Reported $45,000  → status: ${RuleStatus[Number(rule.status)]}, ` +
    `${((Number(rule.currentValue) / SPENDING_CAP) * 100).toFixed(0)}% of cap ` +
    `($${(Number(rule.currentValue) / 100).toLocaleString()} / $${(SPENDING_CAP / 100).toLocaleString()})`,
  );

  // Report $95,000 → AtRisk, ~93%
  tx = await engine.reportValue(SPENDING_RULE_ID, 9_500_000);
  await tx.wait();
  rule = await engine.getRule(SPENDING_RULE_ID);
  console.log(
    `  Reported $95,000  → status: ${RuleStatus[Number(rule.status)]}, ` +
    `${((Number(rule.currentValue) / SPENDING_CAP) * 100).toFixed(0)}% of cap ` +
    `($${(Number(rule.currentValue) / 100).toLocaleString()} / $${(SPENDING_CAP / 100).toLocaleString()})`,
  );

  // Report $20,000 → Violated, ~107%
  tx = await engine.reportValue(SPENDING_RULE_ID, 2_000_000);
  await tx.wait();
  rule = await engine.getRule(SPENDING_RULE_ID);
  const violationCount = await engine.getViolationCount();
  console.log(
    `  Reported $20,000  → status: ${RuleStatus[Number(rule.status)]}, ` +
    `${((Number(rule.currentValue) / SPENDING_CAP) * 100).toFixed(0)}% of cap ` +
    `($${(Number(rule.currentValue) / 100).toLocaleString()} / $${(SPENDING_CAP / 100).toLocaleString()}) ` +
    `— auto-violation created (#${Number(violationCount) - 1})`,
  );

  // ---------------------------------------------------------------------------
  //  Step 6 — Report overhead ratio
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 6: Overhead Ratio Reports ==========");

  // Report 12% (1200 bps) → Compliant
  tx = await engine.reportValue(OVERHEAD_RULE_ID, 1200);
  await tx.wait();
  let overhead = await engine.getRule(OVERHEAD_RULE_ID);
  console.log(
    `  Reported 12.00% (1200 bps) → status: ${RuleStatus[Number(overhead.status)]}`,
  );

  // Report 15.01% (1501 bps) → Violated
  tx = await engine.reportValue(OVERHEAD_RULE_ID, 1501);
  await tx.wait();
  overhead = await engine.getRule(OVERHEAD_RULE_ID);
  const overheadViolations = await engine.getViolationsForRule(OVERHEAD_RULE_ID);
  console.log(
    `  Reported 15.01% (1501 bps) → status: ${RuleStatus[Number(overhead.status)]} ` +
    `— auto-violation created (#${overheadViolations[overheadViolations.length - 1]})`,
  );

  // ---------------------------------------------------------------------------
  //  Step 7 — Compliance summary
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 7: Compliance Summary ==========");

  const [activeRules, totalViolations, overdueDeadlines] =
    await engine.getOrgComplianceSummary(orgAddress);

  console.log(`  Organization:       lighthouse-academies (${orgAddress})`);
  console.log(`  Active rules:       ${activeRules}`);
  console.log(`  Total violations:   ${totalViolations}`);
  console.log(`  Overdue deadlines:  ${overdueDeadlines}`);

  console.log("\n--- Demo complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
