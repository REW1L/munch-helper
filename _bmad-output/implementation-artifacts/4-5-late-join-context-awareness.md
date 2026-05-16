# Story 4.5: Late-Join Context Awareness

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player joining a room mid-session,
I want to immediately see the current room state including active characters,
so that I can understand what's happening and participate without confusion.

## Acceptance Criteria

1. **Given** a room already has active characters created by other players
   **When** I join the room (enter the room code / open `[roomNumber]/index.tsx`)
   **Then** I see the full current character list — every existing character, not an empty list
   **And** I do NOT see a stale empty state or a flash of "no characters" before the list appears

2. **Given** the current character list is rendered on join
   **When** I scan a character card
   **Then** every attribute of that character (all `race`, `gender`, and `class` values) is fully visible/reachable on the card — no attribute is silently clipped or hidden

3. **Given** I join a room mid-session
   **When** the initial state has loaded
   **Then** subsequent realtime changes by other players continue to update my view (the late-join initial load does not break the existing WebSocket subscription established in Story 4.1)

## Tasks / Subtasks

- [ ] Task 1: Verify and harden initial current-state load on late join (AC: 1, 3)
  - [ ] Confirm `useRoomCharacters` (`frontend/hooks/useCharacters.ts`) fetches the full character list HTTP-on-mount via `getCharactersByRoom(roomId)` independent of WebSocket connection state
  - [ ] Confirm `RoomCharactersList` does NOT render the empty-list footer/empty state while the initial fetch is still in flight — the loading indicator (`isLoading`) must take precedence over an empty `characters` array on first load
  - [ ] Confirm the auto-create-current-character effect (`useCharacters.ts` ~L387-431) only fires AFTER `hasCompletedInitialFetch` so a late joiner first sees existing characters, then gets their own auto-created character (Story 3.3 behavior) — do NOT regress this ordering
  - [ ] Do NOT add a second/duplicate fetch path; the existing TanStack Query on-mount fetch is the single source of truth for initial state

- [ ] Task 2: Ensure all character attributes are fully visible on the card for the late-join scan (AC: 2)
  - [ ] Inspect `RoomCharacterCard` (`frontend/components/munchkin/RoomCharacterCard.tsx`) `attributesBox` (fixed `height: 64`, wrapped in a `ScrollView`) and `AttributeList` (`frontend/components/munchkin/AttributeList.tsx`)
  - [ ] Confirm that a character with the maximum realistic number of attributes (multiple `race` + `gender` + `class` values) has every value reachable — the `ScrollView` must remain scrollable and not clip content unreachably, OR the box must size to show all values
  - [ ] If attributes are unreachable/clipped, fix so all values are visible/reachable WITHOUT changing the established card visual design from Story 3.6 (do not alter card height, colors, or layout beyond what is required to make attributes reachable)
  - [ ] Keep the change minimal and localized — this is a visibility correctness fix, not a card restyle

