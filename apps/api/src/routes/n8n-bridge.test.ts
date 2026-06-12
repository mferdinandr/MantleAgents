import Fastify from 'fastify';
import { createN8nApiKey } from '../services/n8n-security.js';
import { n8nBridgeRoutes } from './n8n-bridge.js';

const BRIDGE_SECRET = 'bridge-secret';
const WALLET_ADDRESS = '0xabc123';

function makeHeaders(walletAddress = WALLET_ADDRESS) {
  return {
    'x-n8n-api-key': createN8nApiKey(walletAddress, BRIDGE_SECRET),
  };
}

function makeDeps() {
  return {
    getMarketData: vi.fn().mockResolvedValue({
      detail: {
        symbol: 'USDC',
        name: 'USD Coin',
        price: 1,
        price_change_24h: 0.25,
        market_cap: 1000000,
        tx_volume_u_24h: 250000,
        holder_count: 1234,
      } as any,
      kline: [
        { time: 1, open: 1, high: 1.1, low: 0.9, close: 1.05, volume: 1000 },
      ],
      riskSummary: {
        risk_level: 'LOW',
        risk_score: 5,
        honeypot: false,
        buy_tax: 0,
        sell_tax: 0,
        owner: '0xowner',
        ownership_renounced: true,
        can_mint: false,
        can_burn: true,
        holder_concentration: 12,
        dex_liquidity: 500000,
      } as any,
    }),
    analyzeSignals: vi.fn().mockResolvedValue({
      signals: [
        {
          currency: 'ETH',
          direction: 'buy',
          confidence: 81,
          allocationPct: 25,
          reasoning: 'Momentum breakout',
          timeHorizon: 'short',
        },
      ],
      marketSummary: 'Constructive market backdrop',
      sourcesUsed: 2,
    }),
    checkGuardrails: vi.fn().mockReturnValue({
      passed: true,
      blockedReason: undefined,
      ruleName: undefined,
    }),
    checkRisk: vi.fn().mockResolvedValue({
      risk_level: 'MEDIUM',
      risk_score: 41,
      honeypot: false,
      buy_tax: 2,
      sell_tax: 4,
      owner: '0xowner',
      ownership_renounced: false,
      can_mint: true,
      can_burn: false,
      holder_concentration: 45,
      dex_liquidity: 150000,
    }),
    executeTrade: vi.fn().mockResolvedValue({
      success: true,
      txHash: '0xtx',
      amountIn: '1000000',
      amountOut: '999000',
      rate: 0.999,
    }),
    commitAttestation: vi.fn().mockResolvedValue({
      attestationId: 'att-1',
      commitTxHash: '0xcommit',
    }),
  };
}

function makePayloads() {
  return {
    marketData: {
      walletAddress: WALLET_ADDRESS,
      chain: 'bsc',
      tokenAddress: '0xtoken',
    },
    signalAnalysis: {
      walletAddress: WALLET_ADDRESS,
      news: [
        {
          title: 'Fed softens tone',
          url: 'https://example.com/news',
          excerpt: 'Risk assets rally on softer macro data.',
          source: 'Example News',
        },
      ],
      currentPositions: [{ tokenSymbol: 'USDC', balance: 100 }],
      portfolioValueUsd: 500,
      allowedCurrencies: ['ETH', 'BTC'],
      walletBalances: [{ symbol: 'USDC', formatted: '100', valueUsd: 100 }],
      customPrompt: null,
    },
    guardrailCheck: {
      walletAddress: WALLET_ADDRESS,
      signal: {
        currency: 'ETH',
        direction: 'buy',
        confidence: 82,
        reasoning: 'Breakout continuation',
      },
      config: {
        maxTradeSizePct: 25,
        maxAllocationPct: 40,
        stopLossPct: 10,
        dailyTradeLimit: 5,
        allowedCurrencies: ['ETH'],
        blockedCurrencies: [],
      },
      positions: [{ tokenSymbol: 'USDC', balance: 100, avgEntryRate: 1 }],
      portfolioValueUsd: 1000,
      tradesToday: 0,
      tradeAmountUsd: 100,
    },
    riskCheck: {
      walletAddress: WALLET_ADDRESS,
      chain: 'bsc',
      tokenAddress: '0xtoken',
    },
    executeTrade: {
      walletAddress: WALLET_ADDRESS,
      serverWalletId: 'wallet-1',
      serverWalletAddress: '0xserver',
      currency: 'ETH',
      direction: 'buy',
      amountUsd: 100,
      chain: 'bsc',
      inTokenAddress: '0xin',
      outTokenAddress: '0xout',
      slippageBps: '100',
    },
    commitAttestation: {
      walletAddress: WALLET_ADDRESS,
      agentType: 'fx',
      runId: 'run-1',
      agentId: '42',
    },
  } as const;
}

