# Diagnostic Validation Matrix

Template version: `1`

Contractual inputs:

- [Release Support Reference](../release-support-reference.md) defines the `support.failure` signal shape, subsystem values, failure codes, and observation surfaces.
- [Release Readiness Checklist](../release-readiness-checklist.md) defines the release go/no-go evidence record that consumes completed matrix runs.
- Historical runs live in [runs/](./runs/).
- Latest run: [diagnostic-validation-local-current-2026-05-23.md](./runs/diagnostic-validation-local-current-2026-05-23.md)

## How To Read This Matrix

This file is the reusable validation plan. Do not fill runtime outcomes into this template. For each candidate release, copy this file to `docs/release/runs/diagnostic-validation-<release-candidate-id>-<YYYY-MM-DD>.md`, record the template git commit SHA in that run, and fill the runtime columns.

A scenario is `pass` only when support can identify that a failure occurred and distinguish its subsystem from the other four subsystems by using only the documented supportability surface. A scenario is `fail` when the signal is missing, has the wrong subsystem, lacks the expected correlation evidence, or cannot be observed without reading source code. A `fail` is a release blocker unless it is fixed and rerun to `pass`, or explicitly waived in the run artifact.

Waivers live in run artifacts, not in this template. A waiver must record `scenario_id`, `reason`, `accepting_decision_maker`, `follow-up_commitment`, and `date`.

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
2. Record the release candidate identifier, git commit SHA, operator, date, environment, and supportability surface access in the run artifact.
3. Confirm the `support.failure` surface is reachable before injecting failures:

   ```bash
   docker compose -f backend/docker-compose.local.yml logs --tail=100 | grep 'support.failure'
   ```

   or use the CloudWatch Logs Insights query in [Release Support Reference](../release-support-reference.md).

4. Confirm correlation IDs can be searched end to end. For HTTP scenarios, pass `x-correlation-id: diag-<scenario-id>-<timestamp>` and use that value in log searches.
5. Execute every scenario below. Fill `result`, `observed_signal_snippet`, and `notes` in the run artifact. Do not edit this template during a run.
6. Attach or link the completed run artifact from the Release Readiness Checklist evidence record.

Preconditions:

- The candidate release is deployed before injection starts.
- CloudWatch Logs Insights or local Docker Compose stdout is available to the operator.
- Correlation IDs are propagating through the path under test. If they are not, record the scenario as `fail`.
- QA owns the run; pair with engineering when backend log or infrastructure access is required.

Anti-patterns:

- Do not run IAM revocation, Redis shutdown, or synthetic SNS mutation scenarios against production.
- Do not skip a scenario because it passed on a previous release.
- Do not mark a blank or unattempted scenario as `pass`.

## Scenario Catalogue