- [ ] Task 3: Tests (AC: 1, 2, 3)
  - [ ] Add a room-route test (`frontend/__tests__/app/munchkin/[roomNumber].test.tsx`) simulating a late joiner: `useRoomCharacters` returns a populated `characters` array from the start (other players' characters) → assert all of those character cards render with their nicknames and stats on first render
  - [ ] Add/extend a `useCharacters` hook test asserting the initial `getCharactersByRoom` fetch resolves the full list and `isLoading` is true before resolution (no empty-state exposure during initial fetch)
  - [ ] Add a `RoomCharacterCard` or `AttributeList` test asserting all `race`/`gender`/`class` values for a multi-attribute character are present in the rendered output
  - [ ] Cover one success path and (where applicable) one failure path per project testing rules

- [ ] Task 4: Frontend validation after implementation
  - [ ] `cd frontend && npm run test:unit`
  - [ ] `cd frontend && npm run test:room-route` (or the equivalent script that runs `[roomNumber].test.tsx`)
  - [ ] `cd frontend && npm run lint`
  - [ ] `cd frontend && npm run tsc`
  - [ ] Confirm 70% line coverage floor is maintained (do not lower thresholds)

## Dev Notes

### Story Foundation

- Epic 4 makes players stay in sync with live room state. Story 4.1 established live synchronisation; 4.3 added reconnection/session restore. Story 4.5 is the **late-join** slice: a player who was NOT in the room when characters were created must, on entering, immediately see the complete current state.
- **Critical framing:** The data plumbing for this AC already exists. `useRoomCharacters` performs an HTTP-on-mount fetch (`getCharactersByRoom(roomId)` via TanStack Query, `enabled: Boolean(roomId)`) plus a WebSocket subscription for ongoing updates. This is the same HTTP-on-mount + WS pattern documented in architecture ADR-15. **Do NOT reinvent a new fetch mechanism, new hook, or new endpoint.** This story is primarily verification + hardening + the attribute-visibility correctness check + regression tests.
- This maps to PRD **FR38** ("A player joining late can understand the current room and gameplay context well enough to participate") and the UX **"2-second orientation"** success metric (`ux-design-specification/core-user-experience.md`): a player picking up the session mid-flight must understand full room state at a glance.

### Architecture Guardrails

- **Single fetch source of truth:** Initial current state comes ONLY from the existing `useRoomCharacters` TanStack Query on-mount fetch. Realtime deltas come ONLY from the existing WebSocket subscription (Story 4.1). Do not add a parallel fetch, polling loop, or duplicate query key.
- **Hook return shape is stable:** `useRoomCharacters` returns a plain typed object. Do not change existing return fields or their semantics. Any new internal logic must not alter the public shape consumed by `frontend/app/munchkin/[roomNumber]/index.tsx`.
- **Layered boundaries (project-context):** Route file composes screens; hooks orchestrate; `api/` owns transport; components stay presentational. Keep late-join logic where it already lives (the hook + list/card components) — do not push fetch logic into the route or into card components.
- **No persistent storage / no new backend:** Late-join is a normal room entry. No `AsyncStorage`, no new endpoint, no backend changes. `getCharactersByRoom` already returns the full room character list with `race`/`gender`/`class` parsed into arrays (see `toFrontendCharacter` / `parseArrayField` in `frontend/api/characters.ts`).
- **Do not regress Story 3.6 card styling:** `RoomCharacterCard` visual design (fixed `height: 85`, `attributesBox` `height: 64`, AppTheme tokens) was set by Story 3.6. The attribute-visibility fix (Task 2) must be the minimal change needed for all attributes to be reachable — do not restyle the card.
- **Do not regress Story 3.3 auto-create:** The current-user auto-create effect in `useCharacters.ts` is gated on `hasCompletedInitialFetch`. A late joiner must see existing characters from the initial fetch first; their own character is auto-created afterward. Preserve this ordering and the existing cooldown/suppression refs.

### Current State of Files Being Touched

**`frontend/hooks/useCharacters.ts` (UPDATE — likely verify-only or minor)**
- `useRoomCharacters(roomId, userProfile)` runs `useQuery({ queryKey: ['characters', roomId], queryFn: () => getCharactersByRoom(roomId, signal), enabled: Boolean(roomId) })` — this IS the late-join initial load.
- `isLoading = charactersQuery.isLoading || (charactersQuery.isFetching && characters.length === 0)` — drives the loading state that must mask the empty state on first load.
- `hasCompletedInitialFetch = charactersQuery.isFetchedAfterMount && !charactersQuery.isFetching` gates auto-create. Preserve.
- WebSocket `onOpen` invalidates the characters query; subscription handles `character_created/updated/deleted`. This is the Story 4.1 realtime path — must remain intact for AC 3.
- Most likely outcome: this file needs **no functional change**, only verification + the tests proving late-join behavior. Only modify if a real defect (empty-state flash, broken ordering) is found.

**`frontend/components/munchkin/RoomCharactersList.tsx` (UPDATE — verify, possibly minor)**
- `FlatList` over `characters`. `ListEmptyComponent` returns the loading indicator when `isLoading`, error text when `errorMessage`, else `null`. Confirm a late joiner with a populated list never sees the empty branch, and that an in-flight initial fetch shows loading (not an empty list).

**`frontend/components/munchkin/RoomCharacterCard.tsx` + `AttributeList.tsx` (UPDATE — Task 2 focus)**
- Card renders `AttributeList` inside `attributesBox` (`height: 64`, `justifyContent: 'center'`) wrapped in a vertical `ScrollView` (`nestedScrollEnabled`, hidden scroll indicator).
- `AttributeList` flattens `['race','gender','class']` → one `<Text>` per value, `lineHeight: 16`. ~4 lines fit in 64px; characters with more total attribute values will overflow the box and rely on scroll. The hidden scroll indicator means overflow is not visually discoverable — assess whether this violates AC 2 ("fully visible") for the late-join scan and fix minimally if so.

### Previous Story Intelligence (Story 4.3)

From Story 4.3 (`4-3-reconnection-session-restore.md`) and its review findings:
- `useRoomCharacters` exposes `refresh()`; reconnect refreshes characters. Do not interfere with this path — late-join uses the on-mount fetch, not `refresh()`.
- WebSocket echo suppression in `useRoomCharacters` uses in-flight markers (`recentLocalUpdateByCharacterRef`); a refresh/initial load must not suppress legitimate realtime signals. Do not touch this logic for this story.
- Tests for hook/timer behavior use `vi.useFakeTimers()` for determinism. Follow the same pattern; keep tests deterministic (no real network/timers) per project-context testing rules.
- Story 4.3 review caught a "missed room state on reconnect" class of bug — apply the same rigor here: explicitly assert the late joiner sees the full pre-existing list, not just that a fetch was called.

### Git Intelligence

- Most recent commit `48a8476` "Story 4.3: Reconnection & Session Restore" touched `frontend/hooks/useCharacters.ts`, `frontend/hooks/useRoomWebSocket.ts`, `frontend/app/munchkin/[roomNumber]/index.tsx`, and `frontend/__tests__/app/munchkin/[roomNumber].test.tsx` — the same files in scope here. Read the current state of these files (already current on this branch) before editing; do not assume pre-4.3 behavior.
- Test harness pattern in `[roomNumber].test.tsx` uses `vi.hoisted` mocks including `mockCharactersState` — extend that existing pattern for the late-joiner test rather than introducing a new mocking style.

### Testing Standards Summary

- Frontend tests: Vitest + jsdom, `*.test.ts(x)` naming. Tests for files under `frontend/app` go in `frontend/__tests__`, never inside `frontend/app` (Expo Router constraint).
- Mock external boundaries (network via `getCharactersByRoom`, WebSocket) but never mock the unit under test.
- Behavior-contract assertions, not implementation internals: assert rendered character cards/attributes for a late joiner, not internal query mechanics.
- Maintain the 70% line coverage floor; coverage is a floor, not the goal — prioritize the late-join behavior assertions.

### Project Structure Notes

**Modified / verified files (no new files expected):**
```
frontend/hooks/useCharacters.ts                       VERIFY (modify only if defect found)
frontend/components/munchkin/RoomCharactersList.tsx   VERIFY (loading masks empty on first load)
frontend/components/munchkin/RoomCharacterCard.tsx    UPDATE only if attributes unreachable (Task 2)
frontend/components/munchkin/AttributeList.tsx        UPDATE only if attributes unreachable (Task 2)
frontend/hooks/useCharacters.test.ts                  EXTEND late-join initial-load assertions
frontend/__tests__/app/munchkin/[roomNumber].test.tsx EXTEND late-joiner sees populated list
frontend/components/munchkin/RoomCharacterCard.test.tsx (or AttributeList test) EXTEND all-attributes-visible
```
No backend, infrastructure, or new dependency changes. If implementation confirms zero functional defects, the deliverable is the regression test suite proving AC 1–3 hold.

### References

- Epic 4 / Story 4.5 acceptance: `_bmad-output/planning-artifacts/epics/epic-4-realtime-room-awareness-recovery.md#story-45-late-join-context-awareness`
- PRD FR38: `_bmad-output/planning-artifacts/prd/functional-requirements.md` (FR38)
- UX 2-second orientation: `_bmad-output/planning-artifacts/ux-design-specification/core-user-experience.md`
- UX Journey 2 (Mid-Session Join / Resume): `_bmad-output/planning-artifacts/ux-design-specification/10-user-journey-flows.md#102-journey-2-mid-session-join-resume`
- HTTP-on-mount + WS pattern (ADR-15): `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- Frontend HTTP client + hook return shape rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`
- Existing hook: `frontend/hooks/useCharacters.ts` (`useRoomCharacters`)
- List/card/attributes: `frontend/components/munchkin/RoomCharactersList.tsx`, `RoomCharacterCard.tsx`, `AttributeList.tsx`
- Characters transport: `frontend/api/characters.ts` (`getCharactersByRoom`, `toFrontendCharacter`, `parseArrayField`)
- Previous story: `_bmad-output/implementation-artifacts/4-3-reconnection-session-restore.md`
- Project context rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
