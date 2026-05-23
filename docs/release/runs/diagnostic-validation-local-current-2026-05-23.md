# Diagnostic Validation Run: local-current

Template: [../diagnostic-validation-matrix.md](../diagnostic-validation-matrix.md)
Template git commit at clone time: `a7f8d8e`
Matrix version: `1`

## Run Identity

- Release candidate identifier: `local-current`
- Git ref / commit SHA under test: `a7f8d8e`
- Date: 2026-05-23
- Operator: Codex
- Environment: current workspace only; no deployed non-prod candidate was available from this thread
- Supportability surface checked: repository documentation and local command availability only; CloudWatch/non-prod logs were not accessible
- Final matrix decision: `fail`

This is the first durable run artifact for Story 7.8. Each scenario was attempted as a precondition-gated execution against the current workspace candidate. The attempt failed before live injection because the current workspace did not provide a deployed non-prod release candidate or live supportability surface. QA must rerun this matrix against the actual candidate release before any release-readiness review can mark the release `Go`.

## Scenario Results

| scenario_id | subsystem | expected_category | expected_signal | expected_surface | result | observed_signal_snippet | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RM-01` | Room state | `room` | `support.failure` with `code: "unexpected_error"` and `subsystem: "room"` | CloudWatch Logs Insights or Docker Compose stdout | `fail` | No live `support.failure` signal was observed. | Release-blocking: no deployed non-prod room-service candidate or forced failure path was available in this workspace. |
| `CH-01` | Character state | `character` | `support.failure` with `code: "character_event_publish_failed"`, `subsystem: "character"`, and scenario correlation ID | CloudWatch Logs Insights or Docker Compose stdout | `fail` | No live `support.failure` signal was observed. | Release-blocking: no non-prod publisher fault was injected. |
| `BT-01` | Battle state | `battle` | `support.failure` with `code: "battle_event_publish_failed"`, `subsystem: "battle"`, and scenario correlation ID | CloudWatch Logs Insights or Docker Compose stdout | `fail` | No live `support.failure` signal was observed. | Release-blocking: no non-prod publisher fault was injected. |
| `LG-01` | Log history | `log` | `support.failure` with `code: "log_invalid_event"` and `subsystem: "log"` | CloudWatch Logs Insights or Docker Compose stdout | `fail` | No live `support.failure` signal was observed. | Release-blocking: no non-prod SNS topic was provided for synthetic event injection. |
| `SC-01` | Session continuity | `session_continuity` | `support.failure` with `code: "ws_event_delivery_failed"` and `subsystem: "session_continuity"` | CloudWatch Logs Insights or Docker Compose stdout | `fail` | No live `support.failure` signal was observed. | Release-blocking: no non-prod WebSocket session was available for forced delivery failure. |

## Waivers

No waivers recorded.

## Follow-Up Commitment

Before release approval, QA must rerun [the matrix template](../diagnostic-validation-matrix.md) against the actual candidate release in a dedicated non-prod environment and replace this blocking `local-current` run with an all-pass or explicitly waived candidate-specific run.
