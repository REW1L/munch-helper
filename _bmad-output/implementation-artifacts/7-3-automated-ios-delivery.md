# Story 7.3: Automated iOS Delivery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team,
I want the iOS pipeline to build, sign, and deliver the app to TestFlight automatically,
So that iOS releases are repeatable and do not depend on manual intervention.

## Acceptance Criteria

1. **Given** a push to the release branch
   **When** the iOS GitHub Actions workflow runs
   **Then** it invokes the configured Fastlane iOS lane

2. **Given** the iOS workflow runs
   **When** Fastlane executes the `beta` lane
   **Then** match pulls the correct provisioning profiles and certificates using repository secrets

3. **Given** signing completes successfully
   **When** the build and upload steps run
   **Then** a signed `.ipa` is produced and delivered to TestFlight

4. **Given** required secrets are absent or signing/delivery cannot be completed
   **When** the workflow runs
   **Then** the workflow fails with actionable logs identifying the missing or failing step

## Tasks / Subtasks

- [x] Task 1: Verify Fastlane `beta` lane covers the full build-sign-upload flow (AC: 1, 2, 3)
  - [x] Confirm `frontend/ios/fastlane/Fastfile` `beta` lane invokes `sync_code_signing`, `build_app`, and `upload_to_testflight`
  - [x] Confirm `frontend/ios/fastlane/Matchfile` references `MATCH_GIT_URL` and uses `storage_mode("git")`
  - [x] Confirm `frontend/ios/fastlane/Appfile` references `APPLE_ID`, `APPLE_CONNECT_TEAM_ID`, and `APPLE_DEVELOPER_TEAM_ID` from environment

- [x] Task 2: Verify GitHub Actions workflow wires all required secrets into the Fastlane environment (AC: 1, 2, 3)
  - [x] Confirm `.github/workflows/ios-app-store-cd.yml` triggers on push to `main`
  - [x] Confirm all match and App Store Connect secrets are mapped into the job environment
  - [x] Confirm SSH agent is configured for match git access using `MATCH_GIT_DEPLOY_KEY`
  - [x] Confirm App Store Connect API key is written to the path referenced by `APP_STORE_CONNECT_KEY_PATH`

- [x] Task 3: Add `Validate Required Inputs` step for actionable failure logs (AC: 4)
  - [x] Add a shell step before dependency installation that checks all required secrets are non-empty
  - [x] Emit a clear error message naming the missing secret and exit with a non-zero code

## Dev Notes

### Story Foundation

- Story 7.3 builds on the release foundation from Story 7.1 (match-based certificate management, documented secrets) and the web pipeline from Story 7.2.
- The partial implementation already included a complete `ios-app-store-cd.yml` workflow and a fully-configured Fastlane `beta` lane. The story completion adds the missing input-validation guard.

### Architecture Guardrails

- All signing material is managed exclusively through Fastlane match; no local certificate state is required.
- The workflow uses the `iOS` GitHub Actions environment to gate secret access.
- Build artifacts are not retained as GitHub Actions artifacts; TestFlight serves as the durable build store.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.3]
- [Source: .github/workflows/ios-app-store-cd.yml]
- [Source: frontend/ios/fastlane/Fastfile]
- [Source: frontend/ios/fastlane/Matchfile]
- [Source: frontend/ios/fastlane/Appfile]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5

### Debug Log References

- Reviewed `.github/workflows/ios-app-store-cd.yml` against story ACs
- Reviewed `frontend/ios/fastlane/Fastfile`, `Matchfile`, and `Appfile`
- Compared against `.github/workflows/android-play-store-cd.yml` for `Validate Required Inputs` pattern

### Completion Notes List

- Confirmed the existing `ios-app-store-cd.yml` workflow and Fastlane `beta` lane fully satisfy AC 1–3.
- Added `Validate Required Inputs` step to `ios-app-store-cd.yml` before dependency installation to satisfy AC 4, consistent with the Android workflow pattern.
- The step checks all nine required secrets (`APP_STORE_CONNECT_KEY`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APPLE_ID`, `APPLE_CONNECT_TEAM_ID`, `APPLE_DEVELOPER_TEAM_ID`, `MATCH_PASSWORD`, `MATCH_GIT_URL`, `MATCH_GIT_DEPLOY_KEY`) and exits with a named error on the first missing value.

### File List

- _bmad-output/implementation-artifacts/7-3-automated-ios-delivery.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .github/workflows/ios-app-store-cd.yml

### Change Log

- 2026-04-01: Created Story 7.3 implementation artifact and completed the iOS CD pipeline by adding the `Validate Required Inputs` step for actionable failure logs.
