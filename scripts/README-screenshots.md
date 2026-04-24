# Store Screenshots

This document describes how to generate the App Store and Google Play screenshots used by this project.

The automation uses:

- the local backend API on `http://localhost:8080`
- Expo release builds installed into iOS simulators or Android emulators
- Maestro flows for navigation and screen setup
- `xcrun simctl io ... screenshot` or `adb exec-out screencap -p` for final PNG capture

## Output

iOS screenshots are written to:

- `screenshots/iphone69`
- `screenshots/iphone63`
- `screenshots/iphone61`
- `screenshots/ipad13`

Android screenshots are written to a resolution-specific directory, for example:

- `screenshots/android576x1280`
- `screenshots/android1080x2400`

Each directory currently contains:

- `rooms-home.png`
- `join-room.png`
- `room-view.png`
- `character-details.png`

## What the automation does

The screenshot pipeline:

1. Seeds a fresh room in the backend with a named cast of characters.
2. Resolves the target iOS 26 simulators or Android emulator.
3. Builds and installs the app in release mode with device-specific screenshot profile data.
4. Runs the Maestro flows for each required screen.
5. Captures PNG screenshots into the device-specific output directories.

The iOS device-specific local profiles are injected at build time:

- `iphone69`: `Captain Rowan`
- `iphone63`: `Scout Mira`
- `iphone61`: `Archivist Sol`
- `ipad13`: `Marshal Veya`

The Android screenshot profile is:

- `Warden Kira`

## Prerequisites

Before generating screenshots, make sure all of the following are available.

### 1. macOS with Xcode and Simulator support

You need:

- Xcode installed
- `xcrun simctl` available
- the required simulators installed

Current targets:

- `iPhone 17 Pro Max` on iOS `26.x`
- `iPhone 17 Pro` on iOS `26.x`
- `iPhone 17e` on iOS `26.x`
- `iPad Pro 13-inch (M5)` on iOS `26.x`

You can inspect installed simulators with:

```bash
xcrun simctl list devices available
```

### 2. Node.js dependencies installed

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

### 3. Maestro installed

Install Maestro if it is not already available:

```bash
maestro --version
```

If that command fails, install Maestro first using your normal local installation method.

### 4. Android tooling for Google Play screenshots

You need:

- Android Studio or Android SDK command-line tools installed
- `adb` available
- `emulator` available if the script should launch an AVD
- at least one Android Virtual Device installed

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
ANDROID_SCREENSHOT_AVD=Medium_Phone_API_36.1 npm run screenshots:google-play
```

### 5. Backend running locally

The screenshot scripts expect the backend API to be reachable at:

```text
http://localhost:8080
```

Start the backend using the project’s normal local development flow, then verify it:

```bash
curl -sS http://localhost:8080/health
```

If the backend is not running, room seeding and app flows will fail. Android automation sets up `adb reverse tcp:8080 tcp:8080` and builds with `EXPO_PUBLIC_API_URL=http://localhost:8080` so release builds can reach the host backend. The Android manifest uses a scoped network security config for local cleartext hosts only.

## Recommended Commands

For App Store screenshots, run:

```bash
npm run screenshots:app-store
```

For Google Play screenshots, run:

```bash
npm run screenshots:google-play
```

Both commands seed a fresh room and overwrite the PNG files under `screenshots/`.

The Google Play command will:

- seed a room with named characters
- resolve or launch an Android emulator
- build and install the Android app with `--variant release`
- run the Maestro flows
- save screenshots under `screenshots/android<width>x<height>`

## Manual step-by-step flow

If you want to run the process in smaller pieces, use the commands below.

### 1. Seed a room

From the repository root:

```bash
npm run screenshots:seed
```

This prints JSON that includes:

- `roomId`
- seeded users
- created characters

Save the returned `roomId` if you want to run Maestro flows manually.

You can also override the backend URL:

```bash
API_BASE_URL=http://localhost:8080 node scripts/seed-app-store-room.mjs
```

### 2. Build and install the app for a specific iOS simulator

The app should be built with:

- `EXPO_PUBLIC_API_URL=http://localhost:8080`
- a screenshot profile name
- a screenshot profile avatar

Example for a single simulator:

```bash
cd frontend
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME="Captain Rowan" \
EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR=1 \
npx expo run:ios --configuration Release -d <SIMULATOR_UDID>
cd ..
```

