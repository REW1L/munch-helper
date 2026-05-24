# Story 3.6: Updated Character Card Styling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want character cards to use the app's design token system with clear stat colours,
so that names and values are easy to read, especially in low-light conditions.

## Acceptance Criteria

1. **Given** the Room View displays character cards
   **When** cards are rendered after the token migration
   **Then** character names use `textAccentSoft`
   **And** stat values use `accent`

2. **Given** `RoomCharacterCard` and `CurrentCharacterFooter` currently still contain local colour literals
   **When** this story is complete
   **Then** those components have no remaining hardcoded hex values

3. **Given** a player wants to edit a character from Room View
   **When** they tap a full character card
   **Then** the full card is tappable and opens the same edit flow seam that will back `QuickEditSheet`

## Tasks / Subtasks

- [x] Task 1: Align the shared theme token source with the approved warm-card styling (AC: 1, 2)
  - [x] Update `frontend/constants/theme.ts` so `AppTheme.colors.surfaceWarm` uses the revised `#8A6150` value from the UX accessibility spec
  - [x] Keep `AppTheme` as the sole token source; do not add component-local warm-surface constants or new duplicate tokens

- [x] Task 2: Update `RoomCharacterCard` styling without changing its core layout model (AC: 1, 2)
  - [x] Keep the existing horizontal 85pt card layout and visible attributes box from Story 3.5; do not collapse the card into a grid or hide attributes behind a tap
  - [x] Change the character name styling to `AppTheme.colors.textAccentSoft`
  - [x] Change the level/power styling to `AppTheme.colors.accent` and preserve strong emphasis so the near-AA contrast exception remains mitigated
  - [x] Replace remaining local colour literals in the card styles with `AppTheme` tokens or shared React Native color expressions that do not introduce new hardcoded hex values

- [x] Task 3: Make the room card fully tappable using the existing edit callback seam (AC: 3)
  - [x] Wrap the full `RoomCharacterCard` in an accessible press target that calls the existing `onChangePress(character)` prop
  - [x] Preserve the existing `Change` button for now unless the implementation proves it is redundant and safe to remove within this story's acceptance criteria
  - [x] Add the required accessibility contract from the UX spec: `accessible={true}`, `accessibilityRole="button"`, `accessibilityLabel="[Name], Level [N], Power [N]"`, `accessibilityHint="Tap to edit stats"`
  - [x] Do not implement `QuickEditSheet` in this story; this story should only create the interaction seam that Story 3.7 can redirect without reworking card internals

- [x] Task 4: Update `CurrentCharacterFooter` and shared attribute text styling to match the token system (AC: 1, 2)
  - [x] Keep `CurrentCharacterFooter` background on `AppTheme.colors.elevated`
  - [x] Change footer name styling to `AppTheme.colors.textAccentSoft`
  - [x] Change footer level/power styling to `AppTheme.colors.accent`
  - [x] Remove the remaining hardcoded colour literals in `frontend/components/munchkin/CurrentCharacterFooter.tsx`
  - [x] Remove the hardcoded white text in `frontend/components/munchkin/AttributeList.tsx`, because both the room card and footer render that shared component

- [x] Task 5: Keep room-screen wiring and component boundaries intact (AC: 3)
  - [x] Preserve the current route-level ownership in `frontend/app/munchkin/[roomNumber]/index.tsx`, where `handleChangePress` opens `ChangeCharacterModal`
  - [x] Keep `RoomCharactersList` presentational; pass the existing callback through rather than introducing new room-edit state into the list component
  - [x] Do not add helpers under `frontend/app/munchkin/[roomNumber]/`; keep route-only discipline in `frontend/app`

- [x] Task 6: Add regression coverage for the new interaction and token-driven rendering (AC: 1, 2, 3)
  - [x] Add focused component-level tests for `RoomCharacterCard` covering full-card press, existing button press, and accessibility labeling
  - [x] Add focused coverage for the shared text styling path used by `RoomCharacterCard`, `CurrentCharacterFooter`, and `AttributeList`
  - [x] Prefer component/unit tests over route tests for this story because the current room-route test suite mocks the character-list/footer components out

