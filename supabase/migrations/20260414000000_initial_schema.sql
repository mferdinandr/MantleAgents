-- ============================================================
-- Initial Schema Migration
-- Generated from packages/db/src/types.ts
-- ============================================================

-- 1. user_profiles (root table, referenced by everything)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  auth_method TEXT,
  risk_profile TEXT,
  risk_answers JSONB,
  preferred_currencies TEXT[],
  onboarding_completed BOOLEAN DEFAULT FALSE,
  selfclaw_verified BOOLEAN DEFAULT FALSE,
  selfclaw_verified_at TIMESTAMPTZ,
  selfclaw_agent_name TEXT,
  selfclaw_human_id TEXT,
  selfclaw_session_id TEXT,
  selfclaw_public_key TEXT,
  selfclaw_private_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. agent_configs
CREATE TABLE agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  agent_type TEXT NOT NULL DEFAULT 'fx',
  active BOOLEAN DEFAULT FALSE,
  frequency TEXT,
  strategy_params JSONB,
  custom_prompt TEXT,
  allowed_currencies TEXT[],
  blocked_currencies TEXT[],
  max_trade_size_pct NUMERIC,
  max_allocation_pct NUMERIC,
  stop_loss_pct NUMERIC,
  daily_trade_limit NUMERIC,
  server_wallet_id TEXT,
  server_wallet_address TEXT,
  agent_8004_id INTEGER,
  agent_8004_tx_hash TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wallet_address, agent_type)
);

-- 3. agent_positions
CREATE TABLE agent_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  token_symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  balance NUMERIC,
  avg_entry_rate NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. agent_timeline
CREATE TABLE agent_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  run_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  currency TEXT,
  direction TEXT,
  amount_usd NUMERIC,
  confidence_pct NUMERIC,
  tx_hash TEXT,
  detail JSONB,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. fx_agent_timeline
CREATE TABLE fx_agent_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  run_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  currency TEXT,
  direction TEXT,
  amount_usd NUMERIC,
  confidence_pct NUMERIC,
  tx_hash TEXT,
  detail JSONB,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. yield_agent_timeline
CREATE TABLE yield_agent_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  run_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  currency TEXT,
  direction TEXT,
  amount_usd NUMERIC,
  confidence_pct NUMERIC,
  tx_hash TEXT,
  detail JSONB,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. yield_positions
CREATE TABLE yield_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  protocol TEXT NOT NULL DEFAULT '',
  vault_address TEXT NOT NULL,
  deposit_token TEXT NOT NULL,
  deposit_amount_usd NUMERIC NOT NULL DEFAULT 0,
  lp_shares NUMERIC NOT NULL DEFAULT 0,
  current_apr NUMERIC,
  deposited_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT,
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT,
  content TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. conversation_chats
CREATE TABLE conversation_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. conversation_messages
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES conversation_chats(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model_requested TEXT,
  model_routed TEXT,
  tool_calls_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. news_articles
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  sentiment TEXT,
  source_name TEXT,
  tickers TEXT[],
  related_tokens TEXT[],
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. portfolio_snapshots
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_value_usd NUMERIC,
  holdings JSONB,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. token_price_snapshots
CREATE TABLE token_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_symbol TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. sip_configs
CREATE TABLE sip_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  source_token TEXT NOT NULL,
  target_token TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT,
  day_of_week INTEGER,
  day_of_month INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  allowance_tx_hash TEXT,
  next_execution TIMESTAMPTZ,
  total_executions INTEGER DEFAULT 0,
  total_invested NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  sip_id UUID REFERENCES sip_configs(id) ON DELETE SET NULL,
  type TEXT,
  source_token TEXT NOT NULL,
  target_token TEXT NOT NULL,
  source_amount NUMERIC NOT NULL,
  target_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. token_watchlist
CREATE TABLE IF NOT EXISTS token_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  risk_score JSONB,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, chain, token_address)
);

-- 18. price_alerts
CREATE TABLE IF NOT EXISTS price_alerts (
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

-- 19. overview_cache
CREATE TABLE overview_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_agent_configs_wallet ON agent_configs(wallet_address);
CREATE INDEX idx_agent_configs_next_run ON agent_configs(next_run_at) WHERE active = TRUE;
CREATE INDEX idx_agent_timeline_wallet ON agent_timeline(wallet_address);
CREATE INDEX idx_agent_timeline_created ON agent_timeline(created_at DESC);
CREATE INDEX idx_fx_timeline_wallet ON fx_agent_timeline(wallet_address);
CREATE INDEX idx_yield_timeline_wallet ON yield_agent_timeline(wallet_address);
CREATE INDEX idx_yield_positions_wallet ON yield_positions(wallet_address);
CREATE INDEX idx_conversation_chats_wallet ON conversation_chats(wallet_address);
CREATE INDEX idx_conversation_messages_chat ON conversation_messages(chat_id);
CREATE INDEX idx_token_price_snapshots_symbol ON token_price_snapshots(token_symbol, snapshot_at DESC);
CREATE INDEX idx_watchlist_wallet ON token_watchlist(wallet_address);
CREATE INDEX idx_alerts_wallet ON price_alerts(wallet_address);
CREATE INDEX idx_alerts_active ON price_alerts(triggered) WHERE triggered = FALSE;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_agent_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_agent_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — all access from API is via service_role key
CREATE POLICY "service_role full access" ON user_profiles FOR ALL USING (true);
CREATE POLICY "service_role full access" ON agent_configs FOR ALL USING (true);
CREATE POLICY "service_role full access" ON agent_positions FOR ALL USING (true);
CREATE POLICY "service_role full access" ON agent_timeline FOR ALL USING (true);
CREATE POLICY "service_role full access" ON fx_agent_timeline FOR ALL USING (true);
CREATE POLICY "service_role full access" ON yield_agent_timeline FOR ALL USING (true);
CREATE POLICY "service_role full access" ON yield_positions FOR ALL USING (true);
CREATE POLICY "service_role full access" ON conversation_chats FOR ALL USING (true);
CREATE POLICY "service_role full access" ON conversation_messages FOR ALL USING (true);
CREATE POLICY "service_role full access" ON token_watchlist FOR ALL USING (true);
CREATE POLICY "service_role full access" ON price_alerts FOR ALL USING (true);

-- ============================================================
-- Functions
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM token_price_snapshots WHERE snapshot_at < NOW() - INTERVAL '30 days';
  DELETE FROM portfolio_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
END;
$$;
