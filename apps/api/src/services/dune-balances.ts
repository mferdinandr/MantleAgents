import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { MANTLE_CHAIN, MANTLE_CHAIN_ID, mantleRpcUrl } from '../lib/chains.js';

const DUNE_API_BASE = 'https://api.sim.dune.com/v1/evm/balances';

export interface DuneBalance {
  chain_id: number;
  address: string;
  amount: string;
  symbol: string;
  name: string;
  decimals: number;
  price_usd: number;
  value_usd: number;
}

// Known Mantle tokens for the viem fallback path.
//
// IMPORTANT: addresses below are read from env (see apps/api/.env.example) so
// nothing is hardcoded/guessed. Verify each address on
// https://explorer.mantle.xyz before relying on it. Tokens with no address
// configured are simply skipped in the fallback.
interface MantleKnownToken {
  symbol: string;
  name: string;
  envVar: string;
  decimals: number;
  priceUsd: number;
}

const MANTLE_KNOWN_TOKENS: MantleKnownToken[] = [
  { symbol: 'USDC', name: 'USD Coin', envVar: 'MANTLE_USDC_ADDRESS', decimals: 6, priceUsd: 1.0 },
  { symbol: 'USDT', name: 'Tether USD', envVar: 'MANTLE_USDT_ADDRESS', decimals: 6, priceUsd: 1.0 },
  { symbol: 'WMNT', name: 'Wrapped Mantle', envVar: 'MANTLE_WMNT_ADDRESS', decimals: 18, priceUsd: 0 },
];

const ERC20_BALANCE_ABI = [{
  name: 'balanceOf', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

const mantleClient = createPublicClient({ chain: MANTLE_CHAIN, transport: http(mantleRpcUrl()) });

async function getWalletBalancesViem(walletAddress: string): Promise<DuneBalance[]> {
  const tokens = MANTLE_KNOWN_TOKENS
    .map((token) => {
      const address = process.env[token.envVar];
      return address ? { ...token, address: address as Address } : null;
    })
    .filter((t): t is MantleKnownToken & { address: Address } => t !== null);

  if (tokens.length === 0) {
    console.warn(
      '[mantle-balances] No Mantle token addresses configured (MANTLE_USDC_ADDRESS, ' +
        'MANTLE_USDT_ADDRESS, MANTLE_WMNT_ADDRESS). Returning empty balance list.',
    );
  }

  const results = await Promise.all(
    tokens.map(async (token) => {
      try {
        const balance = await mantleClient.readContract({
          address: token.address,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as Address],
        }) as bigint;
        if (balance === 0n) return null;
        const formatted = formatUnits(balance, token.decimals);
        const valueUsd = Number(formatted) * token.priceUsd;
        return {
          chain_id: MANTLE_CHAIN_ID,
          address: token.address as string,
          amount: balance.toString(),
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          price_usd: token.priceUsd,
          value_usd: valueUsd,
        } as DuneBalance;
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is NonNullable<typeof r> => r !== null) as DuneBalance[];
}

/**
 * Fetch ERC20 token balances for a wallet on Mantle.
 * Uses Dune SIM API when DUNE_SIM_API_KEY is set, otherwise falls back to
 * direct viem reads against MANTLE_KNOWN_TOKENS.
 */
export async function getWalletBalances(walletAddress: string): Promise<DuneBalance[]> {
  const apiKey = process.env.DUNE_SIM_API_KEY;

  if (!apiKey) {
    return getWalletBalancesViem(walletAddress);
  }

  const url = new URL(`${DUNE_API_BASE}/${walletAddress}`);
  url.searchParams.set('chain_ids', String(MANTLE_CHAIN_ID));
  url.searchParams.set('filters', 'erc20');
  url.searchParams.set('exclude_spam_tokens', 'true');

  const res: any = await fetch(url.toString(), {
    headers: { 'X-Sim-Api-Key': apiKey },
  });

  if (!res.ok) {
    console.warn(`[dune] API error ${res.status}, falling back to viem`);
    return getWalletBalancesViem(walletAddress);
  }

  const data = (await res.json()) as { balances: DuneBalance[] };
  return (data.balances ?? []).filter((b) => Number(b.amount) > 0);
}
