import supabase from "./supabase";

export async function previewLeadImport({ assignedUserId, campaignId, emails }) {
  const { data, error } = await supabase.rpc("admin_leads_import_preview", {
    p_assigned_user_id: assignedUserId,
    p_campaign_id: campaignId,
    p_emails: emails,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function confirmLeadImport({
  assignedUserId,
  campaignId,
  sourceFilename,
  rows,
}) {
  const { data, error } = await supabase.rpc("admin_leads_import_confirm", {
    p_assigned_user_id: assignedUserId,
    p_campaign_id: campaignId,
    p_source_filename: sourceFilename,
    p_rows: rows,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getLeadBatches({ assignedUserId } = {}) {
  let query = supabase
    .from("lead_import_batches")
    .select(
      "id, created_at, source_filename, inserted_rows, duplicate_rows, invalid_rows, campaign_id, assigned_user_id, campaign:campaigns(id, campaignName)"
    )
    .order("created_at", { ascending: false });

  if (assignedUserId) {
    query = query.eq("assigned_user_id", assignedUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
