import type { MantleDataClient } from './client.js';
import type {
  Chain,
  EvmChain,
  SwapType,
  GetAmountOutParams,
  GetAmountOutResult,
  CreateEvmTxParams,
  CreateEvmTxResult,
  SendSignedEvmTxParams,
  SendSignedTxResult,
  CreateSolanaTxParams,
  CreateSolanaTxResult,
  SendSignedSolanaTxParams,
} from './types.js';

const CHAIN_WALLET_PREFIX = '/v1/thirdParty/chainWallet';

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------

/**
 * Get estimated output amount for a swap.
 * POST /v1/thirdParty/chainWallet/getAmountOut
 */
export async function getAmountOut(
  client: MantleDataClient,
  params: GetAmountOutParams,
): Promise<GetAmountOutResult> {
  return client.tradePost<GetAmountOutResult>(
    `${CHAIN_WALLET_PREFIX}/getAmountOut`,
    params,
  );
}

// ---------------------------------------------------------------------------
// EVM (BSC, Ethereum, Base)
// ---------------------------------------------------------------------------

/**
 * Create an unsigned EVM swap transaction.
 * POST /v1/thirdParty/chainWallet/createEvmTx
 */
export async function createEvmTx(
  client: MantleDataClient,
  params: CreateEvmTxParams,
): Promise<CreateEvmTxResult> {
  return client.tradePost<CreateEvmTxResult>(
    `${CHAIN_WALLET_PREFIX}/createEvmTx`,
    params,
  );
}

/**
 * Broadcast a signed EVM transaction.
 * POST /v1/thirdParty/chainWallet/sendSignedEvmTx
 */
export async function sendSignedEvmTx(
  client: MantleDataClient,
  params: SendSignedEvmTxParams,
): Promise<SendSignedTxResult> {
  return client.tradePost<SendSignedTxResult>(
    `${CHAIN_WALLET_PREFIX}/sendSignedEvmTx`,
    params,
  );
}

// ---------------------------------------------------------------------------
// Solana
// ---------------------------------------------------------------------------

/**
 * Create an unsigned Solana swap transaction.
 * POST /v1/thirdParty/chainWallet/createSolanaTx
 */
export async function createSolanaTx(
  client: MantleDataClient,
  params: CreateSolanaTxParams,
): Promise<CreateSolanaTxResult> {
  return client.tradePost<CreateSolanaTxResult>(
    `${CHAIN_WALLET_PREFIX}/createSolanaTx`,
    params,
  );
}

/**
 * Broadcast a signed Solana transaction.
 * POST /v1/thirdParty/chainWallet/sendSignedSolanaTx
 */
export async function sendSignedSolanaTx(
  client: MantleDataClient,
  params: SendSignedSolanaTxParams,
): Promise<SendSignedTxResult> {
  return client.tradePost<SendSignedTxResult>(
    `${CHAIN_WALLET_PREFIX}/sendSignedSolanaTx`,
    params,
  );
}

// ---------------------------------------------------------------------------
// High-level trade helper
// ---------------------------------------------------------------------------

export interface ExecuteTradeParams {
  chain: Chain;
  walletAddress: string;
  inAmount: string;
  inTokenAddress: string;
  outTokenAddress: string;
  swapType: SwapType;
  slippage?: string;
  solanaFee?: string;
  useMev?: boolean;
  signTransaction: (txContent: string) => Promise<string>;
}

/**
 * High-level trade execution: create tx → sign → broadcast.
 *
 * The caller provides a `signTransaction` callback that receives
 * the unsigned tx content and returns the signed tx string.
 * This keeps private keys out of this package.
 */
export async function executeTrade(
  client: MantleDataClient,
  params: ExecuteTradeParams,
): Promise<SendSignedTxResult> {
  const {
    chain,
    walletAddress,
    inAmount,
    inTokenAddress,
    outTokenAddress,
    swapType,
    slippage = '100', // 1% default
    solanaFee = '100000', // 0.0001 SOL default priority fee
    useMev = false,
    signTransaction,
  } = params;

  if (chain === 'solana') {
    const created = await createSolanaTx(client, {
      creatorAddress: walletAddress,
      inAmount,
      inTokenAddress,
      outTokenAddress,
      swapType,
      slippage,
      fee: solanaFee,
      useMev,
    });

    const txContent = created.txContent ?? (created as any).txContext;
    const signedTx = await signTransaction(txContent);

    return sendSignedSolanaTx(client, {
      requestTxId: created.requestTxId,
      signedTx,
      useMev,
    });
  }

  // EVM chains
  const evmChain = chain as EvmChain;
  const created = await createEvmTx(client, {
    chain: evmChain,
    creatorAddress: walletAddress,
    inAmount,
    inTokenAddress,
    outTokenAddress,
    swapType,
    slippage,
  });

  const signedTx = await signTransaction(JSON.stringify(created.txContent));

  return sendSignedEvmTx(client, {
    chain: evmChain,
    requestTxId: created.requestTxId,
    signedTx,
    useMev,
  });
}
