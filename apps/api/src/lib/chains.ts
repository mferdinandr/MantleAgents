// chains.ts — Centralized Mantle chain configuration.
//
// Single source of truth for which Mantle network the whole API talks to
// (on-chain registration, attestations, trade execution, balance reads).
//
// Switch networks via MANTLE_NETWORK=mainnet|testnet (defaults to testnet
// for safety — switch to mainnet only when ready to submit / go live).

import { mantle, mantleSepoliaTestnet } from 'viem/chains';
import type { Chain } from 'viem';

export type MantleNetwork = 'mainnet' | 'testnet';

function resolveNetwork(): MantleNetwork {
  const raw = (process.env.MANTLE_NETWORK || 'testnet').toLowerCase();
  if (raw === 'mainnet' || raw === 'mantle' || raw === 'mantle-mainnet') return 'mainnet';
  return 'testnet';
}

export const MANTLE_NETWORK: MantleNetwork = resolveNetwork();

// Mantle Sepolia Testnet (chainId 5003) — the legacy "Mantle Testnet"
// (chainId 5001, rpc.testnet.mantle.xyz) is deprecated/offline as of 2026.
export const MANTLE_TESTNET_CHAIN: Chain = mantleSepoliaTestnet;

export const MANTLE_CHAIN: Chain =
  MANTLE_NETWORK === 'mainnet' ? mantle : MANTLE_TESTNET_CHAIN;

export const MANTLE_CHAIN_ID = MANTLE_CHAIN.id; // 5000 (mainnet) | 5003 (testnet)

export function mantleRpcUrl(): string {
  return process.env.MANTLE_RPC_URL || MANTLE_CHAIN.rpcUrls.default.http[0];
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function mantleExplorerTxUrl(txHash: string): string {
  const base = trimTrailingSlash(MANTLE_CHAIN.blockExplorers?.default.url ?? 'https://explorer.mantle.xyz');
  return `${base}/tx/${txHash}`;
}

export function mantleExplorerAddressUrl(address: string): string {
  const base = trimTrailingSlash(MANTLE_CHAIN.blockExplorers?.default.url ?? 'https://explorer.mantle.xyz');
  return `${base}/address/${address}`;
}

// ---------------------------------------------------------------------------
// Token addresses on Mantle.
//
// IMPORTANT: verify every address against the relevant explorer before using
// it for any real transfer/swap. Placeholders below are intentionally left
// empty so a missing config fails loudly instead of sending funds to a
// wrong/guessed address.
// ---------------------------------------------------------------------------

export interface MantleTokenConfig {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
}

function requireTokenAddress(envVar: string, symbol: string): `0x${string}` {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `${envVar} is not set. Verify the ${symbol} contract address on ` +
        `${mantleExplorerAddressUrl('')} and add it to your .env before using ` +
        `Mantle token transfers/swaps.`,
    );
  }
  return value as `0x${string}`;
}

export function getMantleUsdc(): MantleTokenConfig {
  return {
    symbol: 'USDC',
    address: requireTokenAddress('MANTLE_USDC_ADDRESS', 'USDC'),
    decimals: 6,
  };
}

export function getMantleUsdt(): MantleTokenConfig {
  return {
    symbol: 'USDT',
    address: requireTokenAddress('MANTLE_USDT_ADDRESS', 'USDT'),
    decimals: 6,
  };
}

export function getMantleWmnt(): MantleTokenConfig {
  return {
    symbol: 'WMNT',
    address: requireTokenAddress('MANTLE_WMNT_ADDRESS', 'WMNT'),
    decimals: 18,
  };
}

export function getMantleTokenBySymbol(symbol: string): MantleTokenConfig | null {
  switch (symbol.toUpperCase()) {
    case 'USDC':
      return getMantleUsdc();
    case 'USDT':
      return getMantleUsdt();
    case 'WMNT':
      return getMantleWmnt();
    default:
      return null;
  }
}

export function findMantleTokenByAddress(address: string): MantleTokenConfig | null {
  const normalized = address.toLowerCase();

  for (const token of [getMantleUsdc(), getMantleUsdt(), getMantleWmnt()]) {
    if (token.address.toLowerCase() === normalized) {
      return token;
    }
  }

  return null;
}

export function getMantleDexRouterAddress(): `0x${string}` {
  return requireTokenAddress('MANTLE_DEX_ROUTER_ADDRESS', 'Mantle UniswapV2Router02');
}

export function getMantleDexFactoryAddress(): `0x${string}` {
  return requireTokenAddress('MANTLE_DEX_FACTORY_ADDRESS', 'Mantle UniswapV2Factory');
}

export function isMantleDexConfigured(): boolean {
  return Boolean(
    process.env.MANTLE_DEX_ROUTER_ADDRESS && process.env.MANTLE_DEX_FACTORY_ADDRESS,
  );
}

// ---------------------------------------------------------------------------
// ERC-8004 registries on Mantle Testnet (chainId 5001).
// ---------------------------------------------------------------------------

export function getIdentityRegistryAddress(): `0x${string}` {
  return requireTokenAddress('MANTLE_IDENTITY_REGISTRY_ADDRESS', 'ERC-8004 IdentityRegistry');
}

export function getReputationRegistryAddress(): `0x${string}` {
  return requireTokenAddress('MANTLE_REPUTATION_REGISTRY_ADDRESS', 'ERC-8004 ReputationRegistry');
}

export function getAttestationRegistryAddress(): `0x${string}` {
  return requireTokenAddress(
    'MANTLE_ATTESTATION_REGISTRY_ADDRESS',
    'AgentAttestationRegistry',
  );
}
