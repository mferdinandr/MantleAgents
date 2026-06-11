-- Create agent_attestations table for TEE run attestations
CREATE TABLE IF NOT EXISTS agent_attestations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  agent_type  TEXT NOT NULL,
  run_id      TEXT,
  payload     JSONB NOT NULL DEFAULT '{}',
  signature   TEXT NOT NULL DEFAULT '',
  algorithm   TEXT NOT NULL DEFAULT 'HMAC-SHA256',
  is_development BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_attestations_wallet_agent_idx
  ON agent_attestations (wallet_address, agent_type);
