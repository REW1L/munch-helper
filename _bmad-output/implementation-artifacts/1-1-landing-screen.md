# Story 1.1: Landing Screen

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new or returning user,
I want to land on a screen that clearly explains what Munch Helper is and gives me a single button to enter the app,
so that I immediately understand the app's purpose and know how to proceed.

## Acceptance Criteria

1. Given I open the app, when the landing screen loads, then I see the app name, a short description of its purpose, and a prominent "Rooms" button.
2. Given I open the app, when the landing screen loads, then Privacy and Support links are accessible from the landing screen.
3. Given I open the app, when the landing screen loads, then an App Store (iOS) link is accessible at the bottom of the landing screen, appears as a standard store link, and opens `https://apps.apple.com/us/app/munch-helper/id6760627502`.
4. Given I open the app, when the landing screen loads, then a Google Play (Android) link is visible at the bottom of the landing screen with standard store-link styling, is disabled for now, and includes a visible `soon` label.
5. Given I tap "Rooms", when navigation executes, then I am taken to the rooms view.

## Tasks / Subtasks

- [ ] Implement store links on landing screen (AC: 3, 4)
- [ ] Add iOS App Store link action in `frontend/app/index.tsx` using `Linking.openURL(...)` and URL `https://apps.apple.com/us/app/munch-helper/id6760627502`.
- [ ] Render Google Play store link UI in `frontend/app/index.tsx` as disabled/non-interactive for now with a visible `soon` label.
- [ ] Keep existing Privacy and Support actions unchanged and still accessible (AC: 2).
- [ ] Place App Store and Google Play links at the bottom area of the landing screen (AC: 3, 4).
- [ ] Render App Store and Google Play links with standard store-link presentation (AC: 3, 4).
- [ ] Preserve current Rooms button behavior and route to `/rooms` (AC: 1, 5).
- [ ] Decide stable source for store URLs (constant in file or config module) and avoid duplicated literals (AC: 2).
- [ ] Add/extend tests for landing screen interactions (AC: 1, 2, 3, 4, 5)
- [ ] Add a UI test that verifies landing screen renders title/description/Rooms.
- [ ] Add a UI test that verifies Privacy and Support actions are present and tappable.
- [ ] Add a UI test that verifies App Store link is present at the bottom and opens the configured iOS URL.
- [ ] Add a UI test that verifies Google Play link is present at the bottom with disabled behavior (no navigation / openURL call) and visible `soon` label text.
- [ ] Add a UI test that verifies tapping Rooms navigates to `/rooms`.

## Dev Notes

- Story source is Epic 1, Story 1.1 and was reopened because acceptance criteria now include App Store and Google Play links.
- Current landing implementation exists in `frontend/app/index.tsx` and already contains Privacy, Support, and Rooms actions; this story extends that screen.
- Use React Native `Linking` for outbound external URLs. Keep navigation via Expo Router for in-app routes.
- App Store URL for this story is fixed: `https://apps.apple.com/us/app/munch-helper/id6760627502`.
- Google Play URL is intentionally not active yet; render disabled state for Play link.
- Keep this change scoped to landing experience; do not modify room or identity flows covered by Stories 1.2 and 1.3.

### Technical Requirements

- Keep route entry screen at `/` in `frontend/app/index.tsx`.
- Keep in-app navigation using `router.navigate('/rooms')` for Rooms.
- Keep privacy/support in-app routes (`/privacy`, `/support`) intact.
- External links must open via platform-safe URL handling and fail gracefully if URL cannot be opened.
- App Store link must use URL `https://apps.apple.com/us/app/munch-helper/id6760627502`.
- Google Play link must be rendered but disabled (non-interactive) until Play release is available and include a visible `soon` label.
- App Store and Google Play links must be visually and positionally separated from top utility links and rendered at the bottom area of the screen.
- Store links should use recognizable, standard store-link treatment (clear App Store / Google Play labeling and conventional link/button affordance), including a clear disabled affordance and visible `soon` label for Play.
- Preserve current visual hierarchy: landing message + prominent Rooms action remains primary CTA.

### Architecture Compliance

- Follow frontend route-driven composition under `frontend/app/`.
- Do not introduce a new HTTP client or unrelated abstractions for this story.
- Keep code changes minimal and localized to landing page unless tests require additional harness updates.

### Library / Framework Requirements

- Expo Router for internal navigation.
- React Native APIs (`TouchableOpacity`, `Text`, `View`, `Linking`).
- Existing testing stack: Vitest + Testing Library (per frontend architecture docs).

### File Structure Requirements

- Primary implementation file: `frontend/app/index.tsx`.
- Potential new/updated tests under `frontend/__tests__/app/` following existing test conventions.
- Avoid creating duplicate landing screen components unless there is a clear reuse need.

### Testing Requirements

- Add or update test coverage for:
- Landing render content (title/description/Rooms).
- Presence and tap behavior for Privacy, Support, App Store controls.
- Disabled state behavior for Google Play control, including visible `soon` label.
- Rooms navigation event to `/rooms`.
- Ensure no regression in existing room-entry flow (FR1, FR4, FR5 alignment).

### Project Structure Notes

- This story is a frontend-only change in the Expo Router app.
- No backend, infrastructure, or schema changes are required.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-1-player-identity-onboarding.md#story-11-landing-screen]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#user-identity-session-entry]
- [Source: docs/architecture-frontend.md#route-overview]
- [Source: docs/source-tree-analysis.md#frontend-critical-folders]
- [Source: frontend/app/index.tsx]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

- Re-opened Story 1.1 after AC update for app store links.
- No previous story intelligence required because this is story 1 of epic 1.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story status set to `ready-for-dev` for implementation handoff.

### File List

- _bmad-output/implementation-artifacts/1-1-landing-screen.md
