# RealClaw / Byreal Skills CLI — API Reference

> **Status**: Scaffold-based assumptions. Confirm each section against the live API at `openclaw.mantle.xyz` and the `byreal-agent-skills` repo before going to production. Fields marked ⚠️ are unconfirmed.

## Base URL

```
REALCLAW_API_BASE=https://openclaw.mantle.xyz/api
```

Set via env var. The executor appends `/skills/<skill-name>` for each call.

## Auth

```
Authorization: Bearer <REALCLAW_API_KEY>
```

⚠️ Assumed Bearer token scheme. Confirm whether an ERC-8004 agent identity signature is required instead.

## Swap Skill

### Skill name

```
dex-swap
```

⚠️ Unconfirmed — may be `swap`, `execute-swap`, or similar. Check `byreal-agent-skills` repo.

### Endpoint

```
POST /api/skills/dex-swap
```

### Request payload

```json
{
  "wallet": "0xServerWalletAddress",
  "tokenIn": "0xTokenInAddress",
  "tokenOut": "0xTokenOutAddress",
  "amountIn": "1000000000000000000",
  "slippageBps": 100
}
```

| Field | Type | Description |
|---|---|---|
| `wallet` | `string` | Server wallet address (Privy-managed) executing the swap |
| `tokenIn` | `0x${string}` | ERC20 token to swap from |
| `tokenOut` | `0x${string}` | ERC20 token to swap to |
| `amountIn` | `string` | Amount in base units (as string to avoid bigint/JSON issues) |
| `slippageBps` | `number` | Max slippage in basis points (e.g. 100 = 1%) |

⚠️ Field names `tokenIn`/`tokenOut`/`amountIn`/`slippageBps` are assumed. Confirm against docs.

### Response — success

```json
{
  "status": "success",
  "txHash": "0xabc123...",
  "amountOut": "999500000000000000"
}
```

### Response — pending confirmation (Privy)

```json
{
  "status": "pending_confirmation",
  "confirmationId": "abc-xyz-123"
}
```

When this is returned, poll the same endpoint (or a status endpoint) every 2s until confirmed or timeout. Default timeout: 20 000 ms (`REALCLAW_CONFIRM_TIMEOUT_MS`).

⚠️ Confirm whether polling uses the same endpoint with `confirmationId`, or a separate `/status/<id>` endpoint.

### Response — 4xx (client error, no retry)

```json
{
  "error": "insufficient balance"
}
```

Common 4xx reasons:
- `insufficient balance` — wallet doesn't have enough `tokenIn`
- `slippage exceeded` — price moved past `slippageBps`
- `invalid token` — token address not supported on Mantle

### Response — 5xx (server error, retry with backoff)

```json
{
  "error": "internal server error"
}
```

The executor retries up to 3 times with backoff 1s → 2s → 4s.

## Privy Server-Wallet Flow

⚠️ Unconfirmed: The integration assumes server-wallet flows via Privy are fully autonomous (no out-of-band human confirmation required). If a mobile push or similar is needed, the polling loop will always timeout and trades will always log as `trade_pending`.

## Confirmed Tokens (Mantle Sepolia Testnet)

| Token | Address |
|---|---|
| mUSDC | `MANTLE_USDC_ADDRESS` from env |
| mUSDT | `MANTLE_USDT_ADDRESS` from env |
| WMNT | `MANTLE_WMNT_ADDRESS` from env |

## DEX Routing

RealClaw routes internally across Merchant Moe, Agni Finance, and Fluxion. The caller does not specify the venue.
