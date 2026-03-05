// Deploy AuditLedger behind a UUPS proxy and grant SYSTEM_ROLE to the relay.
// Usage: npx hardhat run scripts/deploy-audit-ledger.ts --network tallyview-testnet

import { ethers, upgrades } from "hardhat";

async function main() {
  const relayAddress = process.env.RELAY_ADDRESS;
  if (!relayAddress) {
    throw new Error("RELAY_ADDRESS not set in environment");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying AuditLedger with account:", deployer.address);

  const AuditLedgerFactory = await ethers.getContractFactory("AuditLedger");
  const auditLedger = await upgrades.deployProxy(AuditLedgerFactory, [true], {
    initializer: "initialize",
    kind: "uups",
  });
  await auditLedger.waitForDeployment();

  const proxyAddress = await auditLedger.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));
  const tx = await auditLedger.grantRole(SYSTEM_ROLE, relayAddress);
  await tx.wait();

  console.log("-------------------------------------------");
  console.log("AuditLedger deployed successfully");
  console.log("  Proxy:          ", proxyAddress);
  console.log("  Implementation: ", implAddress);
  console.log("  Admin (deployer):", deployer.address);
  console.log("  System relay:   ", relayAddress);
  console.log("-------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
