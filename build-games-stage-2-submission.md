# Tallyview — Build Games Stage 2 Submission

---

## TECHNICAL DOCUMENTATION

**Tech Stack:**
Next.js 14 (App Router) / React 18 / Radix UI primitives / Tailwind CSS for the SaaS intelligence layer. Supabase (Postgres via Prisma, Auth with OTP) for offchain data. Smart contracts deployed to Avalanche Fuji C-Chain testnet, with architecture designed for migration to a purpose-built Avalanche L1 (Subnet-EVM). Solidity smart contracts built with Hardhat, TypeScript, ethers v6, OpenZeppelin v5.1 UUPS upgradeable proxies, and Chai for testing. Frontend reads onchain data via viem — no wallet required for end users. A backend relay wallet with SYSTEM_ROLE submits all onchain transactions on behalf of nonprofits; nonprofits never interact with wallets, gas, or private keys.

**Architecture Decisions:**

Hybrid onchain/offchain by design. Raw accounting data stays offchain for privacy and computational efficiency. Cryptographic attestations, compliance states, anomaly findings, relationship graphs, and investigation evidence go onchain for immutable verification. This separation means the AI detection engine can iterate rapidly (new models, better fraud typologies, updated training data) without requiring contract upgrades. The chain is pure record-keeping and enforcement; the SaaS layer handles all analysis and user experience.

We target a purpose-built Avalanche L1 over Ethereum mainnet (too expensive), L2s (shared congestion, no sovereignty), and Hyperledger (no public verifiability). Avalanche9000 makes this economically viable — full mainnet deployment runs ~$1,500-5,000/month, comparable to standard SaaS hosting costs. For this phase, contracts are deployed to Avalanche Fuji C-Chain (shared testnet) to validate the architecture. The contract system includes TxAllowList precompile integration for the future L1, currently disabled on Fuji. Migration to a sovereign L1 with controlled gas costs, validator sets, permissioning, and governance is the planned next phase (see `tallyview-avalanche-l1-strategy.md`).

Five core Solidity contracts, all UUPS upgradeable:

1. **AuditLedger** — Immutable financial timeline. Nonprofits (via relay) submit Merkle roots of monthly financial data. Creates a tamper-proof record: "Organization X's books looked like THIS on date Y." Also handles organization identity with address-based resolution and human-readable name mapping (`resolveByName` → address, `nameOf` → string). Includes optional TxAllowList precompile integration for L1 deployment, toggled via `avalancheMode`. Foundation contract that all other contracts reference for org validation.

2. **ComplianceEngine** — Active enforcement layer. Encodes compliance rules as onchain logic: restricted fund spending caps, overhead ratio thresholds, filing deadlines. When a value crosses a threshold, the contract doesn't revert — it records the breach, transitions status to Violated, and creates a violation record. Uses an `AT_RISK_THRESHOLD_BPS` (90%) for automatic Compliant → AtRisk → Violated transitions. Compliance is tracked, not gatekept.

3. **AnomalyRegistry** — Immutable record of AI-detected findings. Forward-only status lifecycle (New → Reviewed → Resolved/Escalated), enforced by `InvalidStatusTransition` revert. Anomalies cannot be deleted or hidden. A nonprofit board cannot pressure staff to make a finding disappear. The AI detection logic stays offchain; only the finding and its metadata are committed onchain. SYSTEM_ROLE can record and escalate but cannot resolve its own findings — separation of powers by design (resolve is ADMIN/REVIEWER only).

4. **EntityGraph** — Cross-organizational relationship mapping. Stores relationship edges between entities (people, vendors, addresses as identity hashes) across multiple organizations. `getSharedEntities(orgA, orgB)` returns shared entity IDs via two-pass comparison — the query that powers conflict-of-interest detection. This is the capability no single-tenant accounting system can replicate.

5. **EvidenceVault** — Investigation evidence with cryptographic chain-of-custody. Evidence metadata is hashed and anchored onchain with classification, timestamps, and submitter identity. Supports the full investigation pipeline: Tip → Analysis → Discovery → Filing → Recovery → Closed. Sealing is forward-only. Per-case access control maps to real investigation workflows (lead investigator, authorized investigators, ADMIN, SYSTEM). Closing and sealing are independent lifecycle events.

**Implementation approach:** Contracts use monotonic array indices (not hashed IDs) for violations, anomalies, and evidence entries to guarantee uniqueness across same-block events. ComplianceEngine uses a generic ComplianceRule abstraction with a RuleType enum rather than being grant-specific. All contracts use OpenZeppelin `AccessControlUpgradeable` for role-based permissioning and share a common type library (`TallyviewTypes.sol`) with full interface files for each contract.

