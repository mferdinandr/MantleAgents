const { mockGetMantleDexRouterAddress, mockGetMantleWmnt } = vi.hoisted(() => ({
  mockGetMantleDexRouterAddress: vi.fn(),
  mockGetMantleWmnt: vi.fn(),
}));

vi.mock('../lib/chains.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/chains.js')>();
  return {
    ...actual,
    getMantleDexRouterAddress: () => mockGetMantleDexRouterAddress(),
    getMantleWmnt: () => mockGetMantleWmnt(),
  };
});

vi.mock('../lib/relayer.js', () => ({
  getRelayer: () => ({ address: '0x00000000000000000000000000000000000000aa' }),
  sendRelayerTransaction: vi.fn(),
}));

import { maxUint256 } from 'viem';
import { executeUniswapSwap, getUniswapQuote } from './uniswap-swap.js';

const ROUTER = '0x00000000000000000000000000000000000000bb';
const WMNT = '0x00000000000000000000000000000000000000cc';
const TOKEN_IN = '0x0000000000000000000000000000000000000001';
const TOKEN_OUT = '0x0000000000000000000000000000000000000002';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMantleDexRouterAddress.mockReturnValue(ROUTER);
  mockGetMantleWmnt.mockReturnValue({
    symbol: 'WMNT',
    address: WMNT,
    decimals: 18,
  });
});

describe('getUniswapQuote', () => {
  it('returns a direct-pair quote when the direct pool exists', async () => {
    const publicClient = {
      readContract: vi.fn().mockResolvedValue([1_000_000n, 990_000n]),
    } as any;

    const quote = await getUniswapQuote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
      publicClient,
    });

    expect(quote).toEqual({
      amountOut: 990_000n,
      path: [TOKEN_IN, TOKEN_OUT],
    });
  });

  it('falls back to a WMNT-bridged quote when the direct pool is missing', async () => {
    const publicClient = {
      readContract: vi
        .fn()
        .mockRejectedValueOnce(new Error('no direct pair'))
        .mockResolvedValueOnce([1_000_000n, 500_000n, 970_000n]),
    } as any;

    const quote = await getUniswapQuote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
      publicClient,
    });

    expect(quote).toEqual({
      amountOut: 970_000n,
      path: [TOKEN_IN, WMNT, TOKEN_OUT],
    });
  });

  it('returns null when no route exists', async () => {
    const publicClient = {
      readContract: vi.fn().mockRejectedValue(new Error('missing pair')),
    } as any;

    const quote = await getUniswapQuote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
      publicClient,
    });

    expect(quote).toBeNull();
  });
});

describe('executeUniswapSwap', () => {
  it('skips redundant approval when allowance is already sufficient', async () => {
    const publicClient = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce([1_000_000n, 990_000n])
        .mockResolvedValueOnce(maxUint256),
    } as any;
    const sendTx = vi.fn().mockResolvedValue('0xswap');

    const result = await executeUniswapSwap({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
      slippageBps: 100,
      publicClient,
      relayerAddress: '0x00000000000000000000000000000000000000aa',
      sendTx,
    });

    expect(sendTx).toHaveBeenCalledTimes(1);
    expect(sendTx).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ROUTER,
      }),
    );
    expect(result).toEqual({
      txHash: '0xswap',
      amountIn: 1_000_000n,
      amountOut: 990_000n,
      path: [TOKEN_IN, TOKEN_OUT],
    });
  });
});
