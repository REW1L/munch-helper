# Diagnostic Validation Run: f0ba65e

Template: [../diagnostic-validation-matrix.md](../diagnostic-validation-matrix.md)
Template git commit at clone time: `f0ba65e`
Matrix version: `2`
Run status: `in-progress`

## Run Identity

- Release candidate identifier: `f0ba65e`
- Git ref / commit SHA under test: `f0ba65e` (`[codex] Add diagnostic validation matrix` on branch `codex/diagnostic-validation-matrix`)
- Date: 2026-05-23 (UTC)
- Run-start UTC: 2026-05-23T20:02:04Z
- Operator: Codex (AI agent stand-in; not a release-gating QA owner)
- Environment: local Docker Compose stack (`backend/docker-compose.local.yml`), built from current candidate code via `backend/scripts/dev-up.sh` immediately before this run; no AWS deploy
- Supportability surface checked: `docker compose -f backend/docker-compose.local.yml logs <service-name> | grep 'support.failure'` against each backend service
- Frontend launched: web (Expo dev server on `http://localhost:8081`); iOS Simulator "iPhone 16 Pro" booted with `click.helpamunch.mobileapp` installed; Android emulator-5554 booted (`Medium_Phone_API_36.1`). Frontend was used for visual confirmation; matrix injections were executed via `curl` and `redis-cli` directly against `http://localhost:8080` and the Redis container.
- Final matrix decision: `No-Go for release` — every scenario is `fail` because of architectural gaps in 7.7 instrumentation that are visible from this matrix run. See "Run lifecycle note" below.

## Setup IDs (for reproducibility)

```
USER_ID=6a1207bccaf4ac3a286ff238
ROOM_ID=SAW0460
CHAR_ID=6a1207bc758722e419e19f40
BATTLE_ID=6a1207bc97189afdb4151fef
```

## Scenario Results

