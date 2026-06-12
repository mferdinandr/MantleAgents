ALTER TABLE agent_attestations
ADD COLUMN IF NOT EXISTS commit_tx_hash TEXT;
