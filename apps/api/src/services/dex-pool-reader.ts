import { createPublicClient, http, formatUnits } from 'viem';
import {
  MANTLE_CHAIN,
  mantleRpcUrl,
  getMantleDexFactoryAddress,
  getMantleUsdc,
  getMantleUsdt,
  getMantleWmnt,
} from '../lib/chains.js';
import type { YieldOpportunity } from '@mantleagents/shared';

const FACTORY_ABI = [
  {
    name: 'getPair',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }],
    outputs: [{ name: 'pair', type: 'address' }],
  },
] as const;

const PAIR_ABI = [
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// 0.3% fee * assume 10% daily turnover * 365 days ≈ 10.95% APR (honest estimate for demo)
const ESTIMATED_APR = 10.95;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache: { opportunities: YieldOpportunity[]; fetchedAt: number } | null = null;

interface PairDef {
  name: string;
  tokenA: { symbol: string; address: string; decimals: number };
  tokenB: { symbol: string; address: string; decimals: number };
}

export async function fetchDexPoolOpportunities(): Promise<YieldOpportunity[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.opportunities;
  }

  const usdc = getMantleUsdc();
  const usdt = getMantleUsdt();
  const wmnt = getMantleWmnt();

  const pairs: PairDef[] = [
    { name: 'USDC/WMNT LP', tokenA: { ...usdc, decimals: 6 }, tokenB: { ...wmnt, decimals: 18 } },
    { name: 'USDT/WMNT LP', tokenA: { ...usdt, decimals: 6 }, tokenB: { ...wmnt, decimals: 18 } },
    { name: 'USDC/USDT LP', tokenA: { ...usdc, decimals: 6 }, tokenB: { ...usdt, decimals: 6 } },
  ];

  const factory = getMantleDexFactoryAddress();
  const client = createPublicClient({ chain: MANTLE_CHAIN, transport: http(mantleRpcUrl()) });

  const opportunities: YieldOpportunity[] = [];

  for (const pair of pairs) {
    try {
      const pairAddress = await client.readContract({
        address: factory,
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: [pair.tokenA.address as `0x${string}`, pair.tokenB.address as `0x${string}`],
      });

      if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
        console.warn(`[dex-pool-reader] Pair ${pair.name} not found in factory`);
        continue;
      }

      const [token0Addr, reserves] = await Promise.all([
        client.readContract({ address: pairAddress, abi: PAIR_ABI, functionName: 'token0' }),
        client.readContract({ address: pairAddress, abi: PAIR_ABI, functionName: 'getReserves' }),
      ]);

      const [reserve0, reserve1] = reserves;

      if (reserve0 === 0n && reserve1 === 0n) {
        console.warn(`[dex-pool-reader] Pair ${pair.name} has zero reserves, skipping`);
        continue;
      }

      // Determine which reserve belongs to which token
      const isToken0A = token0Addr.toLowerCase() === pair.tokenA.address.toLowerCase();
      const reserveA = isToken0A ? reserve0 : reserve1;
      const reserveB = isToken0A ? reserve1 : reserve0;

      const amountA = Number(formatUnits(reserveA, pair.tokenA.decimals));
      const amountB = Number(formatUnits(reserveB, pair.tokenB.decimals));

      // TVL: sum both sides. For WMNT pairs, price WMNT at $1 (testnet mock).
      // For USDC/USDT pair, both are $1.
      const tvl = amountA + amountB;

      opportunities.push({
        id: `mantle-dex-${pair.name.toLowerCase().replace(/\//g, '-').replace(/ /g, '-')}`,
        name: pair.name,
        vaultAddress: pairAddress,
        protocol: 'Uniswap V2 (Mantle DEX)',
        status: 'active',
        apr: ESTIMATED_APR,
        tvl,
        dailyRewards: 0,
        tokens: [
          { symbol: pair.tokenA.symbol, address: pair.tokenA.address, decimals: pair.tokenA.decimals },
          { symbol: pair.tokenB.symbol, address: pair.tokenB.address, decimals: pair.tokenB.decimals },
        ],
        type: 'UNISWAP_V2_LP',
      });

      console.log(`[dex-pool-reader] ${pair.name}: pairAddr=${pairAddress}, TVL≈$${tvl.toFixed(0)}, APR=${ESTIMATED_APR}%`);
    } catch (err) {
      console.error(`[dex-pool-reader] Failed to fetch pair ${pair.name}:`, err);
    }
  }

  cache = { opportunities, fetchedAt: Date.now() };
  return opportunities;
}
