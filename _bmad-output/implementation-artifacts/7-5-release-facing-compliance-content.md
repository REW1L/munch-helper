# Story 7.5: Release-Facing Compliance Content

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the privacy and support pages to reflect the current app behavior and support path,
So that I can trust the published release information and stores can review the app accurately.

## Acceptance Criteria

1. **Given** I open the privacy page from the app or its public URL
   **When** the page loads
   **Then** it reflects the current app scope including anonymous identity (auto-generated player profile with no sign-up, email, or password), session data (locally persisted player profile and server-stored profile/character/room/battle/log state), and room participation behavior (real-time multiplayer visibility to other players in the same room)

2. **Given** I open the privacy page on the smallest supported phone size (iPhone SE, 375pt) up through the largest (430pt) on both iOS and Android
   **When** the page loads and I scroll through it
   **Then** all sections are fully readable, all text fits without horizontal scroll, and the contact information remains visible

3. **Given** the iOS App Store or Google Play submission requires a privacy URL
   **When** the submission references `https://helpamunch.click/privacy`
   **Then** that URL serves the privacy page on the deployed web build and continues to do so across releases (the route is preserved as a stable, expo-router-managed path)

4. **Given** I open the support page from the app or its public URL
   **When** the page loads
   **Then** it reflects the current app's feature set (rooms, characters, battles, room history) and provides a clear support path users can act on for the current release (a working contact channel users can reach without additional accounts)

5. **Given** I open the support page on the smallest supported phone size (375pt) up through the largest (430pt) on both iOS and Android
   **When** the page loads
   **Then** all content is readable and the support contact is tappable without truncation

6. **Given** the privacy or support content is edited
   **When** the change lands
   **Then** the effective/last-updated date shown on the privacy page is updated to reflect the change and remains the source of truth for the published policy version

## Tasks / Subtasks

- [ ] Task 1: Update `frontend/app/privacy.tsx` so privacy content reflects current app scope (AC: 1, 6)
  - [ ] In the "Overview" section, state explicitly that Munch Helper does not require sign-up, account creation, email, password, or any third-party identity provider
  - [ ] In the "Information We Process" section, ensure the listed profile fields match the current schema: nickname, avatar selection (from a fixed local image set), and a server-assigned user identifier
  - [ ] In the "Information We Process" section, ensure character fields match the current backend contract: name, avatar, color, level, power, class, race, gender (see `frontend/api/characters.ts` `ApiCharacter`)
  - [ ] Add or update a section that explicitly describes room participation behavior: when a user joins a room they become visible to other room participants (nickname, avatar, character details), and room/battle/log state is shared in real time within that room
  - [ ] Add or update a section that explicitly describes session data: the user profile is persisted locally via `AsyncStorage` under the `user` key for session restore between launches, and is also stored server-side to allow rejoining rooms; characters, battles, and room history are stored server-side
  - [ ] Confirm the "Children" section still reflects current product positioning (no children-directed features); update wording if anything has changed
  - [ ] State explicitly that the app does not include third-party advertising, analytics, or tracking SDKs (only if accurate — verify against `frontend/package.json` before stating it)
  - [ ] Update the `EFFECTIVE_DATE` constant to the date of this change

- [ ] Task 2: Update `frontend/app/support.tsx` so support content reflects current app features and a clear support path (AC: 4)
  - [ ] Update the description text to acknowledge the current feature scope (rooms, characters, battles, room history) so users know what the support channel covers
  - [ ] Keep the contact channel actionable: the `mailto:` link must continue to open the user's mail client via `Linking.openURL`, and the address must be selectable/visible as plain text on web where `mailto:` may not auto-trigger
  - [ ] Verify the support email value matches the email referenced on the privacy page (single source of truth — if both need to change later, they change together)
  - [ ] Do not introduce new dependencies (e.g., do not pull in a form library or external contact widget for this story)

- [ ] Task 3: Verify responsive and accessible rendering on supported phone sizes (AC: 2, 5)
  - [ ] Run the frontend dev build on iPhone SE 375pt and a standard 390–414pt simulator, scroll through both pages, and confirm no horizontal scroll, no clipped sections, and no text overflow
  - [ ] Run the frontend dev build on a Pixel-class Android simulator and repeat the same checks
  - [ ] Confirm `SafeAreaView` `edges` configuration on both pages still avoids double-inset compounding (current code: `[]` on iOS, all edges on Android — preserve this)
  - [ ] Confirm `accessibilityRole` / `accessibilityLabel` props are set on tappable elements (the support email button must announce as a button with the email address; the privacy page is read-only and does not require role props beyond default text semantics)
  - [ ] Verify text contrast against the dark `#3C3636` background remains at or above the existing WCAG AA baseline (gold title `#D4C26E` on `#3C3636` ≈ 5.8:1; white body `#FFF` on `#3C3636` ≈ 9.5:1 — see `ux-design-specification/13-responsive-design-accessibility.md`)

