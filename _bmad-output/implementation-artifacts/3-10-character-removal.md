# Story 3.10: Character Removal

Status: done

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

- [x] **Task 1 — API contract and backend** (AC: 1)
  - [x] Keep `DELETE /characters/:characterId` as the delete endpoint.
  - [x] Remove any restriction on deleting associated characters — all characters are deletable regardless of `userId`.
  - [x] Add/extend backend tests in `backend/character-service/src/app.test.ts` for:
    - [x] unassociated character delete succeeds (`204`)
    - [x] associated character delete also succeeds (`204`)

- [x] **Task 2 — Frontend delete API helper** (AC: 1)
  - [x] Add `deleteCharacter(characterId: string)` to `frontend/api/characters.ts`.
  - [x] Add tests in `frontend/api/characters.test.ts` for successful delete and non-2xx error propagation.

- [x] **Task 3 — UI: Delete button in character change modal** (AC: 1, 2)
  - [x] Add a Delete button inside `ChangeCharacterModal` (`frontend/app/munchkin/modal-change-caracter.tsx`), positioned at the **bottom of the changeable characteristics section**.
  - [x] Style the button with the **Danger zone** color (destructive/red — use the same token or style as other destructive actions in the app).
  - [x] The Delete button must be rendered for **all** characters, regardless of `userId`.
  - [x] Add explicit confirmation dialog/sheet before executing delete.
  - [x] On confirmed delete: call `deleteCharacter`, close modal cleanly, keep Room View interactive.
  - [x] On cancel: dismiss confirmation, return user to the modal without side effects.

- [x] **Task 4 — Realtime/state consistency** (AC: 1)
  - [x] Ensure current websocket `character_deleted` handling in `useRoomCharacters` remains the source of truth for cross-client removal updates.
  - [x] Ensure no regressions in current character selection, footer rendering, and quick-edit flows after delete.

- [x] **Task 5 — Regression tests + validation** (AC: 1, 2)
  - [x] Add UI tests for Delete button visibility (rendered for all characters).
  - [x] Add UI tests for confirmation flow and delete success/failure UX behavior.
  - [x] Run `cd backend && npm test`.
- [x] Run `cd frontend && npm run test`.
- [x] Run `cd frontend && npm run tsc -- --noEmit`.

### Review Findings

