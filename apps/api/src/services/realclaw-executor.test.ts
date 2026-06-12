const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});

vi.stubGlobal('fetch', mockFetch);

import { executeRealClawSwap, isRealClawConfigured } from './realclaw-executor.js';

const SWAP_PARAMS = {
  walletAddress: '0xWallet',
  tokenIn: '0xTokenIn' as `0x${string}`,
  tokenOut: '0xTokenOut' as `0x${string}`,
  amountIn: '1000000000000000000',
  slippageBps: 100,
};

function mockResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  process.env.REALCLAW_API_KEY = 'test-key';
  process.env.REALCLAW_API_BASE = 'https://openclaw.mantle.xyz/api';
  process.env.REALCLAW_CONFIRM_TIMEOUT_MS = '100';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('executeRealClawSwap', () => {
  it('returns success on 200 success response', async () => {
    mockResponse({ status: 'success', txHash: '0xabc', amountOut: '999000' });

    const result = await executeRealClawSwap(SWAP_PARAMS);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.txHash).toBe('0xabc');
      expect(result.amountOut).toBe('999000');
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns failed on 4xx with no retry', async () => {
    mockResponse({ error: 'insufficient balance' }, 400);

    const result = await executeRealClawSwap(SWAP_PARAMS);

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.reason).toContain('insufficient balance');
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns error after 3 retries on 5xx', async () => {
    mockResponse({ error: 'service unavailable' }, 503);
    mockResponse({ error: 'service unavailable' }, 503);
    mockResponse({ error: 'service unavailable' }, 503);
    mockResponse({ error: 'service unavailable' }, 503);

    const promise = executeRealClawSwap(SWAP_PARAMS);
    // advance through all retry delays (1s + 2s + 4s)
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe('error');
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('returns success when pending_confirmation resolves on second poll', async () => {
    mockResponse({ status: 'pending_confirmation', confirmationId: 'abc' }, 200);
    mockResponse({ status: 'pending_confirmation', confirmationId: 'abc' }, 200);
    mockResponse({ status: 'success', txHash: '0xdef', amountOut: '500' }, 200);

    process.env.REALCLAW_CONFIRM_TIMEOUT_MS = '10000';
    const promise = executeRealClawSwap(SWAP_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.txHash).toBe('0xdef');
    }
  });

  it('returns pending_confirmation with reason timeout when polling times out', async () => {
    process.env.REALCLAW_CONFIRM_TIMEOUT_MS = '100';
    // Always return pending_confirmation so the polling loop never succeeds
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'pending_confirmation' }),
      text: () => Promise.resolve('{"status":"pending_confirmation"}'),
    });

    const promise = executeRealClawSwap(SWAP_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe('pending_confirmation');
    if (result.status === 'pending_confirmation') {
      expect(result.reason).toBe('timeout');
    }
  });
});

describe('isRealClawConfigured', () => {
  it('returns true when both vars are set', () => {
    expect(isRealClawConfigured()).toBe(true);
  });

  it('returns false and warns when API key is missing', () => {
    delete process.env.REALCLAW_API_KEY;
    const warnings: string[] = [];
    const result = isRealClawConfigured({ warn: (m) => warnings.push(m) });
    expect(result).toBe(false);
    expect(warnings[0]).toContain('REALCLAW_API_KEY');
  });

  it('returns false and warns when API base is missing', () => {
    delete process.env.REALCLAW_API_BASE;
    const warnings: string[] = [];
    const result = isRealClawConfigured({ warn: (m) => warnings.push(m) });
    expect(result).toBe(false);
    expect(warnings[0]).toContain('REALCLAW_API_BASE');
  });
});