- [ ] Task 4: Confirm and document the stable public URLs for store submission (AC: 3)
  - [ ] Confirm that `frontend/app/privacy.tsx` and `frontend/app/support.tsx` remain at their current Expo Router file paths so the web build emits `/privacy` and `/support` routes (no renames, no parameterization)
  - [ ] Confirm the web export pipeline (`.github/workflows/frontend-infra-cd.yml` → `npm run export:web` → Pulumi deploy) continues to publish to `helpamunch.click`, making `https://helpamunch.click/privacy` and `https://helpamunch.click/support` the canonical store-submission URLs (no infrastructure change required by this story; only confirm the URLs render the deployed pages)
  - [ ] Record both URLs in `docs/deployment-guide.md` (or `docs/architecture-frontend.md` route overview if a more natural fit) under a clearly named "Store Submission URLs" subsection so the next iOS/Android submission has a single source of truth

- [ ] Task 5: Add coverage that prevents accidental URL or content regressions (AC: 1, 3, 4, 6)
  - [ ] Add `frontend/__tests__/app/privacy.test.tsx` that asserts: the title renders, the effective date constant is rendered into the page, the anonymous-identity statement is present, the room-participation statement is present, and the support email value matches the page's contact constant
  - [ ] Add `frontend/__tests__/app/support.test.tsx` that asserts: the title renders, the description references the current feature scope, the contact email is rendered, tapping the email triggers `Linking.openURL` with the correct `mailto:` URL, and the page does not depend on any non-mocked native modules (mirror the mocking pattern in `frontend/__tests__/app/index.test.tsx`)
  - [ ] Place both tests under `frontend/__tests__/app/` per project rule: route files under `frontend/app` must not contain test files

## Dev Notes

### Story Foundation

- This story does NOT create the privacy or support pages — they already exist and ship with the current app (`frontend/app/privacy.tsx` from commit `a8b7569`, `frontend/app/support.tsx` from commit `457664c`).
- The story's job is to (a) refresh the existing content so it matches what the app actually does today after Stories 1.x–6.x and 7.1–7.4 landed, and (b) lock in the public URLs as stable store-submission references.
- This is the final compliance-content gate that the iOS App Store (Story 7.3) and Google Play (Story 7.4) submissions depend on. Story 7.3 and 7.4 deliver the *pipelines* that ship the app; this story delivers the *content* the stores actually review.
- Treat both pages as user-facing legal/release artifacts: edits should be deliberate, scoped, and reviewed for accuracy against the current implementation, not aspirational or copy-pasted from generic templates.

### Current Implementation — What Exists Today

| File | What it does | Notes |
|---|---|---|
| `frontend/app/privacy.tsx` | Privacy Policy route, rendered on `/privacy`. Hard-coded `EFFECTIVE_DATE = 'March 17, 2026'` and `SUPPORT_EMAIL = 'ivan.danilov.work@gmail.com'`. 11 numbered `PolicySection` blocks plus a contact card. | Uses hardcoded colors (not AppTheme tokens) — preserve this within scope. Do NOT migrate to AppTheme tokens in this story; the rest of the page uses the same pattern and any migration belongs in a dedicated cleanup. |
| `frontend/app/support.tsx` | Support route, rendered on `/support`. Hard-coded `SUPPORT_EMAIL = 'ivan.danilov.work@gmail.com'`. One title + one description + one tappable mailto button. | Uses `Linking.openURL` for `mailto:`. Same color-pattern note as above. |
| `frontend/app/index.tsx` | Landing screen. Links to `/privacy` (top-left button) and `/support` (top-right button) via `router.navigate`. | These links are already covered by `frontend/__tests__/app/index.test.tsx` — do not regress those. |
| `infrastructure/index.ts` | Pulumi stack that serves the static web export from CloudFront at `customDomainName = "helpamunch.click"`. | This is the source of the stable `https://helpamunch.click/...` URLs. No infrastructure change needed for this story. |
| `.github/workflows/frontend-infra-cd.yml` | Pushes to `main` build `frontend/dist` via `npm run export:web` and deploy via Pulumi. | Privacy/support routes export as static HTML automatically because `frontend/app.json` sets `"web.output": "static"`. |
| `frontend/hooks/useUser.ts` | Auto-generates a `Player XXXXXX` profile when AsyncStorage is empty, calls `createUser`, persists under `user` key in AsyncStorage, and re-syncs with the backend on launch. | This is the **anonymous identity** behavior the privacy page must describe accurately. |
| `frontend/api/characters.ts` | Defines `ApiCharacter` with fields `id, roomId, userId, name, avatarId, color, level, power, class, race, gender`. | This is the **character data** the privacy page must list correctly. |

