import {
  MantleDataClient,
  type Chain,
  type EvmChain,
  getAmountOut,
  createEvmTx,
} from '@mantleagents/mantle-data';
import { encodeFunctionData, parseUnits, maxUint256 } from 'viem';
import {
  ALL_TOKEN_ADDRESSES,
  type TradeResult,
  type FailureCategory,
  getTokenDecimals,
} from '@mantleagents/shared';
import { sendRelayerTransaction } from '../lib/relayer.js';
import { executeUniswapSwap } from './uniswap-swap.js';
import {
  findMantleTokenByAddress,
  isMantleDexConfigured,
} from '../lib/chains.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_SLIPPAGE_BPS = '100'; // 1%
const DEFAULT_SOLANA_FEE = '100000'; // 0.0001 SOL priority fee

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Ensure the DEX router has sufficient ERC20 allowance to spend `tokenAddress`
 * from `walletAddress`. Sends an approve(spender, maxUint256) tx if needed.
 */
async function ensureErc20Allowance(
  tokenAddress: string,
  walletAddress: string,
  spender: string,
  requiredAmount: bigint,
): Promise<void> {
  // Check current allowance via eth_call
  const allowanceData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [walletAddress as `0x${string}`, spender as `0x${string}`],
  });

  try {
    const { createPublicClient, http } = await import('viem');
    const { MANTLE_CHAIN, mantleRpcUrl } = await import('../lib/chains.js');
    const publicClient = createPublicClient({ chain: MANTLE_CHAIN, transport: http(mantleRpcUrl()) });
    const result = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [walletAddress as `0x${string}`, spender as `0x${string}`],
    });
    if ((result as bigint) >= requiredAmount) {
      return; // already sufficient
    }
  } catch {
    // If allowance check fails, proceed with approval anyway
  }

  console.log(`[trade] Approving ${spender} to spend token ${tokenAddress}`);
  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender as `0x${string}`, maxUint256],
  });
  await sendRelayerTransaction({
    to: tokenAddress,
    data: approveData,
  });
  console.log(`[trade] Approval tx submitted`);
}

let _aveClient: MantleDataClient | undefined;

function getMantleDataClient(): MantleDataClient {
  if (!_aveClient) {
    _aveClient = new MantleDataClient();
  }
  return _aveClient;
}

function mapFailureCategory(statusOrReason: string, maybeReason?: string): FailureCategory {
  const combined = `${statusOrReason} ${maybeReason ?? ''}`.toLowerCase();

  if (
    combined.includes('slippage') ||
    combined.includes('price impact') ||
    combined.includes('minimum received')
  ) {
    return 'slippage_exceeded';
  }

  if (
    combined.includes('risk') ||
    combined.includes('honeypot') ||
    combined.includes('unsafe') ||
    combined.includes('simulation') ||
    combined.includes('tax')
  ) {
    return 'risk_flagged';
  }

  if (
    combined.includes('insufficient') ||
    combined.includes('balance') ||
    combined.includes('allowance') ||
    combined.includes('funds')
  ) {
    return 'insufficient_funds';
  }

  return 'other';
}

function toFailureResult(error: unknown): Extract<TradeResult, { success: false }> {
  const reason = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    failureCategory: mapFailureCategory(reason),
    reason,
  };
}

// ---------------------------------------------------------------------------
// Mantle / DEX trade path
// ---------------------------------------------------------------------------

type MantelTradeParams = {
  serverWalletAddress: string;
  currency?: string;
  direction?: string;
  amountUsd?: number;
  amountRaw?: string;
  inTokenAddress?: string;
  outTokenAddress?: string;
  slippageBps?: string;
};

function getMantleTokenDecimals(
  tokenAddress: string,
  fallbackSymbol?: string,
): number {
  try {
    const token = findMantleTokenByAddress(tokenAddress);
    if (token) return token.decimals;
  } catch {
    // Fall back to symbol metadata when env-backed lookup is unavailable.
  }

  return fallbackSymbol ? getTokenDecimals(fallbackSymbol) : 18;
}

