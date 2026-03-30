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
- `cd frontend && npm run test`

### Completion Notes List

- Added `QuickEditSheet` as a reusable bottom-sheet modal with 60% height, level/power steppers, 44x44 tap targets, and haptics on every stepper interaction.
- Wired Room View to route current-player edits to QuickEditSheet while preserving ChangeCharacterModal for other characters.
- Added optimistic local stat overrides so Room View updates immediately while editing.
- Added dismiss-with-Undo flow (1500ms toast) and failure rollback with danger border flash.
- Added focused unit coverage for QuickEditSheet behavior.

### File List

- _bmad-output/implementation-artifacts/3-7-quick-character-stat-editing.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/app/munchkin/[roomNumber]/index.tsx
- frontend/components/munchkin/QuickEditSheet.tsx
- frontend/components/munchkin/QuickEditSheet.test.tsx

### Change Log

- 2026-03-30: Created Story 3.7 implementation artifact and implemented QuickEditSheet with optimistic room stat editing flow, Undo dismiss toast, and save-failure rollback feedback.
