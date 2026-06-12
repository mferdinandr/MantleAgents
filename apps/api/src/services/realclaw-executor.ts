// realclaw-executor.ts
//
// Execution layer for Mantle trades via the RealClaw / Byreal Skills CLI
// (https://openclaw.mantle.xyz). RealClaw routes swaps across Merchant Moe,
// Agni Finance, and Fluxion non-custodially via Privy server wallets.
//
// See docs/REALCLAW_API.md for the assumed API schema (confirm against live
// openclaw.mantle.xyz docs before production use).

const REALCLAW_CONFIRM_TIMEOUT_MS = parseInt(
  process.env.REALCLAW_CONFIRM_TIMEOUT_MS ?? '20000',
  10,
);

const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

export interface RealClawSwapParams {
  walletAddress: string;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: string;
  slippageBps?: number;
}

export type RealClawSwapResult =
  | { status: 'success'; txHash: string; amountOut: string }
  | { status: 'failed'; reason: string }
  | { status: 'pending_confirmation'; reason: string }
  | { status: 'error'; reason: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildApiBase(): string {
  return (process.env.REALCLAW_API_BASE ?? 'https://openclaw.mantle.xyz/api').replace(/\/$/, '');
}

async function callOnce(
  apiBase: string,
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${apiBase}/skills/dex-swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => '');
  }

  return { ok: res.ok, status: res.status, body };
}

async function callWithRetry(
  apiBase: string,
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  let lastResult: { ok: boolean; status: number; body: unknown } | undefined;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    lastResult = await callOnce(apiBase, apiKey, payload);

    if (lastResult.ok || lastResult.status < 500) {
      return lastResult;
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]!);
    }
  }

  return lastResult!;
}

async function pollForConfirmation(
  apiBase: string,
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<RealClawSwapResult> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(2000);

    const { ok, status, body } = await callOnce(apiBase, apiKey, payload);
    const b = body as Record<string, unknown>;

    if (ok && b?.status === 'success') {
      return {
        status: 'success',
        txHash: String(b.txHash ?? ''),
        amountOut: String(b.amountOut ?? '0'),
      };
    }

    if (b?.status === 'pending_confirmation') {
      continue;
    }

    if (!ok && status >= 400 && status < 500) {
      return { status: 'failed', reason: String(b?.error ?? `HTTP ${status}`) };
    }
  }

  return { status: 'pending_confirmation', reason: 'timeout' };
}

/**
 * Execute a token swap on Mantle via RealClaw.
 *
 * Returns a discriminated union — callers must not throw on non-success states.
 * See docs/REALCLAW_API.md for the API schema.
 */
export async function executeRealClawSwap(params: RealClawSwapParams): Promise<RealClawSwapResult> {
  const apiBase = buildApiBase();
  const apiKey = process.env.REALCLAW_API_KEY!;

  const payload = {
    wallet: params.walletAddress,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    slippageBps: params.slippageBps ?? 100,
  };

  const { ok, status, body } = await callWithRetry(apiBase, apiKey, payload);
  const b = body as Record<string, unknown>;

  if (!ok) {
    if (status >= 400 && status < 500) {
      return { status: 'failed', reason: String(b?.error ?? `HTTP ${status}`) };
    }
    return { status: 'error', reason: String(b?.error ?? `HTTP ${status} after retries`) };
  }

  if (b?.status === 'success') {
    return {
      status: 'success',
      txHash: String(b.txHash ?? ''),
      amountOut: String(b.amountOut ?? '0'),
    };
  }

  if (b?.status === 'pending_confirmation') {
    return pollForConfirmation(apiBase, apiKey, payload, REALCLAW_CONFIRM_TIMEOUT_MS);
  }

  return { status: 'error', reason: `Unexpected response: ${JSON.stringify(b)}` };
}

/**
 * Whether both required RealClaw env vars are set.
 * Logs a structured warning listing any missing vars.
 */
export function isRealClawConfigured(logger?: { warn: (msg: string) => void }): boolean {
  const missing: string[] = [];
  if (!process.env.REALCLAW_API_KEY) missing.push('REALCLAW_API_KEY');
  if (!process.env.REALCLAW_API_BASE) missing.push('REALCLAW_API_BASE');

  if (missing.length > 0) {
    const warn = logger?.warn ?? console.warn;
    warn(`[realclaw] Mantle trade execution disabled — missing env vars: ${missing.join(', ')}`);
    return false;
  }

  return true;
}
