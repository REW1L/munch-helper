# Cross-Platform Release Readiness Checklist

This is the single go/no-go checklist for a Munch Helper candidate release across iOS, Android, and web. Use one checklist per release: either copy this file into the release review PR/issue, create a dated snapshot under `docs/release-history/` at release time, or record outcomes in a linked review issue that preserves the same item text.

Every checkable line uses a platform prefix: `[All]`, `[iOS]`, `[Android]`, `[Web]`, or `[iOS+Android]`. For each applicable platform, record `Pass`, `Fail`, or `N/A` beside the item when executing the review. A release is `Go` only when every required item is `Pass` on every applicable platform and every known exception or waiver has a named sign-off.

## Release Identity

- Release version:
- Git ref / commit SHA:
- Web deploy artifact / CloudFront distribution:
- TestFlight build number:
- Play internal build number:
- Reviewer name(s):
- Review date:
- Evidence location:
- Final decision: Go / No-Go

## Pipelines & Distribution

- [ ] [Web] `.github/workflows/frontend-infra-cd.yml` succeeded for the candidate release commit; `npm run export:web` produced the web artifact, Pulumi published it through `infrastructure/index.ts`, `https://helpamunch.click` serves the build, and the workflow's required-input validation confirmed the production API URL used by `EXPO_PUBLIC_API_URL`.
- [ ] [iOS] `.github/workflows/ios-app-store-cd.yml` succeeded for the candidate release commit; Fastlane `beta` produced a signed `.ipa`, `upload_to_testflight` accepted the build, the `Validate Required Inputs` step passed for `MATCH_*`, `APP_STORE_CONNECT_*`, and `EXPO_PUBLIC_API_URL`, and the TestFlight build number is recorded in the Release Identity block.
- [ ] [Android] `.github/workflows/android-play-store-cd.yml` succeeded for the candidate release commit; Fastlane `build` and `deploy` both succeeded, the signed `.aab` was uploaded to the Play internal track with `release_status: "draft"`, `ANDROID_SIGNING_KEY*`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and `EXPO_PUBLIC_API_URL` validation passed, and the Play internal build number is recorded in the Release Identity block.
- [ ] [All] `.github/workflows/backend-ci-cd.yml` succeeded for the same commit and SAM deploy completed without failed Lambda deployments for `battle-service`, `log-service`, `character-service`, `room-service`, `user-service`, or `room-notifications-service`; expected: the deployed APIs and WebSocket endpoints serve the candidate client without service-specific deployment errors.
- [ ] [All] Required workflow secrets and variables are present because each workflow's `Validate Required Inputs` step passed; expected: no release pipeline succeeds by silently falling back to missing signing, store, API, AWS, or GCP configuration.

## Core Session Flow

### Room Management

- [ ] [All] Create a room from a fresh session; expected: room creation completes within 3 seconds and the user lands on Room View.
- [ ] [All] Open Room View for the created room; expected: the room code is visible in the header.
- [ ] [All] Use the room-code copy button in the header; expected: the clipboard contains the visible room code.
- [ ] [All] Join the same room from a second session with the existing player identity; expected: the participant list shows exactly one entry for the rejoining player.

### Character Management

- [ ] [All] Join a room without an existing character; expected: a character is automatically created and shown for the player.
- [ ] [All] Inspect a character card on Room View; expected: avatar, name, level, power, class, race, and gender are visible.
- [ ] [All] Open QuickEditSheet and change level and power; expected: the saved values appear on the card and remain after the sheet closes.
- [ ] [All] Open the full edit modal and change character attributes; expected: all saved attribute changes are reflected in the card/details view.
- [ ] [All] Remove a character; expected: the card disappears from the room and a corresponding room-history log entry is emitted.
- [ ] [All] Change a character from another client; expected: the remote character card shows the realtime flash/update signal and displays the new values.
- [ ] [iOS+Android] Enable the OS reduced-motion setting before joining a room; expected: realtime character updates and QuickEditSheet state changes remain usable without motion-heavy animation.

### Battle Management

