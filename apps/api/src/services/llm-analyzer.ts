import { generateText, Output } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { z } from 'zod';
import type { NewsArticle } from './news-fetcher.js';

function getGeminiProvider() {
  const authType = process.env.GEMINI_CLI_AUTH_TYPE || 'oauth-personal';
  if (authType === 'api-key') {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is required when GEMINI_CLI_AUTH_TYPE=api-key');
    return createGoogleGenerativeAI({ apiKey });
  }
  // oauth-personal: use Gemini CLI OAuth (no API key needed, uses Google account quota)
  return createGeminiProvider({ authType: 'oauth-personal' });
}

function getLlmModel(): string {
  return process.env.LLM_MODEL || 'gemini-2.5-flash';
}

export const SignalSchema = z.object({
  signals: z.array(z.object({
    currency: z.string(),
    direction: z.enum(['buy', 'sell', 'hold']),
    confidence: z.number().min(0).max(100),
    allocationPct: z.number().min(0).max(100),
    reasoning: z.string(),
    timeHorizon: z.enum(['short', 'medium', 'long']),
  })),
  marketSummary: z.string(),
  sourcesUsed: z.number(),
});

export type TradingSignals = z.infer<typeof SignalSchema>;

interface AnalysisParams {
  news: NewsArticle[];
  currentPositions: Array<{ tokenSymbol: string; balance: number }>;
  portfolioValueUsd: number;
  allowedCurrencies: string[];
  walletBalances?: Array<{ symbol: string; formatted: string; valueUsd: number }>;
  customPrompt?: string | null;
}

