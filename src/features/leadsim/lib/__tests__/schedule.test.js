import { describe, it, expect } from "vitest";
import { planDay, jitterTarget } from "../schedule";

// Small deterministic PRNG for reproducible draws.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WINDOW_START = 8 * 60; // 08:00
const WINDOW_END = 21 * 60; // 21:00

describe("planDay", () => {
  it("returns exactly count times, sorted, all inside the window", () => {
    const times = planDay({
      count: 20,
      windowStartMin: WINDOW_START,
      windowEndMin: WINDOW_END,
      rng: mulberry32(1),
    });
    expect(times).toHaveLength(20);
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(WINDOW_START);
      expect(t).toBeLessThan(WINDOW_END);
    }
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("honors nowMin as the effective start when inside the window", () => {
    const nowMin = 14 * 60; // 14:00
    const times = planDay({
      count: 15,
      windowStartMin: WINDOW_START,
      windowEndMin: WINDOW_END,
      nowMin,
      rng: mulberry32(2),
    });
    expect(times).toHaveLength(15);
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(nowMin);
      expect(t).toBeLessThan(WINDOW_END);
    }
  });

  it("ignores nowMin earlier than the window start", () => {
    const times = planDay({
      count: 10,
      windowStartMin: WINDOW_START,
      windowEndMin: WINDOW_END,
      nowMin: 60, // 01:00, before the window opens
      rng: mulberry32(3),
    });
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(WINDOW_START);
    }
  });

  it("returns an empty plan when the effective start is past the window end", () => {
    expect(
      planDay({
        count: 5,
        windowStartMin: WINDOW_START,
        windowEndMin: WINDOW_END,
        nowMin: WINDOW_END,
        rng: mulberry32(4),
      })
    ).toEqual([]);
    expect(
      planDay({
        count: 5,
        windowStartMin: WINDOW_START,
        windowEndMin: WINDOW_END,
        nowMin: WINDOW_END + 30,
        rng: mulberry32(4),
      })
    ).toEqual([]);
  });

  it("returns an empty plan for a zero count", () => {
    expect(
      planDay({
        count: 0,
        windowStartMin: WINDOW_START,
        windowEndMin: WINDOW_END,
        rng: mulberry32(5),
      })
    ).toEqual([]);
  });

  it("spaces sends non-uniformly (random, not equal gaps)", () => {
    const times = planDay({
      count: 12,
      windowStartMin: WINDOW_START,
      windowEndMin: WINDOW_END,
      rng: mulberry32(6),
    });
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    const distinct = new Set(gaps.map((g) => g.toFixed(6)));
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe("jitterTarget", () => {
  it("stays within ±20% of the volume", () => {
    const rng = mulberry32(7);
    const volume = 25;
    const lo = Math.ceil(volume * 0.8); // 20
    const hi = Math.floor(volume * 1.2); // 30
    const draws = Array.from({ length: 200 }, () => jitterTarget(volume, rng));
    for (const target of draws) {
      expect(Number.isInteger(target)).toBe(true);
      expect(target).toBeGreaterThanOrEqual(lo);
      expect(target).toBeLessThanOrEqual(hi);
    }
    // It actually jitters: multiple distinct targets across draws.
    expect(new Set(draws).size).toBeGreaterThan(1);
  });

  it("never returns less than 1", () => {
    const rng = mulberry32(8);
    for (let i = 0; i < 50; i += 1) {
      expect(jitterTarget(1, rng)).toBeGreaterThanOrEqual(1);
      expect(jitterTarget(0, rng)).toBeGreaterThanOrEqual(1);
    }
  });
});