### What This Story Changes vs Preserves

- **Changes:** the text content of `privacy.tsx` (sections, effective date) and `support.tsx` (description text). Documentation under `docs/`. Adds two new test files under `frontend/__tests__/app/`.
- **Preserves:** the route paths (`/privacy`, `/support`), the page filenames, the landing-screen navigation, the existing color/style pattern in both pages, the existing `SafeAreaView` edge configuration, the support email value (do not change it — if it must change later, that is a separate coordinated update).

### Architecture Guardrails

- **Expo Router file-based routes:** `frontend/app/privacy.tsx` → `/privacy`, `frontend/app/support.tsx` → `/support`. Do not move or rename these files — the URL stability requirement (AC 3) depends on the filename.
- **No test files inside `frontend/app/`:** Per `_bmad-output/project-context.md` and the existing layout, every file under `frontend/app/` must be a route or layout. Place new tests under `frontend/__tests__/app/`. This matches the pattern set by `frontend/__tests__/app/index.test.tsx`.
- **Frontend test framework:** Vitest 4 in `jsdom`. Mock `expo-router`, `react-native-safe-area-context`, and `react-native` `Linking` / `Platform` as needed — the mocking pattern in `frontend/__tests__/app/index.test.tsx` is the reference implementation; follow it for the new tests.
- **Runtime config:** `frontend/config/runtime.ts` throws at module init when `EXPO_PUBLIC_API_URL` is missing in production. This affects the web export — if a privacy/support test imports the route module directly, mocks must avoid pulling that runtime in unless an `EXPO_PUBLIC_API_URL` is configured in the test environment (see how `index.test.tsx` handles it; replicate that approach).
- **Web export:** `frontend/app.json` sets `"web.output": "static"`. Static export means `/privacy` and `/support` ship as fully pre-rendered HTML, so stores can review the URLs without running JavaScript — preserve this by not introducing client-only data fetching on these pages.
- **Frontend layering:** Routes (`frontend/app/`) compose UI; they should not call API modules directly except via hooks. Privacy and support pages are pure presentation — keep them dependency-free apart from React Native primitives, `expo-router`, and (for support) `react-native` `Linking`.

### Compliance Content Guidance

- **Accuracy over breadth:** the privacy page must describe what the app actually does today. Do not list capabilities the app doesn't have (push notifications, ads, third-party tracking, payment data, location data, contacts access) — overstating data collection invites store-review rejections.
- **Anonymous identity language:** be explicit. "No sign-up, no email, no password, no account. The app generates a random in-game name (e.g., Player ABC123) and an avatar from a fixed set the first time you open it; you can change these from your profile." — this kind of plain language is what App Store and Play reviewers look for under their data-collection questionnaires.
- **Avatars are local images, not user uploads:** the avatar list comes from `frontend/constants/avatars.ts` (10 fixed bundled images). The app does not upload, store, or transmit user-provided images. Make sure the privacy text does not imply image upload.
- **Room data is shared, not public:** nickname, avatar, and character data become visible to other players **in the same room**. They are not public outside the room. The privacy text should not say "visible to other players" without scoping it to the room context.
- **Support path must be reachable without an account:** the current `mailto:` flow already satisfies this. Do not introduce a contact form behind a login.

### Previous Story Intelligence

- Story 7.3 (`7-3-automated-ios-delivery.md`) ships the iOS pipeline that submits to TestFlight. Its post-implementation note ("TestFlight crash-on-startup … `EXPO_PUBLIC_API_URL` … `__DEV__ = false`") confirms the production web/iOS builds run with the runtime config validator active. Any change that pulls config into the privacy/support routes will fail in production the same way — keep both pages config-free.
- Story 7.4 (`7-4-automated-android-delivery.md`) ships the Android pipeline that submits to the Play internal track. Both 7.3 and 7.4 expect the privacy URL to be available **before** their next submission; this story unblocks that.
- Story 7.2 (Web Availability Pipeline) is the reason `helpamunch.click` serves the latest `main` build. Trust that pipeline — this story does not need to change deployment.
- Story 3.1 (AppTheme Token Migration) moved app components to `AppTheme` tokens. The privacy/support pages were created **after** that migration but were not migrated then. Out of scope for this story — flag it as a follow-up if needed, but do not bundle the refactor here.

