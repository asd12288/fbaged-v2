import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("../supabase", () => ({ default: { rpc: (...a) => rpc(...a) } }));

import {
  listSimClients,
  upsertSimClient,
  archiveSimClient,
  previewSimDrip,
  createSimDrip,
  listSimDrips,
  getSimDrip,
  listSimDripLeads,
  setSimDripStatus,
  updateSimDripPace,
  retrySimDripLead,
  runSimPlanner,
  runSimDelivery,
  getSimSettings,
  setSimDryRun,
} from "../leadSimApi";

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

  it("previewSimDrip maps args to RPC params", async () => {
    rpc.mockResolvedValue({
      data: { candidate_count: 2, duplicate_count: 1, new_count: 1, duplicate_samples: [] },
      error: null,
    });
    const out = await previewSimDrip({ clientId: "c1", emails: ["a@x.com", "b@x.com"] });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_preview", {
      p_client_id: "c1",
      p_emails: ["a@x.com", "b@x.com"],
    });
    expect(out.new_count).toBe(1);
  });

  it("createSimDrip maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { drip_id: "d1", queued_count: 5 }, error: null });
    const out = await createSimDrip({
      clientId: "c1",
      name: "march",
      sourceFilename: "march.csv",
      dailyVolume: 30,
      rows: [{ email: "a@x.com" }],
    });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_create", {
      p_client_id: "c1",
      p_name: "march",
      p_source_filename: "march.csv",
      p_daily_volume: 30,
      p_rows: [{ email: "a@x.com" }],
    });
    expect(out.drip_id).toBe("d1");
  });

  it("listSimDrips passes client id and returns rows", async () => {
    rpc.mockResolvedValue({ data: [{ id: "d1", name: "march" }], error: null });
    const rows = await listSimDrips({ clientId: "c1" });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drips_list", { p_client_id: "c1" });
    expect(rows).toEqual([{ id: "d1", name: "march" }]);
  });

  it("listSimDrips defaults client id to null", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await listSimDrips();
    expect(rpc).toHaveBeenCalledWith("admin_sim_drips_list", { p_client_id: null });
  });

  it("createSimDrip throws on rpc error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(
      createSimDrip({ clientId: "c1", name: "x", sourceFilename: "x.csv", dailyVolume: 1, rows: [] })
    ).rejects.toThrow("nope");
  });

  it("getSimDrip maps args to RPC params", async () => {
    rpc.mockResolvedValue({
      data: { drip: { id: "d1", status: "running" }, client: { id: "c1" }, counts: { sent: 2 } },
      error: null,
    });
    const out = await getSimDrip({ dripId: "d1" });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_get", { p_drip_id: "d1" });
    expect(out.drip.id).toBe("d1");
    expect(out.counts.sent).toBe(2);
  });

  it("listSimDripLeads passes default status/limit/offset", async () => {
    rpc.mockResolvedValue({ data: { total: 0, rows: [] }, error: null });
    const out = await listSimDripLeads({ dripId: "d1" });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_leads", {
      p_drip_id: "d1",
      p_status: null,
      p_limit: 100,
      p_offset: 0,
    });
    expect(out).toEqual({ total: 0, rows: [] });
  });

  it("listSimDripLeads passes explicit status filter and paging", async () => {
    rpc.mockResolvedValue({ data: { total: 1, rows: [{ id: "l1" }] }, error: null });
    const out = await listSimDripLeads({ dripId: "d1", status: "failed", limit: 25, offset: 50 });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_leads", {
      p_drip_id: "d1",
      p_status: "failed",
      p_limit: 25,
      p_offset: 50,
    });
    expect(out.rows).toEqual([{ id: "l1" }]);
  });

  it("setSimDripStatus maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { id: "d1", status: "running" }, error: null });
    const out = await setSimDripStatus({ dripId: "d1", action: "start" });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_set_status", {
      p_drip_id: "d1",
      p_action: "start",
    });
    expect(out.status).toBe("running");
  });

  it("setSimDripStatus throws on rpc error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Drip not found" } });
    await expect(setSimDripStatus({ dripId: "x", action: "start" })).rejects.toThrow(
      "Drip not found"
    );
  });

  it("updateSimDripPace maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { id: "d1", daily_volume: 40 }, error: null });
    const out = await updateSimDripPace({ dripId: "d1", dailyVolume: 40 });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_update_pace", {
      p_drip_id: "d1",
      p_daily_volume: 40,
    });
    expect(out.daily_volume).toBe(40);
  });

  it("retrySimDripLead maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { id: "l1", status: "scheduled" }, error: null });
    const out = await retrySimDripLead({ leadId: "l1" });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_retry_lead", { p_lead_id: "l1" });
    expect(out.status).toBe("scheduled");
  });

  it("runSimPlanner calls the planner RPC with no params", async () => {
    rpc.mockResolvedValue({ data: { drips_planned: 1, leads_scheduled: 3 }, error: null });
    const out = await runSimPlanner();
    expect(rpc).toHaveBeenCalledWith("admin_sim_run_planner");
    expect(out.leads_scheduled).toBe(3);
  });

  it("runSimDelivery calls the delivery RPC with no params", async () => {
    rpc.mockResolvedValue({ data: { request_id: 42 }, error: null });
    const out = await runSimDelivery();
    expect(rpc).toHaveBeenCalledWith("admin_sim_run_delivery");
    expect(out.request_id).toBe(42);
  });

  it("getSimSettings returns settings", async () => {
    rpc.mockResolvedValue({ data: { dry_run: true, updated_at: null }, error: null });
    const out = await getSimSettings();
    expect(rpc).toHaveBeenCalledWith("admin_sim_get_settings");
    expect(out.dry_run).toBe(true);
  });

  it("setSimDryRun maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { dry_run: false }, error: null });
    const out = await setSimDryRun({ dryRun: false });
    expect(rpc).toHaveBeenCalledWith("admin_sim_set_dry_run", { p_dry_run: false });
    expect(out.dry_run).toBe(false);
  });
});
