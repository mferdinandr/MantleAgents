# MantleAgents 🤖

**MantleAgents** is an autonomous AI agent platform built on [Mantle](https://mantle.xyz) where AI agents monitor markets, generate trading signals, validate them through on-chain guardrails, and execute trades — with every run independently verifiable on-chain.

<img width="1512" height="834" alt="mantleagents-banner" src="https://github.com/user-attachments/assets/07b8b613-81a5-472c-ad2c-46882023ec38" />


> Built for **The Turing Test Hackathon 2026 (Mantle)** — Agentic Economy track

---

## The Problem

Autonomous trading agents are black boxes. Users have no way to verify an agent's claimed performance, audit its decision-making, or trust that it behaves consistently between runs. The result: a market of unverifiable performance claims.

## The Solution

MantleAgents anchors every agent run to an on-chain attestation. Each agent holds an ERC-8004 identity NFT on Mantle, every trade builds its on-chain reputation, and every run commits a tamper-proof hash to `AgentAttestationRegistry` — so performance is auditable, not just claimed.

MantleAgents is also evolving into a **no-code agent builder for Mantle**, where trust comes from each agent's on-chain track record, not marketing.

---

## ✨ Key Features

### 📈 FX Agent

Trades stablecoin pairs based on macro news sentiment — USD strength/weakness, risk-on/risk-off signals — powered by Gemini 2.5 Flash. Entry and exit decisions are validated against configurable guardrails before any on-chain execution.

### 🌾 Yield Agent

Hunts yield opportunities across Merkl and manages LP/vault positions. Detects APR shifts and adjusts allocations automatically, with stop-loss and max-allocation guardrails preventing runaway positions.

### Other Highlights

- **ERC-8004 Agent Identity** — every agent is an on-chain NFT with a linked execution wallet
- **On-Chain Attestations** — every run's events are SHA-256 hashed and committed to `AgentAttestationRegistry` on Mantle
- **Smart Guardrails** — daily trade limits, max allocation per token, trade size caps, stop-loss protection
- **Self-hosted Uniswap V2 DEX** — Mantle-native execution with no reliance on third-party DEX availability
- **Token Monitor** — real-time watchlist with configurable price alerts and automated contract risk scoring
- **Conversation Agent** — chat-based interface to query agent status, market data, and portfolio state
- **Strategy Marketplace** — publish attested strategies once a minimum track record is established

---

## 🏗️ Architecture

```
mantleagents/
├── apps/api/       # Fastify v5 backend (REST, WebSocket, crons)
├── apps/web/       # Next.js 16 frontend (React 19, Tailwind v4)
├── packages/
│   ├── mantle-data/       # Market data SDK (price/kline/holders/risk)
│   ├── contracts/         # Solidity contracts + deploy scripts (Mantle)
│   ├── shared/            # Shared TypeScript types
│   └── db/                # Supabase client factory + generated types
└── supabase/migrations/   # PostgreSQL migrations
```

### Frontend (`apps/web/`)

- **Framework**: Next.js 16 with React 19, App Router
- **Wallet / Auth**: wagmi v2 + viem, Sign-In With Ethereum (SIWE)
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI, Lucide Icons
- **Data**: TanStack Query v5 with auto-refetch; WebSocket for real-time streaming

### Backend (`apps/api/`)

The Fastify v5 API drives all agent logic:

| Service | Role |
| --- | --- |
| `agent-cron.ts` | 60s tick cron — fetch data, run LLM, validate, execute, attest |
| `llm-analyzer.ts` | Gemini 2.5 Flash generates buy/sell/hold signals with confidence scores |
| `rules-engine.ts` | Validates signals against user-defined guardrails before execution |
| `trade-executor.ts` | Routes Mantle trades to the self-hosted DEX; non-Mantle via market-data SDK |
| `uniswap-swap.ts` | Mantle execution — quote + allowance + `swapExactTokensForTokens` via relayer |
| `attestation-service.ts` | Hashes run events, HMAC-signs, stores in Supabase, commits to `AgentAttestationRegistry` |
| `agent-registry.ts` | ERC-8004 `register()` + `setAgentWallet()` + reputation feedback |
| `token-monitor.ts` | 30s price poll — watchlist CRUD, alert matching, contract risk check |
| `conversation-service.ts` | Chat agent with news, market data, and governance tools |

### Smart Contracts (`packages/contracts/`)

| Contract | Description |
| --- | --- |
| `AgentAttestationRegistry.sol` | Custom registry — commits per-run event hash + decision hash on-chain |
| `MockERC20.sol` | Testnet mUSDC / mUSDT / mWMNT tokens |
| `UniswapV2Factory.sol` | Self-hosted DEX factory on Mantle Sepolia |
| `UniswapV2Router02.sol` | DEX router — quote + swap execution |

- **Language**: Solidity 0.8.x
- **Toolchain**: `solc` + custom `tsx` deploy scripts
- **Oracle**: Pyth-compatible price references; Merkl for yield data
- **Network**: Mantle Sepolia Testnet (`https://rpc.sepolia.mantle.xyz`, chainId 5003)

### Market Data SDK (`packages/mantle-data/`)

Wrapper around the AVE Cloud API for **non-Mantle** price and execution data:

- `client.ts` — Base HTTP client with 3× exponential backoff retry
- `data-rest.ts` — Token search, price, kline, holders, risk, wallet endpoints
- `trade-chain-wallet.ts` — EVM/Solana quote + execute

---

## 📦 Deployed Contracts (Mantle Sepolia Testnet, chainId 5003)

| Contract | Address |
| --- | --- |
| ERC-8004 IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| AgentAttestationRegistry | `0x46ad38080a72011745e6dbbeddf0bdfc251676c6` |
| mUSDC (Mock) | `0xdf98ea1d6230f7aafc73fadebb373d7731c1bed8` |
| mUSDT (Mock) | `0x76eff439b3f57ab6bbe4e10f34a1f44c7f5332b3` |
| mWMNT (Mock WMNT) | `0x1fe6477783a5571e7259a5ad16293262b88779a3` |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9.15.0
- A Supabase project (or local Supabase CLI)
- A wallet funded with Mantle Sepolia testnet MNT — faucet: `https://faucet.sepolia.mantle.xyz`

### 1. Install dependencies

```bash
pnpm install
```

### 2. API (Backend)

```bash
cd apps/api
cp .env.example .env       # fill in your env vars
cd ../..
pnpm --filter @mantleagents/api dev   # starts at http://localhost:4000
```

**Required env vars (`apps/api/.env`):**

```env
# Auth
AUTH_DOMAIN=localhost:3000
JWT_SECRET=                         # openssl rand -hex 32

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Market Data (non-Mantle chains)
MARKETDATA_API_KEY=
MARKETDATA_DEFAULT_CHAIN=bsc

# Mantle Network
MANTLE_NETWORK=testnet
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
MANTLE_IDENTITY_REGISTRY_ADDRESS=0x8004A818BFB912233c491871b3d84c89A494BD9e
MANTLE_REPUTATION_REGISTRY_ADDRESS=0x8004B663056A597Dffe9eCcC1965A193B7388713
MANTLE_ATTESTATION_REGISTRY_ADDRESS=0x46ad38080a72011745e6dbbeddf0bdfc251676c6

# Mock tokens (Mantle Sepolia)
MANTLE_USDC_ADDRESS=0xdf98ea1d6230f7aafc73fadebb373d7731c1bed8
MANTLE_USDT_ADDRESS=0x76eff439b3f57ab6bbe4e10f34a1f44c7f5332b3
MANTLE_WMNT_ADDRESS=0x1fe6477783a5571e7259a5ad16293262b88779a3

# Self-hosted Uniswap V2 DEX (Mantle Sepolia)
MANTLE_DEX_ROUTER_ADDRESS=
MANTLE_DEX_FACTORY_ADDRESS=

# Relayer (must be funded with MNT for gas)
EVM_SIGNER_PRIVATE_KEY=

# AI
GEMINI_CLI_AUTH_TYPE=oauth-personal
LLM_MODEL=gemini-2.5-flash
PARALLEL_API_KEY=                   # FX news search

# Attestation signing
ATTESTATION_SECRET=                 # openssl rand -hex 32
```

### 3. Frontend (Web)

```bash
pnpm --filter @mantleagents/web dev   # starts at http://localhost:3000
```

**Required env vars (`apps/web/.env.local`):**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # optional — enables WalletConnect connector
```

### 4. Smart Contracts

```bash
# Deploy mock tokens
pnpm --filter @mantleagents/contracts deploy:tokens

# Deploy self-hosted Uniswap V2 DEX + seed liquidity pools
pnpm --filter @mantleagents/contracts deploy:dex

# Deploy AgentAttestationRegistry
pnpm --filter @mantleagents/contracts deploy:attestation-registry

# Verify registry addresses in .env
pnpm --filter @mantleagents/contracts verify:registries
```

Contracts are compiled with the `solc` npm package — no Foundry installation required.

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Blockchain | Mantle Sepolia Testnet (chainId 5003) |
| Smart Contracts | Solidity 0.8.x, solc, custom tsx deploy scripts |
| On-Chain Identity | ERC-8004 IdentityRegistry + ReputationRegistry |
| On-Chain Attestations | Custom AgentAttestationRegistry |
| Mantle Execution | Self-hosted Uniswap V2 DEX + relayer wallet (viem) |
| Frontend | Next.js 16, React 19, TypeScript |
| Wallet / Auth | wagmi v2, SIWE (EIP-4361), JWT (HS256) |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Backend | Fastify v5, Node.js 20, TypeScript |
| AI / LLM | Gemini 2.5 Flash (Vercel AI SDK) |
| Market Data | `@mantleagents/mantle-data` (AVE Cloud) + Merkl (yield) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Monorepo | pnpm workspaces + Turborepo |
| Testing | Vitest |

---

## 🔄 How an Agent Run Works

```
1. Agent cron fires every 60s — queries agent_configs for agents due to run
2. Fetch portfolio positions + current on-chain balances (Mantle RPC)
3. Fetch market data: price, klines, macro news (Parallel AI), yield (Merkl)
4. Gemini 2.5 Flash generates a signal: BUY / SELL / HOLD with confidence (0-100)
5. Rules engine validates the signal against guardrails:
     - Max trade size, daily trade limit, max allocation per token, stop-loss
6. Trade executor submits the swap via the self-hosted Uniswap V2 DEX on Mantle
7. Reputation registry receives trade feedback (outcome → on-chain reputation)
8. Attestation service hashes the full run timeline (SHA-256), HMAC-signs it,
   stores in Supabase, and commits eventsHash + runId to AgentAttestationRegistry
9. Dashboard shows "Verified on-chain" badge with the commit tx hash
```

**Parallel Multi-Agent**: Multiple agents run in parallel within the same cron tick — each agent's signal generation, guardrail check, execution, and attestation are independent, so agents never block each other.

---

## 📁 Project Structure

```
apps/api/src/
├── lib/
│   ├── chains.ts               # Mantle chain config (single source of truth)
│   └── chain-client.ts         # Mantle viem PublicClient
├── abis/                       # ERC-8004 + AgentAttestationRegistry ABIs
├── routes/                     # REST + WebSocket endpoints
└── services/
    ├── agent-cron.ts           # 60s agent execution loop
    ├── llm-analyzer.ts         # Gemini 2.5 Flash signal generation
    ├── rules-engine.ts         # Guardrail validation
    ├── trade-executor.ts       # Multi-chain DEX routing
    ├── uniswap-swap.ts         # Mantle Uniswap V2 execution
    ├── agent-registry.ts       # ERC-8004 register + reputation
    ├── attestation-service.ts  # On-chain run attestations
    ├── token-monitor.ts        # Watchlist + alerts + risk check
    ├── price-service.ts        # Market data feeds + 1min cache
    ├── yield-analyzer.ts       # Merkl yield opportunity detection
    ├── conversation-service.ts # Chat agent with tool use
    └── news-fetcher.ts         # Parallel AI news search

apps/web/src/app/
├── (app)/overview/             # Portfolio overview
├── (app)/fx-agent/             # FX trading agent dashboard
├── (app)/yield-agent/          # Yield agent dashboard
├── (app)/monitor/              # Token watchlist + price alerts
├── (app)/agent-chat/           # Conversational AI agent
├── (app)/marketplace/          # Strategy marketplace
├── (app)/swap/                 # Manual token swap
└── (auth)/                     # Onboarding + wallet setup
```

---

## 📄 License

MIT — built for the Mantle ecosystem.
