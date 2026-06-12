create table if not exists generated_workflows (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  prompt text not null,
  output_json jsonb,
  validation_result jsonb,
  deployed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists generated_workflows_wallet_address_idx
  on generated_workflows (wallet_address);
