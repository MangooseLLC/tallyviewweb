# Tallyview: QuickBooks Online Direct Integration — Cursor Build Guide

## Context for the AI

You are building the accounting system integration for **Tallyview**, an AI-powered accountability intelligence platform for nonprofits. Tallyview connects to nonprofits' existing accounting systems, ingests financial data, and produces two products from the same pipeline:

1. **For the nonprofit:** Progressive 990 preparation, board reports, anomaly detection
2. **For oversight stakeholders:** Cross-organizational portfolio intelligence for foundations, state AGs, investigators

Tallyview is "Plaid for nonprofit accountability" — it sits on top of whatever accounting system the nonprofit already uses.

The tech stack is **Next.js** with **TypeScript**, **shadcn/ui**, and **Tailwind CSS**. The backend will eventually connect to an Avalanche L1 blockchain layer, but that is not part of this task.

**This is a time-critical build. Move fast. Get it working, then clean it up. Do not over-engineer. Do not add abstractions we don't need yet.**

---

## What We're Building Right Now

A direct integration with the **QuickBooks Online Accounting API** that:

1. Authenticates a nonprofit via OAuth 2.0 against QuickBooks
2. Pulls their chart of accounts, invoices, bills, bill payments, and purchases
3. Stores transactions in a local database
4. Displays the ingested data in a dashboard with a transactions table and accounts summary

We are using the **Intuit Developer sandbox**, which provides pre-loaded test QuickBooks companies with realistic financial data. This is a real integration with real API calls, not mocked data.

**Why QuickBooks direct instead of a unified API (Codat/Merge):** Speed. No third-party signup gates. Intuit Developer gives you sandbox access immediately. We can layer Codat or Merge on top later for multi-platform support — the database schema is designed to be source-agnostic.

---

## Architecture

```
[Nonprofit User]
       |
       v
[OAuth 2.0 Flow]  ← Redirect to Intuit login, user authorizes, callback with auth code
       |
       v
[Tallyview Next.js API Routes]  ← Exchange code for tokens, call QBO REST API
       |
       v
[QuickBooks Online API]  ← sandbox-quickbooks.api.intuit.com (sandbox)
       |                    quickbooks.api.intuit.com (production)
       v
[Database]  ← Store normalized transactions, accounts, tokens
       |
       v
[Dashboard UI]  ← Display transactions, accounts summary, connection status
```

---

## Pre-Requisites (Khori Does This Before Running Cursor)

1. Go to https://developer.intuit.com and sign up / sign in
2. Create a new app: select "QuickBooks Online and Payments"
3. App name: "Tallyview" (or whatever you want)
4. Scope: select `com.intuit.quickbooks.accounting` only
5. Set Redirect URI to: `http://localhost:3000/api/qbo/callback`
6. Copy your **Client ID** and **Client Secret** from the Development Keys section
7. Note your **Sandbox Company Realm ID** from the Sandboxes tab (it's also called Company ID)
8. Add these to `.env.local`:

```env
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_REDIRECT_URI=http://localhost:3000/api/qbo/callback
QBO_ENVIRONMENT=sandbox
# sandbox base URL uses a different domain than production
QBO_BASE_URL=https://sandbox-quickbooks.api.intuit.com/v3
```

---

## Step-by-Step Implementation

### Step 1: OAuth 2.0 Flow

QuickBooks requires OAuth 2.0 for all integrations. The flow is:
1. User clicks "Connect QuickBooks" → redirect to Intuit authorization URL
2. User logs in and authorizes → Intuit redirects back to our callback with an auth `code`
3. Our callback exchanges the `code` for `access_token` and `refresh_token`
4. We store tokens and the `realmId` (QuickBooks company ID)

**File: `src/lib/qbo-auth.ts`**

```typescript
// OAuth URLs
const AUTHORIZATION_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    redirect_uri: process.env.QBO_REDIRECT_URI!,
    scope: 'com.intuit.quickbooks.accounting',
    response_type: 'code',
    state,
  });
  return `${AUTHORIZATION_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.QBO_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${error}`);
  }

  return response.json();
  // Returns: { access_token, refresh_token, expires_in, x_refresh_token_expires_in, token_type }
}

export async function refreshAccessToken(refreshToken: string) {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${error}`);
  }

  return response.json();
}
```

**Key details:**
- Access tokens expire after 1 hour (3600 seconds). Refresh tokens expire after 100 days.
- The `realmId` comes back as a query parameter on the callback URL, NOT in the token response. Capture it from `req.query.realmId` in the callback route.
- Always include `Accept: application/json` header — QBO sometimes returns XML otherwise.

### Step 2: QBO API Client

**File: `src/lib/qbo-client.ts`**

```typescript
export class QBOClient {
  private baseUrl: string;
  private accessToken: string;
  private realmId: string;

