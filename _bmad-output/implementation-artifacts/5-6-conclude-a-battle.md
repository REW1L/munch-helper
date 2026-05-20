# Story 5.6: Conclude a Battle

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to conclude an active battle with an explicit result,
so that the room can leave battle state and preserve the outcome.

This is the **sixth story of Epic 5 (Battle Management)** and the **terminal-success
half of the battle lifecycle**. It introduces the dedicated
`POST /battles/:id/conclude` endpoint (architecture ADR-2: a separate endpoint, not
PATCH, with a **required** `result`), the `conclude` method on
`useBattleActions`, and the Conclude UI inside the existing 5.3 Battle View. It
**does not** add Discard (Story 5.7), does not change the battle schema, does not
touch the realtime transport (5.4 already made `battle_concluded` valid
end-to-end), and does not log anything (Epic 6).

## ⛔ HARD PREREQUISITE — Stories 5.1, 5.3, 5.4 must be implemented & merged first

5.1, 5.3, and 5.4 are `ready-for-dev` (documented) but **NOT yet implemented in
code** (verified on this branch — `backend/battle-service/`, `frontend/api/battles.ts`,
`frontend/hooks/useRoomBattle.ts`, `frontend/hooks/useBattleActions.ts`, the
`frontend/app/munchkin/[roomNumber]/(battle)/` route, and any
`frontend/components/munchkin/ActiveBattleBanner.tsx` / `BattleSide*` files **do
not exist**). 5.6 directly extends seams those stories build:

- **5.1** — `backend/battle-service` scaffold, the `Battle` model (`status:
  'active'|'concluded'|'discarded'`, `result: 'players_win'|'monster_wins'|null`,
  `concludedAt: Date|null`, partial-unique-on-`active` index, `502` error shape, the
  `toJSON` `id`-alias transform), the publisher seam (`publisher.ts` interface +
  `NoopBattleEventPublisher` + `try/catch` call sites), `frontend/api/battles.ts`
  (`Battle`, `BattleStatus`, `BattleResult`, `apiRequest`), `useRoomBattle(roomId,
  userProfile)` (key `['battle', roomId]`, returns `{ battle, isLoading,
  errorMessage, refresh }`), `useBattleActions(roomId)` (currently `{ start,
  isLoading, errorMessage }`), the `(battle)` modal route shell.
- **5.3** — `PATCH /battles/:id` (full-replace, status-guarded → 409 when
  non-`active`), `useBattleActions.patch`, the **real two-sided Battle View** with
  the local draft + dirty/Clean/Saving Save model, the player/monster side
  components under `frontend/components/munchkin/`, and the non-authoritative
  outcome comparison label ("Players ahead" / "Monsters ahead" / "Even"). 5.6
  reuses 5.3's draft/Save model unchanged and adds the Conclude action **outside**
  the draft mutation surface.
- **5.4** — the **real** `Sns/Redis BattleEventPublisher` + payload helper, env
  selection in `index.ts`/`lambda.ts`, SAM `BattleServiceRole` `sns:Publish` policy
  on `RoomCharacterEventsTopic`, and the additive `room-notifications-service` /
  frontend `webSocket.ts` allowlists that already accept **all four** `battle_*`
  types (5.4 explicitly made `battle_concluded` and `battle_discarded` valid /
  forwardable end-to-end so 5.6/5.7 are a drop-in publish call). 5.4 also adds the
  WS subscription to `useRoomBattle` so a `battle_*` event invalidates `['battle',
  roomId]` and the active-battle query refetches — the mechanism that makes the
  Room View `ActiveBattleBanner` (5.2) **automatically disappear** for other
  clients on conclude with **zero UI code** in 5.6.

