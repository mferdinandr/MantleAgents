-- Token watchlist
CREATE TABLE token_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  risk_score JSONB,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, chain, token_address)
);

-- Price alerts
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  threshold NUMERIC NOT NULL,
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  triggered_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_watchlist_wallet ON token_watchlist(wallet_address);
CREATE INDEX idx_alerts_wallet ON price_alerts(wallet_address);
CREATE INDEX idx_alerts_active ON price_alerts(triggered) WHERE triggered = FALSE;

-- RLS
ALTER TABLE token_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist" ON token_watchlist
  FOR ALL USING (true);

CREATE POLICY "Users can manage own alerts" ON price_alerts
  FOR ALL USING (true);
