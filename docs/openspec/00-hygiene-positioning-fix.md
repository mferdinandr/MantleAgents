# 00 — Hygiene & Positioning Fix

> Referensi untuk: `openspec propose hygiene-positioning-fix`
> Sumber: `review-jakartagents-v2.md` poin #1, #3, #5; `Dokumentasi_Konseptual_JakartAgents_V2.md` §3

## 1. Kenapa tahap ini ada

Tiga klaim/diksi di dokumentasi & copy saat ini berpotensi salah secara faktual atau
menyesatkan juri, dan semuanya bisa diperbaiki **tanpa mengubah kode fungsional**:

1. **"Byreal API/DEX Mantle"** — Byreal sebagai DEX ada di **Solana**, bukan Mantle.
   Yang relevan untuk Mantle adalah **agent layer Byreal** (RealClaw + OpenClaw +
   Byreal Skills CLI, di `openclaw.mantle.xyz`). Venue eksekusi swap on-chain di
   Mantle adalah **Merchant Moe / Agni Finance / Fluxion**.
2. **Custody tidak dijelaskan** — auto-execute (beli/jual/stop-loss) tanpa penjelasan
   custody adalah red flag security. Default: **non-custodial via Privy melalui
   RealClaw**.
3. **"AI mendeteksi honeypot"** — secara konsep keliru. Honeypot detection adalah
   **transaction simulation** (`eth_call`/Tenderly/GoPlus), bukan tugas LLM. AI hanya
   boleh diklaim untuk analisis sentiment/narrative.

## 2. Scope

**In scope** (semua file dokumentasi/teks, TIDAK ada perubahan logika):
- `README.md` (root)
- `CLAUDE.md`, `AGENTS.md`
- `Dokumentasi_Konseptual_JakartAgents_V2.md` (kalau disimpan di repo)
- String/label di UI dashboard (`apps/web`) yang menyebut "AI honeypot detection",
  "Byreal DEX", dsb — cek di komponen risk-check & token-monitor display.
- Komentar/docstring di `apps/api/src/services/realclaw-executor.ts`,
  `token-monitor.ts` jika ada klaim serupa.

**Out of scope:** perubahan logika `realclaw-executor.ts` atau honeypot check itu
sendiri (itu Tahap 1 dan implisit di Tahap 3).

## 3. Perubahan konkret

| Lokasi | Dari | Jadi |
|---|---|---|
| README, docs | "Byreal API/DEX Mantle" | "RealClaw / Byreal Skills CLI (Mantle agent layer); eksekusi via Merchant Moe / Agni Finance / Fluxion" |
| README §Mantle Integration | (tidak ada penjelasan custody) | Tambah subsection "Custody Model": non-custodial via Privy (RealClaw), atau session key ERC-4337 untuk eksekusi mandiri |
| UI label risk/honeypot | "AI Honeypot Detection" / "AI mendeteksi risiko kontrak" | "Contract Risk Check (transaction simulation / GoPlus)" — AI disebut hanya untuk sentiment |
| Pitch deck / positioning copy | framing "ROI tercepat" / adu performa | "No-code agent builder untuk Mantle dengan marketplace yang trust-nya berasal dari on-chain track record" |

## 4. Acceptance Criteria

- [ ] `grep -ri "byreal.*dex" .` (exclude node_modules) tidak menghasilkan klaim
      Byreal sebagai DEX di Mantle.
- [ ] `grep -ri "ai.*honeypot\|honeypot.*ai" .` tidak ditemukan, kecuali dalam konteks
      "no longer/avoided" (mis. di review doc itu sendiri yang memang membahas masalah ini).
- [ ] README memiliki section custody yang eksplisit menyebut Privy/RealClaw.
- [ ] Tidak ada perubahan pada `*.ts`/`*.tsx` selain string literal/komentar/JSX text.

## 5. Testing

Tahap ini **tidak menyentuh logika**, jadi testing berupa verifikasi statis, bukan unit test:

1. **Grep audit** (jalankan dari root repo):
   ```bash
   grep -rni "byreal" --include="*.md" --include="*.ts" --include="*.tsx" .
   grep -rni "honeypot" --include="*.md" --include="*.ts" --include="*.tsx" .
   ```
   Review tiap hasil manual — pastikan diksi sudah sesuai tabel di atas.
2. **Build sanity check** (memastikan perubahan string tidak merusak build):
   ```bash
   pnpm type-check
   pnpm --filter @jakartagents/web build
   ```
3. **Visual check**: jalankan `pnpm dev`, buka dashboard, screenshot halaman yang
   menampilkan label risk-check & status integrasi Mantle — pastikan copy baru tampil
   dengan benar (tidak overflow/truncate di UI).
4. **Tidak perlu unit test baru** — tidak ada `*.test.ts` baru untuk tahap ini.

## 6. Definition of Done

Tidak ada lagi referensi yang salah/menyesatkan ke Byreal-as-DEX-Solana atau
"AI honeypot detection" di seluruh docs, README, dan UI copy; custody model
dijelaskan eksplisit; build & type-check tetap hijau.
