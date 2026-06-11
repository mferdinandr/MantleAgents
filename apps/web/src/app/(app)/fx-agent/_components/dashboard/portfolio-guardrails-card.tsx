'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  ShieldAlert,
  ShieldCheck,
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
import { useAgentStatus } from '@/hooks/use-agent';
import { usePortfolio } from '@/hooks/use-portfolio';
import { TokenLogo } from '@/components/token-logo';
import { formatUsd, formatTokenAmount } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { SendModal } from '@/app/(app)/dashboard/_components/send-modal';
import { ReceiveModal } from '@/app/(app)/dashboard/_components/receive-modal';

const DUST_THRESHOLD = 0.000001;

export function PortfolioGuardrailsCard() {
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolio('fx');
  const { data: agent, isLoading: isAgentLoading } = useAgentStatus();

  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const config = agent?.config;
  const holdings = portfolio?.holdings ?? [];
  const totalValue = portfolio?.totalValueUsd ?? 0;
  const serverWalletAddress = config?.serverWalletAddress ?? '';

  const walletBalances = useMemo(() => {
    return [...holdings]
      .filter((h) => h.balance >= DUST_THRESHOLD)
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [holdings]);

  // Guardrails
  const dailyLimit = config?.dailyTradeLimit ?? 5000;
  const maxTradeSizePct = config?.maxTradeSizePct ?? 25;
  const stopLoss = config?.stopLossPct ?? 5;

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

        {/* Total Balance */}
        <div className="mb-4 rounded-none border-2 border-gb-dark bg-gb-dark/30 p-4">
          <div className="mb-1 text-xs font-medium uppercase text-gb-mid">Total Portfolio Balance</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-gb-light">
            {formatUsd(totalValue)}
          </div>
        </div>

        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4">
            {/* Holdings */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="size-4 text-gb-mid" />
                <Label className="text-sm font-medium text-gb-mid">Wallet Balances</Label>
              </div>
              {walletBalances.length === 0 ? (
                <p className="text-sm text-gb-mid italic pl-1">No holdings found</p>
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
                {/* Daily Limit */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gb-light">
                      <ShieldCheck className="size-3.5 text-gb-accent" />
                      <span>Daily Limit</span>
                    </div>
                    <span className="text-gb-mid">{formatUsd(dailyLimit)} USDC</span>
                  </div>
                  <Progress value={0} className="h-1.5 bg-gb-dark" />
                </div>

                {/* Max Trade Size */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gb-light">
                      <Percent className="size-3.5 text-gb-accent" />
                      <span>Max Trade Size</span>
                    </div>
                    <span className="text-gb-mid">{maxTradeSizePct}%</span>
                  </div>
                  <Progress value={maxTradeSizePct * 2} className="h-1.5 bg-gb-dark" />
                </div>

                {/* Stop Loss */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gb-light">
                      <ShieldAlert className="size-3.5 text-red-500" />
                      <span>Stop Loss</span>
                    </div>
                    <span className="text-gb-mid">-{stopLoss}%</span>
                  </div>
                  <Progress value={stopLoss * 5} className="h-1.5 bg-gb-dark [&>div]:bg-red-500" />
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
        agentType="fx"
      />
      <ReceiveModal
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        walletAddress={serverWalletAddress}
      />
    </>
  );
}
