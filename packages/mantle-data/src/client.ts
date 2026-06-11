import type { MantleDataApiResponse, MantleDataClientConfig } from './types.js';

const DATA_BASE_URL = 'https://data.ave-api.xyz/v2';
const TRADE_BASE_URL = 'https://bot-api.ave.ai';
const DEFAULT_MAX_RETRIES = 3;

export class MantleDataApiError extends Error {
  constructor(
    public status: number,
    public msg: string,
    public httpStatus?: number,
  ) {
    super(`AVE API error ${status}: ${msg}`);
    this.name = 'MantleDataApiError';
  }
}

export class MantleDataClient {
  private apiKey: string;
  readonly dataBaseUrl: string;
  readonly tradeBaseUrl: string;
  private maxRetries: number;

  constructor(config: MantleDataClientConfig = {}) {
    const key = config.apiKey ?? process.env.MARKETDATA_API_KEY;
    if (!key) {
      throw new Error(
        'MARKETDATA_API_KEY is required. Pass it via config or set the env var.',
      );
    }
    this.apiKey = key;
    this.dataBaseUrl = config.dataBaseUrl ?? DATA_BASE_URL;
    this.tradeBaseUrl = config.tradeBaseUrl ?? TRADE_BASE_URL;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Generic GET request to the Data REST API.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async dataGet<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.dataBaseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }
    return this.request<T>(url.toString(), { method: 'GET' });
  }

  /**
   * Generic POST request to the Data REST API.
   */
  async dataPost<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(`${this.dataBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Generic POST request to the Trade API.
   * Trade API uses `AVE-ACCESS-KEY` header instead of `X-API-KEY`.
   */
  async tradePost<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(
      `${this.tradeBaseUrl}${path}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      true,
    );
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async request<T>(
    url: string,
    init: RequestInit,
    isTrade = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    };

    if (isTrade) {
      headers['AVE-ACCESS-KEY'] = this.apiKey;
    } else {
      headers['X-API-KEY'] = this.apiKey;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
        await sleep(delay);
      }

      try {
        const res = await fetch(url, { ...init, headers });

        if (res.status === 429) {
          lastError = new MantleDataApiError(429, 'Rate limited', 429);
          continue;
        }

        if (!res.ok) {
          throw new MantleDataApiError(
            res.status,
            `HTTP ${res.status} ${res.statusText}`,
            res.status,
          );
        }

        const json = (await res.json()) as MantleDataApiResponse<T>;

        if (json.status !== 1 && json.status !== 200) {
          throw new MantleDataApiError(json.status, json.msg);
        }

        return json.data;
      } catch (err) {
        if (err instanceof MantleDataApiError && err.httpStatus !== 429) {
          throw err;
        }
        lastError =
          err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError ?? new Error('AVE API request failed after retries');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
