'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Loader2, AlertCircle, ShieldCheck, TrendingUp, ExternalLink, CheckCircle2,
} from 'lucide-react';

type AttestationLink = {
  id: string;
  runId: string;
  agentType: string;
  createdAt: string;
  commitTxHash: string | null;
  explorerUrl: string | null;
};

type StrategyDetailData = {
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
  attestations: AttestationLink[];
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatWallet(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

interface StrategyDetailProps {
  id: string;
}

export function StrategyDetail({ id }: StrategyDetailProps) {
  const [rented, setRented] = React.useState(false);
  const [rentError, setRentError] = React.useState<string | null>(null);

  const { data: strategy, isLoading, error } = useQuery({
    queryKey: ['marketplace-strategy', id],
    queryFn: () => api.get<StrategyDetailData>(`/api/marketplace/strategies/${id}`),
    staleTime: 60_000,
  });

  const rentMutation = useMutation({
    mutationFn: () => api.post(`/api/marketplace/strategies/${id}/rent`, {}),
    onSuccess: () => setRented(true),
    onError: (err) => setRentError((err as Error)?.message ?? 'Rent failed'),
  });

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center gap-3 text-gb-dark/60">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-vt323 text-lg uppercase">Loading strategy…</span>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-3 text-red-500">
        <AlertCircle className="h-8 w-8" />
        <p className="font-vt323 text-lg uppercase">Strategy not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <Link
            href="/marketplace"
            className="text-xs text-gb-dark/50 hover:underline"
          >
            ← Marketplace
          </Link>
          <h1 className="mt-1 font-vt323 text-2xl uppercase tracking-wider text-gb-deep">
            {strategy.title}
          </h1>
          <p className="text-sm text-gb-dark/60 font-mono">{formatWallet(strategy.ownerWallet)}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          On-chain Verified
        </span>
      </div>

      {/* Disclaimer — above the fold */}
      <div className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Past performance is not indicative of future results. Estimated ROI is based on attested
        trade events and does not represent actual portfolio P&L.
      </div>

      {strategy.description && (
        <p className="text-sm text-gb-dark/80">{strategy.description}</p>
      )}

      {/* Performance metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gb-deep/20 bg-gb-light/60 p-3">
          <p className="text-xs text-gb-dark/50 uppercase tracking-wider">Est. ROI</p>
          <p className="font-vt323 text-xl text-gb-deep">
            <TrendingUp className="inline h-4 w-4 mr-1" />
            {strategy.roiPct.toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg border border-gb-deep/20 bg-gb-light/60 p-3">
          <p className="text-xs text-gb-dark/50 uppercase tracking-wider">Attested Runs</p>
          <p className="font-vt323 text-xl text-gb-deep">{strategy.attestationCount}</p>
        </div>
        <div className="rounded-lg border border-gb-deep/20 bg-gb-light/60 p-3">
          <p className="text-xs text-gb-dark/50 uppercase tracking-wider">Period Start</p>
          <p className="font-vt323 text-base text-gb-deep">{formatDate(strategy.periodStart)}</p>
        </div>
        <div className="rounded-lg border border-gb-deep/20 bg-gb-light/60 p-3">
          <p className="text-xs text-gb-dark/50 uppercase tracking-wider">Period End</p>
          <p className="font-vt323 text-base text-gb-deep">{formatDate(strategy.periodEnd)}</p>
        </div>
      </div>

      {/* Rent button */}
      {rented ? (
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Strategy cloned to your canvas!
          </div>
          <Link
            href="/orchestration"
            className="rounded bg-gb-deep px-4 py-2 font-vt323 text-sm uppercase text-gb-light transition-opacity hover:opacity-80"
          >
            Open Orchestration Canvas
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rentError && (
            <div className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {rentError}
            </div>
          )}
          <button
            onClick={() => { setRentError(null); rentMutation.mutate(); }}
            disabled={rentMutation.isPending}
            className="flex items-center gap-2 self-start rounded bg-gb-deep px-4 py-2 font-vt323 text-sm uppercase text-gb-light transition-opacity disabled:opacity-50"
          >
            {rentMutation.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Renting…</>
            ) : (
              `Rent Strategy${strategy.rentalPrice > 0 ? ` — $${strategy.rentalPrice}` : ' (Free)'}`
            )}
          </button>
        </div>
      )}

      {/* Attestation links */}
      {strategy.attestations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-vt323 text-lg uppercase tracking-wider text-gb-deep">
            On-chain Run History ({strategy.attestations.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-gb-deep/20">
            <table className="w-full text-xs">
              <thead className="bg-gb-mid/20">
                <tr>
                  <th className="px-3 py-2 text-left text-gb-dark/60 font-medium uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-gb-dark/60 font-medium uppercase tracking-wider">
                    Run ID
                  </th>
                  <th className="px-3 py-2 text-left text-gb-dark/60 font-medium uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-gb-dark/60 font-medium uppercase tracking-wider">
                    Attestation
                  </th>
                </tr>
              </thead>
              <tbody>
                {strategy.attestations.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? 'bg-gb-light/30' : ''}>
                    <td className="px-3 py-2 text-gb-dark/70">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-gb-dark/70">
                      {a.runId.slice(0, 12)}…
                    </td>
                    <td className="px-3 py-2 text-gb-dark/70">{a.agentType}</td>
                    <td className="px-3 py-2">
                      {a.explorerUrl ? (
                        <a
                          href={a.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-gb-deep hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Explorer
                        </a>
                      ) : (
                        <span className="text-gb-dark/40">not yet on-chain</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
