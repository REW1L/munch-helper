# Story 5.3: Manage Battle State

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to manage the players, monsters, and bonuses in an active battle,
so that the battle state stays accurate as play changes.

This is the **third story of Epic 5 (Battle Management)**. It fleshes out the Battle
View skeleton and the battle HTTP contract created by Story 5.1: it adds the
`PATCH /battles/:id` endpoint (full-replace of `name`/`playerSide`/`monsterSide`,
status-guarded to `active`), the `patch` mutation on `useBattleActions`, and the
real two-sided Battle View UI (player side / monster side, totals, add/remove
participants·monsters·bonuses, Save). It does **not** add realtime, conclude, or
discard — those are Stories 5.4 / 5.6 / 5.7.

## ⛔ HARD PREREQUISITE — Story 5.1 must be implemented & merged first

Story 5.1 is currently `ready-for-dev` (documented) but **NOT yet implemented in
code** (verified on this branch): `backend/battle-service/`, `frontend/api/battles.ts`,
`frontend/hooks/useRoomBattle.ts`, `frontend/hooks/useBattleActions.ts`, and the
`frontend/app/munchkin/[roomNumber]/(battle)/` route **do not exist**. Story 5.3
**cannot be implemented until 5.1 is merged** because it directly extends 5.1's seam:

- `backend/battle-service/src/{app.ts,service.ts,models/Battle.ts,publisher.ts}` (5.1 Tasks 1–3, 7) — 5.3 adds the PATCH route + an update method on the model wrapper.
- `frontend/api/battles.ts` (5.1 Task 8) — 5.3 adds `patchBattle` + `PatchBattlePayload`; consumes the existing `Battle`/`BonusItem`/`MonsterItem`/`BattleStatus` types.
- `frontend/hooks/useBattleActions.ts` (5.1 Task 10) — 5.3 adds the `patch` method to the existing `start`-only hook.
- `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` (5.1 Task 11) — 5.3 replaces the load-and-display **skeleton** Player/Monster placeholders with the real management UI.
- `frontend/hooks/useRoomBattle.ts` (5.1 Task 9) — 5.3 reads the active battle via this hook (key `['battle', roomId]`).

Stories **3.1** (AppTheme token migration) and **3.2** (`[roomNumber]/index.tsx`
directory route) — the "Depends on" listed in the epic — are **done**. Story **5.2**
(Room View banner) is a **parallel, independent** frontend story; 5.3 does **not**
depend on 5.2 and must not touch the banner or Room View. If a dev agent picks this
up before 5.1 is merged, **HALT and report the blocked dependency** rather than
re-creating 5.1's service/model/api/hook/route (that would duplicate work and
diverge — anti-pattern).

## Acceptance Criteria

1. **Two-sided view with totals/outcome comparison.** Given I am in the Battle View for an active battle, when the screen loads, then I see a **player side** and a separate **monster side** (player side uses `AppTheme.colors.accent` `#D4C26E`, monster side uses `AppTheme.colors.danger` `#922525`); and each side shows its current effective-strength total, plus a non-authoritative comparison indicator of the two totals.
2. **Manage player side (room characters).** Given I am managing the player side, when I add or remove room characters, then the (local draft) battle state updates to reflect the selected participants; the available choices are the room's current characters; and the player side is persisted as `playerSide.characterIds: string[]`.
3. **Manage monster side.** Given I am managing the monster side, when I add or remove monsters (each monster has a `name` and a numeric `level`), then the (local draft) battle state updates to reflect the selected monsters, persisted as `monsterSide.monsters: MonsterItem[]`.
4. **Manage bonuses on either side (remove + re-add, not in-place edit).** Given I am managing either side, when I add or remove bonus items (each bonus has a signed integer `value`), then the (local draft) battle state updates to reflect those modifiers; bonus items are **removed and re-added rather than edited in place** (no in-place value editing UI); each bonus carries a client-generated id; bonuses are persisted as `{playerSide|monsterSide}.bonuses: BonusItem[]`.
5. **Save persists full side state; only active battles updatable.** Given I save a battle-state change, when the update is submitted, then the **full updated side state** (`playerSide` and/or `monsterSide`, and `name` if changed) is sent and persisted for the active battle via `PATCH /battles/:id` (server replaces the arrays wholesale — last-write-wins); and **only `status: 'active'` battles can be updated** — a PATCH against a non-active (concluded/discarded) battle returns `409` and the persisted state is unchanged.

## Scope Boundaries (READ FIRST — prevents over-build and regressions)

**IN scope for 5.3:**

- **Backend (`battle-service`, created by 5.1):**
  - `PATCH /battles/:id` route (in `src/app.ts`, inline — repo convention; **no `routes/` folder** even though the architecture diagram shows one): full-replace of `name`, `playerSide`, `monsterSide`; status guard (`active` only → `409`); validation (`400`); not-found (`404`, incl. `CastError`); unexpected → `502`.
  - Add a `findById` + `findByIdAndUpdate` method to the `BattleModelLike` wrapper in `src/service.ts` (mirror `character-service/src/service.ts`).
  - Call the existing 5.1 **no-op publisher seam** after a successful PATCH inside a `try/catch` that logs-but-never-throws (stable call site for Story 5.4). Still a no-op here.
  - Backend tests (co-located `app.test.ts`/`service.test.ts`, supertest) + `sam/events/battle-patch-battle.json`.
- **Frontend:**
  - `api/battles.ts`: add `patchBattle(battleId, payload): Promise<Battle>` and exported `PatchBattlePayload` type. Surface the `409` (not-active) distinctly via `ApiError`.
  - `hooks/useBattleActions.ts`: add `patch(battleId, payload) => Promise<Battle>`; `useMutation`; invalidate `['battle', roomId]` on settle. Extend the existing `{ start, isLoading, errorMessage }` return to `{ start, patch, isLoading, errorMessage }` (do **not** pre-stub `conclude`/`discard` — 5.6/5.7 add them; project rule: no half-finished implementations).
  - `app/munchkin/[roomNumber]/(battle)/index.tsx`: replace 5.1's skeleton Player/Monster placeholders with the real two-sided management UI (totals, add/remove characters, add/remove monsters, add/remove bonuses, Save). Read active battle via `useRoomBattle(roomId)`; read room characters via `useRoomCharacters(roomId, userProfile)` (mirror Room View) to render/select player-side participants and compute the player total.
  - New presentational components under `frontend/components/munchkin/` for the side panels / rows (pure RN `StyleSheet` + `AppTheme` tokens; no third-party UI lib). Mirror existing component conventions.
  - Tests: co-located component tests; extend the Battle View route test under `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...`; `api/battles.test.ts` + `hooks/useBattleActions.test.ts` extensions.
  - Cross-surface verification (backend + frontend typecheck/test/coverage; manual web smoke).

