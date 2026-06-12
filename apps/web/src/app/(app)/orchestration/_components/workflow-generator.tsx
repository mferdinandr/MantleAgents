'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Loader2, AlertCircle, CheckCircle2, Rocket } from 'lucide-react';

type WorkflowValidationResult = { passed: boolean; issues: string[] };
type GeneratedWorkflow = {
  workflowJson: Record<string, unknown> | null;
  summary: string;
  validation: WorkflowValidationResult;
};
type WorkflowNode = { name: string };

interface WorkflowGeneratorProps {
  onDeploy?: (workflowJson: Record<string, unknown>) => void;
}

export function WorkflowGenerator({ onDeploy }: WorkflowGeneratorProps) {
  const [prompt, setPrompt] = React.useState('');
  const [deployError, setDeployError] = React.useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: (p: string) =>
      api.post<GeneratedWorkflow>('/api/workflow/generate', { prompt: p }),
    onMutate: () => setDeployError(null),
  });

  const deployMutation = useMutation({
    mutationFn: (workflowJson: Record<string, unknown>) =>
      api.post('/api/n8n/provision', { workflow: workflowJson }),
    onSuccess: () => {
      const wf = generateMutation.data;
      if (wf?.workflowJson) onDeploy?.(wf.workflowJson);
    },
    onError: (err) => {
      setDeployError((err as Error)?.message ?? 'Deploy failed');
    },
  });

  const result = generateMutation.data;
  const isGenerating = generateMutation.isPending;
  const nodes = result?.workflowJson
    ? ((result.workflowJson as { nodes?: WorkflowNode[] }).nodes ?? [])
    : [];

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    generateMutation.mutate(prompt.trim());
  }

  function handleDeploy() {
    if (!result?.workflowJson) return;
    deployMutation.mutate(result.workflowJson);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-gb-deep/20 bg-gb-mid/10 p-4">
      <div>
        <h2 className="font-vt323 text-xl uppercase tracking-wider text-gb-deep">
          Generate Workflow from Intent
        </h2>
        <p className="text-xs text-gb-dark/60">
          Describe your trading strategy in plain language — Gemini will generate a deployable n8n workflow.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="flex flex-col gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
          rows={3}
          placeholder="e.g. Pantau token XYZ, jika volume beli tinggi dan contract risk check lolos, masuk posisi $500, TP 20%, SL 5%"
          className="w-full resize-none rounded border border-gb-deep/20 bg-gb-light px-3 py-2 text-sm text-gb-dark placeholder:text-gb-dark/40 focus:outline-none focus:ring-1 focus:ring-gb-deep disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center justify-center gap-2 self-end rounded bg-gb-deep px-4 py-1.5 font-vt323 text-sm uppercase text-gb-light transition-opacity disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            'Generate Workflow'
          )}
        </button>
      </form>

      {generateMutation.isError && (
        <div className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {(generateMutation.error as Error)?.message ?? 'Generation failed'}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="rounded border border-gb-deep/10 bg-gb-light/60 px-3 py-2">
            <p className="text-xs font-medium text-gb-dark/60 uppercase tracking-wider mb-1">Summary</p>
            <p className="text-sm text-gb-dark">{result.summary}</p>
          </div>

          {nodes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gb-dark/60 uppercase tracking-wider mb-1.5">
                Node Chain
              </p>
              <ol className="flex flex-wrap gap-2">
                {nodes.map((node, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="rounded bg-gb-deep/10 px-2 py-0.5 font-vt323 text-xs uppercase text-gb-deep">
                      {node.name}
                    </span>
                    {i < nodes.length - 1 && (
                      <span className="text-xs text-gb-dark/40">→</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!result.validation.passed && result.validation.issues.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-red-600">
                Validation Issues
              </p>
              {result.validation.issues.map((issue, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {issue}
                </div>
              ))}
            </div>
          )}

          {result.validation.passed && (
            <div className="flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validation passed — ready to deploy
            </div>
          )}

          {deployError && (
            <div className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {deployError}
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={!result.validation.passed || deployMutation.isPending || !result.workflowJson}
            className="flex items-center justify-center gap-2 rounded bg-gb-deep px-4 py-2 font-vt323 text-sm uppercase text-gb-light transition-opacity disabled:opacity-40"
          >
            {deployMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deploying…
              </>
            ) : (
              <>
                <Rocket className="h-3.5 w-3.5" />
                Deploy to Canvas
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
