import supabase from "./supabase";
import Papa from "papaparse";

const PAGE_SIZE = 1000;
const LEAD_IMPORT_FILES_BUCKET = "lead-import-files";
const CANONICAL_EXPORT_HEADERS = [
  "full name",
  "email",
  "tel",
  "answer",
  "date",
  "campaign",
];

const FULL_NAME_ALIASES = buildAliasSet([
  "full name",
  "full_name",
  "fullname",
  "name",
  "contact name",
  "contact_name",
  "nom complet",
  "nom_complet",
]);
const FIRST_NAME_ALIASES = buildAliasSet([
  "first name",
  "first_name",
  "firstname",
  "prenom",
  "prénom",
]);
const LAST_NAME_ALIASES = buildAliasSet([
  "last name",
  "last_name",
  "lastname",
  "nom",
  "surname",
  "family name",
  "family_name",
  "nom de famille",
  "nom_de_famille",
]);
const PHONE_ALIASES = buildAliasSet([
  "tel",
  "telephone",
  "telephone num",
  "telephone number",
  "phone",
  "phone number",
  "phone_number",
  "mobile",
  "mobile phone",
  "mobile_number",
  "numero de telephone",
  "numero_de_telephone",
  "numéro de téléphone",
  "numéro_de_téléphone",
  "portable",
]);
const DATE_ALIASES = buildAliasSet([
  "date",
  "created_time",
  "created at",
  "created_at",
  "submitted at",
  "submitted_at",
  "submission time",
  "submission_time",
]);
const CAMPAIGN_ALIASES = buildAliasSet([
  "campaign",
  "campaign name",
  "campaign_name",
  "campaignname",
  "campaign title",
  "campaign_title",
  "ad campaign",
  "ad_campaign",
  "form name",
  "form_name",
  "lead form",
  "lead_form",
]);
const ANSWER_ALIASES = buildAliasSet([
  "answer",
  "response",
  "reply",
  "lead answer",
  "lead_answer",
]);
const SYSTEM_FIELD_ALIASES = buildAliasSet([
  "email",
  "e_mail",
  "mail",
  "id",
  "lead id",
  "lead_id",
  "form id",
  "form_id",
  "ad id",
  "ad_id",
  "adset id",
  "adset_id",
  "campaign id",
  "campaign_id",
  "platform",
  "source",
  "utm source",
  "utm_source",
  "utm medium",
  "utm_medium",
  "utm campaign",
  "utm_campaign",
  "fbclid",
  "gclid",
]);

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

function normalizeFieldKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildAliasSet(values) {
  return new Set(values.map((value) => normalizeFieldKey(value)));
}

function stringifyCell(value) {
  return String(value ?? "").trim();
}

function getRowEntries(row) {
  const payloadEntries =
    row?.payload_json && typeof row.payload_json === "object"
      ? Object.entries(row.payload_json)
      : [];
  const topLevelEntries = Object.entries(row || {}).filter(
    ([key]) => !["payload_json", "email", "reason"].includes(key)
  );
  const combinedEntries = [
    ...payloadEntries,
    ...topLevelEntries.filter(
      ([key]) => !payloadEntries.some(([payloadKey]) => payloadKey === key)
    ),
  ];

  return combinedEntries
    .map(([key, value]) => ({
      key,
      normalizedKey: normalizeFieldKey(key),
      value: stringifyCell(value),
    }))
    .filter((entry) => entry.value !== "");
}

function findEntryByAliases(entries, aliases) {
  return entries.find((entry) => aliases.has(entry.normalizedKey)) || null;
}

function findValueByAliases(entries, aliases) {
  return findEntryByAliases(entries, aliases)?.value || "";
}

function buildFullName(entries) {
  const explicitName = findValueByAliases(entries, FULL_NAME_ALIASES);
  if (explicitName) return explicitName;

  return [findValueByAliases(entries, FIRST_NAME_ALIASES), findValueByAliases(entries, LAST_NAME_ALIASES)]
    .filter(Boolean)
    .join(" ");
}

function isMirroredLabelEntry(entry) {
  if (!entry?.value) return false;
  return normalizeFieldKey(entry.value) === entry.normalizedKey;
}

function isSystemFieldEntry(entry) {
  const key = entry.normalizedKey;

  if (
    FULL_NAME_ALIASES.has(key) ||
    FIRST_NAME_ALIASES.has(key) ||
    LAST_NAME_ALIASES.has(key) ||
    PHONE_ALIASES.has(key) ||
    DATE_ALIASES.has(key) ||
    CAMPAIGN_ALIASES.has(key) ||
    ANSWER_ALIASES.has(key) ||
    SYSTEM_FIELD_ALIASES.has(key)
  ) {
    return true;
  }

  return (
    key === "email" ||
    key.endsWith("_id") ||
    key.startsWith("utm_") ||
    key.includes("tracking") ||
    key.includes("timestamp") ||
    key.includes("created") ||
    key.includes("submitted")
  );
}