The automation uses these profile mappings:

- `Captain Rowan` with avatar `1`
- `Scout Mira` with avatar `2`
- `Archivist Sol` with avatar `4`
- `Marshal Veya` with avatar `6`

### 3. Build and install the app for a specific Android emulator

The Android app should be built with:

- `EXPO_PUBLIC_API_URL=http://localhost:8080`
- a screenshot profile name
- a screenshot profile avatar

Before launching the Android app manually, forward the backend port:

```bash
adb -s <ANDROID_SERIAL> reverse tcp:8080 tcp:8080
```

Example:

```bash
cd frontend
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME="Warden Kira" \
EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR=8 \
npx expo run:android --variant release -d <ANDROID_SERIAL>
cd ..
```

If Expo does not accept the `adb` serial, pass the AVD/device name instead or set `ANDROID_EXPO_DEVICE` when using the automated runner.

### 4. Run the Maestro flows manually

Each flow expects a seeded room id.

iOS examples:

```bash
maestro test -e ROOM_ID=RING0795 maestro/app_store_rooms_home.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_join_room.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_room_view.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_character_details.yaml
```

Android examples:

```bash
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_rooms_home.yaml
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_join_room.yaml
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_room_view.yaml
maestro test --device emulator-5554 -p android -e ROOM_ID=RING0795 maestro/app_store_character_details.yaml
```

### 5. Capture a screenshot manually

Once the iOS simulator is showing the correct screen:

```bash
xcrun simctl io <SIMULATOR_UDID> screenshot screenshots/iphone69/room-view.png
```

Once the Android emulator is showing the correct screen:

```bash
adb -s <ANDROID_SERIAL> exec-out screencap -p > screenshots/android576x1280/room-view.png
```

## Exact files involved

Main automation:

- `scripts/capture-app-store-screenshots.mjs`
- `scripts/capture-google-play-screenshots.mjs`
- `scripts/seed-app-store-room.mjs`

Maestro flows:

- `maestro/app_store_rooms_home.yaml`
- `maestro/app_store_join_room.yaml`
- `maestro/app_store_room_view.yaml`
- `maestro/app_store_character_details.yaml`

Profile generation logic:

- `frontend/hooks/useUser.ts`

## Notes about stability

- The screenshot runner expects iOS `26.x` simulators. It will fail fast if the matched devices are not on iOS 26.
- The Android runner uses the actual emulator resolution to create the output directory name.
- The local screenshot profile is created from build-time environment variables. This avoids fragile UI-based renaming during capture.
- The seeded room intentionally contains many named characters so the joined user does not also appear in the visible room list area.
- The runner clears app state before each Maestro flow using `launchApp: clearState: true`.

## Troubleshooting

### Backend errors during seed

Symptoms:

- `POST /users` fails
- `POST /rooms` fails
- `POST /rooms/associations` fails

Check:

- the backend is running on `http://localhost:8080`
- the API schema still matches what `scripts/seed-app-store-room.mjs` sends

### Simulator not found

Symptoms:

- the runner reports it cannot find a target simulator
- the runner reports a non-iOS-26 runtime

Check installed devices:

```bash
xcrun simctl list devices available -j
```

Install the missing simulator runtime or device in Xcode.

### Android emulator not found

Symptoms:

- the runner cannot find a connected Android device
- the runner cannot find any installed AVD

Check Android devices and AVDs:

```bash
adb devices -l
emulator -list-avds
```

Launch a known AVD explicitly:

```bash
ANDROID_SCREENSHOT_AVD=<AVD_NAME> npm run screenshots:google-play
```

### Maestro flow fails to find text

Check that:

- the app built successfully for the target simulator
- the backend is reachable from iOS through `EXPO_PUBLIC_API_URL=http://localhost:8080`
- the backend is reachable from Android through `adb reverse tcp:8080 tcp:8080` and `EXPO_PUBLIC_API_URL=http://localhost:8080`
- the room was seeded successfully and the `ROOM_ID` is valid

You can rerun an individual flow directly:

```bash
maestro test -e ROOM_ID=<ROOM_ID> maestro/app_store_room_view.yaml
```

### Need to regenerate everything cleanly

Run the full workflow again:

```bash
npm run screenshots:app-store
npm run screenshots:google-play
```

This creates a fresh seeded room and overwrites the PNG files in `screenshots/`.
