# Story 5.7: Discard a Battle

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to discard an active battle that should not remain in session state,
so that the room can recover cleanly from an invalid or abandoned battle.

This is the **seventh and final story of Epic 5 (Battle Management)** and the
**terminal-abandon half of the battle lifecycle** (5.6 = terminal-*success*
`conclude`; 5.7 = terminal-*abandon* `discard`). It introduces the
`DELETE /battles/:id` **soft-delete** endpoint (architecture ADR-1 / ADR-2 table:
`DELETE /battles/:id` sets `status: 'discarded'` — it is **not** a hard
collection delete, and **not** a `/conclude`-style POST sub-route), the `discard`
method on `useBattleActions`, and the destructive **Discard** UI (an explicit
`ConfirmDialog`, per UX-DR13) inside the existing 5.3 Battle View. It **does
not** add a `result` (discard has no outcome — `result` stays `null`), **does
not** change the battle schema, **does not** touch the realtime transport (5.4
already made `battle_discarded` valid/forwardable end-to-end), and **does not**
log anything (Epic 6).

## ⛔ HARD PREREQUISITE — Stories 5.1, 5.3, 5.4 must be implemented & merged first

5.1, 5.3, 5.4, **and 5.6** are `ready-for-dev` (documented) but **NOT yet
implemented in code** (verified on this branch — `backend/battle-service/`,
`frontend/api/battles.ts`, `frontend/hooks/useRoomBattle.ts`,
`frontend/hooks/useBattleActions.ts`, the
`frontend/app/munchkin/[roomNumber]/(battle)/` route, and any
`frontend/components/munchkin/ActiveBattleBanner.tsx` / `BattleSide*` /
`BattleConcludeAction.tsx` files **do not exist**; only
`frontend/components/ConfirmDialog.tsx` already exists — it is **pre-existing**,
cross-platform, and is exactly what 5.7 reuses). 5.7 directly extends seams those
stories build:

- **5.1** — `backend/battle-service` scaffold, the `Battle` model (`status:
  'active'|'concluded'|'discarded'`, `result:
  'players_win'|'monster_wins'|null`, `concludedAt: Date|null`, partial-unique-
  on-`active` index, `502 { message }` error shape, the `toJSON` `id`-alias
  transform), the publisher seam (`publisher.ts` interface +
  `NoopBattleEventPublisher` + `try/catch` call sites), `frontend/api/battles.ts`
  (`Battle`, `BattleStatus`, `BattleResult`, `apiRequest`),
  `useRoomBattle(roomId, userProfile)` (key `['battle', roomId]`, returns
  `{ battle, isLoading, errorMessage, refresh }`), `useBattleActions(roomId)`
  (originally `{ start, isLoading, errorMessage }`), the `(battle)` modal route
  shell.
- **5.3** — `PATCH /battles/:id` (full-replace, status-guarded → 409 when
  non-`active`), `useBattleActions.patch`, the **real two-sided Battle View**
  with the local draft + dirty/Clean/Saving Save model, the player/monster side
  components under `frontend/components/munchkin/`, the non-authoritative outcome
  comparison label. 5.7 adds the Discard action **outside** the draft mutation
  surface and **independent of draft dirty/clean state** (see Resolved #3 —
  unlike Conclude, Discard is *not* gated by a clean draft).
- **5.4** — the **real** `Sns/Redis BattleEventPublisher` + `createBattleEvent
  Payload` helper, env-driven Sns/Redis selection in `index.ts`/`lambda.ts`,
  SAM `BattleServiceRole` `sns:Publish` policy on `RoomCharacterEventsTopic`,
  the additive `room-notifications-service` / frontend `webSocket.ts` allowlists
  that already accept **all four** `battle_*` types (5.4 explicitly made
  `battle_concluded` **and** `battle_discarded` valid / forwardable end-to-end
  so 5.6/5.7 are a drop-in publish call), the shared multiplexed
  `RoomWebSocketClient`, and the `useRoomBattle` WS subscription that
  invalidates `['battle', roomId]` on any `battle_*` event — the mechanism that
  makes the Room View `ActiveBattleBanner` (5.2) **automatically disappear** for
  all connected clients on discard with **zero new UI code** in 5.7.

