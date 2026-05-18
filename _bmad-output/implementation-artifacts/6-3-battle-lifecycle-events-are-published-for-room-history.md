# Story 6.3: Battle Lifecycle Events Are Published for Room History

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want battle start, conclusion, and discard events to appear in room history,
so that the group has a durable record of battle outcomes during the session.

## Acceptance Criteria

1. **Given** a battle is **created** (`POST /battles`), **concluded** (`POST /battles/:id/conclude`), or **discarded** (`DELETE /battles/:id`), **when** `battle-service` processes that lifecycle change, **then** it publishes the corresponding `battle_started` / `battle_concluded` / `battle_discarded` event to **both** the notifications topic/channel **and** the log topic/channel using `Promise.allSettled` (parallel fan-out, not sequential).
2. **Given** `LOG_TOPIC_ARN` (Lambda) or the log Redis channel (local) is **not configured**, **when** `battle-service` starts, **then** it emits a single startup warning and continues running in degraded mode — the notifications publish still works, the service does **not** crash, and request flows are unaffected (same posture as Story 6.1; ADR-12).
3. **Given** any battle lifecycle event is published, **when** the payload is constructed, **then** it carries enough display context for `log-service` to render a room-history summary **with zero outbound HTTP / cross-service calls** (ADR-11): at minimum the battle `id`, `name`, `status`, `result` (for concluded), plus the battle participation snapshot (`playerSide.characterIds`, `monsterSide.monsters`) for Story 6.7 drill-in.
4. **Given** publishing to one topic/channel fails (throws or rejects), **when** the fan-out runs, **then** the other topic/channel publish attempt still completes, and the request flow is never broken by a publish failure (publish errors are logged, never propagated to the HTTP response).
5. **Given** a battle is **updated** via `PATCH /battles/:id` (name/sides mutation), **when** that update is published, **then** `battle_updated` is published to the **notifications topic/channel ONLY** and is **never** sent to the log topic/channel (ADR-5: `battle_updated` is not logged; it is realtime-only). No `LogEvent` must ever be created for `battle_updated`.
6. **Given** the notifications consumer (`room-notifications-service`) and its existing battle realtime fan-out (Epic 5: Stories 5.4–5.7), **when** the enriched payload is delivered, **then** existing realtime `battle_*` behavior is unchanged (no regression to Epic 5 realtime features) — every legacy notifications field established by Epic 5 (`event`, `roomId`, `battleId`, `emittedAt`, and any other consumer-read field) keeps its exact name and shape; enrichment is strictly **additive**.

> **⛔ SCOPE GUARD & PREREQUISITE — READ BEFORE WRITING ANY CODE.**
> This story is the **`battle-service` publisher extension** — the exact battle-service analog of Story 6.1 (which extended `character-service`). It adds a **second (log) publish leg + display-context enrichment** on top of battle-service's *existing* notifications publish.
>
> It **DEPENDS ON** Epic 5 having delivered the battle lifecycle + the base notifications publisher. **It does NOT build them.** Specifically it does **not** implement: the `POST /battles/:id/conclude` endpoint (Story 5.6), the `DELETE /battles/:id` discard endpoint (Story 5.7), the `PATCH /battles/:id` endpoint (Story 5.3), or the base `SnsBattleEventPublisher` / `RedisBattleEventPublisher` + lambda/index notifications wiring + SAM notifications topic/IAM (Stories 5.4/5.6/5.7 + architecture Implementation Sequence step 2).
>
> **Hard blocked-by (must be `done` before this story can be implemented):** Stories **5.3, 5.4, 5.6, 5.7**. At create time these are all `ready-for-dev`, not `done`, and `battle-service` on `main` implements **only Story 5.1** (`POST /battles` create + `GET /battles` active query; `publisher.ts` has only `NoopBattleEventPublisher` + `createBattleStartedEventPayload`; `lambda.ts`/`index.ts` wire no real publisher). If those endpoints/publisher do not yet exist when implementation starts, **HALT and report the blocker** — do not reimplement Epic 5 inside this story. See Dev Notes → "Critical prerequisite".

## Tasks / Subtasks