---

## ARCHITECTURE DESIGN OVERVIEW

**System architecture: three layers**

Layer 1 — Data Ingestion (Offchain): Tallyview currently connects to QuickBooks Online via direct Intuit OAuth2. The nonprofit connects in under 5 minutes via a one-click OAuth flow. A sync service pulls financial data (accounts, invoices, bills, purchases, journal entries), runs it through the AI analysis pipeline (OpenAI-powered 990 category mapping, rule-based anomaly detection, peer benchmarking), and generates cryptographic attestations (Merkle roots). The architecture is designed to expand to additional accounting platforms (Xero, Sage, NetSuite, FreshBooks) via unified API providers (Codat, Merge, Apideck) — the pipeline data format is already shaped for Codat-normalized responses.

Layer 2 — SaaS Intelligence Layer (Offchain): Next.js application with four persona-specific dashboards. Nonprofit dashboard: compliance status, 990 progress, board-ready reports, anomaly alerts, restricted fund tracking, audit prep. Foundation dashboard: portfolio-wide grantee health, risk scoring, peer benchmarking, proactive alerts. Regulator dashboard: jurisdiction-wide risk map, prioritized investigation queue, connected entity analysis. Investigator dashboard: fraud investigation workbench, evidence briefs, case management, fraud typologies. All compute-heavy work (AI analysis, entity resolution, pattern matching) lives here.

Layer 3 — Accountability Chain (Onchain): Five smart contracts deployed to Avalanche Fuji C-Chain behind UUPS proxies, with architecture designed for migration to a purpose-built Avalanche L1. The frontend reads onchain state via viem (`lib/chain/reads.ts`) with graceful fallback — dashboards check if chain data is live and fall back to static data when unavailable. Onchain writes (attestation submissions, anomaly recording, compliance reporting) are currently executed via Hardhat scripts using a relay wallet with SYSTEM_ROLE. Integration of automated onchain writes from the SaaS layer is a planned next step.

**On-chain vs. off-chain split:**

Onchain (deployed to Fuji C-Chain): Merkle roots of financial data (not raw data), compliance rule states and violations, AI anomaly findings with forward-only lifecycle, cross-org relationship graph edges (hashed identities), investigation evidence metadata with chain-of-custody.

Offchain: Raw accounting data (Supabase/Prisma), AI detection models and logic (rule-based engine in `lib/pipeline/detect.ts`), 990 category mapping (OpenAI + rules in `lib/990/`), Merkle root generation (`lib/pipeline/hash.ts`), detailed analysis reports, evidence documents themselves, all user-facing dashboards and workflows.

**Integrations (current):** QuickBooks Online via direct Intuit OAuth2 (full OAuth flow, token management, sync). OpenAI for AI-powered 990 transaction classification. Supabase for Postgres database and OTP authentication. Resend for email. Avalanche Fuji C-Chain for onchain reads via viem.

**Integrations (architected, not yet implemented):** Multi-platform accounting via Codat/Merge/Apideck. Automated SaaS-to-chain relay service for onchain writes from the web app. Account abstraction for gasless nonprofit interaction.

**Permissioned-public hybrid model (designed, partially implemented):** The AuditLedger contract includes TxAllowList precompile integration for verifying org addresses are provisioned on a sovereign L1, currently disabled on Fuji C-Chain (`avalancheMode = false`). The full three-tier access model — public ("Tallyview Verified" status, aggregate risk scores), permissioned (detailed anomaly flags, cross-org data), and restricted (active investigation data, qui tam evidence) — is designed for enforcement via Avalanche's native allowlist precompiles on the future L1. Contract-level role-based access is already enforced via OpenZeppelin AccessControl with distinct roles: ADMIN_ROLE, SYSTEM_ROLE, REVIEWER_ROLE, FUNDER_ROLE, REGULATOR_ROLE.

---

## USER JOURNEY

**Step 1: Nonprofit connects their accounting system.** Finance director or ED logs into the Tallyview SaaS dashboard and connects their QuickBooks Online account via a one-click OAuth flow (direct Intuit OAuth2). No data migration. No new software to learn. The onboarding flow is four steps: name the organization, authorize QuickBooks, sync data (with real-time SSE progress for accounts, invoices, bills, purchases, journal entries), and done. Takes under 5 minutes.

