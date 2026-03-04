import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../services/supabase", () => ({
  default: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import supabase from "../../../../services/supabase";
import { previewLeadImport } from "../../../../services/leadsApi";

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
});
