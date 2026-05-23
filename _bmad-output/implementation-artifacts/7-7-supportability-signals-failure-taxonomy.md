# Story 7.7: Supportability Signals & Failure Taxonomy

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support team member,
I want core session failures to emit clear, subsystem-specific diagnostic signals,
So that I can quickly identify whether a problem is caused by room state, character state, battle state, log history, or session continuity.

## Acceptance Criteria

1. **Given** a failure occurs in any core room, character, battle, log, or session-continuity flow handled by one of the five backend services (`room-service`, `character-service`, `battle-service`, `log-service`, `room-notifications-service`)
   **When** the failure is handled by the service's Express error middleware, by a publisher catch block, by the log-service SNS subscriber, or by the room-notifications WebSocket fanout
   **Then** the failure emits exactly one structured log line tagged `support.failure` (via `console.error`) whose JSON body includes at minimum: `subsystem` (one of `room`, `character`, `battle`, `log`, `session_continuity`), `code` (a stable identifier from the catalog in §Library / Framework Requirements), `correlationId` (string; `null` only when no inbound header or upstream payload supplied one), and `message` (short human-readable summary)

2. **Given** the structured `support.failure` signal is emitted
   **When** support or engineering reads it (CloudWatch Logs Insights in AWS, or Docker Compose stdout locally)
   **Then** the JSON body also includes any of the following contextual fields that are available in the failing call site: `roomId`, `actorId` (characterId or battleId), `sessionId` (the `connectionId` for WS delivery failures), `httpStatus` (for express error middleware), and `errorName` / `errorMessage` (extracted from the underlying error). It must NOT include user nicknames, character `name`, character `class`/`race`/`gender`, battle `name`, raw request bodies, headers other than `x-correlation-id` / `x-request-id`, full stack traces, or any field belonging to a different room than the one the failure happened in

3. **Given** the failure taxonomy is published
   **When** a reader opens `docs/release-support-reference.md`
   **Then** the document lists all five subsystem categories with their definitions, lists every `code` in the catalog with its subsystem, a one-sentence description, and the call site(s) that emit it, shows the full JSON shape of a `support.failure` line, and provides a copy-paste CloudWatch Logs Insights query and a copy-paste `grep` command for local Docker logs that filter to `support.failure` and to a single subsystem

4. **Given** an inbound HTTP request carries `x-correlation-id` (preferred) or `x-request-id` (fallback) header
   **When** the request triggers any `support.failure` emission OR triggers an SNS/Redis event publish from `character-service` or `battle-service`
   **Then** the same `correlationId` string appears on both the `support.failure` log line AND the resulting event payload's `correlationId` field; and when neither header is present the service generates a new UUID v4 for that request and uses it consistently across the same fields

5. **Given** the log-service SNS subscriber (`logWriter`) receives an event with a parseable header but a `support.failure`-class persistence failure (e.g. Mongo write error, schema validation failure)
   **When** the failure occurs
   **Then** the existing `log.sns.persist_failed` warn line is replaced by a `support.failure` error with `subsystem: 'log'`, `code: 'log_persist_failed'`, `correlationId` propagated from the inbound payload's `correlationId` field (or `null` if absent), `roomId` and `actorId` from the parsed event, and the loop continues processing remaining records

6. **Given** the room-notifications-service Express error middleware OR the WebSocket fanout (`sendEventToConnections`) hits an unexpected error that is not the existing 410-stale-connection case
   **When** the failure is logged
   **Then** the existing `room-notifications.event.delivery_failed` error line is replaced by a `support.failure` error with `subsystem: 'session_continuity'`, `code: 'ws_event_delivery_failed'`, `correlationId` propagated from the event payload, `roomId` from the event, and `sessionId` set to the failing `connectionId`

7. **Given** a unit test runs against each service's `supportSignal.ts` helper
   **When** the test invokes `logSupportFailure({...})` with all permitted fields and again with the minimum required fields
   **Then** the test asserts `console.error` was called once with the literal first arg `'support.failure'` and a second arg whose JSON matches the documented shape, that omitted optional fields are absent (not present as `undefined`), that `subsystem` is restricted to the five enum values at the TypeScript type level, and that an unexpected `name`/`email`/`token`/`password` field passed into the helper is dropped before logging

8. **Given** integration tests exist for each service's Express error middleware (`character-service`, `battle-service`, `log-service` reader, `room-notifications-service`, `room-service`, `user-service`)
   **When** the middleware is triggered by a forced thrown error in a registered test route
   **Then** the test asserts the response body and status remain unchanged from today (`500`/`502` + `{ message: ... }`) AND `console.error` was called with `'support.failure'` and the service's expected `subsystem` + a `code` of `unexpected_error`

## Tasks / Subtasks

- [x] **Task 0: Scope Guard (Read First)** (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] This story is **instrumentation + documentation only**. No HTTP status codes, no response body shapes, no event payload shapes (other than adding `correlationId`), no public route URLs, and no UX/frontend behavior change.
  - [x] Do NOT migrate existing `console.info` operational success logs to a new shape. Only failure paths emit `support.failure`. The pre-existing `console.info` lines (`'[character-service] update character success'`, `'log.sns.persist_failed'` warn, `'[WebSocket] Connected to room ...'`, etc.) stay as they are.
  - [x] Do NOT introduce a new shared npm package, monorepo workspace, or `shared/` folder. Each service owns a self-contained `src/supportSignal.ts` of identical shape — per project-context rule "Avoid premature shared-core coupling across services; only centralize shared types/contracts when a maintained shared module is explicitly part of the design".
  - [x] Do NOT change the HTTP error response body shape. `room-service`/`user-service` keep their existing `{ message: 'Internal server error', details: err.message }`; `battle-service`/`log-service` keep `{ message: 'Unexpected error' }`; `character-service` keeps `{ message: 'Internal server error', details: err.message }`. Reshaping responses is out of scope and would break frontend `ApiError` parsing.
  - [x] Do NOT change HTTP status codes today (the 500-vs-502 split between services is pre-existing — recorded in §Dev Notes as Architectural Variance). Status normalization is a separate follow-up; flag it but do not bundle.
  - [x] Do NOT add `support.failure` emission to the frontend. AC1 explicitly scopes the signal to "structured backend logs". Frontend session-continuity failures (`useRoomWebSocket` reconnect timeout) are NOT in scope; story 7.8 will validate them by injecting backend failures that surface to the client.
  - [x] Do NOT add `support.failure` to validation failures (`400`) or `not found` (`404`). These are user-input errors and are not failures to classify. Only emit for: (a) the catch-all Express error middleware, (b) publisher failures, (c) log subscriber persistence failures, (d) WebSocket fanout failures.

