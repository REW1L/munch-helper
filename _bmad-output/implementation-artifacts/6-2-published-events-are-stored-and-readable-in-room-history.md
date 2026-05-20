# Story 6.2: Published Events Are Stored and Readable in Room History

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want published session events to be stored and returned in room history,
so that history entries are available when I open the room history view.

## Acceptance Criteria

1. **Given** the room-history subscriber service (`log-service`) is deployed with `logWriter` (SNS-triggered) and `logReader` (HTTP) functions, **when** `logWriter` starts and `LOG_TOPIC_ARN` is **absent/empty**, **then** the Lambda **fails fast with an explicit error** (throws at bootstrap) — the subscriber cannot function without its topic configuration. This is the **opposite** of the publisher's degraded mode in Story 6.1 (publishers degrade; the subscriber hard-fails).
2. **Given** `logWriter` receives an SNS message whose payload is a **supported** event type, **when** the message is processed, **then** exactly one `LogEvent` document is written to MongoDB with correctly mapped `roomId`, `eventType`, `actorId`, `summary`, raw `payload`, and `occurredAt` (plus auto `createdAt`/`updatedAt` via `{ timestamps: true }`).
3. **Given** an incoming event, **when** its `eventType` is one of `character_created`, `character_updated`, `character_deleted`, `battle_started`, `battle_concluded`, `battle_discarded`, **then** it is persisted; **when** `eventType` is anything else (including `battle_updated`, unknown, or malformed/missing required fields), **then** no `LogEvent` is created, no error is thrown, and a single `console.warn` is logged (parser returns `null` → skip).
4. **Given** a supported event, **when** `summary` is built, **then** it is a deterministic, human-readable string produced **only** from the event payload's display context with **zero outbound HTTP / cross-service calls** (ADR-11). Missing optional display fields degrade gracefully (no throw, sensible fallback text).
5. **Given** an SNS batch with multiple `Records`, **when** processed, **then** every record is parsed independently — one invalid record does not prevent valid records from being persisted.
6. **Given** local development (Redis Pub/Sub), **when** `logWriter` runs locally, **then** it subscribes to the **same** log channel the Story 6.1 publisher publishes to (`ROOM_LOG_EVENTS_CHANNEL`, default `room-log-events`) and persists identically to the SNS path (shared parse + persist logic, not duplicated).
7. **Given** the coverage gate, **when** `npm test` runs from `backend/`, **then** `log-service` tests are discovered and executed, `log-service/src/**` is included in coverage, and the 70% line floor still passes (writer + service paths are the primary coverage target; `models/**` and `index.ts` are coverage-excluded by existing config).

> **Scope guard — read before implementing.** This story builds **`log-service` + the `LogEvent` model + `logWriter` (the SNS/Redis → MongoDB persistence path)** and stands up a **minimal deployable `logReader` skeleton**. It does **NOT** implement: the `logReader` paginated query contract, cursor/`before` semantics, response shape, or `roomId` filter behavior — those are **Story 6.4** (do not pre-build them here; just leave a clean router seam). It does **NOT** make `battle-service` publish battle events — that is **Story 6.3** (but `logWriter` must already *handle* the 6 supported types so 6.3 needs no writer change). Character publishing is **Story 6.1**.

## Tasks / Subtasks

- [x] **Task 1 — Scaffold `backend/log-service/` package (AC: 1, 7)**
  - [x] Create `backend/log-service/` scaffolded from `room-notifications-service` (SNS-subscriber shape) **plus** the HTTP bits from `battle-service` (the read API). Files: `package.json`, `tsconfig.json`, `Dockerfile`, `.env.example`, `src/{db.ts,subscriber.ts,service.ts,app.ts,lambda-read.ts,index.ts}`, `src/models/LogEvent.ts`, `src/routes/logs.ts`, plus co-located `*.test.ts` files (see Task 6).
  - [x] `tsconfig.json`: copy verbatim from `room-notifications-service/tsconfig.json` (`module`/`moduleResolution`: `NodeNext`, `strict: false`, `target: ES2022`). Do **not** introduce frontend strictness ([Source: _bmad-output/project-context.md] language rules).
  - [x] `package.json`: model on `battle-service/package.json` (needs Express read API). Deps: `mongoose ^8.19.1`, `redis ^5.8.2`, `express ^5.1.0`, `@codegenie/serverless-express ^4.17.1`, `cors`, `morgan`, `dotenv`, `tsx`; devDeps `@types/*`, `typescript ^5.9.2`. **Do NOT add `@aws-sdk/client-sns`** — the writer *consumes* SNS via the Lambda trigger; it never publishes (no SNS client needed).
  - [x] `Dockerfile`: copy `room-notifications-service/Dockerfile`, change `EXPOSE 8084` → `EXPOSE 8087`.
  - [x] `db.ts`: copy verbatim from `room-notifications-service/src/db.ts` / `battle-service/src/db.ts` (identical singleton `connectToMongo` pattern — do not reinvent).
  - [x] `.env.example`: `LOG_MONGO_URI`, `LOG_TOPIC_ARN`, `ROOM_LOG_EVENTS_CHANNEL`, `REDIS_URL`, `PORT` (see Dev Notes “Env var contract”).

