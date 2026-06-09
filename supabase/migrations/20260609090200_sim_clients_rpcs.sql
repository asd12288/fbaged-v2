-- List clients (no secret material returned).
create or replace function public.admin_sim_clients_list()
returns setof public.sim_clients
language sql
security definer
set search_path = public
as $$
  select * from public.sim_clients
  where public.is_admin() and not is_archived
  order by created_at desc;
$$;

grant execute on function public.admin_sim_clients_list() to authenticated;

-- Create or update a client. p_id null => insert. p_auth_secret null => leave secret unchanged.
create or replace function public.admin_sim_client_upsert(
  p_id uuid,
  p_name text,
  p_webhook_url text,
  p_http_method text,
  p_content_type text,
  p_field_mapping jsonb,
  p_custom_headers jsonb,
  p_timezone text,
  p_send_window_start time,
  p_send_window_end time,
  p_skip_weekends boolean,
  p_default_daily_volume integer,
  p_auth_secret text
)
returns public.sim_clients
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_row public.sim_clients;
  v_secret_ref uuid;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  if p_id is null then
    insert into public.sim_clients (
      created_by, name, webhook_url, http_method, content_type,
      field_mapping, custom_headers, timezone, send_window_start,
      send_window_end, skip_weekends, default_daily_volume
    ) values (
      auth.uid(), p_name, p_webhook_url, coalesce(p_http_method, 'POST'),
      coalesce(p_content_type, 'application/json'),
      coalesce(p_field_mapping, '{"fields":{},"constants":{}}'::jsonb),
      coalesce(p_custom_headers, '{}'::jsonb),
      coalesce(p_timezone, 'Europe/Paris'),
      coalesce(p_send_window_start, '08:00'),
      coalesce(p_send_window_end, '21:00'),
      coalesce(p_skip_weekends, false),
      coalesce(p_default_daily_volume, 25)
    )
    returning * into v_row;
  else
    update public.sim_clients set
      name = p_name,
      webhook_url = p_webhook_url,
      http_method = coalesce(p_http_method, http_method),
      content_type = coalesce(p_content_type, content_type),
      field_mapping = coalesce(p_field_mapping, field_mapping),
      custom_headers = coalesce(p_custom_headers, custom_headers),
      timezone = coalesce(p_timezone, timezone),
      send_window_start = coalesce(p_send_window_start, send_window_start),
      send_window_end = coalesce(p_send_window_end, send_window_end),
      skip_weekends = coalesce(p_skip_weekends, skip_weekends),
      default_daily_volume = coalesce(p_default_daily_volume, default_daily_volume)
    where id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'Client not found';
    end if;
  end if;

  if p_auth_secret is not null and length(p_auth_secret) > 0 then
    if v_row.auth_secret_ref is null then
      v_secret_ref := vault.create_secret(
        p_auth_secret,
        'sim_client_' || v_row.id::text,
        'Auth secret for sim client ' || v_row.name
      );
      update public.sim_clients set auth_secret_ref = v_secret_ref
        where id = v_row.id
        returning * into v_row;
    else
      perform vault.update_secret(v_row.auth_secret_ref, p_auth_secret);
    end if;
  end if;

  return v_row;
end;
$$;

grant execute on function public.admin_sim_client_upsert(
  uuid, text, text, text, text, jsonb, jsonb, text, time, time, boolean, integer, text
) to authenticated;

-- Soft-delete.
create or replace function public.admin_sim_client_archive(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;
  update public.sim_clients set is_archived = true where id = p_id;
end;
$$;

grant execute on function public.admin_sim_client_archive(uuid) to authenticated;
