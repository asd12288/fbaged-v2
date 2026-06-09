-- Lead-sim delivery engine: settings, vault seeds, planner, worker RPCs,
-- admin control RPCs and cron schedules.
-- Contract: docs/superpowers/plans/2026-06-10-lead-sim-plan-3-4-engine-controls.md

-- ---------------------------------------------------------------------------
-- 2.1 Extensions + settings + vault seeds
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Single-row global settings. dry_run defaults TRUE everywhere: real HTTP delivery
-- only happens after an admin explicitly flips it (prod safety).
create table if not exists public.sim_settings (
  id boolean primary key default true check (id),
  dry_run boolean not null default true,
  updated_at timestamptz,
  updated_by uuid
);
insert into public.sim_settings (id) values (true) on conflict do nothing;

alter table public.sim_settings enable row level security;
create policy sim_settings_admin_read on public.sim_settings
  for select to authenticated using (public.is_admin());
grant select on public.sim_settings to authenticated;

-- Idempotent vault seeds: a cron shared secret and the deliver-function URL.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sim_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'sim_cron_secret', 'Shared secret pg_cron presents to the sim-drip-deliver edge function');
  end if;
  if not exists (select 1 from vault.secrets where name = 'sim_function_url') then
    perform vault.create_secret('http://host.docker.internal:54321/functions/v1/sim-drip-deliver', 'sim_function_url', 'URL pg_net posts to to trigger delivery (prod: https://<ref>.supabase.co/functions/v1/sim-drip-deliver)');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2.2 Internal helpers (NOT callable from the API)
-- ---------------------------------------------------------------------------

create or replace function public.sim_get_secret(p_name text)
returns text language sql security definer set search_path = public
as $$ select decrypted_secret from vault.decrypted_secrets where name = p_name; $$;
revoke all on function public.sim_get_secret(text) from public, anon, authenticated;

-- Trigger one delivery cycle: async POST to the edge function with the cron secret.
create or replace function public.sim_invoke_delivery()
returns bigint language sql security definer set search_path = public
as $$
  select net.http_post(
    url := public.sim_get_secret('sim_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sim-cron-secret', public.sim_get_secret('sim_cron_secret')
    ),
    body := '{}'::jsonb
  );
$$;
revoke all on function public.sim_invoke_delivery() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2.3 Planner
-- ---------------------------------------------------------------------------

