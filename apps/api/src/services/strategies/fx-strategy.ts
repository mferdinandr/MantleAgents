import type { FailureCategory, GuardrailCheck } from '@mantleagents/shared';
import { DEFAULT_GUARDRAILS } from '@mantleagents/shared';
import { getMantleUsdc, getMantleUsdt, getMantleWmnt, getMantleTokenBySymbol } from '../../lib/chains.js';
import { fetchFxNews } from '../news-fetcher.js';
import { analyzeFxNews } from '../llm-analyzer.js';
import { executeTrade } from '../trade-executor.js';
import { checkGuardrails, calculateTradeAmount } from '../rules-engine.js';
import type {
  AgentStrategy,
  AgentConfigRow,
  StrategyContext,
  StrategyAnalysisResult,
  ExecutionResult,
  WalletContext,
  GuardrailContext,
} from './types.js';

// Tokens actually deployed on Mantle DEX — only these can be traded
const MANTLE_FX_TOKENS = ['USDC', 'USDT', 'WMNT'] as const;

function resolveMantleFxCurrencies(rawAllowed: string[]): string[] {
  if (rawAllowed.length === 0 || rawAllowed.includes('ALL')) return [...MANTLE_FX_TOKENS];
  // Filter to only tokens that exist on Mantle DEX
  return rawAllowed.filter(t => MANTLE_FX_TOKENS.includes(t as any));
}

interface FxSignal {
  currency: string;
  direction: 'buy' | 'sell' | 'hold';
  confidence: number;
  allocationPct?: number;
  reasoning: string;
  timeHorizon: string;
}

interface FxData {
  news: Array<{ title: string; url: string; excerpt: string; source?: string }>;
  currencies: string[];
}

export class FxStrategy implements AgentStrategy {
  type = 'fx' as const;

  async fetchData(config: AgentConfigRow, _context: StrategyContext): Promise<FxData> {
    const rawAllowed = (config.allowed_currencies ?? []) as string[];
    const currencies = resolveMantleFxCurrencies(rawAllowed);
    const news = await fetchFxNews(currencies);
    return { news, currencies };
  }

  async analyze(
    data: unknown,
    config: AgentConfigRow,
    context: StrategyContext,
  ): Promise<StrategyAnalysisResult> {
    const { news, currencies } = data as FxData;


    const rawAllowed = (config.allowed_currencies ?? []) as string[];
    const allowedCurrencies = resolveMantleFxCurrencies(rawAllowed);

    const result = await analyzeFxNews({
      news,
      currentPositions: context.positions.map((p: any) => ({
        tokenSymbol: p.token_symbol ?? p.tokenSymbol,
        balance: p.balance,
      })),
      portfolioValueUsd: context.portfolioValueUsd,
      allowedCurrencies,
      walletBalances: context.walletBalances
        .filter(b => b.balance > 0n)
        .map(b => ({ symbol: b.symbol, formatted: b.formatted, valueUsd: b.valueUsd })),
      customPrompt: config.custom_prompt,
    });

    return {
      signals: result.signals,
      summary: result.marketSummary,
      sourcesUsed: result.sourcesUsed,
    };
  }

  async executeSignal(
    signal: unknown,
    wallet: WalletContext,
    config: AgentConfigRow,
  ): Promise<ExecutionResult> {
    const s = signal as FxSignal & { amountUsd: number };

    const tokenConfig = getMantleTokenBySymbol(s.currency);
    if (!tokenConfig) {
      return { success: false, amountUsd: 0, error: `Token ${s.currency} not available on Mantle DEX` };
    }

    // For buy: swap USDT → token; for sell: swap token → USDT
    const usdtConfig = getMantleUsdt();
    const inTokenAddress = s.direction === 'buy' ? usdtConfig.address : tokenConfig.address;
    const outTokenAddress = s.direction === 'buy' ? tokenConfig.address : usdtConfig.address;

    const result = await executeTrade({
      serverWalletId: wallet.serverWalletId,
      serverWalletAddress: wallet.serverWalletAddress,
      currency: s.currency,
      direction: s.direction as 'buy' | 'sell',
      amountUsd: s.amountUsd,
      inTokenAddress,
      outTokenAddress,
    });

    if (!result.success) {
      return {
        success: false,
        amountUsd: s.amountUsd,
        error: result.reason,
        failureCategory: result.failureCategory as FailureCategory,
      };
    }

    return { success: true, txHash: result.txHash, amountUsd: s.amountUsd };
  }

  checkGuardrails(
    signal: unknown,
    config: AgentConfigRow,
    context: GuardrailContext,
  ): GuardrailCheck {
    const s = signal as FxSignal & { amountUsd: number };

    const rawAllowed = (config.allowed_currencies ?? []) as string[];
    const allowedCurrencies = resolveMantleFxCurrencies(rawAllowed);

    const defaults = DEFAULT_GUARDRAILS.moderate;
    return checkGuardrails({
      signal: { currency: s.currency, direction: s.direction as 'buy' | 'sell', confidence: s.confidence, reasoning: s.reasoning },
      config: {
        maxTradeSizePct: config.max_trade_size_pct ?? defaults.maxTradeSizePct,
        maxAllocationPct: config.max_allocation_pct ?? defaults.maxAllocationPct,
        stopLossPct: config.stop_loss_pct ?? defaults.stopLossPct,
        dailyTradeLimit: config.daily_trade_limit ?? defaults.dailyTradeLimit,
        allowedCurrencies,
        blockedCurrencies: (config.blocked_currencies ?? []) as string[],
        availableBuyingPowerUsd: context.availableBuyingPowerUsd,
      },
      positions: context.positions.map((p: any) => ({
        tokenSymbol: p.token_symbol ?? p.tokenSymbol,
        balance: p.balance,
        avgEntryRate: p.avg_entry_rate ?? p.avgEntryRate ?? 0,
      })),
      portfolioValueUsd: context.portfolioValueUsd,
      tradesToday: context.dailyTradeCount,
      tradeAmountUsd: s.amountUsd,
      positionPrices: context.positionPrices,
      availableBuyingPowerUsd: context.availableBuyingPowerUsd,
    });
  }

  getProgressSteps(): string[] {
    return ['fetching_news', 'analyzing', 'checking_signals', 'executing_trades'];
  }
}
