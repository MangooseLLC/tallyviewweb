// Deploy EvidenceVault behind a UUPS proxy, linked to AuditLedger, and grant
// SYSTEM_ROLE to the relay service.
// Usage: npx hardhat run scripts/deploy-evidence-vault.ts --network tallyview-testnet

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
  console.log("Deploying EvidenceVault with account:", deployer.address);
  console.log("Linked AuditLedger:", auditLedgerAddress);

  const EvidenceVaultFactory = await ethers.getContractFactory("EvidenceVault");
  const evidenceVault = await upgrades.deployProxy(
    EvidenceVaultFactory,
    [auditLedgerAddress],
    { initializer: "initialize", kind: "uups" },
  );
  await evidenceVault.waitForDeployment();

  const proxyAddress = await evidenceVault.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  const tx = await evidenceVault.grantRole(SYSTEM_ROLE, relayAddress);
  await tx.wait();

  console.log("-------------------------------------------");
  console.log("EvidenceVault deployed successfully");
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