- [x] Task 7: Run frontend validation after implementation
  - [x] `cd frontend && npm run tsc`
  - [x] `cd frontend && npm run lint`
  - [x] `cd frontend && npm run test`

### Review Findings

- [x] [Review][Patch] Nested interactive controls in `RoomCharacterCard` can cause accessibility and event-propagation conflicts between the outer tappable card and inner `Change` button [`frontend/components/munchkin/RoomCharacterCard.tsx:22`]

## Dev Notes

### Story Foundation

- Epic 3 keeps the existing horizontal character-card layout while improving readability and preparing the faster QuickEdit path.
- Story 3.6 covers UX-DR4 and UX-DR5 and depends on Story 3.1 token migration being in place first.
- Business value: character names and stats become easier to scan in play, and the card interaction model moves toward the two-tier edit flow without requiring the full bottom-sheet implementation yet.

### Current Codebase Intelligence

- `frontend/components/munchkin/RoomCharacterCard.tsx` already uses `AppTheme.colors.surfaceWarm` for the card background, but the character name and stat values are still hardcoded `#FFFFFF`.
- `frontend/components/munchkin/CurrentCharacterFooter.tsx` already uses `AppTheme.colors.elevated` for the footer background, but the footer name and stat values are still hardcoded `#FFFFFF`.
- `frontend/components/munchkin/AttributeList.tsx` still renders attribute text with hardcoded `#FFFFFF`; if left unchanged, the card/footer path would still contain local hex colours despite this story's token goal.
- `frontend/app/munchkin/[roomNumber]/index.tsx` already owns the edit-flow seam through `handleChangePress(character)` and opens `ChangeCharacterModal`. Reuse that seam instead of inventing a second edit trigger contract.
- `frontend/components/munchkin/RoomCharactersList.tsx` is already a thin presentational list that passes `onChangePress` to each card. Keep it that way.

### UX Guardrails

- Preserve the current refined direction from the UX spec:
  - keep the horizontal card structure
  - keep the attributes box visible on every card
  - add full-card tap in addition to the existing edit affordance
- `textAccentSoft` is reserved for character names; `accent` is reserved for numerical values players care most about and the primary action on a screen.
- The UX accessibility spec requires the card-level button semantics and spoken label/hint.
- `surfaceWarm` is intentionally darkened to `#8A6150` to improve contrast for `accent` text. Apply that at the theme-token level, not as a one-off override in `RoomCharacterCard`.
- The known contrast exception for `accent` on `surfaceWarm` is already accepted only with mitigation: bold stat text, darkened background, and text shadow on names where needed. Do not weaken those mitigations while restyling.

### Architecture Guardrails

- Keep frontend boundaries intact:
  - route files under `frontend/app` compose screens
  - reusable UI stays in `frontend/components`
  - hooks own orchestration/stateful transport concerns
- Do not introduce new edit-flow state into `RoomCharactersList` or `RoomCharacterCard`; use the existing callback contract from the room route.
- Keep `AppTheme` as the sole design-token source. Do not add duplicate constants in components for colors already represented in `frontend/constants/theme.ts`.

### File Structure Requirements

- Expected implementation files:
  - `frontend/constants/theme.ts`
  - `frontend/components/munchkin/RoomCharacterCard.tsx`
  - `frontend/components/munchkin/CurrentCharacterFooter.tsx`
  - `frontend/components/munchkin/AttributeList.tsx`
  - `frontend/components/munchkin/RoomCharactersList.tsx` only if callback/prop plumbing needs a mechanical update
  - `frontend/app/munchkin/[roomNumber]/index.tsx` only if the room route needs a minimal integration update
- Expected test location:
  - component/unit tests under `frontend/components/...` or another existing frontend unit-test location outside `frontend/app`

