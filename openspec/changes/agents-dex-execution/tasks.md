## 1. Fix FX Agent LLM Prompt

- [x] 1.1 In `apps/api/src/services/llm-analyzer.ts`, rewrite `buildSystemPrompt()` — change framing from "FX stablecoin trading" to "trade WMNT (Mantle native wrapped token) vs USDC/USDT stablecoins based on market signals"
- [x] 1.2 In `apps/api/src/services/strategies/fx-strategy.ts`, update `resolveMantleFxCurrencies()` — keep default `['USDC', 'USDT', 'WMNT']`, ensure WMNT is treated as the speculative asset not a stablecoin

## 2. Build DEX Pool Reader

- [x] 2.1 Create `apps/api/src/services/dex-pool-reader.ts` — reads USDC/WMNT, USDT/WMNT, USDC/USDT pair info from our Uniswap V2 Factory + Pair contracts using viem
- [x] 2.2 Implement `fetchDexPoolOpportunities()` returning `YieldOpportunity[]` with real pair contract addresses as `vaultAddress`, TVL from reserves, APR ~10.95% estimate
- [x] 2.3 Add 5-minute cache (same pattern as old Merkl client)

## 3. Update Yield Strategy to Use DEX Pool Reader

- [x] 3.1 In `yield-strategy.ts` `fetchData()` — replace `fetchYieldOpportunities()` (Merkl) with `fetchDexPoolOpportunities()` from dex-pool-reader
- [x] 3.2 Remove Ichi/CLAMM/Aave filter logic — DEX pool opportunities are all valid
- [x] 3.3 Update wallet token matching — check USDC/USDT/WMNT (the actual pair tokens)
- [x] 3.4 Update yield analyzer system prompt in `yield-analyzer.ts` — describe opportunities as "Uniswap V2 LP pools on Mantle DEX", describe deposit as "add liquidity", withdraw as "remove liquidity"

## 4. Implement addLiquidity / removeLiquidity

- [x] 4.1 In `apps/api/src/services/trade-executor.ts`, add `executeYieldDeposit()`:
  - Read `token0`/`token1` from pair contract
  - Swap half input USDC/USDT → paired token via `executeUniswapSwap`
  - Approve both tokens for router
  - Call `addLiquidity` on router
  - Parse LP shares from pair `Transfer` event (fallback: `pair.balanceOf(wallet)`)
  - Return `{ success, txHash, lpShares, vaultAddress }`
- [x] 4.2 In `trade-executor.ts`, add `executeYieldWithdraw()`:
  - Approve pair address (LP token) for router
  - Call `removeLiquidity` on router with `lpShares`
  - Return `{ success, txHash }`

## 5. Wire Yield Execution into Yield Strategy

- [x] 5.1 In `yield-strategy.ts` `executeSignal()` — call `executeYieldDeposit` / `executeYieldWithdraw` from trade-executor (replace old vault deposit calls)
- [x] 5.2 Pass `lpShares` from deposit result into position upsert (`yield_positions.lp_shares`)
- [x] 5.3 For withdraw: read `lp_shares` from position context (already in `context.positions`) and pass to `executeYieldWithdraw`

## 6. Type Check + Verify

- [x] 6.1 Run `pnpm type-check` — fix any TypeScript errors
- [ ] 6.2 Restart API, wait one cycle (60s), verify FX agent timeline shows trade event with txHash
- [ ] 6.3 Verify Yield agent timeline shows trade event with txHash