**Step 2: Tallyview ingests and analyzes financial data.** The sync service pulls transaction data from QuickBooks and stores it in Supabase via Prisma. The AI pipeline maps transactions to 990 categories using OpenAI, the rule-based detection engine runs five anomaly detection rules (compensation outlier, expense ratio drift, vendor concentration, revenue anomaly, governance red flags), and the Merkle root generator creates a 4-leaf cryptographic hash (revenue, expenses, vendor payments, balance sheet) for attestation. Results populate the nonprofit's dashboard: 990 progress tracker with AI confidence scores, expense categorization, anomaly alerts.

**Step 3: Cryptographic attestations can be committed to Avalanche Fuji.** The pipeline generates Merkle roots and a schema hash that match the AuditLedger contract's expected format. Currently, attestation submission is executed via Hardhat scripts (`simulate-pipeline.ts`, `register-test-org.ts`) using the relay wallet with SYSTEM_ROLE — not yet automated from the web app. When an attestation exists onchain, a "Tallyview Verified" / "Verified on-chain" badge appears on the nonprofit's dashboard, linking to the actual attestation on Snowtrace.

**Step 4: Compliance rules activate.** The ComplianceEngine contract supports restricted fund spending caps, overhead ratio thresholds, and filing deadlines. Rules can be created by FUNDER_ROLE or ADMIN_ROLE. Status updates (Compliant → AtRisk → Violated) happen automatically as the relay reports new values. Violations are recorded onchain permanently. The frontend reads compliance summaries, rules, and deadlines via viem.

**Step 5: AI flags anomalies.** The rule-based detection engine identifies concerning patterns — CEO compensation exceeding 3x peer median, program expense ratio below 65%, single vendor receiving over 40% of payments, revenue deviating over 20% from trailing average, governance gaps. Findings are structured to match the AnomalyRegistry contract's `recordAnomaly` parameter shape (severity, category, confidence score, evidence hash). Anomaly recording onchain is executed via Hardhat scripts; the frontend reads anomaly data from the chain via viem and displays it with severity badges, categories, and recommended actions.

**Step 6: Foundation sees grantee health.** A foundation program officer logs into their portfolio dashboard and sees compliance status, risk scores, and anomaly flags for connected grantees. The frontend reads chain state for each grantee organization and displays onchain verification status alongside offchain analytics. Risk scoring uses defined thresholds (High: 44, Moderate: 60) with color-coded badges across foundation views.

**Step 7: Cross-organizational patterns become visible.** EntityGraph stores relationship edges across the connected network. When board member identities appear across multiple nonprofit registrations sharing the same vendor, that pattern is queryable onchain via `getSharedEntities`. A regulator or investigator can verify these connections independently. The regulator dashboard includes entity analysis views with network graph visualization (react-force-graph-2d).

**Step 8: Investigation evidence gets chain-of-custody.** When a finding is escalated, investigators use the workbench to analyze tips, complaints, and suspicious activity. Evidence metadata is hashed and anchored in EvidenceVault onchain with classification, timestamps, and submitter identity. Every action (submission, sealing, stage change) is timestamped with the actor. The investigator workbench UI exists with case management, fraud typology reference, and tip intake; end-to-end evidence submission from the workbench to the chain is a planned integration.

---

## MoSCoW FRAMEWORK — FEATURE PRIORITIZATION