Stories **3.1**/**3.2** (epic "Depends on") are **done**. **Story 5.5** is
parallel/independent (frontend-only Battle View reconciliation); it does not
block 5.7 and 5.7 must not touch its tombstone-row code. **Story 5.2** (banner)
is unrelated — 5.7 must not edit it.

**5.6 (Conclude) is NOT a hard prerequisite** — discard is logically independent
of conclude (different endpoint, different HTTP method, different event,
different button tier). However, 5.6 and 5.7 both edit
`frontend/hooks/useBattleActions.ts` and
`frontend/app/munchkin/[roomNumber]/(battle)/index.tsx`. Order-independence
rule:
- If 5.6 is already merged: extend `useBattleActions` from `{ start, patch,
  conclude, ... }` → add `discard`; do **not** regress or restyle 5.6's
  Conclude block / `BattleConcludeAction`.
- If 5.6 is **not** merged: extend `useBattleActions` from `{ start, patch,
  ... }` → add `discard`; do **not** pre-stub `conclude` (project rule: no
  half-finished implementations — that is 5.6's job).
Either way the Discard region is a **new, disjoint** block; it must not depend
on the presence/absence of the Conclude block.

If a dev agent picks this up before 5.1 + 5.3 + 5.4 are merged, **HALT and
report the blocked dependency** — do not re-create the battle-service /
publisher / hook / Battle View / shared-socket / event-allowlist seams
(duplicate-work + divergence anti-pattern; the 5.4 "character realtime
byte-for-byte unchanged" regression bar still applies whenever the WS layer is
in play).

## ⚠️ Architecture-doc-vs-repo conflict — fully contained for 5.7

The architecture documents describe an idealized event/topic model that does
**not** match the running repo: a **single shared** SNS topic
`RoomCharacterEventsTopic` + Redis channel `room-character-events`; payload
shape `{ event, roomId, event_body, emittedAt, correlationId? }`; endpoints
inline in `src/app.ts` (**no `routes/` folder**); a single root
`backend/vitest.config.ts`; battle-service errors are `502 { message }` (**not**
`500 { message, details }`); **no `log-service` exists**. ADR-6 ("producers
publish to both" notifications + log topics) and ADR-12 (`LOG_TOPIC_ARN`
required env) describe the **future** Epic 6 state — 5.4 already locked the
rule: **single publish to `RoomCharacterEventsTopic` only — NO
`Promise.allSettled` / dual-topic fan-out, NO `LOG_TOPIC_ARN` env, NO
`log-service`** (`battle_discarded` is listed in the `logevents` `eventType`
enum and ADR-5's eventually-logged set, but logging is **Epic 6**, not 5.7).
**Follow the actual repo + 5.1/5.3/5.4 conventions; follow the architecture only
for the net-new discard decisions** (the discard HTTP method/contract, the
response code, the soft-delete semantics, the status guard). For 5.7 this
conflict is contained — 5.7 does **not** modify event names, payload contracts,
transports, the publisher class shapes, the event allowlists, or
`room-notifications-service`/`webSocket.ts`. Re-read 5.4's
"architecture-vs-repo" table if in doubt.

## Acceptance Criteria

1. **Discarding an active battle requires explicit confirmation before it is
   applied.** Given an active battle exists (`status: 'active'`), when I tap
   **Discard** from the Battle View, then a destructive `ConfirmDialog`
   (UX-DR13, cross-platform `frontend/components/ConfirmDialog.tsx`) is shown
   and **no request is sent** until I explicitly confirm; if I cancel/dismiss
   the dialog, the battle is unchanged, no request is sent, and I remain on the
   Battle View with the 5.3 draft untouched.

2. **Confirming the discard soft-deletes the battle (status → `discarded`),
   independent of the local draft.** Given I confirm the discard, when the
   request is submitted, then the client calls `DELETE /battles/:id`, the
   server (status-guarded, atomic) updates the battle to `status: 'discarded'`
   (and `updatedAt` via Mongoose `timestamps`) and responds `200` with the
   updated battle JSON; `result` remains `null`, `concludedAt` remains `null`,
   and `name`/`playerSide`/`monsterSide` are **unchanged** (discard is a
   soft-delete status flip, **not** a hard collection delete and **not** a
   Save — the 5.3 draft, dirty or clean, is irrelevant and is **not**
   persisted). A discarded battle can no longer be managed as an active battle
   (subsequent `PATCH` / `/conclude` / `DELETE` against it return `409`).

3. **Only active battles can be discarded.** Given a battle whose `status` is
   already `concluded` or `discarded`, when a discard is attempted, then the
   server responds `409 { message: 'Battle is not active' }` (ADR-8 status
   guard) and the persisted state is unchanged; the same `409` is returned for
   a concurrent double-discard (or discard-vs-conclude) race (last writer
   loses). A missing battle → `404 { message: 'Battle not found' }`; a
   malformed `:id` (`CastError`) → `404`.

4. **The room leaves battle state, locally and for every other connected
   player, in real time.** Given a battle has been discarded successfully via
   5.7's flow, when the discard mutation resolves on my client, then `['battle',
   roomId]` is invalidated (refetch returns `null` because
   `GET /battles?roomId=X&status=active` no longer matches), the
   `ActiveBattleBanner` (Story 5.2) is no longer rendered on my Room View, the
   Room View's Battle button reverts to its "no active battle" affordance, and
   the Battle View modal dismisses back to the Room View (no auto-navigation
   *forward* — only the dismiss of the modal the user is already in, per
   ADR-10/ADR-4). And given another player is connected to the same room when
   the battle is discarded, when the `battle_discarded` event is published by
   `battle-service` and fanned out by `room-notifications-service` (the
   **already-real, already-allowlisted** transport from Story 5.4), then their
   client's `useRoomBattle` WS handler invalidates `['battle', roomId]`, the
   active-battle query refetches `null`, their Room View `ActiveBattleBanner`
   disappears with **zero new UI code in 5.7 or 5.2**, any open Battle View on
   their device renders the existing 5.1 `battle === null` empty/dismiss path,
   and **no auto-navigation** occurs (ADR-10).

## Scope Boundaries (READ FIRST — prevents over-build and regressions)

**IN scope for 5.7:**

- **Backend (`battle-service`, created by 5.1; PATCH added by 5.3; real
  publisher added by 5.4):**
  - `DELETE /battles/:id` route (in `src/app.ts`, **inline** — repo convention;
    **no `routes/` folder** even though the architecture diagram shows one).
    Not-found (`404`, incl. `CastError`), status guard (`409` when not
    `active`), success `200` + updated battle JSON, unexpected `502 { message:
    'Unexpected error' }` (battle-service convention from 5.1). **No request
    body** — discard takes no `result` and validates nothing from the body
    (ignore any body silently; do **not** `400`).
  - Add a `findActiveByIdAndDiscard(id: string, discardedAt?: never)` —
    actually: `findActiveByIdAndDiscard(id: string)` helper to the
    `BattleModelLike` wrapper in `src/service.ts` performing **one atomic
    Mongo update**: `Battle.findOneAndUpdate({ _id: id, status: 'active' }, {
    $set: { status: 'discarded' } }, { new: true, runValidators: true })`. No
    `result`, no `concludedAt`, no `discardedAt` (the schema has **no**
    `discardedAt` field — see "Battle schema" below; do **not** add one).
    Returning `null` is the route's signal to disambiguate `404` vs `409` via
    a follow-up `findById` (see Task 2). This avoids the read-then-write race
    that would let two concurrent discards (or a discard racing a conclude)
    both "succeed".
  - Call **5.4's real** `publisher.publish(createBattleEventPayload({ event:
    'battle_discarded', roomId, battleId, correlationId }))` after a successful
    transition, inside the **existing** `try/catch` that
    `console.error`s-but-never-rethrows (publish failure must never fail the
    HTTP response). The `404`/`409` paths publish **nothing**.
  - Backend tests (co-located `app.test.ts`/`service.test.ts`, `supertest`,
    mock publisher + mock model injected per the 5.1/5.3/5.6 pattern) +
    `sam/events/battle-delete-battle.json`.
  - SAM (`template.yaml`): add a `BattleDelete` HttpApi event for `DELETE
    /battles/{id}` to `BattleServiceFunction.Events` (mirror the existing
    `BattlePatch` event shape). **No** new IAM, **no** new topic, **no** new
    env var — 5.4 already added the `sns:Publish` policy + the topic ARN env.
  - `nginx.conf`: confirm the `/battles` location block already proxies
    `DELETE /battles/:id` (it mirrors `/characters`, whose
    `Access-Control-Allow-Methods` includes `DELETE`). No change expected —
    note "verified" in completion notes.
- **Frontend:**
  - `api/battles.ts`: add `discardBattle(battleId: string): Promise<Battle>`
    → `apiRequest<Battle>('/battles/${encodeURIComponent(battleId)}',
    { method: 'DELETE' })`. No body. Surface the `409` distinctly via
    `ApiError` so callers can recover (another player already concluded /
    discarded). Do **not** redefine `Battle`/`BattleStatus`/`BattleResult` —
    reuse 5.1's exports.
  - `hooks/useBattleActions.ts`: add `discard: (battleId) => Promise<Battle>`
    as a `useMutation`; `onSettled` invalidate `['battle', roomId]`
    (consistent with 5.1's `start`, 5.3's `patch`, 5.6's `conclude`). Extend
    the return to include `discard` alongside whatever siblings exist (`{
    start, patch[, conclude], discard, isLoading, errorMessage }`). Aggregate
    `isLoading`/`errorMessage` across all mutations the same way 5.3/5.6 do.
  - `app/munchkin/[roomNumber]/(battle)/index.tsx`: add the **Discard** UI
    region inside 5.3's existing Battle View — a single destructive **Discard**
    button (`danger` tier) that opens an explicit `ConfirmDialog` (UX-DR13);
    only on confirm does it call `discard(battle.id)`. On success: dismiss the
    Battle View modal back to Room View (mirror 5.1's modal back-nav; typically
    `router.back()`). On `409`: surface a non-modal inline error and let
    `useRoomBattle`'s invalidation reconcile state (the refetched `null` drives
    the dismiss). Do **not** modify 5.3's draft/Save model, the monster/player
    side components, the totals formula, the comparison indicator, 5.5's
    tombstone rendering, or (if present) 5.6's Conclude block.
  - **Discard is NOT gated by the 5.3 draft dirty/clean state** (Resolved #3):
    discarding throws the entire battle away, so unsaved draft changes are moot
    — there is no "did Discard include my unsaved bonus?" ambiguity (unlike
    Conclude in 5.6). Discard is **always enabled** while a battle is active
    (disabled only while `isDiscarding` is in flight). It is the **destructive
    (`danger`) tier**, not the accent-primary tier, so it does **not**
    participate in 5.6's UX-DR19 "one enabled primary per layer" Save↔Conclude
    arbitration.
  - New small presentational component for the discard UI block under
    `frontend/components/munchkin/` (`BattleDiscardAction.tsx`; PascalCase
    file, `memo`, explicit prop interface, default export, `StyleSheet` at
    bottom referencing `AppTheme`, stable `testID`s + accessibility — mirror
    5.3 components / `VioletButton` / (if present) 5.6's
    `BattleConcludeAction`). It renders the danger Discard button **and** the
    controlled `ConfirmDialog`; the screen owns the mutation/navigation and the
    confirm-visibility state.
  - Tests: co-located component test (Discard button + ConfirmDialog
    open/confirm/cancel + disabled-while-discarding + accessibility); extend
    `frontend/api/battles.test.ts` (mock `@/api/http`; URL/encoding,
    `DELETE` method, no body, `409` surfacing); extend
    `frontend/hooks/useBattleActions.test.ts` (`discard` calls `discardBattle`,
    invalidates `['battle', roomId]`); extend the Battle View route test under
    `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...` (NOT under
    `frontend/app`) — AC1 confirm-gate (no request before confirm; cancel =
    no-op), AC2/AC4 happy path + back-nav, AC3 `409` surfacing.
  - Cross-surface verification (backend + frontend typecheck/test/coverage;
    manual two-client web smoke).

**OUT of scope (explicitly owned by other stories / future epics — do NOT build
here):**

- ❌ **Conclude** (`POST /battles/:id/conclude`, `status → concluded`, the
  required `result`, the two-option result selector, `BattleConcludeAction`) →
  **Story 5.6**. Symmetric to 5.7 but distinct: it requires a `result` and uses
  no `ConfirmDialog`; 5.7 requires a `ConfirmDialog` and uses no `result`. Do
  **not** add/modify a Conclude button, `useBattleActions.conclude`, or the
  conclude endpoint in this story.
- ❌ **Hard delete.** `DELETE /battles/:id` is a **soft delete** (ADR-1: sets
  `status: 'discarded'`; the partial unique index is on `status:'active'` only,
  so the discarded doc stays in the collection for Epic 6 history). Do **not**
  call `deleteOne`/`findByIdAndDelete`/`remove` — that would destroy the
  historical record Epic 6 needs and break ADR-1.
- ❌ **A `discardedAt` (or `result`) write.** The Battle schema (5.1
  authoritative; architecture `core-architectural-decisions.md#battle-schema`)
  has **only** `concludedAt: Date|null` — there is **no** `discardedAt` field.
  Discard sets **only** `status: 'discarded'`; `result` stays `null`,
  `concludedAt` stays `null`, `updatedAt` is auto-set by Mongoose
  `timestamps`. Do **not** add a schema field, do **not** set `result`, do
  **not** "improve" the model.
- ❌ **Realtime / WebSocket plumbing.** 5.4 already (a) made the publisher
  real, (b) wired Sns/Redis selection from env, (c) added the
  `BattleServiceRole` `sns:Publish` policy + `ROOM_CHARACTER_EVENTS_TOPIC_ARN`
  env, (d) added all four `battle_*` types (incl. `battle_discarded`) to
  `room-notifications-service` `EVENT_TYPES` + the `event_body.battleId`
  validation + the parsed-`event_body` forward, (e) widened frontend
  `isValidNotificationEvent` to accept all four `battle_*` types, (f)
  introduced the shared multiplexed `RoomWebSocketClient` registry, (g) added
  the `useRoomBattle` WS subscription that invalidates `['battle', roomId]` on
  any `battle_*` event. **5.7 must not touch any of that** — only add the
  `publisher.publish('battle_discarded')` call at its new DELETE endpoint.
- ❌ **`PATCH` semantics or the Battle schema.** 5.3 forbids PATCH from setting
  `status`/`result`. 5.7 uses the dedicated `DELETE` endpoint and does **not**
  modify `Battle.ts`, the schema, the indexes, the `toJSON` transform, or
  5.3's PATCH whitelist.
- ❌ **`log-service` / `battle_discarded` logging / dual-topic fan-out** →
  **Epic 6**. 5.7 publishes only to the existing `RoomCharacterEventsTopic`
  (one publish, no `Promise.allSettled`, no `LOG_TOPIC_ARN`). The doc-only
  ADR-6/ADR-12 dual-topic model is contained in 5.4's "architecture-vs-repo"
  rule.
- ❌ **Re-creating the 5.1/5.2/5.3/5.4/5.6 seam.** Battle-service
  scaffold/model/POST/GET/PATCH (+conclude if 5.6 merged), `useRoomBattle`
  (HTTP+WS), `useBattleActions.start`/`patch`(/`conclude`),
  `ActiveBattleBanner`, `(battle)` modal route + layout, the publisher
  Sns/Redis/Noop classes, the shared WebSocket registry, the
  `room-notifications-service` allowlist, the pre-existing
  `frontend/components/ConfirmDialog.tsx`. **Consume; do not redefine.**
- ❌ **Touching the Room View / `ActiveBattleBanner`.** The banner disappears
  automatically because `useRoomBattle` invalidates and refetches; the
  active-battle query returns `null` after `status='discarded'`. Do not add a
  banner-specific dismissal path or a banner change.
- ❌ **Client-side battle-state mutation** (rewriting the local battle cache to
  `discarded`) instead of a refetch — let 5.4's WS-invalidate path + the
  mutation's `onSettled` invalidate drive the refetch (single source of truth
  = the server query; AC4 anti-flicker rule).
- ❌ **Optimistic-echo suppression** like `useRoomCharacters`'
  `recentLocalUpdateByCharacter`. The battle query is a single-object refetch;
  a redundant invalidation after the local discard is cheap and correct (5.4
  explicitly rejected porting that machinery).
- ❌ **Auto-navigation from Room View into Battle View on remote discard**, or
  any forward navigation triggered by a `battle_discarded` WS event. ADR-10:
  realtime never force-navigates. The local discard action **dismisses**
  (back-navigates) the Battle View modal the user is already in — that is the
  only permitted navigation in this story.
- ❌ **A native `Alert.alert` for the confirm step.** `Alert.alert` is
  iOS/Android only and breaks the web target (cross-platform parity is a
  release gate). Use the **pre-existing cross-platform**
  `frontend/components/ConfirmDialog.tsx` (Resolved #2). Do not duplicate or
  reinvent a confirm dialog.

## Tasks / Subtasks

- [ ] **Task 1 — Backend: atomic soft-discard on the battle model wrapper**
      (AC: 2, 3)
  - [ ] In `backend/battle-service/src/service.ts`, extend the
    `BattleModelLike` interface (5.1 added `find`/`create`/`findById`; 5.3
    added `findByIdAndUpdate`; 5.6, if merged, added
    `findActiveByIdAndConclude`). Add `findActiveByIdAndDiscard(id: string):
    Promise<BattleDoc | null>` performing **one atomic Mongo update**:
    `Battle.findOneAndUpdate({ _id: id, status: 'active' }, { $set: { status:
    'discarded' } }, { new: true, runValidators: true })`. **No `result`, no
    `concludedAt`, no `discardedAt`** in the `$set`. Returning `null` is the
    route's signal to disambiguate `404` vs `409` via a follow-up `findById`
    (Task 2). This avoids the read-then-write race that would let two
    concurrent discards (or a discard racing a conclude) both succeed.
  - [ ] Mirror the existing wrapper's logging style (`console.info` keys
    `battleId`, `roomId`, `status`) and response shaping (return the Mongoose
    doc through `toJSON` so the API exposes `id` not `_id`/`__v`, matching
    5.1's transform). Pass `null` through unchanged when no document matches.
  - [ ] Keep the wrapper type exported so `app.test.ts`/`service.test.ts` can
    inject a mock model with `vi.fn()` per method (5.1/5.3/5.6 test pattern).

- [ ] **Task 2 — Backend: `DELETE /battles/:id` route** (AC: 2, 3)
  - [ ] Add `app.delete('/battles/:id', ...)` **inline in `src/app.ts`** (repo
    convention — no `routes/` folder). Use the same `:id` param style as 5.3's
    PATCH (`/battles/:id`), not `{id}`.
  - [ ] **No body validation, no `result`.** Discard accepts no request body;
    ignore any body silently (do **not** `400`). The only input is the `:id`
    path param.
  - [ ] **Discard path (atomic + status guard):**
    1. Call `findActiveByIdAndDiscard(id)`.
    2. **If a document is returned:** the discard succeeded — respond `200`
       with the updated battle JSON (direct resource, no envelope), then
       publish (Task 3).
    3. **If `null` is returned (no match for `_id: id, status: 'active'`):** do
       a follow-up lookup `findById(id)` to disambiguate:
       - Battle missing → `404 { message: 'Battle not found' }`.
       - Battle exists but `status !== 'active'` → `409 { message: 'Battle is
         not active' }`. **No publish on either path.**
    4. Catch Mongoose `CastError` (bad ObjectId) → `404` (mirror
      5.3/character-service). All other errors → `next(error)` →
      `502 { message: 'Unexpected error' }` (battle-service convention from
      5.1; **never** `500`, **never** `{ message, details }`).
  - [ ] Do **not** mutate `name`/`playerSide`/`monsterSide`/`result`/
    `concludedAt` here (AC2 — discard is a status-only soft delete). PATCH
    (5.3) is the only path that writes the side fields.
  - [ ] Backend tests (co-located `app.test.ts`, supertest, mock model + mock
    publisher injected per 5.1/5.3/5.6 pattern). Cover:
    - Success: `DELETE /battles/:id` returns `200` + JSON containing `id`,
      `status:'discarded'`, **`result:null`**, **`concludedAt:null`**,
      **unchanged** `name`/`playerSide`/`monsterSide` (assert against the
      input fixture).
    - `404`: battle not found (mock returns `null` for both
      `findActiveByIdAndDiscard` and `findById`); `CastError` thrown
      (`error.name === 'CastError'` → `404`).
    - `409`: battle exists but `status='concluded'` or `'discarded'` (mock
      returns `null` from `findActiveByIdAndDiscard`, then a doc with
      non-`active` status from `findById`); assert **no publish**.
    - `502`: unexpected throw from the model → response is `{ message:
      'Unexpected error' }`, status `502` (NOT `500`, NOT `{ message,
      details }`).
    - Body-ignored: `DELETE` with a stray JSON body still succeeds `200` and
      nothing extra is written (inspect the mock — only the status `$set`).
    - **Publish behaviour:** on success the mock publisher is called
      **exactly once** with `{ event: 'battle_discarded', roomId, event_body:
      { battleId }, emittedAt, correlationId? }` matching the discarded
      battle; on `404`/`409` the publisher is **not** called; a throwing
      publisher does **not** fail the `200` response.
    - Status-guard race: simulate a concurrent double-discard (and a
      discard-vs-conclude) — first call returns the doc (success → publish),
      second call returns `null` from `findActiveByIdAndDiscard` and a doc
      with `status='discarded'` (or `'concluded'`) from `findById` → `409` +
      no publish.

- [ ] **Task 3 — Backend: publish `battle_discarded` on success** (AC: 2, 4)
  - [ ] After the discard resolves, call `publisher.publish(create
    BattleEventPayload({ event: 'battle_discarded', roomId: battle.roomId,
    battleId: battle.id, correlationId }))` inside the **existing** `try/catch`
    that `console.error`s but never rethrows. **Mirror `character-service/
    src/app.ts` POST/PATCH/DELETE publish pattern verbatim** (the 5.4
    reference). Reuse 5.4's `createBattleEventPayload` helper — do **not**
    define a new payload factory and do **not** pass `result`/`concludedAt`
    into the payload (`event_body.battleId` only).
  - [ ] `correlationId` may be propagated from `req.header('x-correlation-id')`
    if the existing battle-service routes do so (check 5.1 `POST` / 5.3
    `PATCH` / 5.6 `conclude` handlers — match whatever they do; do not invent
    a new correlation header).
  - [ ] The HTTP success must not depend on publish success — replicate
    `character-service`'s `try { await publisher.publish(...) } catch (e) {
    console.error(...) }` then `res.status(200).json(...)` ordering.
  - [ ] Sanity-check (no code change — verify in completion notes): 5.4 has
    already added the `sns:Publish` policy on `BattleServiceRole` + the
    `ROOM_CHARACTER_EVENTS_TOPIC_ARN` env on `BattleServiceFunction`, plus
    `BATTLE_EVENTS_REDIS_URL` + `ROOM_CHARACTER_EVENTS_CHANNEL` on the
    `battle-service` `docker-compose` block. **No new env, no new IAM** in
    5.7. If you find yourself editing IAM or adding env vars, you are out of
    scope.

- [ ] **Task 4 — SAM: HttpApi event for the delete route** (AC: 2)
  - [ ] In `backend/sam/template.yaml`, add a new HttpApi event `BattleDelete`
    to `BattleServiceFunction.Events`:

    ```yaml
    BattleDelete:
      Type: HttpApi
      Properties:
        ApiId: !Ref CloudHttpApi
        Path: /battles/{id}
        Method: DELETE
    ```

    Mirror the shape used for the existing `BattlePatch` event (path style
    `{id}` is API-Gateway syntax — **only** in the SAM event declaration; the
    Express route still uses `:id`). Do **not** introduce a `{proxy+}` route —
    the existing per-method pattern is the established convention. (`PATCH
    /battles/{id}` and `DELETE /battles/{id}` are distinct HttpApi events on
    the same path — mirror how `character-service` declares per-method events
    for `/characters/{characterId}`.)
  - [ ] Add `backend/sam/events/battle-delete-battle.json`: a HttpApi `DELETE
    /battles/{id}` test event modelled on the existing
    `battle-patch-battle.json` (5.3) envelope, with `pathParameters.id` a
    sample ObjectId string and **no `body`** (or `body: null` — match how the
    existing DELETE events for character-service are shaped; do not invent a
    new envelope).
  - [ ] **No** new IAM, **no** new SNS topic, **no** new env. If
    `BattleServiceRole` does not yet exist on `main` because 5.4 hasn't
    merged, that is the HARD PREREQUISITE — HALT, do not invent it here.
  - [ ] `nginx.conf`: 5.1's `/battles` location block (mirroring the
    `/characters` block — preflight `OPTIONS`, `proxy_set_header`, CORS
    `Access-Control-Allow-Methods` including `DELETE`) already proxies
    `DELETE /battles/:id`. No change expected — note "verified" in completion
    notes. Do **not** add a more-specific location block.

- [ ] **Task 5 — Frontend `api/battles.ts`: `discardBattle`** (AC: 2, 3)
  - [ ] Add `discardBattle(battleId: string): Promise<Battle>` →
    `apiRequest<Battle>(\`/battles/${encodeURIComponent(battleId)}\`,
    { method: 'DELETE' })`. **No `body`.** Use `apiRequest` from `@/api/http`
    only — never raw `fetch`/`axios`. (The retry policy in `apiRequest` is
    fine: `409` is **not** retried — only `408/429/≥500` are — so a `409`
    surfaces as `ApiError` on the first attempt.)
  - [ ] Do **not** redefine `Battle`/`BattleStatus`/`BattleResult`/`BonusItem`/
    `MonsterItem` — reuse 5.1's exports. `ApiError` (status, details)
    propagates; callers distinguish `409` (already concluded/discarded —
    recoverable, prompt a refetch) from `404` (battle missing).

- [ ] **Task 6 — Frontend `hooks/useBattleActions.ts`: add `discard`**
      (AC: 2, 4)
  - [ ] Add `discard(battleId: string): Promise<Battle>` as a `useMutation`
    calling `discardBattle`. `onSettled`: `queryClient.invalidateQueries({
    queryKey: ['battle', roomId] })` (consistent with `start`/`patch`
    /`conclude`). Keep the existing siblings; return `{ start, patch[,
    conclude], discard, isLoading, errorMessage }`. Aggregate
    `isLoading`/`errorMessage` across all mutations the same way 5.3/5.6 do.
  - [ ] Do **not** add/modify `conclude` (Story 5.6 — if not merged, it
    doesn't exist yet; if merged, leave it untouched). Do **not** mutate the
    local `['battle', roomId]` cache to `discarded` synchronously — let the
    `onSettled` invalidate trigger the refetch; the refetch returns `null`
    (`status=active` no longer matches), which drives AC4.

- [ ] **Task 7 — Frontend Battle View: Discard UI block + confirm gate +
      post-success navigation** (AC: 1, 2, 4)
  - [ ] In `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` (the 5.3
    real UI), add a new **Discard** UI region. Place it as the destructive
    action, visually separated from Save / (if present) Conclude — below them,
    with clear separation (e.g. a divider or extra `AppTheme.spacing.lg`).
    Do **not** restructure 5.3's layout, the draft model, the Save button,
    the monster/player side components, the totals formula, the comparison
    indicator, 5.5's tombstone rendering, or 5.6's Conclude block.
  - [ ] **State (`useState`):** `confirmVisible: boolean` (default `false`).
    Tapping the Discard button sets `confirmVisible = true` (this **does not**
    send a request — AC1). The `ConfirmDialog`'s confirm action calls
    `discard(battle.id)`; its cancel/dismiss sets `confirmVisible = false`
    and does nothing else (AC1: battle unchanged, 5.3 draft untouched).
  - [ ] **Discard button** (single destructive button): label `Discard`,
    **destructive tier** — `AppTheme.colors.danger` (`#922525`) background,
    white/`textPrimary` text (per UX consistency-patterns destructive row).
    `testID="battle-discard-button"`. **Enabled whenever a battle is active**
    — it is **NOT** gated by the 5.3 draft dirty/clean state (Resolved #3:
    discard throws the whole battle away, so unsaved changes are irrelevant;
    no "did Discard include my unsaved bonus?" ambiguity exists). Disabled
    **only** while `isDiscarding` (the discard mutation is in flight) →
    `AppTheme.colors.surfaceSubtle` background + `textMuted` text per
    UX-DR19's disabled-state recipe; label may change to `Discarding…`. Do
    **not** disable it when the draft is dirty; do **not** route it through
    5.6's Save↔Conclude one-primary arbitration (Discard is the `danger`
    tier, a separate tier — it coexists with the primary tier).
  - [ ] **Confirm step (AC1, UX-DR13):** render the **pre-existing**
    `frontend/components/ConfirmDialog.tsx` (cross-platform — works on
    iOS/Android/web; do **not** use `Alert.alert`). Controlled by
    `confirmVisible`. Destructive copy, e.g. title `"Discard battle?"`, body
    `"This battle will be discarded and removed from the room. This can't be
    undone."`, confirm label `"Discard"` styled `danger`, cancel label
    `"Keep battle"`. Match `ConfirmDialog`'s actual prop API (read the
    component — do not assume; mirror how other callers in the repo use it,
    e.g. any existing destructive confirm such as character removal in Story
    3.10's UI if present). **No request is sent until confirm** (AC1).
  - [ ] **On confirm:** call `useBattleActions().discard(battle.id)`. On
    success: set `confirmVisible=false` and dismiss the Battle View modal
    back to Room View (same dismiss/back call 5.1's modal supports —
    typically `router.back()`; match 5.1's actual implementation, do not
    invent a new path). The Room View's `useRoomBattle` is already
    invalidated by the mutation `onSettled`, so by the time Room View is in
    front again the banner is gone (AC4). On `409`: keep
    `confirmVisible=false`, surface a non-modal inline error in the Battle
    View (mirror Room View's `actionError`-style label / 5.6's `409` inline
    pattern if present); the `['battle', roomId]` invalidation will refetch
    `null` and the modal dismisses naturally on the next render (defensive:
    do not crash on `battle === null` after a `409` — render the existing
    5.1 loading/empty state). On other errors: surface the message inline; do
    not auto-dismiss; do not retry.
  - [ ] **Defensive Battle-View-after-null guard:** when `battle` becomes
    `null` on the next refetch (because discard succeeded — local or remote),
    the existing 5.1 loading/error rendering must not infinite-loop or flash
    spinner; render the normal "no active battle" empty state (already wired
    by 5.1 for the cold-load case) and let the modal dismiss. Do **not** add
    a new "battle just discarded" empty state — it is the same path 5.6 uses
    for conclude.
  - [ ] **Remote discard (AC4) — zero new screen code:** if another player
    discards while this user has Battle View open, 5.4's WS subscription on
    `useRoomBattle` invalidates `['battle', roomId]`, the refetch returns
    `null`, the Battle View hits the same null-guard above, the modal is
    dismissed, and 5.2's `ActiveBattleBanner` (a pure `battle !== null`
    render) disappears. **Do not add WS handling here**; 5.4 is the single
    source of truth.
  - [ ] Style strictly via `AppTheme` tokens (`danger`, `surface`,
    `surfaceSubtle`, `textPrimary`, `textMuted`, `spacing.{xs,sm,md,lg}`,
    `radius.md`, `typography.labelMd`/`caption`). **No hardcoded
    hex/px/font-size literals** (project rule). No new colour/spacing token.
  - [ ] Extract the discard UI into a presentational component under
    `frontend/components/munchkin/BattleDiscardAction.tsx`. Props (explicit
    interface): `{ onConfirmDiscard: () => void; confirmVisible: boolean;
    onRequestConfirm: () => void; onCancelConfirm: () => void; isDiscarding:
    boolean }`. It renders the danger Discard button **and** the controlled
    `ConfirmDialog`. The screen owns the mutation/navigation and the
    `confirmVisible` state; the component is presentational (no hooks beyond
    `memo`/`useCallback`-style internals, no data fetching, no navigation).
    Mirror 5.3 component conventions (PascalCase file, `memo`-wrapped
    function, default export, `StyleSheet.create` at bottom referencing
    `AppTheme`, stable `testID`s + accessibility props).

- [ ] **Task 8 — Tests** (AC: 1, 2, 3, 4)
  - [ ] **Frontend api** (`frontend/api/battles.test.ts`, co-located, jsdom):
    mock `@/api/http` `apiRequest`. Assert `discardBattle('abc')` calls
    `apiRequest('/battles/abc', { method: 'DELETE' })` with **no `body`** key
    (assert the second arg has no `body`). Assert path is URL-encoded (pass
    `'a/b'` → `/battles/a%2Fb`). Assert a `409` (`ApiError.status === 409`)
    propagates; assert no retry on `409` (mock-call-count integration check —
    `apiRequest` only retries `408/429/≥500`).
  - [ ] **Frontend hook** (`frontend/hooks/useBattleActions.test.ts`,
    co-located, jsdom): wrap in `QueryClientProvider`; mock `@/api/battles`
    `discardBattle`. Assert `discard('id')` calls `discardBattle('id')` once;
    on success `queryClient.invalidateQueries({ queryKey: ['battle', roomId]
    })` is invoked (spy on `invalidateQueries`). Assert an `ApiError` 409
    surfaces in `errorMessage` and does **not** throw uncaught. Aggregated
    `isLoading` across `start`/`patch`(/`conclude`)/`discard` still works (do
    not regress 5.1/5.3/5.6 assertions).
  - [ ] **Component** (`frontend/components/munchkin/BattleDiscardAction.test.
    tsx`, co-located, Vitest+jsdom + `@testing-library/react`): renders the
    danger Discard button; tapping it with `confirmVisible=false` calls
    `onRequestConfirm` and does **NOT** call `onConfirmDiscard` (AC1 — no
    request before confirm); with `confirmVisible=true` the `ConfirmDialog`
    is shown; confirming calls `onConfirmDiscard`; cancelling calls
    `onCancelConfirm` and not `onConfirmDiscard`; with `isDiscarding=true`
    the Discard button is disabled and renders the `surfaceSubtle`
    background. Assert `accessibilityRole="button"` + a destructive/danger
    `accessibilityLabel` on the Discard button; assert the confirm action
    is reachable by its accessible label.
  - [ ] **Battle View route test** (`frontend/__tests__/app/munchkin/
    [roomNumber]/(battle)/...`, **NOT** under `frontend/app` — Expo Router
    forbids non-route files there). Extend the 5.3 (and, if merged, 5.6)
    harness: `vi.hoisted` mutable refs, `vi.mock` for `@/hooks/useRoomBattle`,
    `@/hooks/useBattleActions`, the character hook, `@/hooks/useUser`,
    `expo-router` (with a `router.back` spy per 5.1's actual mock shape).
    Assert:
    - **AC1 confirm gate:** active battle mocked; tap Discard → the
      `ConfirmDialog` appears and `useBattleActions().discard` is **NOT**
      called yet; tap **cancel** → dialog closes, `discard` still not called,
      `router.back` not called, the 5.3 draft is untouched.
    - **AC2/AC4 happy path:** active battle (assert it works with **both** a
      clean and a dirty 5.3 draft — Discard must be enabled in both, proving
      Resolved #3); tap Discard → confirm; `discard` is called with
      `battle.id`; on mocked success `router.back()` is invoked exactly once
      and `['battle', roomId]` invalidation fired.
    - **AC3 `409` recovery:** mock `discard` to reject with `new
      ApiError('Battle is not active', 409, ...)`; assert an inline error
      surfaces, `router.back` is **not** called, and the `['battle', roomId]`
      invalidation still fires (screen recovers when refetched battle is
      `null`).
    - **Discard-disabled while `isDiscarding`:** mock the mutation pending;
      assert Discard disabled (and optionally `Discarding…`).
    - **Battle View dismissal on `null` refetch (AC4):** flip mocked
      `useRoomBattle().battle` active → `null` between renders (simulate a
      5.4 WS-driven remote-discard refetch); assert the modal hits the 5.1
      empty/null state and dismisses (match 5.1's existing behaviour — do
      not invent new empty UI).
  - [ ] **Backend** (Task 2 covers most). Verify root `backend/vitest.
    config.ts` already includes `battle-service/src/**/*.test.ts` (5.1 added
    it) — no config change. Run `npm test`/`test:coverage` from `backend/`;
    assert **character-service & room-notifications-service tests still pass
    unchanged** (no regression — character realtime is the 5.4 gating bar).
  - [ ] Meet the **70% line coverage floor** for both pipelines. Frontend
    coverage `include` is `api/**`,`config/**`,`hooks/**`; 5.7's covered code
    is in `api/` + `hooks/` (Tasks 5+6 + their tests); the presentational
    component and route screen are not in coverage scope by config. **Do not
    widen the coverage `include` scope** to chase numbers — assert behaviour;
    coverage is a floor not the goal (project rule).

- [ ] **Task 9 — Cross-surface verification** (AC: 1, 2, 3, 4)
  - [ ] Backend: from `backend/`, `npm run typecheck` and `npm test`/
    `test:coverage` pass with the DELETE route + service-wrapper change.
    **Character-service and room-notifications-service existing tests must be
    untouched and still green** (5.7 makes no changes there — any regression
    = out-of-scope edit).
  - [ ] Frontend: from `frontend/`, strict TS typecheck + `vitest run
    --coverage` pass (≥70% line floor, no regression in existing
    `useCharacters`/`webSocket`/`useRoomWebSocket`/Battle View / Room View /
    `useRoomBattle` / `useBattleActions` / (if merged) 5.6 Conclude tests).
  - [ ] Local manual smoke (`docker-compose up`, after 5.1 + 5.3 + 5.4
    merged), two browser tabs (web), same room, two device identities:
    - Tab A starts a battle, opens Battle View, adds participants + a monster
      + a bonus (leave the draft **dirty** on purpose). Tab B opens the same
      Battle View.
    - Tab A taps **Discard** with the draft still dirty → the `ConfirmDialog`
      appears (proving Discard is **not** dirty-gated). Tap **cancel** →
      dialog closes, battle still active, draft still dirty (AC1).
    - Tap **Discard** again → confirm. Battle View dismisses on Tab A; Room
      View on Tab A no longer shows the banner; the Battle button reverts to
      "no active battle". The discarded battle is **still in the collection**
      with `status:'discarded'` (verify in Mongo / via a `GET /battles?
      roomId=X&status=discarded` if such a query exists — soft delete, not
      hard delete; Epic 6 needs the record).
    - **Tab B** (still on its open Battle View): the modal dismisses to Room
      View on the next refetch (driven by the `battle_discarded` WS event ⇒
      `['battle', roomId]` invalidate ⇒ `getActiveBattle` returns `null`);
      the `ActiveBattleBanner` disappears with **no extra interaction**; no
      auto-navigation anywhere (ADR-10).
    - DevTools Network/WS: **one** `/ws` connection per tab (5.4 shared
      multiplexed socket regression bar) and a single `battle_discarded`
      event delivered.
    - Status-guard race: Tab A and Tab B both confirm Discard near-
      simultaneously (or one Discards while the other Concludes). One returns
      `200`; the other `409`. The `409`-side surfaces the inline error and
      the next refetch reconciles the UI without the modal looping.
    - Make a plain character edit on Room View while the discard is in
      flight; assert the character card still flashes/realtime-updates (5.4
      "character realtime byte-for-byte unchanged" regression).
    - Confirm the `ConfirmDialog` renders and is operable on **web** (the
      `Alert.alert` trap would silently no-op or break here); note any
      platform (iOS/Android) not verified.
  - [ ] No new env, no new IAM, no new SNS topic, no infra/transport surface
    touched. If you find yourself editing `room-notifications-service/`,
    `frontend/api/webSocket.ts`, `frontend/hooks/useRoomWebSocket.ts`,
    `useRoomBattle.ts`'s WS subscription, or `BattleServiceRole.Policies`,
    you are out of scope (re-read 5.4 + Scope Boundaries).

## Dev Notes

### Why this story is small (the key insight)

5.4 already did the **hard** realtime work for `battle_discarded`:
- The publisher `Sns/Redis BattleEventPublisher` + `createBattleEventPayload(...)`
  helper are real and accept all four `battle_*` types — including
  `battle_discarded` (5.4 Task 1).
- `BattleServiceRole` has `sns:Publish` on `RoomCharacterEventsTopic` (5.4 Task
  4 via SAM).
- `room-notifications-service` `EVENT_TYPES` already contains `battle_discarded`
  and validates `event_body.battleId` (5.4 Task 4); fan-out forwards
  `event_body` as parsed (`{ battleId }` survives delivery).
- `frontend/api/webSocket.ts` `isValidNotificationEvent` already accepts
  `battle_discarded` with `event_body.battleId`.
- `useRoomBattle` has a WS subscription that invalidates `['battle', roomId]`
  on any `battle_*` event, so a remote `battle_discarded` automatically
  refetches the active-battle query, which returns `null` (the partial-unique
  `status:'active'` index + `?status=active` filter no longer match), and
  5.2's `ActiveBattleBanner` (a `battle !== null` render of
  `useRoomBattle().battle`) disappears for all connected clients.

So 5.7 is **one new endpoint, one new mutation, one Discard button +
ConfirmDialog**. AC4 (remote) and the banner-removal half of AC4 (local) are
satisfied with **zero new realtime code**. AC4's local-client side is a single
`router.back()`-equivalent on mutation success plus the existing 5.1 `battle
=== null` empty-state handling. This is a deliberate epic invariant: 5.6/5.7
are drop-in endpoints + drop-in mutations + drop-in UI. **Resist the
temptation** to "improve" the realtime path, change event names, add a
discard animation, or auto-navigate Room View — none are in 5.7's ACs and all
are forbidden by ADR-10 / the 5.4 regression bar.

### Authoritative Discard HTTP contract (architecture ADR-1 + ADR-2 + repo conventions)

```
DELETE /battles/:id          (no request body)
```

| Outcome | HTTP | Body |
|---|---|---|
| Success — battle was `active`, soft-deleted to `discarded` | `200` | `Battle` JSON (direct, `id` not `_id`; `status:'discarded'`, `result:null`, `concludedAt:null`, `name`/`playerSide`/`monsterSide` unchanged) |
| Battle not found (or `CastError` on bad `:id`) | `404` | `{ "message": "Battle not found" }` |
| Battle exists but `status` is `concluded` or `discarded` (ADR-8 status guard) | `409` | `{ "message": "Battle is not active" }` |
| Unexpected error | `502` | `{ "message": "Unexpected error" }` (battle-service convention from 5.1; **never** `500`, **never** `{ message, details }`) |

- **Soft delete, not hard delete** (ADR-1): `DELETE` sets `status:
  'discarded'`. The document **stays in the `battles` collection** (Epic 6
  history needs it; the partial unique index is on `status:'active'` only, so
  the discarded doc no longer constrains a future `start` for that room). Do
  **not** call `deleteOne`/`findByIdAndDelete`/`remove`.
- **No request body, no `result`.** Discard has no outcome. `result` stays
  `null`; `concludedAt` stays `null`. The schema has **no `discardedAt`
  field** — do not add one (architecture
  `core-architectural-decisions.md#battle-schema`; 5.1 schema authoritative).
- **Status guard via one atomic update** (ADR-8): `findOneAndUpdate({ _id,
  status:'active' }, { $set: { status:'discarded' } }, { new:true })`; on
  no-match, a follow-up `findById` disambiguates `404` vs `409`. Race-safe
  without an optimistic-lock field — and safe against discard-vs-conclude
  races (whichever atomic update lands first wins; the loser's
  `findActiveBy...` returns `null` → `409`).
- **`200` + updated battle JSON, not `204`** (Resolved #1): unlike
  `character-service`'s `DELETE → 204`, battle terminal transitions return the
  updated resource so the client can confirm `status:'discarded'` and so
  `useBattleActions.discard` mirrors `start`/`patch`/`conclude`'s
  `Promise<Battle>` shape (uniform hook surface). The frontend does not
  strictly need the body for AC4 (the `null` refetch drives the dismiss), but
  the symmetric `200 + Battle` contract keeps 5.6/5.7 consistent and makes the
  backend success test assertable.
- **Response shape:** direct resource, no envelope; error shape is `{ message:
  string }` only — no `details`, no `error.type` (architecture
  `implementation-patterns-consistency-rules.md#error-responses`).
- **Single publish** to `RoomCharacterEventsTopic` only — no
  `Promise.allSettled` / dual-topic fan-out, no `log-service` (Epic 6; the
  doc-only ADR-6/ADR-12 model is contained in 5.4's architecture-vs-repo
  rule).

### Resolved decisions (locked, with rationale — Q1–Q3 surfaced as saved questions)

1. **Soft delete via `DELETE /battles/:id`, atomic, `200` + Battle JSON.** The
   discard transition is `DELETE /battles/:id` (ADR-1 / ADR-2 table) — a
   **soft delete** (`$set status:'discarded'`), **not** a hard collection
   delete and **not** a `/conclude`-style POST sub-route. The server-side
   change is one `findOneAndUpdate({ _id, status:'active' }, ...)` — atomic
   w.r.t. concurrent discards/concludes. On no-match the route does a
   follow-up `findById` to return `404` vs `409`. Response is `200` + the
   updated battle (not `204`) for symmetry with 5.6's conclude and a uniform
   `useBattleActions` `Promise<Battle>` surface. ✅ Locked.

2. **Explicit `ConfirmDialog` (cross-platform), reusing the pre-existing
   component.** UX-DR13 / `design-system-foundation.md` / `executive-summary`
   / Journey 4 all require an explicit confirmation step before discard
   ("Destructive actions (Discard Battle): `AppTheme.colors.danger` with
   explicit confirmation step before execution"). 5.7 reuses the **already
   existing** `frontend/components/ConfirmDialog.tsx` (cross-platform —
   iOS/Android/web). It must **not** use `Alert.alert` (iOS/Android-only;
   breaks the web release-parity gate) and must **not** duplicate/reinvent a
   dialog. **No request is sent until the user confirms** (AC1). This is the
   key behavioural difference from 5.6's Conclude (which has *no*
   `ConfirmDialog` — the result selector is its confirmation). ✅ Locked.

3. **Discard is NOT gated by the 5.3 draft dirty/clean state.** Unlike
   Conclude (5.6 Resolved #3, where a dirty-draft gate prevents the "did
   Conclude persist my unsaved bonus?" ambiguity because Conclude preserves
   the sides), Discard **throws the entire battle away** — the 5.3 draft
   (saved or unsaved) is irrelevant and is explicitly **not** persisted.
   Gating Discard behind a clean draft would be pure friction with zero
   safety benefit (the `ConfirmDialog` is the safety). Discard is the
   **destructive (`danger`) tier**, a separate tier from the accent-primary
   Save/Conclude, so UX-DR19's "one *enabled* primary per layer" arbitration
   (5.6 Resolved #3) does **not** apply to it — Discard coexists with the
   primary tier and is enabled whenever a battle is active (disabled only
   while `isDiscarding`). ✅ Locked — **confirmed by Ivan (2026-05-17)**; the
   alternative "gate Discard behind a clean draft like Conclude" is rejected
   (friction, no benefit, contradicts the throw-away semantics).

4. **Post-discard navigation (local).** On successful local discard, dismiss
   the Battle View modal back to Room View (`router.back()` — match 5.1's
   actual modal back-navigation; do not invent a new path). Do **not**
   `router.replace`/`router.push` to a new screen or open a "battle summary"
   (no such view; Epic 6 territory). Room View's `useRoomBattle` is already
   invalidated by the mutation `onSettled`. ✅ Locked.

5. **Post-discard behaviour (remote).** Per ADR-10, realtime never
   force-navigates. A remote `battle_discarded` causes 5.4's WS subscription
   to invalidate `['battle', roomId]`; the active-battle query refetches
   `null`; any open Battle View renders 5.1's loading-then-empty path and the
   modal naturally dismisses; 5.2's `ActiveBattleBanner` (pure `battle !==
   null`) disappears with **zero new code**. ✅ Locked.

6. **`409` recovery on the local discard (race).** If two players confirm
   Discard near-simultaneously (or one Discards while another Concludes), one
   returns `200` + publishes `battle_discarded`; the other returns `409`. The
   `409`-side surfaces an inline non-modal error label and relies on the
   winner's publish (or the conclude's `battle_concluded`) → 5.4's
   `useRoomBattle` invalidate → `null` refetch → modal dismisses. Do **not**
   retry on `409` (`apiRequest` only retries `408/429/≥500` — automatic). ✅
   Locked.

### Battle schema — what changes, what doesn't (5.7 reference)

Battle persisted shape (5.1 authoritative; 5.7 does **NOT** modify the schema/
indexes/transform):

```typescript
// MongoDB collection: battles  (id aliased from _id via toJSON; never raw _id/__v)
{
  id: string,
  roomId: string,
  name: string | null,                           // unchanged by discard (AC2)
  status: 'active' | 'concluded' | 'discarded',  // 5.7: 'active' → 'discarded'
  playerSide:  { characterIds: string[]; bonuses: BonusItem[] },   // unchanged
  monsterSide: { monsters: MonsterItem[];   bonuses: BonusItem[] }, // unchanged
  result: 'players_win' | 'monster_wins' | null, // stays null on discard
  createdAt, concludedAt: Date | null, updatedAt // concludedAt stays null
}
type BonusItem  = { id: string; value: number }
type MonsterItem = { id: string; name: string; level: number }
```

- **There is no `discardedAt` field.** The schema has only `concludedAt`. Do
  **not** add a `discardedAt` (or `result`) write — discard is a
  status-**only** soft delete. `updatedAt` is auto-managed by Mongoose
  `timestamps: true` on the `findOneAndUpdate` (verify in the success test;
  do not set it manually).
- The partial unique index `{ roomId: 1, status: 1 }`
  `partialFilterExpression: { status: 'active' }` (5.1 Task 2) is what lets a
  future `start` for the same room succeed once `status` flips off `'active'`
  — 5.7 does **not** modify/rebuild this index.
- Soft delete (ADR-1): the discarded document **remains** in the collection
  (Epic 6 / Story 6.3 — "Battle lifecycle events are published for room
  history" — needs the record). Hard-deleting it is a regression.

### Realtime path for `battle_discarded` (verified from 5.4 — no change needed)

```
battle-service.app.ts (DELETE /battles/:id)
  └── publisher.publish(createBattleEventPayload({
        event: 'battle_discarded', roomId, battleId, correlationId }))
      ├── lambda → SnsBattleEventPublisher.publish (5.4) → SNS RoomCharacterEventsTopic
      └── local  → RedisBattleEventPublisher.publish (5.4) → Redis `room-character-events`

room-notifications-service (5.4)
  ├── EVENT_TYPES already includes 'battle_discarded'
  ├── parseNotificationEvent: requires event_body.battleId for battle_*
  └── forwards { event:'battle_discarded', event_body:{ battleId } } AS PARSED

frontend/api/webSocket.ts (5.4): isValidNotificationEvent accepts battle_discarded
frontend/hooks/useRoomBattle.ts (5.4): on any battle_* → invalidate ['battle', roomId]
  → useQuery refetches getActiveBattle(roomId) → null (status no longer 'active')
frontend/components/munchkin/ActiveBattleBanner (5.2): battle === null ⇒ not rendered
```

5.7 only adds the **publisher.publish** call at the discard success path.
Every arrow below it already exists.

### AC anti-patterns (the most likely dev mistakes)

- ❌ **Hard delete.** `Battle.findByIdAndDelete(id)` / `deleteOne` /
  `.remove()` destroys the Epic-6 history record and breaks ADR-1. **Do**
  `findOneAndUpdate({ _id, status:'active' }, { $set:{ status:'discarded' }
  })`.
- ❌ **Adding a `discardedAt` / `result` write.** No such schema field exists
  for discard; `result` is conclude-only. Discard `$set`s **only** `status`.
- ❌ **Read-then-write status guard** (`findById` → check status → `save`):
  two concurrent discards/concludes can both pass the guard. **Do** the
  atomic `findOneAndUpdate`, then disambiguate `null` via `findById`.
- ❌ **Sending the request before the user confirms.** AC1: tapping Discard
  only opens the `ConfirmDialog`; the `DELETE` fires **only** on explicit
  confirm. Cancel = pure no-op (no request, battle unchanged, 5.3 draft
  untouched).
- ❌ **`Alert.alert` for the confirm.** iOS/Android-only — silently no-ops /
  breaks on web (release-parity gate). Use the pre-existing cross-platform
  `ConfirmDialog`.
- ❌ **Gating Discard behind a clean draft** (copying 5.6's Conclude gate).
  Resolved #3: discard throws the battle away; the draft is irrelevant.
  Discard is always enabled while active (disabled only while `isDiscarding`).
- ❌ **`204` instead of `200`+Battle**, or `500` instead of `502`, or
  `{ message, details }` error shape. Battle-service uses `200`+resource for
  terminal transitions (Resolved #1) and `502 { message }` for unexpected
  errors (5.1). Do not "harmonise" with character-service's `204`/`500`/
  `{message,details}` — the divergence is intentional (5.1 Dev Notes).
- ❌ **Publishing on `404`/`409`.** Only the `200` path publishes
  `battle_discarded`. The `409` loser publishes nothing — the winner already
  published its terminal event.
- ❌ **Optimistically rewriting `['battle', roomId]` to `discarded`.** The
  refetch returns `null` (status≠active filter), so an optimistic write
  flickers `discarded`→`null`. Let `onSettled` invalidate drive the refetch.
- ❌ **Auto-navigating remote clients** on `battle_discarded` (ADR-10
  forbids). Local discard only **dismisses** the modal the user is in.

### UX & accessibility specifics (UX-DR13, UX consistency-patterns, UX-DR21)

- **Discard button**: destructive tier — `AppTheme.colors.danger` (`#922525`)
  background, white/`textPrimary` text (UX consistency-patterns destructive
  row: "Standard button, white text, `danger` bg, Discard changes / Forfeit
  battle"). Tap target ≥44×44 (mirror 5.3's `stepperButton`). Disabled (only
  while `isDiscarding`): `surfaceSubtle` background + `textMuted` text
  (UX-DR19 disabled recipe) — do **not** keep the `danger` background while
  disabled.
- **ConfirmDialog (UX-DR13)**: explicit destructive confirmation. Destructive
  copy; confirm action `danger`-styled and clearly labelled (`"Discard"`),
  cancel non-destructive (`"Keep battle"`). Read the actual `ConfirmDialog`
  prop API and mirror an existing destructive caller if one exists (e.g.
  Story 3.10 character removal) — do not assume the prop names.
- **Accessibility (UX-DR21)**: Discard button
  `accessibilityRole="button"`, `accessibilityLabel="Discard battle"`,
  `accessibilityState={{ disabled: isDiscarding }}`. The `ConfirmDialog`'s
  confirm/cancel must be reachable by accessible label (the existing
  component should already wire this — verify, do not regress). Manual
  VoiceOver/TalkBack pass is part of UX-DR21's QA targets — note in
  completion notes which platforms were validated.
- **Reduced motion (UX-DR16)**: the discard flow has no motion (no flash, no
  spring) — reduced-motion handling is automatic. Do not introduce motion
  needing a `useReducedMotion()` check.
- **Field-error pattern**: the inline error after a `409` is a `danger`-tinted
  `Text` below the Discard button (mirror Room View `actionError` / 5.6's
  `409` inline). No blocking modal beyond the confirm dialog itself.

### Existing patterns to mirror (do NOT reinvent — quick lookup)

- **Backend DELETE route + atomic update + publish + status guard**:
  `backend/character-service/src/app.ts`
  `app.delete('/characters/:characterId', ...)` (status guard + try/catch
  publish + `CastError → 404` + `next(error)`). 5.7 mirrors the **structure**
  but responds `200 json(battle)` (not `204 send()` — Resolved #1) and
  soft-deletes via `$set status` (not a real delete).
- **Backend service-wrapper extension**: `backend/character-service/src/
  service.ts` `findByIdAndDelete`; 5.3 added `findByIdAndUpdate` to
  `BattleModelLike` — add `findActiveByIdAndDiscard` the same way
  (`console.info` logging, null-on-not-found, `toJSON` shaping).
- **Backend `app.test.ts` harness with mock publisher injection**: 5.1's
  `app.test.ts` (extended by 5.3 / 5.6) — `supertest`, `createApp(model, {
  publisher })`. Reuse it; add the delete block.
- **Frontend api module (DELETE)**: `frontend/api/characters.ts`'s delete
  helper (`apiRequest(path, { method: 'DELETE' })`, no body); 5.7's
  `discardBattle` mirrors it but returns `Promise<Battle>` (the `200` body).
- **Frontend mutation hook**: 5.1's `useBattleActions.start` / 5.3's `patch`
  / (if merged) 5.6's `conclude` (`useMutation`, `onSettled` invalidate
  `['battle', roomId]`). `discard` is the next sibling — same shape, same
  invalidation key, no optimistic update.
- **Frontend route-test harness**: 5.3's (and, if merged, 5.6's) harness in
  `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...` —
  `vi.hoisted`/`vi.mock` of `@/hooks/useRoomBattle`, `@/hooks/
  useBattleActions`, the character hook, `@/hooks/useUser`, `expo-router`.
  Extend; do not add test files under `frontend/app`.
- **Destructive confirm**: the **pre-existing** `frontend/components/
  ConfirmDialog.tsx` (cross-platform). Find an existing destructive caller
  (e.g. Story 3.10 character removal UI) and mirror its usage / copy tone.
- **Component conventions**: `frontend/components/munchkin/
  RoomCharacterCard.tsx`, `RoomCharactersList.tsx`, `VioletButton.tsx`, 5.3's
  side components, (if merged) `BattleConcludeAction.tsx` — PascalCase file,
  `memo`, explicit prop interface, default export, `StyleSheet.create` at
  bottom referencing `AppTheme`, stable `testID`s + accessibility.
- **Disabled button styling**: mirror whatever 5.3 settled on for `Saving`
  (`surfaceSubtle` bg). 5.7's `Discarding…` shares that visual treatment.

### Files to create / modify (exact paths)

**MODIFY (backend, all created/modified by 5.1/5.3/5.4):**

- `backend/battle-service/src/app.ts` — add the `DELETE /battles/:id` inline
  route (Tasks 2 + 3).
- `backend/battle-service/src/service.ts` — add `findActiveByIdAndDiscard(id)`
  to `BattleModelLike` + the wrapper implementation (Task 1).
- Co-located backend tests: `backend/battle-service/src/app.test.ts`,
  `backend/battle-service/src/service.test.ts` (Tasks 2 + 8 — extend, do not
  rewrite).
- `backend/sam/template.yaml` — add `BattleDelete` HttpApi event under
  `BattleServiceFunction.Events` (Task 4).

**NEW (backend):**

- `backend/sam/events/battle-delete-battle.json` — HttpApi `DELETE
  /battles/{id}` test event (Task 4).

**Verify (likely no change — note "verified" in completion notes):**

- `backend/battle-service/src/models/Battle.ts` — schema unchanged (5.1
  authoritative; **no `discardedAt`**).
- `backend/nginx/nginx.conf` — `/battles` block already proxies DELETE
  (mirrors `/characters`).
- `backend/battle-service/src/publisher.ts`, `{index.ts,lambda.ts}` — 5.4
  already supports `'battle_discarded'` + Sns/Redis selection; do not modify.
- `backend/battle-service/.env.example`, `backend/docker-compose.local.yml`,
  `backend/room-notifications-service/**` — 5.4-owned; do not modify.

**MODIFY (frontend, created by 5.1/5.3/5.4; 5.6 if merged):**

- `frontend/api/battles.ts` — add `discardBattle` (Task 5) + co-located test
  extensions (Task 8).
- `frontend/hooks/useBattleActions.ts` — add `discard` (Task 6) + co-located
  test extensions (Task 8).
- `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` — wire the Discard
  UI block + confirm gate + post-success dismiss + `409` recovery (Task 7).
  Extend the route test under `frontend/__tests__/app/munchkin/[roomNumber]/
  (battle)/...` (Task 8).

**NEW (frontend):**

- `frontend/components/munchkin/BattleDiscardAction.tsx` — presentational
  danger Discard button + controlled `ConfirmDialog` (Task 7) + co-located
  `BattleDiscardAction.test.tsx` (Task 8).

**Verify (likely no change):**

- `frontend/api/webSocket.ts`, `frontend/hooks/useRoomWebSocket.ts`,
  `frontend/hooks/useRoomBattle.ts` (WS subscription part) — 5.4-owned; do
  not modify.
- `frontend/app/munchkin/[roomNumber]/index.tsx` (Room View),
  `frontend/components/munchkin/ActiveBattleBanner.tsx` (5.2) — banner removal
  is automatic via `useRoomBattle` invalidation; do not modify.
- `frontend/components/ConfirmDialog.tsx` — **REUSE, do not modify** (pre-
  existing cross-platform component).
- `frontend/components/munchkin/BattleConcludeAction.tsx` (5.6, if merged) —
  do not modify; Discard is a disjoint block.

### Project Structure Notes

- Backend services are isolated bounded contexts; `battle-service` owns the
  `battles` collection exclusively — no cross-service reads/writes. Backend TS
  is **non-strict** (`NodeNext`, `strict:false`); frontend TS is **strict**.
  Do not normalize one to the other.
- Endpoints stay inline in `src/app.ts` (no `routes/` folder). Single root
  `backend/vitest.config.ts` already includes `battle-service/src/**` (5.1) —
  no config change.
- Frontend layered boundaries: `app/` route composes the Battle View screen +
  owns the discard mutation/navigation + `confirmVisible` state;
  `components/munchkin/` is presentational (no fetching/navigation/data hooks
  inside); `hooks/` orchestrates data; `api/` owns transport. Every file under
  `frontend/app` must be a route/layout — `BattleDiscardAction` lives in
  `components/munchkin/` (test co-located); the Battle View route test lives
  under `frontend/__tests__/app/...`.
- Naming: route param `:id` (Express) / `{id}` (SAM HttpApi) / `id` (api type);
  api `battles.ts` + `discardBattle`; hook `useBattleActions.ts` + `discard`;
  component `BattleDiscardAction.tsx` (PascalCase); event-type string
  `battle_discarded` (snake_case); env vars ALL_CAPS_SNAKE (none new);
  collection/field names camelCase (no schema change). Test casing mirrors
  source exactly.
- Definition of done: every touched surface (backend, frontend) passes its own
  typecheck/test/coverage gate; **70% line coverage is a CI hard gate**;
  assert behaviour/contracts not coverage padding; **character-service and
  room-notifications-service existing tests must remain untouched and green**
  (5.4's "byte-for-byte unchanged" regression bar carries forward).
- Update `backend/README.md` only if 5.1/5.3/5.6 already added a `/battles`
  endpoint table — append a one-line `DELETE /battles/:id` (soft discard)
  entry to match. If no such table exists, do not introduce a new docs
  section (project rule: minimal localised edits, but do not leave
  contract-changing docs stale).

### Latest tech / dependency note

**No new or upgraded dependency.** The coordinated stack is fixed by
`project-context.md` (React 19.2.0, TanStack Query 5.90.21, Expo Router 55,
React Native 0.83.2, Zod 4.3.6, Express 5.1.0, Mongoose 8.19.1, Vitest
3.2.4/4.0.18, AWS SDK v3) — do **not** bump or add packages. Mongoose 8
supports `findOneAndUpdate({ _id, status }, { $set }, { new, runValidators })`
natively (the atomic soft-discard) — no extra packages or transactions needed
(a single-document update is inherently atomic in MongoDB). `ConfirmDialog` is
a **pre-existing** in-repo component — no new dependency for the confirm step.

### Previous-story intelligence (5.1 foundational, 5.3 PATCH+UI, 5.4 publisher+WS, 5.6 conclude twin; 5.5 parallel)

- **5.1** — `Battle` model (full schema incl. `status`, `result`,
  `concludedAt`; **no `discardedAt`**), partial-unique `status:'active'`
  index, the `502 { message }` error shape, `NoopBattleEventPublisher` seam +
  `try/catch` call sites, `useRoomBattle(roomId, userProfile)`,
  `useBattleActions` (originally `{ start, isLoading, errorMessage }`),
  `frontend/api/battles.ts` types, the `(battle)` modal route. 5.7 consumes
  verbatim.
- **5.3** — `PATCH /battles/:id` (full-replace, status-guarded → 409),
  `useBattleActions.patch`, the **two-sided Battle View** with the local
  draft + dirty/Clean/Saving model, side components, comparison label. **5.7
  must NOT modify any of this.** 5.7's Discard is independent of the draft
  state (Resolved #3) — do not reuse 5.3's dirty derivation to gate Discard.
- **5.4** — the **real** publisher + `createBattleEventPayload`, env-driven
  Sns/Redis selection, `BattleServiceRole sns:Publish`, additive
  `room-notifications-service` allowlist (all four `battle_*` incl.
  `battle_discarded`) + `event_body` forwarding, additive frontend
  `isValidNotificationEvent`, the **shared multiplexed `RoomWebSocketClient`**,
  the `useRoomBattle` WS subscription that invalidates `['battle', roomId]` on
  any `battle_*`. **5.7 must NOT touch any of this.** AC4 is achieved with one
  `publisher.publish` call.
- **5.6** — the **conclude twin** (`POST /battles/:id/conclude`, required
  `result`, `BattleConcludeAction`, the dirty-gated primary). NOT a hard
  prerequisite; logically independent. 5.6 and 5.7 both edit
  `useBattleActions.ts` + `(battle)/index.tsx` — coordinate the merge-touch
  (see HARD PREREQUISITE block): extend whichever sibling set exists; do not
  regress a merged Conclude block; do not pre-stub conclude if 5.6 is not
  merged. Key contrast to **not** copy blindly: Conclude has **no**
  ConfirmDialog + **is** dirty-gated; Discard has **a** ConfirmDialog + is
  **not** dirty-gated.
- **5.5** is parallel/independent (frontend Battle View tombstone
  reconciliation). 5.7 must not edit 5.5's tombstone-row code/`useMemo` join
  — disjoint regions of the same screen.
- **Team convention** (git history `#54/#57/#60/#62/#64/#66`): one focused PR
  per story; every touched surface's quality gate green. 5.7 touches
  battle-service (one route + one wrapper method) + the Battle View screen + a
  small presentational component + tests — keep it one PR; regression bar is
  "character realtime byte-for-byte unchanged + 5.3 Battle View + (if merged)
  5.6 Conclude behaviour unchanged".

### Decision log — all confirmed by Ivan (2026-05-17)

All three prior open questions are **CONFIRMED** before dev start — implement
exactly as stated in Resolved decisions #1, #2, and #3 above; no remaining
ambiguity:

- **Q1 — Discard response shape:** ✅ **Confirmed.** `DELETE /battles/:id`
  returns **`200` + the updated `Battle` JSON** (`status:'discarded'`,
  `result:null`, `concludedAt:null`, sides unchanged), for symmetry with 5.6's
  conclude and a uniform `useBattleActions` `Promise<Battle>` surface. The
  alternative (`204 No Content`, closer to `character-service`'s DELETE) is
  **rejected** — the symmetric `200 + Battle` contract keeps 5.6/5.7
  consistent and makes the backend success test directly assertable.
- **Q2 — ConfirmDialog copy:** ✅ **Confirmed.** Title `"Discard battle?"`,
  body `"This battle will be discarded and removed from the room. This can't
  be undone."`, confirm `"Discard"` (danger-styled), cancel `"Keep battle"`.
  "Can't be undone" is intentional: although discard is a recoverable soft
  delete at the DB level (Epic 6 history retains the record), it is **not**
  user-recoverable in-app — Epic 6 only *views* history, it does not
  un-discard. (Match `ConfirmDialog`'s actual prop API when wiring the copy.)
- **Q3 — Discard dirty-draft gating:** ✅ **Confirmed.** Discard is **always
  enabled** while a battle is active (disabled only while `isDiscarding`) — it
  is **not** gated by a dirty 5.3 draft, unlike Conclude. The alternative
  ("gate Discard behind a clean draft like Conclude") is **rejected** —
  friction with no safety benefit since discard throws the entire battle away;
  the explicit `ConfirmDialog` is the safety, and Discard's `danger` tier is
  separate from the Save↔Conclude one-primary arbitration.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-battle-management.md#story-57-discard-a-battle] (AC; FR27 mapping; Journey 4 discard/abandon branch)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#api-design] (`DELETE /battles/:id` soft discard sets `status:'discarded'`; status guard 409 on PATCH/DELETE/conclude; ADR-1 soft delete + partial-unique on `status:'active'`; ADR-2 dedicated conclude vs PATCH; ADR-8 status guard; ADR-10 warm-resume no auto-navigate; ADR-4 modal group)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#battle-schema] (Battle schema — `result`/`concludedAt` only; **no `discardedAt`**; partial unique `status:'active'` index; `logevents` enum lists `battle_discarded` but logging is Epic 6)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md] (snake_case events, `roomId` mandatory in payloads, `{ message }` errors, HTTP 404/409/502, `['battle', roomId]` query key, test co-location, repo divergence locked from 5.4)
- [Source: _bmad-output/implementation-artifacts/5-1-start-a-battle.md] (battle-service scaffold, schema, partial-unique `active` index, `502 { message }` shape, `NoopBattleEventPublisher` seam, `useRoomBattle` contract, `(battle)` modal route, `Battle`/`BattleResult` types)
- [Source: _bmad-output/implementation-artifacts/5-3-manage-battle-state.md] (PATCH full-replace + status-guard pattern, `useBattleActions.patch` + invalidation, two-sided Battle View + draft/Save model + comparison indicator, component conventions under `components/munchkin/`)
- [Source: _bmad-output/implementation-artifacts/5-4-realtime-battle-updates-from-battle-actions.md] (real Sns/Redis publisher + `createBattleEventPayload`, env wiring, `BattleServiceRole sns:Publish` SAM policy, all-four `battle_*` allowlist incl. `battle_discarded` + `event_body.battleId` forward, `isValidNotificationEvent` widened, shared multiplexed WS registry, `useRoomBattle` WS subscription invalidating `['battle', roomId]` — the seam 5.7 publishes into)
- [Source: _bmad-output/implementation-artifacts/5-6-conclude-a-battle.md] (the symmetric conclude twin — atomic `findOneAndUpdate` status-guard pattern, follow-up `findById` 404-vs-409 disambiguation, `200`+Battle terminal-transition contract, `useBattleActions` sibling shape, component conventions; explicit contrasts: Conclude has no ConfirmDialog + is dirty-gated, Discard has a ConfirmDialog + is not)
- [Source: _bmad-output/implementation-artifacts/5-2-show-active-battle-in-room-view.md] (banner is a pure `battle !== null` render of `useRoomBattle().battle`; disappears for free when 5.7 invalidates the active-battle query)
- [Source: backend/character-service/src/app.ts (DELETE /characters/:characterId)] (try/catch publish + `next(error)` + `CastError → 404` reference; 5.7 mirrors structure but `200 json(battle)` soft-delete instead of `204 send()` hard-delete)
- [Source: backend/character-service/src/service.ts] (`findByIdAndDelete` wrapper reference — `findActiveByIdAndDiscard` mirrors the wrapper conventions)
- [Source: backend/sam/template.yaml] (CharacterService per-method HttpApi events incl. DELETE — mirror for `BattleDelete`; CharacterServiceRole publish policy already cloned by 5.4 onto BattleServiceRole)
- [Source: backend/nginx/nginx.conf] (`/characters` block — verify 5.1's `/battles` block has the same shape so `DELETE /battles/:id` proxies + CORS allows DELETE)
- [Source: frontend/api/http.ts] (`apiRequest`, `ApiError { status, details }`, retry policy retries 408/429/≥500 only — `409` surfaces immediately)
- [Source: frontend/api/characters.ts] (api module + `apiRequest` DELETE shape reference for `discardBattle`)
- [Source: frontend/hooks/useCharacters.ts] (`useMutation` + `onSettled` invalidate pattern — `useBattleActions.discard` mirrors)
- [Source: frontend/components/ConfirmDialog.tsx] (pre-existing cross-platform destructive confirm — 5.7 REUSES this; read its actual prop API; do not reinvent / do not use `Alert.alert`)
- [Source: frontend/components/munchkin/RoomCharacterCard.tsx, RoomCharactersList.tsx, VioletButton.tsx] (component conventions for `BattleDiscardAction.tsx`)
- [Source: frontend/constants/theme.ts] (`AppTheme.colors.{danger, surface, surfaceSubtle, textPrimary, textMuted}`, `spacing`, `radius`, `typography` — token-only styling)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md] (destructive button = `danger` #922525 bg / white text — "Discard changes, Forfeit battle")
- [Source: _bmad-output/planning-artifacts/ux-design-specification/design-system-foundation.md] (UX-DR13: "Destructive actions (Discard Battle): `AppTheme.colors.danger` with explicit confirmation step before execution")
- [Source: _bmad-output/planning-artifacts/ux-design-specification/executive-summary.md] ("Discard requires confirmation")
- [Source: _bmad-output/planning-artifacts/ux-design-specification/10-user-journey-flows.md#104-journey-4-battle-lifecycle] (Discard → Confirm discard? → Yes → Battle discarded / Room View / banner dismissed; "Discard is gated: confirmation only on destructive actions")
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md] (UX-DR21 accessibility roles/labels; cross-platform parity — the `Alert.alert` web trap)
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] (FR27 discard/abandon a battle; UX-DR13 Battle View Discard action soft-delete + explicit confirmation; battle-service primary test target = create/conclude/discard flows; 70% coverage gate)
- [Source: _bmad-output/project-context.md] (frontend strict TS; backend non-strict; do not bypass realtime contracts; do not change event names/payloads incidentally; service-boundary isolation; minimal-edits rule; 70% coverage floor; no incidental dependency changes; testing rules — co-location, route-tests under `__tests__`, mock boundaries not the unit under test)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
