# Development Guide - Frontend

## Prerequisites

- Node.js 24+ (CI pins 24). npm 10+.
- Xcode 15+ for iOS simulator builds.
- Android Studio with the Android 14 (API 34+) SDK for Android emulator builds.
- Ruby 4.0.1 + Bundler for Fastlane (only required when building release artifacts; not needed for `npm run start`).
- Maestro CLI for E2E flows (`brew install mobile-dev-inc/tap/maestro`).

## Local Setup

```bash
cd frontend
npm ci
echo "EXPO_PUBLIC_API_URL=http://localhost:8080" > .env
```

Start the local backend (`backend/scripts/dev-up.sh`) before running the Expo client - the frontend fails fast in production mode if `EXPO_PUBLIC_API_URL` is invalid, and the local mode falls back to `http://localhost:8080` only when `__DEV__` is true.

## Running

```bash
npm run start      # expo start - opens the dev server
npm run ios        # expo run:ios (simulator + native dev build)
npm run android    # expo run:android (emulator + native dev build)
npm run web        # expo start --web
```

`expo run:ios` and `expo run:android` produce native dev builds the first time, then attach via the Expo dev client.

## Quality Gates

Run before opening a PR:

```bash
npm run lint    # expo lint (eslint flat config)
npm run tsc     # tsc --noEmit
npm run test    # both unit and room-route suites
```

CI (`.github/workflows/frontend-infra-cd.yml`) runs the same plus `npm run test:coverage` and the web export.

## Tests

Two Vitest configs:

```bash
npm run test:unit        # default config (vitest.config.ts) - excludes app routes
npm run test:room-route  # room route config (vitest.room-route.config.ts) - app routes only
npm run test:coverage    # vitest run --coverage; runs unit then room-route
npm run test:watch       # unit only; rerun room-route after route changes
```

The two configs exist because Expo Router rejects test files inside `app/`, so route tests live under `__tests__/app/` with a separate suite that has access to the React 19 act environment.

Conventions:

- jsdom environment; `react-native` aliased to `react-native-web` so RN components render in tests.
- Coverage threshold: `lines >= 70` (matches backend).
- Coverage scope: `api/`, `config/`, and `hooks/`. Components are tested but not part of the threshold.
- Tests for files in `frontend/app` go under `frontend/__tests__/app/` (mirrors the route paths).
- `test/setup.ts` opts into React 19's act warnings via `IS_REACT_ACT_ENVIRONMENT = true` and runs `cleanup()` between tests.

When adding a feature, write tests for:

1. The transport (`api/`) module: success path + at least one error path, including AbortSignal honoring.
2. The hook (`hooks/`) that exposes the feature: cache invalidation, optimistic update, rollback on error.
3. The route, if state management is non-trivial. Place under `__tests__/app/<segment>.test.tsx`.

## Maestro (E2E)

Frontend npm scripts wrap Maestro:

```bash
npm run maestro          # runs maestro/character_removal.yaml
npm run maestro:all      # runs every flow under maestro/
npm run maestro:record   # records the character_removal flow as MP4
```

The screenshot and preview-video flows live in `maestro/app_store_*.yaml` and `maestro/preview_video.yaml`; they are normally driven by the workspace-level `scripts/capture-*.mjs` helpers, not by hand.

## Web Export

```bash
EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web
```

Outputs to `frontend/dist`. The infrastructure stack (`infrastructure/index.ts`) reads from this directory and uploads the contents to S3.

## Native Builds (Fastlane)

iOS and Android release builds are usually produced by CI (`.github/workflows/{ios-app-store-cd,android-play-store-cd}.yml`). To run a release lane locally:

```bash
cd frontend
bundle install
bundle exec fastlane ios beta       # TestFlight upload
bundle exec fastlane android build  # gradle assembleRelease bundleRelease
bundle exec fastlane android deploy # upload .aab to Play internal track
bundle exec fastlane android beta   # build + deploy
```

iOS lanes require `MATCH_PASSWORD`, `MATCH_GIT_URL`, `APP_STORE_CONNECT_KEY*`, `APPLE_DEVELOPER_TEAM_ID`. Android lanes require `ANDROID_SIGNING_KEY*` and `GOOGLE_GHA_CREDS_PATH` (the workload-identity-mounted JSON path).

