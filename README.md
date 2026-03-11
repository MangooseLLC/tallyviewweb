# Tallyview

**The Accountability Chain for Public Money**

Tallyview is a nonprofit financial oversight platform that combines AI-powered analytics with an immutable Avalanche L1 blockchain substrate. The system pairs an offchain SaaS intelligence layer (anomaly detection, 990 preparation, board reporting) with onchain accountability infrastructure (tamper-proof audit trails, compliance enforcement, evidence chain-of-custody).

Raw accounting data stays offchain for privacy and scale. Cryptographic commitments — hashes, attestations, compliance states, and relationship graphs — go onchain for integrity and verifiability.

## Architecture

### Offchain Layer — Next.js SaaS

The frontend serves four persona-specific dashboards, each tailored to a distinct oversight role:

| Persona | Key Views |
|---|---|
| **Nonprofit** | Dashboard, QuickBooks sync, 990 preparation, anomaly review, restricted funds, audit prep, reports, settings |
| **Foundation** | Portfolio overview, grantee detail, benchmarking, alerts, reports, settings |
| **Regulator** | Jurisdiction dashboard, entity analysis, investigations, reports |
| **Investigator** | Case management, fraud typologies, investigator workbench |

Core flow: **Connect → Organize → Verify → Prove**.

- **Connect** — OAuth integration with QuickBooks Online to pull accounts and transactions.
- **Organize** — AI-powered classification of transactions into IRS Form 990 categories using OpenAI (GPT-4o-mini), with rule-based and taxonomy fallbacks.
- **Verify** — Anomaly detection, restricted fund tracking, compliance checks, and peer benchmarking.
- **Prove** — On-chain attestations (Merkle roots) recorded to the Tallyview Accountability Chain on Avalanche.

A built-in **demo mode** with persona switcher allows exploration of all four dashboards without authentication (personas: Sarah Chen, Marcus Thompson, Director Rivera, Jessica Park).

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
- **TypeScript 5.3**
- **Tailwind CSS** + **Radix UI** primitives
- **Recharts** for data visualization
- **react-force-graph-2d** for entity relationship graphs
- **Zod** for validation

### Backend & Data

- **PostgreSQL** via **Prisma 6** ORM
- **Supabase** for authentication (SSR) and managed Postgres
- **OpenAI** (GPT-4o-mini) for IRS 990 transaction classification
- **QuickBooks Online** OAuth integration for accounting data sync
- **Resend** for transactional emails (invitations)
- **Viem** for blockchain client interaction (Avalanche Fuji testnet)

### Smart Contracts

- **Solidity ^0.8.24**
- **Hardhat** for compilation, testing, and deployment
- **OpenZeppelin Contracts Upgradeable v5.1** (UUPS proxy, AccessControl)
- **Avalanche Subnet-EVM** compatible

### Infrastructure

- **Vercel** for hosting and serverless functions
- **Supabase** for managed PostgreSQL and auth
- **Vercel Postgres** for waitlist

## Project Structure

