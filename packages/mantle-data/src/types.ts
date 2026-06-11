// AVE API types — based on https://github.com/AveCloud/ave-cloud-skill

// ---------------------------------------------------------------------------
// Chain identifiers
// ---------------------------------------------------------------------------

export type Chain =
  | 'bsc'
  | 'eth'
  | 'solana'
  | 'base'
  | 'arbitrum'
  | 'optimism'
  | 'avax'
  | 'polygon'
  | 'ton';

export type EvmChain = 'bsc' | 'eth' | 'base';

/**
 * Native token placeholder for EVM chains.
 * Solana uses the string `"sol"` instead.
 */
export const EVM_NATIVE_ADDRESS =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const;

// ---------------------------------------------------------------------------
// Standard API envelope
// ---------------------------------------------------------------------------

export interface MantleDataApiResponse<T> {
  status: number;
  msg: string;
  data_type?: number;
  data: T;
}

// ---------------------------------------------------------------------------
// Data REST — Token Search
// ---------------------------------------------------------------------------

export interface TokenSearchParams {
  keyword: string;
  chain?: Chain;
  limit?: number;
  orderby?: 'tx_volume_u_24h' | 'main_pair_tvl' | 'fdv' | 'market_cap';
}

export interface TokenSearchResult {
  token_address: string;
  chain: Chain;
  name: string;
  symbol: string;
  decimals: number;
  price: number;
  market_cap: number;
  fdv: number;
  tx_volume_u_24h: number;
  main_pair_tvl: number;
  holder_count: number;
  price_change_24h: number;
  logo?: string;
}

// ---------------------------------------------------------------------------
// Data REST — Token Detail
// ---------------------------------------------------------------------------

export interface TokenDetail {
  token_address: string;
  chain: Chain;
  name: string;
  symbol: string;
  decimals: number;
  price: number;
  price_eth?: number;
  market_cap: number;
  fdv: number;
  tvl: number;
  tx_volume_u_24h: number;
  tx_count_24h: number;
  total_supply: string;
  holder_count: number;
  price_change_5m: number;
  price_change_1h: number;
  price_change_4h: number;
  price_change_24h: number;
  lock_amount?: string;
  burn_amount?: string;
  creator?: string;
  honeypot?: boolean;
  buy_tax?: number;
  sell_tax?: number;
  risk_level?: string;
  logo?: string;
}

// ---------------------------------------------------------------------------
// Data REST — Batch Token Prices
// ---------------------------------------------------------------------------

export interface BatchTokenPriceParams {
  token_ids: string[]; // format: "address-chain"
  tvl_min?: number;
  tx_24h_volume_min?: number;
}

// ---------------------------------------------------------------------------
// Data REST — Kline
// ---------------------------------------------------------------------------

export type KlineInterval =
  | 1
  | 5
  | 15
  | 30
  | 60
  | 120
  | 240
  | 1440
  | 4320
  | 10080
  | 43200
  | 525600
  | 2628000;

export interface KlineParams {
  interval?: KlineInterval;
  limit?: number;
  category?: 'u' | 'r' | 'm';
}

export interface KlineCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ---------------------------------------------------------------------------
// Data REST — Top 100 Holders
// ---------------------------------------------------------------------------

