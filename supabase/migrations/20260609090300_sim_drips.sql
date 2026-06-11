-- Lead-sim drips: one uploaded list per client + its queued leads.
-- Per-client, case-insensitive dedup via citext + unique (client_id, lower(email)).

create extension if not exists citext;

create table if not exists public.sim_drips (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.sim_clients(id) on delete cascade,
  name text not null,
  source_filename text,
  status text not null default 'draft'
    check (status in ('draft', 'running', 'paused', 'completed', 'canceled')),
  paused_reason text,
  daily_volume integer not null default 25
    check (daily_volume > 0),
  total_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  consecutive_failures integer not null default 0,
  started_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index if not exists idx_sim_drips_client_created
  on public.sim_drips (client_id, created_at desc);
create index if not exists idx_sim_drips_status
  on public.sim_drips (status);

create table if not exists public.sim_drip_leads (
  id uuid primary key default gen_random_uuid(),
  drip_id uuid not null references public.sim_drips(id) on delete cascade,
  client_id uuid not null references public.sim_clients(id) on delete cascade,
  email citext not null,
  payload_json jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  status text not null default 'queued'
    check (status in ('queued', 'scheduled', 'sending', 'sent', 'failed', 'canceled', 'skipped_duplicate')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  response_status integer,
  response_body text,
  error text,
  delivered_payload jsonb,
  created_at timestamptz not null default now()
);

-- Per-client dedup: case-insensitive uniqueness across all of a client's leads.
-- skipped_duplicate rows are NOT inserted (they collide), so this index only
-- ever holds the surviving deliverable rows for a client.
create unique index if not exists ux_sim_drip_leads_client_email
  on public.sim_drip_leads (client_id, lower(email));

create index if not exists idx_sim_drip_leads_drip
  on public.sim_drip_leads (drip_id);
create index if not exists idx_sim_drip_leads_status
  on public.sim_drip_leads (status);
create index if not exists idx_sim_drip_leads_scheduled
  on public.sim_drip_leads (scheduled_at) where status in ('queued', 'scheduled');

alter table public.sim_drips enable row level security;
alter table public.sim_drip_leads enable row level security;

create policy sim_drips_admin_all
  on public.sim_drips
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy sim_drip_leads_admin_all
  on public.sim_drip_leads
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.sim_drips to authenticated;
grant select, insert, update, delete on public.sim_drip_leads to authenticated;
