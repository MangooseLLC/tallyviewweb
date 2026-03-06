// Deploy EntityGraph behind a UUPS proxy, linked to AuditLedger, and grant
// SYSTEM_ROLE to the relay service.
// Usage: npx hardhat run scripts/deploy-entity-graph.ts --network tallyview-testnet

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
  console.log("Deploying EntityGraph with account:", deployer.address);
  console.log("Linked AuditLedger:", auditLedgerAddress);

  const EntityGraphFactory = await ethers.getContractFactory("EntityGraph");
  const entityGraph = await upgrades.deployProxy(
    EntityGraphFactory,
    [auditLedgerAddress],
    { initializer: "initialize", kind: "uups" },
  );
  await entityGraph.waitForDeployment();

  const proxyAddress = await entityGraph.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  const tx = await entityGraph.grantRole(SYSTEM_ROLE, relayAddress);
  await tx.wait();

  console.log("-------------------------------------------");
  console.log("EntityGraph deployed successfully");
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