  constructor(accessToken: string, realmId: string) {
    this.baseUrl = process.env.QBO_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com/v3';
    this.accessToken = accessToken;
    this.realmId = realmId;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}/company/${this.realmId}/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QBO API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // QuickBooks uses a SQL-like query language for reads
  async query<T>(entity: string, where?: string, maxResults = 1000, startPosition = 1): Promise<T> {
    let sql = `SELECT * FROM ${entity}`;
    if (where) sql += ` WHERE ${where}`;
    sql += ` MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;
    return this.request(`query?query=${encodeURIComponent(sql)}`);
  }

  async getCompanyInfo() {
    return this.request(`companyinfo/${this.realmId}`);
  }

  async getAccounts(startPosition = 1, maxResults = 1000) {
    return this.query('Account', undefined, maxResults, startPosition);
  }

  async getInvoices(startPosition = 1, maxResults = 100) {
    return this.query('Invoice', undefined, maxResults, startPosition);
  }

  async getBills(startPosition = 1, maxResults = 100) {
    return this.query('Bill', undefined, maxResults, startPosition);
  }

  async getBillPayments(startPosition = 1, maxResults = 100) {
    return this.query('BillPayment', undefined, maxResults, startPosition);
  }

  async getPurchases(startPosition = 1, maxResults = 100) {
    return this.query('Purchase', undefined, maxResults, startPosition);
  }

  async getVendors(startPosition = 1, maxResults = 100) {
    return this.query('Vendor', undefined, maxResults, startPosition);
  }

  async getCustomers(startPosition = 1, maxResults = 100) {
    return this.query('Customer', undefined, maxResults, startPosition);
  }

  async getJournalEntries(startPosition = 1, maxResults = 100) {
    return this.query('JournalEntry', undefined, maxResults, startPosition);
  }

  // Financial reports
  async getProfitAndLoss(startDate: string, endDate: string) {
    return this.request(
      `reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getBalanceSheet(date: string) {
    return this.request(`reports/BalanceSheet?date=${date}`);
  }
}
```

**CRITICAL QBO API details:**
- Sandbox API base URL: `https://sandbox-quickbooks.api.intuit.com/v3` — this is a DIFFERENT domain than production (`https://quickbooks.api.intuit.com/v3`)
- All data read endpoints use the query syntax: `GET /v3/company/{realmId}/query?query=SELECT * FROM Invoice`
- Rate limit: 500 requests per minute per realmId. For our prototype this is not a concern.
- QBO can return 401 errors that are NOT actually auth errors (e.g., rate limiting). Implement basic retry logic.
- Always use `minorversion` query parameter for latest features. Append `&minorversion=73` (or latest) to requests if needed. Without it, you get the base 2014 API.

**Add minorversion to the request method:**
```typescript
// In the request method, append minorversion to all URLs:
const separator = url.includes('?') ? '&' : '?';
const urlWithVersion = `${url}${separator}minorversion=73`;
```

### Step 3: API Routes

**File: `src/app/api/qbo/connect/route.ts`**

- `GET` handler
- Generates a random `state` parameter for CSRF protection (store in a cookie or session)
- Returns the Intuit authorization URL from `getAuthorizationUrl(state)`
- Frontend redirects the browser to this URL

**File: `src/app/api/qbo/callback/route.ts`**

- `GET` handler — this is where Intuit redirects after user authorizes
- Receives query params: `code`, `state`, `realmId`
- Validate `state` matches what we stored
- Call `exchangeCodeForTokens(code)` to get access and refresh tokens
- Store `access_token`, `refresh_token`, `realmId`, and `expires_at` in the database (Organization record)
- Redirect to `/dashboard` with a success indicator

**File: `src/app/api/qbo/sync/route.ts`**

- `POST` handler
- Retrieves stored tokens and realmId from database
- If access token is expired, call `refreshAccessToken()` first and update stored tokens
- Creates a `QBOClient` instance
- Pulls all data (accounts, invoices, bills, purchases, journal entries, vendors)
- Transforms and upserts into the Transaction and Account tables
- Returns sync summary (counts of records synced)

**File: `src/app/api/qbo/transactions/route.ts`**

- `GET` handler
- Reads from local database (NOT from QBO directly — we already synced)
- Supports query params: `page`, `pageSize`, `sortBy`, `sortOrder`, `search`
- Returns paginated transaction list for the dashboard

**File: `src/app/api/qbo/accounts/route.ts`**

- `GET` handler
- Reads accounts from local database
- Groups by AccountType (Asset, Liability, Income, Expense, Equity)

### Step 4: Database Schema

Use Prisma with SQLite for speed. Zero infrastructure. Swap to Postgres later.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Organization {
  id              String   @id @default(cuid())
  name            String
  qboRealmId      String   @unique
  accessToken     String
  refreshToken    String
  tokenExpiresAt  DateTime
  lastSyncedAt    DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  transactions    Transaction[]
  accounts        Account[]
}

model Account {
  id              String   @id @default(cuid())
  orgId           String
  org             Organization @relation(fields: [orgId], references: [id])
  qboId           String       // Account.Id from QuickBooks
  name            String       // Account.Name
  accountType     String       // Asset, Liability, Income, Expense, Equity, etc.
  accountSubType  String?      // QBO's sub-classification
  classification  String?      // Asset, Liability, Revenue, Expense, Equity
  currentBalance  Float?       // Account.CurrentBalance
  currency        String       @default("USD")
  active          Boolean      @default(true)
  irs990Category  String?      // Our 990 mapping (populated later by AI engine)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([orgId, qboId])
}

model Transaction {
  id              String   @id @default(cuid())
  orgId           String
  org             Organization @relation(fields: [orgId], references: [id])
  qboId           String       // Entity Id from QuickBooks
  sourceType      String       // Invoice, Bill, BillPayment, Purchase, JournalEntry
  txnDate         DateTime     // TxnDate from QBO
  description     String?      // Line item description or DocNumber
  amount          Float        // TotalAmt or Line amount
  accountName     String?      // Account the transaction hits
  accountId       String?      // QBO Account Id reference
  vendorName      String?      // Vendor display name (for bills, purchases)
  customerName    String?      // Customer display name (for invoices)
  status          String?      // e.g., Paid, Open, Voided
  irs990Category  String?      // Our mapping (populated later)
  rawData         String?      // JSON string of full QBO response for this record
  createdAt       DateTime     @default(now())

  @@unique([orgId, qboId, sourceType])
  @@index([orgId, txnDate])
  @@index([orgId, sourceType])
}
```

**Why SQLite:** This is a prototype. Prisma with SQLite = `npx prisma migrate dev` and you have a working database in 5 seconds. The schema is designed to be source-agnostic — notice the fields are NOT QuickBooks-specific names. When we add Xero or Sage later (via Merge/Codat or direct), the same schema works.

**Note on rawData:** Store as JSON string since SQLite doesn't have a native JSON type. Use `JSON.parse()` when needed. This lets us re-process transactions later without re-fetching from QBO.

### Step 5: Data Transformation / Sync Service

**File: `src/lib/qbo-sync.ts`**

This is the core data pipeline. It pulls from QBO and normalizes into our schema.

```typescript
// Pseudocode for the sync function — implement the full version

async function syncOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error('Organization not found');

