# Story 5.5: Realtime Battle Updates from Character Changes

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the battle's player side to reflect character updates made in the room,
so that the battle stays aligned with the current state of participating characters.

This is the **fifth story of Epic 5 (Battle Management)** and the
**character→battle reconciliation that Stories 5.3 and 5.4 explicitly deferred**
("full reconciliation is 5.5" / "5.5 owns character→battle reconciliation").
It is a **frontend-only, Battle-View-only** story. It makes the Battle View's
player side a **live derived join** of the persisted `playerSide.characterIds`
against the room's current characters (`useRoomCharacters`), so a participant's
edited stats appear immediately and a deleted participant collapses to a
struck-through, no-longer-counted tombstone — **without any backend cascade,
without auto-PATCH, and without touching the realtime transport** (per ADR-9).

## ⛔ HARD PREREQUISITE — Stories 5.1, 5.2, 5.3 AND 5.4 must be implemented & merged first

5.1/5.2/5.3/5.4 are `ready-for-dev` (documented) but **NOT yet implemented in
code** (verified on this branch — `backend/battle-service/`,
`frontend/api/battles.ts`, `frontend/hooks/useRoomBattle.ts`,
`frontend/hooks/useBattleActions.ts`, the
`frontend/app/munchkin/[roomNumber]/(battle)/` route, and any
`frontend/components/munchkin/BattleSide*`/player-side row component **do not
exist**). 5.5 has the **deepest prerequisite chain in the epic** — it edits the
real two-sided Battle View UI that only exists after the full 5.1→5.4 sequence:

- **5.1** — creates `battle-service`, the `Battle` model (`playerSide.characterIds:
  string[]`), `frontend/api/battles.ts` (`Battle` type), `useRoomBattle` (HTTP-only,
  key `['battle', roomId]`), and the `(battle)` modal route skeleton.
- **5.3** — replaces the skeleton with the **real two-sided Battle View**: the
  local draft (`{ name, playerSide, monsterSide }`), the player-side participant
  list **joined from `playerSide.characterIds` × `useRoomCharacters(roomId,
  userProfile)`**, the effective-strength total, and the player-side / row
  presentational components under `frontend/components/munchkin/`. 5.3 resolves
  the join **at mount only** and renders a neutral **"Unavailable"** row for any
  unresolved id ("full reconciliation is 5.5"). **5.5 replaces that mount-time
  join + "Unavailable" behaviour with a live, every-render derived join + a
  struck-through removed tombstone.**
