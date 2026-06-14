import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPriceCache, fetchBatchPrices, fetchAllPrices, getTokenPrice } from './price-service.js';

const MOCK_KEY = 'CG-testkey';
let originalKey: string | undefined;

beforeEach(() => {
  clearPriceCache();
  originalKey = process.env.COINGECKO_API_KEY;
  process.env.COINGECKO_API_KEY = MOCK_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env.COINGECKO_API_KEY = originalKey;
});

describe('fetchBatchPrices', () => {
  it('returns price map on successful batch fetch', async () => {
    const mockResponse = { '0xabc': { usd: 1.0 }, '0xdef': { usd: 2.5 } };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await fetchBatchPrices(['0xabc', '0xdef']);

    expect(result.get('0xabc')).toBe(1.0);
    expect(result.get('0xdef')).toBe(2.5);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('returns empty map for tokens not listed on CoinGecko', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const result = await fetchBatchPrices(['0xunknown']);

    expect(result.size).toBe(0);
  });

  it('returns empty map when COINGECKO_API_KEY is missing', async () => {
    process.env.COINGECKO_API_KEY = '';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await fetchBatchPrices(['0xabc']);

    expect(result.size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('getTokenPrice', () => {
  it('returns price from CoinGecko', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ '0xabc': { usd: 3.14 } }), { status: 200 }),
    );

    const price = await getTokenPrice('mantle', '0xabc');
    expect(price).toBe(3.14);
  });

  it('returns null when token not on CoinGecko', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const price = await getTokenPrice('mantle', '0xunknown');
    expect(price).toBeNull();
  });

  it('returns cached price within 60s without new HTTP call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ '0xabc': { usd: 5.0 } }), { status: 200 }),
    );

    await getTokenPrice('mantle', '0xabc');
    await getTokenPrice('mantle', '0xabc');

    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe('fetchAllPrices', () => {
  it('returns symbol → price map', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ '0xabc': { usd: 1.0 }, '0xdef': { usd: 2.0 } }), {
        status: 200,
      }),
    );

    const result = await fetchAllPrices([
      { symbol: 'USDC', address: '0xabc', chain: 'mantle' },
      { symbol: 'USDT', address: '0xdef', chain: 'mantle' },
    ]);

    expect(result.get('USDC')).toBe(1.0);
    expect(result.get('USDT')).toBe(2.0);
  });
});
