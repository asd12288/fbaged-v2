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
