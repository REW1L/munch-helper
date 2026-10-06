# End-to-end testing

The E2E suite uses Maestro against the local Docker stack. It drives the same flows on iOS, Android, and the exported web app, including actor-B writes delivered to actor A through the real Redis and WebSocket path.

## Prerequisites

Install Docker (Docker Desktop or Colima on macOS), Node 24, a current Maestro CLI, and the platform simulator/emulator you plan to use. From the repository root, start an isolated local stack:

```sh
npm run e2e:stack:start
```

Keep this backend stack running for the entire iOS, Android, or web E2E run. The command waits for the nginx gateway at `http://localhost:8080/health` and the required services. Stop it when finished with `npm run e2e:stack:stop`. The web CI job and the local mobile commit gate each start and stop their own isolated stack, so every automated run begins with an empty database.

## Mobile commit quality gate

Husky installs the repository hook automatically when you run `npm install` or `npm ci` at the repository root.

When staged changes include a path under `frontend/`, `git commit` runs the iOS suite followed by the Android suite. The gate starts the backend stack, builds each release app with the platform-specific API URL, and runs Maestro flows one at a time. It always stops Maestro and the stack before returning. Commits without staged `frontend/` changes skip the mobile suite.

Run the exact gate directly for every `frontend/` change before opening a PR. Do not rely on the pre-commit hook being installed or triggered:

```sh
npm run test:e2e:mobile
```

The gate requires an available iOS simulator, Docker, Expo native toolchains, and Maestro. It uses a connected Android device when available, otherwise starts the first installed Android Virtual Device (override it with `E2E_ANDROID_AVD`; set `E2E_ANDROID_DEVICE` for a connected device Expo cannot resolve by default). If unavailable hardware or tooling blocks a platform, run all other applicable checks, document the exact gap in the PR, and leave it open. `git commit --no-verify` bypasses the hook; do not use that bypass or another hook bypass for frontend changes. A missing or bypassed Git hook does not count as a passing mobile E2E run.

Each run needs a new room and two users. Generate a ready-to-source fixture after the stack is running:

```sh
eval "$(node scripts/e2e/prepare-room.mjs)"
export API_URL=http://localhost:8080
```

`prepare-room.mjs` creates a uniquely identified room and exports `ROOM_ID`, `USER_ID`, and `ACTOR_B_USER_ID`. The actor-B scripts in `maestro/e2e/` use direct character HTTP writes; those writes still travel through Redis and the running WebSocket notifications service before Maestro asserts actor A's UI.

## Run flows

Run a single flow with the same environment for every platform:

```sh
maestro test -e API_URL="$API_URL" -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" maestro/e2e/cross-user-create.yaml
```

For iOS, build/run the dev client with `EXPO_PUBLIC_API_URL=http://localhost:8080`; the simulator can reach the host via `localhost`.

```sh
(cd frontend && EXPO_PUBLIC_API_URL=http://localhost:8080 EXPO_PUBLIC_E2E=true npx expo run:ios --configuration Release --no-build-cache --no-bundler)
node scripts/e2e/cleanup.mjs
maestro test -p ios -e API_URL=http://localhost:8080 -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" maestro/e2e
```

For Android, the release app uses `10.0.2.2`, the emulator's alias for the host machine. Maestro actor scripts run on the host, so keep their API URL as `localhost`.

```sh
(cd frontend && EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 EXPO_PUBLIC_E2E=true npx expo run:android --variant release --no-build-cache --no-bundler)
node scripts/e2e/cleanup.mjs
maestro test -p android -e API_URL=http://localhost:8080 -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" maestro/e2e
```

For web, export and serve the static bundle, then point Maestro's web driver at it:

```sh
(cd frontend && EXPO_PUBLIC_API_URL=http://localhost:8080 npm run export:web)
(cd frontend && npx serve dist -l 19006 > /tmp/munch-e2e-web-server.log 2>&1) & echo $! > /tmp/munch-e2e-web-server.pid
node scripts/e2e/prepare-web-flows.mjs --output /tmp/munch-maestro-web --url http://localhost:19006
node scripts/e2e/cleanup.mjs
maestro test -p web -e API_URL=http://localhost:8080 -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" /tmp/munch-maestro-web/join-room.yaml
node scripts/e2e/cleanup.mjs
```

The web driver requires a URL in each flow, while native flows require an app id. `prepare-web-flows.mjs` creates a temporary URL-configured copy without maintaining a second authored suite. Mark flows that exercise native-only UI with a leading `# native-only` comment so the web runner skips them. Maestro's `id` selector resolves React Native Web's `data-testid`, so the shared `testID` selectors stay intact. CI uses Maestro's default headless viewport: forcing one caused the suite to exceed its timeout. Local macOS runs use a normal Chromium window because its headless driver can report a one-pixel height. The cleanup command closes the Maestro Chromium window after every flow. Run the flows sequentially with a fresh `prepare-room.mjs` fixture per flow in CI.

**Known limitation — local macOS web runs (Maestro 2.8.0):** `launchApp` leaves Chrome's original blank `data:,` tab open alongside the real app tab. Maestro's `detectWindowChange` driver logic can latch onto that blank tab instead of the app tab, so every selector assertion fails against an empty page (sometimes the process hangs instead of exiting). This reproduces in both headed and `--headless` mode and with both the system Chrome and a Selenium-managed Chrome-for-Testing build (`SE_FORCE_BROWSER_DOWNLOAD=true`), so it's an upstream Maestro driver bug, not a flow or harness issue. It does not reproduce in the `e2e-web` GitHub Actions job — true headless Chrome on Linux never creates the extra browser-chrome UI target that triggers it. For a local Linux run on an x86 Mac, use an amd64 container (`docker run --platform linux/amd64`) with Chrome, Java, and Maestro installed; export the web bundle with an API URL reachable from the container (usually `http://host.docker.internal:8080`) and run the web flow against the host-served bundle. Pass the same `--platform linux/amd64` option when building the image. Treat `e2e-web` as the authoritative web gate; the Docker route is a local way to inspect web flows without the macOS tab issue.

## Add a flow

Add YAML under `maestro/e2e/` and select controls by `id` whenever an app `testID` exists. Keep it platform-neutral, launch with `clearState`, and use `extendedWaitUntil` for asynchronous UI or WebSocket updates. If a needed control has no stable ID, add a prop-only `testID` and verify the web build exposes it as `data-testid`. For cross-user coverage, wait for `room-websocket-connected`, then use a `runScript` actor-B request and assert the UI update—never use a fixed sleep.

`maestro/e2e/munchkin_second_edition_room.yaml` covers creating a 2e room (which also creates and joins its owner character) and opening the 2e rules guide.

For substantial frontend changes that add or fix user-visible functionality, add or update a scenario-specific flow for the affected user path. For UI regressions, assert the reported behavior directly; a passing suite that never exercises the changed screen or control is not sufficient coverage.

## CI

GitHub Actions runs the exported web suite as the `e2e-web` required check. Native E2E is intentionally local: the commit hook protects frontend changes without the emulator/simulator cost and instability of hosted mobile runners.
