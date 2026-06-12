'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Loader2, AlertCircle, ShieldCheck, TrendingUp, Store } from 'lucide-react';

type StrategyListing = {
  id: string;
  ownerWallet: string;
  title: string;
  description: string | null;
  rentalPrice: number;
  attestationCount: number;
  roiPct: number;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
};

function formatWallet(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MarketplaceListing() {
  const { data: listings, isLoading, error } = useQuery({
    queryKey: ['marketplace-strategies'],
    queryFn: () => api.get<StrategyListing[]>('/api/marketplace/strategies'),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center gap-3 text-gb-dark/60">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-vt323 text-lg uppercase">Loading strategies…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-3 text-red-500">
        <AlertCircle className="h-8 w-8" />
        <p className="font-vt323 text-lg uppercase">Failed to load marketplace</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-vt323 text-2xl uppercase tracking-wider text-gb-deep">
            Strategy Marketplace
          </h1>
          <p className="text-sm text-gb-dark/60">
            On-chain verified trading strategies — rent and deploy to your canvas
          </p>
        </div>
        <Link
          href="/marketplace/publish"
          className="rounded border border-gb-deep/30 px-3 py-1.5 font-vt323 text-sm uppercase text-gb-deep transition-colors hover:bg-gb-deep hover:text-gb-light"
        >
          Publish Strategy
        </Link>
      </div>

      {listings?.length === 0 && (
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-gb-deep/20 text-gb-dark/40">
          <Store className="h-8 w-8" />
          <p className="font-vt323 text-xl uppercase">No strategies listed yet</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(listings ?? []).map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-lg border-2 border-gb-deep/20 bg-gb-mid/10 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-vt323 text-lg uppercase leading-tight text-gb-deep line-clamp-2">
                {s.title}
              </h2>
              <span
                title="On-chain verified"
                className="flex shrink-0 items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700"
              >
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            </div>

            <p className="text-xs text-gb-dark/60 font-mono">
              {formatWallet(s.ownerWallet)}
            </p>

            {s.description && (
              <p className="text-sm text-gb-dark/80 line-clamp-2">{s.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-gb-light/60 px-2 py-1.5">
                <p className="text-gb-dark/50 uppercase tracking-wider">Est. ROI</p>
                <p className="font-vt323 text-base text-gb-deep">
                  <TrendingUp className="inline h-3.5 w-3.5 mr-0.5" />
                  {s.roiPct.toFixed(1)}
                </p>
              </div>
              <div className="rounded bg-gb-light/60 px-2 py-1.5">
                <p className="text-gb-dark/50 uppercase tracking-wider">Runs</p>
                <p className="font-vt323 text-base text-gb-deep">{s.attestationCount}</p>
              </div>
            </div>

            <p className="text-xs text-gb-dark/50">
              {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gb-deep">
                {s.rentalPrice > 0 ? `$${s.rentalPrice}` : 'Free'}
              </span>
              <Link
                href={`/marketplace/${s.id}`}
                className="rounded border border-gb-deep/30 px-3 py-1 font-vt323 text-xs uppercase text-gb-deep transition-colors hover:bg-gb-deep hover:text-gb-light"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
