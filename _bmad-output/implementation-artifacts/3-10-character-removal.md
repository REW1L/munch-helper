# Story 3.10: Character Removal

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to remove a character from the room,
so that the session state stays clean when a character is no longer needed.

## Acceptance Criteria

1. **Given** there is a character in the room
   **When** I open the character change modal and choose to remove it
   **Then** the character is removed from the room and no longer visible to any participant
   **And** the room remains usable for the remaining players without broken state

2. **Given** I am viewing the character change modal
   **When** the modal is displayed
   **Then** a Delete button is rendered at the bottom of the changeable characteristics section
   **And** the Delete button uses the Danger zone color style (destructive/red)
   **And** tapping the button shows an explicit confirmation before the delete is executed

## Tasks / Subtasks

- [ ] **Task 1 — API contract and backend** (AC: 1)
  - [ ] Keep `DELETE /characters/:characterId` as the delete endpoint.
  - [ ] Remove any restriction on deleting associated characters — all characters are deletable regardless of `userId`.
  - [ ] Add/extend backend tests in `backend/character-service/src/app.test.ts` for:
    - [ ] unassociated character delete succeeds (`204`)
    - [ ] associated character delete also succeeds (`204`)

- [ ] **Task 2 — Frontend delete API helper** (AC: 1)
  - [ ] Add `deleteCharacter(characterId: string)` to `frontend/api/characters.ts`.
  - [ ] Add tests in `frontend/api/characters.test.ts` for successful delete and non-2xx error propagation.

- [ ] **Task 3 — UI: Delete button in character change modal** (AC: 1, 2)
  - [ ] Add a Delete button inside `ChangeCharacterModal` (`frontend/app/munchkin/modal-change-caracter.tsx`), positioned at the **bottom of the changeable characteristics section**.
  - [ ] Style the button with the **Danger zone** color (destructive/red — use the same token or style as other destructive actions in the app).
  - [ ] The Delete button must be rendered for **all** characters, regardless of `userId`.
  - [ ] Add explicit confirmation dialog/sheet before executing delete.
  - [ ] On confirmed delete: call `deleteCharacter`, close modal cleanly, keep Room View interactive.
  - [ ] On cancel: dismiss confirmation, return user to the modal without side effects.

- [ ] **Task 4 — Realtime/state consistency** (AC: 1)
  - [ ] Ensure current websocket `character_deleted` handling in `useRoomCharacters` remains the source of truth for cross-client removal updates.
  - [ ] Ensure no regressions in current character selection, footer rendering, and quick-edit flows after delete.

- [ ] **Task 5 — Regression tests + validation** (AC: 1, 2)
  - [ ] Add UI tests for Delete button visibility (rendered for all characters).
  - [ ] Add UI tests for confirmation flow and delete success/failure UX behavior.
  - [ ] Run `cd backend && npm test`.
  - [ ] Run `cd frontend && npm run test`.
  - [ ] Run `cd frontend && npm run tsc -- --noEmit`.

## Dev Notes

### Why this story needs extra guardrails

- Previous version restricted removal to unassociated characters only. That restriction is now removed — any character in a room can be deleted.
- Backend must no longer reject delete requests for characters with `userId !== null`.

### Existing Implementation to Reuse

- Backend delete route + event publish already exists in `backend/character-service/src/app.ts`.
- Frontend websocket deletion handling already exists in `frontend/hooks/useCharacters.ts` (`character_deleted` path refetches room characters).
- Room orchestration state is in `frontend/app/munchkin/[roomNumber]/index.tsx` and full edit UI is `frontend/app/munchkin/modal-change-caracter.tsx`.

### UI Placement Detail

The Delete button must appear **inside `ChangeCharacterModal`**, at the **bottom of the section that lists changeable characteristics** (e.g., below level, class, race fields — but above any modal footer action bar if one exists). It must use the app's **Danger zone** visual style — typically a red or destructive-colored button token. Check existing destructive UI patterns in the codebase for the correct style token/component to reuse.

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

- Backend: verify any character delete succeeds (both associated and unassociated).
- Frontend API: verify delete helper and error propagation.
- Frontend UI: verify Delete button is always visible, confirmation flow works, and resilient behavior after failed delete.
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

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Updated Story 3.10: removed "unassociated" restriction — all characters are now removable.
- Added explicit UI placement requirement: Delete button at the bottom of the changeable characteristics section inside ChangeCharacterModal.
- Added Danger zone color requirement for the Delete button.
- Removed AC2 (associated characters cannot be removed) and corresponding backend 409 rejection.

### File List

- _bmad-output/implementation-artifacts/3-10-character-removal.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
