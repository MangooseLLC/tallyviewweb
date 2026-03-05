// Register a test organization and submit a sample audit — for demo and live showcase.
// Usage: npx hardhat run scripts/register-test-org.ts --network tallyview-testnet

import { ethers } from "hardhat";

async function main() {
  const auditLedgerAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!auditLedgerAddress) {
    throw new Error("AUDIT_LEDGER_ADDRESS not set in environment");
  }
  const orgAddress = process.env.ORG_ADDRESS;
  if (!orgAddress) {
    throw new Error("ORG_ADDRESS not set in environment");
  }

  const auditLedger = await ethers.getContractAt("AuditLedger", auditLedgerAddress);
  const [signer] = await ethers.getSigners();
  console.log("Running with signer:", signer.address);

  // Ensure signer can submit audits (needs SYSTEM_ROLE if not the org itself)
  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  if (!(await auditLedger.hasRole(SYSTEM_ROLE, signer.address))) {
    const grantTx = await auditLedger.grantRole(SYSTEM_ROLE, signer.address);
    await grantTx.wait();
    console.log("Granted SYSTEM_ROLE to signer for demo submissions.");
  }

  // -- Register organization ------------------------------------------------

  const orgName = "lighthouse-academies";
  const einHash = ethers.solidityPackedKeccak256(["string"], ["12-3456789"]);

  console.log("\n1. Registering organization...");
  const regTx = await auditLedger.registerOrganization(orgAddress, orgName, einHash);
  await regTx.wait();
  console.log(`   Registered "${orgName}" → ${orgAddress}`);

  // -- Submit sample audit --------------------------------------------------

  const merkleRoot = ethers.solidityPackedKeccak256(["string"], ["lighthouse-jan-2026-financial-data"]);
  const schemaHash = ethers.solidityPackedKeccak256(["string"], ["tallyview-schema-v1"]);

  console.log("\n2. Submitting audit for January 2026...");
  const auditTx = await auditLedger.submitAudit(orgAddress, 2026, 1, merkleRoot, schemaHash);
  await auditTx.wait();
  console.log("   Audit submitted.");

  // -- Demonstrate name resolution ------------------------------------------

  console.log("\n3. Name resolution demo:");

  const resolved = await auditLedger.resolveByName("lighthouse-academies");
  console.log(`   resolveByName("lighthouse-academies") → ${resolved}`);

  const name = await auditLedger.nameOf(orgAddress);
  console.log(`   nameOf(${orgAddress}) → "${name}"`);

  // -- Read back the audit entry --------------------------------------------

  console.log("\n4. Reading audit entry:");

  const entry = await auditLedger.getAudit(orgAddress, 2026, 1);
  console.log(`   merkleRoot: ${entry.merkleRoot}`);
  console.log(`   schemaHash: ${entry.schemaHash}`);
  console.log(`   timestamp:  ${entry.timestamp} (${new Date(Number(entry.timestamp) * 1000).toISOString()})`);
  console.log(`   submitter:  ${entry.submitter}`);

  console.log("\n--- Demo complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
