import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../../services/supabase", () => ({
  default: {
    rpc: vi.fn(),
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

import supabase from "../../../../services/supabase";
import {
  buildLeadsCsvText,
  confirmLeadImport,
  downloadStoredLeadFile,
  downloadLeadBatchCsv,
  downloadAcceptedLeadsCsv,
  downloadDuplicateLeadsCsv,
  getLeadBatches,
  getLeadBatchDuplicateRows,
  previewLeadImport,
} from "../../../../services/leadsApi";

describe("leadsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.rpc.mockReset();
    supabase.from.mockReset();
    supabase.storage.from.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
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
    const leadsQuery = {
      eq: vi.fn(() => leadsQuery),
      order: vi.fn(() => leadsQuery),
      range: vi.fn().mockResolvedValue({
        data: [{ email: "new@example.com", payload_json: { name: "New" } }],
        error: null,
      }),
    };
    const batchUpdate = vi.fn().mockResolvedValue({
      data: {
        clean_file_path: "users/u1/batches/9/clean.csv",
        duplicate_file_path: "users/u1/batches/9/duplicates.csv",
      },
      error: null,
    });
    const batchEq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: batchUpdate }),
    });
    const batchUpdateChain = vi.fn().mockReturnValue({ eq: batchEq });
    const storageUpload = vi.fn().mockResolvedValue({ error: null });
    supabase.from
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(leadsQuery) })
      .mockReturnValueOnce({ update: batchUpdateChain });
    supabase.storage.from.mockReturnValue({ upload: storageUpload });

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
    expect(storageUpload).toHaveBeenCalledTimes(2);
    expect(batchUpdateChain).toHaveBeenCalledWith({
      clean_file_path: "users/u1/batches/9/clean.csv",
      duplicate_file_path: "users/u1/batches/9/duplicates.csv",
    });
    expect(out.clean_file_path).toBe("users/u1/batches/9/clean.csv");
    expect(out.duplicate_file_path).toBe("users/u1/batches/9/duplicates.csv");
  });

  it("returns storage warning and keeps import result when file persistence fails", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        batch_id: 10,
        inserted_rows: 1,
        duplicate_rows_export: [],
      },
      error: null,
    });
    const leadsQuery = {
      eq: vi.fn(() => leadsQuery),
      order: vi.fn(() => leadsQuery),
      range: vi.fn().mockResolvedValue({
        data: [{ email: "new@example.com", payload_json: {} }],
        error: null,
      }),
    };
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue(leadsQuery),
    });
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: "storage down" } }),
    });

    const out = await confirmLeadImport({
      assignedUserId: "u1",
      campaignId: 3,
      sourceFilename: "leads.csv",
      rows: [{ email: "new@example.com" }],
    });

    expect(out.batch_id).toBe(10);
    expect(out.clean_file_path).toBeNull();
    expect(out.duplicate_file_path).toBeNull();
    expect(out.storage_warning).toMatch(/storage down/i);
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
    const range = vi.fn().mockResolvedValue({
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
    const order = vi.fn().mockReturnValue({ range });
    const eqReason = vi.fn().mockReturnValue({ order });
    const eqBatch = vi.fn().mockReturnValue({ eq: eqReason });
    const select = vi.fn().mockReturnValue({ eq: eqBatch });
    supabase.from.mockReturnValue({ select });

    const rows = await getLeadBatchDuplicateRows(77);

    expect(supabase.from).toHaveBeenCalledWith("lead_import_rejections");
    expect(select).toHaveBeenCalledWith("email_raw, details, row_number");
    expect(eqBatch).toHaveBeenCalledWith("batch_id", 77);
    expect(eqReason).toHaveBeenCalledWith("reason", "duplicate");
    expect(range).toHaveBeenCalledWith(0, 999);
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

  it("paginates lead batches beyond 1000 rows", async () => {
    const page1 = Array.from({ length: 1000 }, (_, index) => ({
      id: index + 1,
      source_filename: `page-1-${index + 1}.csv`,
    }));
    const page2 = [{ id: 1001, source_filename: "page-2-1.csv" }];

    const makeQuery = (rows) => {
      const query = {
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn().mockResolvedValue({ data: rows, error: null }),
      };
      return query;
    };

    const query1 = makeQuery(page1);
    const query2 = makeQuery(page2);
    const select1 = vi.fn().mockReturnValue(query1);
    const select2 = vi.fn().mockReturnValue(query2);

    supabase.from
      .mockReturnValueOnce({ select: select1 })
      .mockReturnValueOnce({ select: select2 });

    const rows = await getLeadBatches({ assignedUserId: "user-1" });

    expect(rows).toHaveLength(1001);
    expect(rows.at(-1).id).toBe(1001);
    expect(query1.range).toHaveBeenCalledWith(0, 999);
    expect(query2.range).toHaveBeenCalledWith(1000, 1999);
  });

  it("paginates duplicate rows export for historical batches", async () => {
    const page1 = Array.from({ length: 1000 }, (_, index) => ({
      email_raw: `dup-${index + 1}@example.com`,
      row_number: index + 1,
      details: {
        duplicate_in_file: true,
        duplicate_existing: false,
        payload_json: { idx: index + 1 },
      },
    }));
    const page2 = [
      {
        email_raw: "dup-1001@example.com",
        row_number: 1001,
        details: {
          duplicate_in_file: false,
          duplicate_existing: true,
          payload_json: { idx: 1001 },
        },
      },
    ];

    const makeQuery = (rows) => {
      const query = {
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn().mockResolvedValue({ data: rows, error: null }),
      };
      return query;
    };

    const query1 = makeQuery(page1);
    const query2 = makeQuery(page2);
    const select1 = vi.fn().mockReturnValue(query1);
    const select2 = vi.fn().mockReturnValue(query2);

    supabase.from
      .mockReturnValueOnce({ select: select1 })
      .mockReturnValueOnce({ select: select2 });

    const rows = await getLeadBatchDuplicateRows(88);

    expect(rows).toHaveLength(1001);
    expect(rows.at(-1)).toEqual({
      email: "dup-1001@example.com",
      reason: "duplicate_existing",
      payload_json: { idx: 1001 },
    });
    expect(query1.range).toHaveBeenCalledWith(0, 999);
    expect(query2.range).toHaveBeenCalledWith(1000, 1999);
  });

  it("downloads full batch csv by paging reads beyond 1000 rows", async () => {
    const page1 = Array.from({ length: 1000 }, (_, index) => ({
      email: `lead-${index + 1}@example.com`,
      payload_json: { source: "bulk" },
    }));
    const page2 = [
      {
        email: "lead-1001@example.com",
        payload_json: { source: "bulk" },
      },
    ];

    const makeQuery = (rows) => {
      const query = {
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn().mockResolvedValue({ data: rows, error: null }),
      };
      return query;
    };

    const query1 = makeQuery(page1);
    const query2 = makeQuery(page2);
    const select1 = vi.fn().mockReturnValue(query1);
    const select2 = vi.fn().mockReturnValue(query2);

    supabase.from
      .mockReturnValueOnce({ select: select1 })
      .mockReturnValueOnce({ select: select2 });

    const realCreateElement = document.createElement.bind(document);
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const node = realCreateElement(tagName);
      if (tagName === "a") node.click = click;
      return node;
    });
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:batch");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    await downloadLeadBatchCsv(12, { filename: "batch.csv" });

    const blobArg = createObjectURLSpy.mock.calls[0][0];
    const csvText = await blobArg.text();
    const lines = csvText.split("\n");

    expect(lines).toHaveLength(1002);
    expect(lines[0]).toBe("email,source");
    expect(query1.range).toHaveBeenCalledWith(0, 999);
    expect(query2.range).toHaveBeenCalledWith(1000, 1999);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("downloads stored lead file using signed url", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.example/file.csv" },
      error: null,
    });
    supabase.storage.from.mockReturnValue({ createSignedUrl });

    const realCreateElement = document.createElement.bind(document);
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const node = realCreateElement(tagName);
      if (tagName === "a") node.click = click;
      return node;
    });
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:stored");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    global.fetch.mockResolvedValue({
      ok: true,
      blob: vi
        .fn()
        .mockResolvedValue(new Blob(["email\nstored@example.com"], { type: "text/csv" })),
    });

    await downloadStoredLeadFile({
      path: "users/u1/batches/9/clean.csv",
      filename: "clean.csv",
    });

    expect(createSignedUrl).toHaveBeenCalledWith("users/u1/batches/9/clean.csv", 60);
    expect(global.fetch).toHaveBeenCalledWith("https://signed.example/file.csv");
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });
});