| scenario_id | subsystem | description | injection_method | expected_category | expected_signal | expected_surface | pass_criteria | result | observed_signal_snippet | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RM-01` | Room state | Room-service unexpected failure is observable and classified as room state. | Force the room-service catch-all error path in non-prod using a temporary test route or controlled Mongo outage, then call the room endpoint with `x-correlation-id: diag-rm-01`. | `room` | `support.failure` with `subsystem: "room"`, `code: "unexpected_error"`, `correlationId: null` unless the failing path provides one, `httpStatus: 500`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds, support can find exactly one relevant `support.failure` and distinguish `subsystem: "room"` from `character`, `battle`, `log`, and `session_continuity` without source-code reading. |  |  |  |
| `CH-01` | Character state | Character event publish failure is observable and classified as character state. | In non-prod, make the character event publisher fail, then create or update a character through `character-service` with `x-correlation-id: diag-ch-01`. | `character` | `support.failure` with `subsystem: "character"`, `code: "character_event_publish_failed"`, `correlationId: "diag-ch-01"`, `roomId`, `actorId`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds, support can find the `diag-ch-01` signal, identify a character failure, and avoid confusing it with room or log persistence failures. |  |  |  |
| `BT-01` | Battle state | Battle event publish failure is observable and classified as battle state. | In non-prod, make the battle event publisher fail, then start, update, conclude, or discard a battle through `battle-service` with `x-correlation-id: diag-bt-01`. | `battle` | `support.failure` with `subsystem: "battle"`, `code: "battle_event_publish_failed"`, `correlationId: "diag-bt-01"`, `roomId`, `actorId`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds, support can find the `diag-bt-01` signal, identify a battle failure, and distinguish it from character publish failures. |  |  |  |
| `LG-01` | Log history | Invalid log event payload is observable and classified as log history. | Publish a synthetic SNS message to the non-prod log topic that is parseable JSON but violates the log event contract, such as missing `roomId`; never publish this into prod. | `log` | `support.failure` with `subsystem: "log"`, `code: "log_invalid_event"`, `correlationId: null`, and no raw payload. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds, support can find the log failure, confirm the payload was sanitized, and distinguish it from character/battle publisher failures. |  |  |  |
| `SC-01` | Session continuity | WebSocket delivery failure is observable and classified as session continuity. | In non-prod or local Docker, join an active room, force a non-410 WebSocket send failure or kill the Redis/container dependency for `room-notifications-service`, then trigger a room event carrying `correlationId: diag-sc-01`. | `session_continuity` | `support.failure` with `subsystem: "session_continuity"`, `code: "ws_event_delivery_failed"`, `correlationId: "diag-sc-01"` when propagated, `roomId`, `sessionId`, and error fields when available. | CloudWatch Logs Insights or Docker Compose stdout. | Within 30 seconds, support can find the signal and distinguish delivery/session continuity from room, character, battle, or log failures. |  |  |  |

## Reproduction Steps

### RM-01

1. Set `API_BASE_URL` to the non-prod room-service base URL.
2. Ensure the failure path is controlled, such as a temporary catch-all test route or a non-prod-only Mongo connectivity fault.
3. Call the failing room endpoint with a scenario correlation ID:

   ```bash
   curl -i -H 'x-correlation-id: diag-rm-01' "$API_BASE_URL/rooms/DIAGRM01"
   ```

4. Expected HTTP symptom: service error response using the existing room-service response shape.
5. Search the support surface for `support.failure` and `room`.

### CH-01

1. Set `API_BASE_URL` to the non-prod character-service base URL and `ROOM_ID` to a disposable room.
2. Configure the non-prod publisher path to fail, such as revoking publish permission or pointing the publisher dependency at an unreachable local endpoint.
3. Trigger a character action:

   ```bash
   curl -i -X PATCH "$API_BASE_URL/characters/$CHARACTER_ID" \
     -H 'content-type: application/json' \
     -H 'x-correlation-id: diag-ch-01' \
     -d '{"level":2}'
   ```

4. Expected HTTP symptom: the user-facing operation may still complete if publish failure is non-blocking; the support signal is authoritative.
5. Search the support surface for `diag-ch-01` and `character_event_publish_failed`.

### BT-01

1. Set `API_BASE_URL` to the non-prod battle-service base URL and prepare a disposable active battle.
2. Configure the non-prod battle publisher path to fail.
3. Trigger a battle mutation:

   ```bash
   curl -i -X PATCH "$API_BASE_URL/battles/$BATTLE_ID" \
     -H 'content-type: application/json' \
     -H 'x-correlation-id: diag-bt-01' \
     -d '{"name":"Diagnostic battle","playerSide":{"characterIds":[]},"monsterSide":{"monsters":[]}}'
   ```

4. Expected HTTP symptom: the operation may still complete if publish failure is non-blocking; the support signal is authoritative.
5. Search the support surface for `diag-bt-01` and `battle_event_publish_failed`.

### LG-01

1. Set `SNS_TOPIC_ARN` to the non-prod log topic.
2. Publish a malformed diagnostic event that omits `roomId`:

   ```bash
   aws sns publish \
     --topic-arn "$SNS_TOPIC_ARN" \
     --message '{"event":"character_created","event_body":{"actorId":"diag-character"},"correlationId":"diag-lg-01"}'
   ```

3. Expected runtime symptom: the subscriber continues processing other records.
4. Search the support surface for `log_invalid_event`; confirm raw payload contents are not present in the signal.

### SC-01

1. Start the non-prod or local room-notifications stack and join a disposable active room.
2. Force a non-410 delivery failure. For local Docker validation, stop the dependency used by room notifications:

   ```bash
   docker compose -f backend/docker-compose.local.yml stop redis
   ```

3. Trigger a room event carrying `correlationId: diag-sc-01`.
4. Expected UI symptom: reconnect or delivery disruption may be visible, but the support signal is authoritative.
5. Search the support surface for `ws_event_delivery_failed` and `session_continuity`.
6. Restore the dependency before ending the run:

   ```bash
   docker compose -f backend/docker-compose.local.yml start redis
   ```

## Gate Criteria

A scenario passes only if support can both identify the failure and distinguish its subsystem using the documented supportability surface. A failure is a release blocker until either the underlying signal is corrected and a rerun reaches `pass`, or the blocker is explicitly waived in writing.

The release-readiness review must reference a completed matrix run for the same candidate release. The release can be marked `Go` only when that run is all-pass or every failure has an explicit waiver in the run artifact.

Waiver record shape:

```text
scenario_id:
reason:
accepting_decision_maker:
follow-up_commitment:
date:
```
