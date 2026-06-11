'use client';

import { Trash2, ArrowUp, ArrowDown, Bell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAlerts, useDeleteAlert } from '@/hooks/use-alerts';

export function AlertFeed() {
  const { data: alerts, isLoading } = useAlerts();
  const deleteMutation = useDeleteAlert();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" />
          Price Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No alerts configured yet.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
                  alert.triggered
                    ? alert.condition === 'above'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                    : 'border-border/50 bg-muted/30',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {alert.condition === 'above' ? (
                    <ArrowUp
                      className={cn(
                        'size-4 shrink-0',
                        alert.triggered ? 'text-emerald-400' : 'text-muted-foreground',
                      )}
                    />
                  ) : (
                    <ArrowDown
                      className={cn(
                        'size-4 shrink-0',
                        alert.triggered ? 'text-red-400' : 'text-muted-foreground',
                      )}
                    />
                  )}

                  <span className={cn('text-sm font-medium', !alert.triggered && 'text-muted-foreground')}>
                    {alert.token_symbol}
                  </span>

                  <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                    {alert.chain.toUpperCase()}
                  </Badge>

                  <span className={cn('text-xs', alert.triggered ? 'text-foreground' : 'text-muted-foreground')}>
                    {alert.condition === 'above' ? '>' : '<'} ${alert.threshold}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.triggered ? (
                    <span className={cn(
                      'text-xs font-medium',
                      alert.condition === 'above' ? 'text-emerald-400' : 'text-red-400',
                    )}>
                      Triggered at ${alert.triggered_price}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Active</span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(alert.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
