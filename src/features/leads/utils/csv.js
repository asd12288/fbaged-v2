import { isValidEmail, normalizeEmail } from "./email";

const CANONICAL_EMAIL_HEADER = "email";
const CANONICAL_HEADER_ALIASES = new Map([
  ["email", buildAliasSet(["email", "email address", "e-mail"])],
  ["full_name", buildAliasSet(["full name", "full_name", "fullname", "name", "contact name", "contact_name", "nom complet", "nom_complet"])],
  ["first_name", buildAliasSet(["first name", "first_name", "firstname", "prenom", "prénom"])],
  ["last_name", buildAliasSet(["last name", "last_name", "lastname", "nom", "surname", "family name", "family_name", "nom de famille", "nom_de_famille"])],
  ["phone", buildAliasSet(["tel", "telephone", "telephone num", "telephone number", "phone", "phone number", "phone_number", "mobile", "mobile phone", "mobile_number", "numero de telephone", "numero_de_telephone", "numéro de téléphone", "numéro_de_téléphone", "portable"])],
  ["answer", buildAliasSet(["answer", "response", "reply", "lead answer", "lead_answer", "quel_est_votre_niveau_d_experience_en_bourse", "quelle_est_votre_situation_vis_a_vis_des_cryptomonnaies"])],
  ["source_label", buildAliasSet(["dass achat", "crypto explication"])],
]);

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

export function normalizeCsvHeader(header) {
  const normalizedHeader = String(header ?? "").trim().toLowerCase();
  const normalizedKey = normalizeFieldKey(header);

  for (const [canonicalHeader, aliases] of CANONICAL_HEADER_ALIASES) {
    if (aliases.has(normalizedKey)) return canonicalHeader;
  }

  return normalizedHeader;
}

export function hasEmailColumn(fields = []) {
  return fields.some(
    (field) => normalizeCsvHeader(field) === CANONICAL_EMAIL_HEADER
  );
}

function getRawEmailValue(row) {
  if (!row || typeof row !== "object") return "";
  if (CANONICAL_EMAIL_HEADER in row) return row[CANONICAL_EMAIL_HEADER];

  const emailEntry = Object.entries(row).find(
    ([key]) => normalizeCsvHeader(key) === CANONICAL_EMAIL_HEADER
  );

  return emailEntry?.[1] ?? "";
}

export function buildPreviewRows(rawRows) {
  const seen = new Set();
  const processedRows = [];

  for (const [index, row] of rawRows.entries()) {
    const rawEmail = getRawEmailValue(row);
    const email = normalizeEmail(rawEmail);

    if (!email || !isValidEmail(email)) {
      processedRows.push({
        rowNumber: index + 1,
        email: rawEmail,
        status: "invalid_email",
      });
      continue;
    }

    if (seen.has(email)) {
      processedRows.push({
        rowNumber: index + 1,
        email,
        status: "duplicate_in_file",
      });
      continue;
    }

    seen.add(email);
    processedRows.push({
      rowNumber: index + 1,
      email,
      status: "candidate",
    });
  }

  return {
    processedRows,
    candidateEmails: processedRows
      .filter((entry) => entry.status === "candidate")
      .map((entry) => entry.email),
    summary: {
      totalRows: rawRows.length,
      inFileDuplicateRows: processedRows.filter(
        (entry) => entry.status === "duplicate_in_file"
      ).length,
      invalidRows: processedRows.filter(
        (entry) => entry.status === "invalid_email"
      ).length,
    },
  };
}
