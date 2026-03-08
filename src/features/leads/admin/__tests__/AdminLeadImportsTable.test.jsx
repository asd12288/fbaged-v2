import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminLeadImportsTable from "../AdminLeadImportsTable";

const mockUseAdminScope = vi.fn();
const mockUseLeadBatches = vi.fn();
const mockDownloadLeadBatchCsv = vi.fn();
const mockDownloadStoredLeadFile = vi.fn();
const mockGetLeadBatchDuplicateRows = vi.fn();
const mockDownloadDuplicateLeadsCsv = vi.fn();

vi.mock("../../../admin/AdminScopeContext", () => ({
  useAdminScope: () => mockUseAdminScope(),
}));

vi.mock("../../hooks/useLeadBatches", () => ({
  useLeadBatches: (params) => mockUseLeadBatches(params),
}));

vi.mock("../../../../services/leadsApi", () => ({
  downloadLeadBatchCsv: (...args) => mockDownloadLeadBatchCsv(...args),
  downloadStoredLeadFile: (...args) => mockDownloadStoredLeadFile(...args),
  getLeadBatchDuplicateRows: (...args) => mockGetLeadBatchDuplicateRows(...args),
  downloadDuplicateLeadsCsv: (...args) => mockDownloadDuplicateLeadsCsv(...args),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("AdminLeadImportsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows notice when no selected user", () => {
    mockUseAdminScope.mockReturnValue({ selectedUserId: null });
    mockUseLeadBatches.mockReturnValue({ data: [], isPending: false });

    render(<AdminLeadImportsTable />);

    expect(
      screen.getByText(/select a user from the sidebar to view lead imports/i)
    ).toBeInTheDocument();
  });

  it("renders imports rows and disables duplicate download when duplicate count is zero", () => {
    mockUseAdminScope.mockReturnValue({ selectedUserId: "u1" });
    mockUseLeadBatches.mockReturnValue({
      data: [
        {
          id: 11,
          created_at: "2026-03-05T10:00:00Z",
          source_filename: "march.csv",
          inserted_rows: 5,
          duplicate_rows: 0,
          invalid_rows: 1,
          campaign_id: 7,
          campaign: { campaignName: "Campaign A" },
        },
      ],
      isPending: false,
    });

    render(<AdminLeadImportsTable />);

    expect(screen.getByText(/march.csv/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download new leads/i })
    ).toBeInTheDocument();

    const duplicateButton = screen.getByRole("button", {
      name: /download duplicate leads/i,
    });
    expect(duplicateButton).toBeDisabled();
  });

  it("downloads duplicate rows for historical batch", async () => {
    mockUseAdminScope.mockReturnValue({ selectedUserId: "u1" });
    mockUseLeadBatches.mockReturnValue({
      data: [
        {
          id: 12,
          created_at: "2026-03-05T10:00:00Z",
          source_filename: "april.csv",
          inserted_rows: 2,
          duplicate_rows: 2,
          invalid_rows: 0,
          campaign_id: 7,
          campaign: { campaignName: "Campaign B" },
        },
      ],
      isPending: false,
    });
    mockGetLeadBatchDuplicateRows.mockResolvedValue([
      {
        email: "dup@example.com",
        reason: "duplicate_existing",
        payload_json: { name: "Dup" },
      },
    ]);

    render(<AdminLeadImportsTable />);

    fireEvent.click(
      screen.getByRole("button", { name: /download duplicate leads/i })
    );

    await waitFor(() => {
      expect(mockGetLeadBatchDuplicateRows).toHaveBeenCalledWith(12);
      expect(mockDownloadDuplicateLeadsCsv).toHaveBeenCalledWith(
        [
          {
            email: "dup@example.com",
            reason: "duplicate_existing",
            payload_json: { name: "Dup" },
          },
        ],
        {
          filename: "april-duplicates-batch-12.csv",
          campaignName: "Campaign B",
        }
      );
    });
  });

  it("prefers stored clean file when batch has storage path", async () => {
    mockUseAdminScope.mockReturnValue({ selectedUserId: "u1" });
    mockUseLeadBatches.mockReturnValue({
      data: [
        {
          id: 14,
          created_at: "2026-03-05T10:00:00Z",
          source_filename: "may.csv",
          inserted_rows: 3,
          duplicate_rows: 0,
          invalid_rows: 0,
          campaign_id: 9,
          campaign: { campaignName: "Campaign C" },
          clean_file_path: "users/u1/batches/14/clean.csv",
          duplicate_file_path: null,
        },
      ],
      isPending: false,
    });

    render(<AdminLeadImportsTable />);

    fireEvent.click(screen.getByRole("button", { name: /download new leads/i }));

    await waitFor(() => {
      expect(mockDownloadStoredLeadFile).toHaveBeenCalledWith({
        path: "users/u1/batches/14/clean.csv",
        filename: "may-batch-14.csv",
        campaignName: "Campaign C",
      });
    });
    expect(mockDownloadLeadBatchCsv).not.toHaveBeenCalled();
  });
});
