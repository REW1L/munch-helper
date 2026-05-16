# Story 4.6: Reduced Motion Support

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player with motion sensitivity,
I want the app to respect my device's reduced motion preference,
so that animations don't cause discomfort during play.

## Acceptance Criteria

1. **Given** I have reduced motion enabled on my device
   **When** a realtime character update signal should appear on a card
   **Then** the realtime flash applies the character border colour immediately and restores the room surface border colour (`surfaceWarm`) after 700ms with no interpolation

2. **Given** I have reduced motion enabled on my device
   **When** `QuickEditSheet` opens or closes
   **Then** the sheet snaps directly to its open/closed position with no slide/spring animation and no backdrop fade

3. **Given** I have reduced motion **disabled** (default) on my device
   **When** the realtime flash fires or `QuickEditSheet` opens/closes
   **Then** the existing animated behaviour is unchanged (700ms interpolated border flash; 180ms slide + 120ms backdrop fade)

4. **Given** the device reduced-motion preference changes while the app is running
   **When** the preference toggles
   **Then** subsequent flashes and sheet open/close transitions honour the new preference without requiring an app restart

> **Covers:** UX-DR16
> **Depends on:** Stories 3.7 (`QuickEditSheet`), 3.8 (realtime flash) — both `done`

## Tasks / Subtasks

- [ ] Task 1: Verify and lock the realtime-flash reduced-motion behaviour (AC: 1, 3, 4)
  - [ ] Confirm `RoomCharacterCard.tsx` already implements the reduced-motion path: immediate border colour, `surfaceWarm` restore after `REALTIME_FLASH_DURATION_MS` (700ms), no interpolation. **Do NOT rewrite this** — it shipped in Story 3.8.
  - [ ] Confirm existing regression coverage exists in `frontend/components/munchkin/RoomCharacterCard.test.tsx` ("shows reduced-motion realtime border signal when an external update arrives", line ~186; "waits for reduced-motion preference resolution before processing the first realtime signal", line ~212).
  - [ ] If (and only if) a gap exists, add coverage for the preference-change-at-runtime case (`reduceMotionChanged` listener flipping after mount). Do not duplicate already-passing assertions.

- [ ] Task 2: Add reduced-motion support to `QuickEditSheet` (AC: 2, 3, 4)
  - [ ] Resolve the reduced-motion preference using the **same pattern already used in `RoomCharacterCard.tsx`**: `AccessibilityInfo.isReduceMotionEnabled()` for the initial value plus an `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)` subscription, with the subscription removed on unmount. Track it in component state initialised to `null` (unknown) and treat unknown as "animate" (default behaviour) until resolved.
  - [ ] In `animateSheetTo`, when reduced motion is enabled, set the target values directly (`translateY.setValue(toValue)`, `backdropOpacity.setValue(toValue === 0 ? 1 : 0)`) and invoke the `onFinished` callback synchronously instead of running `Animated.parallel`/`Animated.timing`. The open/close state machine (`isRendered`, `isClosing`, `isSaving`, `onOpenFullEdit` sequencing) MUST behave identically — only the tween is skipped.
  - [ ] Ensure the `panResponder` release path still settles correctly under reduced motion (the snap-back / dismiss decision must remain; just skip the tween).
  - [ ] Keep the change localised to `QuickEditSheet.tsx`. Do not change the component's props, the parent route, or `RoomCharactersList`.

- [ ] Task 3: Tests for `QuickEditSheet` reduced motion (AC: 2, 3, 4)
  - [ ] In `frontend/components/munchkin/QuickEditSheet.test.tsx`, add an `AccessibilityInfo` mock following the `RoomCharacterCard.test.tsx` pattern (`isReduceMotionEnabled` default `false`; `addEventListener` returning a `{ remove }` subscription). The existing `react-native` mock spreads `actual`, so `AccessibilityInfo` is available — extend the mock object, do not replace `actual`.
  - [ ] Add a test: with reduced motion **enabled**, opening the sheet leaves `translateY` at `0` and backdrop opacity at `1` immediately (no pending animation), and closing leaves `translateY` at `dismissOffset` immediately, with `Animated.timing`/`Animated.parallel` NOT called for the transition.
  - [ ] Add a test: with reduced motion **disabled** (default), existing animated behaviour and all current assertions still hold (regression guard).
  - [ ] Add a test: `onClose` / `onOpenFullEdit` sequencing still fires correctly in reduced-motion mode (sheet "dismisses" before `onOpenFullEdit` is called).

- [ ] Task 4: Frontend validation (AC: 1, 2, 3, 4)
  - [ ] `cd frontend && npm run test:unit -- QuickEditSheet.test.tsx RoomCharacterCard.test.tsx`
  - [ ] `cd frontend && npm run lint`
  - [ ] `cd frontend && npm run tsc`
  - [ ] `cd frontend && npm test` (full suite: unit + room-route) to confirm no regressions

## Dev Notes