-- Schedules queued leads for today + tomorrow per running drip, in the client's
-- timezone/send-window, with a ±20% jittered daily target and random in-window times.
create or replace function public.sim_plan_drips(p_drip_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_total_scheduled integer := 0;
  v_drips integer := 0;
  v_day integer;
  v_local_now timestamp;
  v_local_date date;
  v_win_start timestamp;
  v_win_end timestamp;
  v_eff_start timestamp;
  v_eff_start_ts timestamptz;
  v_span interval;
  v_target integer;
  v_already integer;
  v_need integer;
  v_picked integer;
begin
  for d in
    select dr.id, dr.daily_volume, c.timezone, c.send_window_start, c.send_window_end, c.skip_weekends
    from public.sim_drips dr
    join public.sim_clients c on c.id = dr.client_id
    where dr.status = 'running'
      and (p_drip_id is null or dr.id = p_drip_id)
    order by dr.created_at
  loop
    v_drips := v_drips + 1;
    v_local_now := (now() at time zone d.timezone);
    for v_day in 0..1 loop
      v_local_date := (v_local_now)::date + v_day;
      if d.skip_weekends and extract(isodow from v_local_date) in (6, 7) then
        continue;
      end if;
      v_win_start := v_local_date + d.send_window_start;
      v_win_end := v_local_date + d.send_window_end;
      if v_day = 0 then
        v_eff_start := greatest(v_win_start, v_local_now);
      else
        v_eff_start := v_win_start;
      end if;
      if v_eff_start >= v_win_end then
        continue;
      end if;
      v_target := greatest(1, round(d.daily_volume * (0.8 + random() * 0.4))::integer);
      select count(*) into v_already
      from public.sim_drip_leads l
      where l.drip_id = d.id
        and l.status in ('scheduled', 'sending', 'sent', 'failed')
        and ((l.scheduled_at at time zone d.timezone)::date) = v_local_date;
      v_need := v_target - v_already;
      if v_need <= 0 then
        continue;
      end if;
      v_eff_start_ts := v_eff_start at time zone d.timezone;
      v_span := v_win_end - v_eff_start;
      update public.sim_drip_leads l
      set status = 'scheduled',
          scheduled_at = v_eff_start_ts + (pick.r * v_span)
      from (
        select id, random() as r
        from public.sim_drip_leads
        where drip_id = d.id and status = 'queued'
        order by created_at, id
        limit v_need
        for update skip locked
      ) pick
      where l.id = pick.id;
      get diagnostics v_picked = row_count;
      v_total_scheduled := v_total_scheduled + v_picked;
    end loop;
  end loop;
  return jsonb_build_object('drips_planned', v_drips, 'leads_scheduled', v_total_scheduled);
end;
$$;
revoke all on function public.sim_plan_drips(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2.4 Worker RPCs (service_role only)
-- ---------------------------------------------------------------------------

-- Claim due leads (locks them as 'sending') and return them with client delivery
-- config + decrypted auth secret. Only the edge function (service role) may call;
-- the cron shared secret is validated as defense in depth.
create or replace function public.sim_worker_claim(p_secret text, p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_expected text;
  v_dry boolean;
  v_leads jsonb;
begin
  v_expected := public.sim_get_secret('sim_cron_secret');
  if v_expected is null or p_secret is distinct from v_expected then
    raise exception 'Invalid worker secret';
  end if;
  select dry_run into v_dry from public.sim_settings where id;
  with claimed as (
    update public.sim_drip_leads l
    set status = 'sending', last_attempt_at = now()
    where l.id in (
      select l2.id
      from public.sim_drip_leads l2
      join public.sim_drips d on d.id = l2.drip_id
      where l2.status = 'scheduled'
        and l2.scheduled_at <= now()
        and d.status = 'running'
      order by l2.scheduled_at
      limit greatest(1, least(coalesce(p_limit, 25), 100))
      for update of l2 skip locked
    )
    returning l.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cl.id,
    'drip_id', cl.drip_id,
    'email', cl.email,
    'payload_json', cl.payload_json,
    'attempts', cl.attempts,
    'webhook_url', c.webhook_url,
    'http_method', c.http_method,
    'content_type', c.content_type,
    'field_mapping', c.field_mapping,
    'custom_headers', c.custom_headers,
    'auth_secret', vs.decrypted_secret
  )), '[]'::jsonb)
  into v_leads
  from claimed cl
  join public.sim_clients c on c.id = cl.client_id
  left join vault.decrypted_secrets vs on vs.id = c.auth_secret_ref;
  return jsonb_build_object('dry_run', v_dry, 'leads', v_leads);
end;
$$;
revoke all on function public.sim_worker_claim(text, integer) from public, anon, authenticated;
grant execute on function public.sim_worker_claim(text, integer) to service_role;

-- Record one delivery outcome. Handles retries w/ exponential backoff (2^n min,
-- capped 16, max 5 attempts), the drip circuit breaker (5 consecutive failed
-- ATTEMPTS pauses the drip), counters, and completion detection.
create or replace function public.sim_worker_record(
  p_secret text,
  p_lead_id uuid,
  p_success boolean,
  p_response_status integer,
  p_response_body text,
  p_error text,
  p_delivered_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_expected text;
  v_lead record;
  v_drip record;
  v_consecutive integer;
  v_breaker constant integer := 5;
  v_max_attempts constant integer := 5;
begin
  v_expected := public.sim_get_secret('sim_cron_secret');
  if v_expected is null or p_secret is distinct from v_expected then
    raise exception 'Invalid worker secret';
  end if;
  select * into v_lead from public.sim_drip_leads where id = p_lead_id for update;
  if not found or v_lead.status <> 'sending' then
    return jsonb_build_object('skipped', true);
  end if;
  select * into v_drip from public.sim_drips where id = v_lead.drip_id for update;

  if p_success then
    update public.sim_drip_leads
    set status = 'sent', sent_at = now(), attempts = v_lead.attempts + 1,
        response_status = p_response_status,
        response_body = left(coalesce(p_response_body, ''), 2048),
        error = null, delivered_payload = p_delivered_payload
    where id = p_lead_id;
    update public.sim_drips
    set sent_count = sent_count + 1, consecutive_failures = 0
    where id = v_drip.id;
  else
    if v_lead.attempts + 1 < v_max_attempts then
      update public.sim_drip_leads
      set status = 'scheduled', attempts = v_lead.attempts + 1,
          scheduled_at = now() + (least(power(2, v_lead.attempts + 1), 16)::integer * interval '1 minute'),
          response_status = p_response_status,
          response_body = left(coalesce(p_response_body, ''), 2048),
          error = left(coalesce(p_error, ''), 500),
          delivered_payload = p_delivered_payload
      where id = p_lead_id;
    else
      update public.sim_drip_leads
      set status = 'failed', attempts = v_lead.attempts + 1,
          response_status = p_response_status,
          response_body = left(coalesce(p_response_body, ''), 2048),
          error = left(coalesce(p_error, ''), 500),
          delivered_payload = p_delivered_payload
      where id = p_lead_id;
      update public.sim_drips set failed_count = failed_count + 1 where id = v_drip.id;
    end if;
    update public.sim_drips
    set consecutive_failures = consecutive_failures + 1
    where id = v_drip.id
    returning consecutive_failures into v_consecutive;
    if v_consecutive >= v_breaker
       and (select status from public.sim_drips where id = v_drip.id) = 'running' then
      update public.sim_drips
      set status = 'paused',
          paused_reason = 'Circuit breaker: ' || v_breaker || ' consecutive delivery failures (last: '
            || left(coalesce(p_error, 'HTTP ' || p_response_status::text, 'unknown'), 120) || ')'
      where id = v_drip.id;
    end if;
  end if;

  if not exists (
    select 1 from public.sim_drip_leads
    where drip_id = v_drip.id and status in ('queued', 'scheduled', 'sending')
  ) and (select status from public.sim_drips where id = v_drip.id) = 'running' then
    update public.sim_drips set status = 'completed' where id = v_drip.id;
  end if;

  return jsonb_build_object('lead_id', p_lead_id, 'drip_id', v_drip.id);
end;
$$;
revoke all on function public.sim_worker_record(text, uuid, boolean, integer, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.sim_worker_record(text, uuid, boolean, integer, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 2.5 Admin RPCs (authenticated + public.is_admin() gate)
-- ---------------------------------------------------------------------------

-- Drip detail: full drip row + client delivery/pacing context + lead status counts.
create or replace function public.admin_sim_drip_get(p_drip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drip public.sim_drips;
  v_client jsonb;
  v_counts jsonb;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  select * into v_drip from public.sim_drips where id = p_drip_id;
  if not found then
    raise exception 'Drip not found';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'timezone', c.timezone,
    'send_window_start', c.send_window_start,
    'send_window_end', c.send_window_end,
    'skip_weekends', c.skip_weekends,
    'content_type', c.content_type,
    'webhook_url', c.webhook_url
  )
  into v_client
  from public.sim_clients c
  where c.id = v_drip.client_id;

  select jsonb_build_object(
    'queued', count(*) filter (where l.status = 'queued'),
    'scheduled', count(*) filter (where l.status = 'scheduled'),
    'sending', count(*) filter (where l.status = 'sending'),
    'sent', count(*) filter (where l.status = 'sent'),
    'failed', count(*) filter (where l.status = 'failed'),
    'canceled', count(*) filter (where l.status = 'canceled'),
    'skipped_duplicate', count(*) filter (where l.status = 'skipped_duplicate')
  )
  into v_counts
  from public.sim_drip_leads l
  where l.drip_id = p_drip_id;

  return jsonb_build_object(
    'drip', to_jsonb(v_drip),
    'client', v_client,
    'counts', v_counts
  );
end;
$$;

grant execute on function public.admin_sim_drip_get(uuid) to authenticated;

-- Paged leads for one drip, optionally filtered by status.
create or replace function public.admin_sim_drip_leads(
  p_drip_id uuid,
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_rows jsonb;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  select count(*) into v_total
  from public.sim_drip_leads l
  where l.drip_id = p_drip_id
    and (p_status is null or l.status = p_status);

  select coalesce(jsonb_agg(page.entry), '[]'::jsonb)
  into v_rows
  from (
    select jsonb_build_object(
      'id', l.id,
      'email', l.email,
      'status', l.status,
      'scheduled_at', l.scheduled_at,
      'sent_at', l.sent_at,
      'attempts', l.attempts,
      'response_status', l.response_status,
      'response_body', l.response_body,
      'error', l.error,
      'delivered_payload', l.delivered_payload,
      'created_at', l.created_at
    ) as entry
    from public.sim_drip_leads l
    where l.drip_id = p_drip_id
      and (p_status is null or l.status = p_status)
    order by coalesce(l.scheduled_at, l.created_at) asc
    limit greatest(coalesce(p_limit, 100), 1)
    offset greatest(coalesce(p_offset, 0), 0)
  ) page;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

grant execute on function public.admin_sim_drip_leads(uuid, text, integer, integer) to authenticated;

-- Lifecycle transitions: start / resume / pause / cancel. Returns updated drip row.
create or replace function public.admin_sim_drip_set_status(p_drip_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drip public.sim_drips;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  select * into v_drip from public.sim_drips where id = p_drip_id for update;
  if not found then
    raise exception 'Drip not found';
  end if;

  if p_action = 'start' then
    if v_drip.status <> 'draft' then
      raise exception 'Cannot start drip: status is %, expected draft', v_drip.status;
    end if;
    update public.sim_drips
    set status = 'running',
        started_at = coalesce(started_at, now()),
        paused_reason = null,
        consecutive_failures = 0
    where id = p_drip_id
    returning * into v_drip;
    perform public.sim_plan_drips(p_drip_id);
  elsif p_action = 'resume' then
    if v_drip.status <> 'paused' then
      raise exception 'Cannot resume drip: status is %, expected paused', v_drip.status;
    end if;
    update public.sim_drips
    set status = 'running',
        started_at = coalesce(started_at, now()),
        paused_reason = null,
        consecutive_failures = 0
    where id = p_drip_id
    returning * into v_drip;
    perform public.sim_plan_drips(p_drip_id);
  elsif p_action = 'pause' then
    if v_drip.status <> 'running' then
      raise exception 'Cannot pause drip: status is %, expected running', v_drip.status;
    end if;
    update public.sim_drips
    set status = 'paused',
        paused_reason = 'Paused by admin'
    where id = p_drip_id
    returning * into v_drip;
  elsif p_action = 'cancel' then
    if v_drip.status not in ('draft', 'running', 'paused') then
      raise exception 'Cannot cancel drip: status is %, expected draft, running or paused', v_drip.status;
    end if;
    update public.sim_drips
    set status = 'canceled'
    where id = p_drip_id
    returning * into v_drip;
    update public.sim_drip_leads
    set status = 'canceled'
    where drip_id = p_drip_id
      and status in ('queued', 'scheduled', 'sending');
  else
    raise exception 'Unknown drip action: %', coalesce(p_action, '(null)');
  end if;

  return to_jsonb(v_drip);
end;
$$;

grant execute on function public.admin_sim_drip_set_status(uuid, text) to authenticated;

-- Update daily volume (clamped to >= 1); replan immediately if running.
create or replace function public.admin_sim_drip_update_pace(p_drip_id uuid, p_daily_volume integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drip public.sim_drips;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  update public.sim_drips
  set daily_volume = greatest(p_daily_volume, 1)
  where id = p_drip_id
  returning * into v_drip;

  if v_drip.id is null then
    raise exception 'Drip not found';
  end if;

  if v_drip.status = 'running' then
    perform public.sim_plan_drips(p_drip_id);
  end if;

  return to_jsonb(v_drip);
end;
$$;

grant execute on function public.admin_sim_drip_update_pace(uuid, integer) to authenticated;

-- Re-queue one failed lead for immediate delivery; adjust drip counters.
create or replace function public.admin_sim_drip_retry_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.sim_drip_leads;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  select * into v_lead from public.sim_drip_leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead not found';
  end if;
  if v_lead.status <> 'failed' then
    raise exception 'Cannot retry lead: status is %, expected failed', v_lead.status;
  end if;

  update public.sim_drip_leads
  set status = 'scheduled',
      scheduled_at = now(),
      attempts = 0,
      error = null,
      response_status = null,
      response_body = null
  where id = p_lead_id
  returning * into v_lead;

  update public.sim_drips
  set failed_count = greatest(failed_count - 1, 0),
      consecutive_failures = 0
  where id = v_lead.drip_id;

  return to_jsonb(v_lead);
end;
$$;

grant execute on function public.admin_sim_drip_retry_lead(uuid) to authenticated;

-- Manually run the planner across all running drips.
create or replace function public.admin_sim_run_planner()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;
  return public.sim_plan_drips();
end;
$$;

grant execute on function public.admin_sim_run_planner() to authenticated;

-- Manually trigger one delivery cycle (async pg_net request id returned).
create or replace function public.admin_sim_run_delivery()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;
  return jsonb_build_object('request_id', public.sim_invoke_delivery());
end;
$$;

grant execute on function public.admin_sim_run_delivery() to authenticated;

-- Read global sim settings.
create or replace function public.admin_sim_get_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.sim_settings;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;
  select * into v_settings from public.sim_settings where id;
  return jsonb_build_object('dry_run', v_settings.dry_run, 'updated_at', v_settings.updated_at);
end;
$$;

grant execute on function public.admin_sim_get_settings() to authenticated;

-- Flip global dry-run.
create or replace function public.admin_sim_set_dry_run(p_dry_run boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dry boolean;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;
  update public.sim_settings
  set dry_run = p_dry_run,
      updated_at = now(),
      updated_by = auth.uid()
  where id
  returning dry_run into v_dry;
  return jsonb_build_object('dry_run', v_dry);
end;
$$;

grant execute on function public.admin_sim_set_dry_run(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2.6 Cron schedules
-- ---------------------------------------------------------------------------

select cron.schedule('sim-drip-planner', '7 * * * *', $$select public.sim_plan_drips();$$);
select cron.schedule('sim-drip-deliver', '* * * * *', $$select public.sim_invoke_delivery();$$);
