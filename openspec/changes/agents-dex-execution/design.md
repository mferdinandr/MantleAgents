## Context

Mantle Sepolia has our self-hosted Uniswap V2 DEX already deployed and seeded:
- Router: `MANTLE_DEX_ROUTER_ADDRESS` (env)
- Factory: `MANTLE_DEX_FACTORY_ADDRESS` (env)
- Tokens: USDC (6 dec), USDT (6 dec), WMNT (18 dec)
- Pairs: USDC/WMNT, USDT/WMNT, USDC/USDT — all have liquidity

`executeUniswapSwap()` in `uniswap-swap.ts` already routes swaps through this DEX. `getMantleTokenBySymbol('USDC'/'USDT'/'WMNT')` already resolves addresses. Zero new contracts or tokens needed.

## Goals / Non-Goals

**Goals:**
- FX agent generates buy/sell signals for WMNT vs stablecoins and executes real swaps on-chain
- Yield agent reads our DEX pairs as opportunities and executes real addLiquidity/removeLiquidity on-chain
- Both agents produce timeline events with real txHash

**Non-Goals:**
- Deploying new tokens or DEX contracts
- Real APR calculation from historical volume
- Mainnet deployment

## Decisions

**FX: Update LLM prompt framing**

The root cause of all-"hold" signals is the system prompt tells Gemini to "trade FX stablecoin currencies" — USDC/USDT/WMNT don't fit that mental model. Fix: rewrite the system prompt in `llm-analyzer.ts` to frame the task as "monitor market conditions and trade WMNT (Mantle's native wrapped token) vs USDC/USDT stablecoins." WMNT has real price exposure to MNT market sentiment, giving Gemini a valid reason to generate buy/sell signals.

Also update `resolveMantleFxCurrencies()` in `fx-strategy.ts` to keep `['USDC', 'USDT', 'WMNT']` but treat WMNT as the speculative asset (not a stablecoin).

**Yield: New `dex-pool-reader.ts`**

Reads our 3 pairs directly from the Factory + Pair contracts via viem:
- `factory.getPair(tokenA, tokenB)` → real EVM pair address (this becomes `vaultAddress`)
- `pair.getReserves()` + token prices → TVL in USD
- APR = `0.003 * 0.1 * 365 * 100` ≈ 10.95% (0.3% fee, assume 10% daily turnover) — hardcoded estimate, honest for demo

Returns `YieldOpportunity[]` with the same shape Merkl used, so `yield-strategy.ts` changes are minimal.

**Yield: addLiquidity execution (single-sided zap-in)**

User's wallet holds USDC/USDT. For a USDC/WMNT pool deposit:
1. Swap half the USDC amount → WMNT via `executeUniswapSwap`
2. Approve USDC + WMNT for router
3. Call `router.addLiquidity(USDC, WMNT, amtUsdc, amtWmnt, 0, 0, wallet, deadline)`
4. Parse `Transfer` event from pair contract to get LP shares minted
5. Return `{ success, txHash, lpShares, vaultAddress: pairAddress }`

For USDC/USDT pool: swap half USDC → USDT, then addLiquidity. Same pattern.

**Yield: removeLiquidity**

LP token in Uniswap V2 = pair contract address itself.
1. Approve pair address as LP token for router
2. Call `router.removeLiquidity(token0, token1, lpShares, 0, 0, wallet, deadline)`
3. Return `{ success, txHash }`

**LP shares stored as string bigint in yield_positions.lp_shares**

`lp_shares` column already exists as text. Store `lpShares.toString()`. On withdraw, read from DB position context, parse back to BigInt.

## Risks / Trade-offs

- [Risk] Zap-in swap shifts pool price before addLiquidity → price impact on small pools → Mitigation: seed liquidity is $25K+, agent trades are small (<$1K), impact <0.5%
- [Risk] Gemini might still return "hold" for WMNT if news is low signal → Mitigation: acceptable, agent will try again next cycle
- [Risk] LP shares from `Transfer` event parsing could fail if event structure differs → Mitigation: fallback to `pair.balanceOf(wallet)` delta

## Migration Plan

No contract deployments. No DB migrations. Just code changes + API restart.
