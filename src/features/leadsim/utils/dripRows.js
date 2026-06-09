import { mapLeadRowToExportRow } from "../../../services/leadNormalization";

/**
 * Build the rows payload for `admin_sim_drip_create` from parsed CSV rows:
 * `[{ email, canonical: { full_name, tel, answer, date, campaign }, raw: {...row} }]`.
 *
 * Canonical extraction reuses `mapLeadRowToExportRow` from
 * `src/services/leadNormalization.js`; empty canonical values are dropped.
 * The create RPC stores `row - 'email'` into `payload_json`, so
 * `payload_json = { canonical, raw }` and `email` lives in its own column.
 */
export function buildDripRows(parsedCsvRows) {
  return (parsedCsvRows || []).map((row) => {
    const exportRow = mapLeadRowToExportRow({ email: row.email, payload_json: row }, {});
    const candidate = {
      full_name: exportRow["full name"],
      tel: exportRow.tel,
      answer: exportRow.answer,
      date: exportRow.date,
      campaign: exportRow.campaign,
    };
    const canonical = {};
    for (const [key, value] of Object.entries(candidate)) {
      if (value) canonical[key] = value;
    }
    return { email: row.email, canonical, raw: { ...row } };
  });
}
