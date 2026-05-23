# Diagnostic Validation Matrix

Template version: `2`

Contractual inputs:

- [Release Support Reference](../release-support-reference.md) defines the `support.failure` signal shape, subsystem values, failure codes, and observation surfaces.
- [Release Readiness Checklist](../release-readiness-checklist.md) defines the release go/no-go evidence record that consumes completed matrix runs.
- Historical runs live in [runs/](./runs/). Update the link below whenever a new run is finalized.
- Latest finalized run: none yet finalized. The most recent run is [diagnostic-validation-f0ba65e-2026-05-23.md](./runs/diagnostic-validation-f0ba65e-2026-05-23.md), which is currently `in-progress` because it surfaced 7.7 instrumentation gaps that block finalization until those gaps are fixed and the matrix is re-executed.

## How To Read This Matrix

This file is the reusable validation plan. Do not fill runtime outcomes into this template. For each candidate release, copy this file to `docs/release/runs/diagnostic-validation-<release-candidate-id>-<YYYY-MM-DD>.md`, record the template git commit SHA in that run, and fill the runtime columns.

Naming conventions:

- `<release-candidate-id>`: a stable, filesystem-safe identifier for the artifact under test. Use either the release tag (e.g. `v0.4.2`) or the 7-character short SHA of the commit under test (e.g. `f0ba65e`). Allowed characters: `[a-z0-9._-]`. No spaces, no slashes.
- `<YYYY-MM-DD>`: the run-start date in UTC (use `date -u +%Y-%m-%d`). UTC avoids duplicate filenames when operators in different timezones run on the same calendar day.

A scenario is `pass` only when support can identify that a failure occurred and distinguish its subsystem from the other four subsystems by using only the documented supportability surface. A scenario is `fail` when the signal is missing, has the wrong subsystem, lacks the expected correlation evidence, or cannot be observed without reading source code. A `fail` is a release blocker unless it is fixed and rerun to `pass`, or explicitly waived in the run artifact.

Waivers live in run artifacts, not in this template. A waiver must record `scenario_id`, `reason`, `accepting_decision_maker`, `follow-up_commitment`, `date`, and `expires_at`. Waivers expire at the next release candidate by default — they must be re-accepted (or the underlying gap fixed) when the next candidate is matrixed.

## Run Artifact Lifecycle

Each run artifact carries a header field `status` with one of:

- `in-progress` — the run is being executed; no other operator should start a parallel run for the same `<release-candidate-id>`.
- `finalized` — the run is complete (every scenario is `pass`, `fail`, or `waived`) and is the authoritative evidence for that candidate.
- `superseded` — a later finalized run for the same candidate has replaced this one. The header must link forward to the superseding run.

Uniqueness rule: at any given moment, there is at most one `finalized` run per `<release-candidate-id>`. To rerun, copy the existing run, set the new copy's `status: in-progress`, finish it, mark it `finalized`, and set the prior run's `status: superseded` with a link to the new file.

Concurrent-run anti-pattern: do not start a second `in-progress` run for the same `<release-candidate-id>` while another `in-progress` run exists. If two operators must run simultaneously (cross-platform validation, for example), use a distinct `<release-candidate-id>` per scope (e.g. `f0ba65e-local`, `f0ba65e-cloud`).

## Template Versioning

Bump `Template version` whenever any of the following change: scenario schema columns; the set of scenarios (add or remove a row); the per-scenario `expected_signal` shape; the run artifact lifecycle. Cosmetic edits, link updates, and clarification of execution steps do not require a version bump. Run artifacts must record the template version they cloned from so reviewers can detect drift.

## Matrix Schema

| Column | Runtime? | Description |
| --- | --- | --- |
| `scenario_id` | No | Stable scenario identifier. Prefixes: `RM-` room, `CH-` character, `BT-` battle, `LG-` log history, `SC-` session continuity. |
| `subsystem` | No | One of the five FR45/FR46 human categories. |
| `description` | No | One-line user-facing failure summary. |
| `injection_method` | No | Deterministic procedure that provokes the failure. |
| `expected_category` | No | Exact Story 7.7 subsystem value: `room`, `character`, `battle`, `log`, or `session_continuity`. |
| `expected_signal` | No | Expected `support.failure` fields and representative code/correlation values. |
| `expected_surface` | No | CloudWatch Logs Insights in AWS, or Docker Compose stdout locally. |
| `pass_criteria` | No | Identification and distinguishability rule. |
| `result` | Yes | `pass`, `fail`, or `waived`. |
| `observed_signal_snippet` | Yes | Short observed `support.failure` evidence, or why none was observable. |
| `notes` | Yes | Gaps, deviations, waiver references, or follow-up links. |

## Execution Procedure

