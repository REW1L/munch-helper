# Story 2.5: Room Code Copy-to-Clipboard via Header Button

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player inside a room,  
I want to tap a copy button next to the room code to copy it instantly,  
so that I can share the code with latecomers without manually selecting or retyping it.

## Acceptance Criteria

1. **Given** I am inside an active room  
   **When** I view Room View in any state (empty, pre-game, or in-game)  
   **Then** the room code and inline copy button are visible in Room View `Stack.Screen` header options (same visual layer as the title)  
   **And** the room "label" (e.g. "Room") is styled with the `labelMd` token  
   **And** the room code is styled with `accent` color and remains available regardless of room content state  
   **And** the button is accessible: `accessibilityLabel="Copy room code [code]"`, `accessibilityRole="button"`
2. **Given** I tap the copy button  
   **When** the tap is registered  
   **Then** the room code is copied to the device clipboard via `expo-clipboard`  
   **And** the button label changes to "Copied ✓" for 1500ms then resets — no toast
3. **Given** I am using a screen reader  
   **When** I focus the copy button  
   **Then** the accessibility label announces the full room code

## Tasks / Subtasks

- [x] Implement header-layer copy affordance in Room View (AC: 1, 2, 3)
- [x] Update `Stack.Screen` options in `frontend/app/munchkin/[roomNumber].tsx`
- [x] Keep room code and copy button in the header (same visual layer)
- [x] Use `AppTheme` color tokens (`elevated`, `accent`, text tokens) where available
- [x] Set `accessibilityRole="button"` and dynamic `accessibilityLabel` including full room code
- [x] Implement copy flow with `Clipboard.setStringAsync(code)` and local copied state
- [x] Implement 1500ms copied-state reset with cleanup on unmount (timer-safe)
- [x] Ensure header-based copy control remains available for empty/loading/loaded room states
- [x] Add tests (AC: 2, 3)
- [x] Add/extend room screen tests with fake timers + mocked `expo-clipboard`
- [x] Verify copy API called with current room code and copied label resets after 1500ms
- [x] Verify accessibility label includes full room code

## Dev Notes

### Story Foundation

- Epic context: Epic 2 focuses on room creation/join/re-entry/shareability. Story 2.5 is the final Epic 2 story and directly covers room-code sharing UX (`UX-DR3`).
- Business value: reduce friction in late-join flows by replacing manual code transcription with one-tap copy.
- Dependency note: planning artifacts indicate a historical dependency on Story 3.1 token migration. Since Story 3.1 is currently `backlog`, this story should use existing `AppTheme` tokens already present in repo and avoid introducing new token contracts as a hidden prerequisite.

### Existing Codebase Intelligence (Do Not Reinvent)

- Room View route already exists at `frontend/app/munchkin/[roomNumber].tsx` and already owns room-level composition and safe-area handling.
- Character list rendering is isolated in `frontend/components/munchkin/RoomCharactersList.tsx`; keep copy behavior in the navigation header so list logic remains untouched.
- `expo-clipboard` is already installed in `frontend/package.json` (`~55.0.8`), so no dependency changes are needed.
- Existing theme tokens are in `frontend/constants/theme.ts` (`AppTheme.colors.accent`, `elevated`, `textPrimary`, `textMuted`; spacing/radius tokens available).

### Architecture Compliance Requirements

- Preserve frontend boundaries: route composes screen, component remains presentational, no API transport logic in UI component.
- Keep Room View as the place that wires room context (`roomNumber`) to child components.
- Keep edits scoped: no unrelated route migrations (`[roomNumber].tsx` -> directory route) as part of this story.
- No toast feedback for copy action; use inline button-state transition only.

### UX Compliance Requirements

- Room code and copy control must remain in `Stack.Screen` header options (same visual layer as title).
- Room code text uses accent styling and remains immediately visible.
- Copy interaction feedback pattern: `Copy` -> `Copied ✓` -> reset after 1500ms, no toast/modal.
- Accessibility:
- Copy control must expose `accessibilityRole="button"`.
- `accessibilityLabel` must include full code: `Copy room code [code]`.

### File Structure Requirements

- Modified file: `frontend/app/munchkin/[roomNumber].tsx`
- Optional test update: Room screen/header behavior tests
- Keep naming and co-location conventions already used in frontend (`PascalCase` component files, `*.test.tsx` nearby tests).

### Testing Requirements

- Add unit/component tests for copy interaction and timer reset behavior.
- Use deterministic fake timers for 1500ms state transition.
- Mock clipboard boundary (`expo-clipboard`) rather than stubbing component internals.
- Keep frontend test stack conventions (Vitest + Testing Library + jsdom).
- Run at least:
- `cd frontend && npm run test`
- `cd frontend && npm run tsc`

### Previous Story Intelligence

- No prior story file for `2.4` was found in `_bmad-output/implementation-artifacts`; rely on current code patterns in Room View and character list composition.
- Story 2.4 completion status in sprint tracking indicates room re-entry behavior is stable; Story 2.5 must not alter join/re-entry logic.

