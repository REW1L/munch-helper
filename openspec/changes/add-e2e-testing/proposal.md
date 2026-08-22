## Why

The app is one Expo codebase shipped to three platforms (iOS, Android, web via react-native-web) backed by six microservices, and its defining feature is real-time cross-user updates over WebSocket — yet there is no end-to-end test that exercises a crucial user path against the running stack, and nothing that verifies "another user changed their character and my screen updated." Unit/component tests (vitest) and the existing Maestro flows (built for store screenshots) do not cover these journeys, so regressions in navigation, the room/character lifecycle, or the WebSocket fanout can reach production unnoticed. This change establishes a single-tool E2E suite that runs the same flows on all three platforms, with web gated in pull requests and native coverage gated before frontend commits.

## What Changes

- **One tool, three platforms**: adopt **Maestro** (already at 2.4.0, already used for screenshots) as the single E2E driver for iOS simulator, Android emulator, and web (Chromium). Flows are written once in Maestro YAML, parameterized by `${ROOM_ID}` / `${USER_ID}`, and selected via the app's existing `testID`s — which react-native-web maps to `data-testid`, so the same ids work on web.
- **Local full-stack harness**: E2E runs against `backend/docker-compose.local.yml` (all six services + Redis + Mongo + nginx gateway on `:8080`), which already exposes a real WebSocket server at `/ws`. No AWS/cloud dependency. A harness script boots the stack, waits for health, and tears it down.
- **Test isolation**: each test derives a unique `roomId` + `userId` so runs don't contaminate each other, and cleans up (or relies on ephemeral stack state) between runs.
- **API-injected "actor B"**: cross-user scenarios are driven by a small HTTP helper that performs the *other user's* character writes directly against the backend (`POST/PATCH/DELETE /characters`). This triggers the real Redis → notifications → WebSocket → app path, so actor A's UI update is genuinely end-to-end. (Rationale: what's under test is actor A's inbound-event handling; Maestro also cannot yet drive two devices in one test.)
- **Crucial-path coverage (first cut)**:
  - Room lifecycle: create a room, join a room by id, land in the character list.
  - Character lifecycle: create, edit/quick-edit, change (name/avatar), delete a character.
  - Cross-user character updates: actor B **creates / updates / deletes** a character while actor A is on the room screen → actor A's list reflects the change (WebSocket-driven), including that actor A's own edits are not double-applied (local-echo suppression).
- **Web CI and native commit gate**: `.github/workflows/e2e.yml` runs the exported web suite as the required `e2e-web` pull-request check. A version-controlled Git pre-commit hook detects staged paths under `frontend/` and runs iOS followed by Android locally, serially, against the local backend stack. This preserves native coverage while avoiding hosted simulator/emulator cost and instability.
- **Documentation**: a testing guide covering how to run the suite locally per platform (including the Android emulator host `10.0.2.2` gotcha and web `--url` against the exported web build) and how to add new flows.

## Capabilities

### New Capabilities
- `e2e-testing`: Defines the end-to-end test deliverable — the single-tool (Maestro) cross-platform strategy, the local full-stack harness and test isolation model, the API-injected actor-B mechanism for cross-user scenarios, the first-cut crucial-path flow coverage (room + character lifecycle + cross-user character updates), web CI gating, and the native commit gate for staged frontend changes.

### Modified Capabilities
<!-- No existing spec covers testing or CI; this is net-new. -->

## Impact

- **New**: `.github/workflows/e2e.yml`; E2E harness scripts (boot/wait/teardown of the local stack, `roomId`/`userId` generation, actor-B HTTP helper); new Maestro flow files under `maestro/` for room + character lifecycle and cross-user updates; a testing guide doc (e.g. `docs/development-guide-e2e.md` / update `docs/index.md`).
- **Backend/API**: no code changes — uses the existing local stack (`docker-compose.local.yml`, nginx `/ws`) and existing endpoints (`/rooms`, `/characters`).
- **App code**: none for the first cut, unless a specific crucial-path element lacks a stable `testID` — any additions are limited to `testID` props (no behavior change). To be confirmed during design/implementation.
- **Frontend build (web)**: E2E web job runs `expo export --platform web` and serves the static output for Maestro to drive.
- **CI cost**: adds only a Linux web E2E job to affected pull requests. Native E2E uses the developer's local simulator/emulator before commits that stage `frontend/` changes.
- **Out of scope (separate changes)**: battle flow, shop, log view, and other paths; two-live-client cross-user tests (second driven device); cross-browser web (Maestro Web is Chromium-only); localization/visual-regression assertions.
