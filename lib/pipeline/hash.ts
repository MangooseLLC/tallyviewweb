import { keccak256, encodePacked, toHex } from 'viem';
import type { MonthlyFinancialPackage } from './ingest';

/**
 * Generates a Merkle root from a month's financial data.
 *
 * Approach: hash each major section independently, then combine into a root.
 * The canonical JSON of each section is hashed via keccak256.
 * Leaf ordering is deterministic: revenue → expenses → vendors → balance.
 */

function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

function hashLeaf(data: unknown): `0x${string}` {
  const json = JSON.stringify(sortKeysDeep(data));
  return keccak256(toHex(json));
}

function hashPair(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  const ordered = a < b ? [a, b] : [b, a];
  return keccak256(encodePacked(['bytes32', 'bytes32'], [ordered[0], ordered[1]]));
}

function buildMerkleRoot(leaves: `0x${string}`[]): `0x${string}` {
  if (leaves.length === 0) return keccak256(toHex('empty'));
  if (leaves.length === 1) return leaves[0];

  const nextLevel: `0x${string}`[] = [];
  for (let i = 0; i < leaves.length; i += 2) {
    if (i + 1 < leaves.length) {
      nextLevel.push(hashPair(leaves[i], leaves[i + 1]));
    } else {
      nextLevel.push(leaves[i]);
    }
  }
  return buildMerkleRoot(nextLevel);
}

export interface MerkleResult {
  merkleRoot: `0x${string}`;
  leafHashes: `0x${string}`[];
  month: string;
}

export function generateMerkleRoot(pkg: MonthlyFinancialPackage): MerkleResult {
  const leaves: `0x${string}`[] = [
    hashLeaf(pkg.revenue),
    hashLeaf(pkg.expenses),
    hashLeaf(pkg.vendorPayments),
    hashLeaf(pkg.balanceSheet),
  ];

  return {
    merkleRoot: buildMerkleRoot(leaves),
    leafHashes: leaves,
    month: pkg.month,
  };
}

/**
 * Schema hash — identifies the data schema version so contract consumers
 * know how to decode or validate the Merkle tree structure.
 */
export const SCHEMA_HASH = keccak256(
  toHex('tallyview-quickbooks-v1:revenue,expenses,vendors,balance')
);

/** Generate Merkle roots for all provided months */
export function generateAllMerkleRoots(
  months: MonthlyFinancialPackage[]
): MerkleResult[] {
  return months.map(generateMerkleRoot);
}
