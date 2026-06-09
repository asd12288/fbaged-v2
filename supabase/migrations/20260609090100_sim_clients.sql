-- External "sim" clients: a CRM webhook target + payload mapping + pacing config.
create table if not exists public.sim_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  name text not null,
  webhook_url text not null,
  http_method text not null default 'POST'
    check (http_method in ('POST', 'PUT')),
  content_type text not null default 'application/json'
    check (content_type in ('application/json', 'application/x-www-form-urlencoded')),
  field_mapping jsonb not null default '{"fields":{},"constants":{}}'::jsonb,
  custom_headers jsonb not null default '{}'::jsonb,
  auth_secret_ref uuid,                  -- vault.secrets.id; never exposed to the client
  timezone text not null default 'Europe/Paris',
  send_window_start time not null default '08:00',
  send_window_end time not null default '21:00',
  skip_weekends boolean not null default false,
  default_daily_volume integer not null default 25
    check (default_daily_volume > 0),
  is_archived boolean not null default false
);

create index if not exists idx_sim_clients_active
  on public.sim_clients (created_at desc) where not is_archived;

alter table public.sim_clients enable row level security;

create policy sim_clients_admin_all
  on public.sim_clients
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.sim_clients to authenticated;
