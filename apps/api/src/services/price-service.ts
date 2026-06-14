// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PRICE_CACHE_TTL_MS = 60_000; // 1 minute

let _warnedMissingKey = false;

function getCoinGeckoClient(): { baseUrl: string; authHeader: Record<string, string> } | null {
  const key = process.env.COINGECKO_API_KEY ?? '';
  if (!key) {
    if (!_warnedMissingKey) {
      console.warn('[price-service] COINGECKO_API_KEY is not set — price fetches will return null');
      _warnedMissingKey = true;
    }
    return null;
  }
  const isPro = !key.startsWith('CG-');
  return {
    baseUrl: isPro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3',
    authHeader: { [isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key']: key },
  };
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

interface CachedPrice {
  price: number | null;
  fetchedAt: number;
}

const priceCache = new Map<string, CachedPrice>();

function cacheKey(address: string): string {
  return address.toLowerCase();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get current price for a single token via CoinGecko.
 * Returns USD price or null if not found. Results cached for 1 minute.
 */
export async function getTokenPrice(
  _chain: string,
  address: string,
): Promise<number | null> {
  const key = cacheKey(address);
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cached.price;
  }

  const result = await fetchBatchPrices([address]);
  const price = result.get(address.toLowerCase()) ?? null;
  return price;
}

/**
 * Batch fetch prices for multiple token contract addresses on Mantle.
 * Returns a Map of lowercase address → USD price.
 */
export async function fetchBatchPrices(
  tokenAddresses: string[],
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (tokenAddresses.length === 0) return prices;

  const client = getCoinGeckoClient();
  if (!client) return prices;

  const { baseUrl, authHeader } = client;
  const csv = tokenAddresses.map((a) => a.toLowerCase()).join(',');
  const url = `${baseUrl}/simple/token_price/mantle?contract_addresses=${csv}&vs_currencies=usd`;

  try {
    const res = await fetch(url, { headers: { ...authHeader, Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[price-service] CoinGecko batch fetch failed: ${res.status} ${res.statusText}`);
      return prices;
    }
    const data = (await res.json()) as Record<string, { usd?: number }>;

    const now = Date.now();
    for (const [addr, val] of Object.entries(data)) {
      const price = val?.usd ?? null;
      if (price !== null) {
        prices.set(addr.toLowerCase(), price);
      }
      priceCache.set(cacheKey(addr), { price, fetchedAt: now });
    }
  } catch (err) {
    console.warn('[price-service] Batch price fetch failed:', err);
  }

  return prices;
}

/**
 * Fetch all prices for a list of tokens.
 * Returns a Map of symbol → USD price.
 *
 * Consumed by market-data-service and snapshot-cron.
 */
export async function fetchAllPrices(
  tokens: Array<{ symbol: string; address: string; chain: string }>,
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (tokens.length === 0) return prices;

  const addresses = tokens.map((t) => t.address.toLowerCase());

  try {
    const batchResult = await fetchBatchPrices(addresses);

    for (const token of tokens) {
      const price = batchResult.get(token.address.toLowerCase()) ?? 0;
      prices.set(token.symbol, price);
    }
  } catch (err) {
    console.warn('[price-service] fetchAllPrices failed:', err);
  }

  return prices;
}

/** Clear the price cache (useful for testing). */
export function clearPriceCache(): void {
  priceCache.clear();
}