- [x] **Task 1: Implement the shared signal shape — one file per service** (AC: 1, 2, 7)
  - [x] Create `backend/<service>/src/supportSignal.ts` in each of the six services (`user-service`, `room-service`, `character-service`, `battle-service`, `log-service`, `room-notifications-service`) with identical structure. The file exports `Subsystem`, `SupportFailureCode`, and `logSupportFailure(input)`:
    ```typescript
    export type Subsystem = 'room' | 'character' | 'battle' | 'log' | 'session_continuity';

    export interface SupportFailureInput {
      subsystem: Subsystem;
      code: string;                 // stable; must match docs/release-support-reference.md catalog
      message: string;              // short human-readable; never include user input verbatim
      correlationId: string | null;
      roomId?: string;
      actorId?: string;             // characterId or battleId
      sessionId?: string;           // WS connectionId
      httpStatus?: number;          // express error middleware only
      errorName?: string;
      errorMessage?: string;
    }

    const ALLOWED_KEYS: ReadonlyArray<keyof SupportFailureInput> = [
      'subsystem', 'code', 'message', 'correlationId',
      'roomId', 'actorId', 'sessionId', 'httpStatus',
      'errorName', 'errorMessage'
    ];

    export function logSupportFailure(input: SupportFailureInput): void {
      const body: Record<string, unknown> = {};
      for (const key of ALLOWED_KEYS) {
        const value = input[key];
        if (value !== undefined) {
          body[key] = value;
        }
      }
      // Hard-coded first argument so CloudWatch / grep filters are unambiguous.
      // eslint-disable-next-line no-console
      console.error('support.failure', body);
    }

    export function extractErrorFields(error: unknown): { errorName?: string; errorMessage?: string } {
      if (error instanceof Error) {
        return { errorName: error.name, errorMessage: error.message };
      }
      if (typeof error === 'string') {
        return { errorMessage: error };
      }
      return {};
    }
    ```
  - [x] **Allowlist enforcement (AC7):** loop the ALLOWED_KEYS rather than spreading `...input` — this is the mechanism that drops unexpected fields like `name`/`email`/`token` if a future caller passes them in. Add a unit test (`supportSignal.test.ts`) for: full-shape happy path; minimum-fields happy path (only `subsystem`/`code`/`message`/`correlationId`); `correlationId: null` is preserved (not dropped); unexpected fields (`name`, `password`, `token`) are dropped; `errorName`/`errorMessage` extracted from a `new Error(...)`, from a string, and from `{}` (returns empty).
  - [x] **No `undefined` keys (AC7):** the spec calls out that omitted optional fields must be absent from the JSON, not present with `undefined` — the loop achieves this; do not switch to spread/Object.assign.
  - [x] Do NOT extract this into a shared `backend/shared/` folder. The duplication is intentional per Scope Guard.

- [x] **Task 2: Correlation ID propagation in `character-service` and `battle-service`** (AC: 4)
  - [x] Add an Express middleware to both services that reads `x-correlation-id` (preferred) then `x-request-id` (fallback) from the inbound request, generates a UUID v4 (`crypto.randomUUID()`) if neither is present, stores it on `res.locals.correlationId`, and echoes it back on every response via `res.setHeader('x-correlation-id', value)`. Mount the middleware AFTER `express.json()` and BEFORE the route prefix stripper, so every request — including 400/404/health — carries an id.
  - [x] In `backend/character-service/src/app.ts`, thread `res.locals.correlationId` into every `publisher.publish(createCharacterEventPayload({ ..., correlationId }))` call (lines ~267, 352, 393 in current file). This finishes the work the 6-1 code review explicitly deferred (`correlationId` plumbed through `CharacterEventPayload` but never extracted from request headers — see [Source: _bmad-output/implementation-artifacts/deferred-work.md → "code review of 6-1-character-events-are-published-for-room-history"]).
  - [x] In `backend/battle-service/src/app.ts`, thread `res.locals.correlationId` into every `publisher.publish(createBattle*EventPayload({ ..., correlationId }))` call (lines ~351, 418, 459, 492). The publisher's payload factory must accept and store it; check `backend/battle-service/src/publisher.ts` `createBattleStartedEventPayload` etc. and add the optional `correlationId` argument in the same shape as `character-service` already does (`CharacterEventPayload.correlationId?: string`). Do NOT change other fields.
  - [x] When firing `support.failure` from these services, always pass `res.locals.correlationId` as the `correlationId` field (never `undefined` — pass `null` if for some reason `res.locals` was never populated, e.g. error before middleware ran).
  - [x] Do NOT add this middleware to `room-service` / `user-service` / `log-service` / `room-notifications-service` for header parsing of inbound HTTP — they have no event publish path that downstream consumers need to correlate against, and adding it would expand scope. For these services, the correlationId on `support.failure` lines is `null` unless propagated from an upstream payload (see Task 5 for log-service and Task 6 for room-notifications-service).

