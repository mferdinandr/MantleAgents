'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { WorkflowGenerator } from './workflow-generator';

type ProvisionResponse = {
  workflowId: string | null;
  n8nBaseUrl: string;
  token: string;
  configured: boolean;
};

export function OrchestrationCanvas() {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['n8n-provision'],
    queryFn: () => api.get<ProvisionResponse>('/api/n8n/provision'),
    staleTime: 4 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center gap-3 text-gb-dark/60">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-vt323 text-lg uppercase">Loading Orchestration Canvas…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-red-500">
        <AlertCircle className="h-8 w-8" />
        <p className="font-vt323 text-lg uppercase">Failed to load orchestration canvas</p>
        <p className="text-sm text-gb-dark/60">{(error as Error)?.message ?? 'Unknown error'}</p>
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-gb-deep/20 text-gb-dark/60">
          <AlertCircle className="h-8 w-8" />
          <p className="font-vt323 text-xl uppercase">n8n not configured</p>
          <p className="text-sm">
            Set <code className="rounded bg-gb-mid px-1">N8N_API_KEY</code> and{' '}
            <code className="rounded bg-gb-mid px-1">N8N_BASE_URL</code> to enable the canvas.
          </p>
        </div>
        <WorkflowGenerator />
      </div>
    );
  }

  const iframeUrl = data.workflowId
    ? `/api/n8n-embed?path=/workflow/${data.workflowId}`
    : `/api/n8n-embed?path=/`;

  const openUrl = data.workflowId
    ? `${data.n8nBaseUrl}/workflow/${data.workflowId}`
    : data.n8nBaseUrl;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-vt323 text-2xl uppercase tracking-wider text-gb-deep">
            Orchestration Canvas
          </h1>
          <p className="text-sm text-gb-dark/60">n8n workflow editor — your FX agent automation</p>
        </div>
        <a
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded border border-gb-deep/30 px-3 py-1.5 font-vt323 text-sm uppercase text-gb-deep transition-colors hover:bg-gb-deep hover:text-gb-light"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in n8n
        </a>
      </div>

      <WorkflowGenerator onDeploy={() => {}} />

      <div className="overflow-hidden rounded-lg border-2 border-gb-deep/30 bg-gb-mid/20">
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          title="n8n Orchestration Canvas"
          className="h-[60vh] w-full"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
