import type { MantleDataClient } from './client.js';
import type {
  Chain,
  TokenSearchParams,
  TokenSearchResult,
  TokenDetail,
  BatchTokenPriceParams,
  KlineParams,
  KlineCandle,
  HolderInfo,
  HoldersParams,
  ContractRisk,
  SwapTx,
  PlatformTag,
  TrendingParams,
  WalletTokensParams,
  AddressPnlParams,
} from './types.js';

// ---------------------------------------------------------------------------
// Token search & detail
// ---------------------------------------------------------------------------

/**
 * Search tokens by keyword or address.
 * GET /v2/tokens
 */
export async function searchToken(
  client: MantleDataClient,
  params: TokenSearchParams,
): Promise<TokenSearchResult[]> {
  return client.dataGet<TokenSearchResult[]>('/tokens', params);
}

/**
 * Get full token detail.
 * GET /v2/tokens/{address}-{chain}
 */
export async function getTokenDetail(
  client: MantleDataClient,
  chain: Chain,
  address: string,
): Promise<TokenDetail> {
  return client.dataGet<TokenDetail>(`/tokens/${address}-${chain}`);
}

/**
 * Batch search token details.
 * POST /v2/tokens/search — max 50 tokens.
 */
export async function batchSearchTokens(
  client: MantleDataClient,
  tokenIds: string[],
): Promise<TokenDetail[]> {
  return client.dataPost<TokenDetail[]>('/tokens/search', {
    token_ids: tokenIds,
  });
}

/**
 * Batch token prices.
 * POST /v2/tokens/price — max 200 tokens.
 */
export async function batchTokenPrices(
  client: MantleDataClient,
  params: BatchTokenPriceParams,
): Promise<Record<string, TokenDetail>> {
  return client.dataPost<Record<string, TokenDetail>>('/tokens/price', params);
}

// ---------------------------------------------------------------------------
// Kline
// ---------------------------------------------------------------------------

/**
 * Get kline (candlestick) data by token address.
 * GET /v2/klines/token/{address}-{chain}
 */
export async function getKlineByToken(
  client: MantleDataClient,
  chain: Chain,
  address: string,
  params?: KlineParams,
): Promise<KlineCandle[]> {
  return client.dataGet<KlineCandle[]>(
    `/klines/token/${address}-${chain}`,
    params,
  );
}

/**
 * Get kline (candlestick) data by pair address.
 * GET /v2/klines/pair/{pair_address}-{chain}
 */
export async function getKlineByPair(
  client: MantleDataClient,
  chain: Chain,
  pairAddress: string,
  params?: KlineParams,
): Promise<KlineCandle[]> {
  return client.dataGet<KlineCandle[]>(
    `/klines/pair/${pairAddress}-${chain}`,
    params,
  );
}

// ---------------------------------------------------------------------------
// Holders
// ---------------------------------------------------------------------------

/**
 * Get top 100 holders.
 * GET /v2/tokens/top100/{address}-{chain}
 */
export async function getTop100Holders(
  client: MantleDataClient,
  chain: Chain,
  address: string,
): Promise<HolderInfo[]> {
  return client.dataGet<HolderInfo[]>(`/tokens/top100/${address}-${chain}`);
}

/**
 * Get holders with pagination.
 * GET /v2/tokens/holders/{address}-{chain}
 */
export async function getHolders(
  client: MantleDataClient,
  chain: Chain,
  address: string,
  params?: HoldersParams,
): Promise<HolderInfo[]> {
  return client.dataGet<HolderInfo[]>(
    `/tokens/holders/${address}-${chain}`,
    params,
  );
}

// ---------------------------------------------------------------------------
// Contract risk / honeypot
// ---------------------------------------------------------------------------

/**
 * Check contract risk and honeypot status.
 * GET /v2/contracts/{address}-{chain}
 */
export async function checkContractRisk(
  client: MantleDataClient,
  chain: Chain,
  address: string,
): Promise<ContractRisk> {
  return client.dataGet<ContractRisk>(`/contracts/${address}-${chain}`);
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * Get swap transactions for a pair.
 * GET /v2/txs/{pair_address}-{chain}
 */
export async function getSwapTxs(
  client: MantleDataClient,
  chain: Chain,
  pairAddress: string,
): Promise<SwapTx[]> {
  return client.dataGet<SwapTx[]>(`/txs/${pairAddress}-${chain}`);
}

// ---------------------------------------------------------------------------
// Platform / trending
// ---------------------------------------------------------------------------

/**
 * Get platform tokens by tag.
 * GET /v2/tokens/platform
 */
export async function getPlatformTokens(
  client: MantleDataClient,
  tag: PlatformTag,
  limit?: number,
): Promise<TokenSearchResult[]> {
  return client.dataGet<TokenSearchResult[]>('/tokens/platform', {
    tag,
    limit,
  });
}

/**
 * Get trending tokens for a chain.
 * GET /v2/tokens/trending
 */
export async function getTrending(
  client: MantleDataClient,
  params: TrendingParams,
): Promise<TokenSearchResult[]> {
  return client.dataGet<TokenSearchResult[]>('/tokens/trending', params);
}

/**
 * Get chain main tokens.
 * GET /v2/tokens/main
 */
export async function getMainTokens(
  client: MantleDataClient,
  chain: Chain,
): Promise<TokenSearchResult[]> {
  return client.dataGet<TokenSearchResult[]>('/tokens/main', { chain });
}

/**
 * Get supported chains.
 * GET /v2/supported_chains
 */
export async function getSupportedChains(
  client: MantleDataClient,
): Promise<string[]> {
  return client.dataGet<string[]>('/supported_chains');
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

/**
 * Get wallet token holdings.
 * GET /v2/address/walletinfo/tokens
 */
export async function getWalletTokens(
  client: MantleDataClient,
  params: WalletTokensParams,
): Promise<unknown> {
  return client.dataGet('/address/walletinfo/tokens', params);
}

/**
 * Get wallet overview.
 * GET /v2/address/walletinfo
 */
export async function getWalletOverview(
  client: MantleDataClient,
  walletAddress: string,
  chain: Chain,
): Promise<unknown> {
  return client.dataGet('/address/walletinfo', {
    wallet_address: walletAddress,
    chain,
  });
}

/**
 * Get address token PnL.
 * GET /v2/address/pnl
 */
export async function getAddressPnl(
  client: MantleDataClient,
  params: AddressPnlParams,
): Promise<unknown> {
  return client.dataGet('/address/pnl', params);
}
