'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Percent,
  PieChart,
  Vault,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  useYieldAgentStatus,
  useYieldPositions,
  useYieldOpportunities,
} from '@/hooks/use-yield-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { TokenLogo } from '@/components/token-logo';
import { formatUsd, formatTokenAmount } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { SendModal } from '@/app/(app)/dashboard/_components/send-modal';
import { ReceiveModal } from '@/app/(app)/dashboard/_components/receive-modal';
import { getProtocolLogo } from './utils';

const DUST_THRESHOLD = 0.000001;
const isLpToken = (symbol: string) =>
  /VAULT|LP|UNIV3/i.test(symbol);

export function YieldPortfolioGuardrailsCard() {
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolio('yield');
  const { data: agent, isLoading: isAgentLoading } = useYieldAgentStatus();
  const { data: positionsData } = useYieldPositions();
  const { data: opportunitiesData } = useYieldOpportunities();

  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const config = agent?.config;
  const strategy = config?.strategyParams;
  const holdings = portfolio?.holdings ?? [];
  const serverWalletAddress = config?.serverWalletAddress ?? '';

  // Wallet Balances: liquid tokens only (exclude LP), filter dust
  const walletBalances = useMemo(() => {
    return holdings
      .filter(
        (h) =>
          !isLpToken(h.tokenSymbol) &&
          h.balance >= DUST_THRESHOLD
      )
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [holdings]);

  // Vault Positions: from yield_positions + opportunities for human-readable names
  const vaultPositions = useMemo(() => {
    const positions = positionsData?.positions ?? [];
    const opportunities = opportunitiesData?.opportunities ?? [];
    const oppByVault = new Map(
      opportunities.map((o) => [(o.vaultAddress ?? o.id ?? '').toLowerCase(), o])
    );
    return positions.map((pos) => {
      const opp = oppByVault.get((pos.vaultAddress ?? '').toLowerCase());
      return {
        ...pos,
        vaultName: opp?.name ?? pos.depositToken,
        protocol: pos.protocol,
      };
    });
  }, [positionsData?.positions, opportunitiesData?.opportunities]);

  // Total balance calculation
  const walletTotal = walletBalances.reduce((s, h) => s + (h.valueUsd || 0), 0);
  const vaultsTotal = vaultPositions.reduce((s, p) => s + Number(p.depositAmountUsd ?? 0), 0);
  const grandTotal = walletTotal + vaultsTotal;

  // Guardrails Data
  const minApr = strategy?.minAprThreshold ?? 5;
  const maxAlloc = strategy?.maxSingleVaultPct ?? 40;
  const maxVaults = strategy?.maxVaultCount ?? 5;

  const isLoading = isPortfolioLoading || isAgentLoading;

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-xl" />;
  }

  return (
    <>
      <Card className="flex flex-col border-gb-deep bg-gb-deep p-5 shadow-[4px_4px_0px_var(--color-gb-deep)]">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gb-light">Portfolio & Guardrails</h3>
           <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSendOpen(true)}
            >
                <ArrowUpRight className="size-3.5" />
                Send
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setReceiveOpen(true)}
            >
                <ArrowDownLeft className="size-3.5" />
                Receive
            </Button>
          </div>
        </div>

        {/* Total Portfolio Balance */}
        <div className="mb-4 rounded-none border-2 border-gb-dark bg-gb-dark/30 p-4">
          <div className="mb-1 text-xs font-medium uppercase text-gb-mid">Total Portfolio Balance</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-gb-light">
            {formatUsd(grandTotal)}
          </div>
          <div className="mt-1.5 flex gap-4 text-xs text-gb-mid">
            <span>Wallet: <span className="text-gb-light font-mono">{formatUsd(walletTotal)}</span></span>
            <span>In Vaults: <span className="text-gb-light font-mono">{formatUsd(vaultsTotal)}</span></span>
          </div>
        </div>

        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4">
            {/* Vault Positions */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Vault className="size-4 text-gb-mid" />
                <Label className="text-sm font-medium text-gb-mid">
                  Vault Positions
                </Label>
              </div>
              {vaultPositions.length === 0 ? (
                <p className="text-sm text-gb-mid italic pl-1">
                  No active vault positions
                </p>
              ) : (
                <div className="space-y-2">
                  {vaultPositions.map((pos) => {
                    const logo = getProtocolLogo(pos.protocol);
                    const depositUsd = Number(pos.depositAmountUsd ?? 0);
                    const apr = pos.currentApr ?? null;
                    return (
                      <div
                        key={pos.id}
                        className="flex items-center justify-between rounded-none border-2 border-gb-dark bg-gb-dark/30 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {logo ? (
                            <img
                              src={logo}
                              alt={pos.protocol}
                              className="size-7 shrink-0 rounded-full object-contain bg-gb-light p-0.5"
                            />
                          ) : (
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gb-dark text-xs font-medium text-gb-light">
                              {pos.protocol.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gb-light">
                              {pos.vaultName}
                            </p>
                            <p className="text-xs text-gb-mid capitalize">
                              {pos.protocol}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {depositUsd > 0 && (
                            <p className="text-sm font-mono font-medium text-gb-light">
                              {formatUsd(depositUsd)}
                            </p>
                          )}
                          {apr != null && (
                            <p className="text-xs font-medium text-gb-accent">
                              {Number(apr).toFixed(1)}% APR
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator className="bg-border/50" />

            {/* Wallet Balances */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="size-4 text-gb-mid" />
                <Label className="text-sm font-medium text-gb-mid">
                  Wallet Balances
                </Label>
              </div>
              {walletBalances.length === 0 ? (
                <p className="text-sm text-gb-mid italic pl-1">
                  No liquid balance in wallet
                </p>
              ) : (
                <div className="space-y-2">
                  {walletBalances.map((holding) => (
                    <div
                      key={holding.tokenAddress || holding.tokenSymbol}
                      className="flex items-center justify-between py-0.5 px-1"
                    >
                      <div className="flex items-center gap-2">
                        <TokenLogo symbol={holding.tokenSymbol} size={20} />
                        <span className="text-sm font-medium text-gb-light">
                          {holding.tokenSymbol}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-medium text-gb-light">
                          {formatTokenAmount(holding.balance)}
                        </div>
                        {Number.isFinite(holding.valueUsd) && holding.valueUsd > 0 && (
                          <div className="text-xs text-gb-mid">
                            {formatUsd(holding.valueUsd)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="guardrails">
            <div className="rounded-none border-2 border-gb-dark bg-gb-dark/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gb-mid">Active Guardrails</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-500">
                      <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active
                  </span>
              </div>

              <div className="space-y-4">
                  {/* Min APR */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-gb-light">
                              <Percent className="size-3.5 text-gb-accent" />
                              <span>Min APR Threshold</span>
                          </div>
                          <span className="text-gb-mid">{minApr}%</span>
                      </div>
                      <Progress value={minApr * 2} className="h-1.5 bg-gb-dark" />
                  </div>

                  {/* Max Allocation */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-gb-light">
                              <PieChart className="size-3.5 text-gb-accent" />
                              <span>Max Single Vault Alloc</span>
                          </div>
                          <span className="text-gb-mid">{maxAlloc}%</span>
                      </div>
                      <Progress value={maxAlloc} className="h-1.5 bg-gb-dark" />
                  </div>

                  {/* Max Vaults */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-gb-light">
                              <Layers className="size-3.5 text-gb-accent" />
                              <span>Max Vault Count</span>
                          </div>
                          <span className="text-gb-mid">{maxVaults}</span>
                      </div>
                      <Progress value={(maxVaults / 10) * 100} className="h-1.5 bg-gb-dark" />
                  </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <SendModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        holdings={holdings}
        agentType="yield"
      />
      <ReceiveModal
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        walletAddress={serverWalletAddress}
      />
    </>
  );
}
