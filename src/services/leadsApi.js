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

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  const escaped = stringValue.replaceAll('"', '""');
  return `"${escaped}"`;
}

export async function downloadLeadBatchCsv(batchId, { filename } = {}) {
  const { data, error } = await supabase
    .from("leads")
    .select("email, payload_json")
    .eq("batch_id", batchId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    throw new Error("No leads found for this batch");
  }

  const payloadKeys = Array.from(
    data.reduce((keys, row) => {
      Object.keys(row.payload_json || {}).forEach((key) => keys.add(key));
      return keys;
    }, new Set())
  );

  const headers = ["email", ...payloadKeys];
  const lines = [
    headers.join(","),
    ...data.map((row) =>
      [
        escapeCsvValue(row.email),
        ...payloadKeys.map((key) => escapeCsvValue(row.payload_json?.[key])),
      ].join(",")
    ),
  ];

  const csvText = lines.join("\n");
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `lead-batch-${batchId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