Stories **3.1**/**3.2** (epic "Depends on") are **done**. **Story 5.5** is
parallel/independent (frontend-only Battle View reconciliation); it does not block
5.6 and 5.6 must not touch its tombstone-row code. **Story 5.2** (banner) is
unrelated — 5.6 must not edit it. If a dev agent picks this up before 5.1 + 5.3 +
5.4 are merged, **HALT and report the blocked dependency** — do not re-create the
battle-service / publisher / hook / Battle View / shared-socket / event-allowlist
seams (duplicate-work + divergence anti-pattern; the 5.4 "character realtime
byte-for-byte unchanged" regression bar still applies whenever the WS layer is in
play).

## ⚠️ Architecture-doc-vs-repo conflict — fully contained for 5.6

The architecture documents describe an idealized event/topic and structural model
that does **not** match the running repo (single shared SNS topic
`RoomCharacterEventsTopic` + Redis channel `room-character-events`; payload shape
`{ event, roomId, event_body, emittedAt, correlationId? }`; endpoints inline in
`src/app.ts` (no `routes/` folder); single root `backend/vitest.config.ts`;
battle-service errors are `502 { message }` not `500 { message, details }`; no
`log-service` exists). 5.1 + 5.3 + 5.4 already locked the rule: **follow the
actual repo + 5.1/5.3/5.4 conventions; follow the architecture only for net-new
battle-conclude decisions** (the conclude HTTP contract, the response code, the
result enum, the status guard). For 5.6 this conflict is contained — 5.6 does NOT
modify event names, payload contracts, transports, the publisher class shapes, the
event allowlists, or `room-notifications-service`/`webSocket.ts`. Re-read 5.4's
"the architecture doc's realtime model does NOT match the running repo" table if
in doubt.

## Acceptance Criteria

1. **Concluding an active battle requires an explicit result and persists the
   outcome.** Given an active battle exists (`status: 'active'`), when I conclude
   it from the Battle View and choose a result, then the server validates `result
   ∈ { 'players_win', 'monster_wins' }` (any missing/other value → `400`), updates
   the battle to `status: 'concluded'`, `result: <chosen>`, `concludedAt:
   <serverNow>` (and `updatedAt` via Mongoose `timestamps`), and responds `200`
   with the updated battle JSON; **the battle's `name`, `playerSide`, and
   `monsterSide` are unchanged by the conclude operation** (Conclude does **not**
   double as a Save — see Resolved decisions #2).
2. **Only active battles can be concluded.** Given a battle whose `status` is
   already `concluded` or `discarded`, when a conclude is attempted, then the
   server responds `409` with `{ message: 'Battle is not active' }` (ADR-8 status
   guard) and the persisted state is unchanged; the same `409` shape is also
   returned for a concurrent double-conclude race (last writer loses). A missing
   battle → `404`; a malformed `:id` (`CastError`) → `404`.
3. **The room leaves battle state on the local client.** Given a battle has been
   concluded successfully via 5.6's flow, when the conclude mutation resolves on
   my client, then `['battle', roomId]` is invalidated (refetch returns `null`
   because `GET /battles?roomId=X&status=active` no longer matches), the
   `ActiveBattleBanner` (Story 5.2) is no longer rendered on my Room View, the
   Room View's Battle button reverts to its "no active battle" affordance, and the
   Battle View modal dismisses back to the Room View (no auto-navigation
   *forward* — only the dismiss of the modal the user is already in, per
   ADR-10/ADR-4).
4. **Other connected players' clients reflect the conclusion in real time.** Given
   another player is connected to the same room when the battle is concluded,
   when the `battle_concluded` event is published by `battle-service` and fanned
   out by `room-notifications-service` (the **already-real, already-allowlisted**
   transport from Story 5.4), then their client's `useRoomBattle` WS handler
   invalidates `['battle', roomId]`, the active-battle query refetches `null`,
   their Room View `ActiveBattleBanner` disappears with **zero new UI code in 5.6
   or 5.2**, and any open Battle View on their device reflects the new
   `concluded`/`result` state on the next refetch (the 5.3 draft is re-initialised
   from the refetched `battle`); no auto-navigation occurs (ADR-10) — they remain
   on whatever screen they were on.

## Scope Boundaries (READ FIRST — prevents over-build and regressions)

**IN scope for 5.6:**

- **Backend (`battle-service`, created by 5.1; PATCH added by 5.3; real publisher
  added by 5.4):**
  - `POST /battles/:id/conclude` route (in `src/app.ts`, **inline** — repo
    convention; **no `routes/` folder** even though the architecture diagram shows
    one). Validation (`400`), not-found (`404`, incl. `CastError`), status guard
    (`409` when not `active`), success `200`, unexpected `502 { message:
    'Unexpected error' }` (battle-service convention from 5.1).
  - Add a `findByIdAndConclude(id, result)` helper to the `BattleModelLike`
    wrapper in `src/service.ts` (or compose the existing `findById` +
    `findByIdAndUpdate` 5.3 added). The chosen pattern must guarantee the status
    transition is **atomic** (no read-then-write race that could let two clients
    both succeed) — see Tasks 1–2.
  - Call **5.4's real** `publisher.publish(createBattleEventPayload({ event:
    'battle_concluded', roomId, battleId, correlationId }))` after a successful
    transition, inside the **existing** `try/catch` that
    `console.error`s-but-never-rethrows (publish failure must never fail the HTTP
    response). The `400`/`404`/`409` paths publish **nothing**.
  - Backend tests (co-located `app.test.ts`/`service.test.ts`, `supertest`, mock
    publisher + mock model injected per the 5.1 pattern) + `sam/events/
    battle-post-conclude.json`.
  - SAM (`template.yaml`): add a `BattleConcludePost` HttpApi event for `POST
    /battles/{id}/conclude` to `BattleServiceFunction.Events` (mirror the existing
    PATCH/POST event shape 5.1/5.3 add). **No** new IAM, **no** new topic, **no**
    new env var — 5.4 already added the `sns:Publish` policy + the topic ARN env.
  - `nginx.conf`: confirm the `/battles` location block already proxies the
    sub-resource `POST /battles/:id/conclude` (it mirrors `/characters` whose
    `Access-Control-Allow-Methods` includes `POST`). No change expected.
- **Frontend:**
  - `api/battles.ts`: add `concludeBattle(battleId: string, result: BattleResult):
    Promise<Battle>` and the exported `BattleResult` type if 5.1 didn't already
    export it (the type is `'players_win' | 'monster_wins'`). Surface the `409`
    distinctly via `ApiError` so callers can recover (e.g. another player
    concluded first).
  - `hooks/useBattleActions.ts`: add `conclude: (battleId, result) =>
    Promise<Battle>` as a `useMutation`; `onSettled` invalidate `['battle',
    roomId]` (consistent with 5.1's `start` and 5.3's `patch`). Extend the return
    to `{ start, patch, conclude, isLoading, errorMessage }` (do **not** pre-stub
    `discard` — Story 5.7).
  - `app/munchkin/[roomNumber]/(battle)/index.tsx`: add the Conclude UI block
    inside 5.3's existing Battle View — an explicit two-option result selector
    (Players Win / Monster Wins) and a single primary **Conclude** action that
    calls `conclude(battle.id, selectedResult)`. **No extra ConfirmDialog** — the
    explicit result choice IS the explicit confirmation (UX-DR13: explicit
    confirmation is required for *Discard*, not Conclude). On success, dismiss
    the modal back to the Room View; on `409`, surface a non-modal inline error
    and let `useRoomBattle`'s invalidation reconcile state. Do **not** modify
    5.3's draft/Save model, the monster/player side components, the totals
    formula, the comparison indicator, or 5.5's tombstone rendering.
  - **Button hierarchy resolution (UX-DR19, locked — see Resolved decisions #3):**
    Conclude is the screen's primary action when the 5.3 draft is **clean** (no
    unsaved changes). When the draft is **dirty**, only 5.3's Save is the visible
    primary; the Conclude action is **disabled** (`surfaceSubtle` background +
    `textMuted` text per UX-DR19 disabled-state) so there is never more than one
    *enabled* primary visible at once. After a successful Save, the draft becomes
    clean and Conclude becomes enabled again. Save and Conclude are **never
    co-active**.
  - New small presentational component for the conclude UI block under
    `frontend/components/munchkin/` (PascalCase file, `memo`, explicit prop
    interface, default export, `StyleSheet` at bottom referencing `AppTheme`,
    stable `testID`s + accessibility — mirror 5.3 components and `VioletButton`).
    The screen owns the mutation/navigation; the component is presentational.
  - Tests: co-located component test (result selector + Conclude enabled/disabled
    states + accessibility); extend `frontend/api/battles.test.ts` (mock
    `@/api/http`; URL/encoding/body, `409` surfacing, `400` on bad result);
    extend `frontend/hooks/useBattleActions.test.ts` (`conclude` calls
    `concludeBattle`, invalidates `['battle', roomId]`); extend the Battle View
    route test under `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...`
    (NOT under `frontend/app`) — assert AC1/AC3 happy path + AC2 `409` surfacing
    + the dirty-draft Conclude-disabled gate + back-nav after success.
  - Cross-surface verification (backend + frontend typecheck/test/coverage; manual
    two-client web smoke).

**OUT of scope (explicitly owned by other stories — do NOT build here):**

- ❌ **Discard** (`DELETE /battles/:id`, `status → discarded`, the destructive
  confirmation flow, the danger-styled Discard button) → **Story 5.7**. Symmetric
  to 5.6 but distinct: it requires an explicit `ConfirmDialog` (UX-DR13) and uses
  a different endpoint/method/event. Do **not** add a Discard button, a
  `useBattleActions.discard`, or a `DELETE /battles/:id` handler in this story
  (project rule: no half-finished implementations).
- ❌ **Realtime / WebSocket plumbing.** 5.4 already (a) made the publisher real,
  (b) wired SNS/Redis selection from env, (c) added the `BattleServiceRole`
  `sns:Publish` policy + `ROOM_CHARACTER_EVENTS_TOPIC_ARN` env, (d) added all four
  `battle_*` types to `room-notifications-service` `EVENT_TYPES` + the
  `event_body.battleId` validation + the parsed-`event_body` forward, (e) widened
  frontend `isValidNotificationEvent` to accept all four `battle_*` types, (f)
  introduced the shared multiplexed `RoomWebSocketClient` registry, and (g) added
  the `useRoomBattle` WS subscription that invalidates `['battle', roomId]` on
  any `battle_*` event. **5.6 must not touch any of that** — only add the
  publisher.publish call at its new conclude endpoint.
- ❌ **`PATCH` semantics or the Battle schema.** 5.3 already explicitly forbids
  PATCH from setting `status` or `result`. 5.6 uses the dedicated conclude
  endpoint and does **not** modify `Battle.ts`, the schema, the indexes, the
  `toJSON` transform, or 5.3's PATCH whitelist (`name`, `playerSide`,
  `monsterSide` only).
- ❌ **Cross-character/character→battle reconciliation** → **Story 5.5**.
- ❌ **`log-service` / `battle_concluded` logging** → **Epic 6**. ADR-5 lists
  `battle_concluded` as one of the *eventually*-logged lifecycle events, but the
  log topic / `log-service` does not exist on this branch. 5.6 publishes only to
  the existing `RoomCharacterEventsTopic` (one publish, no
  `Promise.allSettled`/dual-topic fan-out — that pattern is doc-only, see 5.4).
- ❌ **Re-creating the 5.1/5.2/5.3/5.4 seam.** Battle-service scaffold/model/
  POST/GET/PATCH, `useRoomBattle` (HTTP+WS), `useBattleActions.start`/`patch`,
  `ActiveBattleBanner`, `(battle)` modal route + layout, the publisher
  Sns/Redis/Noop classes, the shared WebSocket registry, the
  `room-notifications-service` allowlist. **Consume; do not redefine.**
- ❌ **Touching the Room View / `ActiveBattleBanner`.** The banner disappears
  automatically because `useRoomBattle` invalidates and refetches; the active-
  battle query returns `null` after `status='concluded'`. Do not add a
  banner-specific dismissal path or a banner change.
- ❌ **Client-side battle-state mutation** (changing the local battle cache to
  `concluded`) instead of a refetch — let 5.4's WS-invalidate path + the
  mutation's `onSettled` invalidate drive the refetch (single source of truth =
  the server query; AC3 anti-flicker rule). Do not maintain a parallel local
  battle status in screen state.
- ❌ **Optimistic-echo suppression** like `useRoomCharacters`'
  `recentLocalUpdateByCharacter`. The battle query is a single-object refetch; a
  redundant invalidation after the local conclude is cheap and correct (5.4
  already explicitly rejects porting that machinery).
- ❌ **Auto-navigation from Room View into Battle View on remote conclude**, or
  any forward navigation triggered by a `battle_concluded` WS event. ADR-10:
  realtime never force-navigates. The local conclude action **dismisses** (back-
  navigates) the Battle View modal that the user is already in — that is the only
  permitted navigation in this story.

## Tasks / Subtasks

- [x] **Task 1 — Backend: atomic conclude on the battle model wrapper** (AC: 1, 2)
  - [x] In `backend/battle-service/src/service.ts`, extend the `BattleModelLike`
    interface (5.1 + 5.3 already added `find`/`create`/`findById`/
    `findByIdAndUpdate`). Add a single composed method
    `findActiveByIdAndConclude(id: string, result: 'players_win' | 'monster_wins',
    concludedAt: Date)` that performs **one atomic Mongo update**:
    `Battle.findOneAndUpdate({ _id: id, status: 'active' }, { $set: { status:
    'concluded', result, concludedAt } }, { new: true, runValidators: true })`.
    Returning `null` is the route's signal to disambiguate `404` vs `409` via a
    follow-up `findById` (see Task 2). This avoids the read-then-write race that
    would let two concurrent concludes both succeed.
  - [x] Mirror the existing wrapper's logging style (`console.info` keys
    `battleId`, `roomId`, `result`, `status`) and the response shaping (return the
    Mongoose doc through `toJSON` so the API exposes `id` not `_id`/`__v`,
    matching 5.1's transform). Pass `null` through unchanged when no document
    matches.
  - [x] Keep the wrapper type exported so `app.test.ts` / `service.test.ts` can
    inject a mock model with `vi.fn()` per method (5.1 + 5.3 test pattern).

- [x] **Task 2 — Backend: `POST /battles/:id/conclude` route** (AC: 1, 2)
  - [x] Add `app.post('/battles/:id/conclude', ...)` **inline in `src/app.ts`**
    (repo convention — no `routes/` folder). Use the same `:id` param style as
    5.3's PATCH (`/battles/:id`), not `{id}`.
  - [x] **Validation (all `400 { message }`):** require `req.body.result` to be
    `'players_win'` or `'monster_wins'` (strict equality against the enum;
    `400 { message: 'Field result is required and must be \"players_win\" or
    \"monster_wins\"' }`). Reject any other body keys silently — only `result` is
    accepted (mirror 5.3's whitelist discipline). Reject empty body (`req.body
    == null` or `result === undefined`) with the same `400` shape.
  - [x] **Conclude path (atomic + status guard):**
    1. Compute `concludedAt = new Date()` once at handler start (so the
       `try`/`catch` and the publish payload share the same timestamp).
    2. Call `findActiveByIdAndConclude(id, result, concludedAt)`.
    3. **If a document is returned:** the conclude succeeded — respond `200` with
       the updated battle JSON (direct resource, no envelope), then publish (Task
       3).
    4. **If `null` is returned (no match for `_id: id, status: 'active'`):** do a
       follow-up lookup `findById(id)` to disambiguate:
       - Battle missing → `404 { message: 'Battle not found' }`.
       - Battle exists but `status !== 'active'` → `409 { message: 'Battle is
         not active' }`. **No publish on either path.**
    5. Catch Mongoose `CastError` (bad ObjectId) → `404` (mirror 5.3 / character-
       service). All other errors → `next(error)` → `502 { message: 'Unexpected
       error' }` (battle-service convention from 5.1; **never** `500`, **never**
       `{ message, details }`).
  - [x] Do **not** mutate `name`/`playerSide`/`monsterSide` here (AC1 — Conclude
    is not a Save). The PATCH endpoint (5.3) is the only path that writes those
    fields.
  - [x] Backend tests (co-located `app.test.ts`, supertest, mock model + mock
    publisher injected per 5.1/5.3 pattern). Cover:
    - Success: `POST /battles/:id/conclude` with `result='players_win'` returns
      `200` + JSON containing `id`, `status:'concluded'`, `result:'players_win'`,
      a non-null ISO `concludedAt`, **unchanged** `name`/`playerSide`/
      `monsterSide` (assert against the input fixture).
    - Validation `400`: missing body, missing `result`, `result='maybe'`,
      `result=null`, body that includes `status` or `name` (the latter is
      ignored — assert nothing was written by inspecting the mock).
    - `404`: battle not found (mock returns `null` for both `findActiveByIdAnd
      Conclude` and `findById`); `CastError` thrown (`error.name === 'CastError'`
      → `404`).
    - `409`: battle exists but `status='concluded'` or `'discarded'` (mock
      returns `null` from `findActiveByIdAndConclude`, then a doc with
      non-`active` status from `findById`); assert no publish.
    - `502`: unexpected throw from the model → response is `{ message:
      'Unexpected error' }`, status `502` (NOT `500`, NOT `{ message, details }`).
    - **Publish behaviour:** on the success path the mock publisher is called
      **exactly once** with `{ event: 'battle_concluded', roomId, event_body: {
      battleId }, emittedAt, correlationId? }` matching the concluded battle; on
      `400`/`404`/`409` the publisher is **not** called; a throwing publisher
      does **not** fail the `200` response.
    - Status-guard race: simulate a concurrent double-conclude — first call
      returns the doc (success → publish), second call returns `null` from
      `findActiveByIdAndConclude` and a doc with `status='concluded'` from
      `findById` → `409` + no publish.

- [x] **Task 3 — Backend: publish `battle_concluded` on success** (AC: 1, 4)
  - [x] After the `200` is computed (battle resolved from the atomic update), call
    `publisher.publish(createBattleEventPayload({ event: 'battle_concluded',
    roomId: battle.roomId, battleId: battle.id, correlationId }))` inside the
    **existing** `try/catch` that `console.error`s but never rethrows. **Mirror
    `character-service/src/app.ts` POST/PATCH/DELETE publish pattern verbatim**
    (the 5.4 reference). Reuse 5.4's `createBattleEventPayload` helper — do NOT
    define a new payload factory.
  - [x] `correlationId` may be propagated from `req.header('x-correlation-id')` if
    the existing battle-service routes do so (check 5.1 `POST` and 5.3 `PATCH`
    handlers — match whatever they do, do not invent a new correlation header).
  - [x] Ensure publish is **after** the `200` is sent (or in a `try/catch` that
    cannot affect response). Either order is acceptable as long as a publisher
    throw does not turn the response into a `502` — `character-service` calls
    `await publisher.publish(...)` *before* `res.status(...).json(...)` inside a
    try/catch; replicate that. The HTTP success must not depend on publish
    success.
  - [x] Sanity-check (no code change needed — verify in completion notes): 5.4
    has already added the `sns:Publish` policy on `BattleServiceRole` and the
    `ROOM_CHARACTER_EVENTS_TOPIC_ARN` env on `BattleServiceFunction`, plus
    `BATTLE_EVENTS_REDIS_URL` + `ROOM_CHARACTER_EVENTS_CHANNEL` on the
    `battle-service` `docker-compose` block. **No new env, no new IAM** in 5.6.
    If you find yourself editing IAM or adding env vars, you are out of scope.

- [x] **Task 4 — SAM: HttpApi event for the conclude sub-route** (AC: 1)
  - [x] In `backend/sam/template.yaml`, add a new HttpApi event `BattleConcludePost`
    to `BattleServiceFunction.Events`:

    ```yaml
    BattleConcludePost:
      Type: HttpApi
      Properties:
        ApiId: !Ref CloudHttpApi
        Path: /battles/{id}/conclude
        Method: POST
    ```

    Mirror the shape used for the existing `BattlePost` and 5.3's `BattlePatch`
    events (path style `{id}` is API-Gateway syntax — **only** in the SAM event
    declaration; the Express route still uses `:id`). Do **not** introduce a
    `{proxy+}` route — the existing per-method pattern (POST `/battles`, GET
    `/battles`, PATCH `/battles/{id}`) is the established convention.
  - [x] Add `backend/sam/events/battle-post-conclude.json`: a HttpApi `POST
    /battles/{id}/conclude` test event modelled on the existing
    `battle-post-battles.json` (5.1) / `battle-patch-battle.json` (5.3) envelope.
    `pathParameters.id` should be a sample ObjectId string; `body` should be the
    JSON string `'{"result":"players_win"}'` (note: HttpApi test events embed the
    body as a JSON-encoded string — match the existing files exactly, do not
    invent a new envelope).
  - [x] **No** new IAM, **no** new SNS topic, **no** new env. 5.4 already added
    the `sns:Publish` policy on `BattleServiceRole` for
    `RoomCharacterEventsTopic`. If `BattleServiceRole` does not yet exist on
    `main` because 5.4 hasn't merged, that is the HARD PREREQUISITE — HALT, do
    not invent it here.
  - [x] `nginx.conf`: 5.1's `/battles` location block (which mirrors `/characters`
    full block — preflight `OPTIONS`, `proxy_set_header`, `add_header` CORS
    list including `POST`) already proxies `POST /battles/:id/conclude`. No
    change expected — note "verified" in completion notes. Do **not** add a more-
    specific location block for `/battles/.*/conclude`.

- [x] **Task 5 — Frontend `api/battles.ts`: `concludeBattle`** (AC: 1, 2)
  - [x] Add (or re-export, if 5.1 already declared it) `BattleResult =
    'players_win' | 'monster_wins'`. Do **not** redefine `Battle`,
    `BattleStatus`, `BonusItem`, or `MonsterItem` — reuse 5.1's exports.
  - [x] `concludeBattle(battleId: string, result: BattleResult): Promise<Battle>`
    → `apiRequest<Battle>(\`/battles/${encodeURIComponent(battleId)}/conclude\`,
    { method: 'POST', body: { result } })`. Use `apiRequest` from `@/api/http`
    only — never raw `fetch`/`axios`. (The retry policy in `apiRequest` is fine:
    `409` is **not** retried, only `408/429/≥500` are; a `409` will surface as
    `ApiError` on the first attempt.)
  - [x] `ApiError` (status, details) propagates; callers distinguish `409`
    (already concluded/discarded — recoverable, prompt a refetch) from `400`
    (developer error, should never happen if the UI gates the result selector
    correctly) and `404` (battle deleted).

- [x] **Task 6 — Frontend `hooks/useBattleActions.ts`: add `conclude`** (AC: 1, 3)
  - [x] Add `conclude(battleId: string, result: BattleResult): Promise<Battle>`
    implemented as a `useMutation` calling `concludeBattle`. `onSettled`:
    `queryClient.invalidateQueries({ queryKey: ['battle', roomId] })` (consistent
    with 5.1's `start` and 5.3's `patch`). Keep the existing `start`/`patch`;
    return `{ start, patch, conclude, isLoading, errorMessage }`. Aggregate
    `isLoading`/`errorMessage` across all three mutations the same way 5.3 does
    for `start`+`patch`.
  - [x] Do **not** add `discard` (Story 5.7). Do **not** mutate the local
    `['battle', roomId]` cache to `concluded` synchronously — let the
    `onSettled` invalidate trigger a refetch; the refetch returns `null`
    (`status=active` no longer matches), which drives AC3 (banner removal +
    Battle View dismissal logic in Task 7).

- [x] **Task 7 — Frontend Battle View: Conclude UI block + post-success
      navigation** (AC: 1, 2, 3)
  - [x] In `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` (the 5.3 real
    UI), add a new **Conclude** UI region below 5.3's existing two-sided
    management UI and the comparison indicator. Do **not** restructure 5.3's
    layout, the draft model, the Save button, the monster/player side
    components, the totals formula, or 5.5's tombstone rendering.
  - [x] **State (`useState`):** `selectedResult: BattleResult | null` (default
    `null`). Reset to `null` on successful conclude (component unmount handles
    the rest because the modal dismisses).
  - [x] **Result selector** (controlled, two options): render two
    presentational toggle controls — "Players Win" and "Monster Wins" — in a
    horizontal segmented row. Use `AppTheme.colors.accent` (player) and
    `AppTheme.colors.danger` (monster) for the **selected** state visuals to
    keep the side colour mapping consistent with 5.3 (player=accent #D4C26E,
    monster=danger #922525). Unselected = `AppTheme.colors.surface` background +
    `AppTheme.colors.textMuted` text. Tap target ≥44×44 (mirror 5.3's
    `stepperButton`). `accessibilityRole="radio"` on each option; the row gets
    `accessibilityRole="radiogroup"` (or use `accessibilityState={{ selected }}`
    on each per RN's accessible-radio idiom). Stable `testID`s
    `battle-conclude-result-players` and `battle-conclude-result-monster`.
    **Default selection is `null`** (no preselect from the comparison
    indicator) — AC1 / Resolved decisions #4: explicit user choice.
  - [x] **Conclude action** (single primary button below the selector): label
    `Conclude`, primary tier (`AppTheme.colors.accent` background, `textPrimary`
    text — matches 5.3's Save primary tier per UX-DR19). `testID="battle-
    conclude-button"`. **Disabled states (combine with logical OR):**
    1. `selectedResult === null` (no result chosen yet) — disabled.
    2. The 5.3 draft is **dirty** (`hasUnsavedChanges` derived from the local
       draft vs `battle`) — disabled. Save remains visible primary in the same
       layer; Conclude becomes the visible primary only when the draft is
       clean. This is how UX-DR19 "one primary visible per layer" is satisfied
       (Resolved decision #3). **Show a non-modal hint label below the
       Conclude button when disabled-due-to-dirty:** `"Save your changes
       before concluding"` (`AppTheme.colors.textMuted`, `caption`). Do not
       block, modal, or auto-revert.
    3. `isConcluding` (the conclude mutation is in flight) — disabled +
       `surfaceSubtle` background per UX-DR19 disabled state, label optionally
       changes to `Concluding…`.
    Do not also disable Save while `isConcluding` (keep Save's existing 5.3
    behaviour); the dirty-vs-clean gate already prevents both being active.
  - [x] **On Conclude tap:** call `useBattleActions().conclude(battle.id,
    selectedResult)`. On success: dismiss the Battle View modal back to Room
    View (use the same dismiss/back-navigation call 5.1's modal already supports;
    typically `router.back()` for a modal group — match 5.1's actual back-nav
    implementation, do not invent a different one). The Room View's
    `useRoomBattle` is already invalidated by the mutation `onSettled`, so by
    the time Room View is in front again the banner is gone (AC3). On `409`:
    surface a non-modal inline error in the Battle View (e.g.
    `actionError`-style label below the Conclude button — mirror Room View's
    inline-error pattern); the `['battle', roomId]` invalidation will refetch
    `null` and the modal will dismiss naturally on the next render once the
    battle is `null` (defensive: do not crash on `battle === null` after a
    `409` — render the loading/error state 5.1 already wired). On other errors:
    surface the message inline; do not auto-dismiss; do not retry.
  - [x] **Defensive Battle-View-after-null guard:** when `battle` becomes `null`
    on the next refetch (because conclude succeeded — local or remote), the
    existing 5.1 loading/error rendering must not infinite-loop or flash
    spinner; render the normal "no active battle" empty state (already wired by
    5.1 for the cold-load case) and let the modal dismiss. Do not add a new
    empty state for "battle just concluded" — it's the same path.
  - [x] **Remote conclude (AC4) — zero new screen code:** if another player
    concludes while this user has Battle View open, 5.4's WS subscription on
    `useRoomBattle` invalidates `['battle', roomId]`, the refetch returns
    `null`, the Battle View hits the same null-guard above, the modal is
    dismissed back to Room View, and 5.2's `ActiveBattleBanner` (already a pure
    `battle !== null` render of `useRoomBattle().battle`) disappears. **Do not
    add WS handling here**; 5.4 is the single source of truth for that.
  - [x] Style strictly via `AppTheme` tokens (`accent`, `danger`, `surface`,
    `surfaceSubtle`, `textPrimary`, `textMuted`, `spacing.{xs,sm,md,lg}`,
    `radius.md`, `typography.labelMd`/`caption`). **No hardcoded hex/px/font-
    size literals** (project rule). No new colour token, no new spacing token.
  - [x] Extract the conclude UI block into a presentational component under
    `frontend/components/munchkin/` (suggested name `BattleConcludeAction.tsx`
    — match 5.3's component-naming convention for the side panels). Props
    (explicit interface):
    `{ selectedResult: BattleResult | null; onSelectResult: (result:
    BattleResult) => void; onConclude: () => void; disabled: boolean;
    isConcluding: boolean; dirtyHint: boolean }`. The screen owns the
    mutation/navigation; the component is presentational (no hooks beyond
    `memo`/`useCallback`-style internals). Mirror 5.3's component conventions:
    PascalCase file, `memo`-wrapped function, default export, `StyleSheet.
    create` at bottom referencing `AppTheme`, stable `testID`s + accessibility
    props.

- [x] **Task 8 — Tests** (AC: 1, 2, 3, 4)
  - [x] **Frontend api** (`frontend/api/battles.test.ts`, co-located, jsdom): mock
    `@/api/http` `apiRequest`. Assert `concludeBattle('abc', 'players_win')`
    calls `apiRequest('/battles/abc/conclude', { method: 'POST', body: {
    result: 'players_win' } })` (and that the path is URL-encoded — pass
    `'a/b'` and assert `/battles/a%2Fb/conclude`). Assert a `409`
    (`ApiError.status === 409`) propagates. Assert a `400` propagates with the
    server message. Assert no retry on `409` (the underlying `apiRequest`
    already only retries `408/429/≥500`; a passing test on `409` not being
    retried is an integration check via mock-call-count).
  - [x] **Frontend hook** (`frontend/hooks/useBattleActions.test.ts`, co-located,
    jsdom): wrap in `QueryClientProvider`; mock `@/api/battles` `concludeBattle`.
    Assert `conclude('id', 'players_win')` calls `concludeBattle` once with
    those args; on success, `queryClient.invalidateQueries({ queryKey:
    ['battle', roomId] })` is invoked (assert via spy on `invalidateQueries`
    or a direct `queryClient.getQueryState` check). Assert that an `ApiError`
    409 surfaces in `errorMessage` and does NOT throw uncaught. Aggregated
    `isLoading` across `start`/`patch`/`conclude` still works (do not regress
    5.1/5.3 assertions).
  - [x] **Component** (`frontend/components/munchkin/BattleConcludeAction.test.
    tsx`, co-located, Vitest+jsdom + `@testing-library/react`): renders the
    two-option result selector with `selectedResult={null}` → both options
    unselected; tapping `Players Win` calls `onSelectResult('players_win')`;
    tapping `Monster Wins` calls `onSelectResult('monster_wins')`; the Conclude
    primary is disabled while `selectedResult === null`; with `selectedResult=
    'players_win'` and `disabled=false` and `isConcluding=false` it is enabled
    and tapping calls `onConclude`; with `dirtyHint=true` (and disabled) the
    "Save your changes before concluding" hint label is rendered; with
    `isConcluding=true` Conclude is disabled and renders the `surfaceSubtle`
    background. Assert `accessibilityRole`s on the radio options + the Conclude
    button (`role="button"`).
  - [x] **Battle View route test** (`frontend/__tests__/app/munchkin/[roomNumber]/
    (battle)/...`, **NOT** under `frontend/app` — Expo Router forbids non-route
    files there). Extend 5.3's harness: `vi.hoisted` mutable refs, `vi.mock`
    for `@/hooks/useRoomBattle`, `@/hooks/useBattleActions`, `@/hooks/
    useCharacters` (or `useRoomCharacters`), `@/hooks/useUser`, `expo-router`
    (with a `router.back` spy or a `useRouter` shape per 5.1's actual mock
    shape). Assert:
    - **AC1 happy path:** mock `useRoomBattle().battle` as an active battle
      with a clean draft (assert `isDirty` derivation matches the screen's
      check); render Battle View; user taps the Players Win option then
      Conclude; `useBattleActions().conclude` is called with `(battle.id,
      'players_win')`; `router.back()` (or the screen's actual dismiss call)
      is invoked exactly once on the mocked mutation success.
    - **AC2 `409` recovery:** mock `conclude` to reject with `new
      ApiError('Battle is not active', 409, ...)`; assert an inline error
      surfaces, `router.back` is **not** called, and the `['battle', roomId]`
      invalidation is still triggered (so the screen recovers when the
      refetched battle is `null`).
    - **Save-vs-Conclude gate (UX-DR19, Resolved decision #3):** mock the
      battle so the draft would be dirty (e.g. mutate the screen's draft via
      a test helper — match 5.3's harness if it exposes one; else simulate by
      tapping the 5.3 add-bonus row); assert Conclude is disabled and the
      "Save your changes before concluding" hint is rendered; after a
      simulated successful Save (mocked PATCH), assert Conclude becomes
      enabled.
    - **Battle View dismissal on `null` refetch (AC3 + AC4):** flip the mock
      `useRoomBattle().battle` from active to `null` between renders (simulate
      a 5.4 WS-driven refetch); assert the modal hits the 5.1 empty/null
      state and dismisses (or that the screen renders nothing/the empty state
      consistent with 5.1's existing behaviour — match what 5.1 did, do not
      invent new empty UI).
    - **Conclude-disabled while `isConcluding`:** mock the mutation to a
      pending state; assert Conclude is disabled and (optionally) shows the
      `Concluding…` label.
  - [x] **Backend** (Task 2 covers most). Verify `vitest.config.ts` already
    includes `battle-service/src/**/*.test.ts` (5.1 added it) — no config
    change needed. Run `npm test`/`test:coverage` from `backend/`; assert
    **character-service tests still pass unchanged** (no regression — character
    realtime is the gating bar from 5.4).
  - [x] Meet the **70% line coverage floor** for both pipelines. The frontend
    coverage `include` is `api/**`,`config/**`,`hooks/**`; 5.6's frontend code
    is mostly in `api/` + `hooks/` (covered by Tasks 5+6 + their tests) plus
    a presentational component (not in coverage scope) and a route screen
    (also not in coverage scope by config). **Do not widen the coverage
    `include` scope** to chase numbers — assert behaviour, coverage is a floor
    not the goal (project rule).

- [x] **Task 9 — Cross-surface verification** (AC: 1, 2, 3, 4)
  - [x] Backend: from `backend/`, `npm run typecheck` and `npm test`/
    `test:coverage` pass with the conclude route + service-wrapper change.
    **Character-service and room-notifications-service existing tests must be
    untouched and still green** (5.6 makes no changes there — any regression =
    out-of-scope edit).
  - [x] Frontend: from `frontend/`, strict TS typecheck + `vitest run --coverage`
    pass (≥70% line floor, no regression in existing
    `useCharacters`/`webSocket`/`useRoomWebSocket`/Battle View / Room View /
    `useRoomBattle` / `useBattleActions` tests).
  - [x] Local manual smoke (`docker-compose up`, after 5.1 + 5.3 + 5.4 merged),
    two browser tabs (web), same room, two device identities:
    - Tab A starts a battle, opens Battle View, adds participants + a monster +
      a bonus, **Saves**. Tab B opens the same Battle View.
    - Tab A taps Players Win → Conclude. Battle View dismisses on Tab A; Room
      View on Tab A no longer shows the banner; the Battle button reverts to
      "no active battle".
    - **Tab B** (still on its open Battle View): the modal dismisses to Room
      View on the next refetch (driven by the `battle_concluded` WS event ⇒
      `['battle', roomId]` invalidate ⇒ `getActiveBattle` returns `null`); the
      `ActiveBattleBanner` disappears with **no extra interaction**; no
      auto-navigation to anywhere else (ADR-10).
    - Confirm in DevTools Network/WS: **one** `/ws` connection per tab (5.4
      shared multiplexed socket regression bar) and a single `battle_concluded`
      event delivered.
    - Status-guard race: have Tab A and Tab B both tap Conclude at nearly the
      same time. One returns `200`; the other returns `409`. The `409`-side
      tab surfaces the inline error and the next refetch reconciles the UI to
      the now-concluded state without the modal looping.
    - Make a plain character edit on Room View while the conclude is in
      flight; assert the character card still flashes/realtime updates (5.4
      "character realtime byte-for-byte unchanged" regression).
    - Verify on web at minimum; note any platform (iOS/Android) not verified.
  - [x] No new env, no new IAM, no new SNS topic, no infra/transport surface
    touched. If you find yourself editing `room-notifications-service/`,
    `frontend/api/webSocket.ts`, `frontend/hooks/useRoomWebSocket.ts`,
    `frontend/hooks/useRoomBattle.ts`'s WS subscription, or
    `BattleServiceRole.Policies`, you are out of scope (re-read 5.4 + Scope
    Boundaries).


## Dev Notes

### Why this story is small (the key insight)

5.4 already did the **hard** realtime work for `battle_concluded`:
- The publisher `Sns/Redis BattleEventPublisher` and `createBattleEventPayload(...)`
  helper are real and accept all four `battle_*` types (5.4 Task 1).
- `BattleServiceRole` has `sns:Publish` on `RoomCharacterEventsTopic` (5.4 Task 4
  via SAM).
- `room-notifications-service` `EVENT_TYPES` already contains `battle_concluded`
  and validates `event_body.battleId` (5.4 Task 4); fan-out forwards `event_body`
  as parsed (`{ battleId }` survives delivery).
- `frontend/api/webSocket.ts` `isValidNotificationEvent` already accepts
  `battle_concluded` with `event_body.battleId`.
- `useRoomBattle` has a WS subscription that invalidates `['battle', roomId]` on
  any `battle_*` event, so a remote `battle_concluded` automatically refetches the
  active-battle query, which returns `null` (because the partial-unique index +
  `?status=active` filter no longer match), and 5.2's `ActiveBattleBanner` (a
  `battle !== null` render of `useRoomBattle().battle`) disappears for all
  connected clients.

So 5.6 is **one new endpoint, one new mutation, one Conclude UI block**. AC4 and
the banner-removal half of AC3 are satisfied with **zero new realtime code** in
this story. AC3's local-client side is a single `router.back()`-equivalent on
mutation success, plus the existing 5.1 `battle === null` empty-state handling.

This is a deliberate epic-level invariant: 5.6 and 5.7 should be drop-in
endpoints + drop-in mutations + drop-in UI buttons. **Resist the temptation** to
"improve" the realtime path, change event names, add a special-case `battle_
concluded` UI animation, or auto-navigate Room View into a new screen. None of
those are in 5.6's ACs and they are forbidden by ADR-10 / 5.4 regression bar.

### Authoritative Conclude HTTP contract (architecture ADR-2 + repo conventions)

```
POST /battles/:id/conclude
Content-Type: application/json
{ "result": "players_win" | "monster_wins" }
```

| Outcome | HTTP | Body |
|---|---|---|
| Success — battle was `active`, transitioned to `concluded` | `200` | `Battle` JSON (direct, `id` not `_id`, `status:'concluded'`, `result:<chosen>`, `concludedAt:<ISO>`) |
| Missing/invalid `result` | `400` | `{ "message": "Field result is required and must be \"players_win\" or \"monster_wins\"" }` |
| Battle not found (or `CastError` on bad `:id`) | `404` | `{ "message": "Battle not found" }` |
| Battle exists but `status` is `concluded` or `discarded` (ADR-8 status guard) | `409` | `{ "message": "Battle is not active" }` |
| Unexpected error | `502` | `{ "message": "Unexpected error" }` (battle-service convention from 5.1; **never** `500`, **never** `{ message, details }`) |

- **PATCH never touches `status` / `result`** (5.3 whitelist enforces this) — the
  conclude transition is **only** through this dedicated endpoint (ADR-2).
- **Last-write-wins concurrency:** the server does **one** atomic
  `findOneAndUpdate({ _id, status:'active' }, { $set: { status, result,
  concludedAt } })`; if no document matches, the route does a follow-up
  `findById` to disambiguate `404` vs `409`. This makes the conclude transition
  race-safe without a separate optimistic-lock field.
- **No log-service publish.** ADR-5 lists `battle_concluded` as a future logged
  lifecycle event, but `log-service` does not exist on this branch (Epic 6).
  Single publish to `RoomCharacterEventsTopic` only — **no
  `Promise.allSettled` / dual-topic fan-out** (the doc-only pattern is contained
  in 5.4's "architecture-vs-repo conflict" rule).
- **Response shape:** direct resource (`{ id, roomId, name, status:'concluded',
  result:'players_win', concludedAt:'...', playerSide:{...},
  monsterSide:{...}, ... }`), no envelope. `error` shape is `{ message: string }`
  only — no `details`, no `error.type` (architecture
  `implementation-patterns-consistency-rules.md#error-responses`).

### Resolved decisions (locked, with rationale — confirm Q1–Q3 in saved questions)

1. **Single dedicated endpoint, atomic transition.** The conclude transition uses
   `POST /battles/:id/conclude` (ADR-2), **not** PATCH (which 5.3 explicitly
   forbids from touching `status`/`result`). The server-side change is one
   `findOneAndUpdate` matching `{ _id, status:'active' }` — atomic w.r.t.
   concurrent concludes (no read-then-write race). On no-match the route does a
   follow-up `findById` to return `404` vs `409` correctly. ✅ Locked.

2. **Conclude is *not* a Save.** A successful conclude must NOT mutate
   `name`/`playerSide`/`monsterSide`. Those are the persisted authoritative
   battle state; concluding does not implicitly persist the user's local 5.3
   draft. The UI gates Conclude behind a clean draft (Resolved #3) precisely so
   the user has explicitly Saved any changes before terminating the battle. ✅
   Locked. (Confirms the AC1 wording and prevents the dev mistake of "while we're
   here, also persist the draft on conclude".)

3. **Save vs. Conclude visibility (UX-DR19 "one primary visible per layer").**
   In Battle View, Save (5.3) is the screen's primary action while the local
   draft is **dirty**; Conclude (5.6) is the screen's primary action while the
   draft is **clean**. They are **never both visible as enabled primary** in the
   same render. Implementation: render Save in 5.3's existing position (5.6 does
   not move it); render Conclude below the comparison indicator; when the draft
   is dirty render Conclude as **disabled** (`surfaceSubtle` background +
   `textMuted` text per UX-DR19's disabled-state recipe) with a non-modal hint
   "Save your changes before concluding". This satisfies UX-DR19 because there
   is exactly one **enabled** accent-primary visible at any time, and avoids the
   ambiguity of "did Conclude include my unsaved bonus?". ✅ Locked. **Saved
   question Q1** asks the user to confirm this resolution vs. the alternative
   "hide Conclude entirely while dirty"; the implementer should follow the
   locked decision unless the saved-question response overrides it before dev.

4. **Result selector — explicit, no preselect, segmented control.** The Conclude
   action requires an explicit `result` per AC1. The UI is an inline two-option
   segmented control (`Players Win` / `Monster Wins`) with **no default
   selection** (`selectedResult: null` until the user taps one). The Conclude
   primary button is disabled while `selectedResult === null`. The non-
   authoritative comparison indicator from 5.3 ("Players ahead" / "Monsters
   ahead" / "Even") is **not** used to preselect the result — preselection
   creates an accidental-confirmation risk and contradicts AC1's "explicit
   result" wording. Tap targets are ≥44×44 (mirror 5.3's `stepperButton`).
   Selected-state visuals: `accent` for `players_win`, `danger` for
   `monster_wins` — same colour mapping 5.3 uses for the two sides, so the
   selector reads like "which side won?". ✅ Locked. **Saved question Q2**
   asks the user to confirm vs. the alternative "two flat primary buttons
   `Conclude — Players Win` and `Conclude — Monster Wins`" (which would violate
   UX-DR19 by having two primary actions visible simultaneously).

5. **No extra ConfirmDialog on Conclude.** UX-DR13 explicitly requires explicit
   confirmation for **Discard** (5.7), not for Conclude. The explicit *result
   choice* IS the explicit confirmation here. Adding a second `ConfirmDialog`
   would be a redundant friction step. The `frontend/components/ConfirmDialog`
   component already exists (cross-platform) and **stays available for 5.7** —
   5.6 imports nothing from it. ✅ Locked.

6. **Post-conclude navigation (local).** On successful local conclude, dismiss
   the Battle View modal back to Room View (`router.back()` — match 5.1's actual
   modal back-navigation call; do not invent a new path). Do **not**
   `router.replace`, `router.push` to a new screen, or auto-open a "battle
   summary" view (no such view exists; that is Epic 6 / Story 6.7 territory).
   Room View's `useRoomBattle` is already invalidated by the mutation
   `onSettled` (Task 6) — by the time Room View is in front again the banner is
   gone. ✅ Locked.

7. **Post-conclude behaviour (remote).** Per ADR-10, realtime never force-
   navigates. A remote `battle_concluded` causes 5.4's WS subscription to
   invalidate `['battle', roomId]`; the active-battle query refetches `null`;
   any open Battle View on the receiving client renders 5.1's
   loading-then-empty path and the modal naturally dismisses (or the screen
   shows the existing 5.1 "no active battle" empty state — match 5.1's
   behaviour, do not invent new UI). The Room View `ActiveBattleBanner`
   (Story 5.2, a pure `battle !== null` render) disappears with **zero new
   code**. ✅ Locked.

8. **`409` recovery on the local conclude (race).** If two players tap
   Conclude near-simultaneously, one returns `200` + publishes
   `battle_concluded`; the other returns `409`. The `409`-side surfaces an
   inline non-modal error label (mirror Room View's `actionError` pattern) and
   relies on the publish-from-the-winner to deliver the `battle_concluded` WS
   event, which 5.4's `useRoomBattle` subscription invalidates → `null`
   refetch → modal dismisses. Do NOT retry the conclude on `409` (`apiRequest`
   only retries `408/429/≥500`, so this is automatic). ✅ Locked.

### Battle schema — what changes, what doesn't (5.6 reference)

Battle persisted shape (5.1 authoritative; 5.6 does NOT modify the schema/
indexes/transform):

```typescript
// MongoDB collection: battles  (id aliased from _id via toJSON; never raw _id/__v)
{
  id: string,
  roomId: string,
  name: string,                              // unchanged by conclude (AC1, Resolved #2)
  status: 'active' | 'concluded' | 'discarded',  // 5.6: 'active' → 'concluded'
  playerSide:  { characterIds: string[]; bonuses: BonusItem[] },   // unchanged by conclude
  monsterSide: { monsters: MonsterItem[];   bonuses: BonusItem[] }, // unchanged by conclude
  result: 'players_win' | 'monster_wins' | null,  // 5.6: null → 'players_win' | 'monster_wins'
  createdAt, concludedAt: Date | null, updatedAt
  //              ↑ 5.6: null → new Date() (server-computed once per request)
}
type BonusItem  = { id: string; value: number }
type MonsterItem = { id: string; name: string; level: number }
```

- The partial unique index `{ roomId: 1, status: 1 }` `partialFilterExpression: {
  status: 'active' }` (5.1 Task 2) is what allows the next `start` for the same
  room to succeed: once `status` flips to `'concluded'`, the partial index no
  longer constrains it, so 5.7 + a future `Start` can co-exist for that room.
  5.6 does NOT modify this index (do not be tempted to "tighten" or "rebuild" it).
- `concludedAt` is computed **server-side** as `new Date()` in the request
  handler (one timestamp per request, reused for the publish payload's
  `emittedAt` derivation only if `createBattleEventPayload` accepts it; otherwise
  the helper sets `emittedAt: new Date().toISOString()` — they will be within
  microseconds of each other and that is fine; do not pass `concludedAt` into
  the publish payload — `event_body.battleId` only).
- **Mongoose `timestamps: true` updates `updatedAt` automatically** on the
  `findOneAndUpdate` (verify in the success test). Do not set `updatedAt`
  manually.

### Realtime path for `battle_concluded` (verified from 5.4 — no change needed)

```
battle-service.app.ts (POST /:id/conclude)
  └── publisher.publish(createBattleEventPayload({
        event: 'battle_concluded', roomId, battleId, correlationId
      }))
      ├── lambda → SnsBattleEventPublisher.publish (5.4 Task 1) → SNS
      │            RoomCharacterEventsTopic
      └── local  → RedisBattleEventPublisher.publish (5.4 Task 1) → Redis channel
                   `room-character-events`

room-notifications-service (5.4 Task 4)
  ├── EVENT_TYPES already includes 'battle_concluded'
  ├── parseNotificationEvent: requires event_body.battleId for battle_*
  ├── service.ts sendEventToConnections: forwards { event, event_body } AS PARSED
  └── Each connected client in the room receives:
      { event: 'battle_concluded', event_body: { battleId } }

frontend/api/webSocket.ts (5.4 Task 5)
  └── isValidNotificationEvent: accepts battle_concluded with event_body.battleId
      → listener fan-out

frontend/hooks/useRoomBattle.ts (5.4 Task 6)
  └── on any battle_* event: queryClient.invalidateQueries({ queryKey:
      ['battle', roomId] })
      → useQuery refetches getActiveBattle(roomId) (GET /battles?roomId&status=active)
      → returns null (status is no longer 'active')
      → useRoomBattle().battle === null

frontend/components/munchkin/ActiveBattleBanner (5.2)
  └── pure render: battle !== null
      → null ⇒ banner not rendered ⇒ AC4 satisfied with no UI code in 5.6/5.2
```

5.6 only adds the **publisher.publish** call at the conclude success path. Every
arrow below it already exists.

### AC2 anti-patterns (the most likely dev mistakes)

- ❌ **Read-then-write status guard.** Tempting:
  ```ts
  const battle = await Battle.findById(id);
  if (!battle) return 404;
  if (battle.status !== 'active') return 409;
  battle.status = 'concluded'; battle.result = result; await battle.save();
  ```
  This is **wrong** — two concurrent concludes can both pass the guard and both
  call `save`, ending with one client's `result` silently overwritten and a
  redundant publish. **Do** `findOneAndUpdate({ _id, status: 'active' }, ...)`
  (atomic), then disambiguate `null` via a follow-up `findById`. Status-guard
  race test (Task 2) proves this is correct.
- ❌ **Publishing on `409`.** Only the `200` path publishes `battle_concluded`.
  A `409` from a concurrent loser must publish nothing — the winner already
  did. Test asserts `mockPublisher.publish` is **not called** on the `409`
  branch.
- ❌ **`500` instead of `502`.** Battle-service uses `502 { message: 'Unexpected
  error' }` (5.1 Task 1). The character-service `500 { message, details }`
  shape is documented as an inconsistency in 5.1 Dev Notes — do not "harmonise"
  by switching battle-service to character-service's shape. It is intentionally
  diverged.
- ❌ **Sending the response then awaiting publish (or vice-versa) without a
  try/catch.** Mirror character-service `app.ts` POST/PATCH/DELETE pattern
  exactly: `try { await publisher.publish(...) } catch (e) { console.error(...)
  }` then `res.status(200).json(...)`. A publisher throw must not turn a
  successful conclude into a `502`.
- ❌ **Mutating the local `['battle', roomId]` cache to `concluded` synchronously
  on the local mutation.** Don't optimistically rewrite the cache to `status:
  concluded` — the next refetch returns `null` (because `status=active`
  filter), so an optimistic write would briefly show a `concluded` battle in
  the active-battle slot and then flicker to `null`. Let `onSettled` invalidate
  drive the refetch.
- ❌ **Auto-navigating remote clients into a "battle summary" view on a
  `battle_concluded` event.** ADR-10 forbids this. 5.6 has no such view (and
  Epic 6 / Story 6.7 owns "open completed battle records from history" — that
  is a *user-initiated* navigation from the room history list, not an
  auto-nav).
- ❌ **Adding a `ConfirmDialog` on Conclude.** UX-DR13 reserves explicit
  confirmation for Discard (5.7). Do not add a second confirm step on Conclude
  (Resolved #5). The Conclude button + the explicit two-option result selector
  is the explicit confirmation.
- ❌ **Pre-selecting the result based on the comparison indicator.** Resolved
  decision #4: explicit user choice; the comparison indicator is non-
  authoritative (5.3 wording) and the result is a *user* decision.

### UX & accessibility specifics (UX-DR13, UX-DR19, UX-DR21)

- **Two-sided colour mapping** (carry from 5.3): player side / `Players Win`
  selected-state = `AppTheme.colors.accent` (`#D4C26E`); monster side /
  `Monster Wins` selected-state = `AppTheme.colors.danger` (`#922525`). Read
  the visual cue: "the side that won" lights up in its existing 5.3 colour.
- **Conclude primary button**: `accent` background, `textPrimary` text, height
  consistent with 5.3's Save (re-use 5.3's primary button style if it exposes
  one; otherwise mirror it via `AppTheme.spacing.lg` vertical padding +
  `AppTheme.radius.md` corner). One **enabled** primary visible at a time
  (UX-DR19) — see Resolved #3.
- **Disabled state recipe (UX-DR19):** `surfaceSubtle` (`#353535`) background +
  `textMuted` text. Apply on (a) `selectedResult === null`, (b) draft dirty,
  (c) `isConcluding`. Do **not** use the `accent` background while disabled —
  that would look like an active primary.
- **Tap targets ≥44×44pt** for all three controls (Players Win toggle, Monster
  Wins toggle, Conclude button). Mirror 5.3's `stepperButton` (44×44, `Light`
  haptic on tap if 5.3 wires haptics on its primary actions — match what 5.3
  did).
- **Accessibility (UX-DR21 + UX-DR13):**
  - Result row: each option is a radio-like button. Use `accessibilityRole=
    "radio"` per option (RN supports it; if 5.3 has a similar segmented control
    elsewhere, mirror its pattern). Provide `accessibilityState={{ selected:
    selectedResult === 'players_win' }}` on the players option (and similarly
    for monster). The container row gets `accessibilityRole="radiogroup"`.
    `accessibilityLabel="Players win"` / `"Monster wins"`.
  - Conclude button: `accessibilityRole="button"`, `accessibilityLabel=
    "Conclude battle"`, `accessibilityState={{ disabled: !canConclude }}`.
  - Dirty-disabled hint label: render as a `Text` with
    `accessibilityRole="text"` (or no role) and the literal `"Save your
    changes before concluding"` so VoiceOver reads it after the disabled
    Conclude.
  - Manual VoiceOver / TalkBack pass on Battle View is part of UX-DR21's QA
    targets — note in completion notes whether iOS/Android were validated.
- **Reduced motion (UX-DR16):** the conclude flow has no motion (no flash, no
  spring), so reduced-motion handling is automatic. Do not introduce any
  motion that would need a `useReducedMotion()` check.
- **Field-error pattern (UX-DR20):** the inline error after a `409` is a
  `danger`-tinted `Text` below the Conclude button (mirror Room View
  `actionError`). No blocking modal.

### Existing patterns to mirror (do NOT reinvent — quick lookup)

- **Backend conclude route + atomic update**: pattern by analogy from
  `backend/character-service/src/app.ts` `app.delete('/characters/:characterId',
  ...)` (status guard + try-catch publish + `204 send()` on success). 5.6 uses
  `200 json(battle)` (not `204` — we return the updated battle so the client
  can confirm `status:'concluded'` and `result`); the rest of the shape (try-
  catch publish, `CastError → 404`, `next(error) → 502` via the 5.1 error
  handler) maps 1:1.
- **Backend service-wrapper extension**: `backend/character-service/src/
  service.ts` `findByIdAndUpdate`/`findByIdAndDelete`. 5.3 already added
  `findById`/`findByIdAndUpdate` to `BattleModelLike` — extend with
  `findActiveByIdAndConclude` the same way (`console.info` logging, null-on-
  not-found, response shaping through `toJSON`).
- **Backend `app.test.ts` harness with mock publisher injection**: 5.1's
  `app.test.ts` (which 5.3 extends) — `supertest`,
  `createApp(model, { publisher })`. Reuse it; add the conclude block of
  tests.
- **Frontend api module (POST sub-resource)**: 5.1's `startBattle` (`POST
  /battles`, `body`, returns `Battle`); use that exact shape for
  `concludeBattle` (`POST /battles/${encodeURIComponent(battleId)}/conclude`,
  `body: { result }`, returns `Battle`).
- **Frontend mutation hook**: 5.1's `useBattleActions.start` and 5.3's
  `useBattleActions.patch` (`useMutation`, `onSettled` invalidate `['battle',
  roomId]`). 5.6's `conclude` is the third sibling — same shape, same
  invalidation key, no optimistic update (consistent with the 5.4 explicit
  rejection of optimistic-echo machinery for the battle query).
- **Frontend route-test harness**: 5.3's harness in
  `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...` —
  `vi.hoisted`/`vi.mock` of `@/hooks/useRoomBattle`, `@/hooks/useBattleActions`,
  `@/hooks/useCharacters`, `@/hooks/useUser`, `expo-router`. Extend; do not add
  test files under `frontend/app`.
- **Component (presentational + memo + tokens + testID)**:
  `frontend/components/munchkin/RoomCharacterCard.tsx`,
  `RoomCharactersList.tsx`, `VioletButton.tsx`, and 5.3's player-side / monster-
  side / row components — same conventions (PascalCase file, `memo`, explicit
  prop interface, default export, `StyleSheet.create` at bottom referencing
  `AppTheme`, stable `testID`s + accessibility props).
- **Disabled primary button styling**: mirror whatever 5.3 settled on for
  `Saving` state (`surfaceSubtle` background + Save disabled). 5.6's
  `Concluding…` and dirty-disabled states should share that visual treatment
  for consistency.
- **`ConfirmDialog`** (`frontend/components/ConfirmDialog.tsx`, cross-
  platform): **DO NOT IMPORT IN 5.6**. It exists for 5.7. Mentioning it here
  only so the dev agent does not duplicate it — the explicit result selector
  in 5.6 IS the confirmation; a `ConfirmDialog` is forbidden by Resolved #5.

### Files to create / modify (exact paths)

**MODIFY (backend, all created/modified by 5.1/5.3/5.4):**

- `backend/battle-service/src/app.ts` — add the `POST /battles/:id/conclude`
  inline route (Tasks 2 + 3).
- `backend/battle-service/src/service.ts` — add
  `findActiveByIdAndConclude(id, result, concludedAt)` to `BattleModelLike`
  + the wrapper implementation (Task 1).
- Co-located backend tests: `backend/battle-service/src/app.test.ts`,
  `backend/battle-service/src/service.test.ts` (Task 2 + 8 — extend, do not
  rewrite).
- `backend/sam/template.yaml` — add `BattleConcludePost` HttpApi event under
  `BattleServiceFunction.Events` (Task 4).

**NEW (backend):**

- `backend/sam/events/battle-post-conclude.json` — HttpApi `POST
  /battles/{id}/conclude` test event (Task 4).

**Verify (likely no change — note "verified" in completion notes):**

- `backend/battle-service/src/models/Battle.ts` — schema unchanged (5.1
  authoritative).
- `backend/nginx/nginx.conf` — `/battles` block already proxies POST sub-
  resources (mirrors `/characters`).
- `backend/battle-service/src/publisher.ts` — 5.4 already supports
  `'battle_concluded'`; do not modify.
- `backend/battle-service/src/{index.ts,lambda.ts}` — 5.4 already wires the
  Sns/Redis publisher selection; do not modify.
- `backend/battle-service/.env.example` — 5.4 already added
  `BATTLE_EVENTS_REDIS_URL` + `ROOM_CHARACTER_EVENTS_CHANNEL`; do not modify.
- `backend/docker-compose.local.yml` — 5.4 already added the env vars on the
  `battle-service` block; do not modify.
- `backend/room-notifications-service/**` — 5.4 already added
  `'battle_concluded'` to `EVENT_TYPES` + the parsed-`event_body` forward; do
  not modify.

**MODIFY (frontend, all created by 5.1/5.3/5.4):**

- `frontend/api/battles.ts` — add `concludeBattle` + (re-)export `BattleResult`
  (Task 5). Add co-located test extensions (Task 8).
- `frontend/hooks/useBattleActions.ts` — add `conclude` (Task 6). Add co-
  located test extensions (Task 8).
- `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` — wire the new
  Conclude UI block + post-success dismiss + `409` recovery (Task 7). Extend
  the route test under `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/
  ...` (Task 8).

**NEW (frontend):**

- `frontend/components/munchkin/BattleConcludeAction.tsx` — presentational
  result-selector + Conclude button (Task 7) + co-located
  `BattleConcludeAction.test.tsx` (Task 8).

**Verify (likely no change):**

- `frontend/api/webSocket.ts`, `frontend/hooks/useRoomWebSocket.ts`,
  `frontend/hooks/useRoomBattle.ts` (the WS subscription part) — all 5.4-
  owned; do not modify.
- `frontend/app/munchkin/[roomNumber]/index.tsx` (Room View) and
  `frontend/components/munchkin/ActiveBattleBanner.tsx` (5.2) — banner
  removal is automatic via `useRoomBattle` invalidation; do not modify.
- `frontend/components/ConfirmDialog.tsx` — DO NOT IMPORT in 5.6 (Resolved #5).

### Project Structure Notes

- Backend services are isolated bounded contexts; `battle-service` owns the
  `battles` collection exclusively — no cross-service reads/writes, no
  synchronous inter-service HTTP. Backend TS is **non-strict** (`NodeNext`,
  `strict:false`); frontend TS is **strict**. Do not normalize one to the
  other.
- Endpoints stay inline in `src/app.ts` (no `routes/` folder) per repo
  convention. Single root `backend/vitest.config.ts` already includes
  `battle-service/src/**` (added by 5.1) — no config change needed.
- Frontend layered boundaries: `app/` route composes the Battle View screen +
  owns the conclude mutation/navigation; `components/munchkin/` is
  presentational (no fetching/navigation inside); `hooks/` orchestrates data;
  `api/` owns transport. Every file under `frontend/app` must be a
  route/layout — `BattleConcludeAction` lives in `components/munchkin/`, its
  test is co-located; the Battle View route test lives under `frontend/
  __tests__/app/...`.
- Naming: route param `:id` (Express) / `{id}` (SAM HttpApi) / `id` (api module
  type); api module `battles.ts` (camelCase) + `concludeBattle` function;
  hook `useBattleActions.ts` (camelCase); component `BattleConcludeAction.tsx`
  (PascalCase); event-type string `battle_concluded` (snake_case); env vars
  ALL_CAPS_SNAKE_CASE (no new ones in 5.6); collection/field names camelCase
  (no schema changes). Test casing mirrors source exactly.
- Definition of done: every touched surface (backend, frontend) passes its
  own typecheck/test/coverage gate; **70% line coverage is a CI hard gate**;
  assert behaviour/contracts, not coverage padding; **character-service and
  room-notifications-service existing tests must remain untouched and green**
  (5.4's "byte-for-byte unchanged" regression bar carries forward).
- Update `backend/README.md` only if 5.1/5.3 already added a `/battles`
  endpoint table — append a one-line `POST /battles/:id/conclude` entry to
  match. If they did not, do not introduce a new docs section here (project
  rule: minimal localised edits).

### Latest tech / dependency note

**No new or upgraded dependency.** The coordinated stack is fixed by
`project-context.md` (React 19.2.0, TanStack Query 5.90.21, Expo Router 55,
React Native 0.83.2, Zod 4.3.6, Express 5.1.0, Mongoose 8.19.1, Vitest
3.2.4/4.0.18, AWS SDK v3 modules) — do **not** bump or add packages
(project-context.md guardrail: "Do not change dependency versions or lockfiles
incidentally"). Mongoose 8 supports `findOneAndUpdate({ _id, status }, { $set
}, { new, runValidators })` natively (the atomic conclude in Task 1) — no
additional packages or transactions needed (a single document update is
inherently atomic in MongoDB).

### Previous-story intelligence (5.1 foundational, 5.3 PATCH+UI, 5.4 publisher+WS; 5.5 parallel)

- **5.1** — `Battle` model with the full schema (incl. `status`,
  `result: 'players_win'|'monster_wins'|null`, `concludedAt: Date|null`),
  partial-unique `status:'active'` index, the `502` error shape, the
  `NoopBattleEventPublisher` seam + `try/catch` call sites,
  `useRoomBattle(roomId, userProfile)` (5.4 added the `userProfile` arg),
  `useBattleActions` (`{ start, isLoading, errorMessage }` originally; 5.3
  added `patch`), `frontend/api/battles.ts` types (`Battle`, `BattleStatus`,
  `BattleResult` if 5.1 already exported it), the `(battle)` modal route. 5.6
  consumes verbatim.
- **5.3** — `PATCH /battles/:id` (full-replace, status-guarded → 409 when
  non-active), `useBattleActions.patch`, the **two-sided Battle View** with
  the local draft + dirty/Clean/Saving model, the player/monster-side
  components, the non-authoritative outcome comparison label, the inline
  UUID-v4 helper. **5.6 must NOT modify any of this.** The dirty-vs-clean
  derivation already exists in 5.3's screen (it's how Save's enable-state
  works) — reuse the same `hasUnsavedChanges` (or equivalent) computation to
  drive Conclude's disabled-when-dirty gate; do not invent a parallel dirty
  derivation.
- **5.4** — the **real** publisher + payload helper, env-driven Sns/Redis
  selection, `BattleServiceRole` `sns:Publish` policy, additive
  `room-notifications-service` allowlist + `event_body` forwarding, additive
  frontend `isValidNotificationEvent` for `battle_*`, the **shared
  multiplexed `RoomWebSocketClient`** (one socket per `(roomId, userId)`
  shared by `useRoomCharacters` + `useRoomBattle`), and the `useRoomBattle`
  WS subscription that invalidates `['battle', roomId]` on any `battle_*`
  event. **5.6 must NOT touch any of this.** AC4 is achieved with one
  publisher.publish call.
- **5.5** is parallel/independent (frontend Battle View tombstone reconciliation
  for character changes). 5.6 must not edit 5.5's tombstone-row code or the
  `useMemo` join — they live in the same Battle View screen but in disjoint
  regions (5.5 = player-side rows; 5.6 = a new conclude UI block below the
  comparison indicator).
- **Team convention** (git history `#54/#57/#60/#62/#64`): one focused PR per
  story; every touched surface's quality gate green. 5.6 touches battle-
  service (one route + one wrapper method) + the Battle View screen + a small
  presentational component + tests — keep it one PR; the regression bar is
  "character realtime byte-for-byte unchanged + 5.3 Battle View behaviour
  unchanged".

### Decision log — all confirmed by Ivan (2026-05-17)

All three prior open questions are **CONFIRMED** before dev start — implement
exactly as stated in Resolved decisions #3 and #4 above; no remaining ambiguity:

- **Q1 — Save vs. Conclude visibility (UX-DR19):** ✅ **Confirmed.** Conclude is
  rendered as **disabled** with a `surfaceSubtle` background + a
  `Save your changes before concluding` hint label while the 5.3 draft is dirty;
  Save remains the visible enabled primary in that state. The alternative
  ("hide Conclude entirely while dirty") is rejected — the chosen approach is
  more discoverable while still satisfying UX-DR19's "one *enabled* primary
  visible per layer" reading.

- **Q2 — Result selector pattern:** ✅ **Confirmed.** Inline two-option
  segmented control (`Players Win` / `Monster Wins`) with **no default
  selection** + a single primary Conclude button below; selected-state visuals
  = `accent` for player, `danger` for monster. The alternative ("two flat
  primary buttons `Conclude — Players Win` and `Conclude — Monster Wins`") is
  rejected — it would violate UX-DR19's one-primary rule.

- **Q3 — Pre-selection from comparison indicator:** ✅ **Confirmed.** **No**
  pre-selection — explicit user pick required. The alternative ("default the
  selector to the side currently ahead per the 5.3 comparison indicator") is
  rejected — it creates accidental-confirmation risk and contradicts AC1's
  "explicit result" wording.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-battle-management.md#story-56-conclude-a-battle] (AC; FR25/FR26 mapping; Journey 4 conclude branch)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#api-design] (PATCH semantics, Conclude contract `POST /battles/:id/conclude` with required `result`, ADR-2 dedicated endpoint, ADR-8 status guard, ADR-10 warm-resume no auto-navigate)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md] (snake_case events, `roomId` mandatory in payloads, `{ message }` errors, HTTP status codes 400/404/409/502, `['battle', roomId]` query key, test co-location, repo divergence locked from 5.4)
- [Source: _bmad-output/implementation-artifacts/5-1-start-a-battle.md] (battle-service scaffold, schema with `status`/`result`/`concludedAt`, partial-unique `active` index, `502 { message }` error shape, `NoopBattleEventPublisher` seam, `useRoomBattle` HTTP-only contract, `(battle)` modal route, `Battle`/`BattleResult` types in `api/battles.ts`)
- [Source: _bmad-output/implementation-artifacts/5-3-manage-battle-state.md] (PATCH full-replace + status guard pattern, `useBattleActions.patch` + invalidation, two-sided Battle View + draft/Save model + comparison indicator, player/monster colour mapping, component conventions under `components/munchkin/`)
- [Source: _bmad-output/implementation-artifacts/5-4-realtime-battle-updates-from-battle-actions.md] (real publisher Sns/Redis classes, `createBattleEventPayload` helper, env wiring `index.ts`/`lambda.ts`, `BattleServiceRole sns:Publish` SAM policy, all-four `battle_*` allowlist + `event_body.battleId` forward in `room-notifications-service`, `isValidNotificationEvent` widened, shared multiplexed WS registry, `useRoomBattle` WS subscription invalidating `['battle', roomId]` — the seam 5.6 publishes into)
- [Source: _bmad-output/implementation-artifacts/5-2-show-active-battle-in-room-view.md] (banner is a pure `battle !== null` render of `useRoomBattle().battle`; banner disappears for free when 5.6 invalidates the active-battle query)
- [Source: backend/character-service/src/app.ts (DELETE /characters/:characterId)] (try/catch publish + `next(error)` + `CastError → 404` reference pattern; 5.6 mirrors structure with `200` instead of `204`)
- [Source: backend/character-service/src/{publisher.ts,index.ts,lambda.ts}] (Sns/Redis/Noop publisher reference — 5.4 ported these to battle-service; 5.6 just consumes)
- [Source: backend/sam/template.yaml] (CharacterServiceFunction HttpApi event shape — mirror for `BattleConcludePost`; CharacterServiceRole `PublishRoomCharacterEvents` policy — already cloned by 5.4 onto BattleServiceRole)
- [Source: backend/nginx/nginx.conf] (`/characters` block — verify the 5.1 `/battles` block has the same shape so `POST /battles/:id/conclude` proxies correctly)
- [Source: frontend/api/http.ts] (`apiRequest`, `ApiError { status, details }`, retry policy retries 408/429/≥500 only — `409` surfaces immediately as expected)
- [Source: frontend/api/characters.ts] (api module + `apiRequest` body shape reference for `concludeBattle`)
- [Source: frontend/hooks/useCharacters.ts] (`useMutation` + `onSettled` invalidate pattern — `useBattleActions.conclude` mirrors)
- [Source: frontend/components/munchkin/RoomCharacterCard.tsx, RoomCharactersList.tsx, VioletButton.tsx] (component conventions for `BattleConcludeAction.tsx`)
- [Source: frontend/constants/theme.ts] (`AppTheme.colors.{accent, danger, surface, surfaceSubtle, textPrimary, textMuted}`, `spacing`, `radius`, `typography` — token-only styling)
- [Source: frontend/components/ConfirmDialog.tsx] (cross-platform confirm — referenced ONLY to confirm 5.6 does NOT import it; reserved for 5.7)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md, 12-ux-consistency-patterns.md (UX-DR13, UX-DR19), 13-responsive-design-accessibility.md (UX-DR21)] (Conclude is primary action / one primary per screen / accessibility roles)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/10-user-journey-flows.md#104-journey-4-battle-lifecycle] (Conclude — Players Win / Monster Wins flow; Battle banner dismissed after conclude)
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] (FR25 outcome state, FR26 conclude + preserve outcome, ADR-2 conclude endpoint, ADR-8 status guard, ADR-5 `battle_concluded` is logged eventually — Epic 6 not 5.6)
- [Source: _bmad-output/project-context.md] (frontend strict TS; backend non-strict; do not bypass realtime contracts; do not change event names/payloads incidentally; service-boundary isolation; minimal-edits rule; 70% coverage floor; no incidental dependency changes; testing rules — co-location, route-tests under `__tests__`)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test -- battle-service/src/app.test.ts battle-service/src/service.test.ts` (backend targeted)
- `npm run test:unit -- api/battles.test.ts hooks/useBattleActions.test.ts components/munchkin/BattleConcludeAction.test.tsx` (frontend targeted)
- `npm run test:room-route -- '__tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx'` (Battle View route targeted)
- `npm run typecheck` from `backend/`
- `npm run tsc` from `frontend/`
- `npm test` from `backend/`
- `npm run test:coverage` from `frontend/`
- `npm run test:coverage` from `backend/`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented atomic backend battle conclusion via `findOneAndUpdate({ _id, status: 'active' })`, with explicit result validation, `404`/`409` disambiguation, `502` unexpected-error handling, and publish-on-success-only `battle_concluded` behavior.
- Added SAM support for `POST /battles/{id}/conclude` plus a SAM event fixture. Verified no new IAM, SNS topic, env vars, realtime allowlist, web socket plumbing, battle schema, or nginx changes were needed.
- Added `concludeBattle` and `useBattleActions.conclude`, invalidating `['battle', roomId]` on settle without optimistic cache mutation.
- Added the Battle View conclude region with explicit no-default result selection, dirty-draft disable hint, inline error recovery for `409`, local success modal dismiss, and defensive dismiss after active battle refetches to `null`.
- Added backend, API, hook, component, and route tests for result validation, race/status guard behavior, publish behavior, mutation invalidation, UI disabled states, success navigation, conflict recovery, and null-refetch dismissal.
- Manual local smoke passed against `http://127.0.0.1:8080` / `ws://127.0.0.1:8080/ws`: room `SOIL6739`, battle `6a0d8cf2f3258afadc78545d`, two simulated clients received `battle_started`, `battle_updated`, and `battle_concluded`; active-battle query returned `null` after conclude; repeat conclude returned `409`; concurrent race on battle `6a0d8cf2f3258afadc785466` returned `200`/`409`; `character_updated` still delivered over the same room WebSocket path. iOS VoiceOver and Android TalkBack were not run in this environment.
- Manual review follow-up: enabled Conclude now uses `actionSecondary`, and the monster result label now reads "Monsters Win".
- Deferred follow-up: when a user is on Battle View and the current battle is concluded or discarded, prompt them about the battle result before closing Battle View.

### File List

- _bmad-output/implementation-artifacts/5-6-conclude-a-battle.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/battle-service/src/app.ts
- backend/battle-service/src/app.test.ts
- backend/battle-service/src/service.ts
- backend/battle-service/src/service.test.ts
- backend/sam/template.yaml
- backend/sam/events/battle-post-conclude.json
- frontend/api/battles.ts
- frontend/api/battles.test.ts
- frontend/hooks/useBattleActions.ts
- frontend/hooks/useBattleActions.test.ts
- frontend/components/munchkin/BattleConcludeAction.tsx
- frontend/components/munchkin/BattleConcludeAction.test.tsx
- frontend/app/munchkin/[roomNumber]/(battle)/index.tsx
- frontend/__tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx

### Change Log

- 2026-05-20: Implemented Story 5.6 conclude battle backend, frontend, SAM event, tests, and story/sprint status updates.
- 2026-05-20: Addressed manual review UI comments and recorded deferred result-prompt improvement.
- 2026-05-20: Completed local manual smoke and moved story/sprint status to review.
