'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FundWalletGuideProps {
  funded: boolean;
  balance: string | null;
  faucetUrl: string | null;
  isChecking: boolean;
  onRecheck: () => void;
}

export function FundWalletGuide({
  funded,
  balance,
  faucetUrl,
  isChecking,
  onRecheck,
}: FundWalletGuideProps) {
  if (funded) return null;

  return (
    <div className="w-full border-4 border-amber-600 bg-amber-100 p-4 text-gb-deep shadow-[4px_4px_0px_var(--color-gb-deep)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-press-start-2p text-xs uppercase">Fund Wallet</p>
          <p className="mt-2 font-vt323 text-xl uppercase leading-none">
            Current MNT balance: {balance ?? 'Checking...'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {faucetUrl ? (
            <Button asChild variant="outline" className="rounded-none border-2 border-gb-deep">
              <a href={faucetUrl} target="_blank" rel="noopener noreferrer">
                Faucet
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onRecheck}
            disabled={isChecking}
            className="rounded-none border-2 border-gb-deep"
          >
            <RefreshCw className={isChecking ? 'size-4 animate-spin' : 'size-4'} />
            Recheck balance
          </Button>
        </div>
      </div>
    </div>
  );
}
