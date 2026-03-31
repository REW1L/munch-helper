# Story 3.8: Realtime Update Signal on Character Cards

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to see a brief visual flash on a character card when another player updates their stats,
so that I know the change was made by someone else and not a display glitch.

## Acceptance Criteria

1. **Given** another player updates their character stats
   **When** the update is received via WebSocket
   **Then** a border flash animates on that character's card using the character's own colour — transparent → colour → transparent over 300ms

2. **Given** two or more players update different characters close together
   **When** those updates are received
   **Then** multiple cards can flash concurrently without visual conflict

3. **Given** reduced motion is enabled on the device
   **When** a realtime update signal should appear
   **Then** the border colour is applied immediately and removed after 300ms with no interpolation

## Tasks / Subtasks

- [x] Task 1: Add realtime update signal plumbing from WebSocket updates into Room View card props (AC: 1, 2)
  - [x] Extend `useRoomCharacters` to expose per-character realtime signal counters
  - [x] Increment signal counters only when `character_updated` events target a character not owned by the current user
  - [x] Pass signal data through `frontend/app/munchkin/[roomNumber]/index.tsx` and `RoomCharactersList`

- [x] Task 2: Implement per-card visual border signal animation behavior (AC: 1, 2, 3)
  - [x] Add a `realtimeFlashSignal` prop to `RoomCharacterCard`
  - [x] For standard motion mode, animate border color transparent → character color → transparent over 300ms
  - [x] For reduced-motion mode, toggle border color immediately and clear after 300ms with no interpolation

- [x] Task 3: Add regression tests for realtime signal behavior and signal gating (AC: 1, 2, 3)
  - [x] Add hook tests covering websocket update signal increment for non-self character updates
  - [x] Ensure self-character websocket updates do not raise realtime card flash signals
  - [x] Add component-level reduced-motion signal coverage for `RoomCharacterCard`

- [x] Task 4: Run frontend validation after implementation
  - [x] `cd frontend && npm run test:unit -- RoomCharacterCard.test.tsx useCharacters.test.ts`
  - [x] `cd frontend && npm run lint`

## Dev Notes

### Story Foundation

- Epic 3 Story 3.8 requires card-level update cues tied to existing room WebSocket character update events.
- Story should only add update signal affordance and must not alter character edit ownership flow.

### Architecture Guardrails

- Keep room composition at the route level in `frontend/app/munchkin/[roomNumber]/index.tsx`.
- Keep list and card components presentational and driven by props.
- Reuse existing `useRoomCharacters` websocket integration path; do not add duplicate websocket clients at component level.

## Dev Agent Record

### Agent Model Used

gpt-5 (Codex)

### Debug Log References

- `cd frontend && npm run test -- RoomCharacterCard.test.tsx useCharacters.test.ts` (fails because `test:room-route` receives filters that match no room-route specs)
- `cd frontend && npm run test:unit -- RoomCharacterCard.test.tsx useCharacters.test.ts`
- `cd frontend && npm run test:unit -- RoomCharacterCard.test.tsx`
- `cd frontend && npm run tsc`
- `cd frontend && npm run lint`
- `cd frontend && npm run test:unit -- RoomCharacterCard.test.tsx`
- Repository diff review on 2026-03-31 to capture follow-up implementation changes in Story 3.8 notes

### Completion Notes List

- Added per-character realtime update signal counters in `useRoomCharacters` and emitted signals only for websocket updates targeting non-self characters.
- Added short-window suppression for locally initiated character updates so websocket echo events from the same client do not trigger false remote-update flashes.
- Wired realtime signals through the room route and list into `RoomCharacterCard`.
- Implemented card-local flash logic with normal motion interpolation and reduced-motion immediate toggle behavior.
- Added tests for websocket signal gating and reduced-motion card signal coverage.
- Added map-pruning for local websocket echo suppression markers to avoid stale suppression entries over long sessions.
- Added concurrency-focused card test coverage to assert independent flash animation scheduling across multiple cards.
- Reopened Story 3.8 for follow-up tuning and increased the realtime flash window to 2 seconds with a 4px flashing border.
- Updated websocket signal handling to flash any character card touched by a `character_updated` event, including the current user's card when the update is processed from the room subscription.
- Retuned the card flash presentation to use a 700ms two-phase animation, a 3px border, and the warm surface border colour as the idle/reduced-motion fallback instead of transparent.
- Refreshed hook and card tests to match the wider signal scope and the new border timing and styling expectations.

### Review Findings

- [x] [Review][Patch] Add AC2-focused test coverage for concurrent character-card flash handling [`frontend/components/munchkin/RoomCharacterCard.test.tsx:208`]
- [x] [Review][Patch] Prune stale local-update suppression markers to avoid long-lived stale entries [`frontend/hooks/useCharacters.ts:40`]

### File List

- _bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/hooks/useCharacters.ts
- frontend/hooks/useCharacters.test.ts
- frontend/app/munchkin/[roomNumber]/index.tsx
- frontend/components/munchkin/RoomCharactersList.tsx
- frontend/components/munchkin/RoomCharacterCard.tsx
- frontend/components/munchkin/RoomCharacterCard.test.tsx
- frontend/tsconfig.json

### Change Log

- 2026-03-30: Created Story 3.8 implementation artifact with full dev context and acceptance criteria mapping.
- 2026-03-30: Implemented realtime websocket-driven card update signals with reduced-motion support and regression tests.
- 2026-03-30: Applied review fixes by pruning stale local-update suppression markers and adding concurrent flash coverage in `RoomCharacterCard` tests.
- 2026-03-31: Returned Story 3.8 to development and tuned the realtime card flash to 2000ms with a 4px border.
- 2026-03-31: Updated Story 3.8 notes to reflect the current repository changes: websocket flashes now include the current user's card, and the card flash styling/tests were retuned to 700ms with a 3px warm-surface border baseline.