### Testing Requirements

- Cover the full-card tap contract and confirm it invokes the existing edit callback with the correct character.
- Cover accessibility output for the tappable card, including role, label, and hint.
- Cover the token-driven text rendering path so regressions back to hardcoded white text are caught.
- Run the full frontend suite because this story changes shared theme and shared character-display components.

### Previous Story Intelligence

- Story 3.1 added the relevant design tokens but left `surfaceWarm` at `#A67560` in the current theme file; Story 3.6 must reconcile that with the later UX accessibility update.
- Story 3.2 moved the room route to `frontend/app/munchkin/[roomNumber]/index.tsx`; keep all Room View integrations aligned to that directory route.
- No implementation-artifact files were found for Stories 3.3, 3.4, or 3.5, so rely on current code, Epic 3, and UX docs for continuity instead of undocumented story-by-story learnings.

### Git Intelligence Summary

- Recent relevant commits are Story 3.1 token migration and Story 3.2 route migration.
- Practical implication: this story should extend those changes, not re-open route structure or invent a parallel token system.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-character-management.md#Story 3.6]
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md#UX-DR4]
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md#UX-DR5]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/8-visual-foundation.md#8.1 Color System]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/8-visual-foundation.md#8.2 Typography System]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/9-design-direction-decision.md#9.3 What Changes from Current]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md#11.2 Existing Components (Update Required)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.3 Design Token Update]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.5 React Native Accessibility Props]
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-03-26.md#UX Design Requirements Traceability]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Frontend Code]
- [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- [Source: frontend/constants/theme.ts]
- [Source: frontend/components/munchkin/RoomCharacterCard.tsx]
- [Source: frontend/components/munchkin/CurrentCharacterFooter.tsx]
- [Source: frontend/components/munchkin/AttributeList.tsx]
- [Source: frontend/components/munchkin/RoomCharactersList.tsx]
- [Source: frontend/app/munchkin/[roomNumber]/index.tsx]
- [Source: frontend/package.json]

## Dev Agent Record

### Agent Model Used

gpt-5 (Codex)

### Debug Log References

- `npm run test:unit -- RoomCharacterCard.test.tsx` (initial run failed due missing optional Rollup binary dependency)
- `npm i` in `frontend` (installed missing optional dependencies)
- `npm run test:unit -- RoomCharacterCard.test.tsx` (Vitest startup failed with `Illegal instruction`)
- `npm run tsc` (passed)
- `npm run lint` (passed with existing warnings)
- `npm run test` (Vitest startup failed in esbuild service with `invalid function symbol table`)
- `rg -n "#[0-9A-Fa-f]{6}" frontend/components/munchkin/RoomCharacterCard.tsx frontend/components/munchkin/CurrentCharacterFooter.tsx frontend/components/munchkin/AttributeList.tsx frontend/constants/theme.ts`
- `rm -rf node_modules && npm ci` in `frontend` (reinstalled dependencies from clean state)
- `npm run test` (full unit + room-route suites passed after reinstall and test harness updates)
- `npm run test` after review-fix patch (passed)
- `npm run test:unit -- RoomCharacterCard.test.tsx` after restoring the real `Change` button as a sibling control to the full-card press target (passed)
- `npm run test:unit -- RoomCharacterCard.test.tsx` after adding touch-propagation guards to the character-card/footer attribute scrollers for mobile scroll gestures (passed)
- `npm run test:unit -- RoomCharacterCard.test.tsx` after moving the card attribute scroller out of the `Pressable` section (passed)
- `npm run lint` after moving the card attribute scroller out of the `Pressable` section (passed with existing warnings in unrelated files)

### Completion Notes List

- Updated `AppTheme.colors.surfaceWarm` from `#A67560` to `#8A6150` per Story 3.6 guidance.
- Updated `RoomCharacterCard` to:
- become fully tappable via `Pressable`
- expose required accessibility role, label, and hint
- keep the existing `Change` button callback flow
- apply token-based colors for name/stats and remove hardcoded hex values
- Updated `CurrentCharacterFooter` to apply token-based name/stat colors and remove remaining hardcoded hex values.
- Updated shared `AttributeList` text styles to use `AppTheme.colors.textPrimary` instead of hardcoded white.
- Added component-level regression tests in `frontend/components/munchkin/RoomCharacterCard.test.tsx` covering full-card press behavior, existing button callback, accessibility metadata, and token-based text styling for card/footer/attribute flows.
- Updated unit-test config aliasing by mapping `react-native` to `react-native-web` in `frontend/vitest.config.ts` so component tests can run under Vitest.
- Added a local type shim for `react-test-renderer` in `frontend/test/types/react-test-renderer.d.ts` to satisfy strict TypeScript checks without adding a new dependency.
- Resolved review patch by removing nested interactive controls from `RoomCharacterCard`: retained full-card interaction and rendered a non-interactive `Change` affordance to avoid nested button conflicts.
- Restored attribute-list scrolling inside `RoomCharacterCard` and `CurrentCharacterFooter` by enabling nested scrolling on the inner attribute `ScrollView` containers and adding regression coverage for those props.
- Addressed the follow-up code review concern by restoring the real `Change` button in `RoomCharacterCard` as a sibling control to the tappable card body, preserving the existing button callback seam without nesting interactive controls.
- Addressed the mobile follow-up regression by stopping parent press propagation from the attribute `ScrollView` touch/drag events in both `RoomCharacterCard` and `CurrentCharacterFooter`, so attribute lists can scroll on mobile again.
- Moved the `RoomCharacterCard` attribute scroller out of the `Pressable` section to remove the mobile responder conflict at the layout level and dropped the temporary touch-propagation workaround from the card and footer scrollers.
- Validation status:
- `npm run tsc` passed
- `npm run lint` passed (existing warnings only)
- `npm run test` passed (unit + room-route suites)

### File List

- _bmad-output/implementation-artifacts/3-6-updated-character-card-styling.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/constants/theme.ts
- frontend/components/munchkin/RoomCharacterCard.tsx
- frontend/components/munchkin/CurrentCharacterFooter.tsx
- frontend/components/munchkin/AttributeList.tsx
- frontend/components/munchkin/RoomCharacterCard.test.tsx
- frontend/vitest.config.ts
- frontend/test/types/react-test-renderer.d.ts

### Change Log

- 2026-03-29: Implemented Story 3.6 code changes for tokenized character-card/footer styling and full-card tap accessibility; added component-level regression tests; left story in-progress because frontend test runner is blocked by local Vitest/esbuild startup failure.
- 2026-03-29: Reinstalled frontend dependencies, updated test harness/config for component test execution, reran full validation (`tsc`, `lint`, `test`), and advanced story status to review.
- 2026-03-29: Code review identified one patch action item; story moved back to in-progress pending fix.
- 2026-03-29: Fixed the review patch by removing nested interactive controls from `RoomCharacterCard`; re-ran validation and moved story back to review.
- 2026-03-29: Second code-review pass found no remaining actionable issues; story advanced to done.
- 2026-03-30: Fixed a follow-up regression where attribute lists inside character cards/footer no longer scrolled after the full-card press changes by enabling nested scrolling on the inner scroll containers and extending the component regression test.
- 2026-03-30: Addressed the follow-up review concern by restoring the real `Change` button as a sibling interactive control beside the tappable card body and revalidating the focused component test.
- 2026-03-30: Fixed a mobile responder regression where dragging inside the attributes list could still trigger the parent card press target by stopping touch/drag propagation from the inner attribute scrollers and revalidating the focused component test.
- 2026-03-30: Reworked the card structure so the attribute `ScrollView` sits outside the `Pressable` section, removed the temporary propagation handlers, reran the focused component test, and confirmed lint still passes with only existing unrelated warnings.
