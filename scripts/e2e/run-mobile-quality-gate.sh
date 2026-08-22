#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

maestro_bin="${MAESTRO_BIN:-maestro}"
if ! command -v "$maestro_bin" > /dev/null 2>&1; then
  echo "Maestro CLI was not found. Install it before committing frontend changes." >&2
  exit 1
fi

expo_pids=()
android_emulator_pid=''
android_serial=''
android_expo_device=''

terminate_process_tree() {
  local pid="$1"
  local child

  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    terminate_process_tree "$child"
  done
  kill -TERM "$pid" 2>/dev/null || true
}

cleanup() {
  local exit_code=$?
  for pid in "${expo_pids[@]}"; do
    terminate_process_tree "$pid"
  done
  if [[ -n "$android_emulator_pid" ]]; then
    terminate_process_tree "$android_emulator_pid"
  fi
  node scripts/e2e/cleanup.mjs || true
  npm run e2e:stack:stop || true
  exit "$exit_code"
}
trap cleanup EXIT

ensure_android_device() {
  android_serial="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')"
  if [[ -n "$android_serial" ]]; then
    android_expo_device="${E2E_ANDROID_DEVICE:-$android_serial}"
    local existing_avd_name
    existing_avd_name="$(adb -s "$android_serial" emu avd name 2>/dev/null | awk 'NF && $0 != "OK" { print; exit }')"
    if [[ -n "$existing_avd_name" ]]; then
      android_expo_device="$existing_avd_name"
    fi
    return 0
  fi

  local avd_name
  avd_name="${E2E_ANDROID_AVD:-$(emulator -list-avds | head -n 1)}"
  if [[ -z "$avd_name" ]]; then
    echo "No Android device is connected and no Android Virtual Device is installed." >&2
    return 1
  fi

  echo "Launching Android emulator $avd_name"
  emulator -avd "$avd_name" -no-snapshot-load -no-audio -no-boot-anim > /tmp/munch-e2e-android-emulator.log 2>&1 &
  android_emulator_pid=$!
  android_expo_device="$avd_name"

  for _ in {1..180}; do
    android_serial="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')"
    if [[ -n "$android_serial" ]] \
      && [[ "$(adb -s "$android_serial" shell getprop sys.boot_completed 2>/dev/null || true)" == '1' ]]; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for the Android emulator to boot." >&2
  return 1
}

wait_for_release_app() {
  local platform="$1"
  local expo_pid="$2"
  local android_device="${3:-}"

  for _ in {1..600}; do
    if [[ "$platform" == "ios" ]] \
      && xcrun simctl get_app_container booted click.helpamunch.mobileapp app > /dev/null 2>&1; then
      return 0
    fi
    if [[ "$platform" == "android" ]] \
      && adb -s "$android_device" shell pm path click.helpamunch.mobileapp > /dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$expo_pid" 2>/dev/null; then
      wait "$expo_pid" || true
      echo "Expo failed before the $platform release app was installed." >&2
      return 1
    fi
    sleep 1
  done

  echo "Timed out waiting for the $platform release app to install." >&2
  return 1
}

start_release_app() {
  local platform="$1"

  if [[ "$platform" == "ios" ]]; then
    xcrun simctl uninstall booted click.helpamunch.mobileapp > /dev/null 2>&1 || true
    (
      cd frontend
      EXPO_PUBLIC_API_URL=http://localhost:8080 EXPO_PUBLIC_E2E=true \
        npx expo run:ios --configuration Release --no-build-cache --no-bundler
    ) &
  else
    ensure_android_device
    adb -s "$android_serial" uninstall click.helpamunch.mobileapp > /dev/null 2>&1 || true
    (
      cd frontend
      EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 EXPO_PUBLIC_E2E=true \
        npx expo run:android --variant release --no-build-cache --no-bundler -d "$android_expo_device"
    ) &
  fi

  local expo_pid=$!
  expo_pids+=("$expo_pid")
  wait_for_release_app "$platform" "$expo_pid" "$android_serial"
  # Expo 54 can keep its headless CLI process alive after installing a
  # release build. Maestro launches the installed app itself, so stop it
  # before test execution instead of blocking the quality gate.
  terminate_process_tree "$expo_pid"
}

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

platforms="${E2E_MOBILE_PLATFORMS:-ios android}"

if [[ " $platforms " == *' ios '* ]]; then
  start_release_app ios
  run_flows ios
fi

if [[ " $platforms " == *' android '* ]]; then
  start_release_app android
  run_flows android
fi
