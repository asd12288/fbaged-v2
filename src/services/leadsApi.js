import supabase from "./supabase";

const PAGE_SIZE = 1000;
const LEAD_IMPORT_FILES_BUCKET = "lead-import-files";

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

function buildCsvBlob(csvText) {
  return new Blob([csvText], { type: "text/csv;charset=utf-8;" });
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
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

  const result = {
    ...data,
    clean_file_path: null,
    duplicate_file_path: null,
    storage_warning: null,
  };

  try {
    const acceptedRows = await getLeadBatchAcceptedRows(data.batch_id);
    const basePath = `users/${assignedUserId}/batches/${data.batch_id}`;
    const cleanFilePath = `${basePath}/clean.csv`;
    const duplicateFilePath = data?.duplicate_rows_export?.length
      ? `${basePath}/duplicates.csv`
      : null;

    const cleanUpload = await supabase.storage
      .from(LEAD_IMPORT_FILES_BUCKET)
      .upload(cleanFilePath, buildCsvBlob(buildLeadsCsvText(acceptedRows)), {
        contentType: "text/csv;charset=utf-8;",
        upsert: true,
      });

    if (cleanUpload.error) throw new Error(cleanUpload.error.message);

    if (duplicateFilePath) {
      const duplicateUpload = await supabase.storage
        .from(LEAD_IMPORT_FILES_BUCKET)
        .upload(
          duplicateFilePath,
          buildCsvBlob(
            buildLeadsCsvText(data.duplicate_rows_export || [], {
              includeReason: true,
            })
          ),
          {
            contentType: "text/csv;charset=utf-8;",
            upsert: true,
          }
        );

      if (duplicateUpload.error) throw new Error(duplicateUpload.error.message);
    }

    const { data: updatedBatch, error: updateError } = await supabase
      .from("lead_import_batches")
      .update({
        clean_file_path: cleanFilePath,
        duplicate_file_path: duplicateFilePath,
      })
      .eq("id", data.batch_id)
      .select("clean_file_path, duplicate_file_path")
      .single();

    if (updateError) throw new Error(updateError.message);

    result.clean_file_path = updatedBatch.clean_file_path;
    result.duplicate_file_path = updatedBatch.duplicate_file_path;
  } catch (storageError) {
    result.storage_warning =
      storageError.message ||
      "Import succeeded, but could not save generated files to storage";
  }

  return result;
}

export async function getLeadBatches({ assignedUserId } = {}) {
  return fetchAllPages((from, to) => {
    let query = supabase.from("lead_import_batches").select(
      "id, created_at, source_filename, inserted_rows, duplicate_rows, invalid_rows, campaign_id, assigned_user_id, clean_file_path, duplicate_file_path, campaign:campaigns(id, campaignName)"
    );

    if (assignedUserId) {
      query = query.eq("assigned_user_id", assignedUserId);
    }

    return query.order("created_at", { ascending: false }).range(from, to);
  });
}

async function getLeadBatchAcceptedRows(batchId) {
  return fetchAllPages((from, to) =>
    supabase
      .from("leads")
      .select("email, payload_json")
      .eq("batch_id", batchId)
      .order("id", { ascending: true })
      .range(from, to)
  );
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
  triggerBlobDownload(buildCsvBlob(csvText), filename);
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
  const data = await getLeadBatchAcceptedRows(batchId);

  if (!data?.length) {
    throw new Error("No leads found for this batch");
  }

  const csvText = buildLeadsCsvText(data);
  triggerCsvDownload(csvText, filename || `lead-batch-${batchId}.csv`);
}

export async function downloadStoredLeadFile({ path, filename }) {
  const { data, error } = await supabase.storage
    .from(LEAD_IMPORT_FILES_BUCKET)
    .createSignedUrl(path, 60);

  if (error) {
    throw new Error(error.message);
  }

  const response = await fetch(data.signedUrl);

  if (!response.ok) {
    throw new Error("Could not download stored lead file");
  }

  const blob = await response.blob();
  triggerBlobDownload(blob, filename);
}
