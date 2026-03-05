import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../../services/supabase", () => ({
  default: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import supabase from "../../../../services/supabase";
import {
  buildLeadsCsvText,
  confirmLeadImport,
  downloadAcceptedLeadsCsv,
  downloadDuplicateLeadsCsv,
  getLeadBatchDuplicateRows,
  previewLeadImport,
} from "../../../../services/leadsApi";

describe("leadsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls preview rpc with payload", async () => {
    supabase.rpc.mockResolvedValue({ data: { duplicate_count: 2 }, error: null });

    const out = await previewLeadImport({
      assignedUserId: "u1",
      campaignId: 1,
      emails: ["a@example.com"],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("admin_leads_import_preview", {
      p_assigned_user_id: "u1",
      p_campaign_id: 1,
      p_emails: ["a@example.com"],
    });
    expect(out.duplicate_count).toBe(2);
  });

  it("calls confirm rpc with payload and returns duplicate export rows", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        batch_id: 9,
        inserted_rows: 2,
        duplicate_rows_export: [
          {
            email: "dup@example.com",
            reason: "duplicate_existing",
            payload_json: { name: "Dup" },
          },
        ],
      },
      error: null,
    });

    const out = await confirmLeadImport({
      assignedUserId: "u1",
      campaignId: 3,
      sourceFilename: "leads.csv",
      rows: [{ email: "dup@example.com", name: "Dup" }],
    });

    expect(supabase.rpc).toHaveBeenCalledWith("admin_leads_import_confirm", {
      p_assigned_user_id: "u1",
      p_campaign_id: 3,
      p_source_filename: "leads.csv",
      p_rows: [{ email: "dup@example.com", name: "Dup" }],
    });
    expect(out.duplicate_rows_export).toHaveLength(1);
    expect(out.duplicate_rows_export[0].reason).toBe("duplicate_existing");
  });

  it("builds duplicate csv with reason column", () => {
    const csv = buildLeadsCsvText(
      [
        {
          email: "dup@example.com",
          reason: "duplicate_existing",
          payload_json: { name: "Dup" },
        },
      ],
      { includeReason: true }
    );

    const [header, firstRow] = csv.split("\n");
    expect(header).toBe("email,reason,name");
    expect(firstRow).toContain('"dup@example.com"');
    expect(firstRow).toContain('"duplicate_existing"');
    expect(firstRow).toContain('"Dup"');
  });

  it("downloads accepted leads csv with provided filename", () => {
    const realCreateElement = document.createElement.bind(document);
    const click = vi.fn();
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName) => {
        const node = realCreateElement(tagName);
        if (tagName === "a") node.click = click;
        return node;
      });
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:accepted");
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    downloadAcceptedLeadsCsv(
      [{ email: "new@example.com", payload_json: { name: "New Lead" } }],
      { filename: "accepted.csv" }
    );

    const anchor = createElementSpy.mock.results.find(
      (result) => result.value?.tagName === "A"
    )?.value;

    expect(anchor.download).toBe("accepted.csv");
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:accepted");
  });

  it("downloads duplicate leads csv with reason column", async () => {
    const realCreateElement = document.createElement.bind(document);
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const node = realCreateElement(tagName);
      if (tagName === "a") node.click = click;
      return node;
    });
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:duplicates");
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    downloadDuplicateLeadsCsv(
      [
        {
          email: "dup@example.com",
          reason: "duplicate_existing",
          payload_json: { name: "Dup Lead" },
        },
      ],
      { filename: "duplicates.csv" }
    );

    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    const csvText = await blobArg.text();
    expect(csvText.split("\n")[0]).toBe("email,reason,name");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:duplicates");
  });

  it("returns mapped duplicate rows for a lead batch", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          email_raw: "dup1@example.com",
          details: {
            duplicate_in_file: true,
            duplicate_existing: false,
            payload_json: { name: "Dup 1", phone: "111" },
          },
        },
        {
          email_raw: "dup2@example.com",
          details: {
            duplicate_in_file: false,
            duplicate_existing: true,
            payload_json: { name: "Dup 2" },
          },
        },
      ],
      error: null,
    });
    const eqReason = vi.fn().mockReturnValue({ order });
    const eqBatch = vi.fn().mockReturnValue({ eq: eqReason, order });
    const select = vi.fn().mockReturnValue({ eq: eqBatch });
    supabase.from.mockReturnValue({ select });

    const rows = await getLeadBatchDuplicateRows(77);

    expect(supabase.from).toHaveBeenCalledWith("lead_import_rejections");
    expect(select).toHaveBeenCalledWith("email_raw, details, row_number");
    expect(eqBatch).toHaveBeenCalledWith("batch_id", 77);
    expect(eqReason).toHaveBeenCalledWith("reason", "duplicate");
    expect(rows).toEqual([
      {
        email: "dup1@example.com",
        reason: "duplicate_in_file",
        payload_json: { name: "Dup 1", phone: "111" },
      },
      {
        email: "dup2@example.com",
        reason: "duplicate_existing",
        payload_json: { name: "Dup 2" },
      },
    ]);
  });
});
