import supabase from "./supabase";

export async function listSimClients() {
  const { data, error } = await supabase.rpc("admin_sim_clients_list");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertSimClient({
  id = null,
  name,
  webhookUrl,
  httpMethod = "POST",
  contentType = "application/json",
  fieldMapping,
  customHeaders = {},
  timezone = "Europe/Paris",
  sendWindowStart = "08:00",
  sendWindowEnd = "21:00",
  skipWeekends = false,
  defaultDailyVolume = 25,
  authSecret = null,
}) {
  const { data, error } = await supabase.rpc("admin_sim_client_upsert", {
    p_id: id,
    p_name: name,
    p_webhook_url: webhookUrl,
    p_http_method: httpMethod,
    p_content_type: contentType,
    p_field_mapping: fieldMapping,
    p_custom_headers: customHeaders,
    p_timezone: timezone,
    p_send_window_start: sendWindowStart,
    p_send_window_end: sendWindowEnd,
    p_skip_weekends: skipWeekends,
    p_default_daily_volume: defaultDailyVolume,
    p_auth_secret: authSecret,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveSimClient(id) {
  const { error } = await supabase.rpc("admin_sim_client_archive", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function previewSimDrip({ clientId, emails }) {
  const { data, error } = await supabase.rpc("admin_sim_drip_preview", {
    p_client_id: clientId,
    p_emails: emails,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createSimDrip({
  clientId,
  name,
  sourceFilename,
  dailyVolume,
  rows,
}) {
  const { data, error } = await supabase.rpc("admin_sim_drip_create", {
    p_client_id: clientId,
    p_name: name,
    p_source_filename: sourceFilename,
    p_daily_volume: dailyVolume,
    p_rows: rows,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function listSimDrips({ clientId = null } = {}) {
  const { data, error } = await supabase.rpc("admin_sim_drips_list", {
    p_client_id: clientId,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSimDrip({ dripId }) {
  const { data, error } = await supabase.rpc("admin_sim_drip_get", {
    p_drip_id: dripId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function listSimDripLeads({
  dripId,
  status = null,
  limit = 100,
  offset = 0,
}) {
  const { data, error } = await supabase.rpc("admin_sim_drip_leads", {
    p_drip_id: dripId,
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function setSimDripStatus({ dripId, action }) {
  const { data, error } = await supabase.rpc("admin_sim_drip_set_status", {
    p_drip_id: dripId,
    p_action: action,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSimDripPace({ dripId, dailyVolume }) {
  const { data, error } = await supabase.rpc("admin_sim_drip_update_pace", {
    p_drip_id: dripId,
    p_daily_volume: dailyVolume,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function retrySimDripLead({ leadId }) {
  const { data, error } = await supabase.rpc("admin_sim_drip_retry_lead", {
    p_lead_id: leadId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function runSimDelivery() {
  const { data, error } = await supabase.rpc("admin_sim_run_delivery");
  if (error) throw new Error(error.message);
  return data;
}

export async function getSimSettings() {
  const { data, error } = await supabase.rpc("admin_sim_get_settings");
  if (error) throw new Error(error.message);
  return data;
}

export async function setSimDryRun({ dryRun }) {
  const { data, error } = await supabase.rpc("admin_sim_set_dry_run", {
    p_dry_run: dryRun,
  });
  if (error) throw new Error(error.message);
  return data;
}
