const { mockExecuteRealClawSwap, mockIsRealClawConfigured } = vi.hoisted(() => {
  const mockExecuteRealClawSwap = vi.fn();
  const mockIsRealClawConfigured = vi.fn();
  return { mockExecuteRealClawSwap, mockIsRealClawConfigured };
});

vi.mock('./realclaw-executor.js', () => ({
  executeRealClawSwap: mockExecuteRealClawSwap,
  isRealClawConfigured: mockIsRealClawConfigured,
}));

import { executeTrade } from './trade-executor.js';

const MANTLE_PARAMS = {
  serverWalletId: 'wallet-id',
  serverWalletAddress: '0xServer',
  currency: 'WMNT',
  direction: 'buy' as const,
  amountUsd: 10,
  chain: 'mantle' as const,
  inTokenAddress: '0xUsdc',
  outTokenAddress: '0xWmnt',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('executeTrade — Mantle chain', () => {
  it('calls executeRealClawSwap and returns success when configured', async () => {
    mockIsRealClawConfigured.mockReturnValue(true);
    mockExecuteRealClawSwap.mockResolvedValue({
      status: 'success',
      txHash: '0xtx123',
      amountOut: '10000000',
    });

    const result = await executeTrade(MANTLE_PARAMS);

    expect(mockExecuteRealClawSwap).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.txHash).toBe('0xtx123');
    }
  });

  it('does not call the AVE path for Mantle trades', async () => {
    mockIsRealClawConfigured.mockReturnValue(true);
    mockExecuteRealClawSwap.mockResolvedValue({
      status: 'success',
      txHash: '0xtx',
      amountOut: '1',
    });

    const result = await executeTrade(MANTLE_PARAMS);

    // AVE path (getAmountOut/createEvmTx) is not mocked — if we get here without
    // an unhandled error, the Mantle branch was taken correctly
    expect(result.success).toBe(true);
    expect(mockExecuteRealClawSwap).toHaveBeenCalled();
  });

  it('returns skipped result when RealClaw is not configured', async () => {
    mockIsRealClawConfigured.mockReturnValue(false);

    const result = await executeTrade(MANTLE_PARAMS);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failureCategory).toBe('skipped');
      expect(result.reason).toContain('RealClaw not configured');
    }
    expect(mockExecuteRealClawSwap).not.toHaveBeenCalled();
  });

  it('maps RealClaw failed status to TradeResult failure', async () => {
    mockIsRealClawConfigured.mockReturnValue(true);
    mockExecuteRealClawSwap.mockResolvedValue({
      status: 'failed',
      reason: 'insufficient balance',
    });

    const result = await executeTrade(MANTLE_PARAMS);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toContain('insufficient balance');
    }
  });

  it('maps RealClaw pending_confirmation to TradeResult with pending_confirmation category', async () => {
    mockIsRealClawConfigured.mockReturnValue(true);
    mockExecuteRealClawSwap.mockResolvedValue({
      status: 'pending_confirmation',
      reason: 'timeout',
    });

    const result = await executeTrade(MANTLE_PARAMS);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failureCategory).toBe('pending_confirmation');
    }
  });
});
