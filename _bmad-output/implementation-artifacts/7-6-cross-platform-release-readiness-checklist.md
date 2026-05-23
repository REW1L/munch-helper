# Story 7.6: Cross-Platform Release Readiness Checklist

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team,
I want an explicit release-readiness checklist for the cross-platform core session experience,
so that we can decide whether a release is shippable based on defined criteria instead of assumptions.

## Acceptance Criteria

1. **Given** a candidate release of Munch Helper
   **When** the team runs the release-readiness review
   **Then** a single documented checklist exists in the repository (under `docs/`) and is the go/no-go source of truth — it covers iOS, Android, and web for the same release version (no per-platform checklists, no parallel copies elsewhere)

2. **Given** the checklist is opened for a candidate release
   **When** a reviewer reads it top to bottom
   **Then** every checkable item explicitly states the platform(s) it applies to (iOS / Android / web / all), so a reviewer can run the same checklist across all three platforms and record per-platform Pass / Fail / N/A without ambiguity

3. **Given** the checklist is being executed
   **When** a reviewer reaches the core-session-flow section
   **Then** the checklist enumerates verifiable items for each of: room management (create, join, code copy, re-entry), character management (auto-create on join, view, edit, full edit, remove, realtime card updates), battle management (start, manage, conclude, discard, active-battle indicator on Room View), room history (character events, battle events, completed-battle drill-in, pagination), and session continuity (reconnect banner, late-join context, session restore from AsyncStorage) — each item names the user-visible behaviour that must be observed for it to pass

4. **Given** the checklist is being executed
   **When** a reviewer reaches the failure-mode section
   **Then** the checklist captures release-blocker categories grouped by the five supportability subsystems documented in Epic 7 (room state, character state, battle state, log history, session continuity), each with at least one observable failure signature the reviewer can match against — clearly enough that a fail in one subsystem is a documented no-go, distinguishable from a fail in another subsystem

5. **Given** the checklist is being executed
   **When** a reviewer reaches the accessibility section
   **Then** the checklist explicitly lists the known WCAG AA contrast exception — `accent` (`#D4C26E`) on `surfaceWarm` (`#8A6150`) at ~4.2:1 (below the 4.5:1 AA threshold for normal text), mitigated by bold weight, text shadow on character names, and the `surfaceWarm` darkening already applied in Story 3.6 — and requires an explicit named sign-off line for this exception before any release can be approved (no implicit pass)

6. **Given** the checklist is part of release operations
   **When** a release is approved or rejected against it
   **Then** the checklist defines a per-release evidence record (where outcomes, sign-offs, dates, and the build/version identifier are captured) so a past release decision can be reconstructed from the evidence — the record can live alongside the checklist (filled-in copy, dated snapshot, or linked review issue), but the location must be stated in the checklist itself

7. **Given** the checklist references release pipelines, public URLs, and store submission paths
   **When** a reviewer follows those references
   **Then** every referenced workflow (`backend-ci-cd.yml`, `frontend-infra-cd.yml`, `ios-app-store-cd.yml`, `android-play-store-cd.yml`), public URL (`https://helpamunch.click`, `/privacy`, `/support`), and store track (TestFlight, Play internal track) resolves to an artifact that actually exists in the repo or live system — no broken or aspirational links

## Tasks / Subtasks

> **Task 0 — Prerequisite gate (HALT if not satisfied):** Stories 1.1–6.7 and 7.1–7.5 must be implementable from the repo today. If a referenced behaviour does not exist (e.g., 7.5 privacy/support content has not landed), the checklist items that depend on it must be marked `[Pending — Story X.Y]` in the document with a one-line note pointing to the owning story — do NOT silently omit them and do NOT fabricate a placeholder behaviour. The checklist is not a story-tracker; it is a release artifact, so unimplemented items are valid as long as they're flagged.