1. Deploy the release candidate under review to a dedicated non-prod stack that matches production configuration. Do not run destructive injection scenarios against production.
2. In the run artifact, fill the Run Identity block: release candidate identifier, git commit SHA, operator, environment, supportability surface access, template SHA, template version. Record the run-start timestamp in UTC ISO-8601 (`date -u +%Y-%m-%dT%H:%M:%SZ`). Set `status: in-progress`.
3. Confirm the `support.failure` surface is reachable before injecting failures:

   ```bash
   docker compose -f backend/docker-compose.local.yml logs --tail=100 | grep 'support.failure'
   ```

   or use the CloudWatch Logs Insights query in [Release Support Reference](../release-support-reference.md).

4. For each scenario, generate a per-run correlation ID with a Unix timestamp suffix so re-runs are unambiguous in log searches:

   ```bash
   CORR_ID="diag-rm-01-$(date -u +%s)"   # adjust scenario prefix per scenario
   ```

   Record `CORR_ID` and the inject-start UTC timestamp in the run artifact `notes` column for the scenario before triggering the failure.

5. Execute every scenario below. After each scenario:
   - Record the first-observation UTC timestamp.
   - Compute `observation_latency_seconds = first_observation - inject_start`. The 30-second pass criterion is satisfied when this value is ≤ 30.
   - Fill `result`, `observed_signal_snippet`, and `notes` in the run artifact. Do not edit this template during a run.
6. After every scenario has a result, set `status: finalized` (if every scenario is `pass` or `waived`) or keep `status: in-progress` while remediation is pending. A run with any unresolved `fail` cannot be `finalized` until those fails are fixed (and rerun to `pass`) or explicitly waived.
7. Attach or link the completed run artifact from the Release Readiness Checklist evidence record.

Preconditions:

- The candidate release is deployed before injection starts.
- CloudWatch Logs Insights or local Docker Compose stdout is available to the operator.
- Correlation IDs are propagating through the path under test. If they are not, record the scenario as `fail`.
- QA owns the run; pair with engineering when backend log or infrastructure access is required. The Operator field must name a human; AI agents may run the matrix as a stand-in (label the operator field accordingly), but a release-gating QA owner must sign off on the finalized result.

Anti-patterns:

- Do not run IAM revocation, Redis shutdown, or synthetic SNS mutation scenarios against production.
- Do not skip a scenario because it passed on a previous release.
- Do not mark a blank or unattempted scenario as `pass`.
- Do not edit this template during a run; clone to a run file first.
- Do not start a second concurrent `in-progress` run for the same `<release-candidate-id>`.

## Scenario Catalogue

