import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminDashboard from "../AdminDashboard";

vi.mock("../../features/auth/useUser", () => ({
  useUser: () => ({
    user: { id: "u2", role: "user", username: "Alice" },
  }),
}));

describe("AdminDashboard", () => {
  it("renders access denied for non-admin without crashing", () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
