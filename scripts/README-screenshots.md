# App Store Screenshots

This document describes how to generate the App Store screenshots used by this project.

The automation uses:

- the local backend API on `http://localhost:8080`
- Expo iOS release builds installed into iOS simulators
- Maestro flows for navigation and screen setup
- `xcrun simctl io ... screenshot` for final PNG capture

## Output

The generated screenshots are written to:

- `screenshots/iphone69`
- `screenshots/iphone63`
- `screenshots/iphone61`
- `screenshots/ipad13`

Each directory currently contains:

- `rooms-home.png`
- `join-room.png`
- `room-view.png`
- `character-details.png`

## What the automation does

The screenshot pipeline:

1. Seeds a fresh room in the backend with a named cast of characters.
2. Resolves the required iOS 26 simulators.
3. Builds and installs the app in `Release` mode with device-specific screenshot profile data.
4. Runs the Maestro flows for each required screen.
5. Captures PNG screenshots into the device-specific output directories.

The device-specific local profiles are injected at build time:

- `iphone69`: `Captain Rowan`
- `iphone63`: `Scout Mira`
- `iphone61`: `Archivist Sol`
- `ipad13`: `Marshal Veya`

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

### 4. Backend running locally

The screenshot scripts expect the backend API to be reachable at:

```text
http://localhost:8080
```

Start the backend using the project’s normal local development flow, then verify it:

```bash
curl -sS http://localhost:8080/health
```

If the backend is not running, room seeding and app flows will fail.

## Recommended command

From the repository root, run:

```bash
npm run screenshots:app-store
```

This is the full end-to-end command. It will:

- seed a room with named characters
- boot each required simulator
- build and install the iOS app in `Release`
- run the Maestro flows
- save screenshots under `screenshots/`

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

### 2. Build and install the app for a specific simulator

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

### 3. Run the Maestro flows manually

Each flow expects a seeded room id.

Examples:

```bash
maestro test -e ROOM_ID=RING0795 maestro/app_store_rooms_home.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_join_room.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_room_view.yaml
maestro test -e ROOM_ID=RING0795 maestro/app_store_character_details.yaml
```

### 4. Capture a screenshot manually

Once the simulator is showing the correct screen:

```bash
xcrun simctl io <SIMULATOR_UDID> screenshot screenshots/iphone69/room-view.png
```

## Exact files involved

Main automation:

- `scripts/capture-app-store-screenshots.mjs`
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

### Maestro flow fails to find text

Check that:

- the app built successfully for the target simulator
- the backend is reachable from the simulator through `EXPO_PUBLIC_API_URL=http://localhost:8080`
- the room was seeded successfully and the `ROOM_ID` is valid

You can rerun an individual flow directly:

```bash
maestro test -e ROOM_ID=<ROOM_ID> maestro/app_store_room_view.yaml
```

### Need to regenerate everything cleanly

Run the full workflow again:

```bash
npm run screenshots:app-store
```

This creates a fresh seeded room and overwrites the PNG files in `screenshots/`.
