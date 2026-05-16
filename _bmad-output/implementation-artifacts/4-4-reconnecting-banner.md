# Story 4.4: Reconnecting Banner

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player experiencing a temporary connection issue,
I want a low-prominence banner to appear at the top of the screen,
so that I'm aware of the connection state without being blocked from viewing the room.

## Acceptance Criteria

1. **Given** the app has previously connected the WebSocket for a room
   **And** the connection drops (`onclose` fires) while the user is still in Room View
   **When** the reconnect attempts are in flight and the 8-second timeout has not yet fired
   **Then** a `ReconnectingBanner` is rendered at the top of Room View with `AppTheme.colors.surfaceSubtle` background and `AppTheme.colors.textMuted` text
   **And** the banner displays the message "Reconnecting…"

2. **Given** the banner is visible while reconnect is in progress
   **When** the WebSocket reconnects successfully (`isConnected` becomes `true`)
   **Then** the banner is removed from the screen automatically without user action

3. **Given** the banner is visible while reconnect is in progress
   **When** the 8-second reconnect timeout fires (`isTimedOut` becomes `true`) without a successful reconnect
   **Then** the banner is removed
   **And** the existing "Connection lost · Retry" `Pressable` (delivered in Story 4.3) is the only connection indicator visible

4. **Given** assistive technologies are active (VoiceOver/TalkBack)
   **When** the banner mounts
   **Then** `AccessibilityInfo.announceForAccessibility("Reconnecting…")` is called exactly once per mount
   **And** the banner does not rely on `accessibilityLiveRegion` for the announcement

5. **Given** the user is on Room View on first arrival and the WebSocket has not yet completed its initial connect
   **When** `isConnected` is `false` because the socket has never opened
   **Then** the banner is **not** shown (banner only appears after at least one successful connect followed by a drop)

## Tasks / Subtasks

- [ ] Task 1: Add `isReconnecting` to `useRoomWebSocket` so consumers can distinguish "initial connect in flight" from "previously connected, now reconnecting" (AC: 1, 5)
  - [ ] In `frontend/hooks/useRoomWebSocket.ts`, add a `hasEverConnectedRef = useRef(false)` and set `hasEverConnectedRef.current = true` inside the `onOpen` handler (both the `client` `onOpen` callback wrapper and the `connectAsync` success branch — both paths flip `isConnected` to `true`).
  - [ ] Reset `hasEverConnectedRef.current = false` in the cleanup branch where `enabled || !roomId || !userId` is false, and when the connection key changes (both points already disconnect the previous client). This prevents stale "reconnecting" state when switching rooms.
  - [ ] Derive `isReconnecting` returned from the hook as `hasEverConnectedRef.current && !isConnected && !isTimedOut`. Do **not** introduce a new `useState` for this — derive on each render to stay in sync with the existing `isConnected`/`isTimedOut` state transitions.
  - [ ] Extend the `UseRoomWebSocketResult` interface with `isReconnecting: boolean`. Do not remove or rename existing fields (`isConnected`, `isConnecting`, `isTimedOut`, `error`, `reconnect`, `subscribe`).

- [ ] Task 2: Propagate `isReconnecting` through `useRoomCharacters` (AC: 1, 5)
  - [ ] In `frontend/hooks/useCharacters.ts`, destructure `isReconnecting` from the `useRoomWebSocket` return value alongside the existing `isConnected`, `isTimedOut`, `reconnect`, `subscribe`.
  - [ ] Add `isReconnecting: boolean` to the `UseRoomCharactersResult` interface and the final returned object.
  - [ ] Update the dependency array of the trailing `useMemo` to include `isReconnecting`.

