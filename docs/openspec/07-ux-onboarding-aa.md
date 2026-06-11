# 07 — UX & Onboarding (AA / Gasless)

> Referensi untuk: `openspec propose ux-onboarding-aa`
> Sumber: `Judging_Criteria_of_AI_Awakening.xlsx` — dimensi "User experience" (5 pts,
> semua track): "UI/UX design, onboarding friction, AA / gasless integration...
> menurunkan barrier Web2 user masuk Web3"

## 1. Kenapa tahap ini ada

Bobot kecil (5 pts) tapi mempengaruhi kesan keseluruhan demo, dan secara teknis
scope-nya kecil & independen — bisa dikerjakan kapan saja tanpa blocking tahap lain.
Fokus: turunkan friksi onboarding dan beri visibilitas status on-chain yang sudah
dibangun di Tahap 1-2.

## 2. Scope

**In scope:**
- **Onboarding flow** (extend SIWE yang sudah ada di `apps/api/src/routes/auth.ts`):
  - Untuk wallet baru/belum punya testnet MNT: tampilkan panduan in-app
    (link faucet `https://faucet.sepolia.mantle.xyz`, cek saldo otomatis, tombol
    "Recheck balance").
  - Step indicator: Connect Wallet → Fund (testnet) → Register Agent (ERC-8004,
    sudah ada di `agent-registry.ts`) → Configure Guardrails → Start Agent.
- **Status visibility di dashboard**:
  - Badge status RealClaw connection (configured/not, dari Tahap 1).
  - Badge custody model ("Non-custodial via Privy/RealClaw") — konsisten dengan
    copy Tahap 0.
  - Untuk tiap run/attestation: link langsung ke explorer Mantle Sepolia
    (`mantleExplorerTxUrl()` dari `chains.ts` — sudah ada helper-nya, tinggal
    dipakai konsisten di semua tempat yang relevan).
- **Account abstraction / gasless** (best-effort, sesuai stack yang tersedia):
  - Identifikasi aksi non-trading yang bisa gasless (mis. publish strategi ke
    marketplace dari Tahap 6, update guardrail config) — gunakan AA jika stack
    Mantle/thirdweb yang sudah dipakai untuk SIWE mendukung sponsored tx.
  - Jika AA penuh di luar scope waktu hackathon, dokumentasikan sebagai
    "roadmap" di README dengan analisis singkat opsi yang tersedia (jangan
    overclaim fitur yang belum ada — konsisten dengan semangat Tahap 0).

**Out of scope:**
- Mengubah flow auth inti (SIWE+JWT thirdweb) — hanya menambah UI/guidance di
  sekitarnya.
- AA untuk transaksi trading itu sendiri (custody model trading sudah ditangani
  RealClaw/Privy di Tahap 1).

## 3. Perubahan konkret

| Komponen | Perubahan |
|---|---|
| `apps/web/src/.../onboarding` (baru/extend) | Step indicator + panduan faucet + recheck balance |
| `apps/api/src/routes/user.ts` | Endpoint cek saldo testnet wallet (jika belum ada) untuk dipakai tombol "Recheck balance" |
| `apps/web/src/components/...` | Komponen `StatusBadge` (RealClaw status, custody model) dipakai konsisten di header dashboard |
| Semua tempat yang menampilkan tx hash | Pastikan pakai `mantleExplorerTxUrl()` secara konsisten (audit kecil) |
| README | Section "Onboarding" baru menjelaskan step-by-step untuk first-time user |

## 4. Acceptance Criteria

- [ ] User baru (wallet belum funded) yang connect wallet melihat panduan jelas
      untuk mendapatkan testnet MNT, dan status step (Connect → Fund → Register →
      Configure → Start) terlihat di UI.
- [ ] Status RealClaw & custody model terlihat di dashboard tanpa perlu baca
      dokumentasi.
- [ ] Semua link tx hash di UI (timeline, attestation, marketplace) konsisten
      mengarah ke Mantle Sepolia explorer yang benar.
- [ ] README memiliki section onboarding yang dapat diikuti orang tanpa
      pengalaman Web3 sebelumnya.

## 5. Testing

### Unit tests
- `apps/api/src/routes/user.test.ts` (extend jika ada, atau baru): endpoint cek
  saldo wallet → mock viem `PublicClient`, pastikan response format
  `{ balance: string, hasFunds: boolean }` benar untuk kasus saldo 0 dan saldo > 0.

```bash
cd apps/api && pnpm vitest run src/routes/user.test.ts
```

### Component tests (jika ada test setup React di `apps/web`)
- `StatusBadge` component: render dengan props `realClawConfigured: false` →
  menampilkan badge "Not configured" dengan styling warning; `true` → "Connected".
- Step indicator: render dengan state `{ connected: true, funded: false, ... }` →
  step "Fund" ter-highlight sebagai langkah aktif berikutnya.

```bash
cd apps/web && pnpm test
```
*(sesuaikan command jika `apps/web` belum punya test runner terkonfigurasi — jika
belum ada, proposal ini termasuk setup minimal Vitest/RTL untuk komponen baru ini
saja, tidak perlu test suite penuh.)*

### Manual / demo verification (skenario "first-time user")
1. Gunakan wallet baru (belum pernah dipakai di app ini, saldo 0 MNT testnet).
2. Connect wallet → pastikan UI menunjukkan step "Fund" aktif dengan link faucet.
3. Klaim faucet manual → klik "Recheck balance" → step berpindah ke "Register Agent"
   tanpa reload manual.
4. Selesaikan registrasi agent (Tahap existing) → step berpindah ke "Configure
   Guardrails" → "Start Agent".
5. Setelah agent jalan ≥1 run, cek:
   - Badge RealClaw status sesuai konfigurasi env.
   - Badge custody model menampilkan teks yang konsisten dengan README (Tahap 0).
   - Klik link tx di timeline → terbuka tab baru ke Mantle Sepolia explorer dengan
     tx hash yang benar.
6. Review README onboarding section — ikuti langkah-langkahnya secara literal
   sebagai "orang baru" untuk memastikan tidak ada langkah yang hilang.

## 6. Definition of Done

User baru tanpa pengalaman Web3 bisa connect wallet, mendapatkan testnet funds via
panduan in-app, melihat agent berjalan, dan memahami status on-chain (custody,
RealClaw, link explorer) mereka tanpa perlu membaca dokumentasi eksternal.
