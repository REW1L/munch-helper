# Story 3.1: AppTheme Token Migration

Status: done

## Story

As a developer,
I want all hardcoded colour values in existing components migrated to AppTheme tokens,
So that new screens can be built consistently without introducing hardcoded hex values.

## Acceptance Criteria

1. **Given** `VioletButton` uses `#6E6BD4` as `backgroundColor`
   **When** migration is complete
   **Then** it uses `AppTheme.colors.actionSecondary`

2. **Given** `RoomCharacterCard` uses `#A67560` as `backgroundColor`
   **When** migration is complete
   **Then** it uses `AppTheme.colors.surfaceWarm`

3. **Given** `CurrentCharacterFooter` uses `#544C4C` as `backgroundColor`
   **When** migration is complete
   **Then** it uses `AppTheme.colors.elevated`

4. **Given** `[roomNumber].tsx` `logButton` style uses `#353535` as `backgroundColor`
   **When** migration is complete
   **Then** it uses `AppTheme.colors.surfaceSubtle`

5. **Given** the new tokens are needed
   **When** migration is complete
   **Then** `AppTheme.colors` in `frontend/constants/theme.ts` includes:
   - `actionSecondary: '#6E6BD4'`
   - `surfaceWarm: '#A67560'`
   - `surfaceSubtle: '#353535'`
   - `textAccentSoft: '#E8D89A'`

6. **Given** all migrated files have been updated
   **When** a grep for the four hardcoded hex values is run across the entire frontend
   **Then** zero occurrences of `#6E6BD4`, `#A67560`, `#544C4C`, `#353535` remain in any `.tsx`/`.ts` source file

## Tasks / Subtasks

