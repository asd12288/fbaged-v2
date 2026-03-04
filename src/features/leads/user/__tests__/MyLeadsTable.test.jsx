import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MyLeadsTable from "../MyLeadsTable";

describe("MyLeadsTable", () => {
  it("shows batch rows and download action", () => {
    render(
      <MyLeadsTable
        batches={[
          {
            id: 10,
            source_filename: "march.csv",
            inserted_rows: 12,
            duplicate_rows: 2,
            invalid_rows: 1,
            created_at: "2026-03-04",
            campaign: { campaignName: "Campaign A" },
          },
        ]}
        onDownload={() => {}}
      />
    );

    expect(screen.getByText(/march.csv/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download csv/i })
    ).toBeInTheDocument();
  });
});