- [ ] Task 3: Implement `ReconnectingBanner` presentational component (AC: 1, 2, 4)
  - [ ] Create `frontend/components/munchkin/ReconnectingBanner.tsx` exporting `ReconnectingBanner` as default.
  - [ ] Props: `{ visible: boolean }`. Component renders `null` when `visible === false` and returns the banner JSX otherwise so that mount/unmount drives the accessibility announce side effect.
  - [ ] On mount (`useEffect` with empty dep array), call `AccessibilityInfo.announceForAccessibility('Reconnecting…')`. Do not also set `accessibilityLiveRegion` — per `13.5` of UX, that prop is unreliable across platforms in React Native.
  - [ ] Banner UI: a `View` with `backgroundColor: AppTheme.colors.surfaceSubtle`, full-width, sitting at the top of the Room View screen area (inside `SafeAreaView`, above `RoomCharactersList`). Padding `paddingVertical: AppTheme.spacing.sm`, `paddingHorizontal: AppTheme.spacing.md`. Text uses `color: AppTheme.colors.textMuted` and `AppTheme.typography.labelMd`. Center the text horizontally (`textAlign: 'center'`).
  - [ ] Accessibility props on the View: `accessible={true}`, `accessibilityRole="alert"`, `accessibilityLabel="Reconnecting…"`. The imperative `announceForAccessibility` is the authoritative announcement; the `accessibilityRole="alert"` is supplementary semantic hinting.
  - [ ] Co-locate the component test as `frontend/components/munchkin/ReconnectingBanner.test.tsx` (matching the casing convention `ComponentName.test.tsx` from `RoomCharacterCard.test.tsx`).

- [ ] Task 4: Render `ReconnectingBanner` in Room View (AC: 1, 2, 3, 5)
  - [ ] In `frontend/app/munchkin/[roomNumber]/index.tsx`, destructure `isReconnecting` from `useRoomCharacters` alongside the existing fields.
  - [ ] Import and render `<ReconnectingBanner visible={isReconnecting} />` **above** the existing `{isTimedOut && !isConnected && (...) }` Retry block — banner sits at the very top of the screen content, below the `Stack.Screen` header but above the characters list and Retry button.
  - [ ] Do not change the existing Retry button logic. The two indicators are mutually exclusive by construction (`isReconnecting` requires `!isTimedOut`, so they cannot both be true).

- [ ] Task 5: Tests (AC: 1, 2, 3, 4, 5)
  - [ ] `frontend/components/munchkin/ReconnectingBanner.test.tsx` — unit test the banner:
    - renders nothing when `visible={false}` (assert no text present)
    - renders the "Reconnecting…" text when `visible={true}` and applies `surfaceSubtle` background and `textMuted` text color (snapshot or style assertions)
    - calls `AccessibilityInfo.announceForAccessibility` exactly once with the reconnecting message on mount and does **not** call it again when the parent re-renders with the same visible state. Mock `AccessibilityInfo` via `vi.mock('react-native', ...)` mirroring `RoomCharacterCard.test.tsx` line 4 / 21.
    - does not call `announceForAccessibility` when initially mounted with `visible={false}`
  - [ ] `frontend/hooks/useRoomWebSocket.test.ts` — extend existing suite:
    - new test: `isReconnecting` is `false` before any connect completes (initial mount, no `onOpen` yet) even if `isConnected === false`
    - new test: after a successful `onOpen` and a subsequent disconnect (`onClose`), `isReconnecting` becomes `true` until either the mocked `isConnected` flips back to `true` (auto-reconnect) or `vi.advanceTimersByTime(8000)` triggers `isTimedOut`
    - new test: `isReconnecting` flips back to `false` when `isTimedOut` becomes `true`
    - reuse the existing `mockClientInstances` fake-timer pattern; do not introduce real timers
  - [ ] `frontend/__tests__/app/munchkin/[roomNumber].test.tsx` — extend the existing route-level mocks:
    - add `isReconnecting` to the `mockConnectionState` hoisted ref and to the `useRoomCharacters` mock return value
    - new test: when `mockConnectionState.current = { isConnected: false, isReconnecting: true, isTimedOut: false }`, the banner text "Reconnecting…" is rendered and the "Connection lost · Retry" button is NOT rendered
    - new test: when `mockConnectionState.current = { isConnected: false, isReconnecting: false, isTimedOut: true }`, the banner text "Reconnecting…" is NOT rendered and the Retry button IS rendered (this preserves the assertion already in the existing test at line 714)
    - new test: when `isConnected: true`, neither the banner nor the Retry button is rendered

- [ ] Task 6: Run frontend validation
  - [ ] `cd frontend && npm run test:unit`
  - [ ] `cd frontend && npm run test:room-route`
  - [ ] `cd frontend && npm run lint`
  - [ ] `cd frontend && npm run tsc`
  - [ ] Manually verify on iOS Simulator (or web preview) that the banner appears briefly when toggling airplane mode mid-session and disappears on reconnect — the 8-second timeout should hand off to the existing Retry button.

## Dev Notes

### Story Foundation

