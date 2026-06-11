# 03 — Agent Autonomy Showcase

> Referensi untuk: `openspec propose agent-autonomy-showcase`
> Sumber: `Judging_Criteria_of_AI_Awakening.xlsx` sheet "Agentic Economy" — dimensi
> "Agent autonomy" (14 pts, terbesar kedua di Part B);
> `apps/api/src/services/agent-cron.ts`, `rules-engine.ts`, `trade-executor.ts`

## 1. Kenapa tahap ini ada

Kriteria juri untuk "Agent autonomy":

> How independently does the agent operate? Judges assess the degree to which the
> agent can perceive context, make decisions, and execute on-chain actions without
> constant human intervention. Projects that demonstrate genuine agentic behavior —
> multi-step reasoning, adaptive execution, or autonomous error recovery — score
> higher than those requiring manual guidance at each step.

Alur saat ini (60s cron): fetch data → LLM signal → guardrail check → execute →
log. Ini "agentic" tapi linear & single-shot — kalau eksekusi gagal (slippage,
honeypot flag dari Tahap 1/RealClaw, dsb), agent hanya log error dan berhenti sampai
tick berikutnya. Itu lemah di "adaptive execution / autonomous error recovery".

## 2. Scope

**In scope:**
- `apps/api/src/services/rules-engine.ts`: tambah kemampuan **re-evaluasi** ketika
  eksekusi gagal — bukan hanya validasi sekali di awal.
- `apps/api/src/services/agent-cron.ts`: ubah alur dari linear menjadi
  **plan → execute → observe → adapt** (maks N iterasi per tick, untuk hindari
  infinite loop):
  1. Plan: LLM signal + guardrail check (existing).
  2. Execute (Tahap 1's RealClaw).
  3. Observe: cek hasil — sukses / gagal-karena-slippage / gagal-karena-risk-flag / error lain.
  4. Adapt: jika gagal & masih dalam guardrail budget, agent membuat keputusan
     korektif (kurangi `amountIn`, ganti `tokenOut` ke alternatif dari watchlist,
     atau skip dengan reasoning tercatat) — maksimal 1 retry per tick untuk kontrol
     biaya/waktu.
- `apps/api/src/services/trade-executor.ts`: pastikan hasil eksekusi mengandung
  kategori kegagalan terstruktur (`'slippage_exceeded' | 'risk_flagged' | 'insufficient_funds' | 'other'`)
  agar `agent-cron.ts` bisa membuat keputusan adaptif berbasis kategori, bukan parsing
  string error.
- Timeline: tambah event type baru `decision_adapted` berisi `{ originalPlan, reason, adaptedPlan }`.

**Out of scope:**
- Multi-agent coordination / agent-ke-agent communication (di luar scope hackathon ini).
- Perubahan attestation schema (sudah ditangani Tahap 2 — tahap ini hanya menambah
  *jenis* event yang nantinya ikut ter-hash).

## 3. Perubahan konkret

| File | Perubahan |
|---|---|
| `trade-executor.ts` | Return type eksekusi punya `failureCategory` terstruktur |
| `rules-engine.ts` | + fungsi `evaluateAdaptedPlan(originalSignal, failureCategory, guardrails)` → mengembalikan `adaptedPlan \| null` (null = tidak ada opsi adaptif valid, agent berhenti & log) |
| `agent-cron.ts` | Loop plan→execute→observe→adapt, maks 1 adaptasi per tick, log setiap langkah ke timeline |
| `packages/shared` | Tipe baru: `FailureCategory`, `AdaptedPlan`, event type `decision_adapted` |

## 4. Acceptance Criteria

- [ ] Ada minimal 2 skenario adaptif terimplementasi:
  1. **Slippage exceeded** → agent mencoba ulang dengan `amountIn` lebih kecil
     (mis. 50% dari original), sekali, dalam batas guardrail.
  2. **Risk flagged (honeypot/contract risk dari risk-check)** → agent membatalkan
     trade ke token tersebut, mencatat alasan, dan (opsional) mencoba kandidat token
     berikutnya dari watchlist jika ada.
- [ ] Setiap adaptasi tercatat sebagai event `decision_adapted` dengan
     `originalPlan`, `reason`, `adaptedPlan` — semua dalam bentuk yang bisa di-hash
     (kompatibel dengan Tahap 2).
- [ ] Tidak ada infinite loop: maksimal 1 siklus adapt per tick, dijamin oleh
     test/limit eksplisit di kode (bukan cuma asumsi).
- [ ] Guardrail tetap final authority — adaptasi tidak pernah melanggar
     `maxValuePerTx`, daily limit, dsb dari `rules-engine.ts`.

## 5. Testing

### Unit tests

`rules-engine.test.ts` (extend, file sudah ada):
- `evaluateAdaptedPlan()` dengan `failureCategory = 'slippage_exceeded'` →
  mengembalikan plan dengan `amountIn` berkurang sesuai aturan, dan tetap di dalam
  guardrail.
- `evaluateAdaptedPlan()` dengan `failureCategory = 'risk_flagged'` → mengembalikan
  `null` jika tidak ada token alternatif, atau plan ke token alternatif jika ada.
- `evaluateAdaptedPlan()` dengan adapted plan yang **akan** melanggar guardrail
  (mis. amount masih di atas limit) → harus mengembalikan `null` (agent berhenti,
  bukan paksa eksekusi).

```bash
cd apps/api && pnpm vitest run src/services/rules-engine.test.ts
```

`agent-cron.test.ts` (extend, file sudah ada):
- Mock `trade-executor` mengembalikan `failureCategory: 'slippage_exceeded'` pada
  attempt pertama, sukses pada attempt kedua → pastikan:
  - Hanya **1** retry terjadi (attempt ke-3 tidak dipanggil meski mock disiapkan).
  - Event `decision_adapted` tercatat di antara dua event eksekusi.
- Mock `trade-executor` gagal terus (selalu `slippage_exceeded`) → pastikan setelah 1
  retry, agent berhenti dengan event final `trade_failed` (bukan loop tanpa henti).
- Mock `failureCategory: 'risk_flagged'` tanpa token alternatif di watchlist →
  pastikan event `decision_adapted` dengan `adaptedPlan: null` dan tidak ada
  eksekusi tambahan.

```bash
cd apps/api && pnpm vitest run src/services/agent-cron.test.ts
```

### Manual / demo verification (skenario yang bisa "dipaksa" untuk demo)

1. **Slippage scenario**: set guardrail `maxSlippageBps` sangat ketat untuk satu test
   run → trigger agent → amati di dashboard timeline urutan: `decision_input` →
   `trade_failed (slippage_exceeded)` → `decision_adapted` → `trade (success, amount lebih kecil)`.
2. **Risk-flag scenario**: tambahkan token dummy berisiko tinggi (atau mock hasil
   risk-check) ke watchlist → trigger agent → amati timeline:
   `decision_input` → `decision_adapted (reason: risk_flagged, adaptedPlan: null atau token alternatif)`.
3. Cross-check dengan Tahap 2: pastikan event `decision_adapted` ikut masuk ke
   `eventsHash`/attestation run tersebut.

## 6. Definition of Done

Minimal satu skenario terdemo di mana agent menghadapi kondisi tak ideal (slippage
tinggi atau risk flag) dan secara mandiri mengambil tindakan korektif dalam batas
guardrail — tercatat lengkap di timeline dan (via Tahap 2) di attestation on-chain.
