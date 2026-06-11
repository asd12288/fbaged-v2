import { describe, it, expect } from "vitest";
import { estimateBusinessDays, formatPacingLine } from "../pacing";

describe("estimateBusinessDays", () => {
  it("returns ceil(new/volume)", () => {
    expect(estimateBusinessDays(50, 25)).toBe(2);
    expect(estimateBusinessDays(51, 25)).toBe(3);
    expect(estimateBusinessDays(0, 25)).toBe(0);
  });

  it("treats non-positive volume as 1/day", () => {
    expect(estimateBusinessDays(10, 0)).toBe(10);
    expect(estimateBusinessDays(10, -5)).toBe(10);
  });
});

describe("formatPacingLine", () => {
  it("composes the client cadence line", () => {
    const line = formatPacingLine({
      send_window_start: "08:00:00",
      send_window_end: "21:00:00",
      timezone: "Europe/Paris",
      skip_weekends: true,
      default_daily_volume: 25,
    });
    expect(line).toBe(
      "Send window 08:00–21:00 Europe/Paris · skips weekends · default 25/day"
    );
  });

  it("omits the weekend clause when skip_weekends is false", () => {
    const line = formatPacingLine({
      send_window_start: "08:00",
      send_window_end: "21:00",
      timezone: "Europe/Paris",
      skip_weekends: false,
      default_daily_volume: 40,
    });
    expect(line).toBe("Send window 08:00–21:00 Europe/Paris · default 40/day");
  });

  it("returns empty string for missing client", () => {
    expect(formatPacingLine(null)).toBe("");
  });
});
