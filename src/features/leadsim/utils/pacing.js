export function estimateBusinessDays(newCount, dailyVolume) {
  const count = Math.max(0, Number(newCount) || 0);
  if (count === 0) return 0;
  const perDay = Math.max(1, Number(dailyVolume) || 0);
  return Math.ceil(count / perDay);
}

function trimSeconds(time) {
  // "08:00:00" -> "08:00"; "08:00" stays "08:00".
  return String(time || "").slice(0, 5);
}

export function formatPacingLine(client) {
  if (!client) return "";
  const start = trimSeconds(client.send_window_start);
  const end = trimSeconds(client.send_window_end);
  const tz = client.timezone || "Europe/Paris";
  const volume = client.default_daily_volume ?? 25;
  const parts = [`Send window ${start}–${end} ${tz}`];
  if (client.skip_weekends) parts.push("skips weekends");
  parts.push(`default ${volume}/day`);
  return parts.join(" · ");
}
