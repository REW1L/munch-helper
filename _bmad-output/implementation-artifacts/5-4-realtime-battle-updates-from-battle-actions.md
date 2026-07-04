# Story 5.4: Realtime Battle Updates from Battle Actions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want battle changes made by other players to appear in real time,
so that everyone sees the same current battle state during the encounter.

This is the **fourth story of Epic 5 (Battle Management)** and the **realtime story
that Stories 5.1 and 5.3 explicitly deferred** ("OUT of scope → Story 5.4"). It makes
`battle-service`'s no-op publisher seam real, extends the **existing** room
notification fan-out (`room-notifications-service`) and the **existing** frontend
WebSocket client to carry `battle_*` events, and adds a WS subscription to 5.1's
HTTP-only `useRoomBattle` hook so Room View and Battle View update live. It does
**not** add conclude/discard endpoints (5.6/5.7) or character→battle reconciliation
(5.5).

## ⛔ HARD PREREQUISITE — Stories 5.1 AND 5.3 must be implemented & merged first

5.1 and 5.3 are `ready-for-dev` (documented) but **NOT yet implemented in code**
(verified on this branch — `backend/battle-service/`, `frontend/api/battles.ts`,
`frontend/hooks/useRoomBattle.ts`, `frontend/hooks/useBattleActions.ts`, the
`frontend/app/munchkin/[roomNumber]/(battle)/` route do not exist). 5.4 directly
extends seams those stories build:

- **5.1 Task 7** — the `battle-service` **no-op publisher seam** (`src/publisher.ts`
  `NoopBattleEventPublisher`, the `publisher.publish(...)` call site after
  `POST /battles`). 5.4 makes this publisher real (`Sns*`/`Redis*` impls + env
  wiring) and supplies the `battle_started` payload.
- **5.3 Task 2** — the `publisher.publish(...)` call site after `PATCH /battles/:id`.
  5.4 supplies the `battle_updated` payload here.
- **5.1 Task 9** — `useRoomBattle(roomId)` (HTTP-on-mount only, key
  `['battle', roomId]`). 5.4 adds the WS subscription + reconnect re-sync.

Stories 3.1/3.2 (the epic's "Depends on") are **done**. **5.2 is parallel** and only
*reads* `useRoomBattle().battle`; once 5.4 makes the hook live, 5.2's banner becomes
live automatically with **no change to 5.2's code** (it already re-renders on
`['battle', roomId]` cache changes). If a dev agent picks this up before 5.1+5.3 are
merged, **HALT and report the blocked dependency** — do not re-create the
battle-service/publisher/hook (duplicate-work anti-pattern).

## 🚨 CRITICAL: the architecture doc's realtime model does NOT match the running repo

This is the single biggest disaster risk in this story. The architecture documents
(`core-architectural-decisions.md`, `implementation-patterns-consistency-rules.md`,
`project-structure-boundaries.md`, `requirements-inventory.md`) describe an
**idealized** event/topic model. The **actual, verified codebase** is different.
**Follow the actual repo. Do NOT "reconcile" toward the doc** — doing so will
**regress the working character realtime flow**.

| Architecture doc says (DO NOT follow) | Actual repo (verified — DO follow) |
|---|---|
| Dual topics: `NOTIFICATIONS_TOPIC_ARN` + `LOG_TOPIC_ARN`; `Promise.allSettled` fan-out | **One** SNS topic `RoomCharacterEventsTopic`, env `ROOM_CHARACTER_EVENTS_TOPIC_ARN`. No log topic exists (Epic 6). Single publish, no `allSettled`. |
| Redis channels `room_notifications` + `log_events` | **One** channel `room-character-events`, env `ROOM_CHARACTER_EVENTS_CHANNEL`; publisher Redis URL env `CHARACTER_EVENTS_REDIS_URL` (battle uses its own — see Task 1) |
| Event payload `{ eventType, roomId, actorId, occurredAt, ...display context }` | `{ event, roomId, event_body: {...}, emittedAt, correlationId? }` — see `character-service/src/publisher.ts` `createCharacterEventPayload` |
| `routes/<x>.ts` folder per service; per-service `vitest.config.ts` | Endpoints inline in `src/app.ts`; only `models/` is a subfolder; single root `backend/vitest.config.ts` + workspaces |
| `room-notifications-service/src/subscriber.ts` | No `subscriber.ts`. Local Redis sub is in `src/index.ts`; cloud SNS handler in `src/lambda.ts`; event parsing in `src/app.ts`; fan-out in `src/service.ts` |
| `battle_*` logged via log-service | `battle_updated` not logged anyway (ADR-5); **no log-service exists** — all logging is Epic 6. 5.4 does ZERO logging. |
| Battle-service `.env.example`: `NOTIFICATIONS_TOPIC_ARN`, `LOG_TOPIC_ARN`, `NOTIFICATIONS_REDIS_CHANNEL`, `LOG_REDIS_CHANNEL` | Mirror `character-service`'s real var names (see Task 1) |

5.1 and 5.3 Dev Notes already established this divergence and the rule: **follow
actual `character-service` + `room-notifications-service` conventions; follow the
architecture only for net-new battle decisions where no existing pattern conflicts.**

## Acceptance Criteria

1. **Battle actions publish `battle_*` realtime updates; character realtime is
   unaffected.** Given a battle is started or updated (and, when 5.6/5.7 land,
   concluded or discarded) by a player, when that mutation succeeds, then
   `battle-service` publishes a `battle_*` event for the room over the **same**
   notification transport the character flow uses (SNS topic
   `RoomCharacterEventsTopic` in cloud / Redis channel `room-character-events`
   locally), and the existing `character_created|updated|deleted` realtime behaviour
   is **byte-for-byte unchanged** (same payload shape `{ event, event_body:{characterId} }`
   delivered to clients for character events; character regression tests still pass).
2. **Other players' battle changes update my Room View and Battle View live.** Given
   another player changes the active battle, when I am viewing the Room View or the
   Battle View for that room, then a `battle_*` WS event causes `useRoomBattle`'s
   `['battle', roomId]` query to refetch and my UI reflects the latest battle state;
   the Room View `ActiveBattleBanner` (Story 5.2) stays accurate **with no change to
   5.2 code** (it re-renders from the same query cache).
