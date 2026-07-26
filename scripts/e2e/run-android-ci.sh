#!/usr/bin/env bash

set -euo pipefail

(
  cd frontend
  EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 EXPO_PUBLIC_E2E=true npx expo run:android --variant release --no-build-cache
)

for flow in maestro/e2e/*.yaml; do
  eval "$(node scripts/e2e/prepare-room.mjs)"
  node scripts/e2e/cleanup.mjs
  "$HOME/.maestro/bin/maestro" test -p android -e API_URL=http://localhost:8080 -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" "$flow"
done
