import fs from "node:fs/promises";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import LeadsImportForm from "../LeadsImportForm";

const previewImport = vi.fn();
const confirmImport = vi.fn();

vi.mock("../../../users/useUsers", () => ({
  useUsers: () => ({
    data: [{ id: "u1", username: "Alice", email: "alice@example.com" }],
    isPending: false,
  }),
}));

vi.mock("../../../campaigns/useCampaigns", () => ({
  useCampaigns: () => ({
    data: [
      { id: 1, campaignName: "Summer", status: "Active" },
      { id: 2, campaignName: "Learning Sprint", status: "Learning" },
      { id: 3, campaignName: "Paused Campaign", status: "Paused" },
    ],
    isPending: false,
  }),
}));

vi.mock("../../hooks/useLeadImportPreview", () => ({
  useLeadImportPreview: () => ({
    previewImport,
    isPreviewing: false,
  }),
}));

vi.mock("../../hooks/useLeadImportConfirm", () => ({
  useLeadImportConfirm: () => ({
    confirmImport,
    isConfirming: false,
  }),
}));

async function buildUploadFile(path, type = "text/csv") {
  const content = await fs.readFile(path);
  return new File([content], path.split("/").pop(), { type });
}

describe("LeadsImportForm", () => {
  beforeEach(() => {
    previewImport.mockReset();
    confirmImport.mockReset();
    previewImport.mockResolvedValue({
      duplicate_count: 0,
      duplicate_samples: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders required controls", () => {
    render(<LeadsImportForm />);

    expect(screen.getByLabelText(/select user/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select campaign/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload csv/i)).toBeInTheDocument();
  });

  it("shows only active campaigns in the import selector", () => {
    render(<LeadsImportForm />);
    const campaignSelect = screen.getByLabelText(/select campaign/i);

    expect(
      within(campaignSelect).getByRole("option", { name: "Summer" })
    ).toBeInTheDocument();
    expect(
      within(campaignSelect).getByRole("option", { name: "Learning Sprint" })
    ).toBeInTheDocument();
    expect(
      within(campaignSelect).queryByRole("option", { name: "Paused Campaign" })
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      path: "/Users/ilanchelly/Downloads/26_Leads_2026-03-06_2026-03-07.csv",
      totalRows: 60,
      candidateEmails: 60,
    },
    {
      path: "/Users/ilanchelly/Downloads/26_Leads_2026-03-07_2026-03-07.csv",
      totalRows: 32,
      candidateEmails: 32,
    },
  ])(
    "accepts %s and reaches a clean preview",
    async ({ path, totalRows, candidateEmails }) => {
      render(<LeadsImportForm />);

      fireEvent.change(screen.getByLabelText(/select user/i), {
        target: { value: "u1" },
      });
      fireEvent.change(screen.getByLabelText(/select campaign/i), {
        target: { value: "1" },
      });

      const file = await buildUploadFile(path);
      fireEvent.change(screen.getByLabelText(/upload csv/i), {
        target: { files: [file] },
      });

      fireEvent.click(screen.getByRole("button", { name: /preview duplicates/i }));

      await waitFor(() => {
        expect(previewImport).toHaveBeenCalledTimes(1);
      });

      expect(previewImport).toHaveBeenCalledWith({
        assignedUserId: "u1",
        campaignId: 1,
        emails: expect.any(Array),
      });
      expect(previewImport.mock.calls[0][0].emails).toHaveLength(candidateEmails);

      expect(await screen.findByText(`Total rows: ${totalRows}`)).toBeInTheDocument();
      expect(screen.getByText(`Valid rows: ${totalRows}`)).toBeInTheDocument();
      expect(screen.getByText("Duplicates to skip: 0")).toBeInTheDocument();
      expect(screen.getByText("Invalid rows to skip: 0")).toBeInTheDocument();
    }
  );
});
