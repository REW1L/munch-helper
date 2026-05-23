# Story 7.8: Diagnostic Validation Matrix

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Scope Guard

**This story is hard-blocked by Story 7.7 (Supportability Signals & Failure Taxonomy) and softly dependent on Story 7.6 (Cross-Platform Release Readiness Checklist).** Both are `backlog` at the time this story was contexted. Run **Task 0** before any other work. The story is held `ready-for-dev` (not `backlog`) so the dev agent has the full context already prepared the moment the prerequisites land.

**Scope this story DOES own:**

- The **matrix template** (columns/schema) used to plan and record diagnostic validation runs.
- The **scenario catalogue**: one or more concrete failure-injection scenarios per subsystem (room, character, battle, log, session-continuity).
- The **execution procedure** (when QA runs the matrix, against which build, where evidence lands).
- The **gate criteria**: when a scenario passes, when it fails, when it is a release blocker, and how a blocker can be waived.
- The **link** from a completed matrix run into the cross-platform release evidence surface owned by Story 7.6.

**Scope this story DOES NOT own (defer to the owning story):**

- The names and values of subsystem **category strings**, structured **error codes / failure types**, and **correlation ID propagation** mechanics — owned by Story 7.7. Reference these by role ("the subsystem category for room state failures") and pin actual identifiers only after 7.7 lands.
- The supportability **surface(s)** where signals are observed (backend structured logs, CloudWatch dashboard, support reference doc, etc.) — owned by Story 7.7. Reference these by role ("the documented supportability surface") and only pin the concrete surface after 7.7 lands.
- The **release evidence artifact** filename, location, and structure — owned by Story 7.6. This story writes into whatever artifact Story 7.6 defines; if 7.6 is not yet landed, follow Task 0 (defer or coordinate).
- Adding, removing, or renaming subsystem categories beyond the five FR45/FR46 categories (room, character, battle, log, session-continuity).
- Implementing the supportability instrumentation itself (that is Story 7.7's deliverable; this story validates it).

## Story

As a QA engineer,
I want a repeatable validation matrix for core session failure modes,
So that FR45 and FR46 can be verified with evidence before a release is approved.

## Acceptance Criteria

1. **Given** a candidate release with Story 7.7's supportability signals in place
   **When** QA executes the diagnostic validation matrix
   **Then** the matrix covers at least one injected or simulated failure for each of the five subsystems: room state, character state, battle state, log history, and session continuity
   **And** every scenario specifies a deterministic, repeatable injection method (no "wait for a real outage")

2. **Given** the matrix is being prepared for execution
   **When** a reviewer reads any single scenario
   **Then** the scenario explicitly names: (a) the expected subsystem category from Story 7.7's taxonomy, (b) the expected failure signal contents (at minimum: stable error code/failure type, subsystem category, and correlation identifier — exact field names deferred to Story 7.7), and (c) the supportability surface where the signal must be observed (the surface(s) named in Story 7.7)

3. **Given** QA executes a scenario
   **When** the scenario completes
   **Then** the scenario is recorded as `pass` only if support can both **identify** that a failure occurred and **distinguish** its subsystem category from the other four categories without ambiguity, using only the signals available on the documented supportability surface (no source-code reading)
   **And** the scenario is recorded as `fail` otherwise, with a captured note of what was missing, misclassified, or non-observable

4. **Given** any scenario is recorded as `fail`
   **When** the release-readiness review (Story 7.6) evaluates the matrix
   **Then** that scenario is treated as a release blocker until the underlying signal is corrected (a new run reaches `pass`) or the blocker is explicitly waived in writing (waiver names the scenario, reason, accepting decision-maker, and follow-up commitment) and recorded alongside the matrix run

5. **Given** a matrix run is complete
   **When** the release evidence is assembled for the cross-platform release-readiness review (Story 7.6)
   **Then** the matrix run output is a **durable artifact** stored alongside (or linked from) the readiness checklist artifact owned by Story 7.6
   **And** the artifact captures: the matrix version executed, the release candidate identifier under test, the date, the operator, the per-scenario `pass`/`fail` outcome, the observed signals (or the reason none were observable), and any waivers
   **And** a release cannot be marked "release-ready" by the Story 7.6 review without a matrix run for the same candidate that is either all-pass or has only explicitly-waived failures

## Tasks / Subtasks

- [ ] **Task 0 — Prerequisite Gate (BLOCKING)** (AC: 1, 2, 5)
  - [ ] Verify Story 7.7 (`7-7-supportability-signals-failure-taxonomy.md`) status is `done` in `_bmad-output/implementation-artifacts/sprint-status.yaml`. If not `done`, **HALT** and report: "Story 7.8 is blocked by Story 7.7 (Supportability Signals & Failure Taxonomy). The matrix cannot define expected categories, signal field names, or surfaces until 7.7 establishes the taxonomy." Do not invent placeholder names.
  - [ ] Verify Story 7.6 (`7-6-cross-platform-release-readiness-checklist.md`) status is at least `ready-for-dev` (preferably `done`) in `sprint-status.yaml`. If `backlog`, **HALT** and report: "Story 7.8 is blocked by Story 7.6 (Cross-Platform Release Readiness Checklist). The matrix output must land in 7.6's release evidence artifact; 7.6 owns its location/structure." If 7.6 is `ready-for-dev` or `in-progress` but not `done`, coordinate with the 7.6 dev agent / owner before pinning artifact paths; do not invent artifact filenames.
  - [ ] Once both gates pass, capture in this story's **Dev Notes → Variances** section: (a) the actual subsystem category identifiers chosen by 7.7, (b) the actual signal field names (error code / failure type / correlation id), (c) the actual supportability surface(s) named by 7.7, and (d) the actual release evidence artifact path/structure chosen by 7.6. Replace every `<7.7-owned: ...>` and `<7.6-owned: ...>` placeholder in Tasks 1–6 with the real values from those stories before continuing.

- [ ] **Task 1 — Define the matrix template** (AC: 1, 2)
  - [ ] Create `docs/release/diagnostic-validation-matrix.md` (path tentative — confirm against the location pattern Story 7.6 established for release artifacts; if 7.6 chose a different release-docs root, place the file there instead).
  - [ ] At the top, link to Story 7.7's supportability reference (the canonical doc that lists the taxonomy and surfaces) and Story 7.6's release-readiness checklist artifact. These two links are the matrix's contractual inputs.
  - [ ] Define the scenario table schema (one row per scenario). Required columns: `scenario_id` (stable identifier, e.g. `RM-01`, `CH-01`), `subsystem` (one of the five FR45/FR46 categories), `description` (one-line user-facing summary), `injection_method` (the deterministic step-by-step way to provoke the failure — see Task 2), `expected_category` (the exact category string from <7.7-owned: taxonomy>), `expected_signal` (the exact field names + example values from <7.7-owned: signal contract>, including stable error code/failure type and a correlation identifier), `expected_surface` (the exact <7.7-owned: supportability surface(s)> where the signal must appear), `pass_criteria` (how QA confirms identification AND distinguishability per AC 3), `result` (`pass` | `fail` | `waived` — filled at run time), `observed_signal_snippet` (filled at run time — paste of what was actually seen), `notes` (filled at run time — gaps, deviations).
  - [ ] Add a "How to read this matrix" preamble that explains: matrix vs run, the per-scenario pass/fail/waiver rule (AC 3, 4), and that the matrix is the *plan* — each execution produces a separate dated *run* artifact (see Task 5).

- [ ] **Task 2 — Populate the scenario catalogue** (AC: 1, 2, 3)
  - [ ] Provide **at least one** scenario per subsystem. Use prefixes: `RM-` (room), `CH-` (character), `BT-` (battle), `LG-` (log history), `SC-` (session continuity). Recommended floor: one each; add additional scenarios per subsystem if Story 7.7's taxonomy splits a category further (e.g. distinct "room state read" vs "room state write" failures).
  - [ ] For each scenario, make the **injection method** concrete and deterministic. Acceptable injection vectors (pick whichever is least invasive and most repeatable for the failure being targeted):
    - **HTTP-level fault injection** against a service endpoint (e.g. send a malformed payload, send a request with `roomId` for a non-existent room, send a PATCH to a battle in `concluded` state to trigger the 409 status guard, request `GET /battles?roomId=X` with an unindexed `roomId` to provoke a 404 / empty path).
    - **Infra-level fault injection** in a controlled environment (e.g. block the SNS topic ARN by revoking the publisher's `sns:Publish` IAM permission against a non-prod stack to provoke a publish-failure path, point the service at an unreachable Mongo URI to provoke a connection failure).
    - **Network/runtime fault injection** for session-continuity scenarios (e.g. force a WebSocket disconnect via the OS network conditioner / kill the Redis container locally for `room-notifications-service`).
    - **Synthetic event injection** for log-history scenarios (e.g. publish an SNS message that violates the event payload contract — missing `roomId` — and verify `log-service`'s subscriber surfaces it correctly).
  - [ ] For each scenario, the expected category MUST be one of the five FR45/FR46 categories. The scenario passes only when support can both confirm a failure happened (FR45) **and** point unambiguously at the right one of the five (FR46) using only the documented surface.
  - [ ] Suggested starter set (refine using the actual 7.7 taxonomy):
    | Scenario | Subsystem | Injection sketch | Notes |
    |---|---|---|---|
    | `RM-01` | room state | Call `room-service` endpoint with a `roomId` known not to exist; expect a not-found-class failure tagged with the room-state category | Tests the read-path failure boundary for room-service |
    | `CH-01` | character state | PATCH a character in a room with an invalid payload (e.g. field outside the validated set, or an action that violates the ownership rule) | Tests character-service input-boundary failure classification |
    | `BT-01` | battle state | PATCH a `concluded` battle to trigger the `409` status guard in `battle-service` | Deterministic; battle-service has the guard already |
    | `LG-01` | log history | Publish a synthetic SNS event missing the mandatory `roomId` field to the log topic in non-prod; expect `log-service` subscriber to fail-classify it as a log-history failure | Tests `log-service` event-contract failure boundary; do NOT publish into prod |
    | `SC-01` | session continuity | Force a WebSocket disconnect against `room-notifications-service` during an active session; expect the session-continuity failure signal to surface on reconnect attempts that cannot restore context | Tests realtime/reconnect failure boundary |
  - [ ] For each scenario, capture the **exact reproduction steps** as a numbered list inside the matrix doc — copy-paste-runnable, including any required env vars, the curl/CLI/UI sequence, and the expected HTTP status code or UI symptom. Do not assume operator memory.
  - [ ] Each scenario's `pass_criteria` must include both: (a) "the failure is observable on `<7.7-owned: surface>` within N seconds" (pick N based on 7.7's documented surface latency; default 30s if 7.7 says nothing), and (b) "the observed signal's subsystem category equals `<7.7-owned: expected category>` and no other category in the same surface during the run could be mistaken for it."

- [ ] **Task 3 — Document the execution procedure** (AC: 1, 5)
  - [ ] In the matrix doc, add an "Execution Procedure" section covering: (a) which build to run the matrix against (the release candidate identified for the readiness review, not main), (b) which environment (a dedicated non-prod stack matching prod config — never prod for injection scenarios that revoke IAM or kill infra), (c) who runs it (the named QA owner; pair with engineering if 7.7's surface requires backend access), (d) how to start a run (`cp` the matrix template into a dated run file — see Task 5).
  - [ ] Call out pre-conditions: 7.7's supportability surfaces must be reachable from the run environment; the release candidate must already be deployed; correlation IDs must be propagating end-to-end (note that as of the 6.1 review, request-header → publisher `correlationId` extraction was deferred — verify the current state at run time and record a variance if it is still missing).
  - [ ] Call out anti-patterns: do not run injection scenarios against prod; do not skip a scenario because "it's obviously the same as last release"; do not edit the matrix template during a run (clone to a run file first).

- [ ] **Task 4 — Define gate criteria and waiver handling** (AC: 3, 4)
  - [ ] In the matrix doc, add a "Gate Criteria" section that states verbatim: a scenario passes only if support can both identify the failure and distinguish its subsystem (AC 3); a failure is a release blocker until either the underlying signal is fixed (and a re-run reaches pass) or the blocker is explicitly waived (AC 4).
  - [ ] Define the waiver record shape: `scenario_id`, `reason` (why this signal cannot be fixed for the current release), `accepting_decision_maker` (named human role), `follow-up_commitment` (which story/ticket carries the fix, with a target release), `date`. Waivers live inside the run artifact (Task 5), not inside the matrix template.
  - [ ] Define the release-readiness coupling: the Story 7.6 readiness checklist MUST require a matching, current, all-pass-or-waived matrix run before marking the release ready. If the 7.6 checklist does not yet have a slot for this, this story must add one row/section to the 7.6 checklist artifact and coordinate with 7.6's owner before merging.

- [ ] **Task 5 — Wire matrix runs into release evidence** (AC: 5)
  - [ ] Define the run artifact path/format. Default proposal (adjust to whatever Story 7.6 chose for release-evidence file naming): `docs/release/runs/diagnostic-validation-<release-candidate-id>-<YYYY-MM-DD>.md`. The run file is a clone of the matrix template with the `result`, `observed_signal_snippet`, `notes`, and any `waiver` blocks filled in.
  - [ ] In the matrix template doc, link to the most recent run file and the historical run directory. In the run file, link back to the matrix template version it was cloned from (use git commit SHA of the template at clone time to make the version explicit).
  - [ ] Confirm that the Story 7.6 readiness checklist references the latest run artifact, OR (if 7.6 already shipped without that hook) extend the 7.6 artifact in a small dedicated commit to add the reference. Do not silently fork release-evidence conventions.

- [ ] **Task 6 — Validate the matrix end-to-end** (AC: 1, 2, 3, 4, 5)
  - [ ] Execute the matrix once against a current release candidate to produce the first real run artifact. This is the proof that the matrix and the 7.7 instrumentation actually work together; record any blockers as `fail` rows rather than silently "fixing them up."
  - [ ] Confirm every scenario row resolves to `pass`, `fail`, or `waived` — no blanks. Confirm at least one scenario per subsystem was attempted.
  - [ ] Confirm the run artifact lands in the release evidence location defined in Task 5 and that the Story 7.6 readiness review can read it without bespoke setup.
  - [ ] Capture lessons from the first run as deferred-work items (e.g. scenario flakiness, surface latency, missing categories) — these feed Story 7.7 follow-ups or the next iteration of this story, not silent template edits.

## Dev Notes

### Story Foundation

- The product epic (Epic 7) splits release-operations into instrumentation (7.7), checklist (7.6), validation (this story), and channel availability (7.9). This story is the **verification** step that proves FR45 (failures are identifiable) and FR46 (failures are distinguishable across the five subsystems) hold for a given release candidate.
- The five subsystems are fixed by the product spec (FR45/FR46): **room state, character state, battle state, log history, session continuity**. The matrix covers each at least once. If Story 7.7's taxonomy refines a category (e.g. splits "room state" into read vs write failures), add additional scenarios — do not collapse the five.
- This story is **process-oriented**: most deliverables are markdown artifacts under `docs/release/` (or the path Story 7.6 chose), not application code. Code touches, if any, are limited to test helpers that make injection scenarios deterministic (e.g. a small backend-test fault-injection harness). No production code paths change in this story.

### What This Story Changes vs Preserves

- **Changes:** adds `docs/release/diagnostic-validation-matrix.md` (the template) and the first run artifact under `docs/release/runs/`. May extend the Story 7.6 readiness-checklist artifact with a single reference row pointing at the latest run. Optionally adds a tiny QA/dev convenience script under `scripts/qa/` (e.g. `clone-validation-matrix.sh`) if Task 5's run-cloning step is non-trivial.
- **Preserves:** production code paths in all backend services. Production observability surfaces. Existing release-readiness artifact structure (extend, do not replace). Existing test suites and coverage gates. Existing CI workflows.
- **Out of scope:** implementing the supportability signals themselves (7.7), defining the readiness checklist itself (7.6), validating store-channel availability (7.9). If during execution Story 7.7's signals are found insufficient, file the gap into Story 7.7's deferred-work list — do not fix it inline in this story.

### Architecture Guardrails

- **No production traffic injection.** All injection scenarios target a non-prod stack matching prod configuration. The `RM-01` / `CH-01` / `BT-01` HTTP-fault scenarios are safe to point at prod if needed, but `LG-01` (synthetic SNS event) and `SC-01` (forced disconnect) MUST run against non-prod only. Document this constraint inside the matrix doc.
- **Five-category invariant.** FR45/FR46 lock the category set at five. If Story 7.7 chooses a different naming, the *labels* may differ but the cardinality stays five. Do not invent a sixth.
- **Correlation identifier dependency.** The matrix expects correlation IDs to be observable end-to-end. The 6.1 review noted that `character-service` plumbs `correlationId` through publishers but does not extract it from request headers (`x-correlation-id` / `x-request-id`). Verify the current state at run time; if extraction is still missing, scenarios that depend on correlating a client-side action to a backend signal will fail — that is correct behaviour, not a matrix bug. Record as `fail` with a note pointing at the gap.
- **Backend service boundaries.** The five subsystems map to existing service boundaries: room → `room-service`, character → `character-service`, battle → `battle-service`, log → `log-service`, session-continuity → `room-notifications-service` (WebSocket fan-out) + frontend reconnect logic in `useRoomWebSocket`. Use this mapping to design injection points; do not couple a scenario to internal cross-service code paths Story 7.7 may not actually expose on the supportability surface.
- **Frontend involvement is read-only.** This story does not add frontend behaviour. UI-symptom rows in `pass_criteria` are acceptable as one piece of evidence, but the authoritative signal is the supportability surface defined by 7.7 (typically structured backend logs). Do not require a screenshot as the sole pass evidence.

### Previous Story Intelligence

- **Story 7.5** (release-facing compliance content) established the pattern of release-supporting markdown artifacts under `docs/` and explicit ownership of public, store-visible artifacts. Apply the same accuracy-over-breadth discipline here: matrix rows must be honest about what is observable today, not what we hope is observable.
- **Story 7.3 / 7.4** (iOS/Android delivery) showed that release pipelines fail loudly on missing inputs (the `Validate Required Inputs` shell guard). Mirror that ethos: the matrix gate must fail loudly on a missing scenario or an unwaived `fail`, not "pass with notes."
- **Story 6.1 review (deferred-work, 2026-05-20):** `correlationId` is plumbed but unextracted from headers. This affects the practical observability of correlation IDs on the supportability surface; scenarios that depend on it will reveal the gap. That is desired.
- **Story 6.2 review (deferred-work, 2026-05-21):** `connectToMongo` does not reconnect after a dropped connection; `log-service` uses dev-only `morgan('dev')` in production. Both are repo-wide pre-existing patterns — surface them through the matrix if/when 7.7 chooses the structured-log surface, do not patch them here.

### Git Intelligence Summary

- Recent epic-7 work (7.1–7.5) added Fastlane + CI workflows + privacy/support content. None of those landed any structured-log convention, error-classification taxonomy, or fault-injection harness. The matrix therefore assumes those land in 7.7 — confirm in Task 0.
- No prior story has defined a `docs/release/` directory. This story is allowed to create it (use it for both the matrix template and the runs subdirectory). If Story 7.6 lands first and chooses a different release-docs root (e.g. `docs/release-readiness/`), align with that and update Task 1's path.

### Latest Technical Information

- Backend testing: Vitest 3.2.4 in Node env (v8 coverage). For deterministic injection harnesses, prefer Vitest hooks inside existing service test suites — they already mock external boundaries. Do not introduce a new test framework.
- AWS SDK v3 + SNS publishers: IAM-revocation-style injection (`LG-01`) requires a separate non-prod AWS account or a Pulumi stack the team can safely mutate. Do not attempt IAM mutation against shared infrastructure without coordination.
- WebSocket fault injection (`SC-01`): the docker-compose local stack exposes `room-notifications-service` and Redis. Killing the Redis container is the cheapest deterministic disconnect signal. Document the exact `docker compose` command inside the scenario reproduction steps.
- Markdown is the artifact format across `_bmad-output/` and `docs/`. Tables are the right shape for the matrix; do not introduce YAML/JSON unless Story 7.6 mandates it for the run artifact.

### Project Context Reference

- See `_bmad-output/project-context.md` for binding repo-wide rules. The ones most relevant to this story:
  - **Keep edits minimal and localized.** The matrix is a docs artifact; do not bundle observability code changes here — those belong in 7.7.
  - **Documentation must be updated alongside behavior/config changes.** The matrix is itself documentation; the only behaviour changes (if any) are test harnesses, which should ship with their own README note inside `scripts/qa/`.
  - **No flaky tests / deterministic tests rule** applies to the injection harnesses if any are added — the scenarios themselves are operator-driven runbook steps, not CI tests, and that distinction must be clear in the matrix doc.
  - **70% coverage floor** does not apply to docs-only changes, but if a QA harness script is added, write at least one happy-path test for it.

### Project Structure Notes

- Proposed new paths (all subject to Task 0 reconciliation with Story 7.6's chosen release-docs root):
  - `docs/release/diagnostic-validation-matrix.md` — matrix template (this story creates).
  - `docs/release/runs/diagnostic-validation-<release-candidate-id>-<YYYY-MM-DD>.md` — per-execution run artifact (this story creates the first one).
  - Optional: `scripts/qa/clone-validation-matrix.sh` — small clone helper if cloning is non-trivial.
- No changes anticipated in `frontend/`, `backend/*-service/src/`, `infrastructure/`, or `.github/workflows/`. If those become necessary during execution, raise to Ivan before adding — it likely indicates scope leak from 7.7.
- The matrix references Story 7.7 and Story 7.6 artifacts by stable doc path; if those paths are not yet known, the Task 0 gate is incomplete.

### Testing Standards Summary

- Per `_bmad-output/project-context.md`, regression coverage is mandatory for new endpoint/hook behaviour. This story adds no endpoints or hooks, so no new unit-test coverage is required by default.
- If a QA fault-injection harness is added under `scripts/qa/` or as a backend test helper, follow the existing test conventions: Vitest, co-located `<source>.test.ts`, deterministic, mocked external boundaries.
- The matrix run itself is the test deliverable: a completed run artifact under `docs/release/runs/` with at least one row per subsystem and zero unresolved `fail`/blank rows.
- Verification before marking the story done: produce the first real run artifact (Task 6); confirm it is reachable from Story 7.6's readiness review; confirm the matrix template is linked from Story 7.6's checklist.

### Variances (Filled During Task 0)

- _7.7-owned identifiers (categories, signal field names, surface names) — capture verbatim once 7.7 lands._
- _7.6-owned artifact path/structure — capture verbatim once 7.6 lands._
- _Cross-story coordination notes (e.g. if 7.6's checklist needs a new row added by this story, who reviews/merges it)._
- _Any deviation between the starter scenario set in Task 2 and the actual scenarios run, with reason._

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.8]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#Product Supportability & Release Readiness] (FR45, FR46)
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements.md#Supportability] (NFR10, NFR11, NFR12)
- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.6] (release-readiness checklist — consumer of this matrix)
- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.7] (supportability signals & taxonomy — supplier of this matrix's expected categories/signals/surfaces)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#SNS Topic Architecture] (event payload contract — basis for `LG-01` synthetic-event injection)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Error Handling — Backend] (existing error response shape `{ message: string }` and 502 Lambda convention — basis for HTTP-level injection scenarios)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] (Story 6.1 review: `correlationId` not extracted from request headers — affects scenarios depending on end-to-end correlation)
- [Source: _bmad-output/implementation-artifacts/7-5-release-facing-compliance-content.md] (pattern for release-supporting docs under `docs/`)
- [Source: _bmad-output/implementation-artifacts/7-3-automated-ios-delivery.md] (pattern for loud, actionable-fail gates in release operations)
- [Source: _bmad-output/project-context.md] (repo-wide rules — minimal/localized edits, docs alongside behaviour changes)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-05-23: Story drafted as ready-for-dev with a Scope Guard and blocking Task 0 (Story 7.7 + 7.6 prerequisite gate). Cross-story-owned identifiers (taxonomy strings, signal field names, surface names, release evidence artifact path) deferred to the owning stories and marked `<7.7-owned: ...>` / `<7.6-owned: ...>` in the task body for the dev agent to fill in during Task 0.
