'use client';

import { Plus, X, Bell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchlist, useRemoveFromWatchlist } from '@/hooks/use-watchlist';
import type { WatchlistItem } from '@/hooks/use-watchlist';
import { RiskBadge } from './risk-badge';

interface WatchlistPanelProps {
  onAddToken: () => void;
  onSetAlert: (item: WatchlistItem) => void;
}

function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function chainLabel(chain: string): string {
  const labels: Record<string, string> = {
    bsc: 'BSC',
    solana: 'SOL',
    eth: 'ETH',
    base: 'BASE',
  };
  return labels[chain] ?? chain.toUpperCase();
}

export function WatchlistPanel({ onAddToken, onSetAlert }: WatchlistPanelProps) {
  const { data: watchlist, isLoading } = useWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
        <CardAction>
          <Button size="sm" className="gap-1.5" onClick={onAddToken}>
            <Plus className="size-4" />
            Add Token
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : !watchlist || watchlist.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No tokens in watchlist. Add a token to start monitoring.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Token</th>
                  <th className="pb-2 text-left font-medium">Chain</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                  <th className="pb-2 text-center font-medium">Risk</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => (
                  <tr key={item.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2.5 font-medium">{item.token_symbol}</td>
                    <td className="py-2.5">
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                        {chainLabel(item.chain)}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatPrice(item.current_price)}
                    </td>
                    <td className="py-2.5 text-center">
                      <RiskBadge riskScore={item.risk_score} />
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => onSetAlert(item)}
                        >
                          <Bell className="size-3.5" />
                          Alert
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMutation.mutate(item.id)}
                          disabled={removeMutation.isPending}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