- [x] **Task 2 — `LogEvent` Mongoose model (AC: 2, 7)**
  - [x] `src/models/LogEvent.ts` mirroring `battle-service/src/models/Battle.ts` conventions. Schema fields (camelCase — [Source: architecture/implementation-patterns-consistency-rules.md#Database / Mongoose]):
    - `roomId: { type: String, required: true }`
    - `eventType: { type: String, required: true, enum: [<the 6 supported types>] }`
    - `actorId: { type: String, required: true }`
    - `summary: { type: String, required: true }`
    - `payload: { type: mongoose.Schema.Types.Mixed, required: true }` (raw event for Story 6.7 drill-in; `mongoose` is imported from `../db` exactly as `Battle.ts` does)
    - `occurredAt: { type: Date, required: true }`
  - [x] Schema options: `{ timestamps: true, toJSON: { virtuals: true, transform: (_doc, ret) => { delete ret._id; delete ret.__v; } } }` — **never** manually define `createdAt`/`updatedAt`; `_id` is always aliased to `id` in responses ([Source: architecture/implementation-patterns-consistency-rules.md#Enforcement Summary]).
  - [x] Index: `logEventSchema.index({ roomId: 1, _id: -1 });` — the compound cursor-pagination index ([Source: architecture/core-architectural-decisions.md#Log Schema, ADR-7]). Define it **here** (model is created here); Story 6.4 consumes it for `GET /logs` and must not need to add it.
  - [x] Collection name resolves to `logevents` via `mongoose.model<LogEventDocument>('LogEvent', schema)` (Mongoose default lowercased pluralization — matches architecture’s `logevents`; do not override `collection`).

- [x] **Task 3 — Parse + map + summary logic in `service.ts` (AC: 2, 3, 4)**
  - [x] Export `parseLogEvent(payload: unknown): LogEventInput | null` — accepts a JSON string or object (string → `JSON.parse` in try/catch → recurse; on parse failure return `null`). Mirror the defensive style of `room-notifications-service/src/app.ts` `parseNotificationEvent` (guard `null`/non-object, trim, validate against an `EVENT_TYPES` `Set`, return `null` on any miss — never throw).
  - [x] Resolve `eventType` from the Story 6.1 superset payload: prefer canonical `eventType`, fall back to legacy `event`. Reject (return `null`) if not in the supported `Set` of 6 types → satisfies AC 3 “unsupported ignored”.
  - [x] Resolve `roomId` (required, trimmed), `actorId` (prefer canonical `actorId`; fall back to `event_body.characterId` for character events / `battleId` for battle events), `occurredAt` (prefer canonical `occurredAt`; fall back to `emittedAt`; fall back to `new Date().toISOString()`). Return `null` if `roomId` or `actorId` is empty.
  - [x] Export `buildSummary(input): string` — pure, deterministic, **no I/O** (AC 4). Character events use Story 6.1 display context `character: { id, name, avatarId, color }` (+ `changes` map for `character_updated`). Battle events use the battle display context defined in Story 6.3 (`name`, `result`, character names). Use safe fallbacks when optional fields are absent (e.g., name → `actorId`). See Dev Notes “Summary rules” for exact strings.
  - [x] Export `persistLogEvent(input): Promise<void>` calling `LogEvent.create({...})` with the mapped fields + the **raw original payload object** stored in `payload`. Keep `app.ts`-style structured `console.info` logging around the write.
  - [x] **Do not** mock or call any other service. Summary must render with zero outbound HTTP (ADR-11) — all data comes from the payload that Story 6.1/6.3 enriched.

- [x] **Task 4 — `logWriter` entrypoints: SNS Lambda (`subscriber.ts`) + local Redis (`index.ts`) (AC: 1, 5, 6)**
  - [x] `src/subscriber.ts`: export `handler` (SNS → result). At **module load** read `process.env.LOG_TOPIC_ARN`; if absent/empty, **throw** an explicit `Error('LOG_TOPIC_ARN is required for log-service logWriter')` (fail-fast, AC 1) — contrast Story 6.1’s `console.warn`+continue; do **not** copy the degraded pattern. Reuse the exact `parseSnsRecords` shape from `room-notifications-service/src/lambda.ts` (`event.Records[].Sns.Message`). For each message: `parseLogEvent` → if `null`, `console.warn('log.sns.invalid_event')` and `continue` (AC 3/5); else `await persistLogEvent(...)`. `await connectToMongo(process.env.LOG_MONGO_URI || 'mongodb://localhost:27017/munch_log_service')` once per invocation before writes (same ordering as `room-notifications-service` handler). Return `{ statusCode: 200, body: JSON.stringify({ processed: n }) }`.
  - [x] `src/index.ts`: local entry. `dotenv.config()`. Run **both** the Redis subscriber and the HTTP read server concurrently — `await Promise.all([startSubscriber(), startHttpServer()])` ([Source: architecture/project-structure-boundaries.md] log-service `index.ts`). Subscriber: `createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })`, `subscribe(process.env.ROOM_LOG_EVENTS_CHANNEL || 'room-log-events', handler)` reusing the **same** `parseLogEvent`/`persistLogEvent` (no logic duplication, AC 6). Connect Mongo before persisting. `start().catch(err => { console.error(...); process.exit(1); })` (mirror `room-notifications-service/src/index.ts`).
  - [x] `index.ts` is coverage-excluded — keep it thin orchestration only; all testable logic lives in `service.ts`/`subscriber.ts`.

- [x] **Task 5 — Minimal deployable `logReader` skeleton (AC: 1) — DO NOT build the 6.4 contract**
  - [x] `src/app.ts`: Express app factory `buildLogApp({ routePrefix })` mirroring `battle-service/src/app.ts`/`service.ts` structure (cors, morgan, json, router mounted under `ROUTE_PREFIX`). Mount `src/routes/logs.ts`.
  - [x] `src/routes/logs.ts`: an Express router exposing `GET /logs` that, **for this story**, returns an empty array `[]` with `200` for a present `roomId` and `400 { message }` for a missing/blank `roomId`. Add an inline `// Story 6.4: cursor pagination + roomId-filtered query + GET /logs/:logId implemented here` seam comment. **Do not** implement pagination, `before`/`limit`, `_id` cursor, real Mongo querying, or `/logs/:logId` — that is Story 6.4’s ACs and tests. Keep this file tiny so it does not drag the 70% coverage floor.
  - [x] `src/lambda-read.ts`: HTTP API Gateway entry mirroring `battle-service/src/lambda.ts` (`serverlessExpress({ app })`, `connectToMongo` before `server(event, context)`, `ROUTE_PREFIX`). Export `handler`.

- [x] **Task 6 — Tests (AC: 2, 3, 4, 5, 6, 7)**
  - [x] `src/db.test.ts`: copy the proven `room-notifications-service/src/db.test.ts` (mongoose-mocked: skip-when-connected, in-flight reuse, reset-after-failure).
  - [x] `src/service.test.ts`: mock `./models/LogEvent` via `vi.mock('./models/LogEvent', ...)` (pattern from `battle-service/src/service.test.ts` mocking `./models/Battle`). Assert: (a) each of the 6 supported types maps to a correct `LogEvent.create` call (roomId/eventType/actorId/occurredAt/payload exact); (b) `character_updated` `summary` includes every changed field as `prev → next` derived from `changes` (the data Story 6.6 renders originates here); (c) unsupported type (`battle_updated`) and malformed payload → `parseLogEvent` returns `null` and `LogEvent.create` is **not** called (AC 3); (d) `buildSummary` with missing optional fields falls back without throwing (AC 4); (e) string-vs-object payload both parse.
  - [x] `src/subscriber.test.ts`: follow the `vi.hoisted` + `vi.mock('./db')` + `vi.mock('./service')` + `delete process.env.*` + `await import('./subscriber.js')` pattern from `room-notifications-service/src/lambda.test.ts`. Cases: missing `LOG_TOPIC_ARN` → importing/handler **throws** (AC 1); valid multi-record batch with one invalid record → only valid records persisted, `processed` count correct, no throw (AC 5); `connectToMongo` invoked with the resolved URI.
  - [x] `src/routes/logs.test.ts` (or `app.test.ts`): minimal — `GET /logs?roomId=X` → `200 []`; missing `roomId` → `400 { message }`. (Skeleton-level only; 6.4 expands.)
  - [x] Run the gate from repo `backend/`: `cd backend && npm test` then `npm run test:coverage` (Vitest 3.2.4, v8, 70% line floor — do not lower). Confirm `log-service` suites actually appear in output (proves Task 7 wiring).

- [x] **Task 7 — Register `log-service` in workspace, test, and lint wiring (AC: 7) — easy-to-miss, do first-class**
  - [x] `backend/package.json`: add `"log-service"` to `workspaces`; extend `dev` and `start` `concurrently` chains and the `typecheck` chain with a `-w log-service` entry mirroring `battle-service`.
  - [x] `backend/vitest.config.ts`: add `'log-service/src/**/*.test.ts'` to `test.include` **and** `'log-service/src/**/*.ts'` to `coverage.include`. Without this, log-service tests silently never run and the coverage gate ignores them entirely (the existing `**/models/**/*.ts` and `**/index.ts` excludes already apply globally — keep them).

- [x] **Task 8 — Infra wiring + docs (AC: 1, 6)**
  - [x] `backend/sam/template.yaml`: add (a) Parameter `LogMongoUri`; (b) `LogEventsTopic` (`AWS::SNS::Topic`, `TopicName: !Sub ${AWS::StackName}-log-events`) mirroring `RoomCharacterEventsTopic`; (c) `LogWriterFunction` (`CodeUri: ../log-service`, `Handler: subscriber.handler`, `Events: LogEvent: { Type: SNS, Properties: { Topic: !Ref LogEventsTopic } }`, env `LOG_MONGO_URI: !Ref LogMongoUri` + `LOG_TOPIC_ARN: !Ref LogEventsTopic`, esbuild `EntryPoints: [src/subscriber.ts]`) mirroring `RoomNotificationsFunction`’s SNS-event pattern (SAM auto-creates the subscription + invoke permission — no explicit `sns:Subscribe` IAM needed); (d) `LogReaderFunction` (`Handler: lambda-read.handler`, HttpApi events `GET /logs` and `GET /logs/{logId}`, env `LOG_MONGO_URI` + `ROUTE_PREFIX`, esbuild `EntryPoints: [src/lambda-read.ts]`) mirroring `BattleServiceFunction`; (e) **close Story 6.1’s deferred infra item**: add `LOG_TOPIC_ARN: !Ref LogEventsTopic` to `CharacterServiceFunction` env and a `sns:Publish` statement on `!Ref LogEventsTopic` to `CharacterServiceRole` Policies (additive to `PublishRoomCharacterEvents`). The dangling-`!Ref` risk that 6.1 called out is now resolved because `LogEventsTopic` exists in the same template. **Leave `battle-service`’s `LOG_TOPIC_ARN`/IAM to Story 6.3** (its natural owner) — note this in Completion Notes.
  - [x] `backend/docker-compose.local.yml`: add `log-service` (build `./log-service`, port `8087:8087`, env `PORT: 8087`, `LOG_MONGO_URI: mongodb://mongo-log:27017/munch_log_service`, `REDIS_URL: redis://redis:6379`, `ROOM_LOG_EVENTS_CHANNEL: room-log-events`, `depends_on: [mongo-log, redis]`); add `mongo-log` (`image: mongo:7`, `27025:27017`, volume `mongo-log-data`); add `mongo-log-data` to `volumes:`; add `log-service` to `nginx.depends_on`. Also add `ROOM_LOG_EVENTS_CHANNEL: room-log-events` to the existing `character-service` env block so the local fan-out from Story 6.1 lands on the channel this subscriber listens to (idempotent if 6.1 already added it).
  - [x] `backend/nginx/nginx.conf`: add `upstream log_service { server log-service:8087; }` and a `location /logs { ... }` block mirroring the `/battles`/`/characters` proxy block (copy headers/OPTIONS handling exactly).
  - [x] `backend/.env.example`: add `LOG_SERVICE_PORT=8087`, `LOG_MONGO_URI=mongodb://localhost:27025/munch_log_service`, `LOG_SERVICE_URL=http://localhost:8087`, `ROOM_LOG_EVENTS_CHANNEL=room-log-events`.
  - [x] `backend/README.md`: add `log-service` to the services list and add `/logs -> log-service` to the nginx proxy list (docs-in-same-change rule, [Source: _bmad-output/project-context.md]).

## Dev Notes

### What this story is (and is not)

- **Is:** step 3 of the architecture Implementation Sequence — scaffold `log-service` from `room-notifications-service`; `LogEvent` model; SNS subscriber (`logWriter`) ([Source: architecture/core-architectural-decisions.md#Implementation Sequence], item 3). It is the **consumer** of the payload Story 6.1 emits.
- **Is not:** the `logReader` paginated read contract (Story 6.4), `battle-service` battle-event publishing (Story 6.3), `character-service` publishing (Story 6.1), or any frontend (Stories 6.5–6.7). A minimal deployable `logReader` skeleton ships here only so AC 1’s “deployed with logWriter **and** logReader” holds and Story 6.4 has a clean seam — see the Scope guard above.

### CRITICAL — field-name conflict resolution (epic text vs. authoritative schema)

The epic AC for 6.2 says the document has “`roomId`, `type`, `summary`, and `createdAt`.” That casual wording **conflicts** with the authoritative `LogEvent` schema. **Resolution: follow the architecture schema, not the epic’s shorthand.** Implement `eventType` (NOT `type`) and `occurredAt` (the producer’s event time); `createdAt`/`updatedAt` come automatically from `{ timestamps: true }` (never hand-rolled). Rationale: the canonical `LogEvent` schema ([Source: architecture/core-architectural-decisions.md#Log Schema]) and the global naming rules ([Source: architecture/implementation-patterns-consistency-rules.md#Database / Mongoose, #Enforcement Summary]) are authoritative, and downstream Stories 6.4 (cursor via `_id`, index `{ roomId:1, _id:-1 }`), 6.6/6.7 (render from `summary` + raw `payload`) plus the canonical event contract all depend on `eventType`/`occurredAt`/`payload`. Do **not** create a `type` field; treat the epic word “type” as “the event type, i.e. `eventType`” and “createdAt” as “persisted timestamp, satisfied by `timestamps: true`”. This is a documented, intentional variance — call it out in Completion Notes (same discipline Story 6.1 used for its `ROOM_CHARACTER_EVENTS_TOPIC_ARN` vs `NOTIFICATIONS_TOPIC_ARN` variance).

`LogEvent` document shape (target):

```ts
interface LogEventDocument {
  roomId: string;        // required; part of { roomId:1, _id:-1 } index
  eventType: 'character_created' | 'character_updated' | 'character_deleted'
           | 'battle_started' | 'battle_concluded' | 'battle_discarded';
  actorId: string;       // characterId or battleId
  summary: string;       // pre-rendered, NO outbound HTTP (ADR-11)
  payload: Record<string, unknown>; // raw event for Story 6.7 drill-in
  occurredAt: Date;      // producer event time
  // createdAt / updatedAt auto via { timestamps: true } — DO NOT define manually
}
```

### Inbound payload contract (what Story 6.1 emits — the writer must read this)

Story 6.1 emits an **additive superset**. `logWriter` must read it defensively, preferring canonical mirror fields and falling back to legacy:

```ts
// from backend/character-service/src/publisher.ts (Story 6.1)
{
  event: 'character_created' | 'character_updated' | 'character_deleted';   // legacy
  roomId: string;
  event_body: { characterId: string };                                     // legacy
  emittedAt: string;                                                       // legacy ISO
  correlationId?: string;
  eventType: string;        // canonical mirror === event
  actorId: string;          // canonical mirror === character.id
  occurredAt: string;       // canonical mirror === emittedAt
  character: { id: string; name: string; avatarId: number; color: string }; // display ctx
  changes?: Record<string, { prev: unknown; next: unknown }>;               // character_updated only
}
```

Mapping rule: `eventType = payload.eventType ?? payload.event`; `roomId = payload.roomId`; `actorId = payload.actorId ?? payload.event_body?.characterId ?? payload.battleId`; `occurredAt = payload.occurredAt ?? payload.emittedAt ?? new Date().toISOString()`; `payload` = the **entire original parsed object** (for Story 6.7 drill-in). Battle event payload fields (`name`, `result`, character names, `battleId`) are finalized in Story 6.3 — keep the battle branch of `buildSummary` tolerant of currently-unknown optional fields (read defensively, fall back to `actorId`/eventType label). `logWriter` must already accept all 6 types so Story 6.3 needs **zero** writer changes.

### Summary rules (deterministic, no I/O — AC 4)

- `character_created` → `` `${name} created` `` (fallback `name` → `actorId`)
- `character_deleted` → `` `${name} removed` ``
- `character_updated` → `` `${name} updated: ${changedList}` `` where `changedList` joins each `changes` entry as `` `${field} ${prev} → ${next}` `` (comma-separated). The full per-field diff Story 6.6 renders comes from `payload.changes` produced in Story 6.1 — `summary` is the plain-text mirror; the rich UI reads raw `payload`. If `changes` is empty/absent, summary is `` `${name} updated` ``.
- `battle_started` → `` `Battle ${battleName ? `'${battleName}' ` : ''}started` ``
- `battle_concluded` → `` `Battle ${battleName ? `'${battleName}' ` : ''}concluded${result ? ` — ${result}` : ''}` `` (e.g. `Battle 'Dragon' concluded — players_win`, matching the architecture example [Source: architecture/core-architectural-decisions.md#Log Schema])
- `battle_discarded` → `` `Battle ${battleName ? `'${battleName}' ` : ''}discarded` ``

Keep these strings centralized in one `buildSummary` switch — Stories 6.6/6.7 render mostly from raw `payload`, but `summary` is the canonical fallback string and must be stable and deterministic (fake-timer safe; no `Date.now()` inside summary text).

### Failure / degraded posture — note the deliberate asymmetry

- **Publisher (Story 6.1, character-service):** missing log target → `console.warn` once, continue in degraded mode (history simply absent). The service must run before `log-service` exists.
- **Subscriber (this story, log-service logWriter):** missing `LOG_TOPIC_ARN` → **throw at bootstrap**. The subscriber’s entire reason to exist is that topic; there is nothing to degrade to (AC 1). Do **not** copy 6.1’s warn-and-continue here. Mirror instead `room-notifications-service/src/lambda.ts`’s `throw new Error('... is required ...')` style for missing required transport config.
- Invalid/unsupported **individual events** are non-fatal: parser returns `null` → `console.warn` + skip that record, keep processing the batch (AC 3, AC 5). Never let one bad SNS record fail the whole invocation.

### Local Redis channel — must match Story 6.1 exactly (contract alignment)

Story 6.1’s local publisher publishes to env `ROOM_LOG_EVENTS_CHANNEL` (default `room-log-events`) over `CHARACTER_EVENTS_REDIS_URL`. This subscriber **must** subscribe to the **same channel name**, so use `ROOM_LOG_EVENTS_CHANNEL` (default `room-log-events`) on this side too, over `REDIS_URL` (the subscriber-side var name, consistent with `room-notifications-service`). The architecture doc’s `LOG_REDIS_CHANNEL` / `log_events` ([Source: architecture/project-structure-boundaries.md]) is a **documented variance** — the live cross-service contract is set by Story 6.1’s implementation, and publisher/subscriber on different channel names would silently break local fan-out. Follow 6.1’s names; record the variance in Completion Notes. (This is the same variance-handling discipline 6.1 applied; do not “fix” the doc names silently.)

### Current state of files being created/modified (read before editing)

- `backend/room-notifications-service/src/{db.ts,lambda.ts,index.ts,app.ts,lambda.test.ts,db.test.ts,app.test.ts}` — **scaffold source** for the subscriber/local/SNS-parse/test patterns. `lambda.ts` `parseSnsRecords` is the exact SNS-envelope shape to reuse. `lambda.test.ts` is the exact `vi.hoisted`+`vi.mock`+`delete process.env.*`+`await import('./x.js')` test pattern.
- `backend/battle-service/src/{app.ts,service.ts,lambda.ts,db.ts,models/Battle.ts,service.test.ts,publisher.ts}` — most recent “scaffold from character-service” reference; `models/Battle.ts` is the exact schema/options/index/`toJSON` style to mirror for `LogEvent`; `service.test.ts` shows the `vi.mock('./models/Battle')` strategy (the repo has **no** `mongodb-memory-server` — mock the model layer, assert `.create` calls).
- `backend/character-service/src/publisher.ts` — defines the **inbound** superset contract (Story 6.1). Read it to lock the field names this writer parses. **Do not modify character-service in this story** (its publisher extension is Story 6.1’s scope).
- `backend/vitest.config.ts` — hardcoded `test.include` + `coverage.include` arrays that **do not list log-service**; coverage globally excludes `**/*.test.ts`, `**/index.ts`, `**/models/**/*.ts`. Must be extended (Task 7) or the whole suite is invisible to CI.
- `backend/package.json` — `workspaces` + `dev`/`start`/`typecheck` chains do not list `log-service`; extend mirroring `battle-service`.
- `backend/sam/template.yaml` — **zero** log resources today (no LogTopic/LogWriter/LogReader, no `LOG_TOPIC_ARN` anywhere). `RoomNotificationsFunction` (lines ~334–358) is the SNS-triggered-Lambda pattern; `BattleServiceFunction` (~360–392) is the HttpApi pattern; `CharacterServiceRole` Policies `PublishRoomCharacterEvents` (~107–115) + `CharacterServiceFunction` env (~294–298) are where 6.1’s deferred `LOG_TOPIC_ARN`/IAM gets added.
- `backend/docker-compose.local.yml`, `backend/nginx/nginx.conf`, `backend/.env.example`, `backend/README.md` — local infra/docs; ports 8082–8086 used, mongo host ports 27021–27024 → log-service is `8087` / mongo-log `27025` (consistent with [Source: architecture/project-structure-boundaries.md]).

### Conventions to honor ([Source: _bmad-output/project-context.md] + architecture)

- Backend is **non-strict TS / NodeNext**; tests `import('./x.js')` (note the `.js` ext in dynamic import even for `.ts` source — NodeNext). Match existing import grouping (external first, then internal).
- Event type strings stay `snake_case`; env vars `ALL_CAPS_SNAKE_CASE`.
- `log-service` is a **bounded context** — owns the `logevents` collection exclusively; **no** cross-service imports (no importing from `character-service`/`battle-service`/`room-notifications-service`) and **no** synchronous inter-service HTTP. All summary context arrives in the event payload (ADR-11).
- Mongoose: camelCase fields, `{ timestamps: true }`, `_id`→`id` `toJSON` transform, never raw `_id` in responses, never manual timestamps ([Source: architecture/implementation-patterns-consistency-rules.md#Enforcement Summary]).
- API/error shapes (for the skeleton): direct resource (no `{data,success}` envelope); errors `{ message: string }`; unexpected Lambda errors `502` not `500` ([Source: architecture/implementation-patterns-consistency-rules.md#Format Patterns]).
- Co-locate tests as `<source>.test.ts` with **matching casing** (`LogEvent.test.ts` if you add a model test, not `logEvent.test.ts`). 70% line floor is a CI hard gate — assert real behavior (mapping correctness, unsupported-skip, fail-fast, batch resilience), not filler.
- Docs-in-same-change: env var additions update `.env.example`/`README`/`docker-compose`/`nginx`/SAM in this same change set.

### Testing standards summary

- Mock external boundaries only: `vi.mock('./db')`, `vi.mock('./models/LogEvent')`, `vi.mock('./service')` (in `subscriber.test.ts`), Redis `createClient` via `vi.hoisted` if `index.ts` logic is unit-tested (prefer keeping `index.ts` thin so it’s coverage-excluded and untested). Never mock the unit under test.
- One success-path + one failure-path per new behavior: persist-supported (success) vs unsupported/malformed-skip (failure); fail-fast-missing-`LOG_TOPIC_ARN` (failure) vs valid-batch (success); one-bad-record-in-batch (resilience).
- Deterministic: control `Date` with fake timers for the `occurredAt` fallback path; no real network/Redis/Mongo, no timing reliance.
- Coverage focus: `subscriber.ts` + `service.ts` (writer/persist/parse/summary). Keep the `logReader` skeleton (`app.ts`/`routes/logs.ts`/`lambda-read.ts`) minimal so its low logic doesn’t threaten the 70% floor; one trivial route test is enough for this story.

### Project Structure Notes

- All new code lives under `backend/log-service/src/**` per the mandated structure ([Source: architecture/project-structure-boundaries.md], [Source: architecture/implementation-patterns-consistency-rules.md#Backend Service File Structure]): `app.ts`, `index.ts`, `lambda-read.ts`, `subscriber.ts`, `service.ts`, `db.ts`, `models/LogEvent.ts`, `routes/logs.ts`, co-located `*.test.ts`. Two named Lambdas in one service — `logWriter` (`subscriber.handler`, SNS) + `logReader` (`lambda-read.handler`, HTTP) — per ADR-3. Do not split into two packages.
- **Documented variances (do not “fix” silently; record in Completion Notes):** (1) epic’s `type`/`createdAt` wording → implemented as `eventType` + `{ timestamps:true }` (architecture-authoritative); (2) local Redis channel uses `ROOM_LOG_EVENTS_CHANNEL`/`room-log-events` (Story 6.1 contract) not the doc’s `LOG_REDIS_CHANNEL`/`log_events`; (3) subscriber-side Redis URL uses `REDIS_URL` (consistent with `room-notifications-service`), distinct from the publisher’s `CHARACTER_EVENTS_REDIS_URL` (both point at the same Redis).
- **Cross-story dependency closed here:** Story 6.1 explicitly deferred adding `LOG_TOPIC_ARN` env + `sns:Publish` IAM to the SAM template until “the `LogTopic` resource exists (Story 6.2)” to avoid a dangling `!Ref`. This story creates `LogEventsTopic` and wires `CharacterServiceFunction`’s env + `CharacterServiceRole` IAM to it in the same template — that closure is in-scope (Task 8). `battle-service`’s log publish wiring stays with Story 6.3.

### Env var contract (`backend/log-service/.env.example`)

| Var | Purpose | Local default | Cloud (SAM) |
|---|---|---|---|
| `LOG_MONGO_URI` | logevents Mongo connection | `mongodb://localhost:27025/munch_log_service` | `!Ref LogMongoUri` |
| `LOG_TOPIC_ARN` | **required** by `logWriter` (fail-fast if absent, AC 1) | n/a locally (Redis path) — set non-empty in SAM | `!Ref LogEventsTopic` |
| `ROOM_LOG_EVENTS_CHANNEL` | local Redis channel — **must equal Story 6.1’s** | `room-log-events` | n/a |
| `REDIS_URL` | local Redis connection (subscriber side) | `redis://localhost:6379` | n/a |
| `PORT` | logReader local HTTP port | `8087` | n/a |

Note: in cloud the SNS trigger delivers events regardless, but AC 1 still requires `logWriter` to assert `LOG_TOPIC_ARN` is configured and fail fast otherwise — keep that check unconditional at bootstrap.

### Cross-story context

- **Story 6.1 (`ready-for-dev`, not done):** producer of what this consumes. Treat its superset payload (above) as the contract; do not import its code. If 6.1’s field names shift during its implementation, this story’s `parseLogEvent` fallbacks (`eventType ?? event`, `actorId ?? event_body.characterId`, `occurredAt ?? emittedAt`) are designed to absorb either canonical or legacy naming — keep both.
- **Story 6.3 (battle publishing):** will publish `battle_started`/`battle_concluded`/`battle_discarded` to `LOG_TOPIC_ARN`. This writer must already persist those 6 types so 6.3 requires no writer change — only 6.3’s battle payload display fields finalize the battle-branch `buildSummary` text; keep it tolerant.
- **Story 6.4 (logReader contract):** consumes the `{ roomId:1, _id:-1 }` index and the `LogEvent` shape created here; implements cursor pagination/filtering/`/logs/:logId` in the skeleton’s router seam. Do not pre-implement it.
- **Stories 6.6/6.7 (frontend):** render from raw `payload` (avatar/name, per-field `prev → new` rows, battle drill-in) with `summary` as fallback — which is exactly why `payload` is stored verbatim and `summary` is deterministic.

### References

- [Source: epics/epic-6-room-history.md#Story 6.2] — story + acceptance criteria (note: epic `type`/`createdAt` shorthand → resolved to `eventType` + `timestamps:true`)
- [Source: epics/epic-6-room-history.md#Story 6.1] — upstream publisher / inbound payload superset
- [Source: epics/epic-6-room-history.md#Story 6.3] — downstream battle publishing (6 supported types must already be handled here)
- [Source: epics/epic-6-room-history.md#Story 6.4] — logReader paginated contract (explicitly out of scope here)
- [Source: epics/epic-6-room-history.md#Story 6.6] — per-field `prev → new` UI originates from `payload.changes` persisted here
- [Source: architecture/core-architectural-decisions.md#Log Schema] — authoritative `LogEvent` fields + `{ roomId:1, _id:-1 }` index + summary example
- [Source: architecture/core-architectural-decisions.md#SNS Topic Architecture (Consumer-Owned)] — log-service owns `LOG_TOPIC_ARN`; subscriber-owned topic
- [Source: architecture/core-architectural-decisions.md#ADR-3, #ADR-5, #ADR-7, #ADR-11, #ADR-12] — single service / two Lambdas; `battle_updated` not logged; cursor index; summary-without-HTTP; topic-config posture
- [Source: architecture/core-architectural-decisions.md#Implementation Sequence] — step 3: log-service scaffold from room-notifications-service
- [Source: architecture/core-architectural-decisions.md#Infrastructure / IAM Policy Additions] — LogWriter SNS / LogReader HTTP / log-service `sns:Subscribe` (SAM-managed)
- [Source: architecture/implementation-patterns-consistency-rules.md#Database / Mongoose, #Enforcement Summary] — camelCase, `timestamps:true`, `_id`→`id`, co-located test casing, 70% gate
- [Source: architecture/project-structure-boundaries.md] — log-service file tree, data ownership, docker-compose/nginx/SAM additions, port/mongo conventions
- [Source: _bmad-output/project-context.md] — non-strict TS/NodeNext, service-boundary isolation, event-contract guardrails, 70% floor, docs-in-same-change
- [backend/room-notifications-service/src/lambda.ts](backend/room-notifications-service/src/lambda.ts), [index.ts](backend/room-notifications-service/src/index.ts), [app.ts](backend/room-notifications-service/src/app.ts), [db.ts](backend/room-notifications-service/src/db.ts), [lambda.test.ts](backend/room-notifications-service/src/lambda.test.ts), [db.test.ts](backend/room-notifications-service/src/db.test.ts) — scaffold + test patterns
- [backend/battle-service/src/models/Battle.ts](backend/battle-service/src/models/Battle.ts), [service.test.ts](backend/battle-service/src/service.test.ts), [app.ts](backend/battle-service/src/app.ts), [lambda.ts](backend/battle-service/src/lambda.ts), [package.json](backend/battle-service/package.json) — model/HTTP/test references
- [backend/character-service/src/publisher.ts](backend/character-service/src/publisher.ts) — inbound payload contract (do not modify)
- [backend/vitest.config.ts](backend/vitest.config.ts), [backend/package.json](backend/package.json), [backend/sam/template.yaml](backend/sam/template.yaml), [backend/docker-compose.local.yml](backend/docker-compose.local.yml), [backend/nginx/nginx.conf](backend/nginx/nginx.conf), [backend/.env.example](backend/.env.example), [backend/README.md](backend/README.md) — wiring/infra/docs targets

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cd backend && npm install`
- `cd backend && npm test -- log-service/src`
- `cd backend && npm run typecheck -w log-service`
- `cd backend && npm test`
- `cd backend && npm run typecheck`
- `cd backend && npm run test:coverage`

### Completion Notes List

- Implemented `backend/log-service` with SNS `logWriter`, local Redis subscriber, `LogEvent` model, pure parse/map/summary logic, and a minimal deployable `logReader` skeleton.
- Persisted supported `character_*` and battle lifecycle events with `eventType`, `actorId`, `summary`, raw `payload`, and `occurredAt`; unsupported or malformed events are skipped with a warning and do not fail batches.
- Preserved documented variances: epic `type`/`createdAt` wording is implemented as architecture-authoritative `eventType` plus Mongoose timestamps; local log channel uses `ROOM_LOG_EVENTS_CHANNEL=room-log-events`; subscriber Redis URL is `REDIS_URL`.
- Added SAM/local/nginx/docs wiring for log-service and closed Story 6.1's deferred character-service log topic env/IAM wiring. Battle-service `LOG_TOPIC_ARN`/IAM remains intentionally owned by Story 6.3.
- Added and ran log-service unit/route/lambda tests plus full backend tests, typecheck, and coverage. Coverage completed at 85.76% lines overall and 91.43% lines for `log-service/src`.

### File List

- _bmad-output/implementation-artifacts/6-2-published-events-are-stored-and-readable-in-room-history.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/.env.example
- backend/README.md
- backend/docker-compose.local.yml
- backend/log-service/.env.example
- backend/log-service/Dockerfile
- backend/log-service/package.json
- backend/log-service/src/app.ts
- backend/log-service/src/db.test.ts
- backend/log-service/src/db.ts
- backend/log-service/src/index.ts
- backend/log-service/src/lambda-read.test.ts
- backend/log-service/src/lambda-read.ts
- backend/log-service/src/models/LogEvent.ts
- backend/log-service/src/routes/logs.test.ts
- backend/log-service/src/routes/logs.ts
- backend/log-service/src/service.test.ts
- backend/log-service/src/service.ts
- backend/log-service/src/subscriber.test.ts
- backend/log-service/src/subscriber.ts
- backend/log-service/tsconfig.json
- backend/nginx/nginx.conf
- backend/package-lock.json
- backend/package.json
- backend/sam/template.yaml
- backend/vitest.config.ts

### Change Log

- 2026-05-20: Implemented story 6.2 log-service persistence/read skeleton, tests, workspace wiring, infra wiring, and docs.
