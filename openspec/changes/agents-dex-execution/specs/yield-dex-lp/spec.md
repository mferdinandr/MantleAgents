## ADDED Requirements

### Requirement: DEX pool reader replaces Merkl client for yield opportunities
A new `dex-pool-reader.ts` service SHALL read pool info directly from our Uniswap V2 factory and pair contracts on Mantle Sepolia. It SHALL return opportunities in the same `YieldOpportunity[]` shape previously returned by Merkl.

#### Scenario: Pool reader returns 3 opportunities
- **WHEN** `fetchDexPoolOpportunities()` is called
- **THEN** it SHALL return 3 opportunities: USDC/WMNT, USDT/WMNT, USDC/USDT
- **THEN** each opportunity SHALL have `vaultAddress` set to the Uniswap V2 pair contract address (a valid EVM address)
- **THEN** each opportunity SHALL have `tvl` computed from reserves and `apr` estimated from fee tier

#### Scenario: Pool with zero reserves is excluded
- **WHEN** a pair has zero reserves (no liquidity)
- **THEN** that pair SHALL be excluded from the returned opportunities

### Requirement: Yield deposit executes addLiquidity on Mantle DEX
`executeYieldDeposit()` SHALL call `addLiquidity()` on the Uniswap V2 router. It SHALL zap in single-sided by swapping half the input amount to the paired token first, then calling addLiquidity.

#### Scenario: Successful deposit returns LP shares and txHash
- **WHEN** `executeYieldDeposit({ vaultAddress: pairAddress, amountUsd: 100 })` is called
- **THEN** it SHALL approve both tokens for the router
- **THEN** it SHALL call `addLiquidity` on the router
- **THEN** it SHALL return `{ success: true, txHash, lpShares: bigint, vaultAddress: pairAddress }`

#### Scenario: Invalid pair address fails gracefully
- **WHEN** `executeYieldDeposit` is called with an address that is not a valid pair
- **THEN** it SHALL return `{ success: false, error: '...' }` without throwing

### Requirement: Yield withdraw executes removeLiquidity on Mantle DEX
`executeYieldWithdraw()` SHALL read LP shares from the position record, approve the LP token, and call `removeLiquidity()` on the router.

#### Scenario: Successful withdraw returns txHash
- **WHEN** `executeYieldWithdraw({ vaultAddress: pairAddress, lpShares: '...' })` is called
- **THEN** it SHALL approve the LP token (pair address = LP token address in Uniswap V2)
- **THEN** it SHALL call `removeLiquidity` on the router
- **THEN** it SHALL return `{ success: true, txHash }`

### Requirement: LP shares stored in yield_positions
After a successful deposit, LP shares SHALL be stored in `yield_positions.lp_shares` as a stringified bigint. The pair contract address SHALL be stored as `vault_address`.

#### Scenario: Position created after deposit
- **WHEN** a deposit signal is executed successfully
- **THEN** a row SHALL be upserted in `yield_positions` with `vault_address = pairAddress` and `lp_shares = lpShares.toString()`

#### Scenario: Position cleared after withdraw
- **WHEN** a withdraw signal is executed successfully
- **THEN** the `yield_positions` row for that vault SHALL be deleted or `lp_shares` set to 0
