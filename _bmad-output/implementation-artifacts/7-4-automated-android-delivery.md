# Story 7.4: Automated Android Delivery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team,
I want the Android pipeline to build, sign, and deliver the app to the Play internal track automatically,
So that Android releases are repeatable and do not depend on manual intervention.

## Acceptance Criteria

1. **Given** a push to the release branch
   **When** the Android GitHub Actions workflow runs
   **Then** it invokes the configured Fastlane Android lane

2. **Given** the Android workflow runs
   **When** the signing and delivery steps execute
   **Then** the keystore and Play credentials are correctly mapped from repository secrets

3. **Given** signing completes successfully
   **When** the build and upload steps run
   **Then** a signed `.aab` is produced and delivered to the Play internal track

4. **Given** required secrets are absent or signing/delivery cannot be completed
   **When** the workflow runs
   **Then** the workflow fails with actionable logs identifying the missing or failing step

## Tasks / Subtasks

- [x] Task 1: Verify the Android workflow invokes the intended Fastlane lane split for build and upload (AC: 1, 3)
  - [x] Confirm `.github/workflows/android-play-store-cd.yml` triggers on pushes to `main`
  - [x] Confirm the workflow runs `bundle exec fastlane build` and `bundle exec fastlane deploy` instead of relying on a single opaque lane
  - [x] Confirm `frontend/android/fastlane/Fastfile` defines `build`, `deploy`, and `beta` lanes aligned to the Play internal track flow

- [x] Task 2: Verify Android signing and Play authentication are wired from repository secrets (AC: 2, 3)
  - [x] Confirm `ANDROID_SIGNING_KEY`, `ANDROID_SIGNING_KEY_PASSWORD`, and `ANDROID_SIGNING_KEY_ALIAS` are mapped into the workflow/runtime
  - [x] Confirm the workflow restores the base64-encoded keystore to `ANDROID_SIGNING_KEY_PATH`
  - [x] Confirm Google Play authentication is performed through `google-github-actions/auth@v2` using `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT`

- [x] Task 3: Ensure the Fastlane configuration supports the repository's signing setup and Play internal track delivery (AC: 1, 2, 3)
  - [x] Update `frontend/android/fastlane/Fastfile` so the signing key alias can be provided via `ANDROID_SIGNING_KEY_ALIAS`
  - [x] Add an explicit `deploy` lane that uploads the signed release bundle to the Play internal track as a draft
  - [x] Regenerate/update `frontend/android/fastlane/README.md` so lane documentation matches the current contract

- [x] Task 4: Ensure missing configuration fails early with actionable logs and the production Android build gets runtime API configuration (AC: 4)
  - [x] Confirm `Validate Required Inputs` checks `ANDROID_SIGNING_KEY`, `ANDROID_SIGNING_KEY_PASSWORD`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and `EXPO_PUBLIC_API_URL`
  - [x] Confirm the workflow sets `EXPO_PUBLIC_API_URL` from `vars.API_BASE_URL || secrets.API_BASE_URL`
  - [x] Confirm the validation step exits with a named error on the first missing required input

## Dev Notes

### Story Foundation

- Story 7.4 extends the release foundation from Story 7.1 and mirrors the operational pattern used by Story 7.3 for explicit workflow input validation.
- The implementation landed in commit `8c4aa92` (`feat: implement story 7.4 — automated Android Play Store delivery (#14)`), which also moved the sprint tracker and epic source of truth to `done`.

### Architecture Guardrails

- The GitHub Actions workflow uses the `Android` environment to gate access to signing and Play deployment credentials.
- Android signing is injected at Gradle runtime via `android.injected.signing.*` properties instead of depending on checked-in keystore configuration.
- Play authentication is performed through Google workload identity and service account federation, not a checked-in JSON key file.
- The workflow intentionally separates `build` and `deploy` so build/signing and store upload failures are easier to isolate in logs.
- `EXPO_PUBLIC_API_URL` must be present for production mobile builds because the frontend runtime expects a non-development API base URL.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.4]
- [Source: .github/workflows/android-play-store-cd.yml]
- [Source: frontend/android/fastlane/Fastfile]
- [Source: frontend/android/fastlane/README.md]
- [Source: docs/deployment-guide.md]
- [Source: git commit 8c4aa9224664e22fce8505554d4107abf8eba0e6]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

- Reviewed `.github/workflows/android-play-store-cd.yml` against Story 7.4 acceptance criteria
- Reviewed `frontend/android/fastlane/Fastfile` and generated `frontend/android/fastlane/README.md`
- Reviewed commit `8c4aa92` to capture the exact workflow, Fastlane, and status changes that completed the story

### Completion Notes List

- Confirmed the Android CD workflow now injects `ANDROID_SIGNING_KEY_ALIAS` and `EXPO_PUBLIC_API_URL` at the job level.
- Confirmed `Validate Required Inputs` now checks `EXPO_PUBLIC_API_URL` in addition to the Android signing and GCP federation secrets, providing an early named failure when configuration is missing.
- Confirmed the upload step now calls `bundle exec fastlane deploy`, making the upload phase explicit and aligning it with the new dedicated `deploy` lane in `frontend/android/fastlane/Fastfile`.
- Confirmed `frontend/android/fastlane/Fastfile` now accepts the signing key alias from `ANDROID_SIGNING_KEY_ALIAS || "upload-key-alias"`, which removes an unnecessary hard-coded alias assumption.
- Confirmed Play delivery remains targeted at the `internal` track with `release_status: "draft"`, satisfying the story's requirement for repeatable internal-track delivery.
- Confirmed the planning epic and sprint tracker were updated in the same implementation commit to mark Story 7.4 as complete.

### File List

- _bmad-output/implementation-artifacts/7-4-automated-android-delivery.md
- .github/workflows/android-play-store-cd.yml
- frontend/android/fastlane/Fastfile
- frontend/android/fastlane/README.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md

### Change Log

- 2026-04-01: Created the Story 7.4 implementation artifact with status set to `done` based on the existing Android delivery implementation and commit `8c4aa92`.
- 2026-04-01: Recorded that the completing implementation added runtime support for `ANDROID_SIGNING_KEY_ALIAS`, made Play upload an explicit `deploy` lane, validated `EXPO_PUBLIC_API_URL`, and marked the story complete in the sprint and epic trackers.