async function executeMantle(params: MantelTradeParams): Promise<TradeResult> {
  if (!isMantleDexConfigured()) {
    return {
      success: false,
      failureCategory: 'skipped',
      reason: 'Mantle DEX not configured',
    };
  }

  const {
    currency,
    direction,
    amountUsd,
    amountRaw,
    inTokenAddress,
    outTokenAddress,
    slippageBps,
  } = params;

  if (!inTokenAddress || !outTokenAddress) {
    return {
      success: false,
      failureCategory: 'other',
      reason: 'Token addresses required for Mantle trade',
    };
  }

  const amountIn =
    amountRaw != null
      ? BigInt(amountRaw)
      : parseUnits(
          String(amountUsd ?? 0),
          getMantleTokenDecimals(
            inTokenAddress,
            direction === 'buy' ? 'USDT' : currency,
          ),
        );
  const slippageBpsNum = slippageBps != null ? parseInt(slippageBps, 10) : 100;

  console.log(
    `[uniswap-v2] Executing swap on Mantle: ${inTokenAddress} → ${outTokenAddress}, amount=${amountIn}`,
  );

  const result = await executeUniswapSwap({
    tokenIn: inTokenAddress as `0x${string}`,
    tokenOut: outTokenAddress as `0x${string}`,
    amountIn,
    slippageBps: slippageBpsNum,
  });

  console.log(`[uniswap-v2] Success: txHash=${result.txHash}`);

  return {
    success: true,
    txHash: result.txHash,
    amountIn: result.amountIn.toString(),
    amountOut: result.amountOut.toString(),
    rate: Number(result.amountOut) / Math.max(Number(result.amountIn), 1),
  };
}

// ---------------------------------------------------------------------------
// Main trade functions
// ---------------------------------------------------------------------------

/**
 * Execute a trade. Mantle trades route to the self-hosted Uniswap V2 DEX; all
 * other chains use the AVE DEX aggregation path.
 */
export async function executeTrade(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  currency: string;
  direction: 'buy' | 'sell';
  amountUsd: number;
  chain?: Chain;
  inTokenAddress?: string;
  outTokenAddress?: string;
  slippageBps?: string;
}): Promise<TradeResult> {
  const chain = params.chain ?? 'mantle';

  if (chain === 'mantle') {
    try {
      return await executeMantle(params);
    } catch (error) {
      return toFailureResult(error);
    }
  }

  try {
    const {
      serverWalletAddress,
      currency,
      direction,
      amountUsd,
      inTokenAddress,
      outTokenAddress,
      slippageBps = DEFAULT_SLIPPAGE_BPS,
    } = params;

    if (amountUsd == null || typeof amountUsd !== 'number' || amountUsd <= 0) {
      throw new Error(
        `Invalid trade amount for ${currency}: amountUsd must be a positive number (got ${String(amountUsd)})`,
      );
    }

    if (!inTokenAddress || !outTokenAddress) {
      throw new Error(
        `Token addresses required: inTokenAddress and outTokenAddress must be provided for ${currency} ${direction}`,
      );
    }

    const client = getMantleDataClient();
    const swapType = direction === 'buy' ? 'buy' : 'sell';
    const inAmountRaw = BigInt(Math.floor(amountUsd * 1e18)).toString();

    console.log(
      `[trade] Executing ${direction} ${currency} on ${chain}: ` +
        `$${amountUsd}, in=${inTokenAddress}, out=${outTokenAddress}`,
    );

    const quote = await getAmountOut(client, {
      chain,
      inAmount: inAmountRaw,
      inTokenAddress,
      outTokenAddress,
      swapType,
    });

    console.log(
      `[trade] Quote: estimateOut=${quote.estimateOut}, decimals=${quote.decimals}`,
    );

    const evmChain = chain as EvmChain;
    const created = await createEvmTx(client, {
      chain: evmChain,
      creatorAddress: serverWalletAddress,
      inAmount: inAmountRaw,
      inTokenAddress,
      outTokenAddress,
      swapType,
      slippage: slippageBps,
    });

    const { data, to, value } = created.txContent;
    console.log(`[trade] AVE tx built: to=${to}, requestTxId=${created.requestTxId}`);

    await ensureErc20Allowance(inTokenAddress, serverWalletAddress, to, BigInt(inAmountRaw));

    const txHash = await sendRelayerTransaction({
      to,
      data,
      value: BigInt(value || '0'),
    });

    const estimateOutNum = Number(quote.estimateOut) || 0;
    const inAmountNum = Number(inAmountRaw) || 0;
    const rate = inAmountNum > 0 ? estimateOutNum / inAmountNum : 0;

    console.log(`[trade] Success: txHash=${txHash}`);

    return {
      success: true,
      txHash,
      amountIn: inAmountRaw,
      amountOut: quote.estimateOut,
      rate,
    };
  } catch (error) {
    return toFailureResult(error);
  }
}

