'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import type { WatchlistItem } from '@/hooks/use-watchlist';
import { WatchlistPanel } from './watchlist-panel';
import { AlertFeed } from './alert-feed';
import { AddTokenDialog } from './add-token-dialog';
import { AlertConfigDialog } from './alert-config-dialog';

export function MonitorContent() {
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [alertConfigOpen, setAlertConfigOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<WatchlistItem | null>(null);

  function handleSetAlert(item: WatchlistItem) {
    setSelectedToken(item);
    setAlertConfigOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Eye className="size-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Token Monitor</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Track token prices, risk scores, and set alerts — powered by AVE Data
        </p>
      </div>

      <WatchlistPanel onAddToken={() => setAddTokenOpen(true)} onSetAlert={handleSetAlert} />
      <AlertFeed />

      <AddTokenDialog open={addTokenOpen} onOpenChange={setAddTokenOpen} />
      <AlertConfigDialog
        open={alertConfigOpen}
        onOpenChange={setAlertConfigOpen}
        token={
          selectedToken
            ? {
                chain: selectedToken.chain,
                token_address: selectedToken.token_address,
                token_symbol: selectedToken.token_symbol,
                current_price: selectedToken.current_price,
              }
            : null
        }
      />
    </div>
  );
}
