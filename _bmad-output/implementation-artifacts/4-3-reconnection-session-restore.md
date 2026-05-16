# Story 4.3: Reconnection & Session Restore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player who has experienced a disconnection or backgrounded the app,
I want the app to restore my room context automatically on reconnect,
so that I can continue the session without losing state or having to rejoin manually.

## Acceptance Criteria

1. **Given** I am disconnected from an active room due to a network drop
   **When** connectivity is restored
   **Then** the app reconnects automatically and restores the current room state within 5 seconds
   **And** I am returned to the Room View — not redirected to Battle View even if a battle is active
   **And** the active battle state is reflected in the Room View via `useRoomBattle` without auto-navigation

2. **Given** I background the app while in an active room and then bring it back to the foreground
   **When** the app resumes
   **Then** room context is restored automatically as above

3. **Given** the app crashes and is relaunched, or is fully removed from device memory and restarted cold
   **When** the app starts
   **Then** session restore does NOT apply — the user starts from the landing screen and must re-enter the room manually

4. **Given** reconnection fails after 8 seconds
   **When** the timeout is reached
   **Then** a "Connection lost · Retry" button is shown so I can manually trigger reconnection

## Tasks / Subtasks

- [x] Task 1: Implement `useReconnectOnForeground` hook that listens to `AppState` changes and triggers WebSocket reconnect when app returns to `active` from `background`/`inactive` (AC: 2)
  - [x] Use React Native `AppState` from `react-native`
  - [x] On transition to `active` from a non-active state, call WebSocket `connect()` if not already connected
  - [x] Do NOT persist any room ID to storage — reconnect only if the hook already has `roomId` in memory

- [x] Task 2: Integrate reconnect-on-foreground into the Room View and `useRoomWebSocket` (AC: 1, 2)
  - [x] Extend `useRoomWebSocket` to accept and expose a `reconnect()` callback that can be called externally
  - [x] Call `useReconnectOnForeground` from `frontend/app/munchkin/[roomNumber]/index.tsx`, passing `roomId`, `userId`, and the `reconnect` callback
  - [x] On reconnect, refresh room state via existing `useRoomCharacters` refresh mechanism

- [x] Task 3: Implement 8-second timeout and "Connection lost · Retry" UI (AC: 4)
  - [x] In `useRoomWebSocket`, track elapsed time since last disconnect using `useRef` and `setTimeout`
  - [x] After 8 seconds with no successful reconnect, expose `isTimedOut: boolean` in hook return value
  - [x] In `frontend/app/munchkin/[roomNumber]/index.tsx`, render a "Connection lost · Retry" `Pressable` when `isTimedOut` is true
  - [x] Tapping the button calls `reconnect()` and resets the timeout counter
  - [x] Style the button using `AppTheme` tokens (`surfaceSubtle` background, `textMuted` text) consistent with the `ReconnectingBanner` planned in Story 4.4

- [x] Task 4: Confirm cold-start / crash scenario does NOT auto-reconnect (AC: 3)
  - [x] Verify that when `roomId` is not in memory (fresh app start), no reconnection or session restore is attempted
  - [x] No `AsyncStorage` or persistent storage writes for room session in this story

- [x] Task 5: Tests (AC: 1, 2, 3, 4)
  - [x] Add unit tests for `useReconnectOnForeground` covering: foreground transition triggers reconnect, background transition does not, no reconnect when already connected
  - [x] Add unit tests for the 8-second timeout behavior in `useRoomWebSocket`: `isTimedOut` becomes `true` after 8s without reconnect, resets on successful reconnect
  - [x] Add component test for "Connection lost · Retry" button appearance and tap behavior in room view

- [x] Task 6: Run frontend validation after implementation
  - [x] `cd frontend && npm run test:unit -- useRoomWebSocket.test.ts useReconnectOnForeground.test.ts`
  - [x] `cd frontend && npm run lint`
  - [x] `cd frontend && npm run tsc`

### Review Findings

- [x] [Review][Patch] Auto-backoff reconnect does not refresh missed room state [frontend/hooks/useCharacters.ts:113]
- [x] [Review][Patch] Foreground reconnect is missed when the hook enables after backgrounding [frontend/hooks/useReconnectOnForeground.ts:5]

## Dev Notes

### Story Foundation

- Epic 4, Story 4.3 is the session-restore layer on top of the WebSocket reconnect already implemented in Story 4.1.
- The existing `RoomWebSocketClient` in `frontend/api/webSocket.ts` already supports `attemptReconnect()` with exponential backoff (up to 5 attempts, starting at 3s delay). This story adds the foreground-resume trigger and the timeout escalation path.
- **Do NOT break** the existing `attemptReconnect` logic — the new `useReconnectOnForeground` hook supplements it for the background-resume case.
- Story 4.4 (`ReconnectingBanner`) builds directly on top of this story's `isConnected`/`isTimedOut` state — expose these clearly from `useRoomWebSocket`.

### Architecture Guardrails

- **Warm resume rule (ADR-10):** On reconnect, always navigate to Room View. Room View queries `useRoomBattle` on mount. No auto-navigation to Battle View.
- **No persistent storage:** Do NOT write `roomId` to `AsyncStorage` or any other storage for session restore. Session restore only works if the app was backgrounded (not killed); memory-resident `roomId` from `useLocalSearchParams` / React state is sufficient.
- **Cold start exclusion (AC: 3):** If the app is killed and relaunched, Expo Router will route to `index.tsx` (landing screen), not to `[roomNumber]/index.tsx`. No session restore hook should fire.
- Keep room composition at the route level in `frontend/app/munchkin/[roomNumber]/index.tsx`. Do not embed reconnect logic into child components.
- Follow the existing hook pattern: `useRoomWebSocket` returns a plain object with typed fields. Extend with `isTimedOut` and `reconnect` — do not change existing return fields.

