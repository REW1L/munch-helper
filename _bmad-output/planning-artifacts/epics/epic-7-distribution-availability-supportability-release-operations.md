# Epic 7: Distribution, Availability, Supportability & Release Operations

Users can access Munch Helper through web and mobile distribution channels, while the team can ship updates quickly and reliably through collaborative development workflows, automated deployment pipelines, supportability instrumentation, and release-readiness operations.

## Story 7.1: Collaborative Release Foundation `[DONE]`

As a developer,
I want a shared release foundation for signing, secrets, infrastructure references, and release conventions,
So that multiple developers can contribute and ship without breaking the delivery workflow.

**Acceptance Criteria:**

**Given** a developer is preparing a release change
**When** they review the project release setup
**Then** the repository contains documented Fastlane lanes, signing approach, required secrets, and production infrastructure references
**And** iOS signing uses match-based certificate management
**And** the release setup is usable by more than one developer without relying on undocumented local machine state

## Story 7.2: Web Availability Pipeline `[DONE]`

As a user,
I want the current web version of Munch Helper to be deployed automatically,
So that the web channel stays available without manual release work.

**Acceptance Criteria:**

**Given** a push to the release branch
**When** the web release workflow runs
**Then** the web build completes successfully and is deployed to production
**And** the live web version reflects the current release branch state
**And** no manual deployment step is required to make the web release available

## Story 7.3: Automated iOS Delivery `[TODO]`

As a team,
I want the iOS pipeline to build, sign, and deliver the app to TestFlight automatically,
So that iOS releases are repeatable and do not depend on manual intervention.

**Acceptance Criteria:**

**Given** a push to the release branch
**When** the iOS GitHub Actions workflow runs
**Then** it invokes the configured Fastlane iOS lane
**And** match pulls the correct provisioning profiles and certificates using repository secrets
**And** a signed `.ipa` is produced and delivered to TestFlight
**And** the workflow fails with actionable logs if signing or delivery cannot be completed

## Story 7.4: Automated Android Delivery `[DONE]`

As a team,
I want the Android pipeline to build, sign, and deliver the app to the Play internal track automatically,
So that Android releases are repeatable and do not depend on manual intervention.

**Acceptance Criteria:**

**Given** a push to the release branch
**When** the Android GitHub Actions workflow runs
**Then** it invokes the configured Fastlane Android lane
**And** the keystore and Play credentials are correctly mapped from repository secrets
**And** a signed `.aab` is produced and delivered to the Play internal track
**And** the workflow fails with actionable logs if signing or delivery cannot be completed

## Story 7.5: Release-Facing Compliance Content `[TODO]`

As a user,
I want the privacy and support pages to reflect the current app behavior and support path,
So that I can trust the published release information and stores can review the app accurately.

**Acceptance Criteria:**

**Given** I open the privacy page from the app or its public URL
**When** the page loads
**Then** it reflects the current app scope including anonymous identity, session data, and room participation behavior
**And** the content is readable and accessible on supported screen sizes
**And** the URL is stable for store submission use

**Given** I open the support page from the app or its public URL
**When** the page loads
**Then** it reflects the current app features and provides a clear support path for the current release
**And** the content is readable and accessible on supported screen sizes

## Story 7.6: Cross-Platform Release Readiness Checklist `[TODO]`

As a team,
I want an explicit release-readiness checklist for the cross-platform core session experience,
So that we can decide whether a release is shippable based on defined criteria instead of assumptions.

**Acceptance Criteria:**

**Given** a candidate release
**When** the team runs the release-readiness review
**Then** there is a documented checklist covering iOS, Android, and web core session flows
**And** the checklist includes room, character, battle, log, and session-continuity validation
**And** the checklist captures known failure categories and release blockers clearly enough for go/no-go decisions
**And** the checklist includes the known WCAG AA contrast exception: `accent` (#D4C26E) on `surfaceWarm` (#8A6150) at ~4.2:1 (below 4.5:1), mitigated by bold weight, text shadow, and darkened background — requiring explicit sign-off before release

## Story 7.7: Supportability Signals & Failure Taxonomy `[TODO]`

As a support team member,
I want core session failures to emit clear, subsystem-specific diagnostic signals,
So that I can quickly identify whether a problem is caused by room state, character state, battle state, log history, or session continuity.

**Acceptance Criteria:**

**Given** a failure occurs in a core room, character, battle, log, or session-continuity flow
**When** the failure is surfaced through the product's defined supportability surfaces
**Then** the failure emits a structured classification signal that includes at minimum a subsystem category, a stable error code or failure type, and a correlation identifier
**And** the classification signal is visible in structured backend logs and documented in the release-support reference used by support and engineering
**And** the signal includes enough contextual metadata to correlate the failure to the affected room or session without exposing unrelated user data
**And** the classification scheme defines distinct categories for room state, character state, battle state, log history, and session continuity so support and engineering interpret failures consistently

## Story 7.8: Diagnostic Validation Matrix `[TODO]`

As a QA engineer,
I want a repeatable validation matrix for core session failure modes,
So that FR45 and FR46 can be verified with evidence before a release is approved.

**Acceptance Criteria:**

**Given** a candidate release
**When** QA executes the diagnostic validation matrix
**Then** the matrix covers at least one injected or simulated failure for room, character, battle, log, and session-continuity flows
**And** each scenario defines the expected subsystem category, failure signal, and supportability surface that must be observed
**And** each scenario passes only when support can both identify the failure and distinguish its subsystem classification from the other four categories without ambiguity
**And** any missing, misclassified, or non-observable failure signal is recorded as a release blocker until corrected or explicitly waived
**And** the validation output is recorded in a durable release evidence artifact alongside the cross-platform readiness review

## Story 7.9: Release Channel Availability Validation `[TODO]`

As a user,
I want to be able to access the current release from each intended distribution channel,
So that the completed app is actually available where I expect to get it.

**Acceptance Criteria:**

**Given** a release has passed the readiness checklist
**When** channel availability is validated
**Then** the current release is reachable on the intended web, iOS, and Android distribution channels
**And** store or channel metadata does not misrepresent the supported core session experience
**And** no intended channel is treated as release-ready while missing a materially incomplete core workflow