- This story sits **on top of** the connection state already exposed by Story 4.3. `useRoomWebSocket` already tracks `isConnected`, `isTimedOut`, `reconnect()`, and an 8-second `RECONNECT_TIMEOUT_MS`. Story 4.3 also propagates these through `useRoomCharacters` and consumes them in Room View. **Do not re-implement** any of that wiring — only **extend** it with `isReconnecting`.
- The Retry button in `frontend/app/munchkin/[roomNumber]/index.tsx` (`styles.connectionRetryButton`, lines 254–265) is the **escalation state** that takes over after 8 seconds. This story does not modify the button — it adds a complementary banner that is visible **only** during the in-flight reconnect window (0–8s).
- The banner is "low-prominence" by UX requirement (UX §12.2). Background `surfaceSubtle` (`#353535`) sits darker than the surrounding `elevated` (`#4C4545`) backdrop, giving a subtle inset look. Text uses `textMuted` (`#D9D9D9`) per `13.4` contrast table (5.2:1 on `surface`, 4.8:1 on `elevated`).

### Architecture Guardrails

- **No persistent state and no new top-level providers.** Banner visibility is derived purely from the connection state already managed by `useRoomWebSocket`. Do not introduce a `ReconnectionContext`, `AsyncStorage`, or any global store for this.
- **Keep layered boundaries (project-context §Framework-Specific Rules).** `frontend/app` stays route composition only — banner JSX is rendered from `[roomNumber]/index.tsx`, but the banner itself lives under `frontend/components/munchkin/`. Test file is co-located, not under `frontend/app`.
- **Component naming.** Use `PascalCase` filename `ReconnectingBanner.tsx`; co-located test mirrors casing: `ReconnectingBanner.test.tsx` (per `implementation-patterns-consistency-rules.md` §Test co-location rule).
- **No raw color hex in component code.** All colors must come from `AppTheme.colors.*` tokens (Story 3.1 token migration is `done`; revert is not acceptable).
- **No animation library work.** Banner mount/unmount uses default React rendering. Story 4.6 will handle reduced-motion concerns elsewhere — this banner does not animate.

### Technical Implementation Details

**`useRoomWebSocket` — derived `isReconnecting` (do not store as state):**

The existing hook flips `isConnected` and `isTimedOut` from `setState` calls inside `onOpen`, `onClose`, and the 8-second timer callback. Storing `isReconnecting` in `useState` would create a third source of truth and risk drift. Use a ref + derived boolean:

```ts
// inside useRoomWebSocket
const hasEverConnectedRef = useRef(false);

// in the client wrapper:
onOpen: () => {
  if (!isMounted) return;
  hasEverConnectedRef.current = true;
  clearReconnectTimeout();
  setIsConnected(true);
  // ...existing body...
},

// in the connectAsync success branch:
if (isMounted) {
  hasEverConnectedRef.current = true;
  setIsConnected(true);
  setIsConnecting(false);
  setIsTimedOut(false);
}

// in the disable/cleanup branch (enabled is false OR roomId/userId missing):
hasEverConnectedRef.current = false;

// in the connection-key-changed disconnect branch:
hasEverConnectedRef.current = false;

// at return time:
const isReconnecting = hasEverConnectedRef.current && !isConnected && !isTimedOut;
return { isConnected, isConnecting, isReconnecting, isTimedOut, error, reconnect, subscribe };
```

> Refs do not trigger re-renders, but `isConnected`/`isTimedOut` state changes (which gate the derivation) already do. The derived boolean recomputes on every render, which is exactly the cadence consumers need.

**`ReconnectingBanner` skeleton:**

```tsx
import { AppTheme } from '@/constants/theme';
import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

interface ReconnectingBannerProps {
  visible: boolean;
}

export default function ReconnectingBanner({ visible }: ReconnectingBannerProps) {
  useEffect(() => {
    if (!visible) return;
    AccessibilityInfo.announceForAccessibility('Reconnecting…');
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel="Reconnecting…"
      style={styles.banner}
    >
      <Text style={styles.label}>Reconnecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
    paddingVertical: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.md,
  },
  label: {
    color: AppTheme.colors.textMuted,
    textAlign: 'center',
    ...AppTheme.typography.labelMd,
  },
});
```

> The `useEffect` dep is `[visible]` so the announce fires when the banner transitions from hidden → visible. Mount with `visible={false}` does **not** announce because of the early `if (!visible) return;` in the effect.

