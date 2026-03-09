import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { FUJI_RPC_URL } from './config';

export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(FUJI_RPC_URL),
});