**Must Have (implemented):**
- AuditLedger smart contract: immutable Merkle root submissions, organization identity (address-based with human-readable name resolution), tamper-proof financial timeline, TxAllowList integration for future L1. Foundation contract all other contracts reference. Deployed to Fuji C-Chain with UUPS proxy.
- ComplianceEngine smart contract: compliance rule creation and enforcement (spending caps, overhead ratios, filing deadlines), automated status transitions (Compliant → AtRisk → Violated), permanent violation records. Deployed to Fuji C-Chain with UUPS proxy.
- AnomalyRegistry smart contract: AI-detected findings recorded onchain with severity and confidence scores, forward-only status lifecycle (New → Reviewed → Resolved/Escalated), SYSTEM_ROLE separation of powers, immutable timestamps. Deployed to Fuji C-Chain with UUPS proxy.
- EntityGraph smart contract: cross-organizational relationship mapping (people, vendors, addresses as identity hashes), onchain graph queries (getSharedEntities), fraud pattern detection substrate. Deployed to Fuji C-Chain with UUPS proxy.
- EvidenceVault smart contract: investigation evidence metadata with chain-of-custody, per-case access control, forward-only sealing, full investigation stage tracking (Tip → Analysis → Discovery → Filing → Recovery → Closed). Deployed to Fuji C-Chain with UUPS proxy.
- Four-persona SaaS dashboard: nonprofit compliance view (990, anomalies, restricted funds, audit prep, reports), foundation portfolio view (grantee health, benchmarking, risk alerts), regulator risk map (jurisdiction dashboard, entity analysis, investigations), investigator workbench (cases, fraud typologies, tip intake). Built with Next.js App Router, Tailwind CSS, Radix UI.
- QuickBooks Online integration: full OAuth flow, token management, data sync (accounts, invoices, bills, purchases, journal entries), QBO dashboard with accounts summary and transactions.
- 990 AI classification pipeline: OpenAI-powered transaction mapping to IRS 990 line items, rule-based classification fallback, progressive form builder with section-by-section AI confidence scores.
- Rule-based anomaly detection engine: five detection rules (compensation outlier, expense ratio drift, vendor concentration, revenue anomaly, governance red flags) with output shaped to match AnomalyRegistry contract parameters.
- Merkle root generation: 4-leaf Merkle tree (revenue, expenses, vendor payments, balance sheet) with deterministic JSON serialization and keccak256 hashing, schema hash for version identification.
- Frontend onchain reads: viem-based public client reading all five contracts on Fuji C-Chain with 5-second timeout and graceful fallback to static data.
- UUPS proxy pattern on all contracts for upgradeability.
- Supabase integration: Postgres via Prisma (User, Organization, Account, Transaction models with QBO token storage), OTP authentication via @supabase/ssr.
- Onboarding flow: 4-step wizard (name org → connect QBO → sync with SSE progress → complete).
- "Tallyview Verified" badge: displays "Verified on-chain" when attestation is live, "Chain unavailable" as fallback.
- Hardhat test suites for all five contracts using Chai assertions.
- Demo scripts for each contract showing full lifecycle with realistic nonprofit scenarios.

**Must Have (partially implemented):**
- Accounting data pipeline (QBO → Merkle root → chain → dashboard): Pipeline generates Merkle roots from QuickBooks data and the frontend reads attestations from the chain. The missing link is automated onchain write from the web app — attestation submission currently requires running Hardhat scripts manually. The data format and contract interface are aligned.
- Relay service: The relay wallet concept is implemented in contracts (SYSTEM_ROLE granted to RELAY_ADDRESS at deploy time) and all deploy/demo scripts use it. However, no relay service runs within the Next.js application — onchain writes only happen via Hardhat CLI. Integration of a backend write service is the key remaining infrastructure work.

**Should Have:**
- Automated SaaS-to-chain relay: API routes or background service in the Next.js app that submits Merkle roots, anomaly findings, and compliance reports to the chain automatically when data changes, using the relay wallet.
- Demo scripts with compelling console output for each contract showing realistic nonprofit scenarios (e.g., the UCHS embezzlement pattern). Currently implemented for anomaly lifecycle, compliance lifecycle, entity graph, evidence lifecycle, and full pipeline simulation.

**Could Have:**
- Multi-platform accounting integration (Xero, Sage, NetSuite, FreshBooks) via Codat/Merge/Apideck — pipeline data format is already shaped for Codat-normalized responses.
- Purpose-built Avalanche L1 deployment with sovereign validator set, custom gas token, and native TxAllowList enforcement (contracts already include the integration, disabled on Fuji).
- Account abstraction (ERC-4337) for fully gasless nonprofit interaction — currently the relay uses a standard EOA wallet.
- Permissioned access tiers enforced at chain level using Avalanche's native allowlist precompiles (public / permissioned / restricted).
- "Tallyview Verified" Soulbound Token (SBT) issuance for connected nonprofits.
- Interchain Messaging (ICM) configuration for cross-jurisdictional communication between Tallyview L1 instances.
- USDC integration via Avalanche ICTT for grant payment flow demonstration.
- Whistleblower tip submission from the investigator workbench to EvidenceVault onchain — contract support exists (EvidenceClassification.Tip), UI has tip intake, but no end-to-end API-to-chain flow.
- Supabase Edge Functions for serverless background processing.

**Won't Have (for this phase):**
- Production ML/AI anomaly detection models (rule-based engine with five detection rules is sufficient for demo; ML layers on as data accumulates post-launch).
- Mainnet deployment (Fuji C-Chain validates the architecture; mainnet L1 is ~$995 via managed service post-competition).
- State AG or federal government pilot integrations.
- FedRAMP/GovCloud compliance infrastructure.
- International expansion or per-jurisdiction L1 instances.
- Real grant payment disbursement flows through smart contracts.
- Board governance attestation system (board members signing onchain attestations of financial review).
