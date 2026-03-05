create or replace function public.admin_leads_import_confirm(
  p_assigned_user_id uuid,
  p_campaign_id bigint,
  p_source_filename text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id bigint;
  v_total_rows integer := 0;
  v_valid_rows integer := 0;
  v_inserted_rows integer := 0;
  v_duplicate_rows integer := 0;
  v_invalid_rows integer := 0;
  v_duplicate_samples jsonb := '[]'::jsonb;
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Access denied: admin only';
  end if;

  if not exists (
    select 1
    from public.campaigns c
    where c.id = p_campaign_id
      and c.user_id = p_assigned_user_id
  ) then
    raise exception 'Campaign does not belong to selected user';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Invalid rows payload';
  end if;

  create temporary table _lead_import_stage (
    row_number integer not null,
    row_json jsonb not null,
    email_raw text,
    email_normalized text,
    is_valid boolean not null default false,
    is_duplicate_in_file boolean not null default false,
    is_duplicate_existing boolean not null default false
  ) on commit drop;

  insert into _lead_import_stage (row_number, row_json, email_raw, email_normalized, is_valid)
  select
    entry.ordinality::integer,
    entry.row_json,
    entry.row_json->>'email' as email_raw,
    lower(trim(coalesce(entry.row_json->>'email', ''))) as email_normalized,
    (
      lower(trim(coalesce(entry.row_json->>'email', ''))) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    ) as is_valid
  from jsonb_array_elements(p_rows) with ordinality as entry(row_json, ordinality);

  update _lead_import_stage s
  set is_duplicate_in_file = true
  where s.is_valid
    and exists (
      select 1
      from _lead_import_stage first_row
      where first_row.email_normalized = s.email_normalized
        and first_row.is_valid
        and first_row.row_number < s.row_number
    );

  update _lead_import_stage s
  set is_duplicate_existing = true
  where s.is_valid
    and not s.is_duplicate_in_file
    and exists (
      select 1
      from public.leads l
      where l.email_normalized = s.email_normalized
    );

  select count(*) into v_total_rows from _lead_import_stage;
  select count(*) into v_valid_rows from _lead_import_stage where is_valid;
  select count(*) into v_invalid_rows from _lead_import_stage where not is_valid;
  select count(*) into v_duplicate_rows
  from _lead_import_stage
  where is_duplicate_in_file or is_duplicate_existing;

  insert into public.lead_import_batches (
    uploaded_by_admin_id,
    assigned_user_id,
    campaign_id,
    source_filename,
    total_rows,
    valid_rows,
    inserted_rows,
    duplicate_rows,
    invalid_rows
  )
  values (
    auth.uid(),
    p_assigned_user_id,
    p_campaign_id,
    p_source_filename,
    v_total_rows,
    v_valid_rows,
    0,
    v_duplicate_rows,
    v_invalid_rows
  )
  returning id into v_batch_id;

  insert into public.leads (
    batch_id,
    assigned_user_id,
    campaign_id,
    email,
    email_normalized,
    payload_json
  )
  select
    v_batch_id,
    p_assigned_user_id,
    p_campaign_id,
    s.email_raw,
    s.email_normalized,
    coalesce(s.row_json - 'email', '{}'::jsonb)
  from _lead_import_stage s
  where s.is_valid
    and not s.is_duplicate_in_file
    and not s.is_duplicate_existing;

  get diagnostics v_inserted_rows = row_count;

  insert into public.lead_import_rejections (
    batch_id,
    row_number,
    email_raw,
    reason,
    details
  )
  select
    v_batch_id,
    s.row_number,
    s.email_raw,
    case
      when s.is_duplicate_in_file or s.is_duplicate_existing then 'duplicate'
      when s.email_normalized is null or s.email_normalized = '' then 'missing_email'
      else 'invalid_email'
    end,
    jsonb_build_object(
      'duplicate_in_file', s.is_duplicate_in_file,
      'duplicate_existing', s.is_duplicate_existing,
      'payload_json', coalesce(s.row_json - 'email', '{}'::jsonb)
    )
  from _lead_import_stage s
  where not (s.is_valid and not s.is_duplicate_in_file and not s.is_duplicate_existing);

  update public.lead_import_batches
  set inserted_rows = v_inserted_rows
  where id = v_batch_id;

  select coalesce(
    jsonb_agg(sample.email_normalized),
    '[]'::jsonb
  )
  into v_duplicate_samples
  from (
    select distinct s.email_normalized
    from _lead_import_stage s
    where s.is_duplicate_in_file or s.is_duplicate_existing
    order by s.email_normalized
    limit 20
  ) sample;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'total_rows', v_total_rows,
    'valid_rows', v_valid_rows,
    'inserted_rows', v_inserted_rows,
    'duplicate_rows', v_duplicate_rows,
    'invalid_rows', v_invalid_rows,
    'duplicate_samples', v_duplicate_samples,
    'duplicate_rows_export', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'email', coalesce(nullif(s.email_raw, ''), s.email_normalized),
          'reason', case
            when s.is_duplicate_in_file then 'duplicate_in_file'
            else 'duplicate_existing'
          end,
          'payload_json', coalesce(s.row_json - 'email', '{}'::jsonb)
        )
        order by s.row_number
      )
      from _lead_import_stage s
      where s.is_duplicate_in_file or s.is_duplicate_existing
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_leads_import_confirm(uuid, bigint, text, jsonb) to authenticated;
