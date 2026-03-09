import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!proxyAddress) throw new Error("AUDIT_LEDGER_ADDRESS not set");

  const [deployer] = await ethers.getSigners();
  console.log("Upgrading AuditLedger with account:", deployer.address);

  const AuditLedgerV2 = await ethers.getContractFactory("AuditLedger");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, AuditLedgerV2);
  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Proxy:", proxyAddress);
  console.log("New implementation:", newImpl);

  const tx = await upgraded.setAvalancheMode(false);
  await tx.wait();
  console.log("Set avalancheMode = false (Fuji C-Chain has no TxAllowList)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
