import { keccak256, toHex, getAddress, type Address } from 'viem';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

export function deriveOrgAddress(orgId: string): Address {
  const hash = keccak256(toHex(orgId));
  return getAddress('0x' + hash.slice(2, 42));
}
