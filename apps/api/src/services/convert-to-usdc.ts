import { erc20Abi, formatUnits, type Address } from 'viem';
import { chainClient } from '../lib/chain-client.js';
import {
  getMantleUsdc,
  getMantleUsdt,
  getMantleWmnt,
} from '../lib/chains.js';
import { executeUniswapSwap, getUniswapQuote } from './uniswap-swap.js';

export interface ConvertSwapped {
  symbol: string;
  amount: string;
  txHash: string;
}

export interface ConvertSkipped {
  symbol: string;
  reason: string;
}

export interface ConvertToUsdcResult {
  swapped: ConvertSwapped[];
  skipped: ConvertSkipped[];
}

export async function convertWalletToUsdc(params: {
  serverWalletId: string;
  serverWalletAddress: string;
}): Promise<ConvertToUsdcResult> {
  const usdc = getMantleUsdc();
  const candidates = [getMantleUsdt(), getMantleWmnt()];
  const result: ConvertToUsdcResult = {
    swapped: [],
    skipped: [],
  };

  for (const token of candidates) {
    const balance = await chainClient.readContract({
      address: token.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [params.serverWalletAddress as Address],
    });

    if (balance === 0n) {
      result.skipped.push({ symbol: token.symbol, reason: 'Zero balance' });
      continue;
    }

    const quote = await getUniswapQuote({
      tokenIn: token.address,
      tokenOut: usdc.address,
      amountIn: balance,
    });

    if (!quote) {
      result.skipped.push({ symbol: token.symbol, reason: 'No route to USDC' });
      continue;
    }

    try {
      const swap = await executeUniswapSwap({
        tokenIn: token.address,
        tokenOut: usdc.address,
        amountIn: balance,
        slippageBps: 100,
      });

      result.swapped.push({
        symbol: token.symbol,
        amount: formatUnits(balance, token.decimals),
        txHash: swap.txHash,
      });
    } catch (error) {
      result.skipped.push({
        symbol: token.symbol,
        reason: error instanceof Error ? error.message : 'Swap failed',
      });
    }
  }

  return result;
}