### Git Intelligence Summary

- The privacy page (`a8b7569`, 2026-03-17) and support page (`457664c`, 2026-03-16) were authored as standalone pre-store-submission additions, before Epic 7 formally existed. Treat their existing content as a starting draft, not the final compliance artifact.
- Recent epic-6 work (room history) and epic-5 work (battles) introduced server-stored event logs and battle records that the original privacy text predates. The "Information We Process" section currently does not mention battles or room history — update it.

### Latest Technical Information

- React Native 0.83 + Expo Router 55: file-based routing on web exports each route as its own HTML file via `expo-router/_html`. No special config is needed for `/privacy` and `/support` to be deep-linkable from store listings.
- `Linking.openURL('mailto:...')` is supported across iOS, Android, and web in Expo 55. On web, modern browsers will hand off to the user's default `mailto:` handler; if none is configured the browser typically prompts. This is acceptable behavior for the support path.
- `react-native-safe-area-context` 5.x: the `edges` prop selectively applies safe-area insets. The current `edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}` pattern on these pages is deliberate (Stack header already handles iOS top inset). Preserve it.

### Project Context Reference

- See `_bmad-output/project-context.md` for the binding repo-wide rules. The ones most relevant to this story:
  - Frontend strict TypeScript (these files are strict — keep them type-clean).
  - No test files under `frontend/app/` — use `frontend/__tests__/`.
  - 70% line coverage floor — adding tests for these previously untested pages improves coverage and is encouraged.
  - Keep edits minimal and localized — do not refactor styles to `AppTheme` tokens within this story.
  - Documentation must be updated alongside behavior/config changes — that is why Task 4 includes a `docs/` update for the store-submission URLs.

### Project Structure Notes

- Privacy/support pages live as siblings of `frontend/app/index.tsx` — no folder restructuring needed.
- No backend changes required. No infrastructure changes required. No new dependencies required.

### Testing Standards Summary

- Test runner: Vitest 4 (`frontend/vitest.config.ts`), jsdom environment, v8 coverage.
- Test file naming: `*.test.tsx` under `frontend/__tests__/app/`.
- Mock external boundaries: `expo-router`, `react-native` `Linking`/`Platform`, `react-native-safe-area-context`. Follow `frontend/__tests__/app/index.test.tsx` as the canonical mock-setup pattern.
- Coverage target: do not regress the existing 70% line coverage floor for frontend.
- Verification before marking done: `npm run lint`, `npm run tsc`, `npm run test:coverage` from `frontend/`; build the static web export (`npm run export:web`) at least once to confirm `/privacy` and `/support` render without runtime errors in production mode.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.5]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#User Identity & Session Entry] (FR1, FR2 — anonymous identity)
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements.md#Security & Privacy] (NFR13–NFR15)
- [Source: _bmad-output/planning-artifacts/prd/mobile-app-specific-requirements.md#Store Readiness]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md] (responsive + accessibility expectations on phone sizes)
- [Source: frontend/app/privacy.tsx] (current privacy content)
- [Source: frontend/app/support.tsx] (current support content)
- [Source: frontend/app/index.tsx] (landing links to both pages)
- [Source: frontend/hooks/useUser.ts] (anonymous identity creation + AsyncStorage persistence)
- [Source: frontend/api/characters.ts] (`ApiCharacter` field list)
- [Source: frontend/constants/avatars.ts] (fixed local avatar set — no user upload)
- [Source: frontend/app.json] (web.output = static; expo-router plugin)
- [Source: infrastructure/index.ts] (helpamunch.click custom domain)
- [Source: .github/workflows/frontend-infra-cd.yml] (web build + deploy pipeline)
- [Source: _bmad-output/implementation-artifacts/7-3-automated-ios-delivery.md] (iOS submission context)
- [Source: _bmad-output/implementation-artifacts/7-4-automated-android-delivery.md] (Android submission context)
- [Source: _bmad-output/project-context.md] (repo-wide rules)
- [Source: frontend/__tests__/app/index.test.tsx] (mocking pattern reference for new tests)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-05-23: Story drafted and set to ready-for-dev.
