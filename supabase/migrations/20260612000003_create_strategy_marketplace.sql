-- strategy_templates: core table for published trading strategies
create table if not exists strategy_templates (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null,
  workflow_json jsonb not null,
  title text not null,
  description text,
  rental_price numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'listed', 'delisted')),
  min_attestations_required int not null default 10,
  created_at timestamptz not null default now()
);

create index if not exists strategy_templates_owner_wallet_idx on strategy_templates (owner_wallet);
create index if not exists strategy_templates_status_idx on strategy_templates (status);

-- strategy_performance_snapshots: append-only ROI snapshots at publish time
create table if not exists strategy_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategy_templates (id) on delete cascade,
  period_start timestamptz,
  period_end timestamptz,
  roi_pct numeric not null default 0,
  run_count int not null default 0,
  attestation_ids text[],
  created_at timestamptz not null default now()
);

create index if not exists strategy_performance_snapshots_strategy_id_idx on strategy_performance_snapshots (strategy_id);

-- strategy_rentals: records who rented what
create table if not exists strategy_rentals (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategy_templates (id) on delete cascade,
  renter_wallet text not null,
  price_paid numeric not null default 0,
  platform_fee numeric not null default 0,
  n8n_workflow_id text,
  started_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists strategy_rentals_strategy_id_idx on strategy_rentals (strategy_id);
create index if not exists strategy_rentals_renter_wallet_idx on strategy_rentals (renter_wallet);

-- RLS policies for strategy_templates
alter table strategy_templates enable row level security;

-- Owner can read their own rows; everyone can read listed rows
create policy "strategy_templates_select" on strategy_templates
  for select using (
    owner_wallet = auth.uid()::text
    or status = 'listed'
  );

-- Only owner can insert
create policy "strategy_templates_insert" on strategy_templates
  for insert with check (owner_wallet = auth.uid()::text);

-- Only owner can update
create policy "strategy_templates_update" on strategy_templates
  for update using (owner_wallet = auth.uid()::text);

-- Only owner can delete
create policy "strategy_templates_delete" on strategy_templates
  for delete using (owner_wallet = auth.uid()::text);
