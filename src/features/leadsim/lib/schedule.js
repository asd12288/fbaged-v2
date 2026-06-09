/**
 * Pure mirror of the planner's per-day math in `public.sim_plan_drips`
 * (supabase/migrations/20260609090500_sim_engine.sql) — keep in sync.
 * Used for tests and UI estimates; the SQL planner remains authoritative.
 */

/**
 * Plan one day's send times.
 *
 * Mirrors the planner: effective start is `max(windowStartMin, nowMin)`
 * (the planner's `greatest(v_win_start, v_local_now)` on day 0); if the
 * effective start is at/after the window end the day is skipped; each lead
 * gets `effStart + r * span` with an independent random draw.
 *
 * @param {{
 *   count: number,
 *   windowStartMin: number,
 *   windowEndMin: number,
 *   nowMin?: number | null,
 *   rng?: () => number,
 * }} options
 * @returns {number[]} sorted minute-of-day floats, all in
 *   [max(windowStartMin, nowMin), windowEndMin)
 */
export function planDay({
  count,
  windowStartMin,
  windowEndMin,
  nowMin = null,
  rng = Math.random,
}) {
  const total = Math.max(0, Math.floor(Number(count) || 0));
  const effStart =
    nowMin == null ? windowStartMin : Math.max(windowStartMin, nowMin);
  if (total === 0 || effStart >= windowEndMin) return [];
  const span = windowEndMin - effStart;
  const times = [];
  for (let i = 0; i < total; i += 1) {
    times.push(effStart + rng() * span);
  }
  return times.sort((a, b) => a - b);
}

/**
 * Jittered daily target. Mirrors the planner's
 * `greatest(1, round(daily_volume * (0.8 + random() * 0.4)))`.
 *
 * @param {number} dailyVolume
 * @param {() => number} [rng]
 * @returns {number} integer in [ceil(0.8*v)..floor(1.2*v)], min 1
 */
export function jitterTarget(dailyVolume, rng = Math.random) {
  const volume = Number(dailyVolume) || 0;
  return Math.max(1, Math.round(volume * (0.8 + rng() * 0.4)));
}
