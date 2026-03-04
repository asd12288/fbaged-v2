import { isValidEmail, normalizeEmail } from "./email";

export function buildPreviewRows(rawRows) {
  const seen = new Set();
  const processedRows = [];

  for (const [index, row] of rawRows.entries()) {
    const rawEmail = row?.email ?? "";
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