3. **Realtime interruption reconciles without duplicate UI state.** Given realtime
   delivery is temporarily interrupted and then restored, when the WS (re)connects,
   then `useRoomBattle` re-runs its `GET /battles?roomId=X&status=active` query (via
   `invalidateQueries(['battle', roomId])` on WS `onOpen`, mirroring
   `useRoomCharacters`) and the UI reconciles to the **single** latest active battle
   for the room; because the battle query is the **only** state holder (no
   client-side battle list/array), no duplicate active-battle UI state can be
   created.
4. **The shared notification contract extension is additive and backward-compatible.**
   Given the event-type allowlists and `event_body` shape are extended for `battle_*`,
   when a `character_*` event flows through `room-notifications-service` and the
   frontend `RoomWebSocketClient`, then it is parsed, fanned out, validated and
   delivered exactly as before (no topic/channel rename, no removal/renaming of the
   `character_*` types, `event_body.characterId` still delivered for character events).

## Scope Boundaries (READ FIRST — prevents over-build and regressions)

**IN scope for 5.4:**

- **Backend `battle-service` (created by 5.1; PATCH added by 5.3):**
  - Real publisher in `src/publisher.ts`: add `SnsBattleEventPublisher` +
    `RedisBattleEventPublisher` + a `createBattleEventPayload(...)` helper, **mirroring
    `character-service/src/publisher.ts` exactly** (same class shapes, logging style,
    Redis connect-once). Keep the existing `NoopBattleEventPublisher` (5.1) as default.
  - Wire publisher selection from env in `src/index.ts` (Redis when
    `BATTLE_EVENTS_REDIS_URL` set, else Noop) and `src/lambda.ts` (SNS when
    `ROOM_CHARACTER_EVENTS_TOPIC_ARN` set, else Noop) — **mirror character-service
    `index.ts`/`lambda.ts` exactly**, including the bootstrap `console.info`.
  - Build & publish `battle_started` at 5.1's `POST /battles` seam and `battle_updated`
    at 5.3's `PATCH /battles/:id` seam, inside the existing `try/catch` that
    logs-but-never-throws (publish failure must never fail the HTTP request — same as
    character-service).
  - SAM (`template.yaml`): add `ROOM_CHARACTER_EVENTS_TOPIC_ARN: !Ref RoomCharacterEventsTopic`
    to `BattleServiceFunction.Environment`; add an `sns:Publish` policy on the
    **existing** `RoomCharacterEventsTopic` to `BattleServiceRole` (mirror
    `CharacterServiceRole`'s `PublishRoomCharacterEvents` policy). Do **not** create a
    new topic.
  - `docker-compose.local.yml`: add `BATTLE_EVENTS_REDIS_URL: redis://redis:6379` and
    `ROOM_CHARACTER_EVENTS_CHANNEL: room-character-events` to the `battle-service`
    block (5.1 creates that block + `depends_on: [mongo-battle, redis]`).
  - Backend tests: extend battle-service `publisher.test.ts` + `app.test.ts`
    (publish called with correct `battle_*` payload on POST/PATCH; publish throw is
    swallowed; non-active PATCH 409 path publishes nothing).
- **Backend `room-notifications-service` (MODIFIED — additive contract extension):**
  - `src/types.ts`: widen `CharacterNotificationEventType` → add `battle_started |
    battle_updated | battle_concluded | battle_discarded`; widen `event_body` so it
    carries battle identity **without breaking** `{ characterId }` for character
    events (see Dev Notes "Notification contract extension — exact shape").
  - `src/app.ts` `parseNotificationEvent`: add the four `battle_*` strings to
    `EVENT_TYPES`; generalize the `event_body` extraction so a `battle_*` event
    (which has no `characterId`) is **not dropped** — require `roomId` + a non-empty
    `event_body` identity field appropriate to the event family. Keep the
    `character_*` path identical (still requires `event_body.characterId`).
  - `src/service.ts` `sendEventToConnections` **and** `src/index.ts` local dispatch:
    forward `event_body` **as received** instead of hard-rebuilding
    `{ characterId: ... }`. (Both currently re-serialize a hardcoded
    `{ event, event_body:{characterId} }` — generalize to pass the parsed
    `event_body` through unchanged so battle identity survives the fan-out.) Update
    the `characterId`-specific log fields to be optional/identity-agnostic.
  - Tests: extend `app.test.ts`/`service.test.ts`/`index`-equivalent tests — a
    `battle_*` event with battle identity is parsed, room-matched and delivered;
    a `character_*` event is **still** parsed/delivered exactly as before
    (regression).
- **Frontend `frontend/api/webSocket.ts` (MODIFIED — additive typing + shared-client manager):**
  - Widen `CharacterEventType`/`CharacterNotificationEvent` (or add a sibling
    `BattleEventType`/union `RoomNotificationEvent`) to include the four `battle_*`
    types and a battle `event_body` shape, **without breaking** the existing
    `character_*` typing or `event_body.characterId` consumers.
  - `isValidNotificationEvent`: accept `battle_*` (validate battle identity) **and
    still** accept `character_*` exactly as today. A `character_*` event must keep
    flowing to existing `useRoomCharacters` listeners unchanged.
  - **Shared multiplexed socket (confirmed decision — see Dev Notes "Shared
    multiplexed WebSocket"):** add a module-level **refcounted shared-client
    registry** keyed by `${roomId}:${userId}` so `useRoomCharacters` and
    `useRoomBattle` share **one** `RoomWebSocketClient` (one WS connection per room
    per device, not two). Add **multi-listener open/close** support to
    `RoomWebSocketClient` (the single `options.onOpen`/`onClose` becomes
    add/remove-able listener sets, like the existing message `listeners` Set + its
    `subscribe()`), because each hook needs its **own** `onOpen` (character hook
    invalidates `['characters']`; battle hook invalidates `['battle']`). Do not
    change the wire protocol, heartbeat cadence, reconnect/backoff math, or the
    `connect()` URL — only connection ownership/lifecycle (refcount: connect on
    first acquirer, disconnect on last release) and listener fan-out.
  - `useRoomWebSocket.ts`: keep its public signature `(roomId, userId, enabled,
    options)` and result shape; internally acquire/release the shared client from
    the registry instead of `new RoomWebSocketClient(...)` per hook; widen the
    `subscribe` listener type to the union; register this hook's `options.onOpen`/
    `onClose` as listeners on the shared client (released on unmount). All existing
    `useRoomCharacters` behaviour (connect, reconnect, heartbeat, timeout,
    onOpen-invalidate) must be **preserved unchanged** from the caller's view.
- **Frontend `frontend/hooks/useRoomBattle.ts` (MODIFIED — created by 5.1, HTTP-only):**
  - Add a `userProfile`/`userId` parameter (mirror `useRoomCharacters(roomId,
    userProfile)`); update 5.1's existing `useRoomBattle(roomId)` call sites
    (Room View, Battle View) to pass it. Keep the return shape
    `{ battle, isLoading, errorMessage, refresh }` (extend only if a consumer needs
    `isConnected`; otherwise do not widen the contract).
  - Call `useRoomWebSocket(roomId, userProfile.id, Boolean(roomId &&
    userProfile.id), webSocketOptions)` — now backed by the **shared** client —
    with `webSocketOptions.onOpen` → `invalidateQueries({ queryKey: ['battle',
    roomId] })`; a `useEffect`-guarded `subscribe` that, on any `battle_*` event
    for the room, calls `invalidateQueries({ queryKey: ['battle', roomId] })`.
    Ignore `character_*` events here (5.5 owns character→battle reconciliation).
  - Tests: extend `frontend/hooks/useRoomBattle.test.ts` — mock the WS layer; a
    `battle_*` event invalidates `['battle', roomId]` (triggers refetch); `onOpen`
    re-syncs; `character_*` events do **not** affect the battle query.
- **Cross-surface verification** (backend typecheck/test/coverage; frontend strict
  typecheck/test/coverage ≥70%; manual two-client web smoke).

**OUT of scope (explicitly owned by other stories — do NOT build here):**

- ❌ **Conclude / Discard endpoints** (`POST /battles/:id/conclude`,
  `DELETE /battles/:id`) and their `useBattleActions` methods → **Stories 5.6 / 5.7**.
  5.4 does **not** add these endpoints. The `battle_concluded`/`battle_discarded`
  *publish calls* are added by 5.6/5.7 at their new endpoints, **reusing 5.4's
  now-real publisher**. 5.4 only makes the four `battle_*` types **valid/forwardable**
  end-to-end (allowlists + types + client handler) so 5.6/5.7 are a drop-in. Wiring
  publish calls for events whose endpoints don't exist yet would be dead code
  (project rule: no half-finished implementations).
- ❌ **Character→battle reconciliation** (a room character updated/deleted while a
  battle is active updating the battle's player side) → **Story 5.5**. 5.4 only
  forwards `battle_*`; it does not make `useRoomBattle` react to `character_*`.
- ❌ **`log-service`, log SNS topic, dual-topic fan-out, `Promise.allSettled`,
  `LOG_TOPIC_ARN`** → **Epic 6**. ADR-5: `battle_updated` is not logged anyway. Do
  not create a log topic/channel/model/env or a second publish target.
- ❌ **Renaming/replacing the notification transport.** Do NOT rename
  `RoomCharacterEventsTopic`, the `room-character-events` channel, the
  `ROOM_CHARACTER_EVENTS_*` env vars, or the `{ event, roomId, event_body, emittedAt,
  correlationId }` payload shape. The contract extension must be **purely additive**
  (project-context.md: "Do not change event names or event payload contracts for
  notifications without coordinated producer/consumer updates"; "Do not bypass
  established real-time flow contracts for room notifications").
- ❌ **Re-creating the 5.1/5.3 seam** (battle-service scaffold/model/POST/GET/PATCH,
  `useRoomBattle` HTTP query, `useBattleActions`, `(battle)` route,
  `ActiveBattleBanner`). Consume; do not redefine.
- ❌ **Touching Battle View / Room View / banner UI.** 5.4 is plumbing: publisher +
  fan-out + WS client + hook. The UI updates **automatically** because it already
  renders from `['battle', roomId]`. Do not add UI, do not change 5.2's banner, do
  not auto-navigate (ADR-10 warm-resume: realtime never force-navigates).
- ❌ **Optimistic-echo suppression** like `useRoomCharacters`'
  `recentLocalUpdateByCharacter` machinery. The battle query is a single-object
  refetch (not a per-item optimistic list); a redundant invalidation after a local
  Save is cheap and correct. Do not port the echo-suppression complexity.
- ❌ **`character-service` changes.** Its publisher/flow is the reference, not a
  target. (The architecture doc's "character-service publisher MODIFIED → dual
  channel" is Epic 6, not 5.4.)

## Tasks / Subtasks

- [x] **Task 1 — battle-service real publisher (Sns/Redis) + payload helper** (AC: 1)
  - [x] In `backend/battle-service/src/publisher.ts` (5.1 created it with the
    `BattleEventPublisher` interface + `NoopBattleEventPublisher`): add
    `SnsBattleEventPublisher` and `RedisBattleEventPublisher` and a
    `createBattleEventPayload(input)` factory, **structurally mirroring
    `backend/character-service/src/publisher.ts`** (same constructor args, same
    `console.info` log lines/keys, same Redis `ensureConnected` connect-once). Define
    `BattleEventType = 'battle_started' | 'battle_updated' | 'battle_concluded' |
    'battle_discarded'` and `BattleEventPayload = { event: BattleEventType; roomId:
    string; event_body: { battleId: string }; emittedAt: string; correlationId?:
    string }`. `createBattleEventPayload` sets `emittedAt: new Date().toISOString()`.
  - [x] Keep `NoopBattleEventPublisher` as the default in the app factory (5.1
    pattern). Do not change `src/app.ts`'s publisher option plumbing beyond passing
    the chosen publisher through (5.1 already wired the option + the no-op call sites).
  - [x] Extend `backend/battle-service/src/publisher.test.ts` (co-located): Sns and
    Redis publishers serialize the exact `battle_*` payload; Noop logs and resolves.

- [x] **Task 2 — Wire publisher selection from env (index.ts / lambda.ts)** (AC: 1)
  - [x] `backend/battle-service/src/index.ts`: select `RedisBattleEventPublisher`
    when `process.env.BATTLE_EVENTS_REDIS_URL` is set (channel from
    `process.env.ROOM_CHARACTER_EVENTS_CHANNEL || 'room-character-events'`), else
    `NoopBattleEventPublisher`. Mirror `character-service/src/index.ts` exactly
    (including the bootstrap `console.info` with `publisher.constructor.name`,
    `eventsChannel`, `redisConfigured`). Use a **battle-specific** redis-url env name
    `BATTLE_EVENTS_REDIS_URL` (do NOT reuse `CHARACTER_EVENTS_REDIS_URL` — service
    isolation, per 5.1's env-naming rule), but the **channel name is shared**
    (`room-character-events`) because it is the same transport.
  - [x] `backend/battle-service/src/lambda.ts`: select `SnsBattleEventPublisher`
    when `process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN` is set, else Noop. Mirror
    `character-service/src/lambda.ts` exactly. (Topic ARN env name is **shared** —
    same topic.)
  - [x] Extend co-located `index.test.ts`/`lambda.test.ts` if 5.1 created them
    (mirror character-service's; otherwise assert publisher selection via
    `service.ts`/`app.ts` tests — match whatever 5.1 established).

- [x] **Task 3 — Publish `battle_started` (POST) and `battle_updated` (PATCH)** (AC: 1, 2)
  - [x] In `backend/battle-service/src/app.ts`, at 5.1's `POST /battles` success
    path: replace the no-op publish with
    `await publisher.publish(createBattleEventPayload({ event: 'battle_started',
    roomId: battle.roomId, battleId: battle.id, correlationId }))` inside the
    **existing** `try/catch` that `console.error`s but never rethrows (mirror
    character-service POST). The HTTP `201` must succeed even if publish throws.
  - [x] At 5.3's `PATCH /battles/:id` success path (after the `200` battle is
    resolved, **only** when status was `active` and the update applied): publish
    `battle_updated` the same way. The `409` (not-active) and `404`/`400` paths must
    publish **nothing**.
  - [x] Do not add publish calls for `battle_concluded`/`battle_discarded` (no
    endpoints yet — 5.6/5.7). Do not change error codes (battle-service is `502`, per
    5.1 — not character-service's `500`).
  - [x] Extend `backend/battle-service/src/app.test.ts`: inject a mock publisher
    (mirror 5.1's mock-model injection); assert `publish` called once with the exact
    `battle_started` payload on `POST` success and `battle_updated` on `PATCH`
    success; assert a throwing publisher does **not** fail the request; assert no
    publish on `409`/`400`/`404`.

- [x] **Task 4 — Extend room-notifications-service for `battle_*` (additive)** (AC: 1, 4)
  - [x] `backend/room-notifications-service/src/types.ts`: add the four `battle_*`
    strings to the event-type union; change `event_body` to a shape that carries
    battle identity without breaking character delivery — see Dev Notes
    "Notification contract extension — exact shape" for the exact recommended type.
  - [x] `src/app.ts` `parseNotificationEvent`: add `battle_*` to `EVENT_TYPES`.
    Branch the `event_body` validation by event family: `character_*` → require
    non-empty `event_body.characterId` (UNCHANGED); `battle_*` → require non-empty
    `event_body.battleId`. Reject (return `null`) only when `roomId` or the
    family-appropriate identity is missing — never drop a valid character event.
  - [x] `src/service.ts` `sendEventToConnections` and `src/index.ts` local dispatch:
    forward the parsed `event_body` **unchanged** (`{ event, event_body }`) instead
    of rebuilding `{ characterId }`. Make the `characterId` log fields optional/
    identity-agnostic (e.g. log `event_body` or a derived id) so battle events don't
    log `undefined`.
  - [x] Extend `app.test.ts`/`service.test.ts` and the local-dispatch test: (a)
    `battle_started`/`battle_updated`/`battle_concluded`/`battle_discarded` with
    `{ battleId }` parse + room-match + deliver `{ event, event_body:{battleId} }`;
    (b) **regression**: a `character_updated` with `{ characterId }` still parses and
    delivers `{ event, event_body:{characterId} }` byte-identically; (c) wrong-room
    events are not delivered (unchanged).

- [x] **Task 5 — Frontend WS: additive typing + shared multiplexed client** (AC: 2, 4)
  - [x] `frontend/api/webSocket.ts`: add `BattleEventType` (the four `battle_*`) and
    a battle event shape; export a `RoomNotificationEvent` union (character |
    battle). Keep `CharacterNotificationEvent` exported and unchanged so
    `useRoomCharacters`/its tests compile untouched. `isValidNotificationEvent`:
    accept `character_*` (require `event_body.characterId`, UNCHANGED) **and**
    `battle_*` (require `event_body.battleId`). Listeners receive the union.
  - [x] `RoomWebSocketClient`: convert the single `options.onOpen`/`options.onClose`
    into **add/remove-able open/close listener sets** (model on the existing message
    `listeners: Set` + `subscribe()` → returns an unsubscribe). Preserve the
    constructor options surface for back-compat (an `options.onOpen`/`onClose`
    passed in still registers as one listener). Wire protocol, heartbeat,
    reconnect/backoff, and `connect()` URL are **unchanged**.
  - [x] **Shared-client registry:** add a module-level
    `Map<string /* `${roomId}:${userId}` */, { client: RoomWebSocketClient;
    refCount: number }>` plus `acquireRoomWebSocketClient(roomId, userId)` /
    `releaseRoomWebSocketClient(roomId, userId)`: first acquire creates + connects
    the client; each release decrements; refCount → 0 disconnects and removes the
    entry. Connection-key change (room/user) releases the old key and acquires the
    new (mirror the existing `connectionKeyRef` swap logic).
  - [x] `frontend/hooks/useRoomWebSocket.ts`: keep the public signature `(roomId,
    userId, enabled, options)` and `UseRoomWebSocketResult`. Internally
    acquire/release the **shared** client (not `new RoomWebSocketClient` per hook);
    register this hook's `options.onOpen`/`onClose` and its `subscribe` listeners
    on the shared client and clean them up on unmount; derive
    `isConnected/isConnecting/isTimedOut/error/reconnect` from the shared client's
    open/close listeners. Widen the `subscribe` listener + result types to the
    union. Existing `useRoomCharacters` consumption (switch over the three character
    cases) must still type-check and behave identically.
  - [x] Extend `frontend/api/webSocket.test.ts`: `isValidNotificationEvent` accepts
    each `battle_*` shape and **still** accepts each `character_*` shape; malformed
    battle event (missing `battleId`) rejected; open/close listener add/remove fan
    out to multiple listeners.
  - [x] Extend/add `frontend/hooks/useRoomWebSocket.test.ts`: **two hook instances
    for the same (roomId,userId) share one underlying client / one connection**;
    refCount connect-on-first / disconnect-on-last; each hook's own `onOpen` fires
    on (re)connect; room/user change swaps keys; **regression** — existing single-
    consumer behaviour (connect/reconnect/timeout/onOpen) unchanged.

- [x] **Task 6 — Add battle WS subscription to `useRoomBattle`** (AC: 2, 3)
  - [x] `frontend/hooks/useRoomBattle.ts` (5.1 created HTTP-only): add a
    `userProfile`/`userId` parameter (mirror `useRoomCharacters(roomId,
    userProfile)`); update 5.1's existing `useRoomBattle(roomId)` call sites
    (Room View `[roomNumber]/index.tsx`, Battle View `(battle)/index.tsx`, and 5.2's
    Room View call) to pass the profile from `useUserProfile()` — these screens
    already obtain it for `useRoomCharacters`.
  - [x] Mirror `useRoomCharacters`: `const battleQueryKey = ['battle', roomId]`;
    `webSocketOptions = useMemo(() => ({ onOpen: () =>
    queryClient.invalidateQueries({ queryKey: battleQueryKey }) }), [...])`;
    `useRoomWebSocket(roomId, userProfile.id, Boolean(roomId && userProfile.id),
    webSocketOptions)` — this now resolves to the **shared** client (same socket as
    `useRoomCharacters` when both are mounted). A `useEffect` guarded by
    `isConnected` that `subscribe`s and, on any `event.event` starting with
    `battle_` for this room, calls `queryClient.invalidateQueries({ queryKey:
    battleQueryKey })`. Ignore `character_*` events here (5.5 owns
    character→battle reconciliation).
  - [x] Keep the return shape `{ battle, isLoading, errorMessage, refresh }`. Do not
    add optimistic-echo suppression (Scope Boundaries).
  - [x] Extend `frontend/hooks/useRoomBattle.test.ts`: wrap in
    `QueryClientProvider`; mock `@/hooks/useRoomWebSocket` (hoisted mutable
    `subscribe`/`isConnected`, mirror `useCharacters.test`); a delivered `battle_*`
    event invalidates `['battle', roomId]` (assert refetch / `getActiveBattle`
    re-called); `onOpen` invalidates; a `character_*` event does **not** trigger a
    battle refetch.

- [x] **Task 7 — Cross-surface verification** (AC: 1, 2, 3, 4)
  - [x] Backend: from `backend/`, `npm run typecheck` and `npm test`/`test:coverage`
    pass with battle-service publisher + room-notifications changes;
    **character-service and room-notifications-service existing tests still green**
    (regression gate for AC1/AC4).
  - [x] Frontend: from `frontend/`, strict typecheck + `vitest run --coverage`
    (≥70% line floor; coverage `include` = `api/**`,`config/**`,`hooks/**` — do not
    widen). Existing `useCharacters`/`webSocket`/`useRoomWebSocket` tests still green
    (shared-client refactor regression gate for AC1/AC4).
  - [x] **Single-connection check:** with both Room View hooks mounted
    (`useRoomCharacters` + `useRoomBattle`, same room/user), assert exactly **one**
    `RoomWebSocketClient`/one `connect()` for that key (unit test on the registry,
    and in the manual smoke confirm one `/ws` connection in browser devtools).
  - [x] Local manual smoke (`docker-compose up`, after 5.1+5.3 merged): two browser
    tabs (web), same room, two device identities. Tab A starts a battle → Tab B's
    Room View banner (5.2) appears **without reload**; Tab A opens Battle View and
    adds a monster + Save (PATCH) → Tab B's open Battle View reflects it within the
    refetch; kill Tab B's WS (devtools offline → online) → on reconnect **both** the
    banner/Battle View **and** character cards reconcile (one socket, both hooks'
    onOpen fired), no duplicate banner. Confirm a plain character edit still flashes
    the card in the other tab (character realtime regression over the shared
    socket). Verify web at minimum; note any platform (iOS/Android) not verified.

### Review Findings

- [x] [Review][Patch] Battle View renders stale local draft after realtime refetch [frontend/app/munchkin/[roomNumber]/(battle)/index.tsx:66]
- [x] [Review][Patch] Shared WebSocket hook drops reconnect and heartbeat timing options [frontend/hooks/useRoomWebSocket.ts:105]
- [x] [Review][Patch] Notification parser can throw on malformed battle identity payloads [backend/room-notifications-service/src/app.ts:122]
- [x] [Review][Patch] Shared WebSocket listener fan-out is not isolated from listener exceptions [frontend/api/webSocket.ts:95]

## Dev Notes

### Authoritative realtime contract (verified from code — supersedes the architecture doc)

**Publisher → transport (battle-service must emit this, mirroring
`character-service/src/publisher.ts`):**

```typescript
// SNS Message / Redis publish payload (battle-service)
{
  event: 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded',
  roomId: string,
  event_body: { battleId: string },
  emittedAt: string,            // new Date().toISOString()
  correlationId?: string
}
// (character-service's is identical-shaped with event_body:{characterId} — unchanged)
```

- **One transport.** Cloud: SNS topic `RoomCharacterEventsTopic` (SAM logical id),
  env `ROOM_CHARACTER_EVENTS_TOPIC_ARN`. Local: Redis channel `room-character-events`,
  env `ROOM_CHARACTER_EVENTS_CHANNEL`; battle publisher Redis URL env
  `BATTLE_EVENTS_REDIS_URL` (battle-specific name; channel shared). No second
  topic/channel. No `Promise.allSettled` (single publish).
- **Publisher selection** (mirror character-service): `index.ts` → Redis-or-Noop by
  `BATTLE_EVENTS_REDIS_URL`; `lambda.ts` → Sns-or-Noop by
  `ROOM_CHARACTER_EVENTS_TOPIC_ARN`. Default = `NoopBattleEventPublisher` (5.1).
- **Publish call sites**: after a successful mutation, inside `try/catch` that
  `console.error`s but never rethrows (publish must never fail the HTTP response —
  `character-service/src/app.ts` POST/PATCH/DELETE is the exact template). 5.4 wires
  `battle_started` (5.1 `POST` seam) and `battle_updated` (5.3 `PATCH` seam) only.

[Source: backend/character-service/src/{publisher.ts,index.ts,lambda.ts,app.ts};
backend/sam/template.yaml (RoomCharacterEventsTopic, CharacterServiceRole
PublishRoomCharacterEvents, CharacterServiceFunction env);
backend/docker-compose.local.yml (character-service/room-notifications-service env)]

### room-notifications-service fan-out — current behaviour & required change

The fan-out currently **drops everything except `event` + `event_body.characterId`**
and **rejects any event type not in a 3-item character allowlist**:

- `src/app.ts` `parseNotificationEvent`: `EVENT_TYPES = Set(['character_created',
  'character_updated','character_deleted'])`; reads `event_body.characterId`; returns
  `null` (event dropped) if type not in set or `characterId` missing.
- `src/index.ts` (local Redis sub on `ROOM_CHARACTER_EVENTS_CHANNEL`): re-serializes
  `{ event, event_body }` to room sockets matching `roomId`; logs
  `parsedEvent.event_body.characterId`.
- `src/lambda.ts` `handleSnsEvent`: `parseNotificationEvent` → `listRoomConnections`
  → `sendEventToConnections`.
- `src/service.ts` `sendEventToConnections`: payload is **hardcoded**
  `JSON.stringify({ event: event.event, event_body: { characterId:
  event.event_body.characterId } })` — this is the line that would silently strip
  `battleId`.

**Required (additive only):** add `battle_*` to `EVENT_TYPES`; branch identity
validation by family; forward `event_body` **as parsed** in `service.ts` and
`index.ts`; keep the `character_*` path byte-identical.

[Source: backend/room-notifications-service/src/{app.ts,index.ts,lambda.ts,service.ts,types.ts}]

### Notification contract extension — exact shape (recommended; confirm Q1/Q4)

Recommended `event_body` typing that is additive and keeps character delivery
identical (apply consistently in `room-notifications-service/src/types.ts` and
`frontend/api/webSocket.ts`):

```typescript
type NotificationEventType =
  | 'character_created' | 'character_updated' | 'character_deleted'
  | 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded';

// character events keep { characterId }; battle events use { battleId }
type CharacterEventBody = { characterId: string };
type BattleEventBody    = { battleId: string };

interface RoomNotificationEvent {
  event: NotificationEventType;
  roomId: string;                 // backend types only; frontend client never sees roomId
  event_body: CharacterEventBody | BattleEventBody;
  emittedAt: string;
  correlationId?: string;
}
```

Frontend note: clients receive only `{ event, event_body }` (the fan-out never sends
`roomId`/`emittedAt` to sockets — verified in `service.ts`/`index.ts`). Keep
`CharacterNotificationEvent` exported unchanged for `useRoomCharacters`; add the
battle members as a union superset so existing switch-on-`event.event` code still
type-checks.

### Shared multiplexed WebSocket (confirmed decision — design & risk)

**Decision (confirmed by Ivan, 2026-05-17):** `useRoomCharacters` and
`useRoomBattle` must share **one** WS connection per `(roomId, userId)` — not open a
second independent socket. This is a deliberate, **higher-risk** choice because it
refactors `RoomWebSocketClient`/`useRoomWebSocket`, which the **working character
realtime flow depends on**. Treat "character realtime is byte-for-byte unchanged"
(AC1/AC4) as the gating regression bar; if a clean shared design can't preserve it,
**stop and report** rather than ship a regression.

Current state (verified): `useRoomWebSocket` does `new RoomWebSocketClient(...)`
**per hook instance** (`clientRef`), with a single `options.onOpen`/`onClose` and a
message `listeners: Set` exposed via `subscribe()`. So two hooks = two sockets today.

Target design (minimal, additive):

1. **Multi-listener open/close.** `RoomWebSocketClient` keeps message `listeners`
   as-is; add `openListeners`/`closeListeners` Sets with add/remove (or a unified
   `on('open'|'close', fn) → off`). A constructor `options.onOpen`/`onClose`, if
   passed, registers as one listener (back-compat). The client fires **all** open
   listeners on (re)connect — this is what lets the character hook invalidate
   `['characters']` and the battle hook invalidate `['battle']` off the **same**
   socket.
2. **Refcounted registry.** Module-level
   `Map<`${roomId}:${userId}`, { client; refCount }>`. `useRoomWebSocket` acquires
   on mount/active and releases on unmount/disable; first acquirer constructs +
   `connect()`s; last release `disconnect()`s and deletes the entry. Reuse the
   existing `connectionKeyRef` swap semantics for room/user changes.
3. **Per-hook state derivation.** Each `useRoomWebSocket` instance still returns its
   own `{ isConnected, isConnecting, isTimedOut, error, reconnect, subscribe }`,
   driven by listeners on the shared client (open → set connected; close → start the
   8 s reconnect timeout, unchanged). `reconnect()` operates on the shared client
   (a reconnect requested by either hook reconnects the one socket — correct).
4. **Untouched:** `connect()` URL building, heartbeat interval/ping, reconnect
   backoff math, intentional-close semantics, the `/ws?roomId=&userId=` contract.
   Only **ownership/lifecycle + listener fan-out** change.

Regression gate: the existing `useRoomWebSocket.test.ts`, `webSocket.test.ts`, and
`useCharacters.test.ts` must pass **unmodified in intent** (you may add cases, but a
single-consumer caller must observe identical connect/reconnect/timeout/onOpen
behaviour). New tests must prove: two hooks on the same key ⇒ one client/one
`connect()`; refcount disconnect on last release; both hooks' `onOpen` fire on
reconnect; a character event still reaches the character subscriber and a battle
event the battle subscriber over the single socket.

### Why the reconciliation AC needs almost no code (AC3)

`useRoomBattle` (5.1) is a single TanStack `useQuery` on `['battle', roomId]`
returning one `Battle | null` from `GET /battles?roomId=X&status=active`. There is
**no client-side battle list/array** — the server query is the sole source of truth.
So "no duplicate active battle UI state" is structurally guaranteed: a `battle_*`
event just invalidates the query → one refetch → one current battle (or `null`).
WS-interrupt recovery = `onOpen → invalidateQueries(['battle', roomId])`, the exact
mechanism `useRoomCharacters` uses for characters (`webSocketOptions.onOpen`). The
backend's partial unique index (`status:'active'` per room, 5.1 Task 2) guarantees
at most one active battle, so the refetch can never yield two.

### Existing patterns to mirror (do not reinvent)

- **Publisher (Sns/Redis/Noop + payload factory):**
  `backend/character-service/src/publisher.ts` — copy class/log/connect-once shapes;
  swap `character`→`battle`, `characterId`→`battleId`.
- **Env-driven publisher selection + bootstrap log:**
  `character-service/src/index.ts` (Redis|Noop) and `src/lambda.ts` (Sns|Noop).
- **Publish call site (try/catch swallow):** `character-service/src/app.ts`
  POST/PATCH/DELETE `try { await publisher.publish(create*EventPayload({...})) }
  catch (e) { console.error(...) }`.
- **Backend app test w/ injected publisher + mock model:** 5.1's `app.test.ts`
  harness (supertest, `createApp(model, { publisher })`).
- **Frontend WS-driven query invalidation hook:** `frontend/hooks/useCharacters.ts`
  `useRoomCharacters` — `webSocketOptions.onOpen` invalidate, `useRoomWebSocket(...)`,
  `useEffect`+`subscribe`+switch→`invalidateQueries`. `useRoomBattle`'s WS extension
  is the battle-shaped twin of this (minus optimistic-echo machinery).
- **SAM IAM publish policy:** `CharacterServiceRole.Policies.PublishRoomCharacterEvents`
  → clone onto `BattleServiceRole`; SAM env: `CharacterServiceFunction.Environment.
  ROOM_CHARACTER_EVENTS_TOPIC_ARN` → add to `BattleServiceFunction`.
- **Local env wiring:** `docker-compose.local.yml` character-service block
  (`CHARACTER_EVENTS_REDIS_URL`, `ROOM_CHARACTER_EVENTS_CHANNEL`) → battle-service
  equivalent with `BATTLE_EVENTS_REDIS_URL` + shared channel name.

### Project Structure Notes

- Backend services are isolated bounded contexts. `battle-service` **publishes** to
  the shared notification topic/channel; it does **not** read it. Only
  `room-notifications-service` consumes. No synchronous inter-service HTTP. Backend
  TS non-strict (`NodeNext`, `strict:false`); frontend TS strict — do not normalize.
- Endpoints/publishers stay inline per repo convention (no `routes/`/`subscriber.ts`
  despite the architecture diagram). Single root `backend/vitest.config.ts` — 5.1
  already added `battle-service/src/**` to include/coverage; 5.4 adds no new service.
- Frontend layered boundaries unchanged: `api/webSocket.ts` transport, `hooks/`
  orchestration (`useRoomBattle`, `useRoomWebSocket`), screens unchanged. The
  battle/Room View UI updates purely via `['battle', roomId]` cache — no UI edits.
- Event-type strings are `snake_case` (`battle_started`). Env vars
  `ALL_CAPS_SNAKE_CASE`. Test casing mirrors source; backend tests co-located;
  frontend hook/api tests co-located, route tests under `frontend/__tests__`.
- Definition of done: backend + frontend each pass typecheck/test/coverage (70%
  hard gate); **character realtime regression tests green** is a release gate for
  AC1/AC4. Update `backend/README.md` if a battle-service env var is documented
  there (add `BATTLE_EVENTS_REDIS_URL` line if README lists service env).

### Previous-story intelligence (5.1 foundational, 5.3 PATCH seam; 5.2 parallel)

- **5.1** builds `battle-service` (502 error shape, not 500), the
  `NoopBattleEventPublisher` seam + `publisher.publish(...)` call site after `POST`,
  `useRoomBattle` (HTTP-on-mount, key `['battle', roomId]`, return `{ battle,
  isLoading, errorMessage, refresh }`), the `(battle)` modal route, and the Room View
  Battle button. 5.4 must consume these verbatim; if 5.1's `publisher.ts` interface
  name or call-site differs slightly from this story's assumption, **follow 5.1's
  actual code** (it is the seam) and keep the additive contract intent.
- **5.3** adds `PATCH /battles/:id` (full-replace, `409` if not active) and the
  no-op publish call site after a successful PATCH. 5.4 supplies `battle_updated`
  there. The `409`/`400`/`404` paths must remain publish-free.
- **5.2** renders `ActiveBattleBanner` from `useRoomBattle().battle`. It deliberately
  has **no realtime** — 5.4 is what makes 5.2 live. **Do not edit 5.2's component or
  its Room View wiring**; adding the `userProfile` arg to `useRoomBattle` means
  updating 5.2's `useRoomBattle(roomId)` call to `useRoomBattle(roomId, userProfile)`
  (the screen already has `userProfile` for `useRoomCharacters`) — that one-line
  call-site update is the only 5.2-area touch allowed, and only if 5.2 is merged.
- Team convention (git history `#54/#57/#60` etc.): **one focused PR per story, every
  touched surface's quality gate green**. 5.4 touches battle-service +
  room-notifications-service + frontend webSocket/hook — keep it one PR; the
  regression bar is "character realtime unchanged".

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-battle-management.md#story-54-realtime-battle-updates-from-battle-actions] (AC; no Covers/Depends footer in epic — realtime contract derived from 5.1/5.3 deferrals + FR20–28)
- [Source: _bmad-output/implementation-artifacts/5-1-start-a-battle.md] (publisher seam Task 7, `useRoomBattle` Task 9, 502 shape, no-op publish call site, env-naming rule)
- [Source: _bmad-output/implementation-artifacts/5-3-manage-battle-state.md] (PATCH seam Task 2, no-op publish post-PATCH, status-guard 409, "realtime is 5.4" boundary)
- [Source: _bmad-output/implementation-artifacts/5-2-show-active-battle-in-room-view.md] (banner consumes `useRoomBattle`; "no realtime in 5.2 — 5.4 makes it live"; do-not-touch banner)
- [Source: backend/character-service/src/publisher.ts] (Sns/Redis/Noop classes + `createCharacterEventPayload` — exact mirror target)
- [Source: backend/character-service/src/{index.ts,lambda.ts,app.ts,service.ts}] (env-driven publisher selection; try/catch publish call sites)
- [Source: backend/room-notifications-service/src/{app.ts,index.ts,lambda.ts,service.ts,types.ts}] (fan-out parse/forward — the additive extension target; the `characterId` hardcode to generalize)
- [Source: frontend/api/webSocket.ts] (`RoomWebSocketClient`, `isValidNotificationEvent`, `CharacterNotificationEvent` — additive widening target)
- [Source: frontend/hooks/useRoomWebSocket.ts] (single-client-per-hook WS; do not change connect/reconnect)
- [Source: frontend/hooks/useCharacters.ts] (`useRoomCharacters` — the WS-invalidate pattern `useRoomBattle` must mirror; `onOpen` re-sync)
- [Source: backend/sam/template.yaml] (RoomCharacterEventsTopic, CharacterServiceRole publish policy, *ServiceFunction env — additive targets for BattleServiceRole/Function)
- [Source: backend/docker-compose.local.yml] (character-service/room-notifications env — local battle wiring template)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md] (ADR-5 battle_updated not logged, ADR-6/10/15 — **note: the doc's dual-topic/payload model is idealized and superseded by actual repo; see conflict table above**)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md] (snake_case events, `roomId` mandatory, `{message}` errors, query-key convention — **the dual-topic `Promise.allSettled` publisher pattern does NOT exist in repo; do not implement it**)
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md] (idealized structure — superseded by 5.1/5.3 actual-repo rule)
- [Source: _bmad-output/project-context.md] ("Do not change event names/payload contracts without coordinated producer/consumer updates"; "Do not bypass established real-time flow contracts"; minimal-edits; 70% coverage floor; no incidental deps)

### Resolved decisions (all confirmed by Ivan, 2026-05-17)

1. **Single shared transport, additive extension.** Battle events use the **same**
   `RoomCharacterEventsTopic` SNS / `room-character-events` Redis channel and the
   same `{ event, roomId, event_body, emittedAt, correlationId }` payload shape as
   character events. The architecture doc's dual-topic/`LOG_TOPIC_ARN`/
   `Promise.allSettled`/`eventType-actorId-occurredAt` model is **not** built (Epic 6
   territory; no log-service exists). ✅ Confirmed.
2. **`event_body` = `{ battleId }` for battle events**, parallel to character's
   `{ characterId }`; fan-out (`room-notifications-service` `service.ts`/`index.ts`)
   forwards `event_body` **as-parsed** (stop hardcoding `characterId`).
   Backward-compatible for character delivery. ✅ Confirmed.
3. **Event scope split:** 5.4 publishes `battle_started`+`battle_updated` (the only
   endpoints existing after 5.1+5.3) but makes **all four** `battle_*` types
   valid/forwardable end-to-end so 5.6/5.7 just add their publish call to the
   already-real publisher. No dead conclude/discard publish in 5.4. ✅ Confirmed.
4. **Shared/multiplexed WebSocket.** `useRoomCharacters` and `useRoomBattle` share
   **one** `RoomWebSocketClient`/one WS connection per `(roomId, userId)` via a
   refcounted module registry + multi-listener open/close on the client (NOT a
   second independent socket). ✅ Confirmed — **higher-risk refactor of the shared
   WS layer; "character realtime byte-for-byte unchanged" is the gating regression
   bar.** See "Shared multiplexed WebSocket".
5. **HARD PREREQUISITE:** 5.1 + 5.3 merged (5.2 parallel). Blocked-dependency HALT if
   picked up earlier. ✅ Confirmed.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Task 1: Added `SnsBattleEventPublisher`, `RedisBattleEventPublisher`, `createBattleEventPayload` to `publisher.ts`, mirroring character-service. Tests cover Sns/Redis/Noop payloads and connect-once.
- Task 2: Wired Redis publisher in `index.ts` (env `BATTLE_EVENTS_REDIS_URL`) and SNS publisher in `lambda.ts` (env `ROOM_CHARACTER_EVENTS_TOPIC_ARN`). Lambda test TypeScript fix: cast `mock.calls as unknown as Array<[...]>`.
- Task 3: `app.ts` POST publishes `battle_started`, PATCH publishes `battle_updated` inside swallow-catch. App tests assert exact payloads, throw-swallow, and no publish on 409.
- Task 4: `room-notifications-service/src/types.ts` widened to include all four `battle_*` types. `app.ts` branches validation by event family (character→requires `characterId`, battle→requires `battleId`). `service.ts`/`index.ts`/`lambda.ts` forward `event_body` as-parsed. All character regression tests green.
- Task 5: `frontend/api/webSocket.ts` added `BattleEventType`, `BattleNotificationEvent`, widened `RoomNotificationEvent` union. `RoomWebSocketClient` gained `addOpenListener`/`addCloseListener` Sets (back-compat constructor options). Registry: `acquireRoomWebSocketClient` returns `{ client, isFirstAcquirer }`, `releaseRoomWebSocketClient` disconnects on last release. `useRoomWebSocket.ts` rewired to use registry: first acquirer calls `connect()`, subsequent acquirers sync from `isConnected()`. Test rewritten with registry-based mock; 20 tests including shared-client and refcount tests.
- Task 6: `useRoomBattle.ts` gained optional `userProfile?: UserProfileInterface` param, `useRoomWebSocket` call with `onOpen→invalidate`, `useEffect` subscribing to `battle_*` events for invalidation. Call sites in `(battle)/index.tsx` and `index.tsx` updated to pass `userProfile`. 8 new tests covering WS integration.
- Task 7: Backend typecheck/114 tests pass. Frontend strict typecheck passes. 145 frontend tests pass with 83.49% coverage (≥70% gate). Character regression tests green across both surfaces.

### File List

- `backend/battle-service/src/publisher.ts`
- `backend/battle-service/src/publisher.test.ts`
- `backend/battle-service/src/index.ts`
- `backend/battle-service/src/lambda.ts`
- `backend/battle-service/src/lambda.test.ts`
- `backend/battle-service/src/app.ts`
- `backend/battle-service/src/app.test.ts`
- `backend/sam/template.yaml`
- `backend/docker-compose.local.yml`
- `backend/room-notifications-service/src/types.ts`
- `backend/room-notifications-service/src/app.ts`
- `backend/room-notifications-service/src/app.test.ts`
- `backend/room-notifications-service/src/service.ts`
- `backend/room-notifications-service/src/service.test.ts`
- `backend/room-notifications-service/src/lambda.ts`
- `backend/room-notifications-service/src/index.ts`
- `frontend/api/webSocket.ts`
- `frontend/api/webSocket.test.ts`
- `frontend/hooks/useRoomWebSocket.ts`
- `frontend/hooks/useRoomWebSocket.test.ts`
- `frontend/hooks/useRoomBattle.ts`
- `frontend/hooks/useRoomBattle.test.ts`
- `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx`
- `frontend/app/munchkin/[roomNumber]/index.tsx`

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-19 | 1.0 | Implemented story: real Sns/Redis publishers in battle-service, battle_* extension in room-notifications-service, shared multiplexed WebSocket client, useRoomBattle WS subscription | claude-sonnet-4-6 |
