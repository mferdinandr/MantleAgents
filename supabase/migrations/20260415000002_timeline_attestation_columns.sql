-- Add attestation columns to all timeline tables
ALTER TABLE agent_timeline
  ADD COLUMN IF NOT EXISTS attestation_id UUID REFERENCES agent_attestations(id),
  ADD COLUMN IF NOT EXISTS attestation_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE fx_agent_timeline
  ADD COLUMN IF NOT EXISTS attestation_id UUID REFERENCES agent_attestations(id),
  ADD COLUMN IF NOT EXISTS attestation_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE yield_agent_timeline
  ADD COLUMN IF NOT EXISTS attestation_id UUID REFERENCES agent_attestations(id),
  ADD COLUMN IF NOT EXISTS attestation_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_fx_timeline_attestation ON fx_agent_timeline(attestation_id);
CREATE INDEX IF NOT EXISTS idx_yield_timeline_attestation ON yield_agent_timeline(attestation_id);
CREATE INDEX IF NOT EXISTS idx_agent_timeline_attestation ON agent_timeline(attestation_id);