- [x] [Review][Patch] Switching characters during overlapping deletes can clear the active pending state and re-enable duplicate delete submissions [frontend/app/munchkin/modal-change-caracter.tsx:81]
- [x] [Review][Patch] Delete failures are surfaced behind the modal instead of inside the active delete UI [frontend/app/munchkin/[roomNumber]/index.tsx:275]
- [x] [Review][Patch] Deleting the current user's character triggers unintended auto-recreation [`frontend/hooks/useCharacters.ts:309`]
- [x] [Review][Patch] Optimistic delete can close or clear a newer character selection after the user switches targets mid-request [`frontend/app/munchkin/[roomNumber]/index.tsx:260`]
- [x] [Review][Patch] ChangeCharacterModal keeps stale local character state after the user switches selections during an in-flight delete [frontend/app/munchkin/modal-change-caracter.tsx:47]
- [x] [Review][Patch] Late delete failures can surface on a newer character after the user switches selections mid-request [frontend/app/munchkin/[roomNumber]/index.tsx:281]
- [x] [Review][Patch] Optimistic delete unmounts the active change modal before success or failure can be shown [frontend/app/munchkin/[roomNumber]/index.tsx:247]
- [x] [Review][Patch] New modal test lives under Expo Router `app/`, violating the route-only test placement rule [frontend/app/munchkin/modal-change-caracter.test.tsx:1]
- [x] [Review][Patch] Delete rollback restores a stale room snapshot and can discard newer local mutations [frontend/hooks/useCharacters.ts:243]
- [x] [Review][Patch] Optimistic self-delete still exposes the global create action, so a replacement can be created before the delete settles and the failed-delete rollback can leave two self-owned characters competing for the singular current-character UI [frontend/hooks/useCharacters.ts:236]
- [x] [Review] Cancel remains enabled while a delete is in flight, so the user can dismiss the modal and lose any surfaced delete failure because the route stores the rejection in hidden modal-only state instead of a visible room-level error [frontend/app/munchkin/modal-change-caracter.tsx:408] [frontend/app/munchkin/[roomNumber]/index.tsx:285]
- [x] [Review][Patch] Save remains enabled while delete is in flight, so the same modal can still submit an update against a character that is already being removed [frontend/app/munchkin/modal-change-caracter.tsx:415]
- [x] [Review] A remotely deleted selected character stays open in `ChangeCharacterModal` from `selectedCharacterSnapshot`, so other participants can still see and interact with a character that AC1 says should no longer be visible. The route now keeps the modal mounted whenever `selectedCharacter` disappears (`modalCharacter = selectedCharacter ?? selectedCharacterSnapshot`), but only clears that snapshot after the local delete/cancel path, not after websocket-driven removal from another client [frontend/app/munchkin/[roomNumber]/index.tsx:101] [frontend/app/munchkin/[roomNumber]/index.tsx:294]
- [x] [Review][Patch] `deleteMutation.error` is included in the shared `errorMessage` computation, so a delete failure surfaces both inside `ChangeCharacterModal` (via `deleteError`) and in the room-level `RoomCharactersList` error display simultaneously — double-surfacing the same error [frontend/hooks/useCharacters.ts:418]
- [x] [Review][Patch] `selectedCharacterIdRef` is synced via `useEffect`, introducing a one-render lag; a very fast delete completion (or test mock) can read a stale ref value before the effect runs, causing the staleness guard to pass incorrectly [frontend/app/munchkin/[roomNumber]/index.tsx:50]
- [x] [Review][Patch] If `onMutate` throws (e.g. `queryClient.cancelQueries` rejects), `onSettled` receives `context = undefined` and skips the `pendingCurrentUserDeleteCountRef` decrement and `setIsCreateBlocked(false)` call, leaving `isCreateBlocked` permanently `true` for the rest of the room session [frontend/hooks/useCharacters.ts:285]
- [x] [Review][Defer] `Alert.alert` confirmation callback can fire after `ChangeCharacterModal` is unmounted (e.g. remote delete closes the modal between Alert display and user tap), calling `setIsDeletePending` on an unmounted component — React handles this gracefully but logs a warning; native Alert lifecycle is platform-controlled and cannot be cancelled [frontend/app/munchkin/modal-change-caracter.tsx:95] — deferred, platform limitation
- [x] [Review][Patch] `deleteMutation.error` still included in shared `errorMessage` — delete failure surfaces both in modal `deleteError` and room-level banner simultaneously [frontend/hooks/useCharacters.ts:418]
- [x] [Review][Patch] `onMutate` throw leaves `context` undefined in `onSettled`, skipping `pendingCurrentUserDeleteCountRef` decrement and `setIsCreateBlocked(false)`, permanently blocking create for the session [frontend/hooks/useCharacters.ts:onSettled]
- [x] [Review][Patch] `deletedCharacterIndex` of `-1` (character not found in cache) causes rollback re-insertion at index 0 instead of original position — `Math.max(0, Math.min(-1, len))` = 0 [frontend/hooks/useCharacters.ts:onError]
- [x] [Review][Patch] `selectedCharacterIdRef` one-render lag still present — fast delete completion reads stale ref before `useEffect` syncs, staleness guard passes incorrectly [frontend/app/munchkin/[roomNumber]/index.tsx:50]
- [x] [Review][Patch] `handleDeleteConfirm` closure captures `character.id` at definition time; if selection switches between Alert display and user tap, delete is issued for the wrong character id [frontend/app/munchkin/modal-change-caracter.tsx:95]
- [x] [Review][Patch] `autoCreateSuppressedForCurrentUserRef=true` with `pendingCurrentUserDeleteCountRef=0` desync (possible after error path) permanently blocks create even after all deletes settle [frontend/hooks/useCharacters.ts:create guard]
- [x] [Review][Patch] Remote-delete auto-close effect returns early when `selectedCharacterSnapshot` is null, so modal does not auto-close on remote delete if snapshot was never set [frontend/app/munchkin/[roomNumber]/index.tsx:remote-delete useEffect]
- [x] [Review][Defer] `VioletButton` `disabled` prop may not suppress all interaction paths on Expo web (`TouchableOpacity` web behavior) [frontend/components/VioletButton.tsx] — deferred, web platform limitation
- [x] [Review][Defer] Delete button text uses `AppTheme.colors.textPrimary` on `danger` background — contrast may be insufficient depending on theme values [frontend/app/munchkin/modal-change-caracter.tsx:styles] — deferred, visual/design concern
- [x] [Review][Patch] Unconditional `setSelectedCharacterIdAndRef(null)` on delete success clears a different character's selection if the user switched targets while the delete was in flight [frontend/app/munchkin/[roomNumber]/index.tsx:~322]
- [x] [Review][Patch] Snapshot guard inversion (`selectedCharacterSnapshot && ...` instead of `!selectedCharacterSnapshot || ...`) causes the remote-delete auto-close effect to fire unexpectedly when snapshot is null [frontend/app/munchkin/[roomNumber]/index.tsx:~139]
- [x] [Review][Patch] `onSettled` context=undefined branch decrements `pendingCurrentUserDeleteCountRef` even when `onMutate` threw before incrementing it, prematurely unblocking create while a real delete is still in flight [frontend/hooks/useCharacters.ts:~278]
- [x] [Review][Patch] `autoCreateSuppressedForCurrentUserRef` is set to true in `onMutate` but never reset when `onMutate` throws (only `onSettled` is called with context=undefined, which does not reset the ref), permanently suppressing auto-create for the session [frontend/hooks/useCharacters.ts:~278]
- [x] [Review][Patch] `deleteMutation.error` removed from shared `errorMessage` — confirm `deleteError` prop path in the route covers all failure paths and no delete error is silently dropped [frontend/hooks/useCharacters.ts:~419]

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

