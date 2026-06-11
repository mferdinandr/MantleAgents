## 1. API — Balance and System Status Endpoints

- [ ] 1.1 Add `GET /api/user/balance` to `apps/api/src/routes/user.ts`: auth required; call `publicClient.getBalance({ address: walletAddress })`; return `{ balance: string, hasFunds: boolean, faucetUrl: string | null }`
- [ ] 1.2 Return `faucetUrl: 'https://faucet.sepolia.mantle.xyz'` on testnet, `null` on mainnet
- [ ] 1.3 Create `apps/api/src/routes/system.ts`: register `GET /api/system/status` (no auth); return `{ realClawConfigured: boolean, network: 'testnet' | 'mainnet' }` using `isRealClawConfigured()` from Change 01 and `MANTLE_NETWORK` env
- [ ] 1.4 Register `system.ts` plugin in `apps/api/src/index.ts`

## 2. API Tests

- [ ] 2.1 Extend (or create) `apps/api/src/routes/user.test.ts`: mock `publicClient.getBalance` returning 0 → `hasFunds: false`; mock returning > 0 → `hasFunds: true`; missing JWT → 401
- [ ] 2.2 Add test for `GET /api/system/status`: `isRealClawConfigured()` true → `realClawConfigured: true`; false → `realClawConfigured: false`
- [ ] 2.3 Run `cd apps/api && pnpm vitest run src/routes/user.test.ts` — all green

## 3. Explorer URL Hook

- [ ] 3.1 Add `NEXT_PUBLIC_MANTLE_NETWORK` to `apps/web/.env.local.example` (values: `testnet` | `mainnet`)
- [ ] 3.2 Create `apps/web/src/lib/explorer.ts` with `getExplorerTxUrl(txHash: string, network: string): string` pure function using Mantle Sepolia explorer for testnet and Mantle mainnet explorer for mainnet
- [ ] 3.3 Create `useExplorerTxUrl(txHash: string | null): string | null` hook that reads `NEXT_PUBLIC_MANTLE_NETWORK` and calls `getExplorerTxUrl`; return `null` for null input

## 4. Explorer Link Audit and Fix

- [ ] 4.1 Run `grep -rn "tx_hash\|txHash\|commitTxHash" apps/web/src --include="*.tsx"` to enumerate all rendering locations
- [ ] 4.2 For each location found: replace plain text / unlinked hash with `<a href={useExplorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer">` (truncated display, full URL in href)
- [ ] 4.3 Verify no location renders a null hash as a broken link — add `txHash && (...)` guard where needed
- [ ] 4.4 Run `pnpm type-check` — exit 0

## 5. StatusBadge Component

- [ ] 5.1 Create `apps/web/src/components/status-badge.tsx` — pure presentational component accepting `{ realClawConfigured: boolean, custodyLabel: string }` props; render two badges using shadcn/ui `Badge` with appropriate colour variants
- [ ] 5.2 Create `apps/web/src/components/dashboard-status-badges.tsx` — data-fetching wrapper; call `GET /api/system/status` via TanStack Query with `staleTime: 5 * 60 * 1000`; render `StatusBadge`
- [ ] 5.3 Import `DashboardStatusBadges` in `apps/web/src/app/(app)/layout.tsx` (or the dashboard shell component); place it in the header or sidebar so it is visible on all app pages

## 6. StatusBadge Component Tests

- [ ] 6.1 Set up minimal Vitest + React Testing Library config in `apps/web` if not already present (add `vitest.config.ts` and `@testing-library/react` dev dependency)
- [ ] 6.2 Write test for `StatusBadge`: `realClawConfigured: false` → badge text "RealClaw Not Configured" present; warning variant class applied
- [ ] 6.3 Write test for `StatusBadge`: `realClawConfigured: true` → badge text "RealClaw Connected" present; success variant class applied
- [ ] 6.4 Write test for `StatusBadge`: custody badge with "Non-custodial" text always present regardless of props
- [ ] 6.5 Write test for step indicator component: `{ connected: true, funded: false }` → step 2 (Fund) has active styling; step 1 has completed styling
- [ ] 6.6 Run `cd apps/web && pnpm test` — all green

## 7. Onboarding Step Indicator

- [ ] 7.1 Read `apps/web/src/app/(auth)/onboarding/page.tsx` to understand current structure before modifying
- [ ] 7.2 Create `apps/web/src/app/(auth)/onboarding/_components/step-indicator.tsx` — renders 5-step progress bar; accepts `{ connected, funded, registered, configured, started }` boolean props
- [ ] 7.3 Create `apps/web/src/app/(auth)/onboarding/_components/fund-wallet-guide.tsx` — shows when `funded: false`; contains faucet link (opens new tab) + "Recheck balance" button
- [ ] 7.4 "Recheck balance" button triggers TanStack Query refetch of `GET /api/user/balance`; on `hasFunds: true` the step indicator updates without page reload
- [ ] 7.5 Integrate `StepIndicator` and `FundWalletGuide` into the existing onboarding page; do not remove existing content
- [ ] 7.6 Derive step states from parallel TanStack Query calls: `GET /api/user/balance` (step 2), `GET /api/agent/config` (steps 3–5)

## 8. README Updates

- [ ] 8.1 Add "## Onboarding" section to `README.md` with step-by-step instructions: (1) Install MetaMask / use any EVM wallet, (2) Connect wallet, (3) Get testnet MNT from faucet link, (4) Register agent via dashboard, (5) Configure guardrails, (6) Start agent — written for a non-Web3-native reader
- [ ] 8.2 Add "### Roadmap: Account Abstraction / Gasless UX" subsection under Onboarding: explain current non-custodial model via Privy/RealClaw; describe planned AA extension using thirdweb smart accounts + Mantle paymaster for non-trading actions (strategy publish, guardrail updates); label clearly as "planned, not yet implemented"

## 9. Manual Demo Verification

- [ ] 9.1 Use a fresh wallet (0 MNT testnet): connect → verify step 2 (Fund) is active with visible faucet link
- [ ] 9.2 Fund the wallet via faucet → click "Recheck balance" → verify step 2 marks complete, step 3 becomes active, no page reload
- [ ] 9.3 Complete agent registration → reload onboarding page → verify steps 1–3 show completed
- [ ] 9.4 Open any dashboard page → verify RealClaw and custody badges visible in header/sidebar
- [ ] 9.5 Open FX Agent timeline → verify tx hashes are clickable links → click one → confirm Mantle Sepolia explorer opens with the correct tx
- [ ] 9.6 Follow the README Onboarding section literally as a "new user" — confirm no missing steps

## 10. Cleanup

- [ ] 10.1 Run `pnpm type-check` — exit 0
- [ ] 10.2 Run `pnpm --filter @jakartagents/web build` — exit 0