**OUT of scope (explicitly owned by other stories — do NOT build here):**

- ❌ **Realtime / WebSocket battle updates** (`battle_updated` publish + WS fan-out) → **Story 5.4**. Do NOT wire SNS/Redis publishing, do NOT modify `room-notifications-service`, do NOT extend `RoomWebSocketClient`/`useRoomWebSocket`, do NOT add SNS topics/IAM publish in SAM, do NOT add a WS subscription to `useRoomBattle`. Use only 5.1's no-op publisher seam. **None of the 5.3 ACs require realtime** — the Battle View reflects state from `useRoomBattle`'s mount-time query + local draft + post-Save refetch.
- ❌ **Realtime reconciliation of room character changes into the battle** (character updated/deleted while battle active) → **Story 5.5**. 5.3 resolves player-side display from the room characters available at mount; it does not subscribe to live character events or reconcile mid-session. (ADR-9: no backend cascade; battle record retains original `characterIds`.)
- ❌ **Conclude** (`POST /battles/:id/conclude`, required `result`, `status → concluded`) and the Conclude UI/primary button → **Story 5.6**. PATCH never sets `status` or `result`.
- ❌ **Discard** (`DELETE /battles/:id`, confirmation, `status → discarded`) and the Discard destructive UI → **Story 5.7**.
- ❌ **`log-service` / `battle_updated` logging** → **Epic 6**. ADR-5: `battle_updated` is NOT logged anyway. Do not create log topics/models/env.
- ❌ Re-creating the 5.1/5.2 seam: `battle-service` scaffold/model/`POST`/`GET`, `useRoomBattle`, `useBattleActions.start`, `ActiveBattleBanner`, the `(battle)` modal route + layout. **Consume, do not redefine.**
- ❌ Modifying the `Battle` Mongoose schema. 5.1 defined the **full** schema (all fields incl. `playerSide`/`monsterSide`/`result`/`concludedAt`). 5.3 only **writes** `name`/`playerSide`/`monsterSide` via PATCH — do not alter `Battle.ts`.
- ❌ Touching Room View (`[roomNumber]/index.tsx`) or the Room View Battle button/banner.

## Tasks / Subtasks

- [x] **Task 1 — Backend: `findById` + `findByIdAndUpdate` on the battle model wrapper** (AC: 5)
  - [x] In `backend/battle-service/src/service.ts`, extend the `BattleModelLike` interface + `createBattleModel()` with `findById(id)` and `findByIdAndUpdate(id, updates, options)` methods, mirroring `backend/character-service/src/service.ts` (same `console.info` logging style, same null-on-not-found, same `{ new: true, runValidators: true }` usage by the caller). Map the Mongoose doc through the same response shaping 5.1 uses (`toJSON` exposes `id`, never `_id`/`__v`).
  - [x] Keep the wrapper type exported so `app.test.ts` can inject a mock model (5.1 test pattern).

