import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LeadsImportForm from "../LeadsImportForm";

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
      { id: 2, campaignName: "Winter", status: "Paused" },
      { id: 3, campaignName: "Spring", status: "Learning" },
      { id: 4, campaignName: "Autumn", status: "Canceled" },
    ],
    isPending: false,
  }),
}));

vi.mock("../../hooks/useLeadImportPreview", () => ({
  useLeadImportPreview: () => ({
    previewImport: vi.fn(),
    isPreviewing: false,
  }),
}));

vi.mock("../../hooks/useLeadImportConfirm", () => ({
  useLeadImportConfirm: () => ({
    confirmImport: vi.fn(),
    isConfirming: false,
  }),
}));

describe("LeadsImportForm", () => {
  it("renders required controls", () => {
    render(<LeadsImportForm />);

    expect(screen.getByLabelText(/select user/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select campaign/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload csv/i)).toBeInTheDocument();
  });

  it("shows only active campaigns in campaign selection", () => {
    render(<LeadsImportForm />);

    const campaignSelect = screen.getByLabelText(/select campaign/i);

    expect(
      within(campaignSelect).getByRole("option", { name: "Summer" })
    ).toBeInTheDocument();
    expect(
      within(campaignSelect).queryByRole("option", { name: "Winter" })
    ).not.toBeInTheDocument();
    expect(
      within(campaignSelect).queryByRole("option", { name: "Spring" })
    ).not.toBeInTheDocument();
    expect(
      within(campaignSelect).queryByRole("option", { name: "Autumn" })
    ).not.toBeInTheDocument();
  });
});