- [x] **Task 3: Wire `support.failure` into express error middleware in all six services** (AC: 1, 2, 8)
  - [x] **`backend/character-service/src/app.ts:418-421`** — replace
    ```ts
    console.error('[character-service] unhandled error', { message: err.message, name: err.name });
    res.status(500).json({ message: 'Internal server error', details: err.message });
    ```
    with a call that ALSO emits `support.failure` BEFORE responding:
    ```ts
    const { errorName, errorMessage } = extractErrorFields(err);
    logSupportFailure({
      subsystem: 'character',
      code: 'unexpected_error',
      message: 'Unhandled error in character-service',
      correlationId: (res.locals.correlationId as string | undefined) ?? null,
      httpStatus: 500,
      errorName,
      errorMessage
    });
    console.error('[character-service] unhandled error', { message: err.message, name: err.name });
    res.status(500).json({ message: 'Internal server error', details: err.message });
    ```
    Keep the existing `console.error` for backward-compatible log searches.
  - [x] **`backend/battle-service/src/app.ts:506-513`** — same pattern; `subsystem: 'battle'`, `code: 'unexpected_error'`, `httpStatus: 502`. Keep the existing `entity.parse.failed` 400 short-circuit (NOT a support failure — it is bad client input).
  - [x] **`backend/log-service/src/app.ts:43-51`** — same pattern; `subsystem: 'log'`, `code: 'unexpected_error'`, `httpStatus: 502`. Keep the `SyntaxError` 400 short-circuit (NOT a support failure).
  - [x] **`backend/room-notifications-service/src/app.ts`** — `room-notifications-service`'s `app.ts` does NOT host an Express server (it exports WebSocket helpers and event-shape parsers). Its error paths live in `service.ts` `sendEventToConnections` — covered in Task 6. There is no express error middleware to modify here. Confirm by re-reading [Source: backend/room-notifications-service/src/app.ts] and skip this sub-task; do not add an unused Express app.
  - [x] **`backend/room-service/src/app.ts:218-220`** — same pattern; `subsystem: 'room'`, `code: 'unexpected_error'`, `httpStatus: 500`. Do not change the body shape (keeps `details`).
  - [x] **`backend/user-service/src/app.ts:173-175`** — same pattern; `subsystem: 'room'` (the user-service backs anonymous identity which is a session-continuity prerequisite per FR1–FR2, but the user-service itself is the room-onboarding entry point; classify under `session_continuity` since user-profile failures break session restore — see catalog in §Library / Framework Requirements). Use `code: 'unexpected_error'`, `subsystem: 'session_continuity'`, `httpStatus: 500`.
  - [x] **Test for each service (AC8):** add a `support.failure_unexpected_error.test.ts` (or extend the existing `app.test.ts`) that registers a temporary route via the app factory that throws, hits it via supertest, and asserts (a) the documented status/body still returns AND (b) `console.error` was called with `'support.failure'` and an object containing `subsystem`, `code: 'unexpected_error'`, `httpStatus`. Use `vi.spyOn(console, 'error')` and restore in `afterEach`.

- [x] **Task 4: Wire `support.failure` into publisher failure catches** (AC: 1, 2, 4)
  - [x] **`backend/character-service/src/app.ts`** publisher catches (lines ~279, 365, 405): wrap the existing `console.error('Failed to publish character_created event', error)` so it ALSO emits `logSupportFailure({ subsystem: 'character', code: 'character_event_publish_failed', message: \`Failed to publish ${event} event\`, correlationId: res.locals.correlationId ?? null, roomId: character.roomId, actorId: character.id, ...extractErrorFields(error) })`. Keep the existing `console.error` for backward compatibility.
  - [x] **`backend/battle-service/src/app.ts`** publisher catches (lines ~352, 419, 460, 493): same pattern; `subsystem: 'battle'`, `code: 'battle_event_publish_failed'`, `roomId: battle.roomId`, `actorId: battle.id`.
  - [x] Do NOT wrap the inner publisher leg-failure logs in `FanoutCharacterEventPublisher` / `BattleEventPublisher` (`backend/character-service/src/publisher.ts:43-54`, equivalent in battle-service publisher) — those already log per-leg with structured context; wrapping them too would double-emit `support.failure`. The single emission point is the outer route-handler catch.
  - [x] Do NOT emit `support.failure` from `NoopBattleEventPublisher` / `NoopCharacterEventPublisher` — the noop log line is informational, not a failure.

- [x] **Task 5: Wire `support.failure` into log-service subscriber and reader** (AC: 1, 2, 5)
  - [x] **`backend/log-service/src/subscriber.ts:32-37`** — replace the existing `console.warn('log.sns.invalid_event', { message })` with `logSupportFailure({ subsystem: 'log', code: 'log_invalid_event', message: 'SNS message failed parseLogEvent', correlationId: null })`. Do NOT include the raw `message` field in the support signal — it may contain a full event payload, and AC2 forbids unrelated user data. Keep a separate `console.warn` for ops-only debugging if needed, but the support signal must be sanitized.
  - [x] **`backend/log-service/src/subscriber.ts:42-50`** — replace `console.warn('log.sns.persist_failed', {...})` with `logSupportFailure({ subsystem: 'log', code: 'log_persist_failed', message: 'Failed to persist log event', correlationId: <see next bullet>, roomId: parsed.roomId, actorId: parsed.actorId, ...extractErrorFields(error) })`.
  - [x] **Correlation propagation in log-service (AC4 ∩ AC5):** `parseLogEvent` does not currently expose `correlationId`. Extend `LogEventInput` (in `backend/log-service/src/service.ts:4-11`) with an optional `correlationId: string | null`, populated from `trimString(payload.correlationId) || null` inside `parseLogEvent` (~line 167). Thread it to `support.failure` calls. Do NOT persist `correlationId` to the `logEvents` Mongo collection — it is operational metadata, not log-event content (and the `LogEvent` schema is part of the Story 6.x contract; changing the document shape would require schema migration consideration). Surface it only in support signals.
  - [x] **`backend/log-service/src/routes/logs.ts`** (read path): wrap the request handlers' catch blocks to emit `subsystem: 'log'`, `code: 'log_read_failed'` only when an unexpected exception (not a `400`/`404`) bubbles out. If routes simply call `next(error)` and rely on the app error middleware (Task 3), do NOT double-emit — verify which path applies by reading the file, then act accordingly.

- [x] **Task 6: Wire `support.failure` into room-notifications-service WS fanout** (AC: 1, 2, 6)
  - [x] **`backend/room-notifications-service/src/service.ts:100-107`** — `sendEventToConnections` catch (not the 410-stale branch): replace the `console.error('room-notifications.event.delivery_failed', {...})` body with an additional `logSupportFailure({ subsystem: 'session_continuity', code: 'ws_event_delivery_failed', message: \`Failed to deliver ${event.event}\`, correlationId: (event.correlationId ?? null) as string | null, roomId: event.roomId, actorId: ('characterId' in event.event_body ? event.event_body.characterId : event.event_body.battleId), sessionId: connection.connectionId, ...extractErrorFields(error) })`. Keep the existing `console.error` line for ops; the `support.failure` is additive.
  - [x] The 410-stale-connection branch (`isGoneConnectionError`) is intentional housekeeping, NOT a failure — do NOT emit `support.failure` there. AC6 explicitly excludes it.
  - [x] **`backend/room-notifications-service/src/lambda.ts`** and `index.ts` (if they have an unhandled-rejection / dispatch failure catch): emit `subsystem: 'session_continuity'`, `code: 'ws_dispatch_failed'` on dispatcher-level failures only. Read each file first; if the file is just wiring with no failure handling, skip — do not introduce a new try/catch just to emit a signal.
  - [x] Validate that `RoomNotificationEvent` already carries `correlationId` (confirmed: `backend/room-notifications-service/src/app.ts:101, 126, 141` and `types.ts:13`). No types change needed.

