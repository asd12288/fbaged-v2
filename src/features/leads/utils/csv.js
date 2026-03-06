import { isValidEmail, normalizeEmail } from "./email";

const CANONICAL_EMAIL_HEADER = "email";

export function normalizeCsvHeader(header) {
  const normalizedHeader = String(header ?? "").trim().toLowerCase();
  const collapsedHeader = normalizedHeader.replace(/[^a-z]/g, "");

  if (
    collapsedHeader === CANONICAL_EMAIL_HEADER ||
    collapsedHeader === "emailaddress"
  ) {
    return CANONICAL_EMAIL_HEADER;
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
