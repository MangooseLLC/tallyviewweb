/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export class QBOClient {
  private baseUrl: string;
  private accessToken: string;
  private realmId: string;

  constructor(accessToken: string, realmId: string) {
    this.baseUrl =
      process.env.QBO_BASE_URL ||
      'https://sandbox-quickbooks.api.intuit.com/v3';
    this.accessToken = accessToken;
    this.realmId = realmId;
  }

  private async request<T>(endpoint: string, retries = MAX_RETRIES): Promise<T> {
    const url = `${this.baseUrl}/company/${this.realmId}/${endpoint}`;
    const separator = url.includes('?') ? '&' : '?';
    const urlWithVersion = `${url}${separator}minorversion=73`;

    const response = await fetch(urlWithVersion, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 && retries > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return this.request<T>(endpoint, retries - 1);
      }
      const error = await response.text();
      throw new Error(`QBO API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  async query<T>(
    entity: string,
    where?: string,
    maxResults = 1000,
    startPosition = 1
  ): Promise<T> {
    let sql = `SELECT * FROM ${entity}`;
    if (where) sql += ` WHERE ${where}`;
    sql += ` MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;
    return this.request(`query?query=${encodeURIComponent(sql)}`);
  }

  async getCompanyInfo(): Promise<any> {
    return this.request(`companyinfo/${this.realmId}`);
  }

  async getAccounts(startPosition = 1, maxResults = 1000): Promise<any> {
    return this.query('Account', undefined, maxResults, startPosition);
  }

  async getInvoices(startPosition = 1, maxResults = 100): Promise<any> {
    return this.query('Invoice', undefined, maxResults, startPosition);
  }

  async getBills(startPosition = 1, maxResults = 100): Promise<any> {
    return this.query('Bill', undefined, maxResults, startPosition);
  }

  async getBillPayments(startPosition = 1, maxResults = 100): Promise<any> {
    return this.query('BillPayment', undefined, maxResults, startPosition);
  }

  async getPurchases(startPosition = 1, maxResults = 100): Promise<any> {
    return this.query('Purchase', undefined, maxResults, startPosition);
  }

  async getVendors(startPosition = 1, maxResults = 100): Promise<any> {
    return this.query('Vendor', undefined, maxResults, startPosition);
  }

  async getCustomers(startPosition = 1, maxResults = 100): Promise<any> {
    return this.query('Customer', undefined, maxResults, startPosition);
  }

  async getJournalEntries(startPosition = 1, maxResults = 100): Promise<any> {
    return this.query('JournalEntry', undefined, maxResults, startPosition);
  }

  async getProfitAndLoss(startDate: string, endDate: string): Promise<any> {
    return this.request(
      `reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getBalanceSheet(date: string): Promise<any> {
    return this.request(`reports/BalanceSheet?date=${date}`);
  }
}