### Technical Implementation Details

**`useReconnectOnForeground` hook** (`frontend/hooks/useReconnectOnForeground.ts`):
```typescript
// Pattern: subscribe to AppState, call reconnect when returning to active
import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';

export function useReconnectOnForeground(
  enabled: boolean,
  onForeground: () => void
): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        onForeground();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [enabled, onForeground]);
}
```

**8-second timeout in `useRoomWebSocket`**:
- Start a `setTimeout` of 8000ms from the WebSocket `onclose` / disconnect event (i.e. when the socket drops), **not** from `isConnecting` transitioning to `true` — `isConnecting` only reflects the initial mount connect and is not re-raised on later drops
- Clear the timer when `isConnected` becomes `true` (successful `onopen`)
- If timer fires without `isConnected`, set `isTimedOut = true`
- Reset `isTimedOut` and restart the timer when `reconnect()` is manually called

**`reconnect()` callback** added to `useRoomWebSocket` return value:
- **Do NOT call `client.disconnect()` before reconnecting.** Calling `disconnect()` sets the client's internal "intentionally closed" flag, which suppresses `attemptReconnect()` on the next `onclose` event. If the manual reconnect itself fails, the auto-backoff would be silently disabled.
- Instead, call `client.connect()` directly (or introduce a dedicated `client.reconnect()` method that resets the flag and calls connect). Reset `reconnectAttempts` to `0` before calling connect so backoff restarts cleanly.
- Resets the 8-second timeout

**"Connection lost · Retry" button** in Room View (`[roomNumber]/index.tsx`):
- Rendered above the characters list when `isTimedOut && !isConnected`
- Use `AppTheme.colors.surfaceSubtle` background and `AppTheme.colors.textMuted` text color
- Accessibility label: `"Connection lost. Tap to retry"`

### Previous Story Intelligence (Story 3.8 / Story 4.1)

From Story 3.8 and 4.1 learnings:
- The WebSocket echo suppression logic in `useRoomCharacters` uses a time window — do not interfere with this when reconnecting; a reconnect refresh should not suppress realtime signals.
- `useRoomCharacters` exposes a `refresh()` method — call it after successful reconnect to sync state.
- When running tests for hook behavior, use fake timers (`vi.useFakeTimers()`) to control `setTimeout`/`setInterval` deterministically.

### Project Structure Notes

**New files:**
```
frontend/hooks/useReconnectOnForeground.ts       NEW — AppState listener
frontend/hooks/useReconnectOnForeground.test.ts  NEW — co-located test
```

**Modified files:**
```
frontend/hooks/useRoomWebSocket.ts               ADD isTimedOut, reconnect() to return type
frontend/hooks/useRoomWebSocket.test.ts          EXTEND with timeout and reconnect tests
frontend/app/munchkin/[roomNumber]/index.tsx     ADD useReconnectOnForeground call + Retry button UI
```

**No new backend changes** are required for this story.

### References

- Epic 4 acceptance criteria: `_bmad-output/planning-artifacts/epics/epic-4-realtime-room-awareness-recovery.md` (Story 4.3 section)
- WebSocket client: `frontend/api/webSocket.ts` — `RoomWebSocketClient.attemptReconnect()`
- WebSocket hook: `frontend/hooks/useRoomWebSocket.ts`
- Room View: `frontend/app/munchkin/[roomNumber]/index.tsx`
- Architecture: ADR-10 (warm resume) — `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- UX patterns — `_bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md#12.2 Feedback Patterns` (reconnecting state)
- Project context rules: `_bmad-output/project-context.md` (no persistent storage for session, React Native AppState API)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-07: `npm run test:unit -- useRoomWebSocket.test.ts useReconnectOnForeground.test.ts` passed.
- 2026-05-07: `npm run test:room-route -- '[roomNumber].test.tsx'` passed.
- 2026-05-07: `npm run test` passed: unit 80/80 and room route 21/21.
- 2026-05-07: `npm run lint` passed with one pre-existing warning in `frontend/app/munchkin/modal-change-caracter.tsx`.
- 2026-05-07: `npm run tsc` passed.

### Completion Notes List

- Added `useReconnectOnForeground` using React Native `AppState`; foreground reconnect is enabled only when room/user IDs are in memory and the socket is currently disconnected.
- Extended `RoomWebSocketClient` and `useRoomWebSocket` with lifecycle callbacks, a public `reconnect()`, and an 8-second disconnect timeout surfaced as `isTimedOut`.
- Routed reconnect state through `useRoomCharacters` so Room View keeps one WebSocket connection, refreshes characters after reconnect, and renders the retry Pressable without adding persistent room storage.
- Added a narrow current-user create cooldown update to prevent duplicate auto-create after manual replacement creation and stale character refetches.

### File List

- frontend/api/webSocket.ts
- frontend/app/munchkin/[roomNumber]/index.tsx
- frontend/__tests__/app/munchkin/[roomNumber].test.tsx
- frontend/hooks/useCharacters.ts
- frontend/hooks/useReconnectOnForeground.ts
- frontend/hooks/useReconnectOnForeground.test.ts
- frontend/hooks/useRoomWebSocket.ts
- frontend/hooks/useRoomWebSocket.test.ts
- _bmad-output/implementation-artifacts/4-3-reconnection-session-restore.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-05-07: Implemented Story 4.3 reconnection/session restore and moved story to review.
