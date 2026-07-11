# Store Screenshots

This document describes how to generate the App Store and Google Play screenshots used by this project.

The automation uses:

- the local backend API on `http://localhost:8080`
- Expo release builds installed into iOS simulators or Android emulators
- Maestro flows for navigation and screen setup
- `xcrun simctl io ... screenshot` or `adb exec-out screencap -p` for source PNG capture
- `scripts/generate-app-store-preview-redesign.py` for captioned store-ready slides
- static platform bezel assets from `scripts/assets/device-bezels/`

## Story And Output

The published phone screenshot story is four slides, in this order:

1. `rooms-home.png` - gather the whole table in one room
2. `room-view.png` - everyone gains power and changes class in real time
3. `battle.png` - team up to fight the monster
4. `log.png` - replay every twist in the game history

iOS source screenshots are captured only for the 6.9 inch App Store size:

- `screenshots/iphone69` at `1320x2868`

Google Play source screenshots are captured only at the approved phone size:

- `screenshots/android1080x2400` at `1080x2400`

Captioned, store-ready slides are written by locale:

- `screenshots/iphone69_store_preview/en`
- `screenshots/android1080x2400_store_preview/en`

The Google Play feature graphic is separate and still written to:

- `screenshots/google-play/feature-graphic.png`

iPad/tablet screenshot sets and the Google Play feature graphic are handled outside this phone screenshot workflow.

## What The Automation Does

The screenshot pipeline:

1. Seeds a fresh, isolated room in the backend for each captured slide.
2. Each seed creates four named characters and performs real battle API actions: creates and concludes one battle for history, then creates a separate active battle for the battle slide.
3. Verifies each seeded room's active battle via `GET /battles?roomId=...&status=active` and verifies history via `GET /logs?roomId=...`.
4. Resolves the target iOS 26 simulator or Android emulator.
5. Builds and installs the app in release mode with screenshot profile data.
6. Runs the four Maestro flows, passing the slide-specific `ROOM_ID` to each flow.
7. Captures source PNG screenshots.
8. Runs the caption-band compositor.

The runners print a slide-to-room map so a generated image can be traced back to the local fixture that produced it. The local screenshot database is disposable; if fixtures drift or look stale, clear/recreate the local data and rerun the pipeline.

The iOS local profile is injected at build time:

- `iphone69`: `Captain Rowan`

The Android screenshot profile is:

- `Warden Kira`

## Caption Compositor

`scripts/generate-app-store-preview-redesign.py` is shared by App Store and Google Play.

Each output uses:

- a solid brand caption band above the screenshot
- the app palette mirrored from `frontend/constants/theme.ts`
- locale-keyed caption copy, with `STORE_SCREENSHOT_LOCALE=en` by default
- fixed base canvases: `1320x2868` for `iphone69`, `1080x2400` for `android1080x2400`
- an undimmed screenshot fitted behind a static transparent device bezel
- platform-appropriate framing: iPhone-style bezel for App Store output, Android/Pixel-style bezel for Google Play output
- bottom-cropping inside the bezel screen rectangle when needed, preserving top content legibility

The band occupies roughly 20-30 percent of the canvas. Per-slide band ratio and crop offset live in the script data so future tuning is data-only.

The compositor fails if required bezel assets or screen-rectangle metadata are missing. It does not fall back to a bare rounded screenshot and does not reuse the iPhone bezel for Google Play.

Bezel files live in:

```text
scripts/assets/device-bezels/
```

Required files:

- `iphone69.png` - transparent iPhone-style bezel for App Store previews
- `android1080x2400.png` - transparent Android/Pixel-style bezel for Google Play previews
- `device-bezels.json` - platform mapping and screen rectangles

Figma's iOS 26 Product Bezels or other design kits may be used to export replacement static PNGs, but generation must run from local files. Do not make the compositor depend on a live Figma session.

To tune a replacement asset, update the corresponding `screen` rectangle in `device-bezels.json`. The rectangle is measured in the bezel asset's own pixels and marks where the captured app screenshot is placed behind the transparent bezel window.