- **5.4** — makes `useRoomCharacters` and `useRoomBattle` share **one**
  `RoomWebSocketClient` per `(roomId, userId)`; `useRoomCharacters` already
  invalidates `['characters', roomId]` on `character_*` WS events and 5.4
  deliberately made `useRoomBattle` **ignore** `character_*` ("5.5 owns
  character→battle reconciliation"). 5.5 relies on this: the live character data
  reaches the Battle View through the **`useRoomCharacters` instance the Battle
  View already mounts (5.3 Task 6)**, not through `useRoomBattle`.

If a dev agent picks this up before 5.1–5.4 are merged, **HALT and report the
blocked dependency** — do not re-create the battle-service / `useRoomBattle` /
Battle View / shared-socket seam (duplicate-work + divergence anti-pattern).
Stories 3.1/3.2 (epic "Depends on") are **done**.

## ✅ Architecture-doc-vs-repo conflict is fully contained in 5.5

Stories 5.1–5.4 documented an idealized architecture event/topic model that does
not match the running repo. **For 5.5 this conflict does not apply at all**: 5.5
changes **no** event/transport/publisher/notification code — it only changes how
the Battle View **renders** its player side from data two already-working hooks
(`useRoomBattle`, `useRoomCharacters`) provide. Do **not** touch
`webSocket.ts`/`useRoomWebSocket`/`room-notifications-service`/`battle-service`
(see Scope Boundaries). ADR-9 is the single authoritative decision for this story.

## Acceptance Criteria

> **Reconciliation of AC2 with the locked display decision (see Resolved
> decisions #1):** AC2's "removes that character from the displayed **active**
> player side" is satisfied by removing the deleted character from the **active
> participant set and the player total** while keeping a **non-authoritative,
> read-only struck-through tombstone row** for transparency. The persisted
> battle record (and the local draft `playerSide.characterIds`) **literally
> retains** the original id — so "persisted battle record retains the original
> participation history" is satisfied with **zero backend work and zero
> auto-PATCH**.

1. **Participating character updated → live battle info + recomputed total.**
   Given a character whose id ∈ the active battle's draft
   `playerSide.characterIds`, when a `character_updated` change is received by the
   client (already delivered via the Battle View's mounted `useRoomCharacters`
   invalidating `['characters', roomId]`), then that participant's displayed
   battle row reflects the **latest** room-character state (name, level, avatar,
   color, etc. resolved live — not a mount-time snapshot) and the player-side
   effective-strength total recomputes from the updated level. No local Save and
   no PATCH occur.
2. **Participating character deleted → removed from active side (tombstone) +
   history retained.** Given a character whose id ∈ draft
   `playerSide.characterIds`, when a `character_deleted` change is received (id no
   longer present in `useRoomCharacters().characters`), then that participant is
   **excluded from the active player side and the player total** and rendered as a
   **read-only struck-through "removed" tombstone row**; the persisted battle
   record and the draft `playerSide.characterIds` are **unchanged** (no backend
   cascade, no auto-PATCH — ADR-9); the original participation is therefore
   retained for historical reference.
3. **Non-participating character change → Battle View unchanged.** Given a
   `character_created`/`character_updated`/`character_deleted` for a room
   character whose id ∉ draft `playerSide.characterIds`, when the change is
   processed, then the displayed player side, the player total, the draft, and the
   draft dirty/Clean state are **all unchanged** (the event must not re-initialise
   the draft, must not flip Save to active, must not reorder/rerender participant
   rows with new content).
4. **Return to Battle View is consistent with latest room state.** Given room
   character changes were made (by me or another player) while I was on Room View
   or disconnected, when I (re)open the Battle View, then the displayed
   player-side rows and total are consistent with the **latest** room-character
   state: updated participants show current stats, deleted participants show the
   struck-through tombstone and are excluded from the total — with no duplicate
   rows and no stale mount-time values.

## Scope Boundaries (READ FIRST — prevents over-build and regressions)

**IN scope for 5.5 (frontend, Battle View only):**

- **`frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` (MODIFIED — created
  by 5.1, real UI by 5.3):** change the player-side data resolution from 5.3's
  **mount-time** join to a **live, every-render derived join** of the **draft**
  `playerSide.characterIds` against the **current** `useRoomCharacters(roomId,
  userProfile).characters` (the `useRoomCharacters` instance 5.3 already mounts
  here — reuse it; do **not** add a second one). Recompute the player total from
  the live join (resolved participants only). Do not change 5.3's draft model,
  Save flow, modal presentation, monster side, bonuses, totals formula, or
  back-navigation.
- **The 5.3 player-side participant row/list presentational component(s) under
  `frontend/components/munchkin/` (MODIFIED — exact names follow 5.3's actual
  code):** render three row states from the derived join — (a) **resolved/active**
  (live name/level/etc. from the matched room character; contributes to total);
  (b) **removed tombstone** (id ∈ draft `characterIds` but ∉ live characters):
  read-only, struck-through, visually de-emphasised, an accessibility label
  conveying "removed from room", **excluded from total**, **not** the editable
  participant control; the `−` remove control may still let the user drop the
  tombstone from the draft on the next explicit Save, but 5.5 itself performs no
  auto-removal/auto-Save. Replace 5.3's neutral "Unavailable" row with this
  tombstone row for unresolved ids.
- A **pure, unit-testable reconciliation helper** (e.g.
  `frontend/utils/battlePlayerSide.ts` — match 5.3's util location convention;
  5.3 places a UUID util under `frontend/utils/`, reuse that dir) that maps
  `(characterIds: string[], roomCharacters: Character[])` →
  `{ active: Array<{ id; character: Character }>; removed: string[] }` and a
  `computePlayerTotal(active, bonuses)` consistent with 5.3's effective-strength
  formula. The screen/component consume this; keep it side-effect-free
  (deterministic, no hooks) so it can be tested in isolation.
- Co-located component tests (`*.test.tsx`) for the three row states + total
  exclusion; the pure helper's unit test; an **extension** of 5.3's Battle View
  route test under `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...`
  asserting AC1–AC4 via mutating the mocked `useRoomCharacters` state.
- Frontend-only cross-surface verification (strict typecheck + `vitest run
  --coverage` ≥70% line floor; manual two-client web smoke after 5.1–5.4 merged).

**OUT of scope (explicitly owned by other stories / forbidden by ADR-9 — do NOT
build here):**

- ❌ **Any backend change.** No `battle-service`, no `room-notifications-service`,
  no SAM/nginx/compose, no new endpoint, **no backend cascade** that mutates
  `playerSide.characterIds` on `character_deleted` (ADR-9 explicitly: "No backend
  cascade; the battle record retains original `characterIds`"). If you find
  yourself editing `backend/**`, you are out of scope.
- ❌ **Any realtime transport / event-contract change.** Do NOT touch
  `frontend/api/webSocket.ts`, `frontend/hooks/useRoomWebSocket.ts`, the
  shared-client registry (5.4), `isValidNotificationEvent`, event types, or add a
  `character_*` subscription/handler to `useRoomBattle`. 5.4 deliberately left
  `character_*` handling to `useRoomCharacters`; reconciliation is a **derived
  read** of `useRoomCharacters().characters`, not a new subscription. Adding
  `character_*` to `useRoomBattle` would duplicate logic and raise the 5.4
  "character realtime byte-for-byte unchanged" regression risk.
- ❌ **Auto-PATCH / auto-Save on a remote character change.** A remote
  `character_updated`/`deleted` must never trigger `useBattleActions().patch`,
  never mark the draft dirty, never enable Save. Persisted state changes **only**
  on the user's explicit Save (5.3's model — unchanged).
- ❌ **Mutating the draft `playerSide.characterIds` in response to a remote
  event.** The deleted id stays in the draft (tombstone is display-only) so
  participation history is retained (Resolved decision #1). Pruning happens only
  if the user explicitly removes it and Saves (5.3's existing `−`/Save path,
  untouched).
- ❌ **Monster side, bonuses, totals formula, name, conclude/discard, Save flow,
  modal/route config** — all owned by 5.3/5.6/5.7. 5.5 only changes player-side
  *resolution* + the participant row's removed/updated rendering.
- ❌ **Re-creating the 5.1–5.4 seam** (battle-service, `useRoomBattle`,
  `useRoomCharacters`, shared socket, Battle View shell, draft/Save). Consume; do
  not redefine.
- ❌ **`useRoomCharacters` / `useCharacters.ts` changes.** It already delivers
  `character_*` and invalidates `['characters', roomId]` (Epic 3/4 + 5.4 shared
  socket). 5.5 is a pure consumer of `useRoomCharacters().characters`.
- ❌ **`log-service` / room-history / Epic 6.** "Participation history" here means
  the retained `characterIds` array only — no event logging.

## Tasks / Subtasks

- [x] **Task 1 — Pure reconciliation helper** (AC: 1, 2, 3)
  - [x] Add `frontend/utils/battlePlayerSide.ts` (match 5.3's util dir; if 5.3
    created `frontend/utils/uuid.ts`, colocate here). Export:
    - `reconcilePlayerParticipants(characterIds: string[], roomCharacters:
      Character[]): { active: { id: string; character: Character }[]; removed:
      string[] }` — for each id in `characterIds` (preserve order, de-dupe
      defensively): if a `roomCharacters` entry matches `character.id === id` →
      `active`; else → `removed`. Evaluated purely; **no settle/loading gate** —
      any id absent from the passed `roomCharacters` is `removed` (Resolved
      decision #3).
    - `computePlayerTotal(active: { character: Character }[], bonuses:
      BonusItem[]): number` = `Σ(active[].character.level)` +
      `Σ(bonuses[].value)` — **tombstones excluded** (only `active`). Must match
      5.3's player effective-strength formula exactly (read 5.3's implemented
      total; this helper replaces/centralises that computation — do not invent a
      different formula).
  - [x] Import `Character` from `@/api/characters` and `BonusItem` from
    `@/api/battles` (5.1 types) — do not redefine types.
  - [x] Co-located `frontend/utils/battlePlayerSide.test.ts`: all-resolved;
    some-removed (order preserved, removed ids collected); empty `characterIds`;
    duplicate id; total excludes removed and includes signed/negative bonuses.

- [x] **Task 2 — Battle View: live derived player side** (AC: 1, 2, 3, 4)
  - [x] In `(battle)/index.tsx`, reuse 5.3's existing `useRoomCharacters(roomId,
    userProfile)` instance (5.3 Task 6 already adds `useUserProfile()` +
    `useRoomCharacters` here). Do **not** add a second `useRoomCharacters` and do
    **not** add `useRoomWebSocket`/WS code.
  - [x] Replace 5.3's mount-time player-side resolution with a `useMemo`
    derivation: `reconcilePlayerParticipants(draft.playerSide.characterIds,
    roomCharacters)` recomputed whenever `draft.playerSide.characterIds` or
    `roomCharacters` change (so a `['characters', roomId]` invalidation →
    `useRoomCharacters` re-render → fresh join). Player total = `computePlayerTotal(
    active, draft.playerSide.bonuses)`. This is a **derived render value**, not
    state and not an effect — do not `setState`/`useEffect` from the room-character
    list (prevents AC3 spurious draft mutation / dirty flips).
  - [x] **Draft is not mutated by reconciliation.** Keep 5.3's draft init (from
    `battle` on load) and dirty/Clean/Saving model exactly. A remote character
    change must not re-init the draft, not set dirty, not enable Save (AC3). The
    deleted id stays in `draft.playerSide.characterIds` (tombstone is
    display-only — Resolved decision #1).
  - [x] Pass `active` (resolved participants) and `removed` (tombstone ids) into
    the 5.3 player-side list/row component(s). The participant **add picker**
    (5.3) still lists room characters not already in `characterIds`; the per-row
    `−` remove (5.3) still mutates the **draft** as before (explicit user action →
    dirty → Save) — unchanged.
  - [x] AC4 is satisfied structurally: on Battle View (re)mount 5.3 re-inits the
    draft from the refetched `['battle', roomId]` and the join derives from the
    current shared `['characters', roomId]` cache (kept live by the Room View's
    mounted `useRoomCharacters` + 5.4 shared socket). No extra code needed —
    **do not** add a refetch/effect for "return to view"; assert it in tests.

- [x] **Task 3 — Player-side row: resolved / tombstone rendering** (AC: 1, 2)
  - [x] In 5.3's player-side row/list component(s) (exact filenames per 5.3's
    actual code under `frontend/components/munchkin/`): render
    - **resolved/active row:** live `character.nickname`/`level`/`avatar`/`color`
      from the matched room character (re-renders on `character_updated` because
      the join recomputes from fresh `useRoomCharacters` data). Reuse 5.3's
      existing row visuals; only the *data source* becomes the live matched
      character.
    - **removed tombstone row:** read-only, **struck-through** label
      (`textDecorationLine: 'line-through'`), de-emphasised via
      `AppTheme.colors.textMuted`/`surfaceSubtle` (no hardcoded literals — token
      only), not the editable participant control, **excluded from total**.
      Accessibility: `accessibilityRole` not "button" for the tombstone label;
      `accessibilityLabel` like `"<name-or-id> — removed from room"` (stable,
      not flapping). Keep a stable `testID` (e.g. `battle-participant-removed`)
      distinct from the active row's `testID` for deterministic tests.
    - This **replaces** 5.3's neutral "Unavailable" row for unresolved ids — the
      tombstone is the single representation for "id in `characterIds` but not in
      live room characters".
  - [x] Styling strictly via `AppTheme` tokens (player side stays
    `AppTheme.colors.accent` for active values per 5.3/UX-DR13; tombstone uses
    muted/subtle tokens). No hardcoded hex/px/font-size. Mirror 5.3's component
    conventions (PascalCase file, `memo`, explicit prop interface, default export,
    `StyleSheet.create` at bottom referencing `AppTheme`, `testID` +
    accessibility props).

- [x] **Task 4 — Tests** (AC: 1, 2, 3, 4)
  - [x] Helper unit test (Task 1) — pure, deterministic.
  - [x] Co-located component test(s) for the player-side row/list: renders an
    active row from a resolved character; renders a struck-through tombstone for a
    removed id; tombstone is excluded from the displayed total; updating the
    matched character's level changes the active row + total; a non-participant
    character in the list does not add a row (AC3).
  - [x] Extend 5.3's Battle View route test under
    `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...` (NOT under
    `frontend/app` — Expo Router forbids non-route files there). Mock
    `@/hooks/useRoomBattle`, `@/hooks/useCharacters` (or `useRoomCharacters`),
    `@/hooks/useUser`, `expo-router` via `vi.hoisted` mutable refs (mirror 5.3's
    harness). Assert, by **mutating the mocked `useRoomCharacters` state between
    renders** (no real WS):
    - **AC1:** changing a participating character's `level`/`nickname` updates its
      row + the player total; no `useBattleActions().patch` call; draft not dirty.
    - **AC2:** removing a participating character from the mocked characters list
      renders the struck-through tombstone, drops it from the total, and the
      mocked battle/`patch` is **never** called (no cascade/auto-PATCH); the draft
      `characterIds` still contains the id.
    - **AC3:** updating/deleting a **non-participant** character produces **no**
      change to the player rows, total, or draft-dirty state.
    - **AC4:** simulate remount (changed characters since mount) → rows/total
      reflect the latest mocked character state, no duplicate rows, no stale
      values; no auto-navigation.
  - [x] Meet the **70% line coverage floor** for the frontend pipeline. Note:
    `frontend/vitest.config.ts` coverage `include` is `api/**`,`config/**`,
    `hooks/**` only — 5.5 adds **no** hook/api code (Battle-View + component +
    `utils/` only), so it does not move the coverage gate (same situation as 5.2).
    Still write the behaviour tests above (project rule: assert behaviour, coverage
    is a floor not the goal). **Do not widen** the coverage `include` scope to
    pad `utils/`.

- [x] **Task 5 — Frontend cross-surface verification** (AC: 1, 2, 3, 4)
  - [x] From `frontend/`: strict TS typecheck passes with the helper + Battle
    View/row changes; `vitest run --coverage` passes (≥70% line floor, **no
    regression** in existing `useCharacters`/`webSocket`/`useRoomWebSocket`/Battle
    View/Room View tests — 5.5 must not perturb the live character flow).
  - [x] Local manual smoke (`docker-compose up`, after 5.1–5.4 merged), two web
    tabs, same room, two device identities:
    - Tab A starts a battle, opens Battle View, adds two room characters to the
      player side, Saves. Tab B opens the same Battle View.
    - Tab A edits a **participating** character's level on Room View (or
      QuickEditSheet) → **Tab B's open Battle View** updates that participant's
      level and the player total **without reload** (AC1).
    - Tab A deletes a **participating** character → Tab B's Battle View shows the
      struck-through tombstone and the total drops; reopening the battle still
      lists the same `characterIds` (history retained); no error, no auto-PATCH
      (AC2).
    - Tab A edits a **non-participating** character → Tab B's Battle View player
      side/total unchanged; the character card still flashes on Room View
      (character realtime regression intact — AC3).
    - Return: Tab B leaves Battle View, Tab A makes more participant edits, Tab B
      reopens Battle View → state consistent with latest, no duplicates (AC4).
    - Verify web at minimum; note any platform (iOS/Android) not verified.
  - [x] No backend/infra/transport changes expected — if you edit `backend/**`,
    `frontend/api/webSocket.ts`, `frontend/hooks/useRoomWebSocket.ts`, or
    `frontend/hooks/useRoomBattle.ts`, you are out of scope (re-read ADR-9 +
    Scope Boundaries).

## Dev Notes

### Why this story needs almost no code (the key insight)

5.3 already builds the Battle View player side as a **join** of the persisted
`playerSide.characterIds` (a list of *id references only* — the battle never
stores character levels/names; ADR-9) against `useRoomCharacters(roomId,
userProfile).characters`. `useRoomCharacters` is **already fully reactive**: it
subscribes to `character_created|updated|deleted` WS events and invalidates
`['characters', roomId]` (verified in `frontend/hooks/useCharacters.ts` lines
311–353), and 5.4 makes it share **one** socket with `useRoomBattle`. So the live
character data is *already arriving* at the Battle View through the
`useRoomCharacters` instance 5.3 mounts there.

The only reason 5.3's Battle View is *not* already live is that 5.3 resolves the
join **once at mount** and renders a neutral **"Unavailable"** row for unresolved
ids (5.3 explicitly defers full reconciliation to 5.5). **5.5's entire job** is
to make that join a **derived, every-render value** (`useMemo` over
`draft.characterIds` + `roomCharacters`) and to render the deleted-participant
case as a struck-through tombstone excluded from the total. No new subscription,
no `useRoomBattle` change, no transport change, no backend (ADR-9). This is the
cleanest possible reconciliation and the lowest-risk to the 5.4 "character
realtime byte-for-byte unchanged" regression bar — it adds **zero** new event
handling.

### Authoritative decision: ADR-9 (supersedes any doc ambiguity)

> **ADR-9 — Character delete in battle:** No backend cascade; frontend removes
> from display via `character_deleted` WS event; battle record retains original
> `characterIds` for historical reference (concluded/discarded battles show who
> participated).
> [Source: architecture/core-architectural-decisions.md#architecture-decision-records (ADR-9, line 255), #character-deleted-during-active-battle (line 177)]

This forbids any backend cascade and any client mutation of persisted
`characterIds` on a remote delete. The struck-through tombstone + retained
`characterIds` (draft and persisted) is the literal implementation of "battle
record retains original `characterIds` for historical reference".

### Battle player-side data model (from 5.1/5.3 — do not change)

```typescript
// Battle (5.1) — persisted; battle-service owns it; 5.5 changes NOTHING here
playerSide: { characterIds: string[]; bonuses: BonusItem[] }   // ids only — no levels/names
type BonusItem = { id: string; value: number }                 // signed int
```

- Player effective strength (5.3, AC1): `Σ(level of room characters whose id ∈
  characterIds)` + `Σ(playerSide.bonuses[].value)`. 5.5's `computePlayerTotal`
  must equal 5.3's formula, just sourced from the **live** resolved set
  (tombstones contribute 0 / are excluded).
- The battle persists **only ids** — levels/names are *always* resolved from
  `useRoomCharacters` at render time. Making that resolution live (vs 5.3's
  mount-time snapshot) is the whole of AC1/AC4.
[Source: _bmad-output/implementation-artifacts/5-1-start-a-battle.md (schema, Task 8),
5-3-manage-battle-state.md (Task 6 player-side join, effective-strength formula,
"Unavailable" row, "full reconciliation is 5.5")]

### Realtime path (verified from code — no change needed)

`useCharacters.ts` `useRoomCharacters` (lines 311–353): on `isConnected`,
`subscribe`s and on each `character_created|updated|deleted` calls
`queryClient.invalidateQueries({ queryKey: ['characters', roomId] })` (plus a
`realtimeUpdateSignals` bump on update). 5.4 makes the underlying
`RoomWebSocketClient` shared per `(roomId, userId)` so the Battle View's
`useRoomCharacters` and Room View's see the **same** invalidations over **one**
socket. Result: when any client mutates a character, every connected client's
`['characters', roomId]` refetches → `useRoomCharacters().characters` re-renders
→ 5.5's `useMemo` join recomputes → Battle View player side updates. **5.5
consumes this; it adds nothing to the WS/query layer.**
[Source: frontend/hooks/useCharacters.ts:311-353, frontend/api/webSocket.ts,
frontend/hooks/useRoomWebSocket.ts, _bmad-output/implementation-artifacts/5-4-realtime-battle-updates-from-battle-actions.md (shared multiplexed socket; "Ignore character_* events here (5.5 owns character→battle reconciliation)")]

### AC3 anti-pattern guard (most likely dev mistake)

A `character_*` invalidation changes the **whole** `['characters', roomId]`
array reference, so `useRoomCharacters().characters` is a new array even when a
*non-participant* changed. The reconciliation MUST be a **pure derived value**
(`useMemo` filtered by `characterIds`) so a non-participant change yields an
**equal** `active`/`removed`/total and the rendered player side is unchanged
(AC3). Do **not** drive reconciliation through `useEffect` + `setState` or you
will (a) re-render participant rows with churn, (b) risk flipping the 5.3 draft
dirty flag, (c) risk an accidental auto-PATCH. Derived render state only; never
write the room-character list back into the draft.

### Resolved decisions (all confirmed by Ivan, 2026-05-17)

1. **Deleted participant = struck-through, read-only tombstone (not a hard
   remove); draft & persisted `characterIds` retain the id; no auto-PATCH.** The
   character is removed from the **active** player side and the **player total**
   (satisfying AC2's "removed from the displayed active player side") but a
   non-authoritative struck-through tombstone row remains for transparency. This
   also *literally* satisfies "the persisted battle record retains the original
   participation history" with zero backend work — the id is never pruned by a
   remote event; pruning happens only if the user explicitly removes it and Saves
   (5.3's existing path). ✅ Confirmed.
2. **5.5 is Battle-View-only, a derived join — no `useRoomBattle` / WS / backend
   change.** Reconciliation reads the `useRoomCharacters` instance the Battle
   View already mounts (5.3 Task 6); character events already arrive there via
   5.4's shared socket + `['characters', roomId]` invalidation. Adding
   `character_*` to `useRoomBattle` (the alternative) is rejected: it duplicates
   logic 5.4 deliberately localised to `useRoomCharacters` and raises the AC1/AC4
   regression risk. ✅ Confirmed.
3. **Any id absent from the current `useRoomCharacters().characters` is rendered
   as the tombstone immediately — no settle/loading gate.** Simplicity over
   flicker-avoidance. Accepted tradeoff: during the brief initial
   characters-fetch window a just-mounted Battle View may momentarily render
   participants as tombstones until `['characters', roomId]` resolves, then
   "un-strike" them. This is acceptable and confirmed; do **not** add a
   fetch-settled gate, `isLoading` guard, or debounce to "fix" it (would be
   out-of-scope complexity contradicting the confirmed decision). 5.3's neutral
   "Unavailable" row is fully **replaced** by this tombstone. ✅ Confirmed.

### Existing patterns to mirror (do not reinvent)

- **Live query-driven join:** the Battle View already calls
  `useRoomCharacters(roomId, userProfile)` (5.3 Task 6, mirrors
  `frontend/app/munchkin/[roomNumber]/index.tsx` Room View wiring:
  `const { userProfile } = useUserProfile(); useRoomCharacters(roomId,
  userProfile)`). Reuse that instance.
- **Derived `useMemo` from query data:** standard TanStack v5 pattern — derive
  render values from `query.data`; never mirror query data into local state.
- **Component conventions:** `frontend/components/munchkin/RoomCharacterCard.tsx`
  / `RoomCharactersList.tsx` / `VioletButton.tsx` — PascalCase, `memo`, explicit
  prop interface, default export, `StyleSheet.create` at bottom referencing
  `AppTheme`, `testID` + accessibility. The 5.3 player-side row 5.5 edits already
  follows this — extend, don't restyle.
- **Pure util + co-located test:** 5.3 adds a small `frontend/utils/` helper
  (UUID v4) with a co-located test — put `battlePlayerSide.ts` +
  `battlePlayerSide.test.ts` the same way (deterministic, no hooks).
- **Route-test harness:** `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...`
  (5.3 creates it) and `[roomNumber].test.tsx` — `vi.hoisted` mutable refs,
  `vi.mock` for `expo-router`/hooks, `QueryClientProvider`. Extend; never add
  test files under `frontend/app`.
- **Theme tokens (`frontend/constants/theme.ts`):** active player values
  `AppTheme.colors.accent` (#D4C26E, per 5.3/UX-DR13); tombstone
  `AppTheme.colors.textMuted` (#D9D9D9) / `surfaceSubtle` (#353535); spacing/
  radius/typography via tokens. No literals (project rule).

### Project Structure Notes

- Frontend layered boundaries unchanged: `app/` route composes the Battle View +
  owns the draft/Save/navigation; `components/munchkin/` presentational (no
  fetching/navigation inside); `hooks/` orchestrates data (unchanged here);
  `utils/` holds the pure reconciliation helper. Every file under `frontend/app`
  must be a route/layout — the row component lives in `components/munchkin/`,
  its test co-located; the Battle View route test lives under
  `frontend/__tests__/app/...`.
- Frontend TS is **strict** — fully type the helper and props (`Character` from
  `@/api/characters`, `BonusItem` from `@/api/battles`; do not redefine). Backend
  is not touched (no strictness concern).
- Naming: util `battlePlayerSide.ts` (camelCase), test mirrors source casing;
  components PascalCase; `testID`s stable and distinct per row state.
- Definition of done: frontend surface passes strict typecheck + `vitest
  --coverage` (≥70% line floor) with **no regression** to existing
  character-realtime / Battle View / Room View tests; behaviour asserted, not
  coverage-padded; coverage `include` scope **not** widened. No backend/infra/
  transport surface touched (verify in completion notes).

### Latest tech / dependency note

No new or upgraded dependency. The coordinated stack is fixed by
`project-context.md` guardrails (React 19.2.0, TanStack Query 5.90.21, Expo
Router 55, React Native 0.83.2, Zod 4.3.6) — do **not** bump or add packages
(`project-context.md`: no incidental dependency/lockfile changes). The
reconciliation is a plain `useMemo`-derived join over existing TanStack Query
`['characters', roomId]` data; no `select`-option refactor of `useRoomCharacters`
is needed or permitted (that would perturb the shared character flow / 5.4
regression bar). React 19: keep reconciliation as derived render state, not an
effect (see "AC3 anti-pattern guard").

### Previous-story intelligence (5.1 foundational, 5.3 Battle View, 5.4 shared socket)

- **5.1** — `Battle.playerSide.characterIds: string[]` (ids only), `Battle` type,
  `useRoomBattle` (`{ battle, isLoading, errorMessage, refresh }`, key
  `['battle', roomId]`), `(battle)` modal route. 5.5 consumes verbatim.
- **5.3** — the real Battle View: local draft from `battle`, player-side join ×
  `useRoomCharacters`, effective-strength total, "Unavailable" row for unresolved
  ids, side/row components under `frontend/components/munchkin/`, explicit
  Save = full-replace `PATCH`. **5.5 follows 5.3's actual component/file names**
  (the names in this story are indicative); it only changes player-side
  *resolution* (mount-time → live) and the unresolved-id rendering ("Unavailable"
  → struck-through tombstone). Do not alter 5.3's draft/Save/monster/bonus/total
  formula/modal.
- **5.4** — shared one `RoomWebSocketClient` per `(roomId, userId)`;
  `useRoomCharacters` keeps owning `character_*` → `['characters', roomId]`
  invalidation; `useRoomBattle` deliberately ignores `character_*`. 5.5 depends
  on this exact split — reconciliation rides `useRoomCharacters`, not
  `useRoomBattle`.
- Team convention (git history `#54/#57/#60/#62`): **one focused PR per story,
  every touched surface's quality gate green**. 5.5 touches only frontend Battle
  View + a util + tests — keep it one small PR; the regression bar is "character
  realtime and 5.3 Battle View behaviour unchanged".

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-battle-management.md#story-55-realtime-battle-updates-from-character-changes] (AC; no Covers/Depends footer in epic — reconciliation contract derived from 5.3/5.4 deferrals + ADR-9 + FR22–FR24)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#architecture-decision-records] (ADR-9 line 255 + "Character Deleted During Active Battle" line 177 — no cascade, frontend removes from display, retains `characterIds`; ADR-15 line 261 `useRoomBattle` HTTP+WS; ADR-10 warm-resume no auto-navigate)
- [Source: _bmad-output/implementation-artifacts/5-1-start-a-battle.md] (`playerSide.characterIds` schema, `Battle`/`BonusItem` types, `useRoomBattle` shape, `(battle)` modal route)
- [Source: _bmad-output/implementation-artifacts/5-3-manage-battle-state.md] (Task 6 player-side join × `useRoomCharacters`, effective-strength formula, "Unavailable" row, draft/Save model, "live reconciliation of character edits is Story 5.5", side/row components under `components/munchkin/`, `frontend/utils/` util convention)
- [Source: _bmad-output/implementation-artifacts/5-4-realtime-battle-updates-from-battle-actions.md] (shared multiplexed socket per `(roomId,userId)`; `useRoomBattle` ignores `character_*` — "5.5 owns character→battle reconciliation"; AC1/AC4 "character realtime byte-for-byte unchanged" regression bar)
- [Source: frontend/hooks/useCharacters.ts:103-353] (`useRoomCharacters` — live `character_*` subscription + `['characters', roomId]` invalidation; the reactive source 5.5 reads)
- [Source: frontend/api/characters.ts] (`Character` type — `id`, `nickname`, `level`, `avatar`, `color`, …; resolved-row data source)
- [Source: frontend/hooks/useRoomWebSocket.ts, frontend/api/webSocket.ts] (transport — **do not modify**; context only)
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] (FR22/FR23/FR24; ADR-9 cross-cutting line 92)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md, 13-responsive-design-accessibility.md] (Battle View / player-side anatomy via UX-DR13; accessibility-label stability for the tombstone)
- [Source: _bmad-output/project-context.md] ("Do not bypass established real-time flow contracts"; "Do not change event names/payload contracts"; no backend cascade across services; strict frontend TS; no incidental deps; 70% coverage floor; minimal localized edits)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm install` in `frontend/` to restore local dependencies for verification.
- `npm run tsc` in `frontend/` passed.
- `npx vitest run utils/battlePlayerSide.test.ts components/munchkin/BattleSidePanel.test.tsx` passed: 11 tests.
- `npx vitest run -c vitest.room-route.config.ts __tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx` passed: 13 tests.
- `npm run test:coverage` in `frontend/` passed: 156 unit/component/hook tests, 49 route tests, 84.31% line coverage.
- `npm run lint` in `frontend/` passed with one existing warning in `frontend/app/munchkin/modal-change-caracter.tsx` about a missing `useEffect` dependency.
- Local two-client manual smoke passed, confirmed by Ivan on 2026-05-20.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added a pure battle player-side reconciliation helper that preserves participant order, de-duplicates ids, separates active vs removed participants, and computes totals from active levels plus signed bonuses.
- Battle View now derives player participants from the current `useRoomCharacters` result on every render without mutating the draft, auto-saving, patching, or touching realtime/backend surfaces.
- Player-side rows now render active participants from live character data and removed participants as muted, struck-through tombstones excluded from totals while keeping explicit remove/save behavior available.
- Added helper, component, and route tests covering participating updates, deleted tombstones, non-participant no-ops, remount consistency, total exclusion, and retained draft `characterIds`.
- Manual two-client web smoke passed, confirming live participant updates, tombstone rendering, non-participant no-op behavior, and return-to-view consistency.

### File List

- frontend/app/munchkin/[roomNumber]/(battle)/index.tsx
- frontend/components/munchkin/BattleSidePanel.tsx
- frontend/components/munchkin/BattleSidePanel.test.tsx
- frontend/__tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx
- frontend/utils/battlePlayerSide.ts
- frontend/utils/battlePlayerSide.test.ts
- _bmad-output/implementation-artifacts/5-5-realtime-battle-updates-from-character-changes.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-05-19: Implemented live Battle View player-side reconciliation from current room characters, removed tombstone rendering, and AC-focused frontend tests. Automated verification passed.
- 2026-05-20: Recorded successful local manual smoke, checked the coverage-floor task, and moved story to review.
