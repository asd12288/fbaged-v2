export const CANONICAL_EXPORT_HEADERS = [
  "full name",
  "email",
  "tel",
  "answer",
  "date",
  "campaign",
];

export function normalizeFieldKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
}

export function buildAliasSet(values) {
  return new Set(values.map((value) => normalizeFieldKey(value)));
}

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

export function stringifyCell(value) {
  return String(value ?? "").trim();
}

export function getRowEntries(row) {
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

export function findValueByAliases(entries, aliases) {
  return findEntryByAliases(entries, aliases)?.value || "";
}

export function buildFullName(entries) {
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

export function buildAnswer(entries) {
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

export function buildCampaign(entries, fallbackCampaignName) {
  const explicitCampaign = findValueByAliases(entries, CAMPAIGN_ALIASES);
  if (explicitCampaign) return explicitCampaign;

  const mirroredLabel = entries.find(
    (entry) => !isSystemFieldEntry(entry) && isMirroredLabelEntry(entry)
  );
  if (mirroredLabel) return mirroredLabel.value;

  return stringifyCell(fallbackCampaignName);
}

export function mapLeadRowToExportRow(row, { campaignName } = {}) {
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