### Confirmation Dialog (Web Compatibility)

`Alert.alert` is a no-op on Expo web. A reusable `ConfirmDialog` component (`frontend/components/ConfirmDialog.tsx`) was introduced to handle this:

- **Native**: calls `Alert.alert` via `useEffect` when `visible` becomes `true` — renders nothing.
- **Web**: renders an inline modal overlay with Cancel and confirm buttons, styled with `AppTheme` tokens.

`ChangeCharacterModal` uses controlled state (`deleteConfirmVisible`, `pendingDeleteCharacterIdRef`) to drive `ConfirmDialog` instead of calling `Alert.alert` directly. This keeps the modal component platform-agnostic.

### File Structure Requirements

- Backend (expected):
  - `backend/character-service/src/app.ts`
  - `backend/character-service/src/app.test.ts`
- Frontend (expected):
  - `frontend/api/characters.ts`
  - `frontend/api/characters.test.ts`
  - `frontend/components/ConfirmDialog.tsx`
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

gpt-5

### Debug Log References

- `cd backend && npm test`
- `cd frontend && npm run test`
- `cd frontend && npm run tsc -- --noEmit`

### Completion Notes List

- Added explicit backend coverage for both unassociated (`userId: null`) and associated (`userId` present) character deletion paths, both returning `204`.
- Added `deleteCharacter(characterId)` API helper with tests for success path and non-2xx error propagation.
- Added delete mutation support in `useRoomCharacters` with optimistic cache removal and rollback on error while preserving websocket `character_deleted` invalidation as source of truth.
- Added delete orchestration in room route (`[roomNumber]/index.tsx`) to close modal cleanly and keep room interactions responsive.
- Added Delete button to `ChangeCharacterModal` at the bottom of changeable characteristics, styled with `AppTheme.colors.danger`.
- Added explicit confirmation dialog (`Alert.alert`) with cancel/no-side-effect behavior before delete execution.
- Added room-route UI tests covering delete visibility/flow for own and other-user characters, explicit confirmation gating, and failure UX signaling.
- Suppressed automatic self-character recreation after an intentional self-delete while still allowing explicit recreation flows.
- Guarded delete completion so a late response cannot close or clear a newer character selection in the room screen.
- Surfaced delete failures inside `ChangeCharacterModal` so the active destructive flow shows the error state directly within the edit UI.
- Reset `ChangeCharacterModal` draft state whenever the selected character changes so stale edits and pending delete state cannot leak onto a newer selection.
- Guarded delete failure handling in the room route so late rejections only surface if the failed request still belongs to the active selection.
- Added modal- and route-level regression coverage for selection switching during in-flight deletes and late failure isolation.
- Kept `ChangeCharacterModal` mounted against a selected-character snapshot so optimistic delete removal no longer unmounts the active destructive flow before success/failure feedback.
- Moved modal draft-reset test from Expo Router `app/` into `frontend/__tests__/app/munchkin/` to comply with route-only test placement.
- Replaced delete rollback snapshot restore with targeted re-insertion of the failed character so newer local mutations remain intact; added a hook-level regression covering in-flight delete failure plus later local updates.
- Scoped modal delete pending-state cleanup to the active request so older delete completions cannot re-enable duplicate submissions after switching selections; added modal regression coverage for overlapping deletes.
- Added a self-delete in-flight create guard in `useRoomCharacters` and surfaced `isCreateBlocked` to the room list so the global Create action is disabled until the current-user delete settles.
- Added regressions for self-delete create blocking at the hook level and create-button disabled state at the room-route level.
- Disabled `ChangeCharacterModal` cancel/dismiss interactions while delete is pending so late delete failures cannot be hidden by closing the modal; added regression coverage for pending-delete cancel lockout.
- Disabled `ChangeCharacterModal` save interaction while delete is pending so updates cannot race against destructive removal; added modal regression coverage for pending-delete save lockout.
- Closed the final remote-delete visibility gap by clearing stale selected-character snapshots when websocket updates remove the active character and no local delete is pending, so the edit modal closes immediately for remotely deleted characters.
- Replaced `Alert.alert` confirmation with a reusable `ConfirmDialog` component that uses `Alert.alert` on native and renders an inline modal overlay on web; updated modal tests to interact with `ConfirmDialog` via `testID` instead of mocking `Alert.alert`.

