# Story 3.2: Room View Routing Migration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want `app/munchkin/[roomNumber].tsx` migrated to `app/munchkin/[roomNumber]/index.tsx`,
so that Battle View and Log View can be added as nested Expo Router routes.

## Acceptance Criteria

1. **Given** the current flat route `app/munchkin/[roomNumber].tsx`
   **When** the migration is complete
   **Then** the Room View is served from `app/munchkin/[roomNumber]/index.tsx` with identical behaviour.

2. **Given** all existing navigation that targets the room route
   **When** the migration is complete
   **Then** navigation to `/munchkin/[roomNumber]` continues to work without caller changes.

3. **Given** future Battle View and Log View work in Epics 5 and 6
   **When** the migration is complete
   **Then** nested routes can be added under `app/munchkin/[roomNumber]/battle/` and `app/munchkin/[roomNumber]/log.tsx` without restructuring the Room View again.

## Tasks / Subtasks

- [x] Task 1: Migrate the Room View route file into a directory route without changing runtime behaviour (AC: #1, #2)
  - [x] Create `frontend/app/munchkin/[roomNumber]/`
  - [x] Move the current implementation from `frontend/app/munchkin/[roomNumber].tsx` to `frontend/app/munchkin/[roomNumber]/index.tsx`
  - [x] Delete the old flat route file after the new directory route is in place
  - [x] Keep the exported component, header configuration, modal wiring, room-code copy flow, placeholder Battle/Log buttons, and Safe Area behaviour identical unless required for the move

- [x] Task 2: Preserve route contract and navigation compatibility (AC: #1, #2)
  - [x] Verify existing callers that navigate or dismiss to `/munchkin/${roomId}` still resolve to the migrated Room View without changes
  - [x] Do not change route params, route names, or any `router.dismissTo(...)` / `router.navigate(...)` call sites unless a compile-time import path requires it
  - [x] Confirm `useLocalSearchParams<{ roomNumber: string }>()` continues to resolve the same param value inside the new route file

- [x] Task 3: Update affected test imports and route-adjacent references (AC: #1, #2)
  - [x] Update `frontend/__tests__/app/munchkin/[roomNumber].test.tsx` to import the migrated route module from `app/munchkin/[roomNumber]/index`
  - [x] Update any mocks that reference the old flat route path if they break after the file move
  - [x] Search for any remaining source imports or test references to `app/munchkin/[roomNumber].tsx` and remove stale paths

- [x] Task 4: Leave explicit expansion room for future nested screens (AC: #3)
  - [x] Ensure the final structure is compatible with adding `frontend/app/munchkin/[roomNumber]/battle/` and `frontend/app/munchkin/[roomNumber]/log.tsx`
  - [x] Do not implement Battle View or Log View in this story
  - [x] Do not introduce new navigation UI or route groups unless strictly needed for the migration

- [x] Task 5: Run regression checks for the migrated route (AC: #1, #2, #3)
  - [x] `cd frontend && npm run tsc`
  - [x] `cd frontend && npm run lint`
  - [x] `cd frontend && npm run test:room-route`
  - [x] If the route test suite is insufficient after the move, add the smallest necessary regression coverage outside `frontend/app`

## Dev Notes

### Story Scope Summary

- This is a prerequisite refactor, not a feature expansion.
- The room route URL must remain `/munchkin/[roomNumber]`; only the file-system representation changes.
- The move is required before future nested room routes can exist under the same dynamic segment.

### Current Implementation Baseline

- The current Room View lives in `frontend/app/munchkin/[roomNumber].tsx`.
- It already owns:
  - `Stack.Screen` header title rendering with room code + copy button
  - `useLocalSearchParams<{ roomNumber: string }>()`
  - `useRoomCharacters(...)` orchestration
  - `CreateCharacterModal` and `ChangeCharacterModal`
  - placeholder hidden Battle/Log buttons
  - `CurrentCharacterFooter` rendering
- Behavioural parity means all of the above still works after the file move.

### Architecture Guardrails

- Keep Expo Router conventions intact: route behavior is defined by file structure, and every file under `frontend/app` must remain a route or layout file only.
- The architecture explicitly defines this migration as the prerequisite structure for later room enhancements.
- The target structure for this story is:

```text
frontend/app/munchkin/
  [roomNumber]/
    index.tsx
```

- Do not add shared non-route helper files under `frontend/app/munchkin/[roomNumber]/`; keep route-only discipline.
- Keep the current root stack/provider setup unchanged in `frontend/app/_layout.tsx`.

### Expo Router Routing Requirement

- Expo Router treats `index.tsx` as the route for its parent directory, so `app/munchkin/[roomNumber]/index.tsx` still maps to `/munchkin/[roomNumber]`.
- This is why existing callers like `router.dismissTo(\`/munchkin/${roomId}\`)` in `frontend/app/munchkin/index.tsx` should continue to work without API changes.
- The story should preserve the current URL contract while unlocking nested children beneath `[roomNumber]/`.

### File Structure Requirements

- Create:
  - `frontend/app/munchkin/[roomNumber]/index.tsx`
- Delete:
  - `frontend/app/munchkin/[roomNumber].tsx`
- Update:
  - `frontend/__tests__/app/munchkin/[roomNumber].test.tsx`
- Search the frontend for stale path references after the move; test imports are the most likely breakage point because the route component is imported directly in tests.

### Testing Requirements

- Keep tests outside `frontend/app`; Expo Router route tests belong under `frontend/__tests__`.
- The existing focused regression suite is `frontend/__tests__/app/munchkin/[roomNumber].test.tsx`.
- Minimum expected regression coverage after migration:
  - header title still renders `Room` and the room code
  - copy button accessibility label stays stable
  - copied label still resets after 1500ms
  - copy button remains disabled when `roomNumber` is missing
- Run the room-route suite even if unit tests are unchanged; this story primarily risks path-resolution regressions.

### UX Constraints To Preserve

- Room View remains the primary destination; this migration must not introduce deeper navigation for existing room interactions.
- Battle and Log remain future stack-push screens from Room View; do not implement them here.
- Existing placeholder Battle/Log buttons in the Room View should remain behaviourally unchanged unless the file move requires minimal mechanical edits only.

### Previous Story Intelligence

- Story 3.1 established `AppTheme` token migration in the current room route file and verified room-route regressions separately.
- Do not undo the tokenized styles already present in the current Room View.
- The previous story used `frontend` package quality gates successfully:
  - `npm run tsc`
  - `npm run lint`
  - `npm run test`
- For this story, `npm run test:room-route` is the highest-signal regression suite, but typecheck and lint should still stay green.

### Git Intelligence Summary

- Recent relevant commit: `03ae54a feat: migrate app theme tokens for story 3.1 (#7)`
- That commit touched `frontend/app/munchkin/[roomNumber].tsx`, so this story should treat the current file as the new source of truth and move it intact before making any other changes.
- No unrelated worktree changes were present when this story context was created.

### Latest Technical Information

- Current frontend dependency set in this repo is Expo 55 with `expo-router` `~55.0.0`; keep the migration aligned to existing project versions and do not upgrade routing dependencies in this story.
- Official Expo documentation confirms that nested directories with `index.tsx` map to the parent path segment, which is the key mechanism this migration relies on.
- Inference from the docs and current dependency set: the safest implementation is a pure filesystem move plus import/test path updates, not a navigation API rewrite.

### Project Structure Notes

- This story intentionally changes route file placement but not route ownership boundaries:
  - `frontend/app` remains route composition only
  - hooks stay in `frontend/hooks`
  - components stay in `frontend/components`
- If a helper becomes necessary during the move, place it outside `frontend/app` unless it is itself a route file.
- There is a forward-looking architecture mismatch to note:
  - `project-structure-boundaries.md` names `app/munchkin/[roomNumber]/(battle)/index.tsx`
  - `epic-3-character-management.md` acceptance criteria describe future nested `battle/` and `log/`
  - For this story, do not resolve that future naming discrepancy by guessing; only create the `[roomNumber]/index.tsx` prerequisite and leave future child-route specifics to their own stories.

### References

- Epic 3 story definition: [Source: _bmad-output/planning-artifacts/epics/epic-3-character-management.md#Story 3.2]
- Architecture route prerequisite: [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Frontend File Structure (new additions)]
- Architecture file boundary: [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md#New Frontend Files]
- Frontend route-only rule and stack/provider constraints: [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Frontend testing rules: [Source: _bmad-output/project-context.md#Testing Rules]
- UX navigation pattern: [Source: _bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md#12.5 Navigation Patterns]
- UX component roadmap: [Source: _bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md#11.3 New Screens]
- Current route implementation baseline: [Source: frontend/app/munchkin/[roomNumber].tsx]
- Existing route regression suite: [Source: frontend/__tests__/app/munchkin/[roomNumber].test.tsx]
- Existing room-session navigation caller: [Source: frontend/app/munchkin/index.tsx]
- Expo Router file-based routing: [Source: https://docs.expo.dev/develop/file-based-routing]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

- `git log --oneline -5`
- `sed -n '1,260p' 'frontend/app/munchkin/[roomNumber].tsx'`
- `sed -n '1,240p' 'frontend/__tests__/app/munchkin/[roomNumber].test.tsx'`

### Completion Notes List

- Migrated the room route from `frontend/app/munchkin/[roomNumber].tsx` to `frontend/app/munchkin/[roomNumber]/index.tsx` without changing route params or navigation call sites
- Updated the room route regression test to import the migrated directory route and verified no stale frontend references to the flat route path remain
- Verified `npm run tsc`, `npm run lint`, and `npm run test:room-route`; lint still reports unrelated pre-existing warnings outside this story

### File List

- `_bmad-output/implementation-artifacts/3-2-room-view-routing-migration.md`
- `frontend/__tests__/app/munchkin/[roomNumber].test.tsx`
- `frontend/app/munchkin/[roomNumber]/index.tsx`
- `frontend/app/munchkin/[roomNumber].tsx`