- [ ] [All] Start a battle from Room View; expected: the battle opens and only one active battle is allowed for the room.
- [ ] [All] Attempt to start a second active battle in the same room; expected: the server returns `409` and the UI surfaces the conflict without crashing.
- [ ] [All] Return to Room View while a battle is active; expected: the active-battle indicator appears from the HTTP-on-mount state and remains synced by WebSocket updates.
- [ ] [All] Edit battle name, player side, and monster side; expected: the PATCH full-replace update is reflected for every connected client.
- [ ] [All] Conclude a battle with a result; expected: the battle enters the `concluded` state and the result is visible.
- [ ] [All] Discard an active battle; expected: the battle enters the `discarded` state and the active-battle indicator clears from Room View.
- [ ] [All] Change a character that is involved in the active battle; expected: battle participants or totals update for connected clients without manual refresh.

### Room History

- [ ] [All] Perform a character action such as edit or remove; expected: the corresponding character event appears in room history.
- [ ] [All] Start, update, conclude, or discard a battle; expected: the corresponding battle lifecycle event appears in room history.
- [ ] [All] Tap a concluded-battle history entry; expected: the completed battle opens in a read-only/completed-battle view.
- [ ] [All] Scroll through paginated history using the cursor; expected: older events load without duplicate entries, lost cursor state, or scroll-back gaps.
- [ ] [All] Add a new room event while history is open; expected: the latest event appears at the top of the list.

### Session Continuity

- [ ] [iOS+Android] Background and re-foreground the app within 5 seconds while in a room; expected: Room View restores without forcing the user through navigation again.
- [ ] [All] Interrupt and restore the WebSocket connection; expected: the reconnecting banner appears while disconnected and clears after reconnection.
- [ ] [All] Join an already active room from a new client; expected: the late-joining client sees current room, character, battle, and history context without manual refresh.
- [ ] [iOS+Android] Cold-start the app with a persisted local `user` AsyncStorage key; expected: the same player identity is restored and no duplicate player is created.
- [ ] [Web] Refresh the room page for an existing session; expected: the web client returns to usable room context or presents a clear actionable recovery path.

## Failure Mode & Release Blockers

Any checked failure signature in this section is a release blocker by default. A release can proceed only if the issue is fixed or a named waiver is recorded with scope, owner, and date.

Waiver owner: ____ Scope: ____ Date: ____

### room state

- [ ] [All] Release blocker: a created room is not visible in the URL after creation; expected: the reviewer can identify this as a room state failure and stop the release.
- [ ] [All] Release blocker: joining a valid room code returns a non-actionable error; expected: the reviewer can distinguish this from character, battle, log, or session-continuity failures.
- [ ] [All] Release blocker: re-entering an existing room duplicates the player; expected: the participant list shows the room state is inconsistent.

### character state

- [ ] [All] Release blocker: the auto-created character does not appear after joining; expected: the reviewer can identify the missing character state independently of room creation.
- [ ] [All] Release blocker: a saved character edit reverts on the next render; expected: the reviewer can identify persisted character state drift.
- [ ] [All] Release blocker: a removed character remains visible to another client; expected: connected clients agree on character state without manual refresh.

### battle state

- [ ] [All] Release blocker: a second battle can be started while one is already active, or the `409` conflict is not surfaced; expected: the active battle invariant is visibly broken.
- [ ] [All] Release blocker: conclude or discard leaves the active-battle indicator on Room View; expected: the reviewer can identify stale battle state.
- [ ] [All] Release blocker: battle edits are not reflected for connected clients; expected: connected clients share the same battle state.

### log history

- [ ] [All] Release blocker: a character or battle action does not appear in history after a reasonable refresh; expected: the reviewer can identify a missing log history event.
- [ ] [All] Release blocker: history pagination loses position, skips events, or duplicates entries; expected: the reviewer can identify cursor or list-order failure.
- [ ] [All] Release blocker: tapping a concluded-battle history entry does not open the completed battle; expected: the reviewer can identify history drill-in failure.

### session continuity

- [ ] [All] Release blocker: the app fails to restore the room after backgrounding or refresh; expected: the reviewer can identify session continuity failure.
- [ ] [All] Release blocker: the reconnecting banner does not appear during WebSocket loss or does not clear after reconnect; expected: the reviewer can identify connection-state recovery failure.
- [ ] [All] Release blocker: a late-joining client sees stale room context until manual refresh; expected: the reviewer can identify late-join continuity failure.

