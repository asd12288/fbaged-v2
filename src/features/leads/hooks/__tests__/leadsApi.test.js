import { describe, it, expect, vi, beforeEach } from "vitest";

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
  previewLeadImport,
} from "../../../../services/leadsApi";

describe("leadsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