  // Check if token needs refresh
  let accessToken = org.accessToken;
  if (new Date() >= org.tokenExpiresAt) {
    const tokens = await refreshAccessToken(org.refreshToken);
    accessToken = tokens.access_token;
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
  }

  const client = new QBOClient(accessToken, org.qboRealmId);

  // 1. Sync accounts (chart of accounts)
  const accountsResponse = await client.getAccounts();
  const accounts = accountsResponse.QueryResponse?.Account || [];
  for (const acct of accounts) {
    await prisma.account.upsert({
      where: { orgId_qboId: { orgId, qboId: String(acct.Id) } },
      create: {
        orgId,
        qboId: String(acct.Id),
        name: acct.Name,
        accountType: acct.AccountType,
        accountSubType: acct.AccountSubType || null,
        classification: acct.Classification || null,
        currentBalance: acct.CurrentBalance || 0,
        active: acct.Active,
      },
      update: {
        name: acct.Name,
        accountType: acct.AccountType,
        accountSubType: acct.AccountSubType || null,
        classification: acct.Classification || null,
        currentBalance: acct.CurrentBalance || 0,
        active: acct.Active,
      },
    });
  }

  // 2. Sync invoices
  const invoicesResponse = await client.getInvoices();
  const invoices = invoicesResponse.QueryResponse?.Invoice || [];
  for (const inv of invoices) {
    await prisma.transaction.upsert({
      where: { orgId_qboId_sourceType: { orgId, qboId: String(inv.Id), sourceType: 'Invoice' } },
      create: {
        orgId,
        qboId: String(inv.Id),
        sourceType: 'Invoice',
        txnDate: new Date(inv.TxnDate),
        description: inv.DocNumber ? `Invoice #${inv.DocNumber}` : (inv.Line?.[0]?.Description || null),
        amount: inv.TotalAmt,
        customerName: inv.CustomerRef?.name || null,
        status: inv.Balance === 0 ? 'Paid' : 'Open',
        rawData: JSON.stringify(inv),
      },
      update: {
        txnDate: new Date(inv.TxnDate),
        amount: inv.TotalAmt,
        status: inv.Balance === 0 ? 'Paid' : 'Open',
        rawData: JSON.stringify(inv),
      },
    });
  }

