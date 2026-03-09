-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "qboRealmId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "qboId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountSubType" TEXT,
    "classification" TEXT,
    "currentBalance" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "irs990Category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "qboId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "txnDate" DATETIME NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "accountName" TEXT,
    "accountId" TEXT,
    "vendorName" TEXT,
    "customerName" TEXT,
    "status" TEXT,
    "irs990Category" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_qboRealmId_key" ON "Organization"("qboRealmId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_orgId_qboId_key" ON "Account"("orgId", "qboId");

-- CreateIndex
CREATE INDEX "Transaction_orgId_txnDate_idx" ON "Transaction"("orgId", "txnDate");

-- CreateIndex
CREATE INDEX "Transaction_orgId_sourceType_idx" ON "Transaction"("orgId", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orgId_qboId_sourceType_key" ON "Transaction"("orgId", "qboId", "sourceType");
