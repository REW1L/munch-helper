# Architecture - Frontend

## Executive Summary

The frontend is an Expo Router app built with React 19.2 and React Native 0.83.2 that ships to iOS, Android, and the web export. It composes layered modules - `app/` for routes, `hooks/` for orchestration, `api/` for transport, `config/` for runtime validation - on top of TanStack Query for server state and a hand-rolled WebSocket client for real-time updates.

## Technology Stack

| Category | Technology | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 24+ | Local dev only; published artifacts are RN bundles. |
| Language | TypeScript | ~5.9.2 | `strict: true`, paths alias `@/*` -> repo root. |
| App framework | Expo | ^55.0.0 | With the `expo-router`, `expo-image`, `expo-haptics`, `expo-clipboard`, `expo-navigation-bar`, `expo-splash-screen`, `expo-web-browser`, `expo-symbols`, `expo-constants`, `expo-font` plugins. |
| Routing | expo-router | ~55.0.0 | File-system routing under `app/`. Typed routes enabled (`experiments.typedRoutes: true`). |
| Native | React Native | 0.83.2 | Coordinated with Expo 55 + React 19; do not bump independently. |
| UI library | React | 19.2.0 | React Compiler enabled (`experiments.reactCompiler: true`). |
| Server state | @tanstack/react-query | ^5.90.21 | One QueryClient at the root layout with `staleTime: 15s`, `retry: 1`. |
| Schema validation | zod | ^4.3.6 | Used for runtime config and persisted profile shape. |
| Local persistence | @react-native-async-storage/async-storage | 2.2.0 | Stores user profile under key `user`. |
| Animation | react-native-reanimated | ~4.2.1 | Transitions inside QuickEditSheet, RoomCharacterCard flash. |
| Color picker | reanimated-color-picker | ^4.2.0 | Used in the character edit modal. |
| Pickers | @react-native-picker/picker / @expo/ui SwiftUI Picker | 2.11.4 | Native picker on iOS via `@expo/ui/swift-ui`; cross-platform fallback via `@react-native-picker/picker`. |
| Testing | Vitest 4.0.18 + Testing Library RN | latest | jsdom environment; `react-native` aliased to `react-native-web`. |
| E2E | Maestro | latest | Flows live in `maestro/`. |
| Linting | eslint-config-expo | ~55.0.0 | Adds `react-hooks/exhaustive-deps: warn`. |
| Mobile delivery | Fastlane (Match, deliver, supply) | 2.232+ | Configured in `frontend/fastlane/`. |

## Architecture Pattern

**Layered with refcounted shared state**. Each layer has one responsibility:

```text
app/                         <- Expo Router routes; thin composition only
   │
   ▼
hooks/                       <- Orchestration: TanStack Query + business glue
   │
   ▼
api/                         <- Typed HTTP/WS transport; no React, no state
   │
   ▼
config/runtime.ts            <- Zod-validated env (single source of API_BASE_URL)
   │
   ▼
fetch / WebSocket / AsyncStorage / Clipboard / Haptics
```

`components/` is orthogonal - reusable UI consumed by routes and hooks. `context/` exposes a single context (`userProfileContext`) keyed off the `useUserProfile` hook. `constants/` holds design tokens (`AppTheme`), avatar registries, and release-content strings. `utils/` holds pure helpers (`createUuidV4`, `reconcilePlayerParticipants`, `computePlayerTotal`).

The most important non-obvious pattern is the **refcounted WebSocket registry**. Multiple hooks (`useRoomCharacters`, `useRoomBattle`) on the same screen need notifications for the same room, and we cannot afford two sockets per `(roomId, userId)`:

```ts
// frontend/api/webSocket.ts
const clientRegistry = new Map<string, RegistryEntry>();
function acquireRoomWebSocketClient(roomId, userId, options) { ... refCount + 1 ... }
function releaseRoomWebSocketClient(roomId, userId) { ... refCount - 1; disconnect at 0 ... }
```

`useRoomWebSocket` is the only hook that touches this registry. `useRoomCharacters` and `useRoomBattle` consume `useRoomWebSocket` and add their own `subscribe(...)` callbacks. The first acquirer triggers `client.connect()`; subsequent acquirers simply attach more open/close listeners.

## Routing Structure

`expo-router` resolves routes from `app/` paths. Tests for these routes live under `__tests__/app/` (Expo Router rejects test files inside `app/`).