  // 3. Sync bills (expenses from vendors)
  const billsResponse = await client.getBills();
  const bills = billsResponse.QueryResponse?.Bill || [];
  for (const bill of bills) {
    await prisma.transaction.upsert({
      where: { orgId_qboId_sourceType: { orgId, qboId: String(bill.Id), sourceType: 'Bill' } },
      create: {
        orgId,
        qboId: String(bill.Id),
        sourceType: 'Bill',
        txnDate: new Date(bill.TxnDate),
        description: bill.Line?.[0]?.Description || null,
        amount: bill.TotalAmt,
        vendorName: bill.VendorRef?.name || null,
        accountName: bill.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name || null,
        accountId: bill.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.value || null,
        status: bill.Balance === 0 ? 'Paid' : 'Open',
        rawData: JSON.stringify(bill),
      },
      update: {
        txnDate: new Date(bill.TxnDate),
        amount: bill.TotalAmt,
        status: bill.Balance === 0 ? 'Paid' : 'Open',
        rawData: JSON.stringify(bill),
      },
    });
  }

  // 4. Sync purchases (direct expenses — checks, credit card charges, cash purchases)
  const purchasesResponse = await client.getPurchases();
  const purchases = purchasesResponse.QueryResponse?.Purchase || [];
  for (const purch of purchases) {
    await prisma.transaction.upsert({
      where: { orgId_qboId_sourceType: { orgId, qboId: String(purch.Id), sourceType: 'Purchase' } },
      create: {
        orgId,
        qboId: String(purch.Id),
        sourceType: 'Purchase',
        txnDate: new Date(purch.TxnDate),
        description: purch.Line?.[0]?.Description || `${purch.PaymentType || 'Purchase'}`,
        amount: purch.TotalAmt,
        vendorName: purch.EntityRef?.name || null,
        accountName: purch.AccountRef?.name || null,
        accountId: purch.AccountRef?.value || null,
        status: null,
        rawData: JSON.stringify(purch),
      },
      update: {
        txnDate: new Date(purch.TxnDate),
        amount: purch.TotalAmt,
        rawData: JSON.stringify(purch),
      },
    });
  }

  // 5. Sync journal entries
  const jeResponse = await client.getJournalEntries();
  const journalEntries = jeResponse.QueryResponse?.JournalEntry || [];
  for (const je of journalEntries) {
    // Journal entries have multiple lines (debits and credits)
    // Store the whole entry as one transaction with the total amount
    await prisma.transaction.upsert({
      where: { orgId_qboId_sourceType: { orgId, qboId: String(je.Id), sourceType: 'JournalEntry' } },
      create: {
        orgId,
        qboId: String(je.Id),
        sourceType: 'JournalEntry',
        txnDate: new Date(je.TxnDate),
        description: je.DocNumber ? `JE #${je.DocNumber}` : (je.Line?.[0]?.Description || null),
        amount: je.TotalAmt,
        status: null,
        rawData: JSON.stringify(je),
      },
      update: {
        txnDate: new Date(je.TxnDate),
        amount: je.TotalAmt,
        rawData: JSON.stringify(je),
      },
    });
  }