### Story Foundation

This story closes the UX-DR16 accessibility requirement. It has **two halves with very different amounts of work**:

- **Realtime flash half (AC 1) is ALREADY DONE.** Story 3.8 implemented it. There is **no `useRealtimeFlash` hook** despite what the UX spec (`11-component-strategy.md#11.5`) and epic text say — the flash logic lives inline in `frontend/components/munchkin/RoomCharacterCard.tsx`. It correctly: resolves reduced motion, sets `reducedMotionBorderColor` to `character.color` immediately, then restores `AppTheme.colors.surfaceWarm` after `REALTIME_FLASH_DURATION_MS` (700ms) via `setTimeout`, with no `Animated.interpolate`. Treat Task 1 as **verification + regression lock**, not implementation.
- **`QuickEditSheet` half (AC 2) is the actual work.** `QuickEditSheet.tsx` currently always runs `animateSheetTo` (`Animated.parallel` of a 180ms `translateY` timing + a 120ms backdrop-opacity timing) for every open, close, drag-release, and "Edit more…" transition. There is no reduced-motion branch. This is what you are adding.

### CRITICAL — Architecture / Consistency Guardrail (read before coding)

The UX spec (`13-responsive-design-accessibility.md#13.6` and requirements-inventory `UX-DR16`) says to use **`useReducedMotion()` from `react-native-reanimated`**. **Do NOT follow that literally.** `react-native-reanimated` is a dependency (`~4.2.1`), but the already-shipped, in-repo pattern for this exact feature — established by Story 3.8 in `RoomCharacterCard.tsx` — uses React Native's built-in `AccessibilityInfo.isReduceMotionEnabled()` + `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)`. 

For consistency, minimal change, and to avoid two divergent reduced-motion detection mechanisms in the same feature area, **`QuickEditSheet` must use the same `AccessibilityInfo` pattern as `RoomCharacterCard`.** This directly satisfies project-context rules: "follow existing patterns", "keep edits minimal and localized", and "avoid premature shared-core coupling". Introducing `useReducedMotion()` here would be the single most likely mistake — do not make it. (If a shared `useReducedMotion` hook is ever desired, that is a separate refactor story, not this one.)

### Architecture Guardrails

- Keep the change **localised to `QuickEditSheet.tsx`**. Do not touch the props interface (`QuickEditSheetProps`), the parent route `frontend/app/munchkin/[roomNumber]/index.tsx`, or `RoomCharactersList.tsx`. (project-context: "Preserve existing public API signatures"; "Keep edits minimal and localized".)
- `QuickEditSheet` is a presentational component; reduced-motion detection is a local concern of its animation behaviour, so resolving it inside the component (mirroring `RoomCharacterCard`) is correct and does NOT violate the layered-boundaries rule.
- Preserve React hook discipline: top-level hooks only, explicit effect dependency arrays, clean up the `reduceMotionChanged` subscription on unmount (mirror the `RoomCharacterCard` cleanup exactly).
- No new dependencies, no version bumps (project-context version-change guardrail).
- No backend changes. No new files (extend existing component + existing test file).

### Reading the file you are modifying — current state of `QuickEditSheet.tsx`

Current behaviour you must preserve (only the tween changes):

- `isRendered` gates the `Modal`'s `visible`; the sheet stays mounted through the close animation, then `setIsRendered(false)` on finish.
- `animateSheetTo(toValue, onFinished?)` runs `Animated.parallel([timing(translateY,…180ms), timing(backdropOpacity,…120ms)])` then calls `onFinished` when `finished`.
- Open effect: `setIsRendered(true)` → `translateY.setValue(dismissOffset)` → `backdropOpacity.setValue(0)` → `animateSheetTo(0)`.
- Close effect: `setIsClosing(true)` → `animateSheetTo(dismissOffset, () => { setIsClosing(false); setIsSaving(false); setIsRendered(false); })`.
- `handleOpenFullEdit`: `animateSheetTo(dismissOffset, …)` then `onOpenFullEdit()` — sheet must dismiss before the full modal opens (sequential, never simultaneous — see UX `11.4`).
- `panResponder.onPanResponderRelease`: dismiss if `dy > 120 || vy > 1`, else `animateSheetTo(0)` snap-back. `onPanResponderTerminate`: `animateSheetTo(0)`.

The cleanest implementation is to make `animateSheetTo` branch internally: if reduced motion is enabled, do `translateY.setValue(toValue); backdropOpacity.setValue(toValue === 0 ? 1 : 0); onFinished?.();` and return early. Every caller (open, close, full-edit, drag release/terminate) then transparently gets snap behaviour while all surrounding state transitions and callbacks fire unchanged. Add `isReducedMotionEnabled` to the `animateSheetTo` `useCallback` dependency array.

### Reduced-motion resolution pattern (copy from `RoomCharacterCard.tsx`)

Mirror this exact shape (state initialised to `null`, resolve async, subscribe to changes, clean up):

