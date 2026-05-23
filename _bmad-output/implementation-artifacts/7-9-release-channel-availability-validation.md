# Story 7.9: Release Channel Availability Validation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to be able to access the current release from each intended distribution channel,
So that the completed app is actually available where I expect to get it.

## Scope Guard (READ FIRST — DO NOT EXPAND)

This story is **availability validation only**. It does **not** build new pipelines, add new code paths in the app, or define new release artifacts.

- ❌ Do **not** modify `.github/workflows/frontend-infra-cd.yml`, `.github/workflows/ios-app-store-cd.yml`, or `.github/workflows/android-play-store-cd.yml`. The pipelines themselves are owned by Stories 7.2 (web), 7.3 (iOS), and 7.4 (Android) — all done.
- ❌ Do **not** rewrite the privacy or support page content. Owned by Story 7.5 (`7-5-release-facing-compliance-content.md`, currently ready-for-dev). This story consumes those URLs as already-published artifacts.
- ❌ Do **not** author the release-readiness checklist. Owned by Story 7.6 (Cross-Platform Release Readiness Checklist, currently backlog). This story consumes its output to satisfy AC 1 and AC 3.
- ❌ Do **not** define the supportability/failure taxonomy or the diagnostic validation matrix. Owned by Stories 7.7 and 7.8 (both backlog). This story does not gate itself on those artifacts; it covers user-visible availability only.
- ❌ Do **not** rename or move Pulumi outputs, Fastlane lane names, or workflow secret names — those are owned by Stories 7.1–7.4. Names that this story needs but does not yet have are **deferred to the owning story** and listed in "Deferred Names" below.
- ✅ This story **produces**:
  1. A repeatable channel-availability validation playbook (location below).
  2. A dated release-evidence artifact for the current release that records the playbook results.
  3. Lightweight automation (a script) where it removes manual error from the web channel check.

If the dev agent finds itself editing pipeline YAML, store-listing copy, or the readiness checklist itself, **stop and re-read this Scope Guard**.

## Acceptance Criteria

1. **Given** a release candidate has passed the Story 7.6 release-readiness checklist (or, while 7.6 is incomplete, the checklist artifact path is provided by the operator)
   **When** the channel-availability validation playbook is executed
   **Then** the current release version is reachable on the web (`https://helpamunch.click`), iOS (TestFlight build for `click.helpamunch.mobileapp`), and Android (Play internal track for `click.helpamunch.mobileapp`) channels, and the validation playbook records a PASS for each channel against the version under test

2. **Given** the channel-availability validation playbook is executed
   **When** the metadata audit step runs for each channel
   **Then** the store/channel-facing metadata (web site title and primary call-to-action, App Store Connect listing fields, Play Console listing fields) does not misrepresent the supported core session experience — specifically, listed capabilities do not exceed what the current release actually delivers across rooms, characters, battles, and room history (FR43–FR44, NFR8–NFR9), and the privacy/support URLs match the stable URLs delivered by Story 7.5 (`https://helpamunch.click/privacy` and `https://helpamunch.click/support`)

3. **Given** any channel's automated or manual availability check returns FAIL, **or** the readiness checklist (AC 1) records a missing or waived core workflow for that channel
   **When** the validation playbook is run
   **Then** that channel is marked NOT-RELEASE-READY in the evidence artifact, the failing item is named, and the artifact records the channel as blocked from release approval until the gap is closed or explicitly waived per the Story 7.6 sign-off process

4. **Given** the validation playbook completes (PASS or FAIL)
   **When** the operator finalizes the release-evidence artifact
   **Then** the artifact is saved at `docs/release-evidence/<release-version>-<YYYY-MM-DD>-channel-availability.md`, references the Story 7.6 readiness checklist outcome it depended on, lists per-channel PASS/FAIL with the validator's identity and timestamp, and is linked from `docs/deployment-guide.md` so future releases can locate prior evidence

## Tasks / Subtasks