  // Update last synced timestamp
  await prisma.organization.update({
    where: { id: orgId },
    data: { lastSyncedAt: new Date() },
  });

  return {
    accounts: accounts.length,
    invoices: invoices.length,
    bills: bills.length,
    purchases: purchases.length,
    journalEntries: journalEntries.length,
  };
}
```

**Important QBO response format notes:**
- All query responses are wrapped in `{ QueryResponse: { EntityName: [...] } }`
- Entity field names are PascalCase: `TxnDate`, `TotalAmt`, `DocNumber`, `CustomerRef`, `VendorRef`
- Refs (CustomerRef, VendorRef, AccountRef) have `{ value: "id", name: "display name" }`
- Line items are in a `Line` array. Each line has a `DetailType` that tells you what kind of line it is (`SalesItemLineDetail`, `AccountBasedExpenseLineDetail`, `ItemBasedExpenseLineDetail`, `JournalEntryLineDetail`)
- `TxnDate` is a string in `YYYY-MM-DD` format
- `Balance` of 0 on an invoice means it's been paid

### Step 6: Dashboard UI

**File: `src/app/dashboard/page.tsx`**

Build a single-page dashboard with three sections:

**1. Connection Panel (top)**
- If not connected: "Connect QuickBooks" button that calls `GET /api/qbo/connect` and redirects
- If connected: Show company name, realmId, last synced time, and a "Sync Now" button
- Sync button calls `POST /api/qbo/sync` and shows a loading state, then refreshes data

**2. Transactions Table (main content)**
- Columns: Date, Type (sourceType), Description, Amount, Vendor/Customer, Account, Status
- Sort by date descending (newest first)
- Basic text search filtering across description, vendor, customer
- Color-code or badge the sourceType (Invoice = blue, Bill = orange, Purchase = red, JournalEntry = gray)
- Paginate (25 per page)
- Show total transaction count

**3. Accounts Summary (sidebar or below)**
- Group accounts by classification (Asset, Liability, Revenue, Expense, Equity)
- Show account name and current balance
- Collapsible groups

**Use shadcn/ui components:** Table, Button, Badge, Card, Input (for search), Skeleton (for loading states). Keep it clean and professional. Dark backgrounds are fine for a financial dashboard feel.

### Step 7: Quick Token Storage Shortcut (If You Need to Move Even Faster)

If setting up the full OAuth flow is taking too long, there's a faster path for the prototype:

1. Go to the Intuit Developer portal → your app → Sandbox
2. Use the "OAuth 2.0 Playground" or the API Explorer to generate an access token manually
3. Copy the access token and realmId
4. Hardcode them in `.env.local` as `QBO_ACCESS_TOKEN` and `QBO_REALM_ID`
5. Skip the OAuth routes entirely and build the sync + dashboard first
6. Come back and wire up OAuth after the data pipeline is working

This is a valid prototype shortcut. The sandbox access token is valid for 1 hour, but you can regenerate it from the portal. This lets you verify the data pipeline works before dealing with OAuth complexity.

If you take this shortcut, add these env vars:
```env
QBO_ACCESS_TOKEN=paste_from_portal
QBO_REALM_ID=paste_from_portal
```

And modify the sync route to use these directly instead of reading from the database.

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── qbo/
│   │       ├── connect/route.ts      ← Initiates OAuth flow
│   │       ├── callback/route.ts     ← Handles OAuth callback
│   │       ├── sync/route.ts         ← Pulls data from QBO into DB
│   │       ├── transactions/route.ts ← Reads transactions from DB
│   │       └── accounts/route.ts     ← Reads accounts from DB
│   └── dashboard/
│       └── page.tsx
├── components/
│   ├── qbo-connect.tsx        ← Connection panel with status + buttons
│   ├── transactions-table.tsx ← Paginated, searchable transactions
│   └── accounts-summary.tsx   ← Grouped account balances
├── lib/
│   ├── qbo-auth.ts            ← OAuth URL generation, token exchange, refresh
│   ├── qbo-client.ts          ← QBO REST API client
│   ├── qbo-sync.ts            ← Data pull + transformation + DB upsert
│   └── prisma.ts              ← Prisma client singleton
└── prisma/
    └── schema.prisma
```

---

## QBO API Quick Reference

**Sandbox base URL:** `https://sandbox-quickbooks.api.intuit.com/v3`
**Production base URL:** `https://quickbooks.api.intuit.com/v3`

