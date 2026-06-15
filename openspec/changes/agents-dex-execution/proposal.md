## Why

Both FX and Yield agents generate AI signals but never execute real on-chain trades. FX agent returns "hold" for everything because USDC/USDT/WMNT have no meaningful FX narrative — Gemini sees no reason to trade two USD stablecoins against each other. Yield agent pulls Merkl Aave opportunities from Mantle mainnet, but vault addresses are Merkl identifiers (not EVM addresses) and Aave doesn't exist on Mantle Sepolia.

We already have everything needed on Mantle Sepolia: a deployed Uniswap V2 DEX (Router + Factory), 3 mock tokens (USDC, USDT, WMNT), and 3 seeded liquidity pairs. Zero new contracts needed.

## What Changes

**FX Agent — update framing, not tokens:**
- Change LLM system prompt: reframe trading as "WMNT (Mantle native asset) vs stablecoins (USDC/USDT)" based on macro/market signals — Gemini will generate meaningful buy/sell signals for WMNT
- Keep `allowed_currencies = ['USDC', 'USDT', 'WMNT']` and existing `executeUniswapSwap` routing (already works)
- `executeSignal` already resolves Mantle token addresses and calls the DEX — no code change needed here

**Yield Agent — rewire execution to addLiquidity:**
- Replace Merkl client with `dex-pool-reader.ts` that reads our 3 pairs (USDC/WMNT, USDT/WMNT, USDC/USDT) from our Factory contract — returns real EVM pair addresses as `vaultAddress`
- Replace `executeYieldDeposit` with `addLiquidity()` call to our Router
- Replace `executeYieldWithdraw` with `removeLiquidity()` call to our Router
- Track LP token shares in `yield_positions.lp_shares`

## Capabilities

### New Capabilities
- `yield-dex-lp`: Yield agent deposits/withdraws LP positions on our Mantle Sepolia DEX using real on-chain addLiquidity/removeLiquidity

### Modified Capabilities
- `fx-execution`: FX agent LLM prompt reframed to trade WMNT vs stablecoins — generates real buy/sell signals that execute via existing Mantle DEX swap path
- `yield-execution`: Yield agent now reads opportunities from our DEX pairs and executes real addLiquidity/removeLiquidity

## Impact

- `apps/api/src/services/llm-analyzer.ts` — update FX system prompt framing
- `apps/api/src/services/strategies/fx-strategy.ts` — update default currencies back to USDC/USDT/WMNT with correct framing
- `apps/api/src/services/dex-pool-reader.ts` — new file, replaces Merkl client for yield
- `apps/api/src/services/strategies/yield-strategy.ts` — use dex-pool-reader instead of Merkl
- `apps/api/src/services/trade-executor.ts` — add executeYieldDeposit (addLiquidity) and executeYieldWithdraw (removeLiquidity)
- No new contracts, no new tokens, no new env vars needed