- [ ] **Task 0 (PREREQUISITE GATE — DO NOT SKIP):** Verify prerequisite stories before doing any other task (AC: 1, 2, 3)
  - [ ] Read `_bmad-output/implementation-artifacts/sprint-status.yaml` and confirm `7-5-release-facing-compliance-content` is `done`. If not, **HALT** and report: "Story 7.9 cannot run end-to-end until 7.5 ships the privacy/support URLs the AC 2 metadata audit requires."
  - [ ] Confirm `7-6-cross-platform-release-readiness-checklist` is `done`. If not, **HALT** and report: "Story 7.9 AC 1 references the readiness checklist owned by 7.6; without it, the playbook has no checklist input to record against." Acceptable fallback only if Ivan confirms explicitly: proceed with a placeholder marked `TODO: 7.6 dependency` in the playbook and the evidence template, and re-open this story when 7.6 lands to wire the real checklist reference in.
  - [ ] Note: this story does **not** gate on 7.7 or 7.8. Supportability signals/diagnostic matrix are not in scope for user-visible availability validation.

- [ ] Task 1: Author the channel-availability validation playbook (AC: 1, 2, 3)
  - [ ] Create `docs/release-validation/channel-availability-playbook.md` (new directory under `docs/` — sibling of `docs/release-evidence/`)
  - [ ] Document a single-page step-by-step playbook covering all three channels; the playbook must be runnable by any developer with workflow access and store-console access
  - [ ] **Web section:** steps to (a) verify `https://helpamunch.click/` returns HTTP 200 and serves HTML produced by `expo export --platform web` for the version under test; (b) verify `/privacy` and `/support` return HTTP 200 and render the content shipped by 7.5; (c) verify the web build's embedded `EXPO_PUBLIC_API_URL` matches the production API base (read from the deployed bundle, not from local env) so the deployed web app can actually reach the backend
  - [ ] **iOS section:** steps to (a) open App Store Connect → TestFlight → confirm the most recent build for `click.helpamunch.mobileapp` matches the release version (`frontend/app.json` `expo.version`); (b) confirm the build is in "Ready to Test" status; (c) install via TestFlight on a real device and complete one end-to-end smoke (create room → create character → start and conclude one battle → open room history) to confirm the build is actually usable, not just delivered
  - [ ] **Android section:** steps to (a) open Google Play Console → Internal testing track → confirm the most recent active release for `click.helpamunch.mobileapp` matches the release version; (b) confirm rollout status is "Available"; (c) install via the internal-testing opt-in link and complete the same end-to-end smoke as iOS
  - [ ] **Metadata audit section:** a 5-row table per channel listing exactly which fields to audit (web: `<title>` and landing CTA; iOS: App Name, Subtitle, Promotional Text, Description, Support URL, Privacy Policy URL; Android: App name, Short description, Full description, Privacy Policy URL, Contact email/website) with a "does this overstate scope?" yes/no check per row referencing FR43–FR44 and NFR8–NFR9
  - [ ] **Failure handling:** explicit instruction that any per-channel FAIL marks the release NOT-RELEASE-READY for that channel and that the release-readiness review (Story 7.6) is the place where a waiver is granted — Story 7.9's job is to record, not to waive

