#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<USAGE
Usage: scripts/dev-up.sh [--supabase-only]

Starts local Supabase (Docker) and configures local frontend env.

Options:
  --supabase-only   Start Supabase and write .env.local, but do not run Vite
  -h, --help        Show this help
USAGE
}

RUN_APP=1

case "${1:-}" in
  --supabase-only)
    RUN_APP=0
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  "")
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage
    exit 1
    ;;
esac

resolve_supabase_bin() {
  local candidate
  while IFS= read -r candidate; do
    [[ -z "$candidate" ]] && continue
    # Skip project-local npm shim (not the Supabase CLI).
    if [[ "$candidate" == *"/node_modules/.bin/supabase" ]]; then
      continue
    fi
    echo "$candidate"
    return 0
  done < <(which -a supabase 2>/dev/null | awk '!seen[$0]++')
  return 1
}

SUPABASE_BIN="$(resolve_supabase_bin || true)"
if [[ -z "$SUPABASE_BIN" ]]; then
  echo "Supabase CLI not found on PATH. Install it first: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js first." >&2
  exit 1
fi

echo "Starting local Supabase containers..."
"$SUPABASE_BIN" start >/dev/null

status_env="$("$SUPABASE_BIN" status -o env)"
api_url="$(printf '%s\n' "$status_env" | awk -F'"' '/^API_URL=/{print $2; exit}')"
anon_key="$(printf '%s\n' "$status_env" | awk -F'"' '/^ANON_KEY=/{print $2; exit}')"

if [[ -z "$api_url" || -z "$anon_key" ]]; then
  echo "Could not read API_URL/ANON_KEY from 'supabase status -o env'." >&2
  exit 1
fi

upsert_env() {
  local key="$1"
  local value="$2"
  local file=".env.local"

  touch "$file"

  if grep -q "^${key}=" "$file"; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" '
      $0 ~ "^" k "=" { print k "=" v; next }
      { print }
    ' "$file" > "$tmp"
    mv "$tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

upsert_env "VITE_SUPABASE_URL" "$api_url"
upsert_env "VITE_SUPABASE_ANON_KEY" "$anon_key"

echo "Updated .env.local with local Supabase credentials."

if [[ "$RUN_APP" -eq 0 ]]; then
  echo "Supabase is running."
  echo "Next: npm run dev"
  exit 0
fi

echo "Starting Vite dev server..."
exec npm run dev
