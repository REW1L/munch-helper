# End-to-end testing

The E2E suite uses Maestro against the local Docker stack. It drives the same flows on iOS, Android, and the exported web app, including actor-B writes delivered to actor A through the real Redis and WebSocket path.

## Prerequisites

Install Docker (Docker Desktop or Colima on macOS), Node 24, a current Maestro CLI, and the platform simulator/emulator you plan to use. From the repository root, start an isolated local stack:

```sh
npm run e2e:stack:start
```

Keep this backend stack running for the entire iOS, Android, or web E2E run. The command waits for the nginx gateway at `http://localhost:8080/health` and the required services. Stop it when finished with `npm run e2e:stack:stop`. CI starts and stops an isolated stack separately in each platform job and additionally drops volumes, so every run begins with an empty database.

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
(cd frontend && EXPO_PUBLIC_API_URL=http://localhost:8080 EXPO_PUBLIC_E2E=true npx expo run:ios --configuration Release --no-build-cache)
node scripts/e2e/cleanup.mjs
maestro test -p ios -e API_URL=http://localhost:8080 -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" maestro/e2e
```

For Android, the release app uses `10.0.2.2`, the emulator's alias for the host machine. Maestro actor scripts run on the host, so keep their API URL as `localhost`.

```sh
(cd frontend && EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 EXPO_PUBLIC_E2E=true npx expo run:android --variant release --no-build-cache)
node scripts/e2e/cleanup.mjs
maestro test -p android -e API_URL=http://localhost:8080 -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" maestro/e2e
```

For web, export and serve the static bundle, then point Maestro's web driver at it:

```sh
(cd frontend && EXPO_PUBLIC_API_URL=http://localhost:8080 npm run export:web)
(cd frontend && npx serve dist -l 19006 > /tmp/munch-e2e-web-server.log 2>&1) & echo $! > /tmp/munch-e2e-web-server.pid
node scripts/e2e/prepare-web-flows.mjs --output /tmp/munch-maestro-web --url http://localhost:19006
node scripts/e2e/cleanup.mjs
maestro test -p web --headless -e API_URL=http://localhost:8080 -e ROOM_ID="$ROOM_ID" -e USER_ID="$USER_ID" -e ACTOR_B_USER_ID="$ACTOR_B_USER_ID" /tmp/munch-maestro-web/join-room.yaml
node scripts/e2e/cleanup.mjs
```

The web driver requires a URL in each flow, while native flows require an app id. `prepare-web-flows.mjs` creates a temporary URL-configured copy without maintaining a second authored suite. Run the flows sequentially with a fresh `prepare-room.mjs` fixture per flow in CI.

## Add a flow

Add YAML under `maestro/e2e/` and select controls by `id` whenever an app `testID` exists. Keep it platform-neutral, launch with `clearState`, and use `extendedWaitUntil` for asynchronous UI or WebSocket updates. If a needed control has no stable ID, add a prop-only `testID` and verify the web build exposes it as `data-testid`. For cross-user coverage, wait for `room-websocket-connected`, then use a `runScript` actor-B request and assert the UI update—never use a fixed sleep.
