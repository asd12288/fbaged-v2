import { MemoryRouter } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MainNav from "../MainNav";

vi.mock("../../features/auth/useUser", () => ({
  useUser: () => ({
    user: { id: "u1", role: "user", username: "User One" },
  }),
}));

describe("MainNav", () => {
  it("does not render My Leads navigation entry", () => {
    render(
      <MemoryRouter>
        <MainNav />
      </MemoryRouter>
    );

    expect(screen.queryByText(/my leads/i)).not.toBeInTheDocument();
  });
});
