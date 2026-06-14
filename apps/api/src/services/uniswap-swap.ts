import {
  encodeFunctionData,
  erc20Abi,
  maxUint256,
  parseAbi,
  type Address,
  type PublicClient,
} from 'viem';
import { chainClient } from '../lib/chain-client.js';
import {
  getMantleDexRouterAddress,
  getMantleWmnt,
} from '../lib/chains.js';
import {
  getRelayer,
  sendRelayerTransaction,
} from '../lib/relayer.js';

const routerAbi = parseAbi([
  'function getAmountsOut(uint256 amountIn, address[] memory path) view returns (uint256[] memory amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)',
]);

export interface UniswapQuoteResult {
  amountOut: bigint;
  path: Address[];
}

export interface UniswapSwapResult {
  txHash: `0x${string}`;
  amountIn: bigint;
  amountOut: bigint;
  path: Address[];
}

function buildPathCandidates(tokenIn: Address, tokenOut: Address): Address[][] {
  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    return [[tokenIn, tokenOut]];
  }

  const wmnt = getMantleWmnt().address;
  if (
    tokenIn.toLowerCase() === wmnt.toLowerCase() ||
    tokenOut.toLowerCase() === wmnt.toLowerCase()
  ) {
    return [[tokenIn, tokenOut]];
  }

  return [
    [tokenIn, tokenOut],
    [tokenIn, wmnt, tokenOut],
  ];
}

async function ensureRouterAllowance(
  client: PublicClient,
  tokenIn: Address,
  owner: Address,
  router: Address,
  amountIn: bigint,
  sendTx: typeof sendRelayerTransaction,
) {
  const allowance = await client.readContract({
    address: tokenIn,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, router],
  });

  if (allowance >= amountIn) {
    return;
  }

  const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [router, maxUint256],
  });

  await sendTx({
    to: tokenIn,
    data: approveData,
  });
}

export async function getUniswapQuote(params: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  publicClient?: PublicClient;
}): Promise<UniswapQuoteResult | null> {
  const client = params.publicClient ?? chainClient;
  const router = getMantleDexRouterAddress();

  for (const path of buildPathCandidates(params.tokenIn, params.tokenOut)) {
    try {
      const amounts = await client.readContract({
        address: router,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: [params.amountIn, path],
      });

      const amountOut = amounts[amounts.length - 1];
      if (amountOut > 0n) {
        return { amountOut, path };
      }
    } catch {
      // Try the next route candidate.
    }
  }

  return null;
}

export async function executeUniswapSwap(params: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  slippageBps: number;
  publicClient?: PublicClient;
  relayerAddress?: Address;
  sendTx?: typeof sendRelayerTransaction;
}): Promise<UniswapSwapResult> {
  const client = params.publicClient ?? chainClient;
  const router = getMantleDexRouterAddress();
  const relayerAddress = params.relayerAddress ?? getRelayer().address;
  const sendTx = params.sendTx ?? sendRelayerTransaction;

  const quote = await getUniswapQuote({
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    publicClient: client,
  });

  if (!quote) {
    throw new Error('No Uniswap V2 route available for this token pair');
  }

  await ensureRouterAllowance(
    client,
    params.tokenIn,
    relayerAddress,
    router,
    params.amountIn,
    sendTx,
  );

  const slippageBps = BigInt(Math.max(0, Math.min(10_000, params.slippageBps)));
  const amountOutMin = (quote.amountOut * (10_000n - slippageBps)) / 10_000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);

  const data = encodeFunctionData({
    abi: routerAbi,
    functionName: 'swapExactTokensForTokens',
    args: [
      params.amountIn,
      amountOutMin,
      quote.path,
      relayerAddress,
      deadline,
    ],
  });

  const txHash = await sendTx({
    to: router,
    data,
  });

  return {
    txHash,
    amountIn: params.amountIn,
    amountOut: quote.amountOut,
    path: quote.path,
  };
}
