export function normalizeEmail(value) {
  return (value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