| scenario_id | subsystem | description | injection_method | expected_category | expected_signal | expected_surface | pass_criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RM-01` | Room state | Room-service unexpected failure is observable and classified as room state. | In non-prod, stop `mongo-room` (or revoke its network reachability), then call a room-service read endpoint while passing a per-run correlation header `x-correlation-id: diag-rm-01-<ts>`. Restart `mongo-room` after observation. | `room` | `support.failure` with `subsystem: "room"`, `code: "unexpected_error"`, `correlationId: "diag-rm-01-<ts>"` (Express request-context middleware echoes the header), `httpStatus: 500`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds of inject-start, support finds exactly one relevant `support.failure` carrying the run-specific `diag-rm-01-<ts>` correlation ID and distinguishes `subsystem: "room"` from `character`, `battle`, `log`, and `session_continuity` without source-code reading. |
| `CH-01` | Character state | Character event publish failure is observable and classified as character state. | In non-prod, force the character event publisher to fail. Local: stop the `redis` container so the Redis publisher cannot connect. Cloud: revoke `sns:Publish` against the character event topic for the service IAM principal. Then create or update a character through `character-service` with `x-correlation-id: diag-ch-01-<ts>`. Restore the publisher dependency after observation. | `character` | `support.failure` with `subsystem: "character"`, `code: "character_event_publish_failed"`, `correlationId: "diag-ch-01-<ts>"`, `roomId`, `actorId`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds of inject-start, support finds the `diag-ch-01-<ts>` signal, identifies a character failure, and avoids confusing it with room or log persistence failures. |
| `BT-01` | Battle state | Battle event publish failure is observable and classified as battle state. | In non-prod, force the battle event publisher to fail (same vector as CH-01: stop `redis` locally, or revoke `sns:Publish` in cloud). Then start, update, conclude, or discard a battle through `battle-service` with `x-correlation-id: diag-bt-01-<ts>`. Restore the publisher dependency after observation. | `battle` | `support.failure` with `subsystem: "battle"`, `code: "battle_event_publish_failed"`, `correlationId: "diag-bt-01-<ts>"`, `roomId`, `actorId`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds of inject-start, support finds the `diag-bt-01-<ts>` signal, identifies a battle failure, and distinguishes it from character publish failures. |
| `LG-01` | Log history | Invalid log event payload is observable and classified as log history. | Publish a synthetic message that is parseable JSON but violates the log event contract (e.g. missing `roomId`) on whichever surface log-service consumes for the candidate environment. Local: `redis-cli PUBLISH room-log-events '<malformed-json>'`. Cloud: `aws sns publish --region "$AWS_REGION" --topic-arn "$SNS_TOPIC_ARN" --message '<malformed-json>'`. Never publish into prod. No cleanup required (the message is consumed in-flight). | `log` | `support.failure` with `subsystem: "log"`, `code: "log_invalid_event"`, `correlationId: null` (no header path), and no raw payload. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds of inject-start, support finds the log failure, confirms the payload was sanitized (no raw fields leaked), and distinguishes it from character/battle publisher failures. Note: as of 7.7, the local Redis subscriber path emits `console.warn('log.redis.invalid_event', …)` instead of `support.failure`; running LG-01 on local should record `fail` with that gap noted, and is correct evidence per AC 3 (the cloud SNS path is the canonical observable). |
| `SC-01` | Session continuity | WebSocket delivery failure is observable and classified as session continuity. | In non-prod or local Docker, join an active room with a real WebSocket client. Cloud: force a non-410 send failure (e.g. inject a malformed connection ID into the API Gateway management state, or temporarily restrict the management API). Local: stop the `redis` container so room-notifications-service loses its pub/sub upstream and downstream sends fail. Trigger a room event carrying `correlationId: diag-sc-01-<ts>`. Restore the dependency after observation. | `session_continuity` | `support.failure` with `subsystem: "session_continuity"`, `code: "ws_event_delivery_failed"`, `correlationId: "diag-sc-01-<ts>"` when propagated, `roomId`, `sessionId`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds of inject-start, support finds the signal and distinguishes delivery/session continuity from room, character, battle, or log failures. Note: as of 7.7, `ws_event_delivery_failed` is emitted from the API-Gateway-backed Lambda path; on local Docker the equivalent failure mode may surface differently and should be recorded with the actual observed code. |

## Reproduction Steps

> Cleanup steps are explicit and required. Do not skip them — non-prod left in a degraded state will spuriously fail subsequent scenarios.

### RM-01

1. Set `API_BASE_URL` to the non-prod room-service base URL (local default: `http://localhost:8083`; gateway: `http://localhost:8080`). Set `CORR_ID="diag-rm-01-$(date -u +%s)"` and `INJECT_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"`.
2. Stop the room-service Mongo dependency:

   ```bash
   docker compose -f backend/docker-compose.local.yml stop mongo-room
   ```

3. Call any room-service read endpoint with the per-run correlation header. The endpoint will hit the catch-all error path because Mongo is unreachable:

   ```bash
   curl -i -H "x-correlation-id: $CORR_ID" "$API_BASE_URL/rooms/DIAG-RM-01"
   ```

4. Expected HTTP symptom: 5xx response from room-service.
5. Search the support surface for the correlation ID and `subsystem: "room"`:

   ```bash
   docker compose -f backend/docker-compose.local.yml logs --tail=500 room-service | grep "$CORR_ID"
   ```

6. Cleanup — restart the Mongo container so subsequent scenarios run cleanly:

   ```bash
   docker compose -f backend/docker-compose.local.yml start mongo-room
   ```

### CH-01

1. Set `API_BASE_URL` to the non-prod character-service base URL (local default: `http://localhost:8084`; gateway: `http://localhost:8080`). Set `CORR_ID="diag-ch-01-$(date -u +%s)"` and `INJECT_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"`. Ensure `ROOM_ID` and `CHARACTER_ID` reference real disposable resources.
2. Force the publisher path to fail. Local:

   ```bash
   docker compose -f backend/docker-compose.local.yml stop redis
   ```

   Cloud: revoke `sns:Publish` for the character event topic from the service IAM principal. Record the original IAM/policy state so it can be restored.
3. Trigger a character mutation:

   ```bash
   curl -i -X PATCH "$API_BASE_URL/characters/$CHARACTER_ID" \
     -H 'content-type: application/json' \
     -H "x-correlation-id: $CORR_ID" \
     -d '{"level":2}'
   ```

4. Expected HTTP symptom: the user-facing operation may still complete because publish failure is non-blocking; the `support.failure` signal is authoritative.
5. Search the support surface:

   ```bash
   docker compose -f backend/docker-compose.local.yml logs --tail=500 character-service | grep "$CORR_ID"
   ```

6. Cleanup — restore the publisher dependency:

   ```bash
   docker compose -f backend/docker-compose.local.yml start redis
   ```

   Cloud: re-attach the original IAM policy.

### BT-01

