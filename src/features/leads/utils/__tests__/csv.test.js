import { describe, it, expect } from "vitest";
import { buildPreviewRows } from "../csv";

describe("csv preview", () => {
  it("marks duplicates within file and invalid rows", () => {
    const rows = [
      { email: "a@example.com" },
      { email: "A@example.com" },
      { email: "invalid" },
      { email: "" },
    ];

    const out = buildPreviewRows(rows);
    expect(out.summary.totalRows).toBe(4);
    expect(out.summary.inFileDuplicateRows).toBe(1);
    expect(out.summary.invalidRows).toBe(2);
    expect(out.candidateEmails).toEqual(["a@example.com"]);
  });

  it("accepts common email header aliases", () => {
    const rows = [
      { "e-mail": "Alias@Example.com" },
      { EMAIL: "second@example.com" },
    ];

    const out = buildPreviewRows(rows);

    expect(out.summary.invalidRows).toBe(0);
    expect(out.candidateEmails).toEqual([
      "alias@example.com",
      "second@example.com",
    ]);
  });
});