async function buildApp(options: {
  bridgeSecret?: string | null;
  deps?: ReturnType<typeof makeDeps>;
} = {}) {
  const app = Fastify();
  await app.register(n8nBridgeRoutes, {
    prefix: '/api/n8n',
    bridgeSecret:
      options.bridgeSecret === undefined ? BRIDGE_SECRET : options.bridgeSecret,
    deps: options.deps ?? makeDeps(),
  });
  await app.ready();
  return app;
}

describe('n8nBridgeRoutes', () => {
  it('returns 200 with typed responses for all bridge endpoints', async () => {
    const deps = makeDeps();
    const app = await buildApp({ deps });
    const payloads = makePayloads();

    await expect(
      app.inject({
        method: 'POST',
        url: '/api/n8n/market-data',
        headers: makeHeaders(),
        payload: payloads.marketData,
      }).then((res) => res.json()),
    ).resolves.toEqual({
      walletAddress: WALLET_ADDRESS,
      chain: 'bsc',
      tokenAddress: '0xtoken',
      marketData: {
        symbol: 'USDC',
        name: 'USD Coin',
        priceUsd: 1,
        priceChange24hPct: 0.25,
        marketCap: 1000000,
        volume24h: 250000,
        holderCount: 1234,
      },
      kline: [{ time: 1, open: 1, high: 1.1, low: 0.9, close: 1.05, volume: 1000 }],
      riskSummary: {
        riskLevel: 'LOW',
        riskScore: 5,
        honeypot: false,
        buyTax: 0,
        sellTax: 0,
        owner: '0xowner',
        ownershipRenounced: true,
        canMint: false,
        canBurn: true,
        holderConcentration: 12,
        dexLiquidity: 500000,
      },
    });

    await expect(
      app.inject({
        method: 'POST',
        url: '/api/n8n/signal-analysis',
        headers: makeHeaders(),
        payload: payloads.signalAnalysis,
      }).then((res) => res.json()),
    ).resolves.toEqual({
      walletAddress: WALLET_ADDRESS,
      signals: [
        {
          currency: 'ETH',
          direction: 'buy',
          confidence: 81,
          allocationPct: 25,
          reasoning: 'Momentum breakout',
          timeHorizon: 'short',
        },
      ],
      marketSummary: 'Constructive market backdrop',
      sourcesUsed: 2,
    });

    await expect(
      app.inject({
        method: 'POST',
        url: '/api/n8n/guardrail-check',
        headers: makeHeaders(),
        payload: payloads.guardrailCheck,
      }).then((res) => res.json()),
    ).resolves.toEqual({
      walletAddress: WALLET_ADDRESS,
      passed: true,
    });

    await expect(
      app.inject({
        method: 'POST',
        url: '/api/n8n/risk-check',
        headers: makeHeaders(),
        payload: payloads.riskCheck,
      }).then((res) => res.json()),
    ).resolves.toEqual({
      walletAddress: WALLET_ADDRESS,
      chain: 'bsc',
      tokenAddress: '0xtoken',
      riskSummary: {
        riskLevel: 'MEDIUM',
        riskScore: 41,
        honeypot: false,
        buyTax: 2,
        sellTax: 4,
        owner: '0xowner',
        ownershipRenounced: false,
        canMint: true,
        canBurn: false,
        holderConcentration: 45,
        dexLiquidity: 150000,
      },
      flags: ['mintable', 'owner_controls_contract'],
    });

    await expect(
      app.inject({
        method: 'POST',
        url: '/api/n8n/execute-trade',
        headers: makeHeaders(),
        payload: payloads.executeTrade,
      }).then((res) => res.json()),
    ).resolves.toEqual({
      walletAddress: WALLET_ADDRESS,
      success: true,
      txHash: '0xtx',
      amountIn: '1000000',
      amountOut: '999000',
      rate: 0.999,
    });

    await expect(
      app.inject({
        method: 'POST',
        url: '/api/n8n/commit-attestation',
        headers: makeHeaders(),
        payload: payloads.commitAttestation,
      }).then((res) => res.json()),
    ).resolves.toEqual({
      walletAddress: WALLET_ADDRESS,
      attestationId: 'att-1',
      commitTxHash: '0xcommit',
    });

    await app.close();
  });

  it('returns 401 when the API key header is missing for every endpoint', async () => {
    const deps = makeDeps();
    const app = await buildApp({ deps });
    const payloads = makePayloads();

    const requests = [
      ['/api/n8n/market-data', payloads.marketData],
      ['/api/n8n/signal-analysis', payloads.signalAnalysis],
      ['/api/n8n/guardrail-check', payloads.guardrailCheck],
      ['/api/n8n/risk-check', payloads.riskCheck],
      ['/api/n8n/execute-trade', payloads.executeTrade],
      ['/api/n8n/commit-attestation', payloads.commitAttestation],
    ] as const;

    for (const [url, payload] of requests) {
      const res = await app.inject({ method: 'POST', url, payload });
      expect(res.statusCode).toBe(401);
    }

    expect(deps.getMarketData).not.toHaveBeenCalled();
    expect(deps.analyzeSignals).not.toHaveBeenCalled();
    expect(deps.checkGuardrails).not.toHaveBeenCalled();
    expect(deps.checkRisk).not.toHaveBeenCalled();
    expect(deps.executeTrade).not.toHaveBeenCalled();
    expect(deps.commitAttestation).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns 401 when the API key is wrong for every endpoint', async () => {
    const deps = makeDeps();
    const app = await buildApp({ deps });
    const payloads = makePayloads();
    const headers = { 'x-n8n-api-key': 'wrong-key' };

    const requests = [
      ['/api/n8n/market-data', payloads.marketData],
      ['/api/n8n/signal-analysis', payloads.signalAnalysis],
      ['/api/n8n/guardrail-check', payloads.guardrailCheck],
      ['/api/n8n/risk-check', payloads.riskCheck],
      ['/api/n8n/execute-trade', payloads.executeTrade],
      ['/api/n8n/commit-attestation', payloads.commitAttestation],
    ] as const;

    for (const [url, payload] of requests) {
      const res = await app.inject({ method: 'POST', url, headers, payload });
      expect(res.statusCode).toBe(401);
    }

    expect(deps.getMarketData).not.toHaveBeenCalled();
    expect(deps.analyzeSignals).not.toHaveBeenCalled();
    expect(deps.checkGuardrails).not.toHaveBeenCalled();
    expect(deps.checkRisk).not.toHaveBeenCalled();
    expect(deps.executeTrade).not.toHaveBeenCalled();
    expect(deps.commitAttestation).not.toHaveBeenCalled();

    await app.close();
  });

  it('forwards execute-trade parameters without modification', async () => {
    const deps = makeDeps();
    const app = await buildApp({ deps });
    const payload = makePayloads().executeTrade;

    const res = await app.inject({
      method: 'POST',
      url: '/api/n8n/execute-trade',
      headers: makeHeaders(),
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(deps.executeTrade).toHaveBeenCalledWith({
      serverWalletId: payload.serverWalletId,
      serverWalletAddress: payload.serverWalletAddress,
      currency: payload.currency,
      direction: payload.direction,
      amountUsd: payload.amountUsd,
      chain: payload.chain,
      inTokenAddress: payload.inTokenAddress,
      outTokenAddress: payload.outTokenAddress,
      slippageBps: payload.slippageBps,
    });

    await app.close();
  });

  it('returns 503 for all endpoints when the bridge secret is missing', async () => {
    const app = await buildApp({ bridgeSecret: null });
    const payloads = makePayloads();

    const requests = [
      ['/api/n8n/market-data', payloads.marketData],
      ['/api/n8n/signal-analysis', payloads.signalAnalysis],
      ['/api/n8n/guardrail-check', payloads.guardrailCheck],
      ['/api/n8n/risk-check', payloads.riskCheck],
      ['/api/n8n/execute-trade', payloads.executeTrade],
      ['/api/n8n/commit-attestation', payloads.commitAttestation],
    ] as const;

    for (const [url, payload] of requests) {
      const res = await app.inject({ method: 'POST', url, payload });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toEqual({
        error: 'n8n bridge is disabled: N8N_BRIDGE_API_KEY_SECRET is not configured',
      });
    }

    await app.close();
  });
});
