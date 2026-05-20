# Story 6.1: Character Events Are Published for Room History

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want character creation, update, and removal events to appear in room history,
so that the group can understand how the session state changed over time.

## Acceptance Criteria

1. **Given** a character is created, updated, or deleted, **when** `character-service` processes the event, **then** it publishes that event to **both** the notifications topic/channel **and** the log topic/channel using `Promise.allSettled` (parallel, not sequential).
2. **Given** `LOG_TOPIC_ARN` (Lambda) or the log Redis channel (local) is **not configured**, **when** `character-service` starts, **then** it emits a single startup warning and continues running in degraded mode (notifications publish still works; the service does **not** crash and requests are unaffected).
3. **Given** any character event is published, **when** the payload is constructed, **then** it carries enough display context for `log-service` to render a room-history summary **without any outbound HTTP call** — for create/delete: character `id`, `name`, `avatarId`, `color`; for update: the same identity fields **plus** a per-field `prev → next` map of exactly the fields that changed.
4. **Given** publishing to one topic/channel fails (throws or rejects), **when** the fan-out runs, **then** the other topic/channel publish attempt still completes, and the request flow is never broken by a publish failure (publish errors are logged, never propagated to the HTTP response).
5. **Given** the notifications consumer (`room-notifications-service`), **when** the enriched payload is delivered, **then** existing realtime character fan-out behavior is unchanged (no regression to Epic 3/4 realtime features) — the legacy payload fields `event`, `roomId`, `event_body.characterId`, `emittedAt`, `correlationId` keep their exact names and shapes.

## Tasks / Subtasks

- [x] **Task 1 — Enrich the character event payload contract (AC: 3, 5)**
  - [x] In `backend/character-service/src/publisher.ts`, extend `CharacterEventPayload` with an **additive** display-context section. Do NOT rename or remove existing fields (`event`, `roomId`, `event_body.characterId`, `emittedAt`, `correlationId`) — `room-notifications-service` depends on them.
  - [x] Add `character: { id: string; name: string; avatarId: number; color: string }`.
  - [x] Add optional `changes?: Record<string, { prev: unknown; next: unknown }>` — present **only** for `character_updated`, containing exactly the fields whose value changed.
  - [x] Add canonical mirror fields to forward-align with the architecture event contract (these are duplicates of existing data, additive only): `eventType` (= `event`), `actorId` (= `character.id`), `occurredAt` (= `emittedAt`).
  - [x] Update `createCharacterEventPayload(...)` to accept the full character snapshot and an optional `changes` map and build the enriched payload. Keep `emittedAt`/`occurredAt` deterministic via `new Date().toISOString()` (existing pattern; fake-timer testable).
- [x] **Task 2 — Dual-target fan-out publisher (AC: 1, 4)**
  - [x] Introduce a composite/fan-out publisher in `publisher.ts` that wraps an ordered list of leg publishers (notifications leg + log leg) and publishes via `await Promise.allSettled(legs.map(p => p.publish(payload)))`. Each rejected leg is logged with the failing target; no rejection is rethrown.
  - [x] Reuse the existing `SnsCharacterEventPublisher` / `RedisCharacterEventPublisher` / `NoopCharacterEventPublisher` classes as legs — do NOT duplicate SNS/Redis client logic.
  - [x] The `CharacterEventPublisher` interface (`publish(payload): Promise<void>`) is unchanged; the composite implements the same interface so `app.ts` / `service.ts` wiring stays as-is.