- [x] **Task 7: Author `docs/release-support-reference.md`** (AC: 3)
  - [x] Create new file `docs/release-support-reference.md` with the structure:
    1. **Purpose** — one paragraph: "What this document is and who reads it" (support, QA, release engineer; pairs with `docs/architecture-backend.md`).
    2. **Subsystem Categories** — table with five rows mapping `subsystem` value → human label → which services emit it → which FR (FR45/FR46) it satisfies. Categories: `room` (room-service), `character` (character-service), `battle` (battle-service), `log` (log-service subscriber + reader), `session_continuity` (room-notifications-service + user-service).
    3. **Signal Shape** — the JSON schema of a `support.failure` line, all fields documented with type and example value, copy-paste ready.
    4. **Code Catalog** — table of every code defined in this story:
        | Code | Subsystem | Emitted from | Meaning |
        |---|---|---|---|
        | `unexpected_error` | (varies) | Express error middleware in each service | Catch-all for errors that escape route handlers |
        | `character_event_publish_failed` | character | `character-service` route catches | SNS or Redis publish failed for a character_* event |
        | `battle_event_publish_failed` | battle | `battle-service` route catches | SNS or Redis publish failed for a battle_* event |
        | `log_invalid_event` | log | `log-service` subscriber | SNS payload failed `parseLogEvent` |
        | `log_persist_failed` | log | `log-service` subscriber | Mongo write failed for parsed event |
        | `log_read_failed` | log | `log-service` reader (if applicable per Task 5) | Unexpected error in read path |
        | `ws_event_delivery_failed` | session_continuity | `room-notifications-service` | WebSocket post to a connection failed (non-410) |
        | `ws_dispatch_failed` | session_continuity | `room-notifications-service` | Lambda/local dispatcher hit an unexpected error (only if Task 6 file read warrants) |
    5. **CloudWatch Logs Insights query** — copy-paste, e.g.:
       ```
       fields @timestamp, @log, @message
       | filter @message like /support\.failure/
       | parse @message 'support.failure *' as raw
       | parse raw /"subsystem":"(?<subsystem>[^"]*)","code":"(?<code>[^"]*)"/ 
       | filter subsystem = "battle"
       | sort @timestamp desc
       | limit 200
       ```
    6. **Local Docker logs command** — `docker compose -f backend/docker-compose.local.yml logs --tail=500 | grep 'support.failure' | grep '"subsystem":"battle"'`.
    7. **Correlation IDs** — short paragraph: how to read `x-correlation-id` in a `curl -v` response, how to grep for it across services to follow a single request through the system.
    8. **What this document is NOT** — explicit non-goals: it is not the release-readiness checklist (Story 7.6), not the diagnostic validation matrix (Story 7.8), not an SLA or incident-response runbook.
  - [x] Add a one-line reference to this new doc in `docs/index.md` and in `docs/architecture-backend.md` under a new "## Supportability" section pointing at it. Do not duplicate the catalog in two places — the new file is the source of truth.

- [x] **Task 8: Quality gates per service** (AC: 7, 8)
  - [x] Run `npm run lint` and `npm run test:coverage` in each modified service (`backend/character-service`, `backend/battle-service`, `backend/log-service`, `backend/room-notifications-service`, `backend/room-service`, `backend/user-service`). Backend coverage floor is 70% per `_bmad-output/project-context.md`; new files (`supportSignal.ts` + tests) should land at or above that.
  - [x] Run root `npm run typecheck` to catch any cross-service `correlationId` type drift on `CharacterEventPayload` / `BattleEventPayload`.
  - [x] No frontend changes in this story; do NOT run frontend gates unless something inadvertently touched a contract the frontend reads (it should not — event payloads still serialize the same way).
  - [x] Skim Docker Compose local stack: `npm run start:local` from `backend/`, hit one of the failing-test routes (or temporarily POST garbage to `/battles`), and grep `docker compose logs | grep support.failure` to confirm the signal renders. Tear down before completion.

### Review Findings

_Code review on 2026-05-23. Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (all completed)._

- [x] [Review][Decision] Spec self-contradiction "replaced" vs "stay as they are" — AC5 / AC6 / Task 5 instruct devs to **replace** the existing `console.warn('log.sns.invalid_event')`, `console.warn('log.sns.persist_failed')`, and `console.error('room-notifications.event.delivery_failed')` lines with `support.failure`, but Task 0 Scope Guard says these pre-existing lines "stay as they are". Implementation was inconsistent: log-service deleted both `log.sns.invalid_event` and `log.sns.persist_failed` warn lines (matched AC5/Task 5); `room-notifications-service` kept `console.error('room-notifications.event.delivery_failed', …)` additively next to `logSupportFailure` (deviated from AC6 "replaced"). **Resolved: replace everywhere** — the residual `console.error('room-notifications.event.delivery_failed', …)` in `backend/room-notifications-service/src/service.ts` was removed; existing test was strengthened to assert `console.error` called exactly once with `'support.failure'`. Operators must migrate any monitoring matching the deleted strings to filter on `support.failure` + `code` instead.
- [x] [Review][Decision] AC8 enumeration vs Task 3 skip for `room-notifications-service` — AC8 listed `room-notifications-service` among the six services that must have an Express error middleware integration test asserting `console.error('support.failure', { subsystem, code: 'unexpected_error', … })`, but Task 3 said skip because the service has no Express error middleware. **Resolved: added a thin `unexpected_error` test** — wrapped the Lambda `handler` in `backend/room-notifications-service/src/lambda.ts` in a top-level try/catch that emits `logSupportFailure({ subsystem: 'session_continuity', code: 'unexpected_error', …extractErrorFields(error) })` and rethrows, with a matching test in `lambda.test.ts` that triggers a `connectToMongo` failure and asserts the exact signal shape.