export async function analyzeFxNews(params: AnalysisParams): Promise<TradingSignals> {
  const { news, currentPositions, portfolioValueUsd, allowedCurrencies, walletBalances, customPrompt } = params;

  try {
    const result = await generateText({
      model: getGeminiProvider()(getLlmModel()),
      output: Output.object({ schema: SignalSchema }),
      system: buildSystemPrompt({ allowedCurrencies, currentPositions, portfolioValueUsd, walletBalances, customPrompt }),
      prompt: buildAnalysisPrompt({ news }),
    });

    if (!result.output) {
      console.error('LLM returned no output');
      return { signals: [], marketSummary: 'Analysis failed: no output from LLM', sourcesUsed: 0 };
    }

    return result.output;
  } catch (err) {
    console.error('LLM analysis failed:', err);
    return { signals: [], marketSummary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`, sourcesUsed: 0 };
  }
}

export function buildSystemPrompt(params: {
  allowedCurrencies: string[];
  currentPositions: Array<{ tokenSymbol: string; balance: number }>;
  portfolioValueUsd: number;
  walletBalances?: Array<{ symbol: string; formatted: string; valueUsd: number }>;
  customPrompt?: string | null;
}): string {
  const { allowedCurrencies, currentPositions, portfolioValueUsd, walletBalances, customPrompt } = params;

  const positionsSummary = currentPositions.length > 0
    ? currentPositions.map(p => `${p.tokenSymbol}: ${p.balance}`).join(', ')
    : 'No positions';

  // Show actual wallet balances so the LLM can size trades correctly
  const balanceLines = walletBalances && walletBalances.length > 0
    ? walletBalances.map(b => `  ${b.symbol}: ${b.formatted} (~$${b.valueUsd.toFixed(2)})`).join('\n')
    : '  Empty wallet';

  // Calculate available buying power from Mantle stablecoins
  const baseStables = ['USDC', 'USDT'];
  const availableUsd = walletBalances
    ? walletBalances.filter(b => baseStables.includes(b.symbol)).reduce((sum, b) => sum + b.valueUsd, 0)
    : portfolioValueUsd;

  return [
    'You are an on-chain trading agent on Mantle blockchain (Mantle Sepolia testnet).',
    'Your base stablecoins are USDC and USDT on Mantle. Buys spend USDT (or USDC).',
    `Your trading universe is limited to these tokens: ${allowedCurrencies.join(', ')}.`,
    'Token roles: USDC and USDT are stablecoins (pegged to USD). WMNT is Wrapped MNT — the native Mantle token, analogous to WETH on Ethereum.',
    'WMNT has real price exposure to Mantle network activity, MNT tokenomics, and broader L2/crypto sentiment.',
    '',
    '## Wallet State',
    `Total portfolio value: $${portfolioValueUsd.toFixed(2)}`,
    `Available buying power (USDT/USDC): $${availableUsd.toFixed(2)}`,
    `On-chain balances:\n${balanceLines}`,
    `Tracked positions: ${positionsSummary}`,
    '',
    '## Strategy',
    'Use macro crypto news and Mantle ecosystem signals to trade WMNT against stablecoins:',
    '- Mantle bullish / risk-on / L2 adoption news → buy WMNT (spend USDT, acquire WMNT)',
    '- Mantle bearish / risk-off / market downturn → sell WMNT back to USDT',
    '- General crypto bullish sentiment benefits WMNT as a L2 native asset',
    '- Stablecoin dominance / fear events → exit WMNT to USDT',
    '',
    '## Rules',
    'Generate trading signals based on the provided news articles.',
    'For each signal:',
    '- currency: must be one of the allowed tokens — WMNT, USDC, or USDT',
    '- confidence: 0-100 (only signals >= 60 will be considered for execution)',
    '- allocationPct: 0-100, what percentage of available buying power to use',
    '- reasoning: must cite specific news articles, market conditions, or data points',
    '- direction: buy (spend USDT to acquire WMNT) or sell (swap WMNT back to USDT)',
    '- timeHorizon: short (hours), medium (days), long (weeks)',
    '',
    '## ALLOCATION GUIDELINES',
    `- Available: $${availableUsd.toFixed(2)} in stablecoins. Sum of allocationPct across all buy signals must not exceed 100%.`,
    '- Scale with conviction: low (60-70) → 10-20%, medium (70-85) → 20-40%, high (85+) → 40-60%.',
    '- For sells: allocationPct is the % of your held WMNT position to sell.',
    '- Prefer small to medium allocations (10-30%) given testnet conditions.',
    '',
    '## CRITICAL CONSTRAINTS',
    '- You can only SELL tokens you actually hold. Check on-chain balances above.',
    '- Do NOT generate sell signals for tokens with zero balance.',
    '- Only generate signals for tokens in your allowed list.',
    '- Primary tradeable asset is WMNT — this is the token you buy/sell against stablecoins.',
    '- If no strong signal exists, return direction: "hold" rather than forcing a trade.',
    customPrompt ? `\nUser instructions: ${customPrompt}` : '',
  ].join('\n');
}

export function buildAnalysisPrompt(params: { news: NewsArticle[] }): string {
  if (params.news.length === 0) {
    return 'No news articles available. Return empty signals array and a brief market summary.';
  }

  const articles = params.news.map((n, i) =>
    `[${i + 1}] ${n.title}\n    Source: ${n.source || n.url}\n    ${n.excerpt}`
  ).join('\n\n');

  return `Analyze these ${params.news.length} news articles and generate WMNT/stablecoin trading signals for Mantle:\n\n${articles}`;
}

/** Dedicated system prompt for overview FX analysis (Mantle stablecoins, no trade execution). */
function buildOverviewSystemPrompt(allowedCurrencies: string[]): string {
  return [
    'You are a macro FX analyst generating market outlook signals for Mantle blockchain FX stablecoin pairs.',
    'These tokens track real-world fiat currencies: USDm=USD, EURm=EUR, GBPm=GBP, JPYm=JPY,',
    'BRLm=BRL, KESm=KES, PHPm=PHP, CHFm=CHF, ZARm=ZAR, AUDm=AUD, CADm=CAD, NGNm=NGN.',
    `Your analysis universe: ${allowedCurrencies.join(', ')}`,
    '',
    '## Task',
    'Generate directional signals (buy/sell/hold vs USD baseline) based on macro FX trends.',
    '- "buy" = this currency is appreciating vs USD (bullish)',
    '- "sell" = this currency is weakening vs USD (bearish)',
    '- "hold" = neutral / insufficient data',
    '- confidence: 0-100 (express your conviction)',
    '- allocationPct: 0-100 (relative weight, not actual capital allocation)',
    '- reasoning: brief macro rationale (use news if available, otherwise general FX knowledge)',
    '- timeHorizon: short/medium/long',
    '',
    'Generate at least 3-5 signals covering different currency regions.',
    'If no news is available, base signals on established macro FX trends and fundamentals.',
  ].join('\n');
}

/** Overview-specific FX analysis: no trade execution, uses Mantle FX stablecoin system prompt. */
export async function analyzeOverviewFx(params: {
  news: NewsArticle[];
  allowedCurrencies: string[];
}): Promise<TradingSignals> {
  const { news, allowedCurrencies } = params;

  const prompt = news.length > 0
    ? buildAnalysisPrompt({ news })
    : `No live news available. Generate FX market outlook signals for ${allowedCurrencies.join(', ')} based on current macro trends and historical patterns.`;

  try {
    const result = await generateText({
      model: getGeminiProvider()(getLlmModel()),
      output: Output.object({ schema: SignalSchema }),
      system: buildOverviewSystemPrompt(allowedCurrencies),
      prompt,
    });

    if (!result.output) {
      return { signals: [], marketSummary: 'Analysis returned no output', sourcesUsed: 0 };
    }

    return result.output;
  } catch (err) {
    console.error('[analyzeOverviewFx] LLM failed:', err);
    return { signals: [], marketSummary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`, sourcesUsed: 0 };
  }
}