The four accent mappings are:

- `rooms-home` -> `accent`
- `room-view` -> `actionSecondary`
- `battle` -> `danger`
- `log` -> `parchmentText`

Run the compositor directly after source screenshots exist:

```bash
python3 scripts/generate-app-store-preview-redesign.py
```

To render another populated locale later:

```bash
STORE_SCREENSHOT_LOCALE=en python3 scripts/generate-app-store-preview-redesign.py
```

## Prerequisites

Before generating screenshots, make sure all of the following are available.

### 1. macOS With Xcode And Simulator Support

You need:

- Xcode installed
- `xcrun simctl` available
- `iPhone 17 Pro Max` on iOS `26.x`

Inspect installed simulators with:

```bash
xcrun simctl list devices available
```

### 2. Node.js Dependencies Installed

From the repository root:

```bash
npm install
```

If iOS native dependencies need to be refreshed:

```bash
cd frontend
pod install
cd ..
```

### 3. Maestro Installed

Install Maestro if it is not already available:

```bash
maestro --version
```

### 4. Python Pillow Installed

The caption compositor uses Pillow:

```bash
python3 -m venv .tmp/screenshot-venv
.tmp/screenshot-venv/bin/python -m pip install -r scripts/requirements-screenshots.txt
SCREENSHOT_PYTHON=.tmp/screenshot-venv/bin/python npm run screenshots:google-play
```

For direct compositor runs, use the same Python:

```bash
.tmp/screenshot-venv/bin/python scripts/generate-app-store-preview-redesign.py
```

### 5. Android Tooling For Google Play Screenshots

You need:

- Android Studio or Android SDK command-line tools installed
- `adb` available
- `emulator` available if the script should launch an AVD
- a Pixel 6a-sized emulator or device reporting `wm size` as `1080x2400`

Inspect connected Android devices:

```bash
adb devices -l
```

Inspect available Android Virtual Devices:

```bash
emulator -list-avds
```

The Android script uses an already connected device if one exists. If no device is connected, it launches the first available AVD. You can override that selection:

```bash
ANDROID_SERIAL=emulator-5554 npm run screenshots:google-play
ANDROID_SCREENSHOT_AVD=Pixel_6a_API_36 npm run screenshots:google-play
```

The script fails fast unless the resolved device reports exactly `1080x2400`.

### 6. Backend Running Locally

The screenshot scripts expect the backend API to be reachable at:

```text
http://localhost:8080
```

Start the backend using the project's normal local development flow, then verify it:

```bash
curl -sS http://localhost:8080/health
```

Android automation sets up `adb reverse tcp:8080 tcp:8080` and builds with `EXPO_PUBLIC_API_URL=http://localhost:8080` so release builds can reach the host backend.

## Recommended Commands

For App Store screenshots, run:

```bash
npm run screenshots:app-store
python3 scripts/generate-app-store-preview-redesign.py
```

For Google Play screenshots, run:

```bash
npm run screenshots:google-play
```

The Google Play command captures `screenshots/android1080x2400` and invokes the compositor automatically.

## Google Play Feature Graphic

The Google Play feature graphic is generated separately:

```bash
swift scripts/create-google-play-feature-graphic.swift
```

The script writes:

```text
screenshots/google-play/feature-graphic.png
```

The output is a `1024x500` RGB PNG with no alpha channel, matching the Google Play feature graphic requirement.

## Manual Step-By-Step Flow

### 1. Seed A Room

From the repository root:

```bash
npm run screenshots:seed
```

This prints JSON that includes:

- `roomId`
- seeded users
- four created characters
- active and concluded battle fixture metadata

You can also override the backend URL:

```bash
API_BASE_URL=http://localhost:8080 node scripts/seed-app-store-room.mjs
```

### 2. Build And Install The App For iOS

```bash
cd frontend
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME="Captain Rowan" \
EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR=1 \
npx expo run:ios --configuration Release -d <SIMULATOR_UDID>
cd ..
```

### 3. Build And Install The App For Android