### Git Intelligence Summary

- Recent file history for Room View/list components is centered around character management and performance/readability refactors.
- Practical implication: keep this change additive and UI-focused; do not reshape room data or hook contracts.

### Latest Technical Information (Web-Verified)

- Expo Clipboard latest docs show bundled `expo-clipboard` around SDK 55 and confirm `setStringAsync(text, options)` for clipboard writes.
- Expo docs note platform differences on web clipboard permissions/behavior; implementation should avoid assuming identical UX semantics across web vs native.
- React Native accessibility guidance confirms explicit `accessibilityLabel` and `accessibilityRole` for touch targets improves VoiceOver/TalkBack output.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-2-room-management.md#story-25-room-code-copy-to-clipboard-via-header-button-todo]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md#114-new-reusable-components]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md#122-feedback-patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#135-react-native-accessibility-props]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#implementation-sequence]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#frontend-code]
- [Source: _bmad-output/project-context.md#critical-implementation-rules]
- [Source: frontend/app/munchkin/[roomNumber].tsx]
- [Source: frontend/components/munchkin/RoomCharactersList.tsx]
- [Source: frontend/constants/theme.ts]
- [Source: frontend/package.json]
- [Source: https://docs.expo.dev/versions/latest/sdk/clipboard/]
- [Source: https://reactnative.dev/docs/accessibility]

## Dev Agent Record

### Agent Model Used

gpt-5 (Codex)

### Debug Log References

- Story created from `bmad-create-story` workflow using planning artifacts + codebase inspection.

### Completion Notes List

- Added header-level room code title + inline copy button in `Stack.Screen` options for `frontend/app/munchkin/[roomNumber].tsx`.
- Implemented copy interaction with `expo-clipboard` via `useRoomCodeClipboard`, with `Copy` -> `Copied ✓` 1500ms reset and unmount timer cleanup.
- Added accessibility support: `accessibilityRole="button"` and `accessibilityLabel="Copy room code [code]"`.
- Added deterministic tests in `frontend/hooks/useRoomCodeClipboard.test.ts` validating copy API call, reset timing, accessibility label, and timer cleanup.
- Updated header title composition to split `Room` label from room code and applied `AppTheme.typography.caption` token to the label.
- Added `AppTheme.typography.caption` token in theme constants for caption-style usage.
- Validation run results:
- `cd frontend && npm run test` passed (10 files, 43 tests).
- `cd frontend && npm run tsc` passed.
- Story status set to `review`.
- Sprint tracking updated for story `2-5-room-code-copy-to-clipboard-via-header-button`: `ready-for-dev` -> `in-progress` -> `review`.
- Addressed reviewer race condition in `useRoomCodeClipboard`: stale async clipboard completions no longer set copied state or schedule reset after `roomCode` changes.
- Added regression test to ensure pending copy for previous room code is ignored after rerender with a new code.
- Updated `roomCodeRef` synchronization to occur during render so copy action always uses current render's room code (no post-render `useEffect` window).
- Added regression test for rerendered room code ensuring clipboard receives latest code immediately after room-code change.
- Fixed StrictMode resilience in `useRoomCodeClipboard` by setting `isMountedRef.current = true` on effect setup and `false` on cleanup.
- Added regression test mounting hook under `React.StrictMode` to verify copied-state updates still occur.
- Kept `useRoomCodeClipboard` accessibility label stable as `Copy room code [code]` during the temporary copied state to match AC1/AC3.
- Added room-route integration coverage in `frontend/__tests__/app/munchkin/[roomNumber].test.tsx` to verify the header title wiring, copy-button accessibility label, clipboard call, and 1500ms reset behavior.
- Updated frontend Vitest resolution to map `react-native` to `react-native-web` so route-level jsdom tests can execute.
- Re-ran validation after review fixes:
- `cd frontend && npm run test` passed (11 files, 50 tests).
- `cd frontend && npm run tsc -- --noEmit` passed.
- Scoped the `react-native` -> `react-native-web` alias to a dedicated route-test Vitest config so the main frontend suite no longer rewrites `react-native` resolution globally.
- Tightened frontend Vitest discovery to exclude `node_modules/**`, preventing dependency test suites from being executed by the app test command.
- Re-ran validation after test-config follow-up:
- `cd frontend && npm run test` passed (11 files, 50 tests across unit + route suites).
- `cd frontend && npm run tsc -- --noEmit` passed.
- Corrected sprint tracking metadata so `_bmad-output/implementation-artifacts/sprint-status.yaml` advances `last_updated` instead of regressing it during review follow-up edits.
- Replaced the route-level header regression test's deprecated `react-test-renderer` usage with `@testing-library/react` while keeping the dedicated route-test Vitest config.
- Removed the temporary `frontend/test/react-test-renderer.d.ts` shim because the route test no longer depends on `react-test-renderer`.
- Re-ran validation after removing deprecated test infrastructure:
- `cd frontend && npm run test` passed (11 files, 50 tests across unit + route suites).
- `cd frontend && npm run tsc --noEmit` passed.
- Updated repository and frontend README testing guidance so the split `test`, `test:unit`, `test:room-route`, and `test:watch` behavior matches the current frontend scripts.
- Re-corrected `_bmad-output/implementation-artifacts/sprint-status.yaml` `last_updated` metadata to a monotonic review-follow-up timestamp after the prior follow-up edit regressed it.
- Escaped literal bracket segments in room-route Vitest include/exclude patterns so `test:room-route` selects the intended file and unit/watch excludes remain reliable.
- Corrected story artifact references so the documented route test path matches `frontend/__tests__/app/munchkin/[roomNumber].test.tsx`.
- Generalized route-suite Vitest include/exclude patterns from a single hard-coded file to `frontend/__tests__/app/**/*.test.tsx` so future route tests are automatically covered by the dedicated suite.
- Added route-level regression coverage for missing `roomNumber` params, asserting the header copy button is disabled and clipboard writes are not attempted.
- Re-ran validation after review follow-up fixes:
- `cd frontend && npm run test` passed (11 files, 51 tests across unit + route suites).
- `cd frontend && npm run tsc -- --noEmit` passed.
- Expanded route-suite Vitest globs to `frontend/__tests__/app/**/*.test.{ts,tsx}` so both `.test.ts` and `.test.tsx` route tests are covered consistently by route/unit/watch split configs.
- Added empty-room-code accessibility fallback in `useRoomCodeClipboard` so the disabled copy control exposes `Copy room code` instead of a trailing empty-value label.
- Added hook-level regression coverage for empty room-code accessibility label fallback.
- Re-ran validation after follow-up accessibility + test-glob fixes:
- `cd frontend && npm run test` passed (11 files, 52 tests across unit + route suites).
- `cd frontend && npm run tsc -- --noEmit` passed.
- Updated `frontend/package.json` `test:watch` route-test exclusion to use double-quoted glob syntax for better cross-shell portability.
- Re-ran validation after test:watch quoting fix:
- `cd frontend && npm run test` passed (11 files, 52 tests across unit + route suites).
- `cd frontend && npm run tsc -- --noEmit` passed.

### File List

- frontend/__tests__/app/munchkin/[roomNumber].test.tsx
- frontend/app/munchkin/[roomNumber].tsx
- frontend/constants/theme.ts
- frontend/hooks/useRoomCodeClipboard.ts
- frontend/hooks/useRoomCodeClipboard.test.ts
- frontend/vitest.config.ts
- frontend/vitest.room-route.config.ts
- frontend/package.json
- frontend/README.md
- README.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/2-5-room-code-copy-to-clipboard-via-header-button.md

## Change Log

- 2026-03-26: Implemented room header copy-to-clipboard flow with accessibility + timer-safe copied-state reset; added hook-level tests; moved story to review.
- 2026-03-26: Updated acceptance criteria from Epic 2 source (`epic-2-room-management.md`) to reflect latest header styling and visibility requirements.
- 2026-03-26: Re-ran `dev-story` for Story 2.5 and aligned implementation with updated AC by applying `caption` token styling to room label in the header.
- 2026-03-26: Resolved review feedback for stale clipboard async race when `roomCode` changes before `setStringAsync` resolves; added regression test coverage.
- 2026-03-26: Resolved review feedback for `roomCodeRef` timing window by synchronizing ref during render and extending hook tests for latest-code copy behavior after rerender.
- 2026-03-27: Resolved StrictMode mount/cleanup remount issue by reinitializing `isMountedRef` in effect setup; added StrictMode regression test.
- 2026-03-27: Resolved review findings by fixing the copied-state accessibility label contract and adding route-level header integration coverage for `[roomNumber].tsx`.
- 2026-03-27: Narrowed route-test `react-native` aliasing to a dedicated Vitest config and excluded `node_modules/**` from frontend test discovery so `npm run test` validates only project suites.
- 2026-03-27: Corrected `sprint-status.yaml` metadata so `last_updated` reflects the latest review follow-up change instead of moving backward.
- 2026-03-27: Replaced deprecated `react-test-renderer` usage in the route-level header regression test with `@testing-library/react` and removed the temporary shim file.
- 2026-03-27: Updated frontend testing documentation for the split unit/route scripts and fixed the regressed `sprint-status.yaml` timestamp metadata.
- 2026-03-27: Fixed room-route test glob escaping for literal bracket filenames and aligned story artifact test-path references with `frontend/__tests__/app/munchkin/[roomNumber].test.tsx`.
- 2026-03-27: Generalized route-suite test globs to `frontend/__tests__/app/**/*.test.tsx` and added missing-room-code route regression coverage for disabled copy behavior.
- 2026-03-27: Expanded route-suite globs to include `.test.ts` files and added empty-room-code accessibility label fallback with regression coverage.
- 2026-03-27: Switched `test:watch` exclusion glob quoting to double quotes for cross-shell compatibility.
- 2026-03-27: Story verified after repeated code-review passes with no actionable findings; status moved from `review` to `done`.