function scoreAnswerEntry(entry) {
  let score = 0;
  const key = entry.normalizedKey;

  if (
    /(answer|response|reply|question|qualif|niveau|level|goal|objectif|interest|interet|pourquoi|comment|quel|quelle|combien|what|which|how|why|when|where)/.test(
      key
    )
  ) {
    score += 5;
  }

  if (key.includes("_")) score += 1;
  if (key.length >= 20) score += 2;
  if (entry.value.length >= 4) score += 1;
  if (isMirroredLabelEntry(entry)) score -= 3;

  return score;
}

function buildAnswer(entries) {
  const explicitAnswer = findValueByAliases(entries, ANSWER_ALIASES);
  if (explicitAnswer) return explicitAnswer;

  const candidateEntries = entries.filter(
    (entry) => !isSystemFieldEntry(entry) && !isMirroredLabelEntry(entry)
  );

  if (!candidateEntries.length) return "";

  return candidateEntries
    .slice()
    .sort((left, right) => {
      const scoreDelta = scoreAnswerEntry(right) - scoreAnswerEntry(left);
      if (scoreDelta !== 0) return scoreDelta;
      return right.normalizedKey.length - left.normalizedKey.length;
    })[0].value;
}

function buildCampaign(entries, fallbackCampaignName) {
  const explicitCampaign = findValueByAliases(entries, CAMPAIGN_ALIASES);
  if (explicitCampaign) return explicitCampaign;

  const mirroredLabel = entries.find(
    (entry) => !isSystemFieldEntry(entry) && isMirroredLabelEntry(entry)
  );
  if (mirroredLabel) return mirroredLabel.value;

  return stringifyCell(fallbackCampaignName);
}

function mapLeadRowToExportRow(row, { campaignName } = {}) {
  const entries = getRowEntries(row);

  return {
    "full name": buildFullName(entries),
    email: stringifyCell(row?.email),
    tel: findValueByAliases(entries, PHONE_ALIASES),
    answer: buildAnswer(entries),
    date: findValueByAliases(entries, DATE_ALIASES),
    campaign: buildCampaign(entries, campaignName),
    reason: stringifyCell(row?.reason),
  };
}

function parseStoredLeadRows(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    throw new Error("Could not parse stored lead file");
  }

  return parsed.data || [];
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
  campaignName,
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
      .upload(
        cleanFilePath,
        buildCsvBlob(buildLeadsCsvText(acceptedRows, { campaignName })),
        {
          contentType: "text/csv;charset=utf-8;",
          upsert: true,
        }
      );

    if (cleanUpload.error) throw new Error(cleanUpload.error.message);

    if (duplicateFilePath) {
      const duplicateUpload = await supabase.storage
        .from(LEAD_IMPORT_FILES_BUCKET)
        .upload(
          duplicateFilePath,
          buildCsvBlob(
            buildLeadsCsvText(data.duplicate_rows_export || [], {
              includeReason: true,
              campaignName,
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

export function buildLeadsCsvText(
  rows,
  { includeReason = false, campaignName } = {}
) {
  const headers = [
    ...CANONICAL_EXPORT_HEADERS,
    ...(includeReason ? ["reason"] : []),
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) => {
      const exportRow = mapLeadRowToExportRow(row, { campaignName });
      return headers.map((header) => escapeCsvValue(exportRow[header])).join(",");
    }),
  ];

  return lines.join("\n");
}

function triggerCsvDownload(csvText, filename) {
  triggerBlobDownload(buildCsvBlob(csvText), filename);
}

export function downloadAcceptedLeadsCsv(
  rows,
  { filename, campaignName } = {}
) {
  const csvText = buildLeadsCsvText(rows, { campaignName });
  triggerCsvDownload(csvText, filename || "accepted-leads.csv");
}

export function downloadDuplicateLeadsCsv(rows, { filename, campaignName } = {}) {
  const csvText = buildLeadsCsvText(rows, {
    includeReason: true,
    campaignName,
  });
  triggerCsvDownload(csvText, filename || "duplicate-leads.csv");
}

export async function downloadLeadBatchCsv(batchId, { filename, campaignName } = {}) {
  const data = await getLeadBatchAcceptedRows(batchId);

  if (!data?.length) {
    throw new Error("No leads found for this batch");
  }

  const csvText = buildLeadsCsvText(data, { campaignName });
  triggerCsvDownload(csvText, filename || `lead-batch-${batchId}.csv`);
}

export async function downloadStoredLeadFile({
  path,
  filename,
  campaignName,
  includeReason = false,
}) {
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

  const csvText = await response.text();
  const rows = parseStoredLeadRows(csvText);
  triggerCsvDownload(
    buildLeadsCsvText(rows, { includeReason, campaignName }),
    filename
  );
}