/**
 * Execute a manual swap for an arbitrary token pair.
 * Mantle swaps route to the self-hosted Uniswap V2 DEX; other chains use AVE
 * DEX aggregation.
 */
export async function executeSwap(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  from: string;
  to: string;
  amount: string;
  slippagePct?: number;
  chain?: Chain;
  inTokenAddress?: string;
  outTokenAddress?: string;
}): Promise<TradeResult> {
  if ((params.chain ?? 'mantle') === 'mantle') {
    try {
      if (!params.inTokenAddress || !params.outTokenAddress) {
        throw new Error(
          `Token addresses required: inTokenAddress and outTokenAddress must be provided for ${params.from} → ${params.to}`,
        );
      }

      const amountUnits = parseUnits(
        params.amount,
        getMantleTokenDecimals(params.inTokenAddress, params.from),
      );

      return await executeMantle({
        serverWalletAddress: params.serverWalletAddress,
        currency: params.from,
        direction: 'buy',
        amountRaw: amountUnits.toString(),
        inTokenAddress: params.inTokenAddress,
        outTokenAddress: params.outTokenAddress,
        slippageBps:
          params.slippagePct != null
            ? String(Math.round(params.slippagePct * 100))
            : undefined,
      });
    } catch (error) {
      return toFailureResult(error);
    }
  }

  try {
    const {
      serverWalletAddress,
      from,
      to,
      amount,
      slippagePct = 1,
      chain = 'bsc',
      inTokenAddress,
      outTokenAddress,
    } = params;

    if (!inTokenAddress || !outTokenAddress) {
      throw new Error(
        `Token addresses required: inTokenAddress and outTokenAddress must be provided for ${from} → ${to}`,
      );
    }

    const client = getMantleDataClient();
    const evmChain = chain as EvmChain;
    const slippageBps = String(Math.round(slippagePct * 100));

    console.log(`[trade] Swap ${amount} ${from} → ${to} on ${chain}`);

    const quote = await getAmountOut(client, {
      chain,
      inAmount: amount,
      inTokenAddress,
      outTokenAddress,
      swapType: 'buy',
    });

    const created = await createEvmTx(client, {
      chain: evmChain,
      creatorAddress: serverWalletAddress,
      inAmount: amount,
      inTokenAddress,
      outTokenAddress,
      swapType: 'buy',
      slippage: slippageBps,
    });

    await ensureErc20Allowance(inTokenAddress, serverWalletAddress, created.txContent.to, BigInt(amount));

    const txHash = await sendRelayerTransaction({
      to: created.txContent.to,
      data: created.txContent.data,
      value: BigInt(created.txContent.value || '0'),
    });

    const estimateOutNum = Number(quote.estimateOut) || 0;
    const inAmountNum = Number(amount) || 0;
    const rate = inAmountNum > 0 ? estimateOutNum / inAmountNum : 0;

    return {
      success: true,
      txHash,
      amountIn: amount,
      amountOut: quote.estimateOut,
      rate,
    };
  } catch (error) {
    return toFailureResult(error);
  }
}

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Send ERC20 tokens from the agent's server wallet to a recipient.
 */
export async function sendTokens(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  token: string;
  amount: string;
  recipient: string;
  chain?: Chain;
}): Promise<{ txHash: string }> {
  const { serverWalletAddress, token, amount, recipient } = params;

  const tokenAddress = ALL_TOKEN_ADDRESSES[token];
  if (!tokenAddress) {
    throw new Error(`Unknown token: ${token}`);
  }

  const decimals = getTokenDecimals(token);
  const amountUnits = parseUnits(amount, decimals);

  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipient as `0x${string}`, amountUnits],
  });

  const txHash = await sendRelayerTransaction({
    to: tokenAddress as `0x${string}`,
    data,
  });

  return { txHash };
}