- [x] Task 1: Add new tokens to `AppTheme.colors` in `frontend/constants/theme.ts` (AC: #5)
  - [x] Add `actionSecondary: '#6E6BD4'`
  - [x] Add `surfaceWarm: '#A67560'`
  - [x] Add `surfaceSubtle: '#353535'`
  - [x] Add `textAccentSoft: '#E8D89A'`

- [x] Task 2: Migrate `#6E6BD4` occurrences → `AppTheme.colors.actionSecondary` (AC: #1, #6)
  - [x] `frontend/components/VioletButton.tsx` line 19 — `backgroundColor`
  - [x] `frontend/app/munchkin/index.tsx` line 70 — `color` prop on `ActivityIndicator`
  - [x] Add `AppTheme` import to each file that doesn't already have it

- [x] Task 3: Migrate `#A67560` occurrences → `AppTheme.colors.surfaceWarm` (AC: #2, #6)
  - [x] `frontend/components/munchkin/RoomCharacterCard.tsx` line 50 — `backgroundColor`
  - [x] `frontend/app/munchkin/modal-create-character.tsx` line 190 — `backgroundColor`
  - [x] `frontend/app/munchkin/modal-change-caracter.tsx` line 387 — `backgroundColor`
  - [x] `frontend/app/main/modal-change-avatar.tsx` line 129 — `backgroundColor`
  - [x] `frontend/app/main/modal-room-create.tsx` line 79 — `backgroundColor`
  - [x] `frontend/app/main/modal-room-join.tsx` line 91 — `backgroundColor`
  - [x] `frontend/app/main/modal-change-user.tsx` line 149 — `backgroundColor`
  - [x] Add `AppTheme` import to each file that doesn't already have it

- [x] Task 4: Migrate `#544C4C` occurrences → `AppTheme.colors.elevated` (AC: #3, #6)
  - [x] `frontend/components/munchkin/CurrentCharacterFooter.tsx` line 48 — `backgroundColor`
  - [x] `frontend/app/rooms.tsx` line 225 — `backgroundColor`
  - [x] `frontend/app/main/modal-shop.tsx` line 125 — `backgroundColor`
  - [x] Add `AppTheme` import to each file that doesn't already have it

- [x] Task 5: Migrate `#353535` occurrences → `AppTheme.colors.surfaceSubtle` (AC: #4, #6)
  - [x] `frontend/app/munchkin/[roomNumber].tsx` line 222 — `logButton` `backgroundColor`
  - [x] `AppTheme` already imported in this file — no import change needed

- [x] Task 6: Verify zero hardcoded hex values remain (AC: #6)
  - [x] Run: `grep -rn "#6E6BD4\|#A67560\|#544C4C\|#353535" frontend --include="*.tsx" --include="*.ts"` — must return no results

- [x] Task 7: Run quality gates
  - [x] `cd frontend && npm run tsc` — no type errors
  - [x] `cd frontend && npm run lint` — no lint errors
  - [x] `cd frontend && npm test` — no regressions

### Review Findings

- [x] [Review][Defer] Hardcoded `#4C4545` in `munchkin/index.tsx` inline View style [frontend/app/munchkin/index.tsx:70] — deferred, pre-existing
- [x] [Review][Defer] Import order inconsistency in `modal-room-create.tsx` (`AppTheme` between `React` and RN block) [frontend/app/main/modal-room-create.tsx:2] — deferred, pre-existing cosmetic issue

## Dev Notes

### Full Scope — All 13 Occurrences Across 13 Files

The epic AC named only 4 components, but a codebase scan found the same hex values used across 13 locations. All must be migrated for AC #6 to pass.

| File | Line | Hex | Token |
|---|---|---|---|
| `frontend/components/VioletButton.tsx` | 19 | `#6E6BD4` | `actionSecondary` |
| `frontend/app/munchkin/index.tsx` | 70 | `#6E6BD4` | `actionSecondary` |
| `frontend/components/munchkin/RoomCharacterCard.tsx` | 50 | `#A67560` | `surfaceWarm` |
| `frontend/app/munchkin/modal-create-character.tsx` | 190 | `#A67560` | `surfaceWarm` |
| `frontend/app/munchkin/modal-change-caracter.tsx` | 387 | `#A67560` | `surfaceWarm` |
| `frontend/app/main/modal-change-avatar.tsx` | 129 | `#A67560` | `surfaceWarm` |
| `frontend/app/main/modal-room-create.tsx` | 79 | `#A67560` | `surfaceWarm` |
| `frontend/app/main/modal-room-join.tsx` | 91 | `#A67560` | `surfaceWarm` |
| `frontend/app/main/modal-change-user.tsx` | 149 | `#A67560` | `surfaceWarm` |
| `frontend/components/munchkin/CurrentCharacterFooter.tsx` | 48 | `#544C4C` | `elevated` |
| `frontend/app/rooms.tsx` | 225 | `#544C4C` | `elevated` |
| `frontend/app/main/modal-shop.tsx` | 125 | `#544C4C` | `elevated` |
| `frontend/app/munchkin/[roomNumber].tsx` | 222 | `#353535` | `surfaceSubtle` |

### Token Value Clarification — `CurrentCharacterFooter` `#544C4C`

The current `AppTheme.colors.elevated` value is `#4C4545`, not `#544C4C`. These are close but not identical. Per the epic spec, map `#544C4C` → `AppTheme.colors.elevated`. The goal is token consistency, not pixel-perfect colour preservation. Do NOT add a new token for this.

### AppTheme Import Pattern

Files that don't yet import `AppTheme` need:
```typescript
import { AppTheme } from '@/constants/theme';
```
`frontend/app/munchkin/[roomNumber].tsx` already imports `AppTheme` — do not add a duplicate.

### `textAccentSoft` Token

Add `textAccentSoft: '#E8D89A'` to `AppTheme.colors` even though no existing component uses it yet. It is required by Story 3.6 and must be present before that story begins.

### No Test Changes Required

Pure token migration — no logic changes, no new behaviour. Existing tests should pass unchanged.

### Project Structure Notes

- `frontend/constants/theme.ts` is the single source of truth for `AppTheme` — all token additions go here only.
- `AppTheme` is exported `as const` — adding new keys is safe and picked up by all consumers automatically.
- No new files are created in this story.

### References

- Epic AC: [Source: _bmad-output/planning-artifacts/epics/epic-3-character-management.md#Story 3.1]
- Token values: [Source: _bmad-output/planning-artifacts/ux-design-specification/8-visual-foundation.md#8.1 Color System]
- Current theme file: [Source: frontend/constants/theme.ts]
- Architecture patterns: [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md]
- Project context rules: [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Debug Log References

### Completion Notes List

- All 13 hardcoded hex occurrences across 13 files migrated to AppTheme tokens
- 4 new tokens added to `AppTheme.colors`: `actionSecondary`, `surfaceWarm`, `surfaceSubtle`, `textAccentSoft`
- `AppTheme` import added to 11 files; `[roomNumber].tsx` already had it
- Zero hardcoded hex values remain in any `.tsx`/`.ts` source file (only token definitions in `theme.ts`)
- tsc: 0 errors, lint: 0 errors (3 pre-existing warnings unrelated to this story), tests: 57/57 passed
- 2026-03-29 verification rerun: `npm run tsc` passed, `npm run lint` reported only 3 pre-existing warnings, `npm test` passed (50 unit + 7 room-route)

### File List

- `frontend/constants/theme.ts`
- `frontend/components/VioletButton.tsx`
- `frontend/app/munchkin/index.tsx`
- `frontend/components/munchkin/RoomCharacterCard.tsx`
- `frontend/app/munchkin/modal-create-character.tsx`
- `frontend/app/munchkin/modal-change-caracter.tsx`
- `frontend/app/main/modal-change-avatar.tsx`
- `frontend/app/main/modal-room-create.tsx`
- `frontend/app/main/modal-room-join.tsx`
- `frontend/app/main/modal-change-user.tsx`
- `frontend/components/munchkin/CurrentCharacterFooter.tsx`
- `frontend/app/rooms.tsx`
- `frontend/app/main/modal-shop.tsx`
- `frontend/app/munchkin/[roomNumber].tsx`

### Change Log

- 2026-03-29: Verified story completion, checked off all completed tasks/subtasks, and marked the story done after a clean review and passing validation rerun.