### File List

- frontend/components/ConfirmDialog.tsx
- backend/character-service/src/app.test.ts
- frontend/api/characters.ts
- frontend/api/characters.test.ts
- frontend/hooks/useCharacters.ts
- frontend/hooks/useCharacters.test.ts
- frontend/components/VioletButton.tsx
- frontend/components/munchkin/RoomCharactersList.tsx
- frontend/app/munchkin/modal-change-caracter.tsx
- frontend/app/munchkin/[roomNumber]/index.tsx
- frontend/__tests__/app/munchkin/[roomNumber].test.tsx
- frontend/__tests__/app/munchkin/modal-change-caracter.test.tsx
- _bmad-output/implementation-artifacts/3-10-character-removal.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-04-04: Implemented Story 3.10 character removal end-to-end (backend deletion coverage, frontend delete API + mutation, modal danger delete UI with confirmation, room orchestration, and regression tests). Story marked `review`.
- 2026-04-04: Fixed review findings for self-delete auto-recreation and stale delete completion clearing a newer selection; added regression tests for both cases.
- 2026-04-04: Fixed the final review finding by surfacing delete failures inside the active character edit modal and revalidated the room-route/frontend regression suites.
- 2026-04-04: Closed the remaining review findings by resetting modal draft state on selection changes and ignoring late delete failures for superseded selections; added targeted modal and room-route regressions and re-ran frontend tests plus TypeScript checks.
- 2026-04-04: Resolved the last two review findings by preserving modal visibility through optimistic delete lifecycle and relocating modal tests to `frontend/__tests__/app/munchkin/`; re-ran frontend tests and TypeScript checks.
- 2026-04-04: Resolved the remaining review finding by changing delete-error rollback to merge back only the failed character (instead of restoring a full stale snapshot), preserving newer local mutations; added a focused `useRoomCharacters` regression test and re-ran hook tests plus TypeScript checks.
- 2026-04-04: Re-ran code review and found one remaining modal delete race: an earlier delete request can clear `isDeletePending` after the user switches targets, which re-enables duplicate delete submissions on the active character.
- 2026-04-04: Fixed the final modal delete race by keying pending-state cleanup to the active delete request/character, preventing stale completion handlers from re-enabling duplicate deletes on a newly selected character; added modal regression and re-ran frontend tests + TypeScript checks.
- 2026-04-04: Re-ran code review and found one remaining optimistic self-delete race: the room still exposes `Create a character` while the current user's delete is in flight, so a failed rollback can restore the old character after a replacement was already created.
- 2026-04-04: Closed the remaining self-delete review finding by blocking current-user create while self-delete is in flight and disabling the global Create button through a new `isCreateBlocked` hook signal; added hook + room-route regressions and re-ran frontend tests + TypeScript checks.
- 2026-04-04: Re-ran code review and found one remaining delete UX gap: the modal still allows cancel while delete is pending, which can hide a late delete failure instead of surfacing it in visible UI.
- 2026-04-04: Closed the final delete UX finding by disabling modal cancel/close while delete is pending, added a modal regression for pending-delete cancel lockout, and re-ran frontend tests + TypeScript checks.
- 2026-04-04: Re-ran code review and found one remaining modal concurrency gap: Save stays enabled during an in-flight delete, so the UI can still issue a conflicting update against a character already being removed.
- 2026-04-04: Closed the final modal concurrency finding by disabling Save while delete is pending, added regression coverage, and re-ran frontend tests + TypeScript checks.
- 2026-04-05: Replaced `Alert.alert` confirmation with cross-platform `ConfirmDialog` component (native: `Alert.alert` via `useEffect`; web: inline modal overlay); updated modal tests to use `testID`-based confirm button interaction.
