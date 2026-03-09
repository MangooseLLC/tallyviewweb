/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { QBOClient } from '@/lib/qbo-client';
import { refreshAccessToken } from '@/lib/qbo-auth';

export interface SyncResult {
  accounts: number;
  invoices: number;
  bills: number;
  purchases: number;
  journalEntries: number;
}

export async function syncOrganization(orgId: string): Promise<SyncResult> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error('Organization not found');

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
  const accountsResponse: any = await client.getAccounts();
  const accounts: any[] = accountsResponse.QueryResponse?.Account || [];
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
        currentBalance: acct.CurrentBalance ?? 0,
        active: acct.Active,
      },
      update: {
        name: acct.Name,
        accountType: acct.AccountType,
        accountSubType: acct.AccountSubType || null,
        classification: acct.Classification || null,
        currentBalance: acct.CurrentBalance ?? 0,
        active: acct.Active,
      },
    });
  }

  // 2. Sync invoices
  const invoicesResponse: any = await client.getInvoices();
  const invoices: any[] = invoicesResponse.QueryResponse?.Invoice || [];
  for (const inv of invoices) {
    await prisma.transaction.upsert({
      where: {
        orgId_qboId_sourceType: {
          orgId,
          qboId: String(inv.Id),
          sourceType: 'Invoice',
        },
      },
      create: {
        orgId,
        qboId: String(inv.Id),
        sourceType: 'Invoice',
        txnDate: new Date(inv.TxnDate),
        description: inv.DocNumber
          ? `Invoice #${inv.DocNumber}`
          : inv.Line?.[0]?.Description || null,
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
  const billsResponse: any = await client.getBills();
  const bills: any[] = billsResponse.QueryResponse?.Bill || [];
  for (const bill of bills) {
    await prisma.transaction.upsert({
      where: {
        orgId_qboId_sourceType: {
          orgId,
          qboId: String(bill.Id),
          sourceType: 'Bill',
        },
      },
      create: {
        orgId,
        qboId: String(bill.Id),
        sourceType: 'Bill',
        txnDate: new Date(bill.TxnDate),
        description: bill.Line?.[0]?.Description || null,
        amount: bill.TotalAmt,
        vendorName: bill.VendorRef?.name || null,
        accountName:
          bill.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name ||
          null,
        accountId:
          bill.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.value ||
          null,
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

  // 4. Sync purchases (direct expenses — checks, credit card charges, cash)
  const purchasesResponse: any = await client.getPurchases();
  const purchases: any[] = purchasesResponse.QueryResponse?.Purchase || [];
  for (const purch of purchases) {
    await prisma.transaction.upsert({
      where: {
        orgId_qboId_sourceType: {
          orgId,
          qboId: String(purch.Id),
          sourceType: 'Purchase',
        },
      },
      create: {
        orgId,
        qboId: String(purch.Id),
        sourceType: 'Purchase',
        txnDate: new Date(purch.TxnDate),
        description:
          purch.Line?.[0]?.Description ||
          `${purch.PaymentType || 'Purchase'}`,
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
  const jeResponse: any = await client.getJournalEntries();
  const journalEntries: any[] =
    jeResponse.QueryResponse?.JournalEntry || [];
  for (const je of journalEntries) {
    await prisma.transaction.upsert({
      where: {
        orgId_qboId_sourceType: {
          orgId,
          qboId: String(je.Id),
          sourceType: 'JournalEntry',
        },
      },
      create: {
        orgId,
        qboId: String(je.Id),
        sourceType: 'JournalEntry',
        txnDate: new Date(je.TxnDate),
        description: je.DocNumber
          ? `JE #${je.DocNumber}`
          : je.Line?.[0]?.Description || null,
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
