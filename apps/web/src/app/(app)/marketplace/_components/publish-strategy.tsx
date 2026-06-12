'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Loader2, AlertCircle, CheckCircle2, ShieldCheck,
} from 'lucide-react';

type EligibilityResult = {
  eligible: boolean;
  issues: string[];
  attestationCount?: number;
  firstRunAt?: string;
  lastRunAt?: string;
  roiPct?: number;
};

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PublishStrategy() {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [rentalPrice, setRentalPrice] = React.useState('0');
  const [agentType, setAgentType] = React.useState('fx');
  const [published, setPublished] = React.useState(false);
  const [publishErrors, setPublishErrors] = React.useState<string[]>([]);

  const { data: eligibility, isLoading: eligLoading } = useQuery({
    queryKey: ['eligibility', agentType],
    queryFn: () =>
      api.post<EligibilityResult>('/api/marketplace/strategies/eligibility-check', {
        agent_type: agentType,
      }).catch(() =>
        api.get<EligibilityResult>(`/api/marketplace/eligibility?agent_type=${agentType}`),
      ),
    enabled: true,
    staleTime: 30_000,
    retry: false,
  });

  const publishMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      rental_price: number;
      agent_type: string;
      workflow_json: Record<string, unknown>;
    }) => api.post('/api/marketplace/strategies', payload),
    onSuccess: () => {
      setPublished(true);
      setPublishErrors([]);
    },
    onError: async (err) => {
      const body = (err as { body?: { issues?: string[] } })?.body;
      if (body?.issues) {
        setPublishErrors(body.issues);
      } else {
        setPublishErrors([(err as Error)?.message ?? 'Publish failed']);
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPublishErrors([]);
    if (!title.trim()) return;
    publishMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      rental_price: parseFloat(rentalPrice) || 0,
      agent_type: agentType,
      workflow_json: { name: title.trim(), nodes: [], connections: {} },
    });
  }

  if (published) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <h1 className="font-vt323 text-2xl uppercase text-gb-deep">Strategy Published!</h1>
        <p className="text-sm text-gb-dark/60">Your strategy is now live on the marketplace.</p>
        <Link
          href="/marketplace"
          className="rounded bg-gb-deep px-4 py-2 font-vt323 text-sm uppercase text-gb-light hover:opacity-80"
        >
          View Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/marketplace" className="text-xs text-gb-dark/50 hover:underline">
          ← Marketplace
        </Link>
        <h1 className="mt-1 font-vt323 text-2xl uppercase tracking-wider text-gb-deep">
          Publish Your Strategy
        </h1>
        <p className="text-sm text-gb-dark/60">
          Share your verified trading strategy with other agents.
        </p>
      </div>

      {/* Eligibility panel */}
      <div className="rounded-lg border-2 border-gb-deep/20 bg-gb-mid/10 p-4">
        <h2 className="font-vt323 text-lg uppercase tracking-wider text-gb-deep mb-2">
          Eligibility Check
        </h2>
        {eligLoading && (
          <div className="flex items-center gap-2 text-gb-dark/60 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking eligibility…
          </div>
        )}
        {eligibility && (
          <div className="flex flex-col gap-2">
            {eligibility.eligible ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">Eligible to publish</span>
                <span className="text-gb-dark/50">
                  — {eligibility.attestationCount} attested runs,{' '}
                  {formatDate(eligibility.firstRunAt)} to {formatDate(eligibility.lastRunAt)},
                  est. ROI: {eligibility.roiPct?.toFixed(1) ?? '0'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Not yet eligible</span>
                </div>
                {eligibility.issues.map((issue, i) => (
                  <p key={i} className="text-xs text-red-500 pl-6">• {issue}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publish form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gb-dark/70 uppercase tracking-wider">
            Agent Type
          </label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="rounded border border-gb-deep/20 bg-gb-light px-3 py-2 text-sm text-gb-dark focus:outline-none focus:ring-1 focus:ring-gb-deep"
          >
            <option value="fx">FX Agent</option>
            <option value="yield">Yield Agent</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gb-dark/70 uppercase tracking-wider">
            Strategy Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. MNT Momentum Bull Run"
            required
            className="rounded border border-gb-deep/20 bg-gb-light px-3 py-2 text-sm text-gb-dark placeholder:text-gb-dark/40 focus:outline-none focus:ring-1 focus:ring-gb-deep"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gb-dark/70 uppercase tracking-wider">
            Description <span className="text-gb-dark/40">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe your strategy's approach and conditions…"
            className="resize-none rounded border border-gb-deep/20 bg-gb-light px-3 py-2 text-sm text-gb-dark placeholder:text-gb-dark/40 focus:outline-none focus:ring-1 focus:ring-gb-deep"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gb-dark/70 uppercase tracking-wider">
            Rental Price (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={rentalPrice}
            onChange={(e) => setRentalPrice(e.target.value)}
            className="rounded border border-gb-deep/20 bg-gb-light px-3 py-2 text-sm text-gb-dark focus:outline-none focus:ring-1 focus:ring-gb-deep"
          />
        </div>

        {publishErrors.length > 0 && (
          <div className="flex flex-col gap-1 rounded bg-red-50 px-3 py-2">
            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">
              Cannot publish
            </p>
            {publishErrors.map((issue, i) => (
              <p key={i} className="text-xs text-red-500">• {issue}</p>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={publishMutation.isPending || !eligibility?.eligible || !title.trim()}
          className="flex items-center justify-center gap-2 self-start rounded bg-gb-deep px-5 py-2 font-vt323 text-sm uppercase text-gb-light transition-opacity disabled:opacity-40"
        >
          {publishMutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Publishing…</>
          ) : (
            'Publish to Marketplace'
          )}
        </button>
      </form>
    </div>
  );
}