```
.
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (AuthProvider)
│   ├── demo/                       # Demo mode with persona switcher
│   ├── login/                      # Login page
│   ├── onboarding/                 # Org setup + QBO connection flow
│   ├── case-files/                 # Public case study views
│   │   └── [slug]/
│   ├── (nonprofit)/                # Nonprofit persona (route group)
│   │   ├── dashboard/
│   │   ├── quickbooks/
│   │   ├── 990/
│   │   ├── anomalies/
│   │   ├── restricted-funds/
│   │   ├── audit-prep/
│   │   ├── reports/
│   │   └── settings/
│   ├── foundation/                 # Foundation persona
│   │   ├── dashboard/
│   │   ├── portfolio/
│   │   ├── grantee/[id]/
│   │   ├── benchmarking/
│   │   ├── alerts/
│   │   ├── reports/
│   │   └── settings/
│   ├── regulator/                  # Regulator persona
│   │   ├── dashboard/
│   │   ├── jurisdiction/
│   │   ├── entity-analysis/
│   │   ├── investigations/
│   │   └── reports/
│   ├── investigator/               # Investigator persona
│   │   ├── dashboard/
│   │   ├── workbench/
│   │   ├── cases/
│   │   └── fraud-typologies/
│   └── api/                        # API routes
│       ├── auth/                   # Auth (provision, user, logout)
│       ├── chain/                  # On-chain attestation
│       ├── qbo/                    # QuickBooks OAuth + sync
│       ├── 990/                    # 990 classification
│       └── waitlist/               # Waitlist signup
├── components/                     # Shared React components
├── contexts/                       # React contexts (AuthContext)
├── lib/
│   ├── 990/                        # IRS 990 classification logic
│   │   ├── ai-classify.ts          # OpenAI batch classification
│   │   ├── taxonomy.ts             # 990 category taxonomy
│   │   ├── rules.ts                # Rule-based classification
│   │   └── classify.ts             # Classification orchestrator
│   ├── chain/                      # Blockchain interaction (Viem)
│   │   ├── client.ts               # Public + relay wallet clients
│   │   ├── config.ts               # Contract addresses
│   │   ├── reads.ts                # On-chain read helpers
│   │   └── abis/                   # Contract ABIs
│   ├── pipeline/                   # Data pipeline
│   │   ├── from-qbo.ts             # QBO data extraction
│   │   ├── hash.ts                 # Merkle root computation
│   │   ├── ingest.ts               # Transaction ingestion
│   │   ├── map990.ts               # 990 mapping
│   │   └── detect.ts               # Anomaly detection
│   ├── data/                       # Static/mock data for personas
│   ├── supabase/                   # Supabase client + middleware helpers
│   ├── qbo-auth.ts                 # QuickBooks OAuth flow
│   ├── qbo-sync.ts                 # Streamed QBO sync
│   ├── qbo-client.ts               # QBO API client
│   ├── qbo-financials.ts           # QBO financial data helpers
│   ├── get-user-org.ts             # Resolve user/org from session or demo
│   ├── auth-session.ts             # Session utilities
│   └── prisma.ts                   # Prisma client singleton
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Prisma migrations
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
│   ├── test/                       # Hardhat test suites
│   ├── scripts/                    # Deploy + demo lifecycle scripts
│   ├── hardhat.config.ts
│   └── package.json
├── Brand Assets/                   # Logo files (SVG, PNG, PDF)
├── middleware.ts                    # Next.js middleware (auth, routing)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Supabase recommended)

### Environment Variables

Copy `.env.example` and fill in the required values:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma connection string (pooled) |
| `DIRECT_URL` | Prisma direct connection (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `QBO_CLIENT_ID` | QuickBooks Online OAuth client ID |
| `QBO_CLIENT_SECRET` | QuickBooks Online OAuth client secret |
| `QBO_REDIRECT_URI` | QuickBooks OAuth callback URL |
| `QBO_ENVIRONMENT` | `sandbox` or `production` |
| `QBO_BASE_URL` | QuickBooks API base URL |
| `OPENAI_API_KEY` | OpenAI API key (for 990 classification) |
| `RELAY_PRIVATE_KEY` | Private key for on-chain attestation relay |
| `RESEND_API_KEY` | Resend API key (invitation emails) |
| `RESEND_FROM_EMAIL` | Sender email address for invitations |
| `SITE_PASSWORD` | Optional site-wide password gate |

### Frontend

```bash
npm install
npx prisma generate
npx prisma db push        # or: npx prisma migrate deploy
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

## Integrations

### QuickBooks Online

OAuth 2.0 flow connects organizations to their QuickBooks accounting data. Once authorized, Tallyview syncs accounts and transactions via the QBO API, then runs them through the classification and anomaly detection pipeline. The sync streams progress updates to the UI in real time.

### OpenAI

Transactions that cannot be classified by rule-based or taxonomy matching are batched and sent to GPT-4o-mini for IRS 990 category classification. The AI layer returns a category, confidence score, and reasoning for each transaction.

### Blockchain (Avalanche Fuji)

A relay wallet submits attestations on behalf of organizations. When an org attests, the system computes a Merkle root over its financial data and writes it to the `AuditLedger` contract. Org addresses are auto-provisioned on first attestation.

### Supabase

Handles authentication (email-based, SSR cookie sessions) and provides the managed PostgreSQL database. The middleware layer validates sessions on protected routes.

### Resend

Sends transactional emails for team invitations when an organization admin invites new members.

## Database Schema

Managed by Prisma. Key models:

| Model | Purpose |
|---|---|
| `User` | Authenticated users |
| `Organization` | Nonprofit organizations |
| `OrgMembership` | User-to-org relationship with roles |
| `Invitation` | Pending team invitations |
| `Account` | Chart of accounts (synced from QBO) |
| `Transaction` | Financial transactions (synced from QBO) |
| `SyncJob` | QBO sync job tracking |
| `AuditSubmission` | On-chain attestation records |

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