export interface HolderInfo {
  address: string;
  balance: string;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Data REST — Full Holders
// ---------------------------------------------------------------------------

export interface HoldersParams {
  limit?: number;
  sort_by?: 'balance' | 'percentage';
  order?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Data REST — Contract Risk Detection
// ---------------------------------------------------------------------------

export interface ContractRisk {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  honeypot: boolean;
  buy_tax: number;
  sell_tax: number;
  owner?: string;
  ownership_renounced: boolean;
  can_mint: boolean;
  can_burn: boolean;
  holder_concentration: number;
  dex_liquidity: number;
}

// ---------------------------------------------------------------------------
// Data REST — Swap Transactions
// ---------------------------------------------------------------------------

export interface SwapTx {
  time: number;
  tx_hash: string;
  type: 'buy' | 'sell';
  sender: string;
  amount_in: string;
  amount_out: string;
  price: number;
  amm_name: string;
}

// ---------------------------------------------------------------------------
// Data REST — Platform / Trending
// ---------------------------------------------------------------------------

export type PlatformTag =
  | 'hot'
  | 'new'
  | 'meme'
  | 'pump_in_hot'
  | 'pump_in_new'
  | 'fourmeme_in_hot'
  | 'bonk_in_hot'
  | 'nadfun_in_hot';

export interface TrendingParams {
  chain: Chain;
  current_page?: number;
  page_size?: number;
}

// ---------------------------------------------------------------------------
// Data REST — Wallet
// ---------------------------------------------------------------------------

export interface WalletTokensParams {
  wallet_address: string;
  chain: Chain;
  sort?: string;
  sort_dir?: string;
  pageSize?: number;
  pageNO?: number;
  hide_sold?: 0 | 1;
  hide_small?: number;
  blue_chips?: 0 | 1;
}

export interface AddressPnlParams {
  wallet_address: string;
  chain: Chain;
  token_address: string;
}

// ---------------------------------------------------------------------------
// Trade Chain-Wallet — Quote
// ---------------------------------------------------------------------------

export type SwapType = 'buy' | 'sell';

export interface GetAmountOutParams {
  chain: Chain;
  inAmount: string;
  inTokenAddress: string;
  outTokenAddress: string;
  swapType: SwapType;
}

export interface GetAmountOutResult {
  estimateOut: string;
  decimals: number;
  spender: string;
}

// ---------------------------------------------------------------------------
// Trade Chain-Wallet — EVM Transaction
// ---------------------------------------------------------------------------

export interface CreateEvmTxParams {
  chain: EvmChain;
  creatorAddress: string;
  inAmount: string;
  inTokenAddress: string;
  outTokenAddress: string;
  swapType: SwapType;
  slippage: string;
  feeRecipient?: string;
  feeRecipientRate?: string;
  autoSlippage?: boolean;
}

export interface EvmTxContent {
  data: string;
  to: string;
  value: string;
}

export interface CreateEvmTxResult {
  chain: EvmChain;
  creatorAddress: string;
  swapType: SwapType;
  inTokenAddress: string;
  outTokenAddress: string;
  txContent: EvmTxContent;
  slippage: string;
  minReturn: string;
  inAmount: string;
  estimateOut: string;
  gasLimit: string;
  amms: string[];
  createPrice: string;
  requestTxId: string;
}

export interface SendSignedEvmTxParams {
  chain: EvmChain;
  requestTxId: string;
  signedTx: string;
  useMev?: boolean;
}

export interface SendSignedTxResult {
  hash: string;
  err?: string;
  bundleId?: string;
}

// ---------------------------------------------------------------------------
// Trade Chain-Wallet — Solana Transaction
// ---------------------------------------------------------------------------

export interface CreateSolanaTxParams {
  creatorAddress: string;
  inAmount: string;
  inTokenAddress: string;
  outTokenAddress: string;
  swapType: SwapType;
  slippage: string;
  fee: string;
  useMev?: boolean;
  feeRecipient?: string;
  feeRecipientRate?: string;
  autoSlippage?: boolean;
}

export interface CreateSolanaTxResult {
  creatorAddress: string;
  swapType: SwapType;
  inTokenAddress: string;
  outTokenAddress: string;
  txContent: string; // base64-encoded transaction
  slippage: string;
  minReturn: string;
  inAmount: string;
  estimateOut: string;
  priorityFee: string;
  bundleTip: string;
  amms: string[];
  createPrice: string;
  requestTxId: string;
}

export interface SendSignedSolanaTxParams {
  requestTxId: string;
  signedTx: string;
  useMev?: boolean;
}

// ---------------------------------------------------------------------------
// Client config
// ---------------------------------------------------------------------------

export interface MantleDataClientConfig {
  apiKey?: string;
  dataBaseUrl?: string;
  tradeBaseUrl?: string;
  maxRetries?: number;
}
