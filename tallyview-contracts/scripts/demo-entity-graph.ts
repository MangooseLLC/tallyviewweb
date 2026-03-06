// Demonstrate EntityGraph's cross-organizational fraud detection capability:
// shared board members, shared vendors, and shared addresses across nonprofits.
//
// Prerequisite: AuditLedger deployed with "lighthouse-academies" registered
//               (from register-test-org.ts). EntityGraph deployed and linked
//               to AuditLedger. Signer must hold ADMIN_ROLE + SYSTEM_ROLE on
//               both AuditLedger and EntityGraph.
//
// Usage: npx hardhat run scripts/demo-entity-graph.ts --network tallyview-testnet

import { ethers } from "hardhat";

const EntityTypeName = ["Person", "Vendor", "Address"] as const;
const RelationshipTypeName = [
  "BoardMember", "Executive", "KeyEmployee", "VendorPayee",
  "RegisteredAddress", "MailingAddress", "RelatedParty", "Custom",
] as const;

async function main() {
  // ---------------------------------------------------------------------------
  //  Setup — resolve contracts and signers
  // ---------------------------------------------------------------------------

  const auditLedgerAddress = process.env.AUDIT_LEDGER_ADDRESS;
  if (!auditLedgerAddress) throw new Error("AUDIT_LEDGER_ADDRESS not set");
  const entityGraphAddress = process.env.ENTITY_GRAPH_ADDRESS;
  if (!entityGraphAddress) throw new Error("ENTITY_GRAPH_ADDRESS not set");

  const auditLedger = await ethers.getContractAt("AuditLedger", auditLedgerAddress);
  const entityGraph = await ethers.getContractAt("EntityGraph", entityGraphAddress);

  const signers = await ethers.getSigners();
  const [admin, signerB, signerC] = signers;
  console.log("Running demo with admin:", admin.address);

  const SYSTEM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_ROLE"));

  // Ensure admin has required roles on both contracts
  if (!(await auditLedger.hasRole(SYSTEM_ROLE, admin.address))) {
    const tx = await auditLedger.grantRole(SYSTEM_ROLE, admin.address);
    await tx.wait();
    console.log("Granted SYSTEM_ROLE on AuditLedger to admin.");
  }
  if (!(await entityGraph.hasRole(SYSTEM_ROLE, admin.address))) {
    const tx = await entityGraph.grantRole(SYSTEM_ROLE, admin.address);
    await tx.wait();
    console.log("Granted SYSTEM_ROLE on EntityGraph to admin.");
  }

  // Resolve lighthouse-academies (assumed pre-registered)
  const orgA = await auditLedger.resolveByName("lighthouse-academies");
  if (orgA === ethers.ZeroAddress) {
    throw new Error('"lighthouse-academies" not registered in AuditLedger');
  }
  console.log(`Resolved "lighthouse-academies" → ${orgA}`);

  // Register orgB and orgC explicitly for this demo
  const orgB = signerB.address;
  const orgC = signerC.address;

  const einHashB = ethers.solidityPackedKeccak256(["string"], ["98-7654321"]);
  const einHashC = ethers.solidityPackedKeccak256(["string"], ["55-1234567"]);

  if (!(await auditLedger.isOrganizationRegistered(orgB))) {
    const tx = await auditLedger.registerOrganization(orgB, "northwest-community-health", einHashB);
    await tx.wait();
    console.log(`Registered "northwest-community-health" → ${orgB}`);
  } else {
    console.log(`"northwest-community-health" already registered → ${orgB}`);
  }

  if (!(await auditLedger.isOrganizationRegistered(orgC))) {
    const tx = await auditLedger.registerOrganization(orgC, "pacific-youth-services", einHashC);
    await tx.wait();
    console.log(`Registered "pacific-youth-services" → ${orgC}`);
  } else {
    console.log(`"pacific-youth-services" already registered → ${orgC}`);
  }

  const now = (await ethers.provider.getBlock("latest"))!.timestamp;

  // ---------------------------------------------------------------------------
  //  Step 1 — Create entities (as system relay)
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 1: Create Entities ==========");

  const personEntityId = ethers.keccak256(ethers.toUtf8Bytes("person-john-reeves"));
  const vendorEntityId = ethers.keccak256(ethers.toUtf8Bytes("vendor-reeves-associates"));
  const addressEntityId = ethers.keccak256(ethers.toUtf8Bytes("addr-1847-nw-flanders"));

  const personIdentityHash = ethers.keccak256(ethers.toUtf8Bytes("john-reeves-1965-03-15"));
  const vendorIdentityHash = ethers.keccak256(ethers.toUtf8Bytes("reeves-associates-llc-47-1234567"));
  const addressIdentityHash = ethers.keccak256(ethers.toUtf8Bytes("1847-nw-flanders-st-portland-or-97209"));

  let tx = await entityGraph.createEntity(
    personEntityId,
    0, // EntityType.Person
    personIdentityHash,
    "John Reeves",
  );
  await tx.wait();

  tx = await entityGraph.createEntity(
    vendorEntityId,
    1, // EntityType.Vendor
    vendorIdentityHash,
    "Reeves & Associates LLC",
  );
  await tx.wait();

  tx = await entityGraph.createEntity(
    addressEntityId,
    2, // EntityType.Address
    addressIdentityHash,
    "1847 NW Flanders St, Portland OR",
  );
  await tx.wait();

  console.log("  Created 3 entities: 1 person, 1 vendor, 1 address");

  // ---------------------------------------------------------------------------
  //  Step 2 — Create relationship edges
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 2: Create Relationship Edges ==========");

  const edges = [
    {
      edgeId: ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-lighthouse-board")),
      entityId: personEntityId,
      org: orgA,
      relType: 0, // BoardMember
      entityLabel: "John Reeves",
      orgName: "lighthouse-academies",
    },
    {
      edgeId: ethers.keccak256(ethers.toUtf8Bytes("edge-reeves-nwhealth-board")),
      entityId: personEntityId,
      org: orgB,
      relType: 0, // BoardMember
      entityLabel: "John Reeves",
      orgName: "northwest-community-health",
    },
    {
      edgeId: ethers.keccak256(ethers.toUtf8Bytes("edge-vendor-lighthouse-payee")),
      entityId: vendorEntityId,
      org: orgA,
      relType: 3, // VendorPayee
      entityLabel: "Reeves & Associates LLC",
      orgName: "lighthouse-academies",
    },
    {
      edgeId: ethers.keccak256(ethers.toUtf8Bytes("edge-vendor-nwhealth-payee")),
      entityId: vendorEntityId,
      org: orgB,
      relType: 3, // VendorPayee
      entityLabel: "Reeves & Associates LLC",
      orgName: "northwest-community-health",
    },
    {
      edgeId: ethers.keccak256(ethers.toUtf8Bytes("edge-addr-lighthouse-registered")),
      entityId: addressEntityId,
      org: orgA,
      relType: 4, // RegisteredAddress
      entityLabel: "1847 NW Flanders St, Portland OR",
      orgName: "lighthouse-academies",
    },
    {
      edgeId: ethers.keccak256(ethers.toUtf8Bytes("edge-addr-nwhealth-registered")),
      entityId: addressEntityId,
      org: orgB,
      relType: 4, // RegisteredAddress
      entityLabel: "1847 NW Flanders St, Portland OR",
      orgName: "northwest-community-health",
    },
  ];

  const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("demo-evidence-entity-graph"));

  for (const e of edges) {
    tx = await entityGraph.createEdge(
      e.edgeId,
      e.entityId,
      e.org,
      e.relType,
      now,
      evidenceHash,
    );
    await tx.wait();
    console.log(`  Linked ${e.entityLabel} to ${e.orgName} as ${RelationshipTypeName[e.relType]}`);
  }

  // ---------------------------------------------------------------------------
  //  Step 3 — Cross-organizational queries
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 3: Cross-Organizational Queries ==========");

  const personOrgs = await entityGraph.getOrgsForEntity(personEntityId);
  console.log(`  John Reeves serves on ${personOrgs.length} organization boards`);

  const vendorOrgs = await entityGraph.getOrgsForEntity(vendorEntityId);
  console.log(`  Reeves & Associates receives payments from ${vendorOrgs.length} organizations`);

  const sharedEntities = await entityGraph.getSharedEntities(orgA, orgB);
  console.log(
    `  lighthouse-academies and northwest-community-health share ${sharedEntities.length} entities`,
  );

  for (const eid of sharedEntities) {
    const entity = await entityGraph.getEntity(eid);
    console.log(`    - ${entity.label} (${EntityTypeName[Number(entity.entityType)]})`);
  }

  const sharedWithC = await entityGraph.getSharedEntities(orgA, orgC);
  console.log(
    `  lighthouse-academies and pacific-youth-services share ${sharedWithC.length} entities (clean org)`,
  );

  const [totalEdges, activeEdges, uniqueEntities] = await entityGraph.getOrgGraphSummary(orgA);
  console.log(`\n  Graph summary for lighthouse-academies:`);
  console.log(`    Total edges:      ${totalEdges}`);
  console.log(`    Active edges:     ${activeEdges}`);
  console.log(`    Unique entities:  ${uniqueEntities}`);

  // ---------------------------------------------------------------------------
  //  Step 4 — Narrative conclusion
  // ---------------------------------------------------------------------------

  console.log("\n========== STEP 4: Fraud Signal ==========");
  console.log(
    "  FRAUD SIGNAL: Board member John Reeves governs both organizations and controls " +
    "Reeves & Associates LLC, which receives payments from both. All entities share " +
    "the same registered address.",
  );

  console.log("\n--- Demo complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
