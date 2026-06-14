const {
  mockExecuteUniswapSwap,
  mockIsMantleDexConfigured,
  mockFindMantleTokenByAddress,
} = vi.hoisted(() => {
  const mockExecuteUniswapSwap = vi.fn();
  const mockIsMantleDexConfigured = vi.fn();
  const mockFindMantleTokenByAddress = vi.fn();
  return {
    mockExecuteUniswapSwap,
    mockIsMantleDexConfigured,
    mockFindMantleTokenByAddress,
  };
});

vi.mock('./uniswap-swap.js', () => ({
  executeUniswapSwap: mockExecuteUniswapSwap,
}));

vi.mock('../lib/chains.js', () => ({
  isMantleDexConfigured: () => mockIsMantleDexConfigured(),
  findMantleTokenByAddress: (address: string) =>
    mockFindMantleTokenByAddress(address),
}));

import { executeTrade } from './trade-executor.js';

const MANTLE_PARAMS = {
  serverWalletId: 'wallet-id',
  serverWalletAddress: '0xServer',
  currency: 'USDC',
  direction: 'buy' as const,
  amountUsd: 10,
  chain: 'mantle' as const,
  inTokenAddress: '0xUsdc',
  outTokenAddress: '0xUsdt',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindMantleTokenByAddress.mockReturnValue({ decimals: 6 });
});

describe('executeTrade — Mantle chain', () => {
  it('calls executeUniswapSwap and returns success when configured', async () => {
    mockIsMantleDexConfigured.mockReturnValue(true);
    mockExecuteUniswapSwap.mockResolvedValue({
      txHash: '0xtx123',
      amountIn: 10_000_000n,
      amountOut: 9_900_000n,
      path: ['0xUsdc', '0xUsdt'],
    });

    const result = await executeTrade(MANTLE_PARAMS);

    expect(mockExecuteUniswapSwap).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.txHash).toBe('0xtx123');
      expect(result.amountIn).toBe('10000000');
      expect(result.amountOut).toBe('9900000');
    }
  });

  it('returns skipped result when the Mantle DEX is not configured', async () => {
    mockIsMantleDexConfigured.mockReturnValue(false);

    const result = await executeTrade(MANTLE_PARAMS);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failureCategory).toBe('skipped');
      expect(result.reason).toContain('Mantle DEX not configured');
    }
    expect(mockExecuteUniswapSwap).not.toHaveBeenCalled();
  });

  it('maps swap failures to TradeResult failure categories', async () => {
    mockIsMantleDexConfigured.mockReturnValue(true);
    mockExecuteUniswapSwap.mockRejectedValue(new Error('insufficient balance'));

    const result = await executeTrade(MANTLE_PARAMS);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failureCategory).toBe('insufficient_funds');
      expect(result.reason).toContain('insufficient balance');
    }
  });
});