- [x] [Review][Patch] CR/LF in `x-correlation-id` header crashes the middleware on Node ≥18 [`backend/character-service/src/app.ts:60-71`, `backend/battle-service/src/app.ts:118-129`] — `readCorrelationHeader` was updated to strip ASCII control characters (`/[\x00-\x1F\x7F]/g`) before trimming, so values containing CR/LF/NUL never reach `res.setHeader`. Helper exported and unit-tested directly (supertest cannot transmit malformed headers). New test covers CR/LF, NUL, tab, DEL, whitespace-only, undefined, array values, and the header-injection vector `'foo\r\nX-Injected: bar'`.

- [x] [Review][Defer] No length cap on `x-correlation-id` value [`backend/character-service/src/app.ts:60-71`, `backend/battle-service/src/app.ts:118-129`] — deferred, defensive hardening (CloudWatch 256 KB log-line limit risk; mitigations belong with broader request-size hardening).
- [x] [Review][Defer] `extractErrorFields` leaks raw `error.message` content (Mongo connection strings with credentials, full Mongoose validation docs, etc.) [`backend/*/src/supportSignal.ts:52-60`] — deferred, AC2 scopes "user data" but not operational secrets in error messages; address with broader log-redaction policy.
- [x] [Review][Defer] `extractErrorFields` does not unwrap `AggregateError` — top-level `.message` is often empty so inner errors are lost when fanout publishers reject [`backend/*/src/supportSignal.ts:52-60`] — deferred, low frequency in current codebase (only `FanOutBattleEventPublisher` uses `Promise.allSettled` and it logs failures separately).
- [x] [Review][Defer] `logSupportFailure` does not guard against `console.error` throwing [`backend/*/src/supportSignal.ts:33-49`] — deferred, low likelihood in current Lambda/Express setup; revisit if a structured-logging wrapper is introduced.
- [x] [Review][Defer] `log-service` subscriber `connectToMongo` cold-start failure is unhandled — no `support.failure` is emitted before the function exits [`backend/log-service/src/subscriber.ts:29`] — deferred, AC5 only mandates persistence-failure signals after a parsable record is received; cold-start observability belongs with the Lambda failure-mode story.

## Dev Notes

### Story Foundation

- This story is the **observability + classification layer** that FR45 and FR46 require. FR45 = "support can identify when failures occur"; FR46 = "support can distinguish which subsystem". Story 7.8 (Diagnostic Validation Matrix) will exercise this by injecting failures and confirming each one surfaces with the right subsystem — so the contract this story defines is what 7.8 will validate. Get the catalog right; 7.8 is the verifier, not the redesigner.
- The five subsystems map 1:1 to the FR46 enumeration: room, character, battle, log, session-continuity. Do not invent additional categories. If a failure does not cleanly fit (e.g. user-service unexpected error), assign the closest enclosing category — for user-service it is `session_continuity` because anonymous-identity failure breaks session restore (FR1, FR37, FR39).
- This story does NOT change product behavior. Every existing test must continue to pass with the same status codes and response bodies. The only "behavior" being added is a structured log line that is invisible to users.
- Treat the `support.failure` tag as a **load-bearing string constant**. Once shipped, support documentation, runbooks, QA matrices, and the eventual 7.8 validation will key off it. Do NOT rename it later without coordinated updates.

### Current Implementation — What Exists Today

| Layer | File | What it does today | What this story changes |
|---|---|---|---|
| `character-service` error middleware | [backend/character-service/src/app.ts:418-421] | `console.error('[character-service] unhandled error', {...})` + `res.status(500).json({...})` | Adds `logSupportFailure({subsystem:'character', code:'unexpected_error', ...})` BEFORE the existing log; status + body unchanged |
| `battle-service` error middleware | [backend/battle-service/src/app.ts:506-513] | `console.error('[battle-service] unhandled error', {...})` + `res.status(502).json({...})` | Same pattern; `subsystem:'battle'`, status + body unchanged |
| `log-service` error middleware | [backend/log-service/src/app.ts:43-51] | `console.error('[log-service] unexpected error', error)` + `res.status(502).json({...})` | Same pattern; `subsystem:'log'`, status + body unchanged |
| `room-service` error middleware | [backend/room-service/src/app.ts:218-220] | `res.status(500).json({...})` (no current `console.error` in middleware) | Adds `logSupportFailure({subsystem:'room', code:'unexpected_error', ...})`; status + body unchanged |
| `user-service` error middleware | [backend/user-service/src/app.ts:173-175] | `res.status(500).json({...})` (no current `console.error` in middleware) | Adds `logSupportFailure({subsystem:'session_continuity', code:'unexpected_error', ...})`; status + body unchanged |
| `character-service` publisher catches | [backend/character-service/src/app.ts:267-281, 352-367, 393-407] | `console.error('Failed to publish ${event} event', error)` | Adds `logSupportFailure(...)` alongside existing log |
| `battle-service` publisher catches | [backend/battle-service/src/app.ts:350-354, 417-421, 458-462, 491-495] | `console.error('Failed to publish ${event} event', error)` | Same |
| `log-service` SNS subscriber | [backend/log-service/src/subscriber.ts:32-50] | `console.warn('log.sns.invalid_event', {message})` + `console.warn('log.sns.persist_failed', {...})` | Replaces invalid_event message-leaking warn with sanitized `support.failure`; adds `support.failure` for persist_failed |
| `room-notifications-service` fanout | [backend/room-notifications-service/src/service.ts:89-109] | `console.warn('room-notifications.connection.stale', {...})` for 410; `console.error('room-notifications.event.delivery_failed', {...})` for others | Adds `support.failure` ONLY to the non-410 path (410 is housekeeping, not a failure) |
| `correlationId` plumbing | [backend/character-service/src/publisher.ts:13, 168-181], [backend/battle-service/src/publisher.ts:18, 186-200] | Field declared on payload types, accepted by factory, set to `undefined` because no caller passes one | Adds inbound header → `res.locals.correlationId` → factory call site (Task 2); closes the 6-1 review's deferred work item |
| `correlationId` on WS events | [backend/room-notifications-service/src/app.ts:101, 126, 141, types.ts:13] | Already accepted and parsed | No types change; consumed in Task 6 |

