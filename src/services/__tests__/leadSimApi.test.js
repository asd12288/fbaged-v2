import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("../supabase", () => ({ default: { rpc: (...a) => rpc(...a) } }));

import { listSimClients, upsertSimClient, archiveSimClient } from "../leadSimApi";

beforeEach(() => rpc.mockReset());

describe("leadSimApi", () => {
  it("listSimClients returns rows", async () => {
    rpc.mockResolvedValue({ data: [{ id: "1", name: "Acme" }], error: null });
    const rows = await listSimClients();
    expect(rpc).toHaveBeenCalledWith("admin_sim_clients_list");
    expect(rows).toEqual([{ id: "1", name: "Acme" }]);
  });

  it("upsertSimClient maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { id: "1" }, error: null });
    await upsertSimClient({
      id: null,
      name: "Acme",
      webhookUrl: "https://hook",
      fieldMapping: { fields: { email: "Email" }, constants: {} },
      authSecret: "tok",
    });
    expect(rpc).toHaveBeenCalledWith(
      "admin_sim_client_upsert",
      expect.objectContaining({
        p_id: null,
        p_name: "Acme",
        p_webhook_url: "https://hook",
        p_field_mapping: { fields: { email: "Email" }, constants: {} },
        p_auth_secret: "tok",
      })
    );
  });

  it("throws on rpc error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(listSimClients()).rejects.toThrow("boom");
  });

  it("archiveSimClient passes id", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await archiveSimClient("abc");
    expect(rpc).toHaveBeenCalledWith("admin_sim_client_archive", { p_id: "abc" });
  });
});
