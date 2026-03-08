import { describe, it, expect } from "vitest";
import { buildPreviewRows, normalizeCsvHeader } from "../csv";

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

  it("normalizes french lead headers from meta exports", () => {
    expect(normalizeCsvHeader("nom_complet")).toBe("full_name");
    expect(normalizeCsvHeader("prénom")).toBe("first_name");
    expect(normalizeCsvHeader("nom_de_famille")).toBe("last_name");
    expect(normalizeCsvHeader("numéro_de_téléphone")).toBe("phone");
    expect(
      normalizeCsvHeader("quel_est_votre_niveau_d’expérience_en_bourse_?_📈")
    ).toBe("answer");
    expect(
      normalizeCsvHeader("❓_quelle_est_votre_situation_vis-à-vis_des_cryptomonnaies_?")
    ).toBe("answer");
    expect(normalizeCsvHeader("DASS ACHAT")).toBe("source_label");
    expect(normalizeCsvHeader("CRYPTO EXPLICATION")).toBe("source_label");
  });
});