- [ ] **Task 0 — Verify prerequisites before any edits (blocking gate)**
  - [ ] Confirm `battle-service/src/app.ts` (or `routes/battles.ts` if Epic 5 extracted routes) exposes the create, `POST /battles/:id/conclude`, `DELETE /battles/:id` (discard), and `PATCH /battles/:id` handlers, and that each already publishes its event to the notifications target via an injected `BattleEventPublisher`.
  - [ ] Confirm `publisher.ts` already has working `SnsBattleEventPublisher` + `RedisBattleEventPublisher` (notifications leg) wired in `lambda.ts` (`NOTIFICATIONS_TOPIC_ARN` / Epic 5's notifications topic env) and `index.ts` (Redis), mirroring `character-service`.
  - [ ] If any of the above is missing → **STOP**. Record in Completion Notes that Story 6.3 is blocked on Epic 5 (Stories 5.3/5.4/5.6/5.7) and do not proceed. Do not build Epic 5 scope here.

- [ ] **Task 1 — Enrich the battle event payload contract (AC: 3, 5, 6)**
  - [ ] In `backend/battle-service/src/publisher.ts`, extend `BattleEventPayload` with an **additive** display-context section. Do **NOT** rename or remove any field the notifications consumer (`room-notifications-service`, wired by Epic 5) already reads (`event`, `roomId`, `battleId`, `emittedAt`, and any other Epic-5-established field) — additive only.
  - [ ] Add canonical mirror fields to forward-align with the architecture event contract (duplicates of existing data, additive): `eventType` (= `event`), `actorId` (= `battleId`), `occurredAt` (= `emittedAt`) ([Source: architecture/implementation-patterns-consistency-rules.md#Event Payload Contract]).
  - [ ] Add a `battle` display-context object: `{ id: string; name: string; status: 'active' | 'concluded' | 'discarded'; result: 'players_win' | 'monster_wins' | null; playerSide: { characterIds: string[]; bonuses: BonusItem[] }; monsterSide: { monsters: MonsterItem[]; bonuses: BonusItem[] } }`. This is the battle snapshot at the moment of the lifecycle event — the raw context Story 6.7 drill-in renders, and the source for Story 6.2's `buildSummary` battle branch (`battle.name`, `battle.result`).
  - [ ] Add typed payload creators mirroring the existing `createBattleStartedEventPayload`: extend it to carry the full battle snapshot, and add `createBattleConcludedEventPayload` and `createBattleDiscardedEventPayload` (and `createBattleUpdatedEventPayload` if Epic 5 did not already add it). Each accepts the post-transition `BattleLike` snapshot and builds the enriched superset. Keep `emittedAt`/`occurredAt` deterministic via `new Date().toISOString()` (existing pattern; fake-timer testable).
  - [ ] Reuse the existing `BonusItem` / `MonsterItem` types from `app.ts` — do not redefine them in `publisher.ts`; import the shared types so the snapshot shape cannot drift from the model.

- [ ] **Task 2 — Event-type-aware dual-target fan-out publisher (AC: 1, 4, 5)**
  - [ ] Introduce a composite/fan-out publisher in `publisher.ts` that wraps an ordered list of leg publishers (notifications leg + log leg) and publishes via `await Promise.allSettled(legs.map(p => p.publish(payload)))`. Each rejected leg is logged with the failing target; no rejection is rethrown (AC 4).
  - [ ] **Event-type routing rule (battle-specific, differs from Story 6.1):** the **log leg must be skipped for `battle_updated`** (AC 5 / ADR-5). Lifecycle events (`battle_started`, `battle_concluded`, `battle_discarded`) fan out to **both** legs; `battle_updated` goes to the **notifications leg only**. Implement this as a single rule inside the composite (e.g., the log leg is a no-op/short-circuit when `payload.eventType !==` one of the three lifecycle types) so call sites stay unaware of routing — never duplicate the decision at each route handler.
  - [ ] Reuse the existing/Epic-5 `SnsBattleEventPublisher` / `RedisBattleEventPublisher` / `NoopBattleEventPublisher` classes as legs — do **NOT** duplicate SNS/Redis client logic. The `BattleEventPublisher` interface (`publish(payload): Promise<void>`) is unchanged; the composite implements the same interface so `app.ts` / `service.ts` wiring stays as-is (still `options.publisher`).

- [ ] **Task 3 — Pass the battle snapshot into payload creation at each lifecycle call site (AC: 3, 5)**
  - [ ] In the create handler (`POST /battles`), pass the created `BattleLike` snapshot into the (now snapshot-aware) `createBattleStartedEventPayload`.
  - [ ] In the conclude handler (`POST /battles/:id/conclude`, Epic 5 / Story 5.6), pass the post-conclude `BattleLike` snapshot (status `concluded`, the chosen `result`, `concludedAt`) into `createBattleConcludedEventPayload`.
  - [ ] In the discard handler (`DELETE /battles/:id`, Epic 5 / Story 5.7), pass the post-discard `BattleLike` snapshot (status `discarded`) into `createBattleDiscardedEventPayload`.
  - [ ] In the PATCH handler (`PATCH /battles/:id`, Epic 5 / Story 5.3), continue publishing `battle_updated` via the same injected publisher — the composite's routing rule (Task 2) ensures it never reaches the log leg. **Do not add a separate publisher or special-case the route.**
  - [ ] Preserve the existing per-call-site `try/catch` that logs and **swallows** publish errors (already present at the `battle_started` call site in `app.ts`; replicate the same swallow at the conclude/discard/patch call sites if Epic 5 has not). This swallow is the AC 4 request-flow guarantee — a publish failure must never change the HTTP status (`201` create / `200` conclude / `200`/`204` discard / `200` patch).

- [ ] **Task 4 — Lambda wiring: notifications + log SNS legs with degraded mode (AC: 1, 2, 4)**
  - [ ] In `backend/battle-service/src/lambda.ts`, build the notifications leg from Epic 5's existing notifications topic env var (use the exact env name Epic 5 wired — do **not** rename it; see Project Structure Notes) and a new log leg from `LOG_TOPIC_ARN`.
  - [ ] If `LOG_TOPIC_ARN` is absent/empty: `console.warn` **once** at bootstrap ("degraded — battle log history will be absent") and use `NoopBattleEventPublisher` for the log leg. The service must **NOT** throw or `process.exit` (ADR-12; contrast log-service's fail-fast subscriber in Story 6.2 — publishers degrade, subscribers hard-fail).
  - [ ] Compose both legs into the event-type-aware fan-out publisher and pass it to `buildBattleApp({ routePrefix, publisher })`. Extend the existing `[battle-service] lambda bootstrap config` `console.info` with `logTopicArnConfigured: Boolean(process.env.LOG_TOPIC_ARN)` and the resolved publisher class name (follow the `character-service/src/lambda.ts` pattern exactly).

- [ ] **Task 5 — Local server wiring: notifications + log Redis legs with degraded mode (AC: 1, 2, 4)**
  - [ ] In `backend/battle-service/src/index.ts`, keep Epic 5's notifications Redis leg as-is. Add a log Redis leg on a new channel env `ROOM_LOG_EVENTS_CHANNEL` (default `room-log-events`) — **this default must exactly match Story 6.1's publisher channel and Story 6.2's `logWriter` subscriber channel** (cross-service contract; do not invent a new name).
  - [ ] If the Redis URL is unset (Noop path) or the log channel cannot be configured, `console.warn` **once** and use `NoopBattleEventPublisher` for the log leg. Do not crash.
  - [ ] Compose both legs into the fan-out publisher; extend the existing `[battle-service] local bootstrap config` `console.info` with `logEventsChannel` + `logConfigured` (mirror `character-service/src/index.ts`).

- [ ] **Task 6 — Tests (AC: 1, 2, 3, 4, 5, 6)**
  - [ ] `publisher.test.ts`: fan-out invokes every leg and uses `Promise.allSettled` (assert both legs invoked even when one rejects; a rejecting leg does **not** cause the composite `publish` to reject — AC 4); `createBattleStartedEventPayload` / `createBattleConcludedEventPayload` / `createBattleDiscardedEventPayload` each produce the enriched superset incl. `battle` snapshot and canonical mirrors; legacy notifications fields preserved exactly (regression guard for AC 6); **`battle_updated` payload is delivered to the notifications leg but NOT to the log leg** (explicit AC 5 guard — assert the log leg's `publish` is never called for `battle_updated`).
  - [ ] `lambda.test.ts`: both env vars set → composite with two SNS legs; `LOG_TOPIC_ARN` absent → startup `console.warn` + notifications leg still active + handler still boots and responds (no throw). Follow the existing `vi.mock('./db')` / `vi.mock('./service')` / `vi.mock('@codegenie/serverless-express')` + `await import('./lambda.js')` pattern; add `delete process.env.LOG_TOPIC_ARN` (and Epic 5's notifications env) to `beforeEach`.
  - [ ] `app.test.ts`: create/conclude/discard publish a payload containing the `battle` display context with correct `name`/`status`/`result`; a publisher that throws does **NOT** change the HTTP status (regression guard for AC 4); `battle_updated` from PATCH is published but the log leg never sees it (AC 5). Inject a spy publisher via the existing `createApp(model, { publisher })` / `buildBattleApp({ publisher })` option.
  - [ ] Run the backend test + coverage gate from repo `backend/`: `cd backend && npm test` then `npm run test:coverage` (Vitest 3.2.4, v8 coverage, **70% line floor is a CI hard gate — do not lower**). `battle-service` primary coverage target is state-machine transitions + the fan-out/degraded/error-swallow behavior — assert real behavior, not filler.

- [ ] **Task 7 — Infra wiring + docs (AC: 1, 2)**
  - [ ] `backend/sam/template.yaml`: add `LOG_TOPIC_ARN: !Ref LogEventsTopic` to `BattleServiceFunction`'s `Environment` and a `sns:Publish` statement on `!Ref LogEventsTopic` to `BattleServiceRole` Policies (additive — do not remove/rename Epic 5's notifications `sns:Publish`). `LogEventsTopic` is created by Story 6.2's SAM work; if it is not yet present in the template, follow Story 6.1's deferral guidance: either defer this env+IAM until `LogEventsTopic` exists (note it in Completion Notes) or use a SAM parameter defaulting to empty + conditional IAM so `sam` still deploys with no log topic. Either way the running service must satisfy AC 2 with no `LOG_TOPIC_ARN` set. ([Source: architecture/core-architectural-decisions.md#IAM Policy Additions] — "`battle-service`: `sns:Publish` on `NOTIFICATIONS_TOPIC_ARN` + `LOG_TOPIC_ARN`".)
  - [ ] `backend/docker-compose.local.yml`: add `ROOM_LOG_EVENTS_CHANNEL: room-log-events` to the `battle-service` service env block (idempotent if Epic 5 already added Redis envs) so local fan-out lands on the channel Story 6.2's `logWriter` subscribes to.
  - [ ] Update the nearest docs in the same change: `backend/.env.example` (add `ROOM_LOG_EVENTS_CHANNEL=room-log-events` for battle-service if absent) and any `battle-service` README/env reference if present. Do not hardcode ARNs/endpoints; do not change dependency versions or lockfiles ([Source: _bmad-output/project-context.md] docs-in-same-change + scoped-changes rules).

## Dev Notes

### What this story is (and is not)

- **Is:** the `battle-service` *publisher extension* — make battle **lifecycle** events (`battle_started`, `battle_concluded`, `battle_discarded`) go to a second (log) target with enough display context for room-history summaries, exactly mirroring Story 6.1's `character-service` work. This is part of architecture Implementation Sequence step 2's "SNS publisher for both topics" closed out for the log side ([Source: architecture/core-architectural-decisions.md#Implementation Sequence]).
- **Is not:** building `log-service`, the `LogEvent` model, the SNS subscriber, the read API (Stories 6.2/6.4), **or** the Epic 5 battle lifecycle endpoints and base notifications publisher. It must run correctly even before `log-service`/the log topic exist — that is why AC 2 (degraded mode) exists ([Source: architecture/core-architectural-decisions.md#ADR-12]).

### Critical prerequisite — cross-story dependency (the #1 disaster to prevent)

`character-service` already had a full notifications publish path (Epic 3/4 done) when Story 6.1 extended it. **`battle-service` does not.** On `main`, only Story 5.1 is implemented:

- `publisher.ts` = only `BattleEventPayload {event, roomId, battleId, emittedAt}`, `BattleEventPublisher`, `NoopBattleEventPublisher`, `createBattleStartedEventPayload`. **No `SnsBattleEventPublisher`, no `RedisBattleEventPublisher`, no conclude/discard/updated payload creators.**
- `app.ts` = only `GET /health`, `GET /battles` (active query), `POST /battles` (create → publishes `battle_started` through an injected publisher that defaults to **Noop**). **No `PATCH`, no `/conclude`, no `DELETE`.**
- `lambda.ts` / `index.ts` = `buildBattleApp({ routePrefix })` with **no publisher** → Noop. **No SNS/Redis wiring at all.**
- `backend/sam/template.yaml` = `BattleServiceFunction` with only `BattleListGet`+`BattleCreatePost` events; `BattleServiceRole` has **no `sns:Publish`** policy; no notifications/log topic env.

The conclude endpoint (Story 5.6), discard endpoint (Story 5.7), `PATCH` (Story 5.3), and the base `Sns`/`Redis` battle notifications publisher + lambda/index/SAM notifications wiring (Stories 5.4/5.6/5.7 + Implementation Sequence step 2) are **prerequisites owned by Epic 5**, which is `in-progress` with 5.3/5.4/5.5/5.6/5.7 all `ready-for-dev` (not `done`).

**Therefore this story is hard-blocked-by Stories 5.3, 5.4, 5.6, 5.7.** Task 0 is a blocking gate: if those endpoints/publisher are absent at implementation time, HALT and report — do **not** absorb Epic 5 scope into 6.3 (that would be a massive, out-of-scope blast radius and would collide with the Epic 5 stories' own implementations). This is the same scope-guard discipline Story 6.2 used.

### Current state of files being modified (read before editing)

- `backend/battle-service/src/publisher.ts` — single-target, minimal today (see above). Extend it (do not add a new module): add canonical mirrors + `battle` display context, the conclude/discard payload creators, and the event-type-aware composite. Reuse `BonusItem`/`MonsterItem` from `app.ts`.
- `backend/battle-service/src/app.ts` — `createApp(battleModel, { routePrefix, publisher })`. `publisher` defaults to `new NoopBattleEventPublisher()`. The `POST /battles` handler already wraps `publisher.publish(...)` in a local `try/catch` that logs and swallows (this is correct and must be preserved — it is the AC 4 guarantee at the call site). Epic 5 adds the conclude/discard/patch handlers + their publish calls; this story only ensures each passes the battle snapshot into the enriched payload creator.
- `backend/battle-service/src/service.ts` — `buildBattleApp({ routePrefix, publisher })` → `createApp(createBattleModel(), { ... })`. `toBattleLike()` already maps a Mongoose doc to the `BattleLike` snapshot shape you should embed in the payload. Wiring stays as-is (still `options.publisher`).
- `backend/battle-service/src/lambda.ts` / `index.ts` — currently pass **no** publisher. Mirror `character-service/src/lambda.ts` (SNS leg from topic-arn env, else Noop, with `topicArnConfigured` in bootstrap log) and `character-service/src/index.ts` (Redis leg from url+channel env, else Noop) — but compose **two** legs (notifications + log) into the fan-out publisher.
- `backend/battle-service/src/models/Battle.ts` — `Battle` Mongoose model; `{ timestamps: true }`, `_id`→`id` `toJSON` transform, unique partial index on `status:'active'`, `{roomId:1,createdAt:-1}`. No model change needed for this story (the log-side index/model is Story 6.2). Do not modify the model.
- **Regression surface (do not modify in this story):** `room-notifications-service` consumes the notifications battle payload (wired by Epic 5). Epic 5 establishes which fields it reads; treat them as frozen and enrich additively only. Do not import from / change `room-notifications-service` or `log-service` here (service-boundary isolation, [Source: _bmad-output/project-context.md]).

### Key design decision — payload shape (recommended approach, lead with the clean one)

The architecture's canonical event contract uses `eventType`/`actorId`/`occurredAt` ([Source: architecture/implementation-patterns-consistency-rules.md#Event Payload Contract]), while the live battle notifications path (established by Epic 5) uses legacy `event`/`battleId`/`emittedAt`, and Story 6.1 set the precedent that this enrichment is **additive to the existing notifications publish** ([Source: architecture/core-architectural-decisions.md#IAM Policy Additions]).

**Recommended: a single additive *superset* payload** — preserve every legacy notifications field unchanged, add canonical mirror fields + a `battle` display-context object. One payload builder per lifecycle event, both legs send the same payload object (the composite just decides *whether* the log leg runs), no consumer rewrite, forward-aligned with the architecture contract, zero notifications regression risk. This is the architecturally clean *and* low-blast-radius choice — prefer it. (This matches the exact pattern Story 6.1 chose for `character-service`; mirroring it keeps the two producers consistent for Story 6.2's `parseLogEvent`.)

Rejected alternative: migrate the battle notifications payload to the canonical contract and rewrite `room-notifications-service`'s battle consumer + types + tests as a coordinated breaking change. Cleaner on paper but a large blast radius into Epic 5 realtime features for no AC benefit, and the established precedent is "additive." Do not do this here.

Recommended payload (superset):

```ts
import type { BonusItem, MonsterItem } from './app';

interface BattleEventPayload {
  // legacy notifications contract — names/shapes FROZEN (room-notifications-service depends on these; Epic 5 owns them)
  event: 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded';
  roomId: string;
  battleId: string;
  emittedAt: string;                 // ISO-8601
  // canonical mirrors (additive; forward-align with architecture BaseEvent)
  eventType: string;                 // === event
  actorId: string;                   // === battleId
  occurredAt: string;                // === emittedAt
  // display context for log-service summary + Story 6.7 drill-in (NO outbound HTTP)
  battle: {
    id: string;
    name: string;
    status: 'active' | 'concluded' | 'discarded';
    result: 'players_win' | 'monster_wins' | null;   // meaningful for battle_concluded
    playerSide: { characterIds: string[]; bonuses: BonusItem[] };
    monsterSide: { monsters: MonsterItem[]; bonuses: BonusItem[] };
  };
}
```

Build the `battle` object straight from the post-transition `BattleLike` (`service.ts` `toBattleLike()` already produces this shape) so the snapshot cannot drift from the model.

### `battle_updated` is realtime-only — never logged (AC 5 / ADR-5)

This is the key behavioral difference from Story 6.1 (where the same payload always fans out to both legs). The log captures **lifecycle events only**; intermediate battle mutations (`PATCH` name/sides/bonuses/monsters) are **not** persisted to the log ([Source: architecture/core-architectural-decisions.md#Log Schema Note], [#ADR-5]). But `battle_updated` **is** still broadcast over WebSocket for realtime UI sync via the notifications path ([Source: architecture/core-architectural-decisions.md#WebSocket Client Extension] — "`battle_updated` is NOT logged but IS broadcast via WebSocket"). Implement the include/exclude decision **once**, inside the composite fan-out (log leg short-circuits for any non-lifecycle eventType), so route handlers never special-case it. Story 6.2's `logWriter` is the defense-in-depth backstop (it already rejects `battle_updated` → no `LogEvent`), but 6.3 must not rely on that — the producer must not send `battle_updated` to the log topic at all.

### "Character names" in the payload — intentional variance vs epic AC shorthand (ADR-11)

Epic 6.3's AC text says the payload should include "character names." **`battle-service` does not store character names** — the `Battle` model holds only `playerSide.characterIds` (a snapshot of IDs at battle start) and `monsterSide.monsters` (which *do* carry `name`). Resolving participant character names would require an **outbound HTTP call to `character-service`, which ADR-11 explicitly forbids** for summary/display context. Resolution (same documented-variance discipline Stories 6.1/6.2 used): the payload carries `playerSide.characterIds` + the full `monsterSide.monsters` (names included) as the durable battle snapshot; participant **character-name rendering is done client-side in Story 6.7** from the room's already-loaded character state — no server HTTP. Story 6.2's `buildSummary` battle branch only needs `battle.name` + `battle.result` (`Battle '<name>' concluded — <result>`), not character names, so the deterministic summary is fully satisfiable from this payload. Record this variance in Completion Notes. Do **not** add an HTTP client to character-service to "fix" the AC literally.

### Producer/consumer field-name contract with Story 6.2 (authoritative here)

Story 6.2's `logWriter` maps defensively: `eventType = payload.eventType ?? payload.event`; `actorId = payload.actorId ?? payload.event_body?.characterId ?? payload.battleId`; `occurredAt = payload.occurredAt ?? payload.emittedAt ?? now`; raw `payload` stored verbatim for drill-in. The superset above satisfies all of these (canonical + legacy `battleId`). Story 6.2's `buildSummary` battle branch is specified to read **`battle.name`** and **`battle.result`** — Story 6.3 is the authoritative definition of those field names. Both 6.2 and 6.3 are `ready-for-dev` (not done); whoever implements 6.2's battle branch must read `battle.name`/`battle.result` from this payload. If field names change during 6.2's implementation, this superset's legacy+canonical duplication absorbs naming drift — keep both.

### Dual-topic publishing rule (must follow exactly)

Use `Promise.allSettled` over the legs. Never sequential `await publishNotifications; await publishLog` — sequential means a notifications failure blocks the log publish (and vice-versa) ([Source: architecture/implementation-patterns-consistency-rules.md#Publisher Pattern — dual-topic fan-out], explicit anti-pattern; [#Enforcement Summary]). Notifications leg first, log leg second, both always attempted for lifecycle events; log leg skipped only for `battle_updated` (Task 2 routing rule, not a sequencing exception).

### Conventions to honor ([Source: _bmad-output/project-context.md] + architecture)

- Backend is **non-strict TypeScript / NodeNext** — match existing import style (note tests use `await import('./lambda.js')` with the `.js` ext even for `.ts` source). Do not normalize to frontend strictness.
- Event type strings stay `snake_case` (`battle_started`/`battle_updated`/`battle_concluded`/`battle_discarded`). Env vars `ALL_CAPS_SNAKE_CASE` (`LOG_TOPIC_ARN`, `ROOM_LOG_EVENTS_CHANNEL`).
- Keep `battle-service` self-contained — no cross-service imports (no importing from `room-notifications-service`/`log-service`/`character-service`); no synchronous inter-service HTTP (ADR-11). All summary context arrives in the payload.
- Preserve existing public route contracts and the `{ message: string }` error shape; unexpected Lambda errors `502` not `500` ([Source: architecture/implementation-patterns-consistency-rules.md#Format Patterns]).
- Co-locate tests as `<source>.test.ts` (matching casing); backend tests run in Node env via Vitest 3.2.4, v8 coverage, **70% line floor is a CI hard gate** — do not lower; coverage is a floor, assert real behavior (fan-out, degraded mode, `battle_updated` exclusion, error-swallow, snapshot correctness).
- Preserve the existing publish-error swallow at every lifecycle call site (logs + continues) — this is the request-flow guarantee for AC 4; publish failures must never reach the HTTP response.
- Docs-in-same-change: any env var addition updates `.env.example`/README/`docker-compose`/SAM in the same change set. Keep edits minimal and localized; no opportunistic refactors, no dependency/lockfile churn.

### Testing standards summary

- Mock external boundaries only (SNS client, Redis `createClient`) — do not mock the unit under test. Reuse the existing `vi.spyOn(console,...)` pattern in `publisher.test.ts` and the `vi.mock('./db')` / `vi.mock('./service')` / `vi.mock('@codegenie/serverless-express')` + `await import('./lambda.js')` pattern in `lambda.test.ts`.
- One success-path + one failure-path per new behavior: fan-out success vs one-leg-rejects (AC 4); both-env-set vs missing-`LOG_TOPIC_ARN` degraded boot (AC 2); lifecycle-event-to-both-legs vs `battle_updated`-to-notifications-only (AC 5).
- AC 4 failure-path test: publisher throws → HTTP status unchanged (`201` create / `200` conclude / `200`/`204` discard / `200` patch — match Epic 5's actual status codes).
- Keep tests deterministic — control `Date` via fake timers (existing pattern) for `emittedAt`/`occurredAt`; no real network/timing.
- The `battle_updated`-never-logged assertion is the highest-value new test (it guards ADR-5 at the producer); make it explicit, not incidental.

### Project Structure Notes

- All changes stay within `backend/battle-service/src/**` (extend `publisher.ts`; touch `lambda.ts`/`index.ts` wiring; pass snapshots at `app.ts`/Epic-5 route call sites) plus `backend/sam/template.yaml`, `backend/docker-compose.local.yml`, `backend/.env.example`/README for env/docs. No new top-level files — extend `publisher.ts`, do not add a module.
- **Documented variances (do not "fix" silently; record in Completion Notes):** (1) epic AC "character names" → satisfied via `playerSide.characterIds` + `monsterSide.monsters` snapshot; participant character names resolved client-side in Story 6.7 (ADR-11 forbids the HTTP call that literal resolution would need); (2) notifications topic env var name follows **Epic 5's** chosen name (analogous to Story 6.1 keeping `ROOM_CHARACTER_EVENTS_TOPIC_ARN` instead of the doc's `NOTIFICATIONS_TOPIC_ARN`) — do not rename it; introduce only the new `LOG_TOPIC_ARN` / `ROOM_LOG_EVENTS_CHANNEL`; (3) local log Redis channel uses `ROOM_LOG_EVENTS_CHANNEL`/`room-log-events` (the live cross-service contract set by Stories 6.1/6.2), not any differing architecture-doc name.
- **Cross-story infra dependency:** the log SNS topic (`LogEventsTopic`) is created by Story 6.2's SAM work. Adding `LOG_TOPIC_ARN`+`sns:Publish` to `BattleServiceFunction`/`BattleServiceRole` should land once `LogEventsTopic` exists in the template (avoid a dangling `!Ref`); if it does not yet, defer per Story 6.1's documented approach and note it in Completion Notes. The running service must satisfy AC 2 with no `LOG_TOPIC_ARN` regardless.

### Cross-story context

- **Stories 5.3/5.4/5.6/5.7 (Epic 5, `ready-for-dev`, not done):** hard prerequisites — they deliver the `PATCH`/conclude/discard endpoints and the base notifications `Sns`/`Redis` battle publisher + lambda/index/SAM wiring this story extends. Task 0 gates on them. Do not import Epic 5 code; do not reimplement it.
- **Story 6.1 (`ready-for-dev`):** the `character-service` analog. Mirror its superset-payload + `Promise.allSettled` fan-out + degraded-mode + error-swallow pattern. The one deliberate difference: 6.3's composite is **event-type-aware** (log leg skipped for `battle_updated`); 6.1's is not.
- **Story 6.2 (`ready-for-dev`):** the consumer. Its `logWriter` already handles all 6 supported types (incl. the 3 battle lifecycle types) and rejects `battle_updated`; it needs **zero** writer change from 6.3 — only 6.2's `buildSummary` battle branch reads `battle.name`/`battle.result` from this payload. Treat the superset here as the authoritative contract.
- **Story 6.7 (frontend, backlog):** renders battle history entries and drills into completed battles from the raw stored `payload` — which is exactly why the full `battle` snapshot (incl. `characterIds`/`monsters`) travels in the payload here and is stored verbatim by 6.2.

### References

- [Source: epics/epic-6-room-history.md#Story 6.3] — story + acceptance criteria
- [Source: epics/epic-6-room-history.md#Story 6.2] — downstream `logWriter`/`buildSummary` consumer; 6 supported types; `battle_updated` rejected
- [Source: epics/epic-6-room-history.md#Story 6.7] — battle drill-in renders from raw stored `payload` (drives the `battle` snapshot)
- [Source: epics/epic-5-battle-management.md#Story 5.1, #5.3, #5.4, #5.6, #5.7] — battle lifecycle + base notifications publisher (prerequisites)
- [Source: architecture/core-architectural-decisions.md#SNS Topic Architecture (Consumer-Owned)] — consumer-owned topics; battle-service publishes to both
- [Source: architecture/core-architectural-decisions.md#Log Schema] — `LogEvent` shape; "`battle_updated` is NOT logged" note; summary example `Battle 'Dragon' concluded — players win`
- [Source: architecture/core-architectural-decisions.md#ADR-5, #ADR-6, #ADR-11, #ADR-12] — `battle_updated` not logged; topic ownership; payload-carries-context (no HTTP); `LOG_TOPIC_ARN` required-but-degraded
- [Source: architecture/core-architectural-decisions.md#Implementation Sequence] — step 2: battle-service "SNS publisher for both topics"
- [Source: architecture/core-architectural-decisions.md#IAM Policy Additions] — `battle-service`: `sns:Publish` on notifications + `LOG_TOPIC_ARN`
- [Source: architecture/core-architectural-decisions.md#WebSocket Client Extension] — `battle_updated` not logged but IS broadcast via WebSocket (realtime-only)
- [Source: architecture/implementation-patterns-consistency-rules.md#Publisher Pattern — dual-topic fan-out, #Enforcement Summary] — `Promise.allSettled`; sequential-publish anti-pattern; `roomId` mandatory; `snake_case` event types
- [Source: architecture/implementation-patterns-consistency-rules.md#Event Payload Contract] — canonical `eventType`/`roomId`/`actorId`/`occurredAt` + display context
- [Source: _bmad-output/project-context.md] — backend non-strict TS/NodeNext, service-boundary isolation, event-contract guardrails, 70% coverage floor, docs-in-same-change, scoped-changes
- [backend/battle-service/src/publisher.ts](backend/battle-service/src/publisher.ts), [app.ts](backend/battle-service/src/app.ts), [service.ts](backend/battle-service/src/service.ts), [lambda.ts](backend/battle-service/src/lambda.ts), [index.ts](backend/battle-service/src/index.ts), [models/Battle.ts](backend/battle-service/src/models/Battle.ts) — modification / read targets
- [backend/character-service/src/publisher.ts](backend/character-service/src/publisher.ts), [lambda.ts](backend/character-service/src/lambda.ts), [index.ts](backend/character-service/src/index.ts) — Story 6.1 mirror pattern (superset/fan-out/degraded/wiring)
- [backend/sam/template.yaml](backend/sam/template.yaml), [backend/docker-compose.local.yml](backend/docker-compose.local.yml), [backend/.env.example](backend/.env.example) — infra/env wiring references

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