**Room View integration:**

In `frontend/app/munchkin/[roomNumber]/index.tsx`, after the destructure of `useRoomCharacters` returns (around line 29), add `isReconnecting` to the destructure list. Then within the `<View style={styles.container}>` block, place the banner directly after the `<Stack.Screen .../>` and before the existing `{isTimedOut && !isConnected && (...)}` block:

```tsx
<ReconnectingBanner visible={isReconnecting} />

{isTimedOut && !isConnected && (
  <Pressable /* existing Retry button */ />
)}
```

### Previous Story Intelligence (Story 4.3)

- `useRoomWebSocket` was extended with `isTimedOut` and `reconnect()` and these flow through `useRoomCharacters`. The Room View already consumes them (`isConnected`, `isTimedOut`, `reconnect` destructured at `[roomNumber]/index.tsx` line 39–42). Mirror the same propagation for `isReconnecting`.
- Story 4.3 review enforced: **do not call `client.disconnect()` before reconnecting** — it sets the "intentionally closed" flag and suppresses auto-backoff. This story does not call into the client at all; it only reads the derived state. Do not refactor `useRoomWebSocket`'s connect/disconnect logic.
- Story 4.3 review also flagged: **foreground reconnect must be enabled even while `isConnected` flips on/off.** Do not gate the `ReconnectingBanner` on the `useReconnectOnForeground` hook's `enabled` flag — they are independent concerns.
- Existing tests in `frontend/__tests__/app/munchkin/[roomNumber].test.tsx` already mock `useRoomCharacters` with `isConnected` and `isTimedOut`. Extend the mock; do not rewrite it.
- `useRoomWebSocket.test.ts` uses a `MockRoomWebSocketClient` with `vi.useFakeTimers()`. Reuse the same fixture and `vi.advanceTimersByTime(8000)` pattern for new tests.

### Git Intelligence

- Most recent commit (`48a8476`) is Story 4.3 itself. Read the file list from the prior story before editing — the files this story touches (`useRoomWebSocket.ts`, `useCharacters.ts`, `[roomNumber]/index.tsx`, and their tests) are the **same files** the prior story modified. Read each fully before changing to avoid stomping the 4.3 dev notes' invariants (timeout reset semantics, `isConnected` flow through `onOpen`).
- `package.json` last updated on the 4.3 cycle confirms the relevant test runner is `vitest` 4.0.18 and that the route-level harness uses `react-native-web` aliasing (`vitest.room-route.config.ts`). No new dependencies should be introduced.

### Project Structure Notes

**New files:**

```
frontend/components/munchkin/ReconnectingBanner.tsx       NEW — presentational banner
frontend/components/munchkin/ReconnectingBanner.test.tsx  NEW — co-located test
```

**Modified files:**

```
frontend/hooks/useRoomWebSocket.ts              ADD hasEverConnectedRef, derive isReconnecting, return in result type
frontend/hooks/useRoomWebSocket.test.ts         EXTEND with isReconnecting cases (initial, post-disconnect, post-timeout)
frontend/hooks/useCharacters.ts                 ADD isReconnecting to UseRoomCharactersResult, destructure + return
frontend/app/munchkin/[roomNumber]/index.tsx    ADD ReconnectingBanner above existing Retry block
frontend/__tests__/app/munchkin/[roomNumber].test.tsx  ADD isReconnecting to hoisted mockConnectionState and useRoomCharacters mock, add banner visibility tests
```

**No backend changes.** No `package.json` edits, no new dependencies. No infrastructure, IaC, or environment config touched. No changes to `AppTheme` tokens.

### Library / Framework Requirements

- `AccessibilityInfo` is imported from `react-native` (already used in `frontend/components/munchkin/RoomCharacterCard.tsx` line 7) — reuse the same import path.
- React 19.2 — `useEffect` cleanup behavior unchanged, no `useEffectEvent` needed here.
- React Native 0.83.2 — `AccessibilityInfo.announceForAccessibility` signature is `(message: string) => void`; available on iOS, Android, and react-native-web no-ops gracefully (web returns `undefined`). Do not gate by platform.
- Vitest 4.0.18 with `react-native-web` alias — the banner test runs in jsdom; mock `AccessibilityInfo` exactly like `RoomCharacterCard.test.tsx` (full `react-native` module mock with `AccessibilityInfo: { isReduceMotionEnabled, addEventListener, announceForAccessibility: vi.fn() }`).