```text
app/
├── _layout.tsx                 <- Root layout; wraps everything in providers.
├── index.tsx                   <- Landing page (/)
├── rooms.tsx                   <- /rooms (game selection home)
├── privacy.tsx                 <- /privacy (App Store + Play Store compliance page)
├── support.tsx                 <- /support
├── main/
│   ├── modal-room-create.tsx   <- Imported from rooms.tsx
│   ├── modal-room-join.tsx
│   ├── modal-change-user.tsx
│   ├── modal-change-avatar.tsx
│   └── modal-shop.tsx
└── munchkin/
    ├── index.tsx               <- /munchkin (loader; redirects to room when ready)
    ├── modal-create-character.tsx
    ├── modal-change-caracter.tsx     (sic)
    └── [roomNumber]/
        ├── _layout.tsx         <- Room nav header (copy room code) + nested Stack
        ├── index.tsx           <- /munchkin/<roomId>
        ├── log.tsx             <- /munchkin/<roomId>/log
        └── (battle)/
            ├── _layout.tsx     <- Modal presentation
            └── index.tsx       <- /munchkin/<roomId>/(battle)
```

`(battle)` is a **route group** (Expo Router parens convention) so the battle screen presents as a modal without changing the URL hierarchy. The room layout detects whether the current segment list contains `(battle)` or `log` to swap the header between the room-code copy chip and the minimal back button.

## Provider Tree

```tsx
<RootErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <userProfileContext.Provider value={{ userProfile, setUserProfile }}>
      <Stack screenOptions={...} />
    </userProfileContext.Provider>
  </QueryClientProvider>
</RootErrorBoundary>
```

`RootErrorBoundary` is a class component that catches synchronous render errors and shows a fallback. The QueryClient is configured at the root with `staleTime: 15_000` and `retry: 1` - hooks that need different behavior override per-query.

`getRuntimeConfig()` is called at the start of `RootLayout` so the app fails fast on invalid config in production. In development, `EXPO_PUBLIC_API_URL` is allowed to default to `http://localhost:8080`.

## Data Flow Patterns

### HTTP

All HTTP traffic goes through `apiRequest` (`api/http.ts`). Behavior:

- JSON content-type by default; the body is JSON-serialized.
- Detects `application/json` response content-type and parses it; otherwise returns `undefined`.
- Throws `ApiError(message, status, details)` for non-2xx with `details` set to the parsed body when available.
- Retries on 408, 429, and 5xx with linearly-increasing backoff (`retryDelayMs * attempt`). Default `retryCount: 1`, `retryDelayMs: 250`.
- Honors `AbortSignal` and re-throws abort errors immediately without retry.
- Endpoints can opt out of retries (the discard-battle path passes `retryCount: 0` so a 5xx that lands after a successful soft-delete does not turn into a confusing 409 on retry).

### Server State

TanStack Query is used as a server-state cache, not a global store. Conventions:

- Each domain has a stable `getXxxQueryKey(roomId)` factory in the same hook file (e.g., `getCharactersQueryKey(roomId)` returns `['characters', roomId]`).
- Hooks that mutate then invalidate use `queryClient.invalidateQueries({ queryKey })` in `onSettled`. Optimistic updates set the cache directly in `onMutate`, capture the previous state in the mutation `context`, and roll back in `onError`.
- The WebSocket flips from "live" to "stale-trigger" when `useRoomWebSocket` reports `onOpen` - that's the cue to invalidate the relevant query so we re-sync after a reconnection.
- Local-update echo suppression in `useRoomCharacters` records suppressible echoes per character id; when the server's WebSocket echoes our own update, we increment a marker rather than re-flashing the card border (the per-card flash signal is reserved for genuine remote updates).

### Real-time

`RoomWebSocketClient` (`api/webSocket.ts`) wraps the native `WebSocket` with:

- Open / close listener registries (multiple hooks can attach independently).
- Automatic exponential-backoff reconnect (`reconnectDelay * 2^(attempt-1)`) up to `maxReconnectAttempts` (default 5).
- Ping heartbeat (default every 30 seconds). The server-side does not require it but it keeps NAT/proxy paths warm.
- A registered close listener delays reconnect when `disconnect()` was called explicitly.

`useRoomWebSocket` exposes `isConnected`, `isReconnecting` (transient gap after a previous successful connection), `isTimedOut` (8s after disconnect with no recovery), and a `reconnect()` action wired to:

- Foreground transitions (`useReconnectOnForeground`): re-subscribes when the app returns from background.
- Manual retry button (visible only when `isTimedOut && !isConnected`).

`isValidNotificationEvent` is the consumer-side schema check that mirrors `parseNotificationEvent` on the backend. New event types must be added in both places.

### Local Persistence

`useUserProfile` is the only place that reads/writes AsyncStorage. The flow:

1. On mount: read `user` key, validate with `StoredUserProfileSchema`. If valid, fetch the latest profile from `GET /users/:userId`; on 404 (server lost the user), recreate via `POST /users` with the same nickname + avatar.
2. On update: write to AsyncStorage first, then PATCH the server (`updateUserProfile`). Local writes always succeed; server failures are intentionally swallowed at this layer because the user can keep playing offline-ish until the next mutation.
3. Screenshot mode (`EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME`) bypasses the random-nickname generator so Maestro captures named users instead of `Player XXXXX`.

## Component Architecture

### Top-level building blocks

- `RoomCharactersList` (`components/munchkin/RoomCharactersList.tsx`) - FlatList of `RoomCharacterCard`, with header (action error), empty (loading + error), and footer (`Create character` button).
- `RoomCharacterCard` - The most decorated component. Animates a colored border flash (700ms) on remote updates; respects `AccessibilityInfo.isReduceMotionEnabled` and substitutes a static reduced-motion fallback. Subscribes to per-character realtime signals.
- `CurrentCharacterFooter` - Fixed footer for the user's own character; identical visual to the cards above but always rendered last.
- `ActiveBattleBanner` - Tap-to-open banner when `useRoomBattle().battle !== null`.
- `ReconnectingBanner` - Announces "Reconnecting…" both visually and via `AccessibilityInfo.announceForAccessibility`.
- `BattleSidePanel` - Self-contained editor for one side (`players` or `monsters`). Includes a modal monster-add dialog; bonus values come from `BONUS_VALUES = [-10, -5, -2, -1, 1, 2, 5, 10]`.
- `BattleConcludeAction` / `BattleDiscardAction` - Primary actions for the battle modal. Discard wraps `ConfirmDialog` (which delegates to `Alert.alert` on native and renders an inline modal on web).
- `LogEntry` - Renders character/battle log entries with a 4-way switch on `eventType`. Battle-concluded and battle-discarded events that have a usable payload are tappable; they open `BattleHistoryModal`.
- `QuickEditSheet` - Bottom sheet for level/power adjustments with haptic feedback, reduced-motion handling, and gesture-driven dismiss.
- `NativePicker` (+ `.ios` variant) - Platform split: SwiftUI menu picker on iOS, cross-platform Picker elsewhere.

### Pure helpers

- `utils/battlePlayerSide.ts::reconcilePlayerParticipants` - Takes the battle's `playerSide.characterIds` and the room's character list, and partitions them into `active` (still in the room) and `removed` (id present in the battle but not in the room anymore). The battle UI shows removed participants with a strikethrough and lets the user drop them.
- `utils/battlePlayerSide.ts::computePlayerTotal` - Adds up `level + power` per active participant plus all bonus values; tolerates `NaN` values defensively.
- `components/munchkin/logEntryTime.ts::formatRelativeTime` - "just now / Nm ago / Nh ago / Nd ago".
- `components/munchkin/logEntryBattle.ts::narrowBattlePayload` - Strict type narrowing for log payloads. Used both by the log row and the battle-history modal.

## Source Tree

