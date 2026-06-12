// chain-client.ts — shared viem PublicClient for Mantle reads
// (vault adapters, position sync, balance checks, etc.)

import { createPublicClient, http } from 'viem';
import { MANTLE_CHAIN, mantleRpcUrl } from './chains.js';

export const publicClient = createPublicClient({
  chain: MANTLE_CHAIN,
  transport: http(mantleRpcUrl()),
});

export const chainClient = publicClient;
