# Story 3.7: Quick Character Stat Editing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to tap my character card and quickly adjust my level and power from a bottom sheet,
so that I can update my stats mid-game without navigating away from the Room View.

## Acceptance Criteria

1. **Given** I am viewing the Room View
   **When** I tap my character card
   **Then** a `QuickEditSheet` slides up from the bottom (~60% screen height) with level and power steppers
   **And** each stepper has +/− buttons with minimum 44×44pt tap targets
   **And** both level and power are floored at 0 with no upper ceiling
   **And** `Haptics.ImpactFeedbackStyle.Light` fires on every tap before save
   **And** stat values update optimistically in the UI immediately on tap

2. **Given** I make changes in the QuickEditSheet
   **When** I tap Save
   **Then** changes are persisted to the server
   **And** the sheet closes and the updated stats are visible in the Room View

3. **Given** I make changes and then dismiss the sheet by tapping outside
   **When** the sheet closes
   **Then** an Undo toast appears for 1500ms — tapping it restores the previous state

4. **Given** a save request fails
   **When** the server returns an error
   **Then** the stat value reverts quietly with a brief `danger` border flash — no toast

## Tasks / Subtasks

- [x] Task 1: Add QuickEdit bottom-sheet component and interaction controls (AC: 1)
  - [x] Create `frontend/components/munchkin/QuickEditSheet.tsx` as a bottom modal with ~60% screen height
  - [x] Add level/power stepper controls with 44x44 button targets
  - [x] Trigger `Haptics.ImpactFeedbackStyle.Light` on each +/− tap
  - [x] Floor both values at zero on decrement

- [x] Task 2: Integrate quick-edit flow into Room View for current player character (AC: 1, 2)
  - [x] Update `frontend/app/munchkin/[roomNumber]/index.tsx` to open QuickEditSheet when the current player taps their character
  - [x] Keep non-current-player edit path using existing `ChangeCharacterModal`
  - [x] Persist level/power via existing `update` hook flow when Save is pressed

- [x] Task 3: Implement optimistic stat updates, dismiss undo, and failure revert UX (AC: 1, 3, 4)
  - [x] Add optimistic in-memory stat overrides for immediate UI updates in list/footer
  - [x] Add 1500ms Undo toast when dismissing the sheet with unsaved changes
  - [x] Revert to snapshot values and flash danger border on save failure

- [x] Task 4: Add tests for quick-edit behavior (AC: 1)
  - [x] Add unit test for sheet sizing, haptics trigger, and floor-at-zero stepper behavior in `frontend/components/munchkin/QuickEditSheet.test.tsx`

- [x] Task 5: Run frontend validation
  - [x] `cd frontend && npm run tsc`
  - [x] `cd frontend && npm run test:unit -- QuickEditSheet.test.tsx`
  - [x] `cd frontend && npm run test`

## Dev Notes

### Story Foundation

- Story 3.7 introduces fast in-room stat editing via a bottom sheet to reduce context switching and support active gameplay updates.
- This story depends on Story 3.6 tap-ready card interactions and Story 3.2 route structure continuity.

### Architecture Guardrails

- Keep room route orchestration in `frontend/app/munchkin/[roomNumber]/index.tsx`.
- Keep reusable UI in `frontend/components/munchkin`.
- Reuse `useRoomCharacters().update(...)` as the persistence seam.
- Do not introduce new data services or alternate mutation flows.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-character-management.md#Story 3.7]
- [Source: frontend/app/munchkin/[roomNumber]/index.tsx]
- [Source: frontend/components/munchkin/QuickEditSheet.tsx]
- [Source: frontend/hooks/useCharacters.ts]

## Dev Agent Record

### Agent Model Used

gpt-5 (Codex)

### Debug Log References

- `cd frontend && npm run tsc`
- `cd frontend && npm run test:unit -- QuickEditSheet.test.tsx`
- `cd frontend && npm run test:room-route`
- `cd frontend && npm run test`
- `cd frontend && npm run tsc`
- `cd frontend && npm run test:unit -- QuickEditSheet.test.tsx`

### Completion Notes List

- Added `QuickEditSheet` as a reusable bottom-sheet modal with 60% height, level/power steppers, 44x44 tap targets, and haptics on every stepper interaction.
- Wired Room View to route current-player edits to QuickEditSheet while preserving ChangeCharacterModal for other characters.
- Moved quick-edit stat drafting into the sheet so Room View only changes after the player taps `Save`.
- Added undo-after-save feedback above the footer and preserved rollback feedback on save failure.
- Added focused unit and room-route regression coverage for the corrected quick-edit behavior.
- Corrected the quick-edit sheet layout so the larger `Edit more…` and `Save` actions sit centered directly beneath the stepper controls.
- Moved stat draft state into `QuickEditSheet`, so Room View stats stay unchanged until the player taps `Save`.
- Added drag-down dismissal for the sheet and moved the `Undo` toast above the footer with a slide-in animation so it stays visible.
- Added a room-route regression test covering the save-only stat update flow.
- Fixed the quick-edit dismissal flash by preserving the sheet's off-screen translation while the modal fade-out completes.
- Added a unit regression test covering the close-path translation state so the dismissal flash does not return.

### File List

- _bmad-output/implementation-artifacts/3-7-quick-character-stat-editing.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/app/munchkin/[roomNumber]/index.tsx
- frontend/components/munchkin/QuickEditSheet.tsx
- frontend/components/munchkin/QuickEditSheet.test.tsx
- frontend/__tests__/app/munchkin/[roomNumber].test.tsx

### Change Log

- 2026-03-30: Created Story 3.7 implementation artifact and implemented QuickEditSheet with optimistic room stat editing flow, Undo dismiss toast, and save-failure rollback feedback.
- 2026-03-30: Revised Story 3.7 quick-edit behavior so stats stay local until save, the sheet supports drag-down dismissal, the action buttons are larger and centered under the steppers, and the Undo toast renders above the footer.
- 2026-03-30: Fixed a QuickEditSheet dismissal animation regression where the sheet briefly flashed back on screen during modal close, and added a unit regression test for the close path.