1. Set `API_BASE_URL` to the non-prod battle-service base URL (local default: `http://localhost:8086`; gateway: `http://localhost:8080`). Set `CORR_ID="diag-bt-01-$(date -u +%s)"` and `INJECT_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"`. Prepare a disposable active battle in a disposable room.
2. Force the battle publisher to fail. Local:

   ```bash
   docker compose -f backend/docker-compose.local.yml stop redis
   ```

   Cloud: revoke `sns:Publish` against the battle event topic.
3. Trigger a battle mutation against the active battle. Any of: PATCH, conclude, or discard. PATCH example:

   ```bash
   curl -i -X PATCH "$API_BASE_URL/battles/$BATTLE_ID" \
     -H 'content-type: application/json' \
     -H "x-correlation-id: $CORR_ID" \
     -d '{"name":"diag-bt-01"}'
   ```

4. Expected HTTP symptom: the operation may still complete because publish failure is non-blocking; the `support.failure` signal is authoritative.
5. Search the support surface:

   ```bash
   docker compose -f backend/docker-compose.local.yml logs --tail=500 battle-service | grep "$CORR_ID"
   ```

6. Cleanup — restore the publisher dependency:

   ```bash
   docker compose -f backend/docker-compose.local.yml start redis
   ```

### LG-01

1. Set `INJECT_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"`. The malformed message itself is the injection — there is no header-based correlation ID.
2. Choose injection path by environment:

   **Local**: publish a malformed JSON message on the Redis log-events channel:

   ```bash
   docker compose -f backend/docker-compose.local.yml exec redis \
     redis-cli PUBLISH room-log-events '{"event":"character_created","event_body":{"actorId":"diag-character"}}'
   ```

   **Cloud**: publish to the non-prod log SNS topic. Set `AWS_REGION` and `SNS_TOPIC_ARN` first:

   ```bash
   aws sns publish \
     --region "$AWS_REGION" \
     --topic-arn "$SNS_TOPIC_ARN" \
     --message '{"event":"character_created","event_body":{"actorId":"diag-character"}}'
   ```

3. Expected runtime symptom: the log subscriber rejects the malformed payload and continues processing other records.
4. Search the support surface for `log_invalid_event`; confirm raw payload contents are NOT present in the signal:

   ```bash
   # Local
   docker compose -f backend/docker-compose.local.yml logs --tail=500 log-service | grep -E 'support\.failure|log\.redis\.invalid_event'
   # Cloud: use the CloudWatch query from the Release Support Reference, filtered to subsystem "log".
   ```

5. No cleanup required — the message is consumed in-flight.

### SC-01

1. Start the non-prod or local room-notifications stack. Connect a real WebSocket client to `ws://localhost:8085/?roomId=<RoomId>&userId=<UserId>` (or via the gateway proxy `ws://localhost:8080/ws?roomId=…&userId=…`). Confirm the client receives the heartbeat or the initial state.
2. Set `INJECT_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"`. Set `CORR_ID="diag-sc-01-$(date -u +%s)"`.
3. Force a non-410 delivery failure:

   **Local**:

   ```bash
   docker compose -f backend/docker-compose.local.yml stop redis
   ```

   **Cloud**: provoke a non-410 ApiGatewayManagementApi failure (e.g. temporarily restrict the management API IAM policy or inject a connection ID that is no longer routable for non-410 reasons).
4. Trigger a room event that should fan out through `room-notifications-service` (e.g. perform a character or battle mutation on the same `roomId`) and ensure the producing service stamps `correlationId: $CORR_ID` if the event flow exposes it.
5. Search the support surface:

   ```bash
   docker compose -f backend/docker-compose.local.yml logs --tail=500 room-notifications-service | grep -E 'support\.failure|ws_event_delivery_failed'
   ```

6. Cleanup — restore the dependency:

   ```bash
   docker compose -f backend/docker-compose.local.yml start redis
   ```

## Gate Criteria

A scenario passes only if support can both identify the failure and distinguish its subsystem using the documented supportability surface, within 30 seconds of inject-start (latency computed in step 5 of the Execution Procedure). A failure is a release blocker until either the underlying signal is corrected and a rerun reaches `pass`, or the blocker is explicitly waived in writing.

The release-readiness review must reference a `finalized` matrix run for the same candidate release (matched by `<release-candidate-id>`). The release can be marked `Go` only when that run's `status` is `finalized` and every scenario is `pass` or `waived`.

Waiver record shape:

```text
scenario_id:
reason:
accepting_decision_maker:
follow-up_commitment:
date:
expires_at:        # default: the next release candidate's matrix run; cannot exceed one calendar quarter
```

Waivers expire at the next release candidate by default. A waiver carried into a new candidate must be re-accepted by the named decision-maker and re-recorded in the new run artifact, or the underlying gap must be fixed and the scenario rerun to `pass`.