The `npm run prebuild:clean` script (`scripts/prebuild-clean.mjs`) wraps `expo prebuild --clean` for one or both platforms; it is invoked by both CI workflows before Fastlane runs to regenerate the native projects from the Expo config.

## Routing Conventions

- File-system routes under `app/`. Folders prefixed `(...)` are route groups (Expo Router convention) and do not contribute path segments. The room layout uses `(battle)` to present the battle composer as a modal.
- Typed routes are enabled (`experiments.typedRoutes: true` in `app.json`). Use the typed `router.push({ pathname, params })` form so renames stay safe.
- The root layout (`app/_layout.tsx`) is the only place that may register top-level providers.

## Adding a New Screen

1. Create the route file under `app/`.
2. Define a hook for any non-trivial state under `hooks/`.
3. If the screen calls a new endpoint, add the typed module under `api/`.
4. Add tests under `__tests__/app/<segment>.test.tsx` (use the existing tests as a template - they wrap the route in `QueryClientProvider`).
5. If the screen has a new design token, extend `constants/theme.ts::AppTheme` rather than inlining values.

## Adding a New API Module

1. New file under `api/`. Use `apiRequest<T>` for HTTP and `RoomWebSocketClient` for WS.
2. Always accept an optional `AbortSignal` argument so consumers can cancel.
3. Re-export the response type alongside the function so hook authors get strict typing without re-deriving it.

## Common Tasks

### Inspect TanStack Query state

In dev mode, install the React Query devtools and add a provider in `_layout.tsx` (currently disabled to keep production bundles slim). For one-off debugging, `queryClient.getQueryData(['characters', roomId])` from any hook gives you the cached state.

### Reset profile and characters locally

The frontend stores the profile under AsyncStorage key `user`. Clearing the simulator's app data (Erase All Content and Settings on iOS, Clear Storage on Android) resets it. On web, clear the site's localStorage.

### Test against a remote backend

Set `EXPO_PUBLIC_API_URL` to any reachable HTTPS API (the prod URL is `https://helpamunch.click`). The runtime config (Zod-validated) accepts any absolute URL. WebSocket URL rewriting (in `frontend/api/webSocket.ts`) handles HTTPS→WSS automatically.

### Catch a regression in real-time updates

The two consumers of `useRoomWebSocket` are `useRoomCharacters` and `useRoomBattle`. Both call `queryClient.invalidateQueries(...)` when their `subscribe` callback fires. If a real-time update is missed in the UI, check:

1. `parseNotificationEvent` in `backend/room-notifications-service/src/app.ts` (the event passes the wire-side filter).
2. `isValidNotificationEvent` in `frontend/api/webSocket.ts` (the event passes the client-side filter).
3. The hook subscription branch (e.g., `case 'character_updated':` in `useCharacters.ts`).

A common cause is adding a new event type without updating one of those three lists.

## Performance Notes

- React Compiler is enabled. Don't add `useMemo`/`useCallback` indiscriminately - measure first.
- `RoomCharactersList` uses `removeClippedSubviews` and a `keyExtractor`. Don't change those without checking the FlatList recycle behavior.
- Animations honor `AccessibilityInfo.isReduceMotionEnabled`. New animations should follow the same pattern (see `RoomCharacterCard.tsx` and `QuickEditSheet.tsx`).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Missing EXPO_PUBLIC_API_URL in a non-development environment.` | Production-style runtime config without an absolute URL. | Set `EXPO_PUBLIC_API_URL` before `expo export` or `npm run start`. |
| WebSocket never opens locally | Backend Compose stack not running, or Nginx not yet ready. | `./backend/scripts/dev-up.sh`, then `curl http://localhost:8080/health`. |
| `npm run test:room-route` hangs | Stale Vitest cache. | `rm -rf frontend/node_modules/.vite`. |
| iOS Match cert prompt | `MATCH_PASSWORD` missing in `.env` or `MATCH_GIT_URL` unreachable. | Provide both env vars; `MATCH_GIT_URL` requires SSH access to the certs repo. |
| Web export missing `_expo/static/...` | A previous build crashed mid-write. | `rm -rf frontend/dist` and re-run `npm run export:web --clear`. |