### Testing Requirements

- 70% line coverage floor on `frontend/hooks/*` — adding `isReconnecting` plus its three test cases keeps the hook well above the floor; do not remove existing tests.
- Co-locate banner tests with the component (`ReconnectingBanner.test.tsx` next to source).
- Use fake timers (`vi.useFakeTimers()`) for any test that exercises the 8-second `RECONNECT_TIMEOUT_MS` boundary. Do not rely on real `setTimeout`.
- Frontend tests run in `jsdom`; do not import anything that requires native module bridging at module top level beyond what `react-native-web` already shims.
- Route-level test (`__tests__/app/munchkin/[roomNumber].test.tsx`) runs in the separate `vitest.room-route.config.ts` harness — assertions for the banner go in this file because it dynamic-imports the route component.
- Each new test should cover one behavior (success/failure or boundary). The existing test "renders connection retry action after reconnect timeout and refreshes after retry" (line 714) is the regression anchor for the Retry button — do not break it; add the new banner test alongside.

### Anti-Patterns to Avoid

- **Do not** add a new `useState` for `isReconnecting` inside `useRoomWebSocket`. Derive it from existing state + a ref. Two sources of truth for the same boolean is the failure mode.
- **Do not** show the banner during the initial connect-on-mount phase (AC 5). Use `hasEverConnectedRef`, not just `!isConnected`.
- **Do not** combine the banner and the Retry button in a single conditional or wrapper. Render them as two siblings; the boolean conditions are mutually exclusive by construction.
- **Do not** use `accessibilityLiveRegion` — UX §13.5 explicitly forbids it for this component due to React Native cross-platform unreliability. The imperative `announceForAccessibility` call is the only required announcement.
- **Do not** introduce a global "connection" context provider. Keep state local to `useRoomWebSocket`.
- **Do not** add a route to `frontend/app/` for the banner. It is a presentational component, not a route.
- **Do not** import `axios` or raw `fetch` — there are no network calls in this story at all.
- **Do not** rename existing fields (`isConnected`, `isTimedOut`, `reconnect`) on the hook return shape — that would silently break the Retry button and the foreground-reconnect wiring.
- **Do not** make the banner dismissible by user action. UX §12.3 explicitly labels reconnect-style banners as "Not dismissible — reflects live server state".
- **Do not** animate the banner. Story 4.6 covers reduced motion; this story renders synchronously on mount/unmount.

### References

- Epic 4 acceptance criteria: `_bmad-output/planning-artifacts/epics/epic-4-realtime-room-awareness-recovery.md` (Story 4.4 section, lines 58–74)
- Previous story (foundation): `_bmad-output/implementation-artifacts/4-3-reconnection-session-restore.md`
- WebSocket hook (extend): `frontend/hooks/useRoomWebSocket.ts` (lines 1–209) — `RECONNECT_TIMEOUT_MS=8000`, `startReconnectTimeout`, `onOpen`/`onClose` callbacks
- Characters hook (propagate): `frontend/hooks/useCharacters.ts` (lines 15–28 `UseRoomCharactersResult`; lines 122–128 `useRoomWebSocket` destructure; line 447 return memo)
- Room View (mount banner): `frontend/app/munchkin/[roomNumber]/index.tsx` (lines 29–42 destructure; lines 254–265 existing Retry button)
- Theme tokens: `frontend/constants/theme.ts` — `AppTheme.colors.surfaceSubtle = #353535`, `AppTheme.colors.textMuted = #D9D9D9`, `AppTheme.typography.labelMd`
- UX banner pattern: `_bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md#12.2 Feedback Patterns` ("Reconnecting state" row)
- UX modal/banner non-dismissible rule: `_bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md#12.3 Modal & Overlay Patterns`
- Accessibility props mapping: `_bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.5 React Native Accessibility Props` (ReconnectingBanner row — imperative announce, not `accessibilityLiveRegion`)
- Accessibility precedent in codebase: `frontend/components/munchkin/RoomCharacterCard.tsx` (lines 1–58) — `AccessibilityInfo` import and mock pattern
- Project context rules: `_bmad-output/project-context.md` (AppTheme tokens, frontend layering, co-located tests, React hook discipline)
- Architecture consistency: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` (Frontend Code naming, Test co-location rule)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created

### File List