- [x] Task 1: Create `docs/release-readiness-checklist.md` as the single release-readiness artifact (AC: 1, 2, 6, 7)
  - [x] Add the file at exactly `docs/release-readiness-checklist.md` — this filename is the contract referenced by future stories (7.7, 7.8, 7.9) and by `docs/deployment-guide.md` (Task 5 below)
  - [x] Start with a short "How to use this checklist" preamble: (a) one checklist per release, copy/snapshot the file per release or record outcomes in a linked review issue, (b) every checkable line records Pass / Fail / N/A per platform, (c) a release is `Go` only when all required items are Pass on all applicable platforms and any known exceptions have a named sign-off
  - [x] Add a "Release Identity" block at the top with explicit fields the reviewer fills in: release version (e.g. expo app version + native build numbers from iOS/Android), git ref / commit SHA, web deploy artifact / CloudFront distribution, TestFlight build number, Play internal build number, reviewer name(s), review date
  - [x] Use Markdown task-list checkboxes (`- [ ]`) for every checkable item so the file can be copied and ticked through in a PR or review issue
  - [x] Tag every item with the platforms it applies to using a prefix convention: `[All]`, `[iOS]`, `[Android]`, `[Web]`, `[iOS+Android]` — this is the contract for AC 2

- [x] Task 2: Author the "Pipelines & Distribution" section (AC: 1, 7)
  - [x] `[Web]` `frontend-infra-cd.yml` succeeded for the candidate release commit and Pulumi published the new artifact (`infrastructure/index.ts` distribution served from `helpamunch.click`); validation step in the workflow reported `EXPO_PUBLIC_API_URL` resolved (Story 7.3 fix carries through)
  - [x] `[iOS]` `ios-app-store-cd.yml` succeeded; Fastlane `beta` lane produced a signed `.ipa` and `upload_to_testflight` reported the build was accepted; build number is recorded in the Release Identity block
  - [x] `[Android]` `android-play-store-cd.yml` succeeded; Fastlane `deploy` lane uploaded the signed `.aab` to the Play internal track (`release_status: "draft"` is the current default per Story 7.4); build number is recorded
  - [x] `[All]` `backend-ci-cd.yml` succeeded for the same commit and SAM deploy produced no failed Lambdas (`battle-service`, `log-service`, `character-service`, `room-service`, `user-service`, `room-notifications-service`)
  - [x] `[All]` Required workflow secrets present (verified by each workflow's `Validate Required Inputs` step passing) — explicitly: `MATCH_*`, `APP_STORE_CONNECT_*`, `EXPO_PUBLIC_API_URL`, `ANDROID_SIGNING_KEY*`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`

- [x] Task 3: Author the "Core Session Flow" section — items per epic, with explicit observable behaviours (AC: 3)
  - [x] **Room management** items, each `[All]` unless noted: room creation succeeds within 3 s and lands on Room View; room code visible in header; "copy room code" header button copies to clipboard; rejoining an existing room from a second session does not duplicate the player (verified by viewing the participant list)
  - [x] **Character management** items: a character auto-creates on room join (Story 3.3); character card renders with avatar, name, level, power, class, race, gender (Story 3.6); quick edit sheet adjusts level/power and saves (Story 3.7); full edit modal accepts all attribute changes (Story 3.9); character removal removes the card and emits a log entry (Story 3.10); realtime flash signal fires on remote character updates (Story 3.8); reduced-motion path verified by toggling the OS setting before joining (Story 4.6)
  - [x] **Battle management** items: start a battle from Room View — only one active battle per room is allowed (the server returns `409` if a second is attempted; the UI surfaces this without crashing); active battle indicator appears on Room View (`useRoomBattle` HTTP-on-mount + WS subscription, Story 5.2); battle name, player side, monster side editable via PATCH (full-replace, Story 5.3); conclude with `result` lands the battle in `concluded` state (Story 5.6); discard sets `discarded` and clears the active indicator (Story 5.7); realtime updates propagate when a character involved in the battle changes (Story 5.5)
  - [x] **Room history** items: character events appear in history after the corresponding action (Stories 6.1, 6.2, 6.6); battle lifecycle events appear (Story 6.3) and tapping a concluded-battle entry opens the completed battle (Story 6.7); history loads and paginates via cursor (Story 6.4) without duplicate entries or lost cursor on scroll-back; the latest event appears at the top of the list
  - [x] **Session continuity** items: backgrounding and re-foregrounding the app within ≤5 s restores the room without re-navigation (Story 4.3); the reconnecting banner appears when the WebSocket drops and clears when it reconnects (Story 4.4); a late-joining client sees the current room state without manual refresh (Story 4.5); the locally persisted `user` AsyncStorage key restores the player identity on cold start (Stories 1.2, 2.4)
  - [x] For each bullet above, the checklist line in the doc must end with a short user-observable assertion (e.g., "expected: the participant list shows exactly one entry for the rejoining player") — do not write items as "verify the room works"; write them as "the user sees X"

- [x] Task 4: Author the "Failure Mode & Release Blockers" section grouped by the five supportability subsystems (AC: 4)
  - [x] Use the five subsystem categories named verbatim in Epic 7 Story 7.7 AC: **room state**, **character state**, **battle state**, **log history**, **session continuity** — do NOT rename them; Story 7.7 owns the final taxonomy and 7.6's job is to cite it consistently
  - [x] For each subsystem, list at least one observable failure signature the reviewer can match against during testing, phrased so a reviewer can answer Yes/No. Examples (use these as a starting point, not the full list — expand to cover the most likely breakages):
    - **Room state:** a created room is not visible in the URL after creation OR joining a valid room code returns a non-actionable error
    - **Character state:** the auto-created character does not appear after joining OR a saved edit reverts on the next render
    - **Battle state:** a second battle can be started while one is already active (409 not surfaced) OR conclude/discard leaves the active-battle indicator on Room View
    - **Log history:** a character or battle action does not appear in history within a reasonable refresh OR history pagination loses position or duplicates entries
    - **Session continuity:** the app fails to restore the room after backgrounding OR the reconnecting banner does not clear after the socket reconnects
  - [x] Each failure signature line is a release blocker by default; the checklist must say so explicitly. Waivers require a named sign-off line (mirrors the AC 5 sign-off pattern)
  - [x] Add a forward-link note: "When Stories 7.7 (Supportability Signals) and 7.8 (Diagnostic Validation Matrix) land, the failure-signature lines here will be replaced or augmented with the structured failure codes / correlation IDs they emit, and 7.8 will provide the injected-failure validation matrix that proves these signals are observable. Until then, this section relies on user-visible behaviour."

- [x] Task 5: Author the "Accessibility & Compliance Exceptions" section with the explicit WCAG exception sign-off (AC: 5)
  - [x] `[All]` The `accent` on `surfaceWarm` contrast exception is listed verbatim: `accent` `#D4C26E` on `surfaceWarm` `#8A6150` ≈ 4.2:1, below 4.5:1 WCAG AA for normal text. Mitigations on record: bold weight on stat values, text shadow `rgba(0,0,0,0.4)` on character names, `surfaceWarm` darkened from `#A67560` to `#8A6150` (Story 3.6). Cite `_bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.3-13.4` as the source
  - [x] `[All]` The exception line is followed by an explicit named sign-off field (e.g., "Accepted by: ____ Date: ____") — the release cannot be marked Go without this being filled in
  - [x] `[All]` Spot-check the other documented contrast ratios (`textPrimary`/`background` ~9.5:1 AAA, `accent`/`background` ~5.8:1 AA, `textMuted`/`surface` ~5.2:1 AA, `textMuted`/`elevated` ~4.8:1 AA) still hold — if any have drifted because of theme changes since 2026-03-26, that is a release blocker, not a waivable item
  - [x] `[iOS+Android]` VoiceOver / TalkBack spot-check on the Room View + QuickEditSheet path (UX spec 13.5, 13.8) — reviewer notes any accessibility labels that no longer match the rendered element
  - [x] `[iOS]` Colourblindness spot-check via Xcode Accessibility Inspector (Deuteranopia + Protanopia filters) on Room View + QuickEditSheet (UX spec 13.7)
  - [x] `[All]` Privacy and Support pages (Story 7.5) render the current effective date and correct content on the deployed web build at `https://helpamunch.click/privacy` and `https://helpamunch.click/support` — these are the URLs iOS/Play submissions reference

- [x] Task 6: Author the "Release Evidence Record" section (AC: 6)
  - [x] Define the per-release evidence shape explicitly: a filled-in copy of `docs/release-readiness-checklist.md` (preferred), OR a dated review issue / PR that links to the commit SHA, build numbers, and per-item Pass/Fail entries
  - [x] State where evidence lives: by default, the filled-in copy is added under a new `docs/release-history/` folder named `YYYY-MM-DD-<release-version>.md` at the time of release; if a different team-internal location is preferred (Linear, Confluence, GitHub issue label), record that location verbatim in the checklist so future releases use the same place
  - [x] Do NOT create `docs/release-history/` files in this story — the folder is created when the first release is reviewed; just document the convention in the checklist

- [x] Task 7: Wire the new checklist into existing documentation entry points (AC: 1, 7)
  - [x] Update `docs/index.md`: add `- [Release Readiness Checklist](./release-readiness-checklist.md)` under the "Generated Documentation" list (after Deployment Guide) so the checklist is discoverable from the docs index
  - [x] Update `docs/deployment-guide.md`: add a short "Release Readiness" subsection at the bottom that links to `release-readiness-checklist.md` and states "before any iOS/Play/web release is approved, run the checklist against the candidate release" — this gives the deployment-guide reader the entry point into release-ops
  - [x] Do not edit any other docs — keep this change scoped (per project-context: "Keep edits minimal and localized")

- [x] Task 8: Verification (AC: 1, 2, 3, 7)
  - [x] Read the checklist end-to-end out loud as if running a release; every line should be unambiguous and platform-tagged
  - [x] Resolve every link in the document by clicking through: each `_bmad-output/...` reference exists at the cited path, each `.github/workflows/...` file exists, each `frontend/app/...` route file exists, each public URL (`https://helpamunch.click`, `/privacy`, `/support`) renders without error
  - [x] Confirm the doc lints cleanly (no markdown lint errors if a linter is configured); confirm the file is committed to the same PR as `docs/index.md` and `docs/deployment-guide.md` updates so the cross-links are not broken on `main`

## Dev Notes

### Story Foundation

- This is a **documentation/process story, not a code story.** No frontend, backend, or infrastructure source code is modified. The entire deliverable is one new doc (`docs/release-readiness-checklist.md`) and two existing doc updates (`docs/index.md`, `docs/deployment-guide.md`).
- The checklist exists to satisfy **NFR11** ("Release readiness shall be assessed through an explicit checklist covering the completed cross-platform session experience") and **FR47** ("The product can be reviewed against an explicit release-readiness checklist for the completed cross-platform session experience"). Read those two requirements before writing — they are the why.
- This story unblocks Story 7.9 (Release Channel Availability Validation), which depends on a pre-existing readiness checklist to gate its "release has passed the readiness checklist" precondition. Treat the checklist as a contract Story 7.9 will reference by filename.
- Stories 7.7 and 7.8 are still in `backlog`. The failure-mode section here uses Epic 7's stated five subsystem names (room/character/battle/log/session-continuity) as the canonical labels. Do NOT invent error codes, structured failure types, or correlation-ID formats — those are owned by 7.7 (Supportability Signals) and 7.8 (Diagnostic Validation Matrix). The checklist describes user-observable failure signatures today; 7.7/7.8 will augment those with structured signals later.

### Scope Guard (read before writing the doc)

- **In scope:** authoring `docs/release-readiness-checklist.md`; adding navigation entries in `docs/index.md` and `docs/deployment-guide.md`.
- **Out of scope and explicit no-gos for this story:**
  - Building any new code, new tooling, or new GitHub Actions job to "run" the checklist. The checklist is a human-executed review artifact; no automation is built here.
  - Designing the structured failure code taxonomy or correlation-ID format — owned by Story 7.7.
  - Building the QA injected-failure validation matrix — owned by Story 7.8. The 7.6 checklist can name "failure signatures" in plain English; 7.8 will provide the injectable-fault tests that prove each signature is reachable.
  - Performing the actual release-readiness review for a real candidate build — that happens when the first release runs after this story lands.
  - Migrating `accent`/`surfaceWarm` hex literals to AppTheme tokens in pages that still use them (`index.tsx`, `privacy.tsx`, `support.tsx`, `rooms.tsx`, `support.tsx`) — that's a separate cleanup; the checklist documents the exception, not the migration.

### Current Implementation Anchor — What Already Exists

| Artifact | What it is today | Why the checklist must cite it |
|---|---|---|
| `.github/workflows/backend-ci-cd.yml` | Backend CI + SAM deploy on push to `main` | Pipeline section AC 7 |
| `.github/workflows/frontend-infra-cd.yml` | Web export + Pulumi deploy on push to `main`; serves `helpamunch.click` | Pipeline section AC 7; public URL stability |
| `.github/workflows/ios-app-store-cd.yml` | Fastlane `beta` → TestFlight; `Validate Required Inputs` step gates secrets (Story 7.3) | Pipeline section AC 7 |
| `.github/workflows/android-play-store-cd.yml` | Fastlane `build` + `deploy` → Play internal track; `Validate Required Inputs` (Story 7.4) | Pipeline section AC 7 |
| `frontend/app/privacy.tsx`, `frontend/app/support.tsx` | Stable `/privacy` and `/support` web routes (Story 7.5) | Accessibility/compliance section + AC 7 link checks |
| `infrastructure/index.ts` | CloudFront stack serving `helpamunch.click` | Public URL stability |
| `_bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md` (§ 13.3, 13.4, 13.7, 13.8) | Source of contrast ratios, the documented `surfaceWarm` darkening, the WCAG exception, and the colourblindness/screen-reader test methodology | Accessibility section AC 5; cite verbatim |
| `_bmad-output/planning-artifacts/prd/non-functional-requirements.md` (NFR7–NFR12) | Cross-platform consistency + supportability requirements | "Why this checklist exists" — frame the doc against these |
| `_bmad-output/planning-artifacts/prd/functional-requirements.md` (FR40–FR48) | Per-platform core flow + release-readiness requirements | Pipeline + core-session-flow sections trace back here |
| `_bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md` (Story 7.7) | Names the five subsystem categories | Failure-mode section AC 4 — use the names verbatim |
| `_bmad-output/implementation-artifacts/7-5-release-facing-compliance-content.md` | Existing pattern for store-submission URL documentation | Accessibility/compliance section AC 5 |
| `frontend/constants/theme.ts` (`accent: '#D4C26E'`, `surfaceWarm: '#8A6150'`) | Source of truth for the two colors in the exception | Accessibility section AC 5 |
| `docs/deployment-guide.md`, `docs/index.md` | Existing doc entry points | Task 7 — wire navigation |

### Architecture Guardrails

- **File location is contractual.** `docs/release-readiness-checklist.md` is the path Stories 7.7, 7.8, and 7.9 will reference. Do not place it under `_bmad-output/` (that tree is for planning/implementation artifacts owned by the BMad workflow, not release operations).
- **No code, no scripts, no CI changes.** This story does not modify any TypeScript, YAML, Pulumi, Fastlane, or test files. Reject any temptation to add a "run-checklist" script or a CI step that asserts the checklist file exists — those are out of scope.
- **Plain-English failure signatures only.** Until 7.7/7.8 land, the failure-mode section uses user-observable behaviours (e.g., "joining a valid room code returns a non-actionable error"). Do not invent structured codes like `ROOM-001` or correlation-ID formats — those belong to 7.7's taxonomy work and would create churn when 7.7 picks its real names.
- **Doc style consistency.** Match the prose style of existing `docs/*.md` files: short sections with `##`/`###` headings, Markdown task lists for checkable items, fenced code blocks for file paths, no emoji, no decorative banners. Look at `docs/deployment-guide.md` for the baseline tone.
- **Markdown task-list checkbox rule.** Every checkable line uses `- [ ]` so a reviewer can copy the file and tick through it in their editor or a PR. Per-platform per-item state (Pass/Fail/N/A) is captured by the reviewer either inline (e.g. `- [x] [iOS] Pass — [iOS] item description`) or in a structured table at the top — pick one convention and use it consistently across the doc.
- **No new dependencies.** No diagrams, no Mermaid, no images unless rendered from the source files already in the repo.

### Library / Framework Requirements

- None — pure Markdown.
- The only repo conventions that apply are the existing `docs/` style and the project-context rule "Keep documentation current alongside behavior/config/contracts changes" (this story is creating that documentation).

### File Structure Requirements

```
docs/
├── release-readiness-checklist.md     NEW — the checklist artifact
├── index.md                            MODIFIED — add entry pointing to release-readiness-checklist.md
└── deployment-guide.md                 MODIFIED — add "Release Readiness" subsection linking to checklist
```

- Do not create `docs/release-history/` in this story. The checklist *documents* the per-release evidence convention (Task 6); the first filled-in copy is added when the first real release runs, not here.
- Do not create files under `_bmad-output/`. That tree is owned by the BMad planning/implementation workflow, not release operations.

### Testing Requirements

- No automated tests are added. This is a documentation deliverable; the "test" is a careful end-to-end read of the checklist (Task 8).
- Existing test suites (frontend + backend coverage gates, the 70% line-coverage floor) are not affected by this story.
- Per project-context rule "every touched surface must pass its relevant quality checks before work is marked complete," confirm `git diff --stat` shows only the three files listed above plus this story file and `sprint-status.yaml`.

### Previous Story Intelligence

- **Story 7.3 (iOS):** the workflow now gates on `Validate Required Inputs` (added by 7.3) and `EXPO_PUBLIC_API_URL` is required in the job env to prevent the production-build crash. Cite this in the pipeline-section line for iOS so reviewers know what success looks like.
- **Story 7.4 (Android):** the workflow runs `build` and `deploy` as separate Fastlane lanes; the `deploy` lane carries an explicit `aab:` path because cross-process lane context is lost. Mention "build *and* deploy lanes succeeded" in the Android pipeline checklist line — not just "the workflow ran."
- **Story 7.5 (compliance content):** the privacy/support URLs (`/privacy`, `/support`) at `helpamunch.click` are stable and reflect the current app scope. Both URLs appear on the checklist (Task 5 + Task 8 link-check); the effective date on `/privacy` is the easiest end-to-end signal that the latest content was published.
- **Story 6.7 (room history battle drill-in):** the most recent merged story. The room history Pass criteria must include tapping a concluded-battle entry and confirming the completed battle opens — that's the 6.7 visible behaviour.
- **Story 4.6 (reduced motion):** the reduced-motion path is verified by toggling the OS setting before the test; both the realtime flash (`RoomCharacterCard`) and `QuickEditSheet` must respect it. Include this in the character-management section.
- **Story 3.6 (`surfaceWarm` darkening):** the design token was darkened from `#A67560` to `#8A6150` specifically to lift the `accent`/`surfaceWarm` contrast — without that history, the WCAG exception text won't make sense to a future reader. The accessibility section should cite Story 3.6 and `theme.ts` as the source of truth for the current value.
- **Story 1.1/landing screen and Story 7.5:** `frontend/app/index.tsx` still uses `#D4C26E` hex literals (not the `AppTheme.colors.accent` token) for the title and buttons. This is a known follow-up and is explicitly out of scope here; document the contrast values, not the migration.

### Git Intelligence Summary

- Most recent merges focus on epic 6 (room history) — 6.6 and 6.7 just landed. The history flow described in the checklist is fresh and should be tested against the just-merged build, not a stale memory of the feature.
- `chore: add monster avatar (#104)` and earlier asset commits show the project routinely lands content-only PRs without CI gates beyond the standard backend/frontend CI workflows. Treat this story the same way: a small, focused doc PR.
- No infrastructure changes have been merged recently — the `helpamunch.click` route and the four GitHub Actions workflows are stable references for the checklist.

### Latest Technical Information

- Markdown rendering on GitHub supports task-list checkboxes (`- [ ]`) natively in `.md` files. They render as clickable boxes in issues/PRs and as plain checkboxes in the file view — exactly what's needed for a copy-and-tick checklist.
- No external technology to research for this story — it's a pure documentation deliverable.

### Project Context Reference

- See `_bmad-output/project-context.md` for repo-wide rules. The ones most relevant here:
  - "When changing behavior, env vars, or endpoint contracts, update the nearest relevant docs (README/OpenAPI/docs) in the same change." — Task 7 wires the new doc into `docs/index.md` and `docs/deployment-guide.md` so future readers find it.
  - "Keep edits minimal and localized." — three files touched in `docs/`, plus this story file and `sprint-status.yaml`. Nothing else.
  - "Do not leave documentation stale when behavior/config/contracts changed." — this story exists *because* the cross-platform release surface (Epic 7) added new artifacts (pipelines, store paths, public URLs) that the docs do not yet acknowledge as a release gate.

### Project Structure Notes

- `docs/` is the canonical home for release-ops documentation. The repo already places similar materials there (`deployment-guide.md`, `integration-architecture.md`).
- No backend, frontend, or infrastructure subtree is affected — no nested `docs/` folder needed elsewhere.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.6]
- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.7] (subsystem category names — room state, character state, battle state, log history, session continuity)
- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.8] (validation matrix — future augmentation)
- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.9] (downstream consumer of this checklist)
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#Cross-Platform Product Consistency] (FR40–FR44)
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#Product Supportability & Release Readiness] (FR45–FR48 — primary requirements)
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements.md#Cross-Platform Consistency] (NFR7–NFR9)
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements.md#Supportability] (NFR10–NFR12 — primary requirements)
- [Source: _bmad-output/planning-artifacts/prd/mobile-app-specific-requirements.md#Store Readiness]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.3 Design Token Update] (`surfaceWarm` `#8A6150` darkening rationale)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.4 Accessibility Strategy] (AA contrast ratios, accepted exception)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.5 React Native Accessibility Props] (VoiceOver/TalkBack label expectations)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.7 Colour Blindness] (Deuteranopia/Protanopia test procedure)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.8 Testing Strategy] (device targets, accessibility testing checklist)
- [Source: _bmad-output/implementation-artifacts/7-3-automated-ios-delivery.md] (iOS workflow + Validate Required Inputs pattern)
- [Source: _bmad-output/implementation-artifacts/7-4-automated-android-delivery.md] (Android `build`/`deploy` split, `aab:` path fix)
- [Source: _bmad-output/implementation-artifacts/7-5-release-facing-compliance-content.md] (store-submission URL documentation pattern)
- [Source: _bmad-output/project-context.md] (repo-wide rules)
- [Source: .github/workflows/backend-ci-cd.yml]
- [Source: .github/workflows/frontend-infra-cd.yml]
- [Source: .github/workflows/ios-app-store-cd.yml]
- [Source: .github/workflows/android-play-store-cd.yml]
- [Source: frontend/app/privacy.tsx]
- [Source: frontend/app/support.tsx]
- [Source: frontend/constants/theme.ts] (`accent`/`surfaceWarm` hex values)
- [Source: infrastructure/index.ts] (`helpamunch.click` custom domain)
- [Source: docs/deployment-guide.md] (existing release-ops entry point — update target)
- [Source: docs/index.md] (existing doc index — update target)

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-23: Confirmed story prerequisite statuses in `_bmad-output/implementation-artifacts/sprint-status.yaml`; Stories 1.1-6.7 and 7.1-7.5 are marked done.
- 2026-05-23: Verified referenced repo artifacts exist: four release workflows, `frontend/app/privacy.tsx`, `frontend/app/support.tsx`, `frontend/constants/theme.ts`, `infrastructure/index.ts`, and UX accessibility source.
- 2026-05-23: Verified public URLs with `curl -I -sS`: `https://helpamunch.click`, `/privacy`, and `/support` all returned HTTP 200.
- 2026-05-23: Confirmed no Markdown linter is configured in root/frontend/backend/infrastructure package scripts; ran full repo coverage after installing existing dependencies.

### Completion Notes List

- Created `docs/release-readiness-checklist.md` as the single cross-platform release go/no-go checklist, with Release Identity fields, platform-tagged Markdown checkboxes, core session flow checks, release-blocker failure signatures, accessibility exception sign-off, evidence convention, and link/artifact verification.
- Wired the checklist into `docs/index.md` and `docs/deployment-guide.md` so release operators can discover it from existing documentation entry points.
- Verified every checklist checkbox uses one of the required platform prefixes; local artifact references exist; public release URLs returned HTTP 200; full repo coverage passed after rerunning outside the sandbox port-binding restriction.

### File List

- docs/release-readiness-checklist.md
- docs/index.md
- docs/deployment-guide.md
- _bmad-output/implementation-artifacts/7-6-cross-platform-release-readiness-checklist.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-05-23: Implemented Story 7.6 checklist, wired documentation entry points, verified artifact/URL references, and moved story to review.
- 2026-05-23: Story drafted and set to ready-for-dev. Documentation-only deliverable; produces `docs/release-readiness-checklist.md` and wires it into `docs/index.md` + `docs/deployment-guide.md`. Failure-mode section uses Epic 7 / Story 7.7's five subsystem category names verbatim (room state, character state, battle state, log history, session continuity); structured error codes and correlation-ID formats are explicitly deferred to Story 7.7. Validation matrix mechanics are explicitly deferred to Story 7.8.