See [Source Tree Analysis](./source-tree-analysis.md#frontend) for the annotated tree.

## Development Workflow

See [Development Guide - Frontend](./development-guide-frontend.md) for commands. Quality gates that the CI workflow enforces (`frontend-infra-cd.yml`):

1. `npm ci` (Node 24 in CI).
2. `npm run lint` (`expo lint`, which is the flat config in `eslint.config.js`).
3. `npm run tsc` (`tsc --noEmit`).
4. `npm run test:coverage` - runs both the unit suite and the room-route suite under coverage.
5. `EXPO_PUBLIC_API_URL=… npm run export:web --clear` - the artifact is uploaded for the infrastructure deploy step.

## Deployment

- **Web**: `expo export --platform web` writes static files to `frontend/dist`. Pulumi uploads them to S3 with HTML `no-cache`, `_expo/static/**` immutable, everything else 1 day.
- **iOS**: Fastlane `beta` lane (Match certificates, build via Xcode workspace, upload to TestFlight). Triggered by `ios-app-store-cd.yml`.
- **Android**: Fastlane `build` then `deploy` (Gradle bundle release, upload to Play Store internal track in `release_status: draft`). Triggered by `android-play-store-cd.yml` with GCP workload identity.

## Testing Strategy

Two Vitest configs (see `vitest.config.ts` and `vitest.room-route.config.ts`):

- The default config covers `api/`, `config/`, `hooks/`, and `components/` tests. Coverage thresholds: `lines >= 70%` (kept aligned with backend).
- The room-route config covers `__tests__/app/munchkin/[roomNumber]/...` tests separately because they need the React-Test-Renderer-aware React 19 act environment from the Expo Router fixtures.

Conventions:

- jsdom environment; `react-native` aliased to `react-native-web` so RN components render in tests.
- `test/setup.ts` opts into React 19's act warnings via `IS_REACT_ACT_ENVIRONMENT = true` and runs `cleanup()` between tests.
- HTTP tests mock `fetch` directly; WebSocket tests mock the global WebSocket class.
- All `useXxx` hooks are tested through `renderHook` (Testing Library) or by using a thin wrapping component to provide a `QueryClientProvider`.
- For screen tests, mocks for `AsyncStorage`, `expo-clipboard`, `expo-haptics`, `expo-router`, and the picker module are set up at the top of each test file.
- Tests for files in `frontend/app` go under `frontend/__tests__/app/` (mirrors the route paths).

E2E coverage uses Maestro (`maestro/character_removal.yaml` and the screenshot/preview flows). `npm run maestro` runs the character-removal regression locally.

## Performance and Accessibility

- React Compiler is enabled; do not hand-add `useMemo`/`useCallback` on every prop. Use it where memoization is actually expensive (e.g., FlatList renderers, animated styles).
- `RoomCharacterCard` and `RoomCharactersList` are wrapped in `memo`; the card uses `removeClippedSubviews` in the FlatList.
- Reduced motion: every screen with non-trivial animation (`RoomCharacterCard`, `QuickEditSheet`) reads `AccessibilityInfo.isReduceMotionEnabled` and provides a non-animated fallback.
- Reconnect announcements use `AccessibilityInfo.announceForAccessibility` so screen readers receive the status without polling.
- Touch targets follow a 44pt minimum; bottom-sheet controls are sized accordingly.

## Known Constraints and Tradeoffs

- **No global store**. Everything that survives navigation is either TanStack Query cache, AsyncStorage, or `userProfileContext`. Don't introduce a Zustand/Redux layer without an explicit need.
- **WebSocket-first sync**. We rely on the WebSocket to keep clients in sync. If the socket drops, `useRoomWebSocket.onOpen` re-invalidates the relevant queries on reconnect. Polling is intentionally not configured.
- **Class/race/gender are arrays serialized as JSON strings** end-to-end. The backend stores strings; `frontend/api/characters.ts::parseArrayField` handles strings, JSON arrays, and comma-separated fallbacks defensively. Don't change the wire format without also migrating Mongo.
- **Unique character ids prefixed `temp-`** are placeholders for optimistic creates. Anywhere we filter optimistic items (e.g., the battle add-character picker) does so by checking the prefix - keep that contract intact.
- **`battle.id` is the actorId on battle events.** Logs and notifications carry the battle id (not a user id) as `actorId` for battles. Same for character events: `actorId === characterId`.
- **Web export uses `react-native-web`**. Some native modules require `Platform.OS` checks; the landing page uses `Platform.OS === 'web'` to gate the App Store / Play Store badges.

## Adding a New Route

1. Create `app/<segment>.tsx` (or a folder with `_layout.tsx` + `index.tsx`). For typed routes to pick it up, `experiments.typedRoutes: true` already applies.
2. If you need data fetching, add a hook under `hooks/` that wraps a TanStack Query call.
3. If the route opens a modal, render the modal component in the same route file and gate visibility with local `useState`.
4. Add tests under `__tests__/app/<segment>.test.tsx`.

## Adding a New API Endpoint

1. Add the typed module under `api/` (one file per resource).
2. Use `apiRequest<TResponse>` to keep retry / abort / JSON parsing uniform.
3. If the call needs cancellation, accept an `AbortSignal` parameter and pass it via `signal`.
4. If the call participates in TanStack Query mutations, add a hook under `hooks/` and wire `onSettled` to invalidate the right query keys.
