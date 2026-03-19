import { type Address } from 'viem';

export const FUJI_CHAIN_ID = 43113;
export const FUJI_RPC_URL = process.env.FUJI_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc';

export const CONTRACTS = {
  auditLedger: '0x308C17d0a3ABDb1f19a73107E0BE4Ef9f97c9127' as Address,
  complianceEngine: '0x38Fd05140B19F4913366825C8Ca5A836488eb7B7' as Address,
  anomalyRegistry: '0x93c63e8441E1EFB5035153f108FAAaDf34628229' as Address,
  entityGraph: '0x6DB3652c9Ff0f1d6fa5b6671F930311A2fe33947' as Address,
  evidenceVault: '0x43B4A18057BFA05180e3181FFF3BF6e4B0a34F20' as Address,
} as const;

/**
 * Maps static org IDs from lib/data/ to on-chain addresses.
 * Only orgs with real on-chain data get a non-null mapping.
 * Dashboards check this map: if null, they fall back to static data.
 */
export const ORG_ADDRESS_MAP: Record<string, Address | null> = {
  'org-bright-futures': '0x92e01831c2C38180820070c333Acd9A58B6Ec20d',
};

export function getOrgAddress(orgId: string): Address | null {
  return ORG_ADDRESS_MAP[orgId] ?? null;
}

export const FUJI_EXPLORER_URL = 'https://testnet.snowtrace.io';

export function txUrl(hash: string): string {
  return `${FUJI_EXPLORER_URL}/tx/${hash}`;
}

export function addressUrl(addr: string): string {
  return `${FUJI_EXPLORER_URL}/address/${addr}`;
}
