# Story 3.10: Unassociated Character Removal

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to remove an unassociated character from the room,
so that the session state stays clean when an extra character is no longer needed.

## Acceptance Criteria

1. **Given** there is an unassociated character in the room  
   **When** I choose to remove it  
   **Then** the character is removed from the room and no longer visible to any participant  
   **And** the room remains usable for the remaining players without broken state

2. **Given** a character is associated with a player identity  
   **When** I view that character's options  
   **Then** no removal option is shown — associated characters cannot be removed

## Tasks / Subtasks

- [ ] **Task 1 — API contract and backend guardrail** (AC: 1, 2)
  - [ ] Keep `DELETE /characters/:characterId` as the delete endpoint.
  - [ ] Update `backend/character-service/src/app.ts` delete flow to prevent deletion when `character.userId !== null` (return 409 conflict, no delete event published).
  - [ ] Add/extend backend tests in `backend/character-service/src/app.test.ts` for:
    - [ ] unassociated character delete succeeds (`204`)
    - [ ] associated character delete is rejected (`409`)

- [ ] **Task 2 — Frontend delete API helper** (AC: 1)
  - [ ] Add `deleteCharacter(characterId: string)` to `frontend/api/characters.ts`.
  - [ ] Add tests in `frontend/api/characters.test.ts` for successful delete and non-2xx error propagation.

- [ ] **Task 3 — UI action visibility and execution** (AC: 1, 2)
  - [ ] Add remove action to the existing full-edit path (`ChangeCharacterModal` opened from room route), not a separate screen.
  - [ ] Only render remove action when selected character has `userId === null`.
  - [ ] Never render remove action for associated characters (`userId !== null`).
  - [ ] Add explicit confirmation before delete.
  - [ ] On success: close modal/sheet state cleanly and keep Room View interactive.

- [ ] **Task 4 — Realtime/state consistency** (AC: 1)
  - [ ] Ensure current websocket `character_deleted` handling in `useRoomCharacters` remains the source of truth for cross-client removal updates.
  - [ ] Ensure no regressions in current character selection, footer rendering, and quick-edit flows after delete.

- [ ] **Task 5 — Regression tests + validation** (AC: 1, 2)
  - [ ] Add UI tests for remove action visibility (unassociated shown, associated hidden).
  - [ ] Add UI tests for delete success/failure UX behavior.
  - [ ] Run `cd backend && npm test`.
  - [ ] Run `cd frontend && npm run test`.
  - [ ] Run `cd frontend && npm run tsc -- --noEmit`.

## Dev Notes

### Why this story needs extra guardrails

- Current backend delete route removes any character by id; without a backend check, associated characters are still deletable through direct API calls.
- AC2 states associated characters cannot be removed, so enforcement must include both UI gating and backend protection.

### Existing Implementation to Reuse

- Backend delete route + event publish already exists in `backend/character-service/src/app.ts`.
- Frontend websocket deletion handling already exists in `frontend/hooks/useCharacters.ts` (`character_deleted` path refetches room characters).
- Room orchestration state is in `frontend/app/munchkin/[roomNumber]/index.tsx` and full edit UI is `frontend/app/munchkin/modal-change-caracter.tsx`.

### Architecture Compliance

- Follow ADR-9 behavior: character deletion is reflected on frontend via websocket update handling; no battle-history cascade is introduced.
- Keep layering consistent:
  - API transport logic in `frontend/api/*`
  - Route orchestration in `frontend/app/munchkin/[roomNumber]/index.tsx`
  - Modal/sheet components remain UI-focused and prop-driven

### Constraints / Non-Goals

- Do not add permission/role systems in this story.
- Do not introduce new websocket channels or polling loops.
- Do not refactor room routing or unrelated modal flows.

### File Structure Requirements

- Backend (expected):
  - `backend/character-service/src/app.ts`
  - `backend/character-service/src/app.test.ts`
- Frontend (expected):
  - `frontend/api/characters.ts`
  - `frontend/api/characters.test.ts`
  - `frontend/app/munchkin/[roomNumber]/index.tsx`
  - `frontend/app/munchkin/modal-change-caracter.tsx`
  - related tests under `frontend/__tests__/app/munchkin/` and/or component tests

### Testing Requirements

- Backend: verify associated-delete rejection and unassociated-delete success.
- Frontend API: verify delete helper and error propagation.
- Frontend UI: verify conditional action visibility and resilient behavior after failed delete.
- Re-run full frontend test + TS checks after changes.

### Previous Story Intelligence

- `3-9-*` artifact is not present in implementation artifacts; use current Epic 3 code patterns and Story 3.8 conventions for route-level orchestration and regression-first testing.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-character-management.md#story-310-unassociated-character-removal-todo]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#character-deleted-during-active-battle]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#architectural-decision-records-summary]
- [Source: backend/character-service/src/app.ts]
- [Source: backend/character-service/src/app.test.ts]
- [Source: frontend/hooks/useCharacters.ts]
- [Source: frontend/app/munchkin/[roomNumber]/index.tsx]
- [Source: frontend/app/munchkin/modal-change-caracter.tsx]

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex

### Debug Log References

- `validate-create-story` checklist review executed against Story 3.10 artifact.

### Completion Notes List

- Tightened Story 3.10 guidance to remove ambiguity in UI entry path and testing scope.
- Added missing backend enforcement requirement for AC2 (associated characters cannot be removed).
- Added explicit backend/frontend test expectations mapped to acceptance criteria.

### File List

- _bmad-output/implementation-artifacts/3-10-unassociated-character-removal.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