When Stories 7.7 (Supportability Signals) and 7.8 (Diagnostic Validation Matrix) land, the failure-signature lines here will be replaced or augmented with the structured failure codes / correlation IDs they emit, and 7.8 will provide the injected-failure validation matrix that proves these signals are observable. Until then, this section relies on user-visible behaviour.

## Accessibility & Compliance Exceptions

- [ ] [All] Confirm the known contrast exception is still exactly this exception: `accent` `#D4C26E` on `surfaceWarm` `#8A6150` is approximately 4.2:1, below the 4.5:1 WCAG AA threshold for normal text. Mitigations on record: bold weight on stat values, text shadow `rgba(0,0,0,0.4)` on character names, and `surfaceWarm` darkened from `#A67560` to `#8A6150` in Story 3.6. Source: `_bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#13.3-13.4`.
- [ ] [All] Obtain explicit named approval for the contrast exception before marking the release `Go`; accepted by: ____ Date: ____.
- [ ] [All] Spot-check the other documented contrast ratios still hold: `textPrimary`/`background` approximately 9.5:1 AAA, `accent`/`background` approximately 5.8:1 AA, `textMuted`/`surface` approximately 5.2:1 AA, and `textMuted`/`elevated` approximately 4.8:1 AA; expected: any drift below the documented threshold is a release blocker, not a waivable checklist pass.
- [ ] [iOS+Android] Run VoiceOver / TalkBack on Room View and QuickEditSheet; expected: accessibility labels and roles match the rendered controls described in UX spec sections 13.5 and 13.8.
- [ ] [iOS] Run Xcode Accessibility Inspector colour filters for Deuteranopia and Protanopia on Room View and QuickEditSheet; expected: accent-coloured elements remain understandable because colour is paired with bold weight or affordance shape.
- [ ] [All] Open `https://helpamunch.click/privacy` and `https://helpamunch.click/support` for the deployed candidate web build; expected: the pages render the current effective date and correct release-facing content used by iOS App Store and Google Play submissions.

## Release Evidence Record

- [ ] [All] Preserve per-release evidence as a filled-in copy of `docs/release-readiness-checklist.md` whenever possible; expected: the copied record contains the Release Identity block, per-item Pass/Fail/N/A outcomes, named sign-offs, dates, and final Go/No-Go decision.
- [ ] [All] If a filled-in copy is not used, preserve a dated review issue or PR that links to the commit SHA, web artifact or CloudFront distribution, TestFlight build number, Play internal build number, and per-item Pass/Fail/N/A outcomes; expected: a past release decision can be reconstructed without relying on memory.
- [ ] [All] At release time, store the preferred filled-in copy under `docs/release-history/YYYY-MM-DD-<release-version>.md`; expected: the folder is created by the first real release review, not by this checklist story.
- [ ] [All] If the team chooses a different evidence system such as Linear, Confluence, or a GitHub issue label, record that exact location in the Evidence location field for the release and keep using the same location for future releases.

## Link And Artifact Verification

- [ ] [All] Confirm these workflow files exist in the candidate commit: `.github/workflows/backend-ci-cd.yml`, `.github/workflows/frontend-infra-cd.yml`, `.github/workflows/ios-app-store-cd.yml`, and `.github/workflows/android-play-store-cd.yml`; expected: no referenced workflow is aspirational or missing.
- [ ] [All] Confirm these public URLs render without HTTP or SPA routing errors: `https://helpamunch.click`, `https://helpamunch.click/privacy`, and `https://helpamunch.click/support`; expected: each URL is usable by release reviewers and store reviewers.
- [ ] [All] Confirm these local route files exist in the candidate commit: `frontend/app/privacy.tsx` and `frontend/app/support.tsx`; expected: privacy and support pages are owned by real Expo Router routes.
- [ ] [All] Confirm `infrastructure/index.ts` still defines the `helpamunch.click` distribution path; expected: the checklist's public URL references match the deployable infrastructure.
- [ ] [All] Confirm `frontend/constants/theme.ts` still defines `accent: '#D4C26E'` and `surfaceWarm: '#8A6150'`; expected: the accessibility exception text reflects the actual candidate theme values.
- [ ] [All] Read this checklist top to bottom before approval; expected: every checkable item has a platform prefix, observable pass/fail behaviour, and a place in the release evidence record.