- [x] **Task 3 — Capture prev→next for updates (AC: 3)**
  - [x] In `backend/character-service/src/app.ts` PATCH handler, obtain the pre-update character so changed-field `prev` values are available. Add `findById(id): Promise<CharacterLike | null>` to `CharacterModelLike` and implement it in `createCharacterModel()` (`backend/character-service/src/service.ts`) mirroring the existing method style (logging + field mapping). Read the character before calling `findByIdAndUpdate`.
  - [x] Compute `changes` as only the keys present in the validated `updates` object whose normalized value differs from the pre-update value. Do not include unchanged fields. Do not emit `changes` for create/delete.
  - [x] Concurrency note: read-before-update is last-write-wins (consistent with the system's existing concurrency posture); acceptable for display context — do not add locking.
  - [x] Pass the post-update character snapshot + `changes` into `createCharacterEventPayload` for `character_updated`; pass the created/deleted character snapshot for `character_created` / `character_deleted`.
- [x] **Task 4 — Lambda wiring: notifications + log SNS legs with degraded mode (AC: 1, 2, 4)**
  - [x] In `backend/character-service/src/lambda.ts`, build the notifications leg from the existing `ROOM_CHARACTER_EVENTS_TOPIC_ARN` env var (unchanged — see Project Structure Notes) and a new log leg from `LOG_TOPIC_ARN`.
  - [x] If `LOG_TOPIC_ARN` is absent/empty: `console.warn` once at bootstrap (degraded — log history will be absent) and use `NoopCharacterEventPublisher` for the log leg. Service must NOT throw or `process.exit`.
  - [x] Compose both legs into the fan-out publisher and pass it to `buildCharacterApp`. Keep the existing bootstrap-config `console.info` and add `logTopicArnConfigured: Boolean(process.env.LOG_TOPIC_ARN)`.
- [x] **Task 5 — Local server wiring: notifications + log Redis legs with degraded mode (AC: 1, 2, 4)**
  - [x] In `backend/character-service/src/index.ts`, keep the existing notifications Redis leg (`CHARACTER_EVENTS_REDIS_URL` + `ROOM_CHARACTER_EVENTS_CHANNEL`, default `room-character-events`). Add a log Redis leg on a new channel env `ROOM_LOG_EVENTS_CHANNEL` (default `room-log-events`) using the same `CHARACTER_EVENTS_REDIS_URL`.
  - [x] If `CHARACTER_EVENTS_REDIS_URL` is unset (already the Noop path) OR the log channel cannot be configured, `console.warn` once and use `NoopCharacterEventPublisher` for the log leg. Do not crash.
  - [x] Compose both legs into the fan-out publisher; extend the existing bootstrap `console.info` with `logEventsChannel` + `logConfigured`.
- [x] **Task 6 — Tests (AC: 1, 2, 3, 4, 5)**
  - [x] `publisher.test.ts`: fan-out calls every leg; uses `Promise.allSettled` (assert both legs invoked even when one rejects); a rejecting leg does not cause the composite `publish` to reject; `createCharacterEventPayload` produces the enriched superset incl. `changes` for updates and omits `changes` for create/delete; legacy fields preserved exactly (regression guard for AC 5).
  - [x] `lambda.test.ts`: both env vars set → composite with two SNS legs; `LOG_TOPIC_ARN` absent → startup `console.warn` + notifications leg still active + handler still boots and responds (no throw); follow existing `vi.hoisted` mock + `delete process.env.*` reset pattern, and add `delete process.env.LOG_TOPIC_ARN` to `beforeEach`.
  - [x] `app.test.ts`: create/delete publish a payload containing `character` display context; update publishes `changes` with correct `prev → next` for changed fields only; a publisher that throws does NOT change the HTTP status (create still `201`, update `200`, delete `204`) — regression guard for AC 4. Inject a spy publisher via the existing `createApp(model, { publisher })` option.
  - [x] Add/extend a `findById` test in `service.test.ts` if the existing model-mapping tests assert method coverage there.
  - [x] Run backend test + coverage gate: `cd backend/character-service && npm test` (Vitest 3.2.4, v8 coverage, 70% line floor — do not lower).

### Review Findings

- [x] [Review][Patch] Surface per-leg transport in bootstrap log — Composite `publisher.constructor.name` now always logs `'FanoutCharacterEventPublisher'`, hiding which leg is SNS vs Noop. Add `notificationsPublisher`/`logPublisher` constructor names to the bootstrap `console.info`. [backend/character-service/src/lambda.ts:30-35, backend/character-service/src/index.ts:30-37]
- [x] [Review][Patch] PATCH `findById` errors leak to HTTP 500 — pre-update read is enrichment-only but its throw bypasses the publish swallow and reaches `next(error)`. Wrap in try/catch and degrade to `previousCharacter = null`. [backend/character-service/src/app.ts:327]
- [x] [Review][Patch] Fan-out swallows only async rejections, not sync throws — `Promise.allSettled(legs.map(l => l.publisher.publish(p)))` rejects the whole composite if any leg's `publish` synchronously throws before returning a promise. Wrap each invocation in `Promise.resolve().then(() => leg.publisher.publish(payload))`. [backend/character-service/src/publisher.ts:38-53]
- [x] [Review][Patch] `changes.next` uses raw `updates[key]` instead of post-persistence value — trim/normalization asymmetry: `prev` comes from the stored doc but `next` is the request payload, so legacy untrimmed DB values or schema-side normalizers can produce false changes (or miss real ones). Compute `next` via `getComparableCharacterValue(updatedCharacter, key)` symmetrically with `prev`. [backend/character-service/src/app.ts:137-156]
- [x] [Review][Patch] `mapCharacter` empty-string id fallback hides corrupt docs — `id: character.id || character._id?.toString() || ''` silently emits `event_body.characterId: ''` when both are missing. Throw or reject instead of synthesizing an empty id. [backend/character-service/src/service.ts]
- [x] [Review][Patch] Whitespace env vars treated as configured — `Boolean(' ')` and similar whitespace strings skip the degraded-mode warning and instantiate broken SNS/Redis clients. Trim before the conditional. [backend/character-service/src/lambda.ts:8-19, backend/character-service/src/index.ts:7-19]
- [x] [Review][Patch] Local degraded-mode warning misnames the cause — when `CHARACTER_EVENTS_REDIS_URL` is unset, both notifications **and** log legs become Noop, but the warning mentions only "room-history logging is disabled." Reword (or split into two conditionals) to surface that notifications is also disabled. [backend/character-service/src/index.ts:14-16]
- [x] [Review][Patch] `logConfigured: Boolean(redisUrl)` is a misleading mirror of `redisConfigured` — the log leg's configured-ness should reflect the actual log publisher (e.g., `!(logPublisher instanceof NoopCharacterEventPublisher)`), not the shared Redis URL. [backend/character-service/src/index.ts:36]
- [x] [Review][Patch] `console.error` spies in app.test.ts are not restored — `vi.spyOn(console, 'error').mockImplementation(...)` in the two "publishing fails" tests leaks across tests in the same file. Add `mockRestore()` or move to `afterEach`. [backend/character-service/src/app.test.ts]
- [x] [Review][Patch] Publish-failure tests do not assert the publisher was actually called — only HTTP status is checked, so a regression that skipped publishing entirely on the failure path would still pass. Add `expect(publisher.publish).toHaveBeenCalled()`. [backend/character-service/src/app.test.ts]
- [x] [Review][Defer] PATCH does not validate `level`/`power`/`class`/`race`/`gender`/`userId` — pre-existing input-validation gap; clients can persist arbitrary types and ship them through `changes`. [backend/character-service/src/app.ts:292, 300-304] — deferred, pre-existing
- [x] [Review][Defer] `RedisCharacterEventPublisher.ensureConnected` does not recover from post-connect disconnects — `isOpen` flips false and the cached `connectPromise` is stale. [backend/character-service/src/publisher.ts:117-134] — deferred, pre-existing
- [x] [Review][Defer] `correlationId` plumbed through types but never extracted from request headers — published payload has `correlationId: undefined` for every event. [backend/character-service/src/app.ts:267-274, 344-351, 385-391] — deferred, pre-existing

## Dev Notes

### What this story is (and is not)

- **Is:** the `character-service` *publisher extension* — make character lifecycle events go to a second (log) target with enough context for room-history summaries. This is step 4 of the architecture Implementation Sequence ([Source: architecture/core-architectural-decisions.md#Implementation Sequence]).
- **Is not:** building `log-service`, the `LogEvent` model, the SNS subscriber, or the read API — those are Stories 6.2/6.4. This story must ship and run correctly **before `log-service` and the log topic exist**; that is exactly why AC 2 (degraded mode when `LOG_TOPIC_ARN` absent) exists ([Source: architecture/core-architectural-decisions.md#ADR-12]).

### Current state of files being modified (read before editing)

- `backend/character-service/src/publisher.ts` — defines `CharacterEventPayload` (`{ event, roomId, event_body:{characterId}, emittedAt, correlationId? }`), the `CharacterEventPublisher` interface, `Sns`/`Redis`/`Noop` publishers, and `createCharacterEventPayload`. Single-target today.
- `backend/character-service/src/app.ts` — Express factory. `POST /characters`, `PATCH /characters/:characterId`, `DELETE /characters/:characterId` each call `publisher.publish(createCharacterEventPayload(...))` inside a local `try/catch` that logs and swallows publish errors (this swallow behavior is correct and must be preserved — it is the AC 4 guarantee at the call site). PATCH uses `findByIdAndUpdate(..., { new: true })` so only the post-update doc is available today — Task 3 adds the pre-update read.
- `backend/character-service/src/service.ts` — `createCharacterModel()` maps Mongoose docs to `CharacterLike`. Add `findById` here mirroring existing method style.
- `backend/character-service/src/lambda.ts` — picks `SnsCharacterEventPublisher` when `ROOM_CHARACTER_EVENTS_TOPIC_ARN` set, else `NoopCharacterEventPublisher`. Single target today.
- `backend/character-service/src/index.ts` — picks `RedisCharacterEventPublisher` when `CHARACTER_EVENTS_REDIS_URL` set (channel `ROOM_CHARACTER_EVENTS_CHANNEL`, default `room-character-events`), else Noop. Single target today.
- **Must be preserved (regression surface):** `room-notifications-service` consumes the notifications payload. Its parser `parseNotificationEvent` ([backend/room-notifications-service/src/app.ts](backend/room-notifications-service/src/app.ts)) reads **only** `event`, `roomId`, `event_body.characterId`, `emittedAt`, `correlationId` and **ignores unknown fields** — confirmed safe for additive enrichment. Its type `RoomCharacterNotificationEvent` ([backend/room-notifications-service/src/types.ts](backend/room-notifications-service/src/types.ts)) defines the legacy shape. **Do not change `room-notifications-service`** in this story and do not rename any legacy field.

### Key design decision — payload shape (recommended approach)

The architecture's canonical event contract uses `eventType`/`actorId`/`occurredAt` ([Source: architecture/implementation-patterns-consistency-rules.md#Event Payload Contract]), but the live notifications path uses legacy `event`/`event_body`/`emittedAt`, and the architecture explicitly scopes this story as **"additive to existing notifications publish"** ([Source: architecture/core-architectural-decisions.md#IAM Policy Additions]).

**Recommended: a single additive *superset* payload** — preserve every legacy field unchanged, and add display-context + canonical mirror fields. One payload builder, both legs send the same payload, **no consumer rewrite**, forward-aligned with the architecture contract, zero notifications regression risk. This is the clean *and* low-blast-radius choice; prefer it.

Rejected alternative: migrate the notifications payload to the canonical `eventType`/`actorId`/`occurredAt` contract and rewrite `room-notifications-service` + its types + tests as a coordinated breaking change. Cleaner on paper but a large blast radius into Epic 3/4 realtime features for no AC benefit, and the architecture explicitly says "additive." Do not do this here.

Recommended payload (superset):

```ts
interface CharacterEventPayload {
  // legacy notifications contract — names/shapes are FROZEN (room-notifications-service depends on these)
  event: 'character_created' | 'character_updated' | 'character_deleted';
  roomId: string;
  event_body: { characterId: string };
  emittedAt: string;            // ISO-8601
  correlationId?: string;
  // canonical mirrors (additive; forward-align with architecture BaseEvent)
  eventType: string;            // === event
  actorId: string;              // === character.id
  occurredAt: string;           // === emittedAt
  // display context for log-service summary rendering (NO outbound HTTP needed)
  character: { id: string; name: string; avatarId: number; color: string };
  changes?: Record<string, { prev: unknown; next: unknown }>; // character_updated only
}
```

`character.color` should be the resolved/display color. `app.ts` already has `getCharacterColor()` / `toResponseCharacter()` — reuse that resolution so the logged color matches what the UI shows; do not re-implement color logic.

### Why display context must travel in the payload

`log-service` (Story 6.2) writes a pre-rendered `summary` and the raw `payload`, and **must render the summary with no outbound HTTP calls** ([Source: architecture/core-architectural-decisions.md#ADR-11]). Story 6.6 requires the Room History view to show character avatar + name for create/delete and **every changed field as an individual `prev → new` row** for updates ([Source: epics/epic-6-room-history.md#Story 6.6]). Therefore the `character_updated` payload must carry the full per-field `prev/next` diff produced here — there is no other place it can come from later.

### Dual-topic publishing rule (must follow exactly)

Use `Promise.allSettled` over the legs. Never sequential `await publishA; await publishB` — sequential means a topic-1 failure blocks topic-2 ([Source: architecture/implementation-patterns-consistency-rules.md#Publisher Pattern — dual-topic fan-out], explicit anti-pattern). Notifications leg first, log leg second, but both must always be attempted.

### Conventions to honor (from project-context.md & architecture)

- Backend service is **non-strict TypeScript** and **NodeNext** modules — match existing import style (note existing tests `import('./lambda.js')`). Do not normalize to frontend strictness.
- Event type strings stay `snake_case` (`character_created`/`character_updated`/`character_deleted`). Env vars `ALL_CAPS_SNAKE_CASE` (`LOG_TOPIC_ARN`, `ROOM_LOG_EVENTS_CHANNEL`).
- Keep `character-service` self-contained — no cross-service coupling; do not import from `room-notifications-service`/`log-service`.
- Co-locate tests as `<source>.test.ts`; backend tests run in Node env via Vitest 3.2.4, v8 coverage, **70% line floor is a CI hard gate** — do not lower it; coverage is a floor, assert real behavior (fan-out, degraded mode, diff correctness, error-swallow).
- Preserve the existing publish-error swallow in `app.ts` route handlers (logs + continues) — this is the request-flow guarantee for AC 4; do not let publish failures reach the HTTP response.
- Update the nearest docs if you add env vars: `backend/docker-compose.local.yml` (add `ROOM_LOG_EVENTS_CHANNEL` to the `character-service` service env so local fan-out has a second channel), and any character-service README/env reference if present. Do not hardcode endpoints/ARNs.

### Testing standards summary

- Mock external boundaries (SNS client, Redis `createClient`) — do not mock the unit under test. Reuse the existing `vi.hoisted` Redis mock pattern in `publisher.test.ts` and the `vi.mock`/`delete process.env.*` pattern in `lambda.test.ts`.
- Provide one success-path and one failure-path test per new behavior (fan-out success; one-leg-rejects; missing `LOG_TOPIC_ARN` degraded boot).
- Keep tests deterministic — control `Date` via fake timers (existing pattern) for `emittedAt`/`occurredAt`; no real network/timing.
- Failure-path AC 4 test: publisher throws → HTTP status unchanged (`201`/`200`/`204`).

### Project Structure Notes

- **Env var naming (`ROOM_CHARACTER_EVENTS_TOPIC_ARN` vs architecture's `NOTIFICATIONS_TOPIC_ARN`):** the architecture/implementation-patterns docs use the name `NOTIFICATIONS_TOPIC_ARN`, but the live SAM stack + `lambda.ts` + `lambda.test.ts` use `ROOM_CHARACTER_EVENTS_TOPIC_ARN` ([backend/sam/template.yaml](backend/sam/template.yaml) `RoomCharacterEventsTopic`, env at line ~278; IAM `sns:Publish` at line ~110). A rename is a breaking, deploy-time config change touching the SAM stack and is **out of scope** here (project-context: no breaking env/config renames without coordinated atomic updates; this story is explicitly "additive"). **Decision: keep `ROOM_CHARACTER_EVENTS_TOPIC_ARN` for the notifications leg; introduce `LOG_TOPIC_ARN` for the new log leg.** This is a documented, intentional variance from the doc's naming — do not "fix" it silently.
- **SAM/IAM infra wiring is a cross-story dependency, not this story's blocker:** the log SNS topic is **owned by `log-service`**, which does not exist yet (Story 6.2) ([Source: architecture/core-architectural-decisions.md#ADR-6, #SNS Topic Architecture]). The in-scope deliverable here is the **code path** that publishes to `LOG_TOPIC_ARN` when present and degrades gracefully when absent (AC 2). Adding the `LOG_TOPIC_ARN` env var + `sns:Publish` IAM to `backend/sam/template.yaml` should be done when the `LogTopic` resource exists (Story 6.2) to avoid a dangling `!Ref`; if you choose to pre-wire it, use a SAM parameter defaulting to empty and conditional IAM so `sam` still deploys with no log topic. Either way, the running service must satisfy AC 2 with no `LOG_TOPIC_ARN` set. Note this clearly in Completion Notes.
- File locations follow the mandated backend structure ([Source: architecture/implementation-patterns-consistency-rules.md#Backend Service File Structure]); all changes stay within `backend/character-service/src/**` plus the local `docker-compose.local.yml` env addition. No new top-level files needed — extend `publisher.ts` rather than adding a new module.

### Cross-story context

- This is the first story of Epic 6 (no prior Epic 6 story to inherit learnings from). Epic 5 (battle-service) is `ready-for-dev`, not done — **do not assume `battle-service` exists or import from it.** Story 6.3 applies this same dual-publish pattern to `battle-service`; keep the fan-out/payload approach here clean and self-contained so 6.3 can mirror it.
- Story 6.2 (`logWriter`) is the consumer of what you emit here; it handles `character_created`/`character_updated`/`character_deleted` (plus battle events). The field names you choose in the payload are the contract 6.2 will read — the superset above is designed so 6.2 can read either canonical (`eventType`/`actorId`/`occurredAt`) or legacy names.

### References

- [Source: epics/epic-6-room-history.md#Story 6.1] — story + acceptance criteria
- [Source: epics/epic-6-room-history.md#Story 6.2] — downstream `logWriter` consumer / supported event types
- [Source: epics/epic-6-room-history.md#Story 6.6] — Room History view requires avatar/name + per-field `prev → new` rows (drives the `changes` map)
- [Source: architecture/core-architectural-decisions.md#SNS Topic Architecture (Consumer-Owned)] — consumer-owned topics; character-service publishes to both
- [Source: architecture/core-architectural-decisions.md#ADR-6, #ADR-11, #ADR-12] — topic ownership; payload-carries-context (no HTTP); `LOG_TOPIC_ARN` required-but-degraded
- [Source: architecture/core-architectural-decisions.md#Implementation Sequence] — step 4: character-service publisher extension
- [Source: architecture/core-architectural-decisions.md#IAM Policy Additions] — "additive to existing notifications publish"
- [Source: architecture/implementation-patterns-consistency-rules.md#Publisher Pattern — dual-topic fan-out] — `Promise.allSettled`; sequential-publish anti-pattern
- [Source: architecture/implementation-patterns-consistency-rules.md#Event Payload Contract] — canonical `eventType`/`roomId`/`actorId`/`occurredAt` + display context
- [Source: _bmad-output/project-context.md] — backend non-strict TS/NodeNext, service-boundary isolation, event-contract guardrails, 70% coverage floor, docs-in-same-change
- [backend/character-service/src/publisher.ts](backend/character-service/src/publisher.ts), [app.ts](backend/character-service/src/app.ts), [service.ts](backend/character-service/src/service.ts), [lambda.ts](backend/character-service/src/lambda.ts), [index.ts](backend/character-service/src/index.ts) — modification targets
- [backend/room-notifications-service/src/app.ts](backend/room-notifications-service/src/app.ts), [types.ts](backend/room-notifications-service/src/types.ts) — notifications consumer (regression surface; do not modify)
- [backend/sam/template.yaml](backend/sam/template.yaml), [backend/docker-compose.local.yml](backend/docker-compose.local.yml) — infra/env wiring references

## Dev Agent Record

### Agent Model Used
GPT-5

### Debug Log References
- `npm test -- --run character-service/src/publisher.test.ts character-service/src/app.test.ts character-service/src/lambda.test.ts character-service/src/service.test.ts` — passed (19 tests).
- `npm test` from `backend/` — passed (21 files, 140 tests).
- `npm run typecheck` from `backend/` — passed all backend workspaces.
- `npm run test:coverage` from `backend/` — passed (all files line coverage 85.2%, above 70% floor).

### Completion Notes List
- Added an additive character event payload superset: legacy notification fields are unchanged, canonical mirror fields are present, and create/update/delete events include display-ready character context.
- Added update diff capture using a read-before-update model call; `changes` contains only normalized fields that actually changed and is emitted only for `character_updated`.
- Added a reusable fan-out publisher that runs notification and log legs with `Promise.allSettled`, logs failed legs, and never propagates publish failures into request handling.
- Wired Lambda to publish to existing `ROOM_CHARACTER_EVENTS_TOPIC_ARN` plus optional `LOG_TOPIC_ARN`; missing `LOG_TOPIC_ARN` warns once and degrades to a noop log leg.
- Wired local character-service startup to publish notifications and log events through Redis, adding `ROOM_LOG_EVENTS_CHANNEL` with default `room-log-events`; missing Redis warns once and degrades to noop log publishing.
- Updated backend local docs/config for the new room-history log channel. SAM/IAM `LOG_TOPIC_ARN` wiring remains deferred to Story 6.2 when the log topic resource exists, avoiding dangling infra references.

### File List
- backend/README.md
- backend/character-service/src/app.test.ts
- backend/character-service/src/app.ts
- backend/character-service/src/index.ts
- backend/character-service/src/lambda.test.ts
- backend/character-service/src/lambda.ts
- backend/character-service/src/publisher.test.ts
- backend/character-service/src/publisher.ts
- backend/character-service/src/service.test.ts
- backend/character-service/src/service.ts
- backend/docker-compose.local.yml

### Change Log
- 2026-05-20 — Implemented Story 6.1 character event fan-out and enriched room-history payloads; added tests, docs, and local env wiring.
