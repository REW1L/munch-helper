#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

maestro_bin="${MAESTRO_BIN:-maestro}"
if ! command -v "$maestro_bin" > /dev/null 2>&1; then
  echo "Maestro CLI was not found. Install it before committing frontend changes." >&2
  exit 1
fi

cleanup() {
  local exit_code=$?
  node scripts/e2e/cleanup.mjs || true
  npm run e2e:stack:stop || true
  exit "$exit_code"
}
trap cleanup EXIT

run_flows() {
  local platform="$1"

  for flow in maestro/e2e/*.yaml; do
    eval "$(node scripts/e2e/prepare-room.mjs)"
    # Maestro must be completely stopped before starting the next serial flow.
    node scripts/e2e/cleanup.mjs
    "$maestro_bin" test -p "$platform" \
      -e API_URL=http://localhost:8080 \
      -e ROOM_ID="$ROOM_ID" \
      -e USER_ID="$USER_ID" \
      -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" \
      "$flow"
  done
}

npm run e2e:stack:start

(
  cd frontend
  EXPO_PUBLIC_API_URL=http://localhost:8080 EXPO_PUBLIC_E2E=true \
    npx expo run:ios --configuration Release --no-build-cache
)
run_flows ios

(
  cd frontend
  EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 EXPO_PUBLIC_E2E=true \
    npx expo run:android --variant release --no-build-cache
)
run_flows android