### What This Story Changes vs Preserves

- **Changes:** Adds `src/supportSignal.ts` and a co-located test in each of six services. Wraps eight existing failure call sites with an additional `logSupportFailure` emission (additive — existing `console.*` lines stay). Adds an Express middleware in `character-service` and `battle-service` to populate `res.locals.correlationId`. Threads `correlationId` from header → publisher payload in those two services. Creates one new docs file `docs/release-support-reference.md` and adds two pointer lines (`docs/index.md`, `docs/architecture-backend.md`).
- **Preserves:** Every HTTP status code, every response body shape, every event payload shape (other than now populating an already-declared optional `correlationId`), every existing log line, every route, every database collection schema, every Lambda/SAM/docker-compose wiring, every frontend file. Coverage gate stays at 70%. Project structure unchanged.

### Architecture Guardrails

- **Per-service duplication, not shared package** — `_bmad-output/project-context.md` line 89 ("Avoid premature shared-core coupling across services; only centralize shared types/contracts when a maintained shared module is explicitly part of the design"). Each service owns its own `supportSignal.ts`. The contract is enforced by `docs/release-support-reference.md`, not by code. If drift becomes painful later, that is when to introduce a shared module — not now.
- **Backend-only signal** — AC1 says "structured backend logs". Frontend instrumentation is out of scope. Story 7.8 will exercise frontend-visible failures by triggering them at the backend and reading the resulting `support.failure` lines.
- **Log line tag is a constant** — `'support.failure'` is a literal string passed as the first arg of `console.error`. Do not interpolate, do not template, do not wrap in a prefix. CloudWatch Logs Insights and `grep` both rely on this literal anchor.
- **No new dependencies** — `crypto.randomUUID()` is on Node 20+ (backend baseline per `_bmad-output/project-context.md` line 20). Do not add `uuid`, `nanoid`, `pino`, `winston`, or any logger library. `console.error` with a structured object is the existing project pattern and is preserved.
- **No frontend types coupling** — the frontend `webSocket.ts` `RoomNotificationEvent` does not include `correlationId` today and does not need to. The backend's `RoomNotificationEvent` (which does) is server-only; the WS broadcast payload to clients is `{event, event_body}` only (see [backend/room-notifications-service/src/service.ts:66-70]).
- **Architectural Variance — 500 vs 502 (preserved):** `room-service`, `user-service`, `character-service` return `500`; `battle-service`, `log-service` return `502`. The implementation-patterns doc says "Unexpected error in Lambda | `502` (never `500`)" but the older services pre-date that rule. Normalizing them is out of scope for 7.7 — explicitly preserve the existing codes so this story is purely additive. Flag the inconsistency in the "What this document is NOT" section of `release-support-reference.md` as a known follow-up.
- **Test mocks for `console.error`** — `vi.spyOn(console, 'error').mockImplementation(() => {})` in `beforeEach`, restore in `afterEach`. Existing tests already mock `console.error` in some places (e.g. `backend/battle-service/src/app.test.ts` — verify before adding). Do not silence `console.error` globally in `vitest.config.ts`.

### Previous Story Intelligence

- **Story 7.5 (Release-Facing Compliance Content) — ready-for-dev sibling:** Pure content/docs story; ships privacy + support pages. Same release-readiness epic but no code overlap. 7.7 must NOT change the published `support@helpamunch.click` (or whatever 7.5 lands as) email surface — `release-support-reference.md` is for internal operators, not end users. Do not link the new doc from `frontend/app/support.tsx`.
- **Story 6.1 deferred work — directly relevant:** [Source: _bmad-output/implementation-artifacts/deferred-work.md → "code review of 6-1-character-events-are-published-for-room-history"] explicitly noted "`correlationId` plumbed through `CharacterEventPayload` and `createCharacterEventPayload` but never extracted from request headers (`x-correlation-id`/`x-request-id`)". Task 2 in this story closes that gap. Mention it in the change log so the next reviewer sees the loop closed.
- **Story 5.7 deferred work — partially relevant:** `Publisher-failure has no retry / dead-letter` is recorded but NOT solved here; 7.7 makes the failure observable, not recoverable. Recovery / DLQ remains future work — note it as "follow-up, not 7.7" in the dev completion notes.
- **Story 5.6 deferred work — context:** "Backend conclude logs all client-provided `Object.keys(body)` unbounded" is a log-volume / log-injection vector. 7.7's `support.failure` does NOT include raw request bodies or unbounded client input (AC2 enforces this via the allowlist) — the new helper is by design safer than the existing operational logs. Do not change the existing `console.info` logs to fix this in 7.7; that is a separate hardening task.
- **Story 6.2 deferred work — context:** `connectToMongo` does not reconnect after a dropped connection. If this manifests during the story 7.7 work it will surface as a Mongo error in the log-service subscriber, which will trip the new `log_persist_failed` signal — making the bug more visible without changing it. That's the right outcome.
- **Pattern reference — `'log-service.event.persisted'` style:** existing service logs use dotted-namespace strings as the first `console.info` arg (`'log.sns.received'`, `'room-notifications.connection.upserted'`). `'support.failure'` matches that convention and is reserved for the new signal.

### Git Intelligence Summary

- Recent epic-6 stories (6.1–6.7) all landed via codex/agent commits — they introduce the publish-on-create / log-subscriber paths that 7.7 instruments. The codex agents reused the publisher-catch-and-`console.error` idiom verbatim across `character_*` and `battle_*` events — that consistency is why Task 4's wrapping is mechanical and low-risk.
- 7.5 (latest at `6cd798f`) is a docs/UI-only story; no risk of merge conflict with 7.7's backend-only changes.
- The 5.x battles work (`abd8e22`, etc.) is the most-recent service-creation precedent — both `battle-service` and `log-service` were scaffolded as full services. 7.7 does NOT scaffold new services; it instruments the existing six.
- No release/tag work in flight on `main`; safe to land additive instrumentation.

### Latest Technical Information