```typescript
const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState<boolean | null>(null);

useEffect(() => {
  let isMounted = true;
  void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
    if (isMounted) setIsReducedMotionEnabled(enabled);
  });
  const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    setIsReducedMotionEnabled(enabled);
  });
  return () => {
    isMounted = false;
    subscription.remove();
  };
}, []);
```

`AccessibilityInfo` must be added to the existing `react-native` import in `QuickEditSheet.tsx`. Until the preference resolves (`null`), treat as "not reduced" so first-open behaviour defaults to animated (matching the established convention; `RoomCharacterCard` similarly defers until resolution).

### Previous Story Intelligence (Story 3.8 — `done`)

- Story 3.8 deferred the first realtime flash until the reduced-motion preference resolved, to avoid a wrong-mode first signal. The analogous concern for `QuickEditSheet` is minor (first open while preference is still `null` simply animates), but be aware the established convention is "unknown ⇒ animate".
- 3.8's `RoomCharacterCard.test.tsx` mock pattern for `AccessibilityInfo` is the reference for Task 3: `isReduceMotionEnabled: vi.fn().mockResolvedValue(false)` reset per-test, `addEventListener` returning `{ remove: vi.fn() }`.
- 3.8 used `vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true)` per-test to exercise the reduced path, wrapped in `await act(async () => …)` so the async resolution flushes. Use the same approach.

### Testing Standards (project-context + existing suite)

- Test files: `*.test.tsx`, co-located with the component. Frontend tests run in jsdom under Vitest 4.x, v8 coverage. 70% line coverage floor; assert behaviour/contracts, not internals.
- The existing `QuickEditSheet.test.tsx` mocks `Animated.timing` and `Animated.parallel` (synchronous fake that calls `setValue` + `finished` callback). Your reduced-motion test should assert these mocks are **NOT called** for the transition when reduced motion is enabled, and that `translateY`/`backdrop` land on final values immediately (`__getValue()`), reusing the existing `findByProps({ testID: 'quick-edit-sheet' })` / `'quick-edit-overlay-backdrop'` access pattern.
- One success-path and one failure/alt-path minimum: cover both reduced-on and reduced-off (regression) paths, plus the runtime preference-change path (AC 4) if not already covered for the card.
- Deterministic only — control async resolution with `await act(async () => …)`; do not rely on real timers for the AccessibilityInfo promise.
- Validation command nuance (from 3.8 debug log): `npm run test -- <filter>` fails because the `test:room-route` sub-run receives the filter and matches no specs. Use `npm run test:unit -- QuickEditSheet.test.tsx RoomCharacterCard.test.tsx` for filtered runs, and bare `npm test` only for the full unfiltered suite.

### Project Structure Notes

**Modified files (no new files expected):**

```
frontend/components/munchkin/QuickEditSheet.tsx        ADD AccessibilityInfo import, reduced-motion state/effect, snap branch in animateSheetTo
frontend/components/munchkin/QuickEditSheet.test.tsx   ADD AccessibilityInfo mock + reduced-motion / regression / sequencing tests
_bmad-output/implementation-artifacts/4-6-reduced-motion-support.md   story status/record updates
_bmad-output/implementation-artifacts/sprint-status.yaml             status transition
```

`RoomCharacterCard.tsx` / `RoomCharacterCard.test.tsx` are expected to need **no code changes** (Story 3.8 already satisfied AC 1). Only modify them if Task 1 verification uncovers a genuine, demonstrable gap — and document why in the Completion Notes.

### References

- Epic 4 acceptance criteria: `_bmad-output/planning-artifacts/epics/epic-4-realtime-room-awareness-recovery.md` (Story 4.6 section, lines 88–103)
- UX-DR16 source: `_bmad-output/planning-artifacts/epics/requirements-inventory.md` (UX-DR16, line 111)
- UX reduced motion spec: `_bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.6 Reduced Motion`
- UX component spec (note: `useRealtimeFlash` hook described here was implemented inline, not as a hook): `_bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md#11.5 New Hook`, `#11.4` (QuickEditSheet anatomy/sequencing)
- Existing reduced-motion reference implementation: `frontend/components/munchkin/RoomCharacterCard.tsx` (lines 36–114)
- Existing reduced-motion test reference: `frontend/components/munchkin/RoomCharacterCard.test.tsx` (AccessibilityInfo mock ~line 23; reduced-motion tests ~lines 186, 212)
- Component to modify: `frontend/components/munchkin/QuickEditSheet.tsx` (animation: `animateSheetTo` lines 60–80; open/close effects lines 82–103; panResponder lines 142–167)
- Dependency story (flash): `_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md`
- Project context rules: `_bmad-output/project-context.md` (follow existing patterns; minimal/localized edits; no incidental dependency/version changes; React hook discipline; deterministic tests; 70% coverage floor)
- Architecture decision context (QuickEditSheet + flash are Room View enhancements): `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` (line 238)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
