import supabase from "./supabase";

const PAGE_SIZE = 1000;

async function fetchAllPages(buildQuery) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const pageRows = data || [];
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

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
  return fetchAllPages((from, to) => {
    let query = supabase.from("lead_import_batches").select(
      "id, created_at, source_filename, inserted_rows, duplicate_rows, invalid_rows, campaign_id, assigned_user_id, campaign:campaigns(id, campaignName)"
    );

    if (assignedUserId) {
      query = query.eq("assigned_user_id", assignedUserId);
    }

    return query.order("created_at", { ascending: false }).range(from, to);
  });
}

export async function getLeadBatchDuplicateRows(batchId) {
  const data = await fetchAllPages((from, to) =>
    supabase
      .from("lead_import_rejections")
      .select("email_raw, details, row_number")
      .eq("batch_id", batchId)
      .eq("reason", "duplicate")
      .order("row_number", { ascending: true })
      .range(from, to)
  );

  return (data || []).map((row) => ({
    email: row.email_raw || "",
    reason: row?.details?.duplicate_in_file
      ? "duplicate_in_file"
      : "duplicate_existing",
    payload_json: row?.details?.payload_json || {},
  }));
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  const escaped = stringValue.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function buildLeadsCsvText(rows, { includeReason = false } = {}) {
  const payloadKeys = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row.payload_json || {}).forEach((key) => keys.add(key));
      return keys;
    }, new Set())
  );

  const headers = ["email", ...(includeReason ? ["reason"] : []), ...payloadKeys];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        escapeCsvValue(row.email),
        ...(includeReason ? [escapeCsvValue(row.reason)] : []),
        ...payloadKeys.map((key) => escapeCsvValue(row.payload_json?.[key])),
      ].join(",")
    ),
  ];

  return lines.join("\n");
}

function triggerCsvDownload(csvText, filename) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function downloadAcceptedLeadsCsv(rows, { filename }) {
  const csvText = buildLeadsCsvText(rows, { includeReason: false });
  triggerCsvDownload(csvText, filename || "accepted-leads.csv");
}

export function downloadDuplicateLeadsCsv(rows, { filename }) {
  const csvText = buildLeadsCsvText(rows, { includeReason: true });
  triggerCsvDownload(csvText, filename || "duplicate-leads.csv");
}

export async function downloadLeadBatchCsv(batchId, { filename } = {}) {
  const data = await fetchAllPages((from, to) =>
    supabase
      .from("leads")
      .select("email, payload_json")
      .eq("batch_id", batchId)
      .order("id", { ascending: true })
      .range(from, to)
  );

  if (!data?.length) {
    throw new Error("No leads found for this batch");
  }

  const csvText = buildLeadsCsvText(data);
  triggerCsvDownload(csvText, filename || `lead-batch-${batchId}.csv`);
}
