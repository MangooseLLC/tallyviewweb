/* Quick test: pull accounts from QBO sandbox and log the response */
import 'dotenv/config';

const BASE_URL = process.env.QBO_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com/v3';
const REALM_ID = process.env.QBO_REALM_ID!;
const ACCESS_TOKEN = process.env.QBO_ACCESS_TOKEN!;

async function main() {
  console.log('--- QBO Sandbox API Test ---');
  console.log(`Base URL:  ${BASE_URL}`);
  console.log(`Realm ID:  ${REALM_ID}`);
  console.log(`Token:     ${ACCESS_TOKEN.slice(0, 20)}...`);
  console.log('');

  // 1. Pull company info
  console.log('>> Fetching CompanyInfo...');
  const infoUrl = `${BASE_URL}/company/${REALM_ID}/companyinfo/${REALM_ID}?minorversion=73`;
  const infoRes = await fetch(infoUrl, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!infoRes.ok) {
    console.error(`CompanyInfo FAILED (${infoRes.status}):`, await infoRes.text());
    return;
  }
  const infoData = await infoRes.json();
  console.log(`   Company: ${infoData.CompanyInfo.CompanyName}`);
  console.log(`   Country: ${infoData.CompanyInfo.Country}`);
  console.log('');

  // 2. Pull accounts (chart of accounts)
  console.log('>> Fetching Accounts...');
  const acctQuery = encodeURIComponent('SELECT * FROM Account MAXRESULTS 1000 STARTPOSITION 1');
  const acctUrl = `${BASE_URL}/company/${REALM_ID}/query?query=${acctQuery}&minorversion=73`;
  const acctRes = await fetch(acctUrl, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!acctRes.ok) {
    console.error(`Accounts FAILED (${acctRes.status}):`, await acctRes.text());
    return;
  }
  const acctData = await acctRes.json();
  const accounts = acctData.QueryResponse?.Account || [];
  console.log(`   ${accounts.length} accounts returned`);
  console.log('   First 5:');
  for (const a of accounts.slice(0, 5)) {
    console.log(`     - [${a.AccountType}] ${a.Name}: $${a.CurrentBalance ?? 0}`);
  }
  console.log('');

  // 3. Pull invoices
  console.log('>> Fetching Invoices...');
  const invQuery = encodeURIComponent('SELECT * FROM Invoice MAXRESULTS 5 STARTPOSITION 1');
  const invUrl = `${BASE_URL}/company/${REALM_ID}/query?query=${invQuery}&minorversion=73`;
  const invRes = await fetch(invUrl, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!invRes.ok) {
    console.error(`Invoices FAILED (${invRes.status}):`, await invRes.text());
    return;
  }
  const invData = await invRes.json();
  const invoices = invData.QueryResponse?.Invoice || [];
  console.log(`   ${invoices.length} invoices returned`);
  for (const inv of invoices.slice(0, 3)) {
    console.log(`     - Invoice #${inv.DocNumber || inv.Id} | ${inv.TxnDate} | $${inv.TotalAmt} | Customer: ${inv.CustomerRef?.name || 'N/A'}`);
  }
  console.log('');

  // 4. Pull bills
  console.log('>> Fetching Bills...');
  const billQuery = encodeURIComponent('SELECT * FROM Bill MAXRESULTS 5 STARTPOSITION 1');
  const billUrl = `${BASE_URL}/company/${REALM_ID}/query?query=${billQuery}&minorversion=73`;
  const billRes = await fetch(billUrl, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!billRes.ok) {
    console.error(`Bills FAILED (${billRes.status}):`, await billRes.text());
    return;
  }
  const billData = await billRes.json();
  const bills = billData.QueryResponse?.Bill || [];
  console.log(`   ${bills.length} bills returned`);
  for (const b of bills.slice(0, 3)) {
    console.log(`     - Bill #${b.Id} | ${b.TxnDate} | $${b.TotalAmt} | Vendor: ${b.VendorRef?.name || 'N/A'}`);
  }

  console.log('');
  console.log('--- TEST PASSED: Data is coming back from QuickBooks sandbox ---');
}

main().catch(console.error);