All data endpoints follow: `GET /v3/company/{realmId}/query?query={SQL}&minorversion=73`

| Entity | Query | Key Fields |
|--------|-------|------------|
| Accounts | `SELECT * FROM Account` | Id, Name, AccountType, AccountSubType, Classification, CurrentBalance, Active |
| Invoices | `SELECT * FROM Invoice` | Id, TxnDate, TotalAmt, Balance, DocNumber, CustomerRef, Line[] |
| Bills | `SELECT * FROM Bill` | Id, TxnDate, TotalAmt, Balance, VendorRef, Line[] |
| Bill Payments | `SELECT * FROM BillPayment` | Id, TxnDate, TotalAmt, VendorRef, PayType |
| Purchases | `SELECT * FROM Purchase` | Id, TxnDate, TotalAmt, PaymentType, EntityRef, AccountRef, Line[] |
| Journal Entries | `SELECT * FROM JournalEntry` | Id, TxnDate, TotalAmt, DocNumber, Line[] |
| Vendors | `SELECT * FROM Vendor` | Id, DisplayName, Active, Balance |
| Customers | `SELECT * FROM Customer` | Id, DisplayName, Active, Balance |
| Company Info | `GET /v3/company/{realmId}/companyinfo/{realmId}` | CompanyName, Country, Email |

**Query pagination:** Use `STARTPOSITION` (1-based) and `MAXRESULTS`:
```
SELECT * FROM Invoice STARTPOSITION 1 MAXRESULTS 100
SELECT * FROM Invoice STARTPOSITION 101 MAXRESULTS 100
```

**OAuth URLs:**
| Action | URL |
|--------|-----|
| Authorization | `https://appcenter.intuit.com/connect/oauth2` |
| Token exchange | `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` |

**Rate limit:** 500 requests per minute per realmId. Not a concern for prototype.

---

## Build Sequence (Do in This Order)

1. **Prisma schema + migrate** — `npx prisma migrate dev --name init`. Confirm DB is created.
2. **`src/lib/qbo-auth.ts`** — OAuth helpers.
3. **`src/lib/qbo-client.ts`** — API client. Test by hardcoding a token from the portal and logging a query response.
4. **`src/lib/qbo-sync.ts`** — Data transformation. Run it once and check the database has records.
5. **`src/app/api/qbo/sync/route.ts`** — Wire up the sync as an API route.
6. **`src/app/api/qbo/transactions/route.ts`** + **`accounts/route.ts`** — Read routes.
7. **`src/app/dashboard/page.tsx`** + components — UI layer.
8. **OAuth routes** (connect + callback) — Wire up the full auth flow last, after data pipeline works.

**Steps 1-4 are the critical path.** Once those work, you have a functional prototype — everything after is UI and auth polish.

---

## Common Pitfalls

- **Wrong sandbox URL:** `sandbox-quickbooks.api.intuit.com` NOT `quickbooks.api.intuit.com`. This will give you auth errors that look like token issues but are actually just wrong domain.
- **Missing minorversion:** Without `?minorversion=73` you get the 2014 base API which is missing many fields.
- **Query encoding:** The SQL query string must be URL-encoded. `SELECT * FROM Invoice` → `SELECT%20*%20FROM%20Invoice`.
- **Ref fields:** `CustomerRef.name` and `VendorRef.name` are the display names. `CustomerRef.value` is the ID.
- **Line items:** Different transaction types use different line detail types. Check `DetailType` on each line to know how to parse it.
- **SQLite and Prisma:** Use `npx prisma generate` after any schema change. Use `npx prisma studio` to visually inspect your database.
- **Token in headers:** `Authorization: Bearer {access_token}` — note the space after "Bearer".

---

## What This Is NOT

- This is NOT the AI 990 mapping layer. The `irs990Category` field exists but stays null for now.
- This is NOT the onchain layer. No blockchain interaction in this task.
- This is NOT the foundation/oversight dashboard. This is the nonprofit-facing data ingestion side only.
- This is NOT multi-platform yet. QuickBooks only. Merge/Codat can be layered on top later — the schema is designed for it (sourceType field, source-agnostic field names).

## What This IS

- A working QuickBooks integration that pulls real financial data from the Intuit sandbox
- The data pipeline that everything else in Tallyview depends on
- Proof that Tallyview connects to accounting systems and ingests transactions — not a slide deck claim
- The foundation for 990 mapping, anomaly detection, and accountability attestations