Forward the backend port:

```bash
adb -s <ANDROID_SERIAL> reverse tcp:8080 tcp:8080
```

Build with:

```bash
cd frontend
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME="Warden Kira" \
EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR=8 \
npx expo run:android --variant release -d <ANDROID_EXPO_DEVICE>
cd ..
```

### 4. Run Maestro Flows Manually

Each flow expects a seeded room id.

iOS examples:

```bash
maestro test -e ROOM_ID=RING0795 maestro/app_store_rooms_home.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_room_view.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_battle.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_log.yaml
```

Android examples:

```bash
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_rooms_home.yaml
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_room_view.yaml
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_battle.yaml
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_log.yaml
```

### 5. Capture Screenshots Manually

Once the iOS simulator is showing the correct screen:

```bash
xcrun simctl io <SIMULATOR_UDID> screenshot screenshots/iphone69/room-view.png
```

Once the Android emulator is showing the correct screen:

```bash
adb -s <ANDROID_SERIAL> exec-out screencap -p > screenshots/android1080x2400/room-view.png
```

## Exact Files Involved

Main automation:

- `scripts/capture-app-store-screenshots.mjs`
- `scripts/capture-google-play-screenshots.mjs`
- `scripts/generate-app-store-preview-redesign.py`
- `scripts/create-google-play-feature-graphic.swift`
- `scripts/seed-app-store-room.mjs`

Maestro flows:

- `maestro/app_store_rooms_home.yaml`
- `maestro/app_store_room_view.yaml`
- `maestro/app_store_battle.yaml`
- `maestro/app_store_log.yaml`

Profile generation logic:

- `frontend/hooks/useUser.ts`

## Notes About Stability

- The screenshot runner expects an iOS `26.x` `iPhone 17 Pro Max` simulator.
- The Android runner requires an emulator or device reporting `1080x2400`.
- The local screenshot profile is created from build-time environment variables.
- Each capture flow receives its own freshly seeded room so repeated clear-state launches do not pollute one shared history log.
- Each seeded room contains four named characters; after the screenshot profile joins, room screenshots should still look like a realistic 2-6 player Munchkin table.
- The runner clears app state before each Maestro flow using `launchApp: clearState: true`.
- The active battle fixture is named `Dungeon Door`; the concluded log fixture is named `Fallen Gate`.

## Troubleshooting

### Backend Errors During Seed

Symptoms:

- `POST /users` fails
- `POST /rooms` fails
- `POST /rooms/associations` fails
- `POST /battles` or `POST /battles/:id/conclude` fails

Check:

- the backend is running on `http://localhost:8080`
- the API schema still matches what `scripts/seed-app-store-room.mjs` sends
- log side effects are enabled for the local backend

### Simulator Not Found

Check installed devices:

```bash
xcrun simctl list devices available -j
```

Install the missing iOS 26 simulator runtime or `iPhone 17 Pro Max` device in Xcode.

### Android Emulator Has The Wrong Size

The Google Play runner fails if `adb shell wm size` is not `1080x2400`.

Check:

```bash
adb -s <ANDROID_SERIAL> shell wm size
```

Launch a known Pixel 6a-sized AVD explicitly:

```bash
ANDROID_SCREENSHOT_AVD=<AVD_NAME> npm run screenshots:google-play
```

### Maestro Flow Fails To Find Text

Check that:

- the app built successfully for the target simulator or emulator
- the backend is reachable from the app
- the room was seeded successfully and the `ROOM_ID` is valid
- the battle and log fixtures are present in the seed output

You can rerun an individual flow directly:

```bash
maestro test -e ROOM_ID=<ROOM_ID> maestro/app_store_battle.yaml
```

### Need To Regenerate Everything Cleanly

Run the full workflow again:

```bash
npm run screenshots:app-store
python3 scripts/generate-app-store-preview-redesign.py
npm run screenshots:google-play
swift scripts/create-google-play-feature-graphic.swift
```

This creates fresh seeded rooms and overwrites the PNG files under `screenshots/`.