- **Node 20 `crypto.randomUUID()`** is stable, synchronous, and built-in — no `import { randomUUID } from 'node:crypto'` is required if you prefer `globalThis.crypto.randomUUID()`, but the `node:crypto` import is the more conservative choice and matches existing repo style (no global polyfills assumed). Use `import { randomUUID } from 'node:crypto'`.
- **`console.error` with a string + object in AWS Lambda + CloudWatch** serializes as `<level> support.failure { ... }` on a single line. The CloudWatch Logs Insights `parse @message` pattern in Task 7's example query is verified to match this format.
- **Express 5** `res.locals` is per-response, type-safe via `declaration merging` if you want strict typing. Story scope keeps the field as `string | undefined` accessed via `as` cast; do not add a `@types/express` declaration merge unless the rest of the codebase already uses one (it does not currently — verify before deviating).
- **Vitest 3 (`backend` testing dependency per `_bmad-output/project-context.md` line 26):** `vi.spyOn(console, 'error')` returns a spy with `.mockImplementation`; pair with `vi.restoreAllMocks()` in `afterEach` to avoid leaking spies between tests in the same file.
- **`x-correlation-id` vs `x-request-id`:** both are de-facto industry conventions. AWS API Gateway injects `x-amzn-trace-id` but it is opaque to the application — do NOT use it as the correlationId source. Prefer client-controlled `x-correlation-id` (caller can pre-generate to trace a single user action across services), fall back to `x-request-id` (some load balancers inject this), generate a UUID v4 if neither.

### Project Context Reference

- See `_bmad-output/project-context.md` — load-bearing rules for this story:
  - "Keep edits minimal and localized" — 7.7 is additive, not a refactor.
  - "Preserve existing public API signatures and route contracts unless the task explicitly includes contract changes" — no contract changes in 7.7.
  - "Avoid premature shared-core coupling across services" — drives the per-service `supportSignal.ts` choice.
  - "Preserve existing error response consistency instead of introducing ad hoc message/shape formats" — body shapes stay; the new structured signal is a log line, not a response.
  - "Keep comments sparse and purposeful" — the `eslint-disable-next-line no-console` in `supportSignal.ts` is the one comment that earns its keep (explains why `console.error` is intentional here).
  - "When changing behavior, env vars, or endpoint contracts, update the nearest relevant docs" — that is why Task 7 ships `docs/release-support-reference.md` in the same change.
  - "Coverage is a floor, not the goal" — write tests that prove the signal shape and the wiring, not tests that hit 100% line coverage on a 30-line helper.
- See `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` "Process Patterns → Error Handling — Backend": existing rule "Catch unexpected errors → `res.status(502).json({ message: 'Unexpected error' })` (never `500` in Lambda)". 7.7 explicitly does NOT enforce this on the legacy 500-returning services; flag as a separate follow-up.

### Project Structure Notes

- No folder restructuring. New files:
  - `backend/character-service/src/supportSignal.ts` + `supportSignal.test.ts`
  - `backend/battle-service/src/supportSignal.ts` + `supportSignal.test.ts`
  - `backend/log-service/src/supportSignal.ts` + `supportSignal.test.ts`
  - `backend/room-notifications-service/src/supportSignal.ts` + `supportSignal.test.ts`
  - `backend/room-service/src/supportSignal.ts` + `supportSignal.test.ts`
  - `backend/user-service/src/supportSignal.ts` + `supportSignal.test.ts`
  - `docs/release-support-reference.md`
- Modified files (additive only):
  - `backend/character-service/src/app.ts` — middleware + 1 error path + 3 publisher catches
  - `backend/character-service/src/publisher.ts` — accept `correlationId` from caller (already a field; only the createCharacterEventPayload signature needs to receive it from the new middleware)
  - `backend/battle-service/src/app.ts` — middleware + 1 error path + 4 publisher catches
  - `backend/battle-service/src/publisher.ts` — accept `correlationId` from caller (parallel to character-service)
  - `backend/log-service/src/app.ts` — 1 error path
  - `backend/log-service/src/subscriber.ts` — 2 warn paths converted
  - `backend/log-service/src/service.ts` — `LogEventInput` extended; `parseLogEvent` populates `correlationId`
  - `backend/log-service/src/routes/logs.ts` — only if route catch is the actual emission point (verify first)
  - `backend/room-notifications-service/src/service.ts` — 1 error path
  - `backend/room-service/src/app.ts` — 1 error path
  - `backend/user-service/src/app.ts` — 1 error path
  - `docs/index.md` — 1 line addition
  - `docs/architecture-backend.md` — 1 section addition (~4 lines)

### Testing Standards Summary

- Backend test runner: Vitest 3.2.4, Node environment, v8 coverage. 70% line coverage floor.
- Test file naming: `<source>.test.ts` co-located alongside source. `supportSignal.test.ts` next to `supportSignal.ts`.
- Casing: `supportSignal.ts` → `supportSignal.test.ts` (camelCase source, camelCase test — per implementation-patterns "Test file casing mirrors source exactly").
- Mock `console.error` via `vi.spyOn` per test; restore in `afterEach`. Do NOT silence globally.
- For middleware tests, use the existing app-factory pattern: pass in a mock model that throws, hit a route via supertest, assert response + spy.
- For publisher-catch tests, inject a `NoopBattleEventPublisher` / `NoopCharacterEventPublisher` subclass that throws on `publish()`, and assert `support.failure` was emitted.
- For subscriber tests, call `handler(snsEvent)` directly with a malformed message and assert the subscribed `console.error` spy.
- Coverage scope: the `supportSignal.ts` helper itself must be fully covered (every branch). Wiring code (the catches) needs at least one test per service confirming the spy fires; exhaustive per-call-site coverage is not required — the helper unit tests cover the shape.

### Architectural Variance — Explicit Out-of-Scope

The following inconsistencies exist today and are KNOWN; this story does NOT fix them, to keep the change additive:

1. **500 vs 502** — `room-service`, `user-service`, `character-service` return `500` from their catch-all middleware; `battle-service`, `log-service` return `502`. The architecture rule says `502` in Lambda. Document the variance in `release-support-reference.md`; do not normalize here.
2. **Response body keys** — `room-service`/`user-service`/`character-service` use `{ message, details }`; `battle-service`/`log-service` use `{ message }`. Preserve as-is.
3. **`details: err.message` may leak internals** — the older `{ message, details }` shape echoes raw error messages to clients. Not 7.7's job to redact; flag as security-hardening follow-up.
4. **`db.ts` connect-promise reconnect gap** — flagged in 6.2 deferred work; will likely surface as a new `log_persist_failed` signal once 7.7 ships. That visibility is the desired outcome; the underlying fix is separate work.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-7-distribution-availability-supportability-release-operations.md#Story 7.7]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#Product Supportability & Release Readiness] (FR45, FR46)
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements.md#Supportability] (NFR10, NFR11)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Process Patterns] (error-handling pattern reference)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#Auth & Security] (anonymous `deviceId` only — no PII to redact in roomId)
- [Source: _bmad-output/project-context.md] (binding repo-wide rules — coverage floor, no shared-core coupling, edit minimalism)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — items closed by this story: 6-1 `correlationId` extraction. Items explicitly NOT closed: 5-7 publisher retry/DLQ, 6-2 Mongo reconnect, 5-6 unbounded log keys.
- [Source: backend/character-service/src/app.ts] (lines 418-421 error middleware; lines 267-281, 352-367, 393-407 publisher catches)
- [Source: backend/character-service/src/publisher.ts] (lines 13, 158-190 — existing `correlationId` field and factory)
- [Source: backend/battle-service/src/app.ts] (lines 506-513 error middleware; lines 350-354, 417-421, 458-462, 491-495 publisher catches)
- [Source: backend/battle-service/src/publisher.ts] (parallel `correlationId` field)
- [Source: backend/log-service/src/app.ts] (lines 43-51 error middleware)
- [Source: backend/log-service/src/subscriber.ts] (lines 32-50 — invalid_event + persist_failed warn paths)
- [Source: backend/log-service/src/service.ts] (lines 4-11 `LogEventInput`; line 167 `parseLogEvent` correlationId extraction point)
- [Source: backend/room-notifications-service/src/service.ts] (lines 89-109 fanout catch)
- [Source: backend/room-notifications-service/src/app.ts] (line 101 — existing `correlationId` on `RoomNotificationEvent`)
- [Source: backend/room-notifications-service/src/types.ts] (line 13 — `RoomNotificationEvent.correlationId?`)
- [Source: backend/room-service/src/app.ts] (lines 218-220 error middleware)
- [Source: backend/user-service/src/app.ts] (lines 173-175 error middleware)
- [Source: backend/character-service/src/publisher.test.ts] (existing `correlationId` test pattern at line 51, 64 — mirror this for new tests)
- [Source: backend/battle-service/src/publisher.test.ts] (existing `correlationId` test pattern at line 86-88)
- [Source: docs/architecture-backend.md] (Section to receive new "Supportability" pointer)
- [Source: docs/index.md] (file to receive new doc link)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test` from `backend/` passed: 34 files, 214 tests.
- `npm run typecheck` from `backend/` passed across all six workspaces.
- `npm run test:coverage` from `backend/` passed with 88.63% aggregate line coverage; every new `supportSignal.ts` reports 100%.
- `npm test -- supportSignal.test.ts` from `backend/` passed after adding the email allowlist regression assertion.
- `docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'` confirmed the local Docker Compose stack was already running. `backend/package.json` has no `start:local` script, and this worktree has no `scripts/dev-up.sh`; no rebuild/restart was performed.
- No `npm run lint` script exists in the modified backend service packages.

### Completion Notes List

- Added identical per-service `supportSignal.ts` helpers and tests for full/minimum shapes, null correlation IDs, undefined omission, type-level subsystem restriction, safe error extraction, and dropping `name`/`email`/`password`/`token`.
- Added character-service and battle-service correlation ID middleware after `express.json()`, echoing `x-correlation-id` and threading it into published character/battle event payloads.
- Added `support.failure` emissions to all expected Express catch-all middleware without changing status codes or response bodies.
- Added route-level publisher failure signals for character and battle events while leaving inner fanout leg logs and noop publishers unchanged.
- Replaced log-service SNS invalid/persist warning paths with sanitized `support.failure` signals and propagated parsed event `correlationId` without persisting it.
- Added room-notifications non-410 WebSocket fanout failure signals with `sessionId` and event correlation ID.
- Added the internal release support reference and linked it from the docs index and backend architecture. `log_read_failed` and `ws_dispatch_failed` are documented as reserved because the current files delegate errors rather than owning direct catches.
- Deferred retry/DLQ, Mongo reconnect behavior, status-code normalization, and response-body hardening remain follow-up work outside 7.7.

### File List

- _bmad-output/implementation-artifacts/7-7-supportability-signals-failure-taxonomy.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/battle-service/src/app.test.ts
- backend/battle-service/src/app.ts
- backend/battle-service/src/publisher.ts
- backend/battle-service/src/supportSignal.test.ts
- backend/battle-service/src/supportSignal.ts
- backend/character-service/src/app.test.ts
- backend/character-service/src/app.ts
- backend/character-service/src/supportSignal.test.ts
- backend/character-service/src/supportSignal.ts
- backend/log-service/src/app.test.ts
- backend/log-service/src/app.ts
- backend/log-service/src/service.test.ts
- backend/log-service/src/service.ts
- backend/log-service/src/subscriber.test.ts
- backend/log-service/src/subscriber.ts
- backend/log-service/src/supportSignal.test.ts
- backend/log-service/src/supportSignal.ts
- backend/room-notifications-service/src/service.test.ts
- backend/room-notifications-service/src/service.ts
- backend/room-notifications-service/src/supportSignal.test.ts
- backend/room-notifications-service/src/supportSignal.ts
- backend/room-service/src/app.test.ts
- backend/room-service/src/app.ts
- backend/room-service/src/supportSignal.test.ts
- backend/room-service/src/supportSignal.ts
- backend/user-service/src/app.test.ts
- backend/user-service/src/app.ts
- backend/user-service/src/supportSignal.test.ts
- backend/user-service/src/supportSignal.ts
- docs/architecture-backend.md
- docs/index.md
- docs/release-support-reference.md

### Change Log

- 2026-05-23: Implemented supportability signals, correlation propagation, taxonomy documentation, and validation tests; set story to review.
- 2026-05-23: Story drafted and set to ready-for-dev.