| scenario_id | subsystem | expected_category | expected_signal | expected_surface | result | observed_signal_snippet | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RM-01` | Room state | `room` | `support.failure` with `code: "unexpected_error"`, `subsystem: "room"`, `correlationId: "diag-rm-01-<ts>"`, `httpStatus: 500` | Docker Compose stdout (`munch-room-service`) | `fail` | `support.failure { subsystem: 'room', code: 'unexpected_error', message: 'Unhandled error in room-service', correlationId: null, httpStatus: 500, errorName: 'MongoServerSelectionError', errorMessage: 'getaddrinfo ENOTFOUND mongo-room' }` | Identification ✓; distinguishability ✓; correlationId ✗ (`null` because `room-service` has no correlation middleware echoing `x-correlation-id`); 30s SLA ✗ (observed_latency=30.07s, just over the 30s cap because Mongoose default `serverSelectionTimeoutMS=30s` is the bottleneck). Two release-blocking 7.7 gaps. CORR_ID=`diag-rm-01-1779566698` INJECT_START=2026-05-23T20:04:58Z OBSERVED=2026-05-23T20:05:30Z. |
| `CH-01` | Character state | `character` | `support.failure` with `code: "character_event_publish_failed"`, `subsystem: "character"`, `correlationId: "diag-ch-01-<ts>"`, `roomId`, `actorId` | Docker Compose stdout (`munch-character-service`) | `fail` | NO `support.failure` observed. Multiple `[character-events] redis client error … getaddrinfo ENOTFOUND redis` lines. PATCH /characters/<id> hung; client timed out at 30s. Morgan log shows `PATCH /characters/<id> - - ms - -` (request never completed). | Two release-blocking 7.7 gaps surfaced: (1) `RedisCharacterEventPublisher` uses default node-redis options so `publish()` is buffered indefinitely while Redis is unreachable — never throws, never resolves; (2) `FanoutCharacterEventPublisher.publish` (`character-service/src/publisher.ts:38-54`) uses `Promise.allSettled` and silently swallows leg rejections, so even if a leg threw, the route catch never fires. Result: `character_event_publish_failed` is dead code. CORR_ID=`diag-ch-01-1779566967` INJECT_START=2026-05-23T20:09:27Z OBSERVED=2026-05-23T20:10:01Z. |
| `BT-01` | Battle state | `battle` | `support.failure` with `code: "battle_event_publish_failed"`, `subsystem: "battle"`, `correlationId: "diag-bt-01-<ts>"`, `roomId`, `actorId` | Docker Compose stdout (`munch-battle-service`) | `fail` | NO `support.failure` observed. Same pattern as CH-01: many `getaddrinfo ENOTFOUND redis` errors, PATCH /battles/<id> hung, request timed out at 30s. | Same dual gap as CH-01 — `FanOutBattleEventPublisher` (`battle-service/src/publisher.ts:148-164`) has identical `Promise.allSettled` swallow pattern; `RedisBattleEventPublisher` has identical no-fail-fast Redis client config. `battle_event_publish_failed` is dead code in both local and cloud paths (lambda also uses Fanout — see `battle-service/src/lambda.ts:19`). CORR_ID=`diag-bt-01-1779567030` INJECT_START=2026-05-23T20:10:30Z OBSERVED=2026-05-23T20:11:03Z. |
| `LG-01` | Log history | `log` | `support.failure` with `code: "log_invalid_event"`, `subsystem: "log"`, `correlationId: null` | Docker Compose stdout (`munch-log-service`) | `fail` | Observed `log.redis.invalid_event { channel: 'room-log-events' }` (a `console.warn` from `log-service/src/index.ts:42-46`) but NOT `console.error('support.failure', { code: 'log_invalid_event', subsystem: 'log', … })`. | The structured `support.failure { code: log_invalid_event }` signal is emitted only from the AWS Lambda SNS subscriber (`log-service/src/subscriber.ts`), not from the local Redis subscriber. On the local stack the canonical 7.7 signal is unreachable for this scenario. Cloud SNS path remains observable; this is a known local-vs-cloud divergence in the 7.7 instrumentation surface. INJECT_START=2026-05-23T20:11:21Z OBSERVED=2026-05-23T20:11:25Z. |
| `SC-01` | Session continuity | `session_continuity` | `support.failure` with `code: "ws_event_delivery_failed"`, `subsystem: "session_continuity"`, `correlationId: "diag-sc-01-<ts>"`, `roomId`, `sessionId` | Docker Compose stdout (`munch-room-notifications-service`) | `fail` | NO `support.failure` observed in `munch-room-notifications-service` logs. The local `room-notifications-service/src/index.ts` does not import `logSupportFailure` and does not emit a `support.failure` signal for any delivery failure mode. | `ws_event_delivery_failed` is emitted only from `room-notifications-service/src/service.ts:108-114` via the API-Gateway-backed Lambda path (`ApiGatewayManagementApiClient` `try/catch`). On the local Docker stack the canonical 7.7 signal is unreachable for this scenario. Cloud Lambda path remains observable; same local-vs-cloud divergence as LG-01. CORR_ID=`diag-sc-01-1779567119` INJECT_START=2026-05-23T20:11:59Z OBSERVED=2026-05-23T20:12:07Z. |

## Waivers

No waivers recorded. Per the matrix template's gate criteria (and AC 4 of Story 7.8), waiving every scenario in a release-blocker matrix run is exactly the failure mode the gate is designed to prevent. Resolving the gaps in 7.7 (and rerunning) is the correct path to release.

## Run Lifecycle Note

This run's `status` is `in-progress` rather than `finalized`. The matrix template (`docs/release/diagnostic-validation-matrix.md`) requires that a run with any unresolved `fail` cannot be `finalized` until those failures are fixed (and rerun to `pass`) or explicitly waived. Every scenario is `fail`; no waivers are appropriate (the failures are 7.7 instrumentation gaps, not release-specific exceptions). The run will be `finalized` once 7.7 follow-up work lands and the scenarios re-execute to `pass`, OR a future release reviewer waives specific scenarios with a named decision-maker and follow-up commitment.

## Follow-Up Commitment

Before any candidate release can be marked `Go` against this matrix, the 7.7 instrumentation gaps surfaced by this run must be addressed. Tracked in `_bmad-output/implementation-artifacts/deferred-work.md` under "Deferred from: code review of 7-8-diagnostic-validation-matrix (2026-05-23)". The minimum fix-set:

1. Make `FanoutCharacterEventPublisher` / `FanOutBattleEventPublisher` propagate leg failures to the route catch (or emit `support.failure` directly inside the Fanout's rejection branch).
2. Configure node-redis clients in `RedisCharacterEventPublisher` / `RedisBattleEventPublisher` with `disableOfflineQueue: true` and a short `commandTimeout` so publish failures throw observably rather than buffering indefinitely.
3. Add request-correlation middleware to `room-service` mirroring `character-service` / `battle-service`, and use `getCorrelationId(res)` in the room-service error middleware instead of the hard-coded `correlationId: null`.
4. Reconcile `log-service` local Redis subscriber (`index.ts`) to emit `support.failure { code: log_invalid_event }` and `log_persist_failed` so the local stack and cloud SNS Lambda match the same taxonomy.
5. Reconcile `room-notifications-service` local index (`index.ts`) to emit `support.failure { code: ws_event_delivery_failed }` for raw `ws.send` failures so the local stack matches the API-Gateway Lambda taxonomy.
6. Tune Mongoose `serverSelectionTimeoutMS` for non-prod stacks (e.g. 5s instead of 30s) so RM-01 latency falls comfortably below the 30s SLA, OR adjust the matrix SLA to ≤45s.

After (1–6) ship as a 7.7 hardening pass, rerun the matrix against the new candidate, mark this run `superseded` (linking forward to the new run file), and finalize the new run.
