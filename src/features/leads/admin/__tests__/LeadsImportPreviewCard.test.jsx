import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LeadsImportPreviewCard from "../LeadsImportPreviewCard";

afterEach(() => {
  cleanup();
});

describe("LeadsImportPreviewCard", () => {
  const preview = {
    local: {
      summary: {
        totalRows: 3,
        validRows: 2,
        duplicateRows: 1,
        invalidRows: 0,
      },
    },
    remote: { duplicate_samples: ["dup@example.com"] },
  };

  it("shows both download actions after successful import with duplicates", () => {
    render(
      <LeadsImportPreviewCard
        preview={preview}
        importResult={{
          batch_id: 7,
          inserted_rows: 2,
          duplicate_rows: 1,
          invalid_rows: 0,
          duplicate_rows_export: [
            {
              email: "dup@example.com",
              reason: "duplicate_existing",
              payload_json: { name: "Dup" },
            },
          ],
        }}
        onConfirm={vi.fn()}
        isConfirming={false}
      />
    );

    expect(
      screen.getByRole("button", { name: /download new leads csv/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download duplicate leads csv/i })
    ).toBeInTheDocument();
  });

  it("hides duplicate download action when there are no duplicate rows", () => {
    render(
      <LeadsImportPreviewCard
        preview={preview}
        importResult={{
          batch_id: 8,
          inserted_rows: 2,
          duplicate_rows: 0,
          invalid_rows: 0,
          duplicate_rows_export: [],
        }}
        onConfirm={vi.fn()}
        isConfirming={false}
      />
    );

    expect(
      screen.queryByRole("button", { name: /download duplicate leads csv/i })
    ).not.toBeInTheDocument();
  });
});
