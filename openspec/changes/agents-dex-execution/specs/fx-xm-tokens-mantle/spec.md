## MODIFIED Requirements

### Requirement: FX agent LLM prompt frames WMNT as the speculative asset
The FX system prompt in `llm-analyzer.ts` SHALL frame the task as trading WMNT (Mantle's native wrapped token) against USDC/USDT stablecoins based on market conditions — not as trading FX stablecoin currencies. This gives Gemini a valid reason to generate buy/sell signals.

#### Scenario: Gemini receives WMNT-framed prompt
- **WHEN** `buildSystemPrompt()` is called with `allowedCurrencies: ['USDC', 'USDT', 'WMNT']`
- **THEN** the system prompt SHALL describe WMNT as a tradeable asset with market exposure
- **THEN** the prompt SHALL NOT describe the task as "FX stablecoin trading"

#### Scenario: Buy signal generated for WMNT
- **WHEN** market signals suggest MNT/WMNT appreciation
- **THEN** Gemini SHALL return a signal with `currency: 'WMNT', direction: 'buy'`
- **THEN** the signal SHALL have `confidence >= 60` to pass execution threshold

### Requirement: FX executeSignal routes WMNT trades through Mantle DEX
When executing a WMNT buy/sell signal, `executeSignal` SHALL use `getMantleTokenBySymbol` to resolve the Mantle address and route through `executeUniswapSwap`.

#### Scenario: Buy WMNT executes USDT→WMNT swap
- **WHEN** signal is `{ currency: 'WMNT', direction: 'buy', amountUsd: 100 }`
- **THEN** `executeSignal` SHALL call `executeUniswapSwap` with `tokenIn=USDT_MANTLE, tokenOut=WMNT_MANTLE`
- **THEN** it SHALL return `{ success: true, txHash }`

#### Scenario: Sell WMNT executes WMNT→USDT swap
- **WHEN** signal is `{ currency: 'WMNT', direction: 'sell', amountUsd: 100 }`
- **THEN** `executeSignal` SHALL call `executeUniswapSwap` with `tokenIn=WMNT_MANTLE, tokenOut=USDT_MANTLE`
- **THEN** it SHALL return `{ success: true, txHash }`
