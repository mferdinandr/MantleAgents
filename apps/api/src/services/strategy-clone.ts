import { provisionUserWorkflow } from './n8n-provisioner.js';

export async function cloneStrategyToCanvas(
  renterWallet: string,
  workflowJson: Record<string, unknown>,
  strategyTitle: string,
): Promise<string> {
  const namedWorkflow = {
    ...workflowJson,
    name: `[${strategyTitle}] fx-agent-${renterWallet.slice(0, 10)}`,
  };

  const n8nBaseUrl = process.env.N8N_BASE_URL ?? 'http://localhost:5678';
  const n8nApiKey = process.env.N8N_API_KEY ?? null;

  if (!n8nApiKey) {
    throw new Error('n8n not configured: N8N_API_KEY is missing');
  }

  const response = await fetch(`${n8nBaseUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': n8nApiKey,
    },
    body: JSON.stringify(namedWorkflow),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `n8n workflow clone failed for renter ${renterWallet}: ${response.status} ${body}`,
    );
  }

  const created = (await response.json()) as { id: string | number };
  return String(created.id);
}

export { provisionUserWorkflow };
