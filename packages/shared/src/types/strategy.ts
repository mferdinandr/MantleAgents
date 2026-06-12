export interface StrategyTemplate {
  id: string;
  ownerWallet: string;
  workflowJson: Record<string, unknown>;
  title: string;
  description: string | null;
  rentalPrice: number;
  status: 'draft' | 'listed' | 'delisted';
  minAttestationsRequired: number;
  createdAt: string;
}

export interface StrategyListing {
  id: string;
  ownerWallet: string;
  title: string;
  description: string | null;
  rentalPrice: number;
  status: 'listed';
  attestationCount: number;
  roiPct: number;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface StrategyRental {
  id: string;
  strategyId: string;
  renterWallet: string;
  pricePaid: number;
  platformFee: number;
  n8nWorkflowId: string | null;
  startedAt: string;
  expiresAt: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  issues: string[];
  attestationCount?: number;
  firstRunAt?: string;
  lastRunAt?: string;
  roiPct?: number;
}
