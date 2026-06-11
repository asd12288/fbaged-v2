-- Preview: count new vs duplicate (against THIS client's existing leads). No writes.
create or replace function public.admin_sim_drip_preview(
  p_client_id uuid,
  p_emails text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_count integer := 0;
  duplicate_count integer := 0;
  duplicate_samples jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  if not exists (
    select 1 from public.sim_clients c
    where c.id = p_client_id and not c.is_archived
  ) then
    raise exception 'Sim client not found';
  end if;

  with normalized as (
    select lower(trim(email_input)) as email
    from unnest(coalesce(p_emails, '{}'::text[])) email_input
  ),
  candidates as (
    select distinct n.email
    from normalized n
    where n.email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ),
  duplicates as (
    select c.email
    from candidates c
    where exists (
      select 1 from public.sim_drip_leads l
      where l.client_id = p_client_id
        and lower(l.email) = c.email
    )
  )
  select
    (select count(*) from candidates),
    (select count(*) from duplicates),
    coalesce((
      select jsonb_agg(d.email)
      from (
        select email from duplicates order by email limit 20
      ) d
    ), '[]'::jsonb)
  into candidate_count, duplicate_count, duplicate_samples;

  return jsonb_build_object(
    'candidate_count', candidate_count,
    'duplicate_count', duplicate_count,
    'new_count', greatest(candidate_count - duplicate_count, 0),
    'duplicate_samples', duplicate_samples
  );
end;
$$;

grant execute on function public.admin_sim_drip_preview(uuid, text[]) to authenticated;

-- Create: insert a draft drip + queued leads; collisions become skipped_duplicate.
-- Mirrors the staging-table dedup of admin_leads_import_confirm but scoped to one client.
create or replace function public.admin_sim_drip_create(
  p_client_id uuid,
  p_name text,
  p_source_filename text,
  p_daily_volume integer,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drip_id uuid;
  v_total_rows integer := 0;
  v_valid_rows integer := 0;
  v_queued_rows integer := 0;
  v_duplicate_rows integer := 0;
  v_invalid_rows integer := 0;
  v_duplicate_samples jsonb := '[]'::jsonb;
  v_daily_volume integer;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  if not exists (
    select 1 from public.sim_clients c
    where c.id = p_client_id and not c.is_archived
  ) then
    raise exception 'Sim client not found';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Invalid rows payload';
  end if;

  v_daily_volume := greatest(coalesce(p_daily_volume, 25), 1);

  create temporary table _sim_drip_stage (
    row_number integer not null,
    row_json jsonb not null,
    email_raw text,
    email_normalized text,
    is_valid boolean not null default false,
    is_duplicate_in_file boolean not null default false,
    is_duplicate_existing boolean not null default false
  ) on commit drop;

  insert into _sim_drip_stage (row_number, row_json, email_raw, email_normalized, is_valid)
  select
    entry.ordinality::integer,
    entry.row_json,
    entry.row_json->>'email' as email_raw,
    lower(trim(coalesce(entry.row_json->>'email', ''))) as email_normalized,
    (
      lower(trim(coalesce(entry.row_json->>'email', ''))) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    ) as is_valid
  from jsonb_array_elements(p_rows) with ordinality as entry(row_json, ordinality);

  update _sim_drip_stage s
  set is_duplicate_in_file = true
  where s.is_valid
    and exists (
      select 1
      from _sim_drip_stage first_row
      where first_row.email_normalized = s.email_normalized
        and first_row.is_valid
        and first_row.row_number < s.row_number
    );

  update _sim_drip_stage s
  set is_duplicate_existing = true
  where s.is_valid
    and not s.is_duplicate_in_file
    and exists (
      select 1
      from public.sim_drip_leads l
      where l.client_id = p_client_id
        and lower(l.email) = s.email_normalized
    );

  select count(*) into v_total_rows from _sim_drip_stage;
  select count(*) into v_valid_rows from _sim_drip_stage where is_valid;
  select count(*) into v_invalid_rows from _sim_drip_stage where not is_valid;
  select count(*) into v_duplicate_rows
  from _sim_drip_stage
  where is_duplicate_in_file or is_duplicate_existing;

  insert into public.sim_drips (
    client_id, name, source_filename, status, daily_volume, total_count, created_by
  )
  values (
    p_client_id, p_name, p_source_filename, 'draft', v_daily_volume, 0, auth.uid()
  )
  returning id into v_drip_id;

  -- Surviving (new) leads -> queued.
  insert into public.sim_drip_leads (
    drip_id, client_id, email, payload_json, status
  )
  select
    v_drip_id,
    p_client_id,
    s.email_normalized,
    coalesce(s.row_json - 'email', '{}'::jsonb),
    'queued'
  from _sim_drip_stage s
  where s.is_valid
    and not s.is_duplicate_in_file
    and not s.is_duplicate_existing
  on conflict (client_id, lower(email)) do nothing;

  get diagnostics v_queued_rows = row_count;

  -- Collisions against existing client leads -> recorded as skipped_duplicate,
  -- linked to this drip but never deliverable. Guarded with on conflict do
  -- nothing so repeated skipped emails never raise against the unique index.
  insert into public.sim_drip_leads (
    drip_id, client_id, email, payload_json, status
  )
  select
    v_drip_id,
    p_client_id,
    s.email_normalized,
    jsonb_build_object(
      'skipped_reason',
      case when s.is_duplicate_in_file then 'duplicate_in_file' else 'duplicate_existing' end,
      'payload_json', coalesce(s.row_json - 'email', '{}'::jsonb)
    ),
    'skipped_duplicate'
  from _sim_drip_stage s
  where (s.is_duplicate_in_file or s.is_duplicate_existing)
    and s.is_valid
  on conflict (client_id, lower(email)) do nothing;

  update public.sim_drips
  set total_count = v_queued_rows
  where id = v_drip_id;

  select coalesce(jsonb_agg(sample.email_normalized), '[]'::jsonb)
  into v_duplicate_samples
  from (
    select distinct s.email_normalized
    from _sim_drip_stage s
    where s.is_duplicate_in_file or s.is_duplicate_existing
    order by s.email_normalized
    limit 20
  ) sample;

  return jsonb_build_object(
    'drip_id', v_drip_id,
    'total_rows', v_total_rows,
    'valid_rows', v_valid_rows,
    'queued_count', v_queued_rows,
    'duplicate_rows', v_duplicate_rows,
    'invalid_rows', v_invalid_rows,
    'duplicate_samples', v_duplicate_samples
  );
end;
$$;

grant execute on function public.admin_sim_drip_create(uuid, text, text, integer, jsonb) to authenticated;

-- List drips, optionally scoped to one client, newest first.
create or replace function public.admin_sim_drips_list(p_client_id uuid default null)
returns setof public.sim_drips
language sql
security definer
set search_path = public
as $$
  select * from public.sim_drips
  where public.is_admin()
    and (p_client_id is null or client_id = p_client_id)
  order by created_at desc;
$$;

grant execute on function public.admin_sim_drips_list(uuid) to authenticated;
