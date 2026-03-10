import { createPublicClient, createWalletClient, http, type WalletClient, type Transport, type Chain, type Account } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { FUJI_RPC_URL } from './config';

export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(FUJI_RPC_URL),
});

type RelayWalletClient = WalletClient<Transport, Chain, Account>;

let _walletClient: RelayWalletClient | null = null;

export function getRelayWalletClient(): RelayWalletClient | null {
  if (_walletClient) return _walletClient;

  const key = process.env.RELAY_PRIVATE_KEY;
  if (!key) return null;

  const account = privateKeyToAccount(key as `0x${string}`);
  _walletClient = createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http(FUJI_RPC_URL),
  });

  return _walletClient;
}
