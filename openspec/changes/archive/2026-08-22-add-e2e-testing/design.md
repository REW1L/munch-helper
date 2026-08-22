## Context

The frontend is a single Expo/React Native app rendered to iOS, Android, and web (react-native-web ~0.21). The backend is six services (`user`, `room`, `character`, `battle`, `room-notifications`, `log`) plus Redis and Mongo, orchestrated for local dev by `backend/docker-compose.local.yml` behind an nginx gateway on `:8080`. The app's signature behavior is real-time cross-user updates: a character write flows `character-service → Redis (room-character-events) → room-notifications-service → WebSocket → app`, where the app's `RoomWebSocketClient` ([frontend/api/webSocket.ts](frontend/api/webSocket.ts)) invalidates the react-query cache and the list re-renders.

Crucially, the local stack runs a **real** `ws` WebSocketServer ([room-notifications-service/src/index.ts](backend/room-notifications-service/src/index.ts)) that nginx proxies at `/ws` with upgrade headers — not the AWS API-Gateway path. The app derives its WebSocket URL from `API_BASE_URL` (default `http://localhost:8080` → `ws://localhost:8080/ws`, [frontend/config/runtime.ts](frontend/config/runtime.ts)). So the full cross-user path is reproducible with `docker compose up` and zero cloud dependency.

Existing test assets: vitest unit/component tests; Maestro 2.4.0 flows built for store screenshots (`maestro/*.yaml`), which already demonstrate `${ROOM_ID}` parameterization, `clearState`, and `extendedWaitUntil`. There is no E2E suite for crucial paths and no E2E job in CI (only platform CD workflows exist).

## Goals / Non-Goals

**Goals:**
- One test-authoring tool (Maestro) driving the same flows across iOS, Android, and web.
- Genuine end-to-end coverage of room + character lifecycle against the running local stack.
- Genuine cross-user coverage: an external actor's character write results in the app-under-test's UI updating via the real WebSocket fanout.
- Deterministic, isolated runs (unique room/user per test; no shared mutable state between tests).
- Every affected PR gated by the web suite, with native E2E gated before commits that stage frontend changes.

**Non-Goals:**
- Battle, shop, and log flows (later changes).
- Two live driven clients in one test (Maestro can't; and it isn't needed for the inbound-event assertion).
- Cross-browser web (Maestro Web is Chromium-only).
- Visual-regression or localization assertions.
- Testing against deployed/cloud environments.

## Decisions

### D1 — Maestro as the single cross-platform driver (over Maestro-mobile + Playwright-web)
Maestro 2.4.0 supports web flows and drives iOS/Android natively. react-native-web maps `testID` → `data-testid` (verified in [ButtonLabel.test.tsx](frontend/components/ButtonLabel.test.tsx)), so the app's 64 existing `testID`s are valid selectors on all three platforms. Writing flows once and running them everywhere minimizes maintenance — the stated priority.
- *Alternative considered:* Maestro (mobile) + Playwright (web). Best-in-class web fidelity and cross-browser, but two flow languages and duplicated flows. Rejected in favor of single-tool maintenance.
- *Consequence:* accept Chromium-only web and a younger web driver (see R1).

### D2 — Run against the local docker stack, not mocks
The cross-user requirement is only meaningful if the real Redis→notifications→WebSocket path is exercised. `docker-compose.local.yml` provides exactly that. A harness script (`scripts/e2e/*` or `frontend/scripts/e2e/*`) boots the stack, polls `GET :8080/health` (and per-service health) until ready, runs flows, then tears down.
- *Alternative:* mock the WebSocket / stub the backend. Rejected — it would test the mock, not the fanout.

### D3 — API-injected "actor B" for cross-user scenarios
Cross-user flows use a small HTTP helper that performs the other user's writes directly against the backend (`POST/PATCH/DELETE /characters` with actor B's `userId` + the shared `roomId`). Because Maestro flows can shell out (`runScript`/`runFlow` with a JS step), the flow triggers actor B's write and then asserts actor A's list changes.
- *Rationale:* the system under test is actor A's inbound-event handling; actor B's write UI is already covered by A's own create/edit flows. Maestro also cannot drive two devices in one test.
- *Alternative:* a second Maestro instance driving actor B's UI. Higher fidelity, 2× flake and orchestration; deferred as a later fidelity upgrade.

### D4 — Test isolation via unique room + user ids
Each test generates a unique `roomId` and `userId` (e.g., timestamp/uuid suffix) so parallel or repeated runs don't collide. The app-under-test is launched with `clearState` and pointed at the shared `roomId`; actor B uses the same `roomId` with a distinct `userId`. Ephemeral stack state (fresh compose volumes in CI) plus unique ids removes the need for per-test cleanup endpoints.

