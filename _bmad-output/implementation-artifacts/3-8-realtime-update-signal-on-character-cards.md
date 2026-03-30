# Story 3.8: Realtime Update Signal on Character Cards

Status: done

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

- [x] Task 3: Add regression tests for realtime signal behavior and signal gating (AC: 1, 3)
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
- `cd frontend && npm run lint`

### Completion Notes List

- Added per-character realtime update signal counters in `useRoomCharacters` and emitted signals only for websocket updates targeting non-self characters.
- Added short-window suppression for locally initiated character updates so websocket echo events from the same client do not trigger false remote-update flashes.
- Wired realtime signals through the room route and list into `RoomCharacterCard`.
- Implemented card-local flash logic with normal motion interpolation and reduced-motion immediate toggle behavior.
- Added tests for websocket signal gating and reduced-motion card signal coverage.

### File List

- _bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/hooks/useCharacters.ts
- frontend/hooks/useCharacters.test.ts
- frontend/app/munchkin/[roomNumber]/index.tsx
- frontend/components/munchkin/RoomCharactersList.tsx
- frontend/components/munchkin/RoomCharacterCard.tsx
- frontend/components/munchkin/RoomCharacterCard.test.tsx

### Change Log

- 2026-03-30: Created Story 3.8 implementation artifact with full dev context and acceptance criteria mapping.
- 2026-03-30: Implemented realtime websocket-driven card update signals with reduced-motion support and regression tests.
