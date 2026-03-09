# Tallyview

**The Accountability Chain for Public Money**

Tallyview is a nonprofit financial oversight platform that combines AI-powered analytics with an immutable Avalanche L1 blockchain substrate. The system pairs an offchain SaaS intelligence layer (anomaly detection, 990 preparation, board reporting) with onchain accountability infrastructure (tamper-proof audit trails, compliance enforcement, evidence chain-of-custody).

Raw accounting data stays offchain for privacy and scale. Cryptographic commitments — hashes, attestations, compliance states, and relationship graphs — go onchain for integrity and verifiability.

## Architecture

### Offchain Layer — Next.js SaaS

The frontend serves four persona-specific dashboards, each tailored to a distinct oversight role:

| Persona | Key Views |
|---|---|
| **Nonprofit** | Dashboard, 990 preparation, anomaly review, restricted funds, audit prep, reports, settings |
| **Foundation** | Portfolio overview, grantee detail, benchmarking, alerts, reports, settings |
| **Regulator** | Jurisdiction dashboard, entity analysis, investigations, reports |
| **Investigator** | Case management, fraud typologies, investigator workbench |

### Onchain Layer — Tallyview Avalanche L1

Five core Solidity contracts deployed behind UUPS-upgradeable ERC1967 proxies. All contracts use OpenZeppelin's `AccessControlUpgradeable` for role-based permissioning and reference a shared type library (`TallyviewTypes.sol`).

#### AuditLedger.sol

Foundation contract. Stores nonprofit registrations with human-readable name resolution and immutable monthly financial attestations (Merkle roots). Optionally integrates with the Subnet-EVM `TxAllowList` precompile to verify org addresses are provisioned on the L1 before onboarding. All other contracts reference AuditLedger for org validation.

#### ComplianceEngine.sol

Active enforcement layer. Encodes compliance rules as onchain state — restricted fund spending caps, overhead ratio ceilings, custom thresholds — and tracks regulatory filing deadlines. When a reported value crosses a threshold, the contract records the breach and creates an immutable violation record. Supports automatic status transitions: Compliant → AtRisk (at 90% of threshold) → Violated.

#### AnomalyRegistry.sol

Immutable record of AI-detected findings. When the offchain AI engine detects an anomaly (vendor concentration, expense drift, compensation outlier, governance red flag), the finding metadata is written here permanently. Forward-only lifecycle: New → Reviewed → Resolved/Escalated. Findings cannot be deleted or hidden — only their status can progress forward.

#### EntityGraph.sol

Cross-organizational relationship graph for fraud pattern detection. Stores privacy-preserving entities (people, vendors, addresses as identity hashes) and relationship edges connecting them to organizations. Enables onchain queries like "which organizations share this board member?" and "what entities do these two orgs have in common?" — patterns no single-tenant system can detect.

#### EvidenceVault.sol

Investigation evidence with chain-of-custody. Anchors evidence onchain with classification, timestamps, and submitter identity. Supports the full investigation pipeline: Tip → Analysis → Discovery → Filing → Recovery → Closed. Cases can be sealed by regulators. Investigators are granted per-case access. Whistleblower tips are timestamped onchain for qui tam temporal priority.

## Tech Stack

### Frontend

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **Radix UI** primitives
- **Recharts** for data visualization
- **react-force-graph-2d** for entity relationship graphs
- **Zod** for validation

### Smart Contracts

- **Solidity ^0.8.24**
- **Hardhat** for compilation, testing, and deployment
- **OpenZeppelin Contracts Upgradeable v5.1** (UUPS proxy, AccessControl)
- **Avalanche Subnet-EVM** compatible

## Project Structure

```
.
├── app/
│   ├── (nonprofit)/             # Nonprofit persona views
│   │   ├── dashboard/
│   │   ├── 990/
│   │   ├── anomalies/
│   │   ├── restricted-funds/
│   │   ├── audit-prep/
│   │   ├── reports/
│   │   └── settings/
│   ├── (foundation)/            # Foundation persona views
│   │   ├── portfolio/
│   │   ├── grantee/[id]/
│   │   ├── benchmarking/
│   │   └── alerts/
│   ├── (investigator)/          # Investigator persona views
│   │   ├── cases/
│   │   ├── fraud-typologies/
│   │   └── workbench/
│   ├── regulator/               # Regulator persona views
│   │   ├── dashboard/
│   │   ├── jurisdiction/
│   │   ├── entity-analysis/
│   │   ├── investigations/
│   │   └── reports/
│   ├── case-files/              # Public case file views
│   ├── api/                     # API routes
│   └── layout.tsx               # Root layout
├── tallyview-contracts/
│   ├── contracts/
│   │   ├── AuditLedger.sol
│   │   ├── ComplianceEngine.sol
│   │   ├── AnomalyRegistry.sol
│   │   ├── EntityGraph.sol
│   │   ├── EvidenceVault.sol
│   │   ├── libraries/
│   │   │   └── TallyviewTypes.sol
│   │   └── interfaces/
│   │       ├── IAuditLedger.sol
│   │       ├── IComplianceEngine.sol
│   │       ├── IAnomalyRegistry.sol
│   │       ├── IEntityGraph.sol
│   │       └── IEvidenceVault.sol
│   ├── test/                    # Hardhat test suites for all contracts
│   ├── scripts/                 # Deploy + demo lifecycle scripts
│   ├── hardhat.config.ts
│   └── package.json
├── Brand Assets/                # Logo files (SVG, PNG, PDF)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+

### Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Smart Contracts

```bash
cd tallyview-contracts
npm install
npx hardhat compile
npx hardhat test
```

Run a local Hardhat node and deploy:

```bash
npx hardhat node
npx hardhat run scripts/deploy-audit-ledger.ts --network localhost
```

See `tallyview-contracts/.env.example` for testnet configuration.

## Role-Based Access Model

The contracts enforce tiered permissioning via OpenZeppelin `AccessControl` roles, mirroring the Avalanche L1 chain-level allowlists:

| Role | Contracts | Capabilities |
|---|---|---|
| `ADMIN_ROLE` | All | Full management, upgrades, resolve anomalies, close cases |
| `SYSTEM_ROLE` | All | Relay service — writes attestations, records anomalies, reports values |
| `REVIEWER_ROLE` | AnomalyRegistry | Review and resolve/escalate findings |
| `FUNDER_ROLE` | ComplianceEngine | Create compliance rules for grantee organizations |
| `REGULATOR_ROLE` | EvidenceVault | Seal cases/evidence, authorize/revoke investigators |

## Avalanche L1 Strategy

Tallyview targets deployment on a purpose-built Avalanche L1 with:

- **Permissioned validator set** — Tallyview, foundation partners, state AG offices, audit firms
- **Native KYC allowlists** via Subnet-EVM precompiles
- **Sub-second finality** for real-time compliance dashboards
- **Custom gas token** with the ability to subsidize nonprofit participants
- **~$1,500–5,000/month** total operating cost (post-Avalanche9000)

See `tallyview-avalanche-l1-strategy.md` for the full technical architecture and implementation roadmap.

## Brand

- **Navy**: `#001F3F`
- **Gold**: `#f5ba42`
- **Tagline**: "Follow the money."

## License

Private. All rights reserved.
