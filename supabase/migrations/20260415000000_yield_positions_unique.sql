-- Add unique constraint on (wallet_address, vault_address) so that upsert works correctly.
-- Without this, the ON CONFLICT clause in the upsert throws a silent error
-- and vault positions never appear in the UI.

ALTER TABLE yield_positions
  ADD CONSTRAINT yield_positions_wallet_vault_unique
  UNIQUE (wallet_address, vault_address);
