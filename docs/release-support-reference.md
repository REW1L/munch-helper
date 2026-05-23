# Release Support Reference

## Purpose

This document is the internal supportability reference for support, QA, and release engineers who need to classify backend session failures from CloudWatch or local Docker logs. It pairs with [Backend Architecture](./architecture-backend.md) and is the source of truth for `support.failure` subsystem values and failure codes.

## Subsystem Categories

| Subsystem | Human label | Emitting services | Satisfies |
| --- | --- | --- | --- |
| `room` | Room state | `room-service` | FR45, FR46 |
| `character` | Character state | `character-service` | FR45, FR46 |
| `battle` | Battle state | `battle-service` | FR45, FR46 |
| `log` | Room history and log persistence | `log-service` subscriber and reader middleware | FR45, FR46 |
| `session_continuity` | Session continuity and delivery | `room-notifications-service`, `user-service` | FR45, FR46 |

## Signal Shape

`support.failure` is emitted as the literal first argument to `console.error`; the second argument is an allowlisted object.

```json
{
  "subsystem": "battle",
  "code": "unexpected_error",
  "message": "Unhandled error in battle-service",
  "correlationId": "d0f4b150-85b2-4c9e-8d2f-4a70f3f3a8d0",
  "roomId": "ROOM01",
  "actorId": "battle-1",
  "sessionId": "connection-1",
  "httpStatus": 502,
  "errorName": "Error",
  "errorMessage": "database unavailable"
}
```

| Field | Type | Example | Notes |
| --- | --- | --- | --- |
| `subsystem` | enum | `battle` | One of `room`, `character`, `battle`, `log`, `session_continuity`. |
| `code` | string enum | `unexpected_error` | Stable code from the catalog below. |
| `message` | string | `Unhandled error in battle-service` | Short operator-facing summary; never raw user input. |
| `correlationId` | string or null | `corr-123` | `null` only when no request header or upstream payload supplied one. |
| `roomId` | string | `ROOM01` | Present when available at the failing call site. |
| `actorId` | string | `character-1` | Character ID, battle ID, or log actor ID when available. |
| `sessionId` | string | `connection-1` | WebSocket connection ID for delivery failures. |
| `httpStatus` | number | `502` | Express error middleware only. |
| `errorName` | string | `TypeError` | Extracted from the underlying error when available. |
| `errorMessage` | string | `database unavailable` | Extracted from the underlying error when available. |

The signal must not include user nicknames, character `name`, character `class`/`race`/`gender`, battle `name`, raw request bodies, full headers, tokens, passwords, full stack traces, or fields from another room.

## Code Catalog

| Code | Subsystem | Emitted from | Meaning |
| --- | --- | --- | --- |
| `unexpected_error` | varies | Express error middleware in `user-service`, `room-service`, `character-service`, `battle-service`, and `log-service` | Catch-all for unexpected errors that escape route handlers. |
| `character_event_publish_failed` | `character` | `character-service` route-level publisher catches | SNS or Redis publish failed for a `character_*` event. |
| `battle_event_publish_failed` | `battle` | `battle-service` route-level publisher catches | SNS or Redis publish failed for a `battle_*` event. |
| `log_invalid_event` | `log` | `log-service` SNS subscriber | SNS payload failed `parseLogEvent`; raw payload is intentionally omitted. |
| `log_persist_failed` | `log` | `log-service` SNS subscriber | Mongo write failed for a parsed log event. |
| `log_read_failed` | `log` | Reserved for direct reader-route catches; not emitted in 7.7 because reader routes delegate to Express middleware | Unexpected error in a log read path if a future reader catch handles it directly. |
| `ws_event_delivery_failed` | `session_continuity` | `room-notifications-service` `sendEventToConnections` | WebSocket post to a connection failed for a non-410 error. |
| `ws_dispatch_failed` | `session_continuity` | Reserved for dispatcher-level catches; not emitted in 7.7 because dispatcher files only wire existing handlers | Lambda or local dispatcher hit an unexpected error if a future dispatcher catch handles it directly. |

## CloudWatch Logs Insights Query

```sql
fields @timestamp, @log, @message
| filter @message like /support\.failure/
| parse @message 'support.failure *' as raw
| parse raw /"subsystem":"(?<subsystem>[^"]*)","code":"(?<code>[^"]*)"/
| filter subsystem = "battle"
| sort @timestamp desc
| limit 200
```

## Local Docker Logs Command

```bash
docker compose -f backend/docker-compose.local.yml logs --tail=500 | grep 'support.failure' | grep '"subsystem":"battle"'
```

## Correlation IDs

For HTTP paths that publish room-history events, pass `x-correlation-id` on the request and inspect the echoed response header with `curl -v`. If `x-correlation-id` is absent, `character-service` and `battle-service` fall back to `x-request-id`, then generate a UUID v4. Grep the correlation ID across service logs to follow the request from the HTTP service into publisher failures, log persistence, or notification delivery.

```bash
docker compose -f backend/docker-compose.local.yml logs --tail=1000 | grep 'corr-123'
```

## What This Document Is Not

This is not the release-readiness checklist from Story 7.6, not the diagnostic validation matrix from Story 7.8, not an SLA, and not an incident-response runbook. It also does not normalize known architectural variance: `room-service`, `user-service`, and `character-service` still return `500`, while `battle-service` and `log-service` return `502`; response body shapes are preserved exactly as shipped.
