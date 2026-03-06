// Deploy ComplianceEngine behind a UUPS proxy, linked to AuditLedger, and grant
// SYSTEM_ROLE to the relay service.
// Usage: npx hardhat run scripts/deploy-compliance-engine.ts --network tallyview-testnet

import { ethers, upgrades } from "hardhat";

async function main() {
  const auditLedgerAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!auditLedgerAddress) {
    throw new Error("AUDIT_LEDGER_ADDRESS not set in environment");
  }
  const relayAddress = process.env.RELAY_ADDRESS;
  if (!relayAddress) {
    throw new Error("RELAY_ADDRESS not set in environment");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying ComplianceEngine with account:", deployer.address);
  console.log("Linked AuditLedger:", auditLedgerAddress);

  const ComplianceEngineFactory = await ethers.getContractFactory("ComplianceEngine");
  const complianceEngine = await upgrades.deployProxy(
    ComplianceEngineFactory,
    [auditLedgerAddress],
    { initializer: "initialize", kind: "uups" },
  );
  await complianceEngine.waitForDeployment();

  const proxyAddress = await complianceEngine.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  const tx = await complianceEngine.grantRole(SYSTEM_ROLE, relayAddress);
  await tx.wait();

  console.log("-------------------------------------------");
  console.log("ComplianceEngine deployed successfully");
  console.log("  Proxy:          ", proxyAddress);
  console.log("  Implementation: ", implAddress);
  console.log("  AuditLedger:    ", auditLedgerAddress);
  console.log("  Admin (deployer):", deployer.address);
  console.log("  System relay:   ", relayAddress);
  console.log("-------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