- [ ] Task 2: Add a lightweight script to automate the web-channel reachability check (AC: 1)
  - [ ] Create `scripts/validate-web-channel.mjs` — ESM, Node 24, zero new dependencies (use `node:https`, `node:process`)
  - [ ] Accepts `--version <semver>` (required) and `--base-url https://helpamunch.click` (optional, defaults to that)
  - [ ] Performs HEAD/GET on `/`, `/privacy`, `/support`; fails with non-zero exit if any returns ≠ 200 or content-type is not HTML
  - [ ] On GET `/`, fetches the response body, looks for the version string passed via `--version` in the embedded bundle (e.g. matches the version emitted by `expo export`'s manifest or `<meta>` tag) — log a warning (not a hard fail) if not found, since the version-embedding strategy is owned by Expo and may change
  - [ ] Writes a structured PASS/FAIL summary (JSON to stdout) suitable for pasting into the evidence artifact
  - [ ] No interactive prompts; exit codes only (`0` PASS, `1` FAIL, `2` USAGE)
  - [ ] Add a one-line invocation example to the playbook (Task 1) and to `docs/deployment-guide.md` under a new "Release Channel Validation" subsection

- [ ] Task 3: Add unit tests for the web-channel script (AC: 1)
  - [ ] Create `scripts/validate-web-channel.test.mjs` using `node:test`
  - [ ] Mock `node:https` via a thin wrapper module so tests do not hit the network
  - [ ] Cover: (a) all three URLs 200 → exit 0; (b) `/privacy` 404 → exit 1 and the failing path is named in stdout; (c) HTML content-type missing → exit 1; (d) `--version` missing → exit 2; (e) version string found vs not found → both paths logged but only "not found" emits a warning, neither is a hard fail
  - [ ] Reuse the test-style conventions already established in `scripts/story-project-sync.test.mjs` and `scripts/ready-for-dev-orchestrator.test.mjs` (same `node --test` runner, same dry-run output style)

- [ ] Task 4: Create the evidence-artifact template (AC: 4)
  - [ ] Create `docs/release-evidence/TEMPLATE-channel-availability.md` — a fill-in-the-blanks template that mirrors the playbook sections from Task 1
  - [ ] Sections: `Release version`, `Validated on`, `Validator`, `Readiness checklist reference` (link to the 7.6 artifact for this release; placeholder allowed only if 7.6 not yet shipped), `Web channel`, `iOS channel`, `Android channel`, `Metadata audit`, `Per-channel verdict`, `Blockers / waivers`, `Final go / no-go`
  - [ ] Add a brief README at `docs/release-evidence/README.md` (new) explaining: file naming convention `<version>-<YYYY-MM-DD>-channel-availability.md`, where to find the template, and where to link the artifact (deployment guide)

- [ ] Task 5: Wire the evidence artifact into the deployment guide (AC: 4)
  - [ ] Edit `docs/deployment-guide.md` to add a new "Release Channel Validation" section under "CI/CD Workflows Found"
  - [ ] The section must include: a one-paragraph summary of what Story 7.9's validation produces, the path to the playbook (`docs/release-validation/channel-availability-playbook.md`), the path to the evidence template (`docs/release-evidence/TEMPLATE-channel-availability.md`), the path to the web-channel script (`scripts/validate-web-channel.mjs`) with its one-line invocation, and a sentence locating prior evidence files under `docs/release-evidence/`
  - [ ] Keep the edit minimal — do not restructure or rewrite existing sections of `deployment-guide.md`

- [ ] Task 6: Verification (AC: 1, 2, 3, 4)
  - [ ] Run `node --test scripts/validate-web-channel.test.mjs` → all pass
  - [ ] Run `node scripts/validate-web-channel.mjs --version $(node -p "require('./frontend/app.json').expo.version")` against the live production URL → PASS or, if any URL fails, capture the failing output and treat as a real release blocker (not a script bug) until proven otherwise
  - [ ] Walk through the playbook end-to-end once against the current production release, fill out the evidence template, save the result at `docs/release-evidence/<current-version>-$(date +%Y-%m-%d)-channel-availability.md`, and link it from `docs/deployment-guide.md` as the first concrete example
  - [ ] Confirm no pipeline YAML, no privacy/support page content, no Pulumi config, and no Fastlane config was modified by this story

## Dev Notes

### Story Foundation

- Story 7.9 closes Epic 7 by **proving that the work shipped in 7.1–7.8 actually reaches users on each channel**. It does not ship new product functionality. It ships a **process artifact + small automation** that makes channel availability a documented, repeatable, evidence-backed gate instead of an assumption.
- Three channels are in scope, all of which already exist and ship from `main`:
  - **Web** — CloudFront-fronted S3 at `https://helpamunch.click` (Pulumi stack in `infrastructure/index.ts`, deployed by `.github/workflows/frontend-infra-cd.yml`).
  - **iOS** — TestFlight delivery of `click.helpamunch.mobileapp` (Fastlane `ios beta` lane, `.github/workflows/ios-app-store-cd.yml`).
  - **Android** — Play internal-testing track for `click.helpamunch.mobileapp` (Fastlane `android build`/`deploy` lanes, `.github/workflows/android-play-store-cd.yml`).
- Per the epic, AC 1 explicitly references the readiness checklist (Story 7.6, currently backlog). The Task 0 gate above is the explicit dependency capture; do not invent a checklist inline in this story.

### Channel Inventory (verified at story authoring time)

| Channel | Identifier | Pipeline | Output location | Owner story |
|---|---|---|---|---|
| Web | `helpamunch.click` (custom domain in `infrastructure/index.ts:40`) | `.github/workflows/frontend-infra-cd.yml` (build + Pulumi deploy on push to `main`) | CloudFront distribution, S3 origin `munch-helper-frontend-${accountId}-sandbox` | 7.2 (done) |
| iOS | Bundle id `click.helpamunch.mobileapp` (`frontend/app.json` `expo.ios.bundleIdentifier`) | `.github/workflows/ios-app-store-cd.yml` → `bundle exec fastlane ios beta` | TestFlight build under the configured App Store Connect team | 7.3 (done) |
| Android | Package `click.helpamunch.mobileapp` (`frontend/app.json` `expo.android.package`) | `.github/workflows/android-play-store-cd.yml` → `bundle exec fastlane android build` then `deploy` | Play Console "Internal testing" track, draft → published by ops | 7.4 (done) |

Current release version source-of-truth: `frontend/app.json` `expo.version` (today: `1.1.1`). The web-channel script accepts this via `--version` to avoid hardcoding the value and to keep the script reusable across releases.

### Dependencies on Incomplete Stories (Why Task 0 Exists)

- **7.5 (ready-for-dev)** ships the stable `https://helpamunch.click/privacy` and `https://helpamunch.click/support` URLs that AC 2's metadata audit checks for. If 7.5 has not landed when 7.9 runs end-to-end, the web-channel `/privacy` and `/support` reachability checks will still pass (the routes exist today per `frontend/app/privacy.tsx` and `frontend/app/support.tsx`) — but the metadata-audit step will need to flag that the content has not yet been refreshed to match the current app scope. Task 0 enforces 7.5 as a real dependency for full PASS.
- **7.6 (backlog)** owns the cross-platform readiness checklist. AC 1 and AC 3 are written against that checklist. Without 7.6 the validation playbook can still execute the reachability and metadata checks, but cannot record AC 1/AC 3 against a real checklist output — the evidence artifact will carry a `TODO: 7.6 dependency` placeholder until 7.6 ships. This is the documented variance.
- **7.7 (backlog)** and **7.8 (backlog)** add supportability signals and the diagnostic validation matrix. These are required for support readiness, not for user-facing channel availability. They are **out of scope for 7.9** and the dev agent must not implement them here.

### Deferred Names (Owned by Other Stories — Do Not Pre-Pin)

| Name | Owning story | Why deferred |
|---|---|---|
| The checklist section/key names referenced by the evidence template's "Readiness checklist reference" field | 7.6 | The schema and section names of the checklist are 7.6's design choice; 7.9's template uses a free-text link until 7.6 fixes the format |
| Subsystem categories / failure-code identifiers from the failure taxonomy | 7.7 | Not used by 7.9 (out of scope), but listed here so a future cross-reference in the evidence artifact does not invent its own names |
| Diagnostic validation matrix scenarios | 7.8 | Same as above — referenced for context only, not consumed by 7.9 |

### What This Story Changes vs Preserves

- **Changes (new files):** `docs/release-validation/channel-availability-playbook.md`, `docs/release-evidence/TEMPLATE-channel-availability.md`, `docs/release-evidence/README.md`, `scripts/validate-web-channel.mjs`, `scripts/validate-web-channel.test.mjs`, plus one new section in `docs/deployment-guide.md`, plus the first concrete evidence file from Task 6.
- **Preserves (do not modify):** `.github/workflows/*.yml`, `frontend/app/privacy.tsx`, `frontend/app/support.tsx`, `frontend/app.json`, `infrastructure/index.ts`, `frontend/fastlane/**`, `frontend/Gemfile*`, `frontend/package.json` scripts, `backend/**`, `_bmad-output/planning-artifacts/epics/epic-7-*.md` (this is a planning artifact, not a development output).

### Architecture Guardrails

- **Documentation-first deliverable:** the primary product of this story lives under `docs/`. Keep the language plain-text, operator-friendly, and free of code samples that drift (e.g. do not embed YAML snippets from the pipelines — link to the file path instead, per `_bmad-output/project-context.md`'s "Do not leave documentation stale" rule).
- **Scripts directory pattern:** new scripts go under top-level `scripts/` and follow the existing ESM-mjs + `node --test` style established by `scripts/story-project-sync.mjs` and `scripts/ready-for-dev-orchestrator.mjs`. Do not add `package.json` script entries unless the script will be invoked routinely from CI; this script is operator-run during the release-readiness review, so a documented `node scripts/validate-web-channel.mjs …` invocation in the playbook and deployment guide is sufficient.
- **Zero new dependencies:** the validation script uses `node:https` and `node:process` only. Do not add `node-fetch`, `axios`, `playwright`, `puppeteer`, or any other dependency for this story. Web channel availability is a 3-URL check, not a browser-driven smoke test.
- **Manual-step honesty:** TestFlight and Play Console do not expose stable public APIs suitable for unauthenticated CI checks of release status, so the iOS and Android sections of the playbook are **deliberately manual**. Do not invent an automation layer that "scrapes" these consoles or shells out to Fastlane just to read state — that would couple this story to 7.3/7.4's pipelines and violate the Scope Guard.
- **End-to-end smoke is part of availability, not a separate test suite:** the per-channel smoke (create room → create character → battle → history) is documented in the playbook as a manual checklist, not a Maestro automation. Maestro flows live in `maestro/` (e.g. `app_store_room_view.yaml`) and are run on-demand; referencing them from the playbook as an optional aid is fine, replacing the manual smoke with a Maestro run is not in scope.
- **Evidence artifact is durable:** save each release's evidence under `docs/release-evidence/` so it ships with the repo and is recoverable by any future contributor. Do not write evidence to an external system (GitHub Issues, Notion, etc.) — the artifact is part of the repo's release record.

### Validation Playbook Design (Reference for Task 1)

Single-page structure proposed:

1. **Prerequisites** — release version under validation; readiness checklist artifact path (from 7.6); access requirements (App Store Connect, Play Console, TestFlight on a real iOS device, Play internal-testing opt-in).
2. **Web channel** — run `node scripts/validate-web-channel.mjs --version <v>`; record JSON output; open `https://helpamunch.click/` in a browser and visually confirm the landing screen renders.
3. **iOS channel** — App Store Connect → TestFlight → most-recent-build version match; install on real device; run smoke.
4. **Android channel** — Play Console → Internal testing → most-recent-release version match; install via opt-in link; run smoke.
5. **Metadata audit** — per-channel field-by-field table; mark each row "matches current scope" yes/no; reference FR43–FR44 and NFR8–NFR9 for the scope baseline.
6. **Verdict** — per-channel PASS/FAIL; final release go/no-go reads PASS-on-all-three or NOT-RELEASE-READY with named blockers.

This is a description for the dev agent — the dev agent writes the actual playbook in `docs/release-validation/channel-availability-playbook.md` with operator-friendly prose, not by literally copying this list.

### Previous Story Intelligence

- **Story 7.5 (ready-for-dev)** — establishes the stable `https://helpamunch.click/privacy` and `https://helpamunch.click/support` URLs that the metadata audit relies on. 7.5's Task 4 already records those URLs in `docs/deployment-guide.md` under "Store Submission URLs"; 7.9's deployment-guide edit should add a sibling section ("Release Channel Validation"), not duplicate or modify 7.5's section.
- **Story 7.4 (done) — Post-Implementation Fix** — the Android `deploy` lane failed in production because `gradle` action context was lost between separate Fastlane processes. Pattern to remember when validating the Android channel: a green CI workflow run does not by itself prove a real `.aab` reached the Play internal track. Always cross-check Play Console showing a new draft/published release before recording AC 1 PASS for Android.
- **Story 7.3 (done) — TestFlight crash fix** — the production iOS app crashed on startup until `EXPO_PUBLIC_API_URL` was baked into the build. Pattern to remember when validating the iOS channel: even a successful TestFlight upload doesn't prove the build is usable; the playbook's "install and run end-to-end smoke" step is the load-bearing iOS check, not the upload confirmation.
- **Story 7.2 (done) — Web pipeline** — the web build runs lint, typecheck, and `test:coverage` before deploy, and the Pulumi step only runs on `main`. Trust the pipeline for "current main is what's at `helpamunch.click`" — the web channel validation is therefore about reachability and metadata accuracy, not about build correctness.
- **Story 7.1 (done) — Release foundation** — established that match-based signing and documented secrets are reusable across developers. No direct dependency for 7.9, but worth noting: if the playbook is ever run by a second operator, the credentials they need are App Store Connect / Play Console reader access, not signing access. Be explicit about that in the playbook's Prerequisites section so the validation step does not get accidentally gated on signer credentials.

### Git Intelligence Summary

- Recent epic-7 commits (`6cd798f` story 7.5, `01f7605` monster avatar, `db49bae`/`2083707`/`57b5046` epic-6 history) show the codebase converging on a release-evidence pattern via planning artifacts (`_bmad-output/planning-artifacts/implementation-readiness-report-*.md`). 7.9's evidence files live under `docs/release-evidence/` instead — kept in the user-facing docs tree because they are release operations records, not BMad planning artifacts.
- `2026-05-01` ephemeral-native-folders refactor (`spec-ephemeral-native-folders.md`, status done) moved Fastlane to `frontend/fastlane/` and gitignored `frontend/ios/` and `frontend/android/`. The playbook's iOS/Android sections must not reference the old `frontend/ios/fastlane/` or `frontend/android/fastlane/` paths — those directories no longer exist on a clean checkout.

### Latest Technical Information

- **`expo export --platform web`** with `frontend/app.json` `"web": { "output": "static" }` produces pre-rendered HTML for every Expo Router route, so `/`, `/privacy`, and `/support` are reachable without client-side JavaScript. The web-channel reachability script can rely on a plain GET returning HTML.
- **TestFlight** does not expose an unauthenticated public API for reading build status. App Store Connect's official API requires the same `APP_STORE_CONNECT_KEY` already used by Story 7.3, but using it from a dev's machine to "validate" a build is overkill for this story — the playbook uses the App Store Connect web UI instead, which any operator with TestFlight access can use.
- **Google Play Console's Publishing API** (v3) does expose release-track status, but requires the same workload-identity federation used by Story 7.4. Same rationale as iOS: do not couple validation to the deploy pipeline's credentials. The Play Console web UI is sufficient for the operator-driven check.
- **Node 24** runs the validation script (matches the frontend Node baseline and the `setup-node@v4` Node 24 used by the existing scripts). Backend's Node 20 baseline is irrelevant here — this is a frontend/distribution-tier script.

### Project Context Reference

- See `_bmad-output/project-context.md` for the binding repo-wide rules. The ones most relevant to this story:
  - **"Do not leave documentation stale when behavior/config/contracts changed."** — this story exists to keep release availability documented; the deployment-guide edit and the new evidence subtree are deliberate.
  - **"Keep changes scoped to requested behavior; avoid incidental cross-service or cross-layer churn in one PR."** — directly reinforced by the Scope Guard.
  - **"Do not embed mutable runtime operational logic inside IaC definitions; keep infrastructure declarative."** — applies here as: do not move the validation logic into Pulumi or Fastlane. It lives in `scripts/` and `docs/`.
  - **"Add a regression test that would fail before the fix and pass after."** — the script tests (Task 3) cover the script's own contract; the playbook itself is a process artifact and is not test-covered (test coverage of plain Markdown is not meaningful).
  - **70% line coverage floor** — the new script must include tests (Task 3) to keep the repo above the existing floor; the tests do not need to exercise real network calls.
- See `feedback-blocked-story-status` (auto-memory): this story applies the exact pattern — ready-for-dev with a loud Scope Guard, a Task 0 prerequisite gate, deferred cross-story names, and documented variance for the 7.6 dependency.

### Project Structure Notes

- **New top-level dirs:** `docs/release-validation/` and `docs/release-evidence/`. Both live under the existing `docs/` tree to stay alongside `deployment-guide.md` and the architecture docs. No frontend, backend, infrastructure, or `_bmad-output/` changes.
- **`scripts/` is shared.** Existing scripts (`story-project-sync.mjs`, `ready-for-dev-orchestrator.mjs`, plus their test files) live there. The new `validate-web-channel.mjs` joins them following the same pattern.
- **No package.json edits required** beyond the optional addition of a script alias. If added at all, it must go in the root `package.json` (this is not a frontend-only concern), not `frontend/package.json`. Default position: do not add an alias for this story; the playbook's documented invocation is sufficient.
- **No npm dependency changes.** This is enforced by the Scope Guard and the Architecture Guardrails.

### Testing Standards Summary

- Test runner for the new script: `node --test` (matches `scripts/*.test.mjs` precedent). Vitest is the frontend/backend runner and is not used for top-level repo scripts.
- Test file naming: `<script>.test.mjs`, placed beside the script under `scripts/`.
- Mock external boundaries: stub `node:https` via a thin wrapper module the script imports; tests can substitute the wrapper without touching the network.
- The playbook and evidence template are Markdown — no test coverage is meaningful for them. The first run of Task 6 (filling out the template against the current release) is the integration check that the templates make sense in practice.
- Verification before marking done: `node --test scripts/validate-web-channel.test.mjs` passes; `node scripts/validate-web-channel.mjs --version <current>` runs against production without script-level errors (a real channel FAIL is a release issue, not a story issue); a fully filled evidence artifact for the current release exists under `docs/release-evidence/` and is linked from `docs/deployment-guide.md`.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.9]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#Cross-Platform Product Consistency] (FR40–FR44)
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#Product Supportability & Release Readiness] (FR47–FR48)
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements.md#Cross-Platform Consistency] (NFR7–NFR9)
- [Source: _bmad-output/implementation-artifacts/7-5-release-facing-compliance-content.md] (privacy/support URL contract this story depends on)
- [Source: _bmad-output/implementation-artifacts/7-3-automated-ios-delivery.md] (iOS pipeline + EXPO_PUBLIC_API_URL lesson)
- [Source: _bmad-output/implementation-artifacts/7-4-automated-android-delivery.md] (Android pipeline + cross-process Fastlane lesson)
- [Source: _bmad-output/implementation-artifacts/spec-ephemeral-native-folders.md] (current Fastlane layout under `frontend/fastlane/`)
- [Source: .github/workflows/frontend-infra-cd.yml] (web build + deploy pipeline)
- [Source: .github/workflows/ios-app-store-cd.yml] (iOS TestFlight delivery pipeline)
- [Source: .github/workflows/android-play-store-cd.yml] (Android Play internal-track delivery pipeline)
- [Source: frontend/app.json] (`expo.version`, `expo.ios.bundleIdentifier`, `expo.android.package`, `web.output: static`)
- [Source: infrastructure/index.ts:40] (`customDomainName = "helpamunch.click"`)
- [Source: docs/deployment-guide.md] (the file this story extends)
- [Source: scripts/story-project-sync.mjs] (ESM + `node --test` style precedent)
- [Source: scripts/ready-for-dev-orchestrator.mjs] (ESM + `node --test` style precedent)
- [Source: _bmad-output/project-context.md] (repo-wide rules — Cross-Platform Product Consistency, documentation freshness, scope discipline)
- [Source: auto-memory `feedback-blocked-story-status`] (Scope Guard + Task 0 gate + deferred names pattern)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-05-23: Story drafted and set to ready-for-dev with Scope Guard, Task 0 prerequisite gate (7.5/7.6), and deferred-names list for 7.6/7.7/7.8. Documented variance: AC 1's readiness-checklist reference is a placeholder until 7.6 ships.