### D5 — Per-platform runtime wiring
- **iOS sim**: dev client build; `EXPO_PUBLIC_API_URL=http://localhost:8080`; localhost reaches the host stack.
- **Android emulator**: host is reachable at **`10.0.2.2`**, so `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` (and the derived `ws://10.0.2.2:8080/ws`). This is the known gotcha to bake into the harness.
- **Web**: `expo export --platform web`, serve the static output, run `maestro test --url http://localhost:<port>`; the app uses the default `http://localhost:8080`.

### D6 — CI shape: web-only workflow plus a native commit hook
`.github/workflows/e2e.yml` contains one required `web` job (Linux + Chromium) for affected pull requests. It has a 120-minute timeout, exports the web app, serves it locally, creates URL-configured copies of the shared flows, and runs them sequentially before closing the browser and server. Maestro's `id` selector resolves React Native Web's `data-testid`, so the shared flows retain their stable `testID` selectors. CI leaves Maestro's headless viewport at its default: forcing `1920x1080` made routine commands take minutes and caused the suite to exceed its timeout. Local macOS runs use a normal Maestro Chromium window because its headless driver can report a one-pixel height; cleanup recognizes both headed and headless Maestro Chromium processes.

Native coverage is a version-controlled Husky `.husky/pre-commit` quality gate, installed by the root-package `prepare` script. The hook examines `git diff --cached --name-only` and invokes `npm run test:e2e:mobile` only when a staged path begins with `frontend/`. The runner starts the backend stack once, starts iOS Release with `EXPO_PUBLIC_API_URL=http://localhost:8080` and `--no-bundler`, waits for the release app to install, then stops Expo's headless CLI before running iOS flows serially. It repeats that sequence for Android with `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080`, using a connected device or launching the first installed AVD. This accounts for Expo 54 retaining its headless CLI process after the release app is installed. The runner invokes cleanup before every Maestro command and tears down the stack on success or failure.

## Risks / Trade-offs

- **R1 — Maestro Web is younger/Chromium-only** → Keep web assertions tolerant: rely on `extendedWaitUntil` with generous timeouts (the WebSocket update is async), select by stable `data-testid`, avoid pixel/layout assertions. Treat cross-browser as out of scope.
  - **Known limitation (macOS local runs, Maestro 2.8.0):** `launchApp` leaves a second, blank `data:,` browser tab open alongside the real app tab; Maestro's `detectWindowChange` driver logic can latch onto that blank tab instead of the app tab, failing every selector assertion against an empty page (and sometimes hanging instead of exiting). Reproduced with and without the shared dev-client `runFlow` guard, in headed and `--headless` mode, and with both the system Chrome and a Selenium-managed Chrome-for-Testing build (`SE_FORCE_BROWSER_DOWNLOAD=true`) — so it is an upstream driver bug, not something fixable in this repo's flows or scripts. It does not reproduce on the `e2e-web` GitHub Actions job (true headless Chrome on Linux never creates the extra browser-chrome UI target that triggers it), so **`e2e-web` remains the authoritative local+CI web gate**; treat a local macOS web run as a convenience that may need a Maestro update before it's reliable.
- **R2 — WebSocket timing flake in cross-user tests** → Assert with `extendedWaitUntil` on the post-update state (not fixed sleeps); give the fanout a generous window; ensure actor A is confirmed connected (the app invalidates the query `onOpen`) before actor B writes.
- **R3 — Native E2E lengthens frontend commits** → The gate only triggers when staged paths are under `frontend/`, runs the platforms serially to protect Maestro, and can also be started directly with `npm run test:e2e:mobile` before staging.
- **R4 — Native device/toolchain availability is local** → The gate makes missing/failed simulator, emulator, Docker, Expo, or Maestro setup fail visibly before the commit; Husky installs the gate during normal root-package installation.
- **R5 — Local-echo suppression regressions** ([useCharacters.ts](frontend/hooks/useCharacters.ts)) → Include an explicit cross-user case where actor A edits its own character and must see exactly one applied change (no double-apply from the echoed event).
- **R6 — Missing/unstable testIDs on some crucial-path elements** → Audit the room + character-lifecycle screens during implementation; add `testID`s where needed (prop-only, no behavior change) rather than selecting by translated text (i18n makes text brittle).

## Migration Plan

Additive only — no runtime/app behavior changes. Land the harness + flows + docs, make `e2e-web` the required PR check, and let Husky install the version-controlled hook during root-package installation. Rollback = remove/de-require the web workflow and the Husky hook; no production surface is touched.

## Open Questions

- Where do harness scripts and flows live — top-level `maestro/` + `scripts/e2e/`, or under `frontend/`? (Existing flows are top-level `maestro/`; lean that way for consistency.)
- Should the `roomId`/`userId` generation and actor-B helper be a small Node module invoked via Maestro `runScript`, or standalone shell used in `before` hooks? (Design leans `runScript` JS for portability across the three CI OSes.)
- Do any first-cut screens require new `testID`s (resolved during the R6 audit)?