- [x] **Task 2 — Backend: `PATCH /battles/:id` route** (AC: 1, 2, 3, 4, 5)
  - [x] Add `app.patch('/battles/:id', ...)` **inline in `src/app.ts`** (repo convention — `character-service` has no `routes/` folder; do NOT introduce one despite the architecture diagram).
  - [x] Whitelist updatable fields only: `name`, `playerSide`, `monsterSide` (mirror character-service's allowed-keys whitelist loop). If none present → `400 { message }` ("No valid fields provided for update"). Reject `status`/`result`/`roomId` silently (not in whitelist) — those are owned by create/conclude/discard.
  - [x] **Validation (all `400 { message }`):**
    - `name` (if present): non-empty string after `trim()` (5.1 product decision — `name` is required/non-empty, overrides ADR-13; never nullable). Store trimmed.
    - `playerSide` (if present): object with `characterIds: string[]` (array of non-empty strings) and `bonuses: BonusItem[]`. Replace wholesale.
    - `monsterSide` (if present): object with `monsters: MonsterItem[]` and `bonuses: BonusItem[]`. Replace wholesale.
    - `BonusItem`: `{ id: string (non-empty, opaque), value: number (integer; may be negative/zero) }`. Reject non-integer/`NaN` values.
    - `MonsterItem`: `{ id: string (non-empty, opaque), name: string (non-empty, trimmed), level: number (integer, ≥ 0) }`.
    - Treat `id` as an **opaque non-empty string** — do NOT enforce UUID format (client generates UUID v4 but the backend must not couple to that). Reject duplicate ids within a side's array.
  - [x] **Lookup + status guard (order matters):** find battle by `:id`. If not found → `404 { message: 'Battle not found' }`. Catch Mongoose `CastError` (bad ObjectId) → also `404` (mirror character-service). If found but `status !== 'active'` → `409 { message: 'Battle is not active' }` (ADR-8) — do **not** mutate.
  - [x] Apply the update via `findByIdAndUpdate(id, updates, { new: true, runValidators: true })`. Arrays are replaced wholesale (full-replace / last-write-wins — ADR-16). Respond `200` with the updated battle JSON (direct resource, no envelope).
  - [x] After success: call `publisher.publish(...)` (5.1's no-op seam) inside `try/catch` that logs but never throws — placeholder for Story 5.4's `battle_updated`. Do NOT build the payload/transport here.
  - [x] Unexpected errors flow to the **`502 { message: 'Unexpected error' }`** handler 5.1 established (NOT `500`, NOT `{ message, details }` — architecture rule; this intentionally diverges from character-service's existing `500` handler).

- [x] **Task 3 — Backend wiring & tests** (AC: 5)
  - [x] `backend/sam/template.yaml`: add a `BattlePatch` HttpApi event (`Path: /battles/{id}`, `Method: PATCH`) to `BattleServiceFunction` (mirror `CharacterUpdatePatch`). Do **not** add SNS topics/IAM publish (Story 5.4).
  - [x] `backend/sam/events/battle-patch-battle.json`: new HttpApi `PATCH /battles/:id` test event (model on the existing character PATCH / `user-post-users.json` envelope).
  - [x] `backend/nginx/nginx.conf`: confirm the 5.1 `/battles` location block already proxies PATCH (it mirrors `/characters`, whose `Access-Control-Allow-Methods` includes `PATCH`). No change expected — note "verified" in completion notes. If 5.1's block omitted PATCH, add it (kept consistent with `/characters`).
  - [x] Backend tests (co-located `<source>.test.ts`, run by root `backend/vitest.config.ts`, supertest, mock model injected per 5.1 pattern). Cover: success — PATCH replaces `playerSide`/`monsterSide`/`name` (`200`, correct shape, `id` not `_id`); validation `400` (no valid fields; bad bonus value; bad monster level; duplicate ids; empty `name`); `404` (missing battle + `CastError`); **`409` when battle `status` is `concluded`/`discarded`**; unexpected error → `502`. Full-replace semantics asserted (old array fully replaced, not merged).

- [x] **Task 4 — Frontend `api/battles.ts`: `patchBattle`** (AC: 1, 5)
  - [x] Add exported type `PatchBattlePayload = { name?: string; playerSide?: PlayerSide; monsterSide?: MonsterSide }` where `PlayerSide = { characterIds: string[]; bonuses: BonusItem[] }` and `MonsterSide = { monsters: MonsterItem[]; bonuses: BonusItem[] }` (reuse/derive from the `Battle`/`BonusItem`/`MonsterItem` types 5.1 exports — do not redefine them).
  - [x] `patchBattle(battleId: string, payload: PatchBattlePayload): Promise<Battle>` → `apiRequest<Battle>(\`/battles/${encodeURIComponent(battleId)}\`, { method: 'PATCH', body })`. Build `body` by including only present keys (mirror `updateCharacter`'s `hasOwnProperty` selective-body pattern in `frontend/api/characters.ts`). Use `apiRequest` from `@/api/http` only — never raw fetch/axios.
  - [x] `ApiError` (status, details) propagates; callers distinguish `409` (not active) from `400`/other.

- [x] **Task 5 — Frontend `hooks/useBattleActions.ts`: add `patch`** (AC: 5)
  - [x] Add `patch: (battleId: string, payload: PatchBattlePayload) => Promise<Battle>` implemented as a `useMutation` calling `patchBattle`; on settle `invalidateQueries({ queryKey: ['battle', roomId] })` (consistent with 5.1's `start`). Keep the existing `start`; return `{ start, patch, isLoading, errorMessage }`. (`isLoading`/`errorMessage` aggregate across mutations as 5.1 does for `start`.)
  - [x] Do not add `conclude`/`discard` (Stories 5.6/5.7).

- [x] **Task 6 — Frontend Battle View: real two-sided management UI** (AC: 1, 2, 3, 4, 5)
  - [x] In `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` (5.1's skeleton): keep 5.1's `roomId` derivation, `useRoomBattle(roomId)`, modal presentation, loading/error states, and back-navigation. Replace the placeholder Player/Monster sections with the real UI below. Add `useUserProfile()` + `useRoomCharacters(roomId, userProfile)` (mirror `frontend/app/munchkin/[roomNumber]/index.tsx`) to source/select player-side characters and compute the player total.
  - [x] **Local draft state:** initialize a draft `{ name, playerSide, monsterSide }` from `battle` on load; all add/remove actions mutate the **draft** only (immediate local UI update per AC2/3/4). Track dirty state. **Save** submits the full changed side(s) via `useBattleActions().patch(battle.id, draft)` — full-replace; on success the `['battle', roomId]` invalidation refetches and re-syncs the draft. Mirror `QuickEditSheet`'s Clean / Dirty (Save active) / Saving (Save disabled, `surfaceSubtle` bg) states.
  - [x] **Player side (`accent` `#D4C26E`):** list current participants resolved by joining `playerSide.characterIds` with room characters (show name + level; if an id has no matching room character, show a neutral "Unavailable" row — do not crash; full reconciliation is 5.5). Add via a picker/list of room characters not yet in the battle (reuse `@/components/munchkin/NativePicker` + the add-row pattern from `modal-change-caracter.tsx` class selection: existing rows each with a `−` remove; a trailing select + `+` add). Removing toggles the id out of `characterIds`.
  - [x] **Monster side (`danger` `#922525`):** list `monsterSide.monsters` (name + level), each with a `−` remove; an add row with a name text input + a numeric level stepper + `+` add. Numeric stepper: mirror `QuickEditSheet` `stepperRow`/`stepperButton` (44×44 tap target, `Light` haptic on tap, floor 0, `accent` value text). First monster is the "main" monster, subsequent are "wandering" — display-only nuance; no separate UX required by the ACs.
  - [x] **Bonuses (both sides):** list `bonuses` (signed int `value`), each with a `−` remove. Add row: a numeric value input/stepper (allow negative — sign toggle or +/- stepper that crosses zero) + `+` add. **No in-place edit** of an existing bonus (AC4) — to change a value, remove and add a new one. Generate `BonusItem.id` (and new `MonsterItem.id`) as **UUID v4 client-side** via a tiny inline RFC4122-v4 helper (the repo has **no** uuid/expo-crypto dependency and the project rule forbids incidental dependency additions — do not add a package; see Dev Notes "Client-generated item IDs").
  - [x] **Totals + comparison (AC1):** show each side's effective strength: player = Σ(level of room characters whose id ∈ draft `playerSide.characterIds`) + Σ(draft `playerSide.bonuses[].value`); monster = Σ(draft `monsterSide.monsters[].level`) + Σ(draft `monsterSide.bonuses[].value`). Show a **non-authoritative** comparison label (e.g. "Players ahead" / "Monsters ahead" / "Even") — purely informational. Do **NOT** auto-decide a winner, auto-conclude, or encode Munchkin tie rules; the explicit result is chosen at Conclude (Story 5.6).
  - [x] Styling: pure `StyleSheet.create` with `AppTheme` tokens only (no hardcoded hex/px/font sizes). Player side `AppTheme.colors.accent`, monster side `AppTheme.colors.danger`, Save = primary `accent` (one primary per screen — UX-DR19), text/spacing/radius/typography via tokens. Add stable `testID`s and accessibility (`accessibilityRole="button"`, labels) on add/remove/save controls (mirror `RoomCharacterCard`/`QuickEditSheet`/`VioletButton`).
  - [x] Extract side panels / rows into presentational components under `frontend/components/munchkin/` (PascalCase, `memo`, explicit prop interface, default export, `StyleSheet` at bottom referencing `AppTheme`) — no data fetching/navigation inside; the screen owns hooks/navigation/Save.

- [x] **Task 7 — Tests** (AC: 1, 2, 3, 4, 5)
  - [x] Frontend (co-located, Vitest+jsdom; coverage scope = `api/**`,`hooks/**`): extend `frontend/api/battles.test.ts` (mock `@/api/http`; assert PATCH URL/encoding, selective body, `409` surfacing) and `frontend/hooks/useBattleActions.test.ts` (wrap in `QueryClientProvider`, mock `@/api/battles`; assert `patch` calls `patchBattle` and invalidates `['battle', roomId]`).
  - [x] Component tests (co-located `*.test.tsx`) for the new side/row components: add/remove characters, add/remove monsters (name+level), add/remove bonuses, **no in-place bonus edit**, totals/comparison computation, dirty→Save enable, accessibility roles/labels.
  - [x] Battle View route/screen test under `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/...` (NOT under `frontend/app` — Expo Router forbids non-route files there). Extend 5.1's harness: `vi.mock` `@/hooks/useRoomBattle`, `@/hooks/useBattleActions`, `@/hooks/useCharacters` (or `useRoomCharacters`), `@/hooks/useUser`, `expo-router` via `vi.hoisted` mutable refs (mirror the `[roomNumber].test.tsx` pattern). Assert: loads sides from battle; add/remove updates draft; Save calls `patch` with the **full** changed side(s); a non-active battle path surfaces the `409` (no silent success); back-nav unaffected.
  - [x] Meet the **70% line coverage floor** for both pipelines; assert behaviour/contracts, not internals. Do not widen the frontend coverage `include` scope (`api/**`,`config/**`,`hooks/**`).

- [ ] **Task 8 — Cross-surface verification** (AC: 1, 2, 3, 4, 5)
  - [x] Backend: from `backend/`, `npm run typecheck` and `npm test`/`test:coverage` pass with battle-service PATCH included.
  - [x] Frontend: from `frontend/`, strict typecheck + `vitest run --coverage` pass (≥70% line floor, no regression to existing tests).
  - [ ] Local manual smoke (`docker-compose` up, after 5.1 merged): create room → start battle → open Battle View → add 2 room characters + a `+3` and a `-1` player bonus; add a monster (name+level) + a monster bonus → totals update live → Save → reload Battle View, state persisted. Attempt a PATCH semantics check: confirm replacing one side does not wipe the untouched side. Verify on web at minimum; note any platform (iOS/Android) not verified.

## Dev Notes

### ⚠️ Architecture-doc vs. actual-repo conflict (inherited from 5.1 — read before wiring)

Story 5.1's Dev Notes document a confirmed divergence between the architecture docs
and the running repo (idealized event/topic model, `routes/` folders, per-service
vitest configs, `502` vs `500`). **For 5.3 this conflict stays contained because
event publishing is OUT of scope (Story 5.4).** Follow the **actual repo
conventions** established by `character-service` + 5.1 (inline routes in `app.ts`,
single root `backend/vitest.config.ts` + workspaces, `502` + `{ message }` error
shape for battle-service). Follow the architecture only for net-new battle PATCH
decisions (full-replace semantics, status guard, validation) where there is no
existing pattern to conflict with. Do NOT rename SNS topics or touch
`room-notifications-service`/`webSocket.ts` (would regress the working character
realtime flow).

### Battle PATCH contract (authoritative for this story)

- **Endpoint:** `PATCH /battles/:id` (route param `:id`, not `{id}`; kebab/lowercase plural resource).
- **Semantics (ADR-16, ADR-8):** Client sends the **complete** updated `playerSide`
  and/or `monsterSide` (and/or `name`). Server **replaces arrays wholesale** — no
  per-item merge. **Last-write-wins** for concurrent PATCH (no optimistic version
  check in this story). Status guard: must be `status: 'active'` → else `409`.
- **Battle schema (5.1 is authoritative; do NOT modify `Battle.ts`):**
  ```typescript
  // collection: battles  (id aliased from _id via toJSON; never raw _id/__v)
  {
    id: string, roomId: string,
    name: string,                         // REQUIRED non-empty (5.1 override of ADR-13)
    status: 'active' | 'concluded' | 'discarded',
    playerSide:  { characterIds: string[]; bonuses: BonusItem[] },
    monsterSide: { monsters: MonsterItem[]; bonuses: BonusItem[] },
    result: 'players_win' | 'monster_wins' | null,   // PATCH never touches this
    createdAt, concludedAt: Date | null, updatedAt
  }
  type BonusItem  = { id: string; value: number }            // value: signed integer
  type MonsterItem = { id: string; name: string; level: number }
  ```
- **Effective strength (AC1, architecture "Effective strength calculation"):**
  - Player = `Σ(level + power of room characters whose id ∈ playerSide.characterIds)` + `Σ(playerSide.bonuses[].value)`.
    Dev note, 2026-05-20: PR #94 corrected the implementation and tests so
    battle participants contribute their full character strength (`level + power`),
    not level alone. Participant rows display this combined contribution as
    `Power <sum>` rather than separate Level and Power labels.
  - Monster = `Σ(monsterSide.monsters[].level)` + `Σ(monsterSide.bonuses[].value)`
  - The battle persists only `characterIds` (a snapshot of IDs) — **not** character
    levels or power. Level and power are resolved client-side from the room's current characters
    (`useRoomCharacters`). This is intentional: ADR-9 (battle retains original
    `characterIds`; no backend cascade); live reconciliation of character edits is
    Story 5.5, not 5.3.
- **Response/error shapes:** success `200` + battle JSON (direct, no envelope). All
  errors `{ message: string }` only (no `details`). Codes: `400` validation, `404`
  not found (+ `CastError`), `409` not active, `502` unexpected (never `500`).
  [Source: architecture/core-architectural-decisions.md#api-design (PATCH semantics,
  ADR-2/8/16), architecture/implementation-patterns-consistency-rules.md#http-status-codes,
  #error-responses]

### Resolved decisions (confirmed by Ivan, 2026-05-17)

1. **Explicit Save submits a full-replace PATCH; add/remove mutate a local draft
   only.** Rationale: epic AC5 says "When I **save** a battle-state change / When the
   update is **submitted** / Then the **full** updated side state is persisted",
   while AC2–4 say add/remove "updates the battle state" (interpreted as the local
   working state). This matches architecture full-replace + last-write-wins and the
   established `QuickEditSheet` Clean/Dirty/Saving Save-on-tap pattern. Alternative
   (auto-PATCH on every add/remove) would be chatty, fights last-write-wins, and
   contradicts "when the update is submitted". **Chosen: explicit Save.**
2. **Player-side participant source = current room characters via
   `useRoomCharacters`; battle persists only `characterIds`; display levels resolved
   live.** Full realtime reconciliation deferred to Story 5.5; unresolved ids render
   a neutral row, not a crash. (Consistent with ADR-9.)
3. **Outcome comparison is a non-authoritative visual indicator only** (e.g. "Players
   ahead / Monsters ahead / Even"). No auto-winner, no auto-conclude, no Munchkin
   tie-rule encoding — the explicit `result` is chosen at Conclude (Story 5.6).
4. **Client-generated item IDs without a new dependency** (see next section).

### Client-generated item IDs (BonusItem.id / MonsterItem.id)

Architecture (ADR-16) says the client generates `BonusItem.id` / `MonsterItem.id`
as **UUID v4**. Verified: the frontend has **no** `uuid`, `nanoid`, or
`expo-crypto` dependency, and `globalThis.crypto.randomUUID` is not reliably present
on React Native (Hermes). The project rule forbids incidental dependency/lockfile
changes. **Decision (confirmed by Ivan, 2026-05-17):** add a tiny inline RFC4122-v4
generator in a frontend util (**no new package** — do not add `expo-crypto` or any
uuid lib) and use it for new bonus/monster ids; the **backend treats `id` as an
opaque non-empty string** (no UUID-format validation) so it stays decoupled.
[Source: architecture/core-architectural-decisions.md#adr-16; project-context.md
"Do not change dependency versions or lockfiles incidentally"]

### Files to create / modify (exact paths)

- **MODIFY (backend, all created by 5.1):** `backend/battle-service/src/app.ts`
  (add PATCH route), `backend/battle-service/src/service.ts` (add
  `findById`/`findByIdAndUpdate` to `BattleModelLike`), co-located
  `app.test.ts`/`service.test.ts`, `backend/sam/template.yaml` (add `BattlePatch`
  HttpApi event). **NEW (backend):** `backend/sam/events/battle-patch-battle.json`.
  Verify (likely no change): `backend/nginx/nginx.conf` `/battles` block already
  allows PATCH (mirrors `/characters`). Do NOT modify `backend/battle-service/src/models/Battle.ts`.
- **MODIFY (frontend, created by 5.1):** `frontend/api/battles.ts` (+ `patchBattle`,
  `PatchBattlePayload`), `frontend/hooks/useBattleActions.ts` (+ `patch`),
  `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` (real UI), co-located
  `battles.test.ts`/`useBattleActions.test.ts`. **NEW (frontend):** side/row
  presentational components in `frontend/components/munchkin/` (+ co-located
  `*.test.tsx`), a small UUID-v4 util (e.g. `frontend/utils/uuid.ts` — match repo's
  existing util location convention; check for an existing `utils/`/`lib/` dir
  first), Battle View route test under `frontend/__tests__/app/munchkin/[roomNumber]/(battle)/`.

### Existing patterns to mirror (do not reinvent)

- **Backend PATCH:** `backend/character-service/src/app.ts` `app.patch('/characters/:characterId', ...)`
  — allowed-keys whitelist loop, per-field validation with `400 { message }`,
  `findByIdAndUpdate(id, updates, { new: true, runValidators: true })`,
  `404` on null, `CastError → 404`, `next(error)` to the error handler. Mirror this
  shape; diverge only on the error code (**502** not 500, per 5.1/architecture) and
  add the **`409` active-status guard** (no character-service equivalent).
- **Backend service wrapper:** `backend/character-service/src/service.ts`
  `createCharacterModel()` `findByIdAndUpdate`/`findByIdAndDelete` — same
  `console.info` logging, null-on-not-found, response mapping.
- **Backend tests:** `backend/character-service/src/app.test.ts` — `supertest`,
  `buildCharacterModel()` with `vi.fn()` per method, inject via `createApp(model)`,
  success + failure assertions.
- **Frontend api:** `frontend/api/characters.ts` `updateCharacter` — selective body
  via `hasOwnProperty`, `apiRequest<...>(\`/x/${encodeURIComponent(id)}\`, { method: 'PATCH', body })`.
- **Frontend mutation hook:** `frontend/hooks/useCharacters.ts` `updateMutation`
  (`useMutation` + `onSettled` invalidate `['characters', roomId]`); aggregate
  `isLoading`/`errorMessage`. Use the **same query key shape** `['battle', roomId]`
  5.1 established — never invent custom keys.
- **Stepper / numeric control:** `frontend/components/munchkin/QuickEditSheet.tsx`
  `stepperRow`/`stepper`/`stepperButton`/`value` (44×44 tap target, `Light` haptic
  per tap, `accent` value text) and `modal-change-caracter.tsx` increment/decrement.
- **Add/remove list rows + picker:** `frontend/app/munchkin/modal-change-caracter.tsx`
  class-selection block (`.map` existing rows each with `−`; a trailing
  `NativePicker` + `+` add); `@/components/munchkin/NativePicker` for selects.
- **Component conventions:** `frontend/components/munchkin/RoomCharacterCard.tsx` /
  `RoomCharactersList.tsx` / `VioletButton.tsx` — PascalCase file, `memo`, explicit
  prop interface, default export, `StyleSheet.create` at bottom referencing
  `AppTheme`, `testID` + accessibility props.
- **Screen wiring (roomId + hooks):** `frontend/app/munchkin/[roomNumber]/index.tsx`
  — `const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;`,
  `const { userProfile } = useUserProfile();`, `useRoomCharacters(roomId, userProfile)`.
- **Route-test harness:** `frontend/__tests__/app/munchkin/[roomNumber].test.tsx`
  — `vi.hoisted` mutable refs, `vi.mock` for `expo-router`/hooks, `QueryClientProvider`
  wrapper. Extend the analogous Battle View test 5.1 creates; never add test files
  under `frontend/app`.

### AppTheme tokens (frontend/constants/theme.ts — use these, no literals)

`colors`: `background #3C3636`, `surface #473F3F`, `elevated #4C4545`,
`accent #D4C26E` (**player side / Save primary**), `textPrimary #FFFFFF`,
`textMuted #D9D9D9`, `textAccentSoft #E8D89A`, `danger #922525`
(**monster side / destructive — but no destructive action in 5.3**),
`actionSecondary #6E6BD4`, `surfaceWarm #8A6150`, `surfaceSubtle #353535`
(disabled/Saving). `spacing` `{xs:4, sm:8, md:12, lg:16, xl:24}`. `radius`
`{sm:5, md:8, lg:12, pill:999}`. `typography` `{caption, labelSm, labelMd}`.
Button hierarchy (UX-DR19): exactly one primary (`accent`) per screen = **Save**;
no Conclude/Discard buttons in 5.3 (5.6/5.7).

### Project Structure Notes

- Backend services are isolated bounded contexts; `battle-service` owns the
  `battles` collection exclusively — no cross-service reads/writes, no synchronous
  inter-service HTTP. Backend TS is **non-strict** (`NodeNext`, `strict:false`);
  frontend TS is **strict**. Do not normalize one to the other.
- Frontend layered boundaries: `app/` route composes the screen + owns hooks/Save;
  `components/munchkin/` is presentational (no fetching/navigation inside);
  `hooks/` orchestrates data; `api/` owns transport. Every file under
  `frontend/app` must be a route/layout — side/row components live in
  `components/munchkin/`, their tests co-located; the Battle View route test lives
  under `frontend/__tests__/app/...`.
- Naming: collection/fields camelCase; api module `battles.ts`/hook
  `useBattleActions.ts` (camelCase); components PascalCase
  (`BattleView*`/`BattleSide*`); test casing mirrors source exactly. Backend
  co-located `*.test.ts`; frontend route tests in `frontend/__tests__`.
- Definition of done: every touched surface (backend, frontend) passes its own
  typecheck/test/coverage gate; 70% line coverage is a CI hard gate; assert
  behaviour/contracts, not coverage padding. Update `backend/README.md` only if
  endpoint behaviour/docs changed (PATCH is new — add a one-line entry).

### Previous-story intelligence (Story 5.1 — the in-epic predecessor; 5.2 parallel)

Story 5.1 (`5-1-start-a-battle.md`, `ready-for-dev`, **not yet coded**) builds the
entire battle seam 5.3 extends. Locked 5.1 decisions 5.3 must respect:

- **`name` is required, non-empty** (5.1 product decision confirmed by Ivan
  2026-05-16, overrides ADR-13 "nullable"). PATCH must reject empty/whitespace
  `name`; never set it null. Default-name generation stays in the presentational
  layer (5.1) — 5.3 does not generate names.
- **`useRoomBattle` (5.1 Task 9):** `{ battle: Battle | null; isLoading;
  errorMessage; refresh }`, TanStack key `['battle', roomId]`, HTTP-on-mount only
  (no WS — that's 5.4). 5.3 reads `battle` and uses `refresh`/invalidation post-Save.
- **`useBattleActions` (5.1 Task 10):** currently `{ start, isLoading,
  errorMessage }`. 5.3 **adds** `patch` only (architecture's full interface also
  lists `conclude`/`discard` — those are 5.6/5.7; do not pre-stub).
- **Battle View is a modal `(battle)` group (5.1 Task 11, ADR-4).** 5.3 does not
  reconfigure routing/layout — it only changes the screen's body content. Back
  navigation must still return to Room View without refetching room state.
- **No-op publisher seam (5.1 Task 7):** `publisher.publish(...)` is a stable
  no-op call site. 5.3 calls it post-PATCH in try/catch; real `battle_updated`
  payload/transport is Story 5.4.
- **Error handler is `502 { message }`** for battle-service (5.1 Task 1) — not
  character-service's `500 { message, details }`.

Recent git history (`#54/#55/#57`, Epic 4/5 docs + orchestrator) is
documentation-only; team convention = **one focused PR per story with each touched
surface's quality gate green**. Keep 5.3 scoped to PATCH + Battle View management.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-battle-management.md#story-53-manage-battle-state] (AC, "Covers: UX-DR13", "Depends on: 3.1, 3.2")
- [Source: _bmad-output/implementation-artifacts/5-1-start-a-battle.md] (the seam: battle-service scaffold/model/POST/GET, `api/battles.ts`, `useBattleActions.start`, `useRoomBattle`, `(battle)` modal route, 502 error shape, no-op publisher, name decision)
- [Source: _bmad-output/implementation-artifacts/5-2-show-active-battle-in-room-view.md] (parallel/independent — confirms 5.1 not yet coded; 5.3 must not touch Room View/banner)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#api-design, #battle-schema, #frontend-architecture] (PATCH full-replace semantics, status guard, effective-strength calc, ADR-2/4/8/9/13/16)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md] (naming, direct response, `{message}` errors, HTTP status codes, `useBattleActions` interface, `['battle', roomId]` key, test co-location, 502-not-500)
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md#new-frontend-files, #modified-backend-services, #data-ownership] (file map; battle-service owns `battles`; no inter-service HTTP)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md#114-new-reusable-components, #113-new-screens] (Battle screen entry/back-nav)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md#121-button-hierarchy, #122-feedback-patterns, #124-form-patterns] (one primary per screen, steppers 44×44 + Light haptic + floor 0, validation on Save tap)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/10-user-journey-flows.md#104-journey-4-battle-lifecycle] (Battle View: add players → add monster+level → configure; battle owned by room — any player manages)
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md#UX-DR13] (two-sided layout colors, BonusItem/MonsterItem lists, PATCH; conclude/discard are separate stories) + FR22–FR25
- [Source: backend/character-service/src/{app.ts,service.ts}] (PATCH route + model-wrapper reference pattern)
- [Source: frontend/api/{http.ts,characters.ts}, frontend/hooks/{useCharacters.ts,useUser.ts}, frontend/components/munchkin/{QuickEditSheet.tsx,RoomCharacterCard.tsx,NativePicker.tsx}, frontend/app/munchkin/modal-change-caracter.tsx, frontend/constants/theme.ts] (frontend patterns)
- [Source: _bmad-output/project-context.md] (all critical implementation rules: strict/non-strict TS split, no incidental deps, 70% coverage floor, minimal-edits, error-shape consistency)

### Decision log — all confirmed by Ivan (2026-05-17)

All four prior open questions are **CONFIRMED** — implement exactly as stated; no
remaining ambiguity:

1. **Save model:** ✅ Explicit **Save submits a full-replace PATCH**; add/remove
   mutate local draft state only (no auto-PATCH per add/remove).
2. **Item IDs / dependency:** ✅ Tiny **inline UUID-v4 helper, no new dependency**
   (do not add `expo-crypto`/uuid); backend treats `id` as an opaque non-empty
   string.
3. **Outcome comparison:** ✅ **Non-authoritative** indicator only ("Players ahead /
   Monsters ahead / Even"); no winner/tie logic in 5.3 (winner decided explicitly
   at Conclude — Story 5.6).
4. **Player-side persistence:** ✅ Battle persists only `playerSide.characterIds`;
   levels resolved live from room characters; mid-session reconciliation deferred
   to Story 5.5.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-19: `backend/` `npm test -- --run battle-service/src/app.test.ts battle-service/src/service.test.ts battle-service/src/publisher.test.ts` passed.
- 2026-05-19: `backend/` `npm run typecheck` passed.
- 2026-05-19: `backend/` `npm test` passed.
- 2026-05-19: `backend/` `npm run test:coverage` passed, line coverage 80.25%.
- 2026-05-19: `frontend/` `npm run test:unit -- api/battles.test.ts hooks/useBattleActions.test.ts components/munchkin/BattleSidePanel.test.tsx` passed.
- 2026-05-19: `frontend/` `npm run test:room-route -- '__tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx'` passed.
- 2026-05-19: `frontend/` `npm run tsc` passed.
- 2026-05-19: `frontend/` `npm run test:coverage` passed, line coverage 80.61%.
- 2026-05-19: Review follow-up: Figma node `376:52` inspected for add-monster dialog design.
- 2026-05-19: Review follow-up: `frontend/` `npm run test:unit -- api/battles.test.ts hooks/useBattleActions.test.ts components/munchkin/BattleSidePanel.test.tsx` passed.
- 2026-05-19: Review follow-up: `frontend/` `npm run test:room-route -- '__tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx'` passed.
- 2026-05-19: Review follow-up: `frontend/` `npm run tsc` passed.
- 2026-05-19: Review follow-up: `frontend/` `npm run test:coverage` passed, line coverage 80.61%.
- 2026-05-19: Review follow-up: `frontend/` `npm run test:unit -- components/munchkin/BattleSidePanel.test.tsx` passed.
- 2026-05-19: Review follow-up: `frontend/` `npm run tsc` passed after default monster draft update.
- 2026-05-19: Review follow-up: `frontend/` `npm run test:unit -- components/munchkin/BattleSidePanel.test.tsx` passed after Add monster button style alignment.
- 2026-05-19: Review follow-up: `frontend/` `npm run tsc` passed after Add monster button style alignment.
- 2026-05-19: Review follow-up: reproduced local `PATCH /battles/:id` 404 as a stale `munch-battle-service` container missing the PATCH route; after `backend/scripts/dev-up.sh` rebuild, exact SAVED1007 PATCH returned `200 OK` and persisted state.
- 2026-05-19: Review follow-up: `frontend/` `npm run test:room-route -- '__tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx'` passed after comparison border update.
- 2026-05-19: Review follow-up: `frontend/` `npm run tsc` passed after comparison border update.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added battle-service PATCH support with full-replace `name`/`playerSide`/`monsterSide`, active-status guard, validation, `404` CastError mapping, `409` non-active response, and non-fatal no-op `battle_updated` publisher seam.
- Added SAM PATCH event and sample event; verified the nginx `/battles` block already permits `PATCH`.
- Added frontend `patchBattle` and `useBattleActions().patch` with battle query invalidation and `ApiError` propagation.
- Replaced the Battle View skeleton with draft-based two-sided management UI: player participants, unavailable rows, monster rows, bonus add/remove, totals, comparison, UUID-v4 item IDs, dirty/save/saving states, and conflict error surfacing.
- Added backend route/model tests plus frontend API, hook, side-panel, and Battle View route tests.
- Automated backend and frontend typecheck/test/coverage gates pass. Manual local web smoke remains pending because no interactive local browser/manual device surface was available in this run; story remains `in-progress`.
- Review comments addressed: replaced bonus steppers with fixed `-10, -5, -2, -1, +1, +2, +5, +10` buttons on both sides; replaced inline monster creation with a Figma-inspired Add monster modal using the existing local image asset and AppTheme tokens.
- Review comment addressed: Add monster dialog now opens with default `Fungeater` name and `25` power already entered so players can save immediately or overwrite.
- Review comment addressed: Add monster dialog Save/Cancel buttons now match the existing character modal button styling.
- Review comment verified: Save/PATCH works locally for room `SAVED1007` after rebuilding the local battle-service container with the current source.
- Review comment addressed: comparison container now has a 1px border that uses danger for monsters ahead, accent for players ahead, and surfaceSubtle for even.

### File List

- backend/README.md
- backend/battle-service/src/app.test.ts
- backend/battle-service/src/app.ts
- backend/battle-service/src/publisher.ts
- backend/battle-service/src/service.test.ts
- backend/battle-service/src/service.ts
- backend/sam/events/battle-patch-battle.json
- backend/sam/template.yaml
- frontend/__tests__/app/munchkin/[roomNumber]/(battle)/index.test.tsx
- frontend/api/battles.test.ts
- frontend/api/battles.ts
- frontend/app/munchkin/[roomNumber]/(battle)/index.tsx
- frontend/components/munchkin/BattleSidePanel.test.tsx
- frontend/components/munchkin/BattleSidePanel.tsx
- frontend/hooks/useBattleActions.test.ts
- frontend/hooks/useBattleActions.ts
- frontend/utils/uuid.ts
- _bmad-output/implementation-artifacts/5-3-manage-battle-state.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-05-19: Implemented backend PATCH contract, frontend battle-state management UI, and automated tests/verification. Story left in-progress pending manual local web smoke.
- 2026-05-19: Addressed review comments for bonus preset buttons and Figma-inspired monster add modal.
- 2026-05-19: Addressed review comment to prefill Add monster defaults.
- 2026-05-19: Addressed review comment to align Add monster dialog buttons with other modals.
- 2026-05-19: Verified reported local PATCH 404 was caused by stale local container image; rebuilt local stack and confirmed exact request succeeds.
- 2026-05-19: Addressed review comment for comparison container result-colored border.
- 2026-05-19: Code review (3 layers, 21 findings) — applied 7 patches: parchment color tokens added to AppTheme + hex literals replaced; draft-overwrite race fixed via id-aware useEffect; bonuses presence and characterIds duplicate validation added in backend parser; empty/whitespace name disables Save (with `accessibilityState`); monster dialog renamed Power → Level (label/testID/state); Save button text legible in disabled state. 5 items deferred (TOCTOU on status guard, http retry on 502, selective body shaping, status-aware read-only mode, haptic on bonus presets) and tracked in `deferred-work.md`. 9 noise findings dismissed. Backend 93/93 + battle-service 30/30 with new validation cases; frontend tsc clean; unit suite 121/121 with 80.61% line coverage; targeted (battle) route test 7/7 (including the new `disables Save when name is empty/whitespace` case). Story moved to `done`.

### Review Findings

_Adversarial code review — 2026-05-19 (Blind Hunter + Edge Case Hunter + Acceptance Auditor against `main...codex/manage-battle-state`)._

- [x] [Review][Patch] Hardcoded hex literals in monster-add-dialog button styles — `frontend/components/munchkin/BattleSidePanel.tsx` `monsterDialogButton` (`backgroundColor: '#D2ACAC'`) and `monsterDialogButtonText` (`color: '#CEB464'`, `textShadowColor: '#796834'`). Decision (Ivan, 2026-05-19): extend `AppTheme.colors` with parchment tokens (`parchmentSurface`, `parchmentText`, `parchmentTextShadow`) and replace the literals. Keep `fontFamily: 'Roboto'` as-is — it matches the established repo-wide pattern (`app/index.tsx`, `app/rooms.tsx`, `app/privacy.tsx`, `modal-change-caracter.tsx`, `modal-create-character.tsx`, etc.). _Applied 2026-05-19._
- [x] [Review][Patch] Draft state overwritten by every `battle` ref change — `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx:46-58`. `useEffect([battle])` unconditionally re-clones the draft whenever React Query returns a new object reference (background refetch, post-save invalidation, focus/network refetch), discarding any unsaved local edits made between save-click and refetch-resolve. Fix: gate the reset on `battle?.id`/`battle?.updatedAt` change AND skip while `battleActions.isLoading` is true, or rely on the manual `setDraft` after the awaited PATCH and avoid re-cloning when `isDirty`. _Applied 2026-05-19 — useEffect now resets only when `initializedBattleIdRef.current !== battle.id`; same-id refetches only re-sync `savedDraft` when its content differs, preserving the user's draft._
- [x] [Review][Patch] `parsePlayerSide` / `parseMonsterSide` produce a misleading error when `bonuses` is omitted — `backend/battle-service/src/app.ts:189-228`. Outer guards only check `characterIds` / `monsters`; missing `bonuses` falls through to `parseBonuses(undefined)` which returns "Field bonuses must be an array" instead of the side-level message. Fix: require `bonuses` to be `Array.isArray` in the outer guard so the error matches "Field playerSide/monsterSide must include …". _Applied 2026-05-19 — both guards now check `Array.isArray(value.bonuses)`._
- [x] [Review][Patch] Duplicate `characterIds` not rejected — `backend/battle-service/src/app.ts:189-207` (`parsePlayerSide`). Spec Task 2 says "Reject duplicate ids within a side's array"; this is enforced for `bonuses` and `monsters` via `hasDuplicateIds`, but `characterIds` is accepted as-is. Fix: add a Set-based uniqueness check on `characterIds` returning 400 on duplicates. _Applied 2026-05-19 — Set-based duplicate guard returns `'Field playerSide.characterIds must not contain duplicates'`._
- [x] [Review][Patch] Empty / whitespace-only battle name accepted into draft — `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx:135-141`. The `TextInput` writes any string into `draft.name`; Save then sends an empty name and the backend returns 400. Fix: treat `draft.name.trim() === ''` as not-savable (disable the Save button or surface inline validation), mirroring `QuickEditSheet`'s validate-on-Save pattern. _Applied 2026-05-19 — added `isNameValid` / `canSave`; Save button disabled (with `accessibilityState`) and `handleSave` guards against empty name._
- [x] [Review][Patch] Monster level field labelled "Power" instead of "Level" — `frontend/components/munchkin/BattleSidePanel.tsx` (`monsterDialogLabel: 'Power:'`, `testID="monster-power-input"`, internal `monsterPowerText` state). Spec/data model uses `level` consistently (AC3, `MonsterItem.level`, monster row text says "Level X"). Fix: rename the dialog label to "Level", rename the testID/state to monster-level / `monsterLevelText`. _Applied 2026-05-19 — `DEFAULT_MONSTER_LEVEL`, `monsterLevelText`, label "Level:", `testID="monster-level-input"`, `accessibilityLabel="Monster level"`. Component test updated to match._
- [x] [Review][Patch] Save button text invisible when disabled — `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` styles `saveButtonDisabled.backgroundColor = surfaceSubtle` and `saveButtonText.color = surfaceSubtle` → identical color when disabled. Fix: override the text color in the disabled state (e.g. `textMuted`) so the "Save" / "Saving" label is legible. _Applied 2026-05-19 — added `saveButtonTextDisabled` style with `textMuted` override._
- [x] [Review][Defer] TOCTOU race between `findById` status check and `findByIdAndUpdate` [`backend/battle-service/src/app.ts:380-395`] — deferred, no concurrent status flip is possible until Stories 5.6 (Conclude) / 5.7 (Discard) ship; revisit with an atomic `findOneAndUpdate({ _id, status: 'active' }, …)` when those stories land.
- [x] [Review][Defer] `apiRequest` retries PATCH on `502`, doubling no-op `battle_updated` publishes [`frontend/api/http.ts:52`] — deferred, pre-existing global retry policy; will matter once Story 5.4 wires the real publisher and consumer.
- [x] [Review][Defer] `handleSave` always sends the full draft (all three keys) instead of just changed sides [`frontend/app/munchkin/[roomNumber]/(battle)/index.tsx:104`] — deferred, full-replace semantics are still respected per ADR-16; selective-body shaping is a payload-size optimisation, not a correctness gap.
- [x] [Review][Defer] Edit controls remain interactive briefly when `battle.status` flips to non-active [`frontend/app/munchkin/[roomNumber]/(battle)/index.tsx`] — deferred, depends on Story 5.4 realtime status updates; backend 409 is the authoritative guard today.
- [x] [Review][Defer] No `Light` haptic on bonus preset / add / remove / save taps [`frontend/components/munchkin/BattleSidePanel.tsx`] — deferred, original stepper that the spec required haptics on was replaced by preset buttons during review; treat as UX polish under the haptic-consistency follow-up.

_Dismissed as noise (9): `Math.random` UUID (intentional dependency-free trade-off, spec-confirmed); dead-code `toParamString` defensive helper; redundant `NaN` re-check in `handleAddMonster`; validation-before-lookup existence leak (opaque ObjectIds); fragile-name in `'no valid fields'` test case (passes correctly today); `patchBattle` empty-body case (guarded by `isDirty`); stale `selectedCharacterId` after external removal (out-of-scope until 5.4/5.5); `NativePicker` not reused for character selection (chip UI is functionally equivalent); `publisher.ts` factory addition (within scope, transport stays no-op)._
