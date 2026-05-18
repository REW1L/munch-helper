# Story 5.2: Show Active Battle in Room View

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the Room View to clearly show when a battle is active,
so that I can tell the room is in battle state and return to it quickly.

This is the **second story of Epic 5 (Battle Management)**. It is a **frontend-only**
story that consumes the seam built by Story 5.1: it adds a new presentational
`ActiveBattleBanner` component and wires it into the existing Room View
(`app/munchkin/[roomNumber]/index.tsx`) using the `useRoomBattle` hook. No backend,
no realtime, no battle-state management.

## ⛔ HARD PREREQUISITE — Story 5.1 must be implemented first

Story 5.1 is currently `ready-for-dev` (documented) but **NOT yet implemented in code**
(verified: `frontend/api/battles.ts`, `frontend/hooks/useRoomBattle.ts`,
`frontend/hooks/useBattleActions.ts`, `backend/battle-service/`, and the
`app/munchkin/[roomNumber]/(battle)/` route **do not exist on this branch**). Story 5.2
**cannot be implemented until 5.1 is merged** because it depends on:

- `useRoomBattle(roomId)` hook → returns `{ battle: Battle | null; isLoading; errorMessage; refresh }` (5.1 Task 9)
- The `Battle` type exported from `frontend/api/battles.ts` (5.1 Task 8)
- The `(battle)` modal route at `app/munchkin/[roomNumber]/(battle)/index.tsx` and the navigation call 5.1 wires for the existing hidden Battle button (5.1 Task 11–12)

Stories 3.1 (AppTheme token migration) and 3.2 (`[roomNumber]/index.tsx` directory
route) are **done** — those prerequisites are satisfied. If a dev agent picks this up
before 5.1 is merged, **HALT and report the blocked dependency** rather than
re-creating 5.1's hook/route (that would duplicate work and diverge — anti-pattern).

## Acceptance Criteria

1. **Banner shown when a battle is active.** Given an active battle exists for the room (`useRoomBattle(roomId).battle !== null`), when I view the Room View, then an `ActiveBattleBanner` is rendered above the character list; the banner displays the battle `name` when available (it is always a non-empty string per 5.1's product decision) and falls back to the generic label `Battle in progress` if `name` is missing/empty; and the banner exposes a `View Battle` affordance.
2. **View Battle navigates to the Battle View.** Given an active battle banner is shown, when I trigger its `View Battle` action, then I am navigated to the Battle View `(battle)` route for the current room using the **same navigation call Story 5.1 uses for the Battle button**, and the Battle View loads the latest available battle state (load behaviour is owned by 5.1's Battle View; 5.2 only triggers navigation).
3. **No banner when no battle is active.** Given no battle is active for the room (`battle === null`), when I view the Room View, then no `ActiveBattleBanner` is rendered, and the existing Battle entry point (the Battle button wired by Story 5.1) remains available and unaffected for starting a battle.
4. **Warm resume reflects state without forced navigation.** Given I reconnect or reopen the app during an active room session, when the Room View mounts, then `useRoomBattle` performs its HTTP-on-mount query and the banner reflects the resulting state (present iff an active battle is returned), and the app does **not** automatically navigate into the Battle View (ADR-10 warm-resume rule).

## Scope Boundaries (READ FIRST — prevents over-build and regressions)

**IN scope for 5.2:**

- New presentational component `frontend/components/munchkin/ActiveBattleBanner.tsx` (pure RN `StyleSheet` + `AppTheme` tokens; no third-party UI lib).
- Minimal wiring in `frontend/app/munchkin/[roomNumber]/index.tsx`: call `useRoomBattle(roomId)`, render the banner when `battle !== null` (placed above `RoomCharactersList`), and navigate to the `(battle)` route on the banner's action.
- Tests: co-located `ActiveBattleBanner.test.tsx` (component behaviour/accessibility) and an extension of the existing Room View route test under `frontend/__tests__/app/munchkin/` (banner visibility + navigation + no auto-nav).
- Frontend-only cross-surface verification (typecheck + vitest + coverage floor, manual web smoke).

**OUT of scope (explicitly owned by other stories — do NOT build here):**

- ❌ Creating/starting a battle, wiring the hidden Battle button, the generated default name, the `409`-routing logic, `useBattleActions` → **Story 5.1**. Do not touch the Battle button or its handler in `index.tsx` beyond leaving it intact. Do not modify `actionButtons`/`battleButton` styles.
- ❌ `useRoomBattle`, `frontend/api/battles.ts`, `Battle` type, the `(battle)` route + modal layout → **Story 5.1** (consume them; do not create/redefine them).
- ❌ Realtime/WebSocket battle updates — the banner does **NOT** need to react live to other players starting/concluding a battle in this story. It reflects state from `useRoomBattle`'s mount-time HTTP query (and any `refresh` 5.1 exposes). Live `battle_*` WS sync is **Story 5.4**. Do not touch `frontend/api/webSocket.ts` / `useRoomWebSocket` / `useReconnectOnForeground`, and do not add battle refetch to the reconnect path.
- ❌ Battle View content (sides, totals, manage/conclude/discard) → Stories 5.1 (skeleton) / 5.3 / 5.6 / 5.7.
- ❌ Introducing/refactoring the `RoomCodeHeader` component from the UX spec. The current Room View renders the room code inline via `Stack.Screen` `headerTitle`; **leave that as-is**. UX §11.4 references `RoomCodeHeader` as a sibling of the banner, but that component is not implemented and is not in this story's scope. "Above the character list" is the placement that satisfies the AC.
- ❌ `log-service` / Log button / Log View → Epic 6.

## Tasks / Subtasks

- [x] **Task 1 — Create `ActiveBattleBanner` presentational component** (AC: 1, 2)
  - [x] New file `frontend/components/munchkin/ActiveBattleBanner.tsx`. Props (explicit exported interface): `{ battleName?: string | null; onViewBattle: () => void }`. Keep it presentational — no hooks, no data fetching, no navigation logic inside (the screen owns navigation).
  - [x] Render a **single** `Pressable` (the entire strip is one tap target) containing: a `⚔️` icon glyph, a label = `battleName?.trim() || 'Battle in progress'`, and a trailing `View Battle →` affordance text. Do **not** nest a separate `<TouchableOpacity>`/`VioletButton` inside it — see Dev Notes "Banner is a single button (design resolution)".
  - [x] `onPress={onViewBattle}`. Accessibility: `accessible`, `accessibilityRole="button"`, `accessibilityLabel="Battle in progress. Tap to view."` (exact string from UX §13.5 — keep it static regardless of battle name so screen-reader output is stable).
  - [x] Styling: pure `StyleSheet.create` referencing `AppTheme` tokens only — background `AppTheme.colors.danger` (`#922525`), text `AppTheme.colors.textPrimary` (`#FFFFFF`), spacing/radius via `AppTheme.spacing`/`AppTheme.radius`. No hardcoded hex/px/font-size literals (project rule; mirror the existing `connectionRetryButton` Pressable in `index.tsx` for the token-only pattern).
  - [x] Mark the component `memo` and give the action affordance a `testID="active-battle-banner"` to make route/component tests deterministic (mirror the `testID` convention used by `VioletButton`/`create-character-button`).

- [x] **Task 2 — Wire the banner into Room View** (AC: 1, 2, 3, 4)
  - [x] In `frontend/app/munchkin/[roomNumber]/index.tsx`: import `useRoomBattle` from `@/hooks/useRoomBattle` and `ActiveBattleBanner` from `../../../components/munchkin/ActiveBattleBanner` (match the existing relative-import style used for `RoomCharactersList`/`QuickEditSheet` in this file).
  - [x] Call `const { battle } = useRoomBattle(roomId);` near the existing `useRoomCharacters` call. Use the **same `roomId`** variable already derived at the top of the component (`Array.isArray(roomNumber) ? roomNumber[0] : roomNumber`).
  - [x] Render `{battle !== null && <ActiveBattleBanner battleName={battle.name} onViewBattle={handleViewBattle} />}` **between** the connection-retry `Pressable` block and `<RoomCharactersList .../>` (so it sits above the list and is not scrolled away — UX §11.4: "always visible when battle active"). Do not place it inside `RoomCharactersList` `ListHeaderComponent` (that slot is reserved for `actionError` and scrolls with the list).
  - [x] Implement `handleViewBattle` (a `useCallback`) that performs the **same navigation call Story 5.1 uses for its Battle button** to open the `(battle)` route for the current room. Read 5.1's implemented `index.tsx` Battle-button handler and reuse the identical `router.push(...)` target/shape — do not invent a different path. (Expected shape per architecture ADR-4: an Expo Router push to the `(battle)` modal group under `[roomNumber]`; the exact string MUST match 5.1.)
  - [x] Do **not** modify the existing hidden Battle button, its handler, or the `actionButtons`/`battleButton`/`logButton` styles. 5.2 only **adds** the banner + its navigation handler.

- [x] **Task 3 — Tests** (AC: 1, 2, 3, 4)
  - [x] Co-located `frontend/components/munchkin/ActiveBattleBanner.test.tsx` (Vitest + jsdom, `@testing-library/react`): renders the battle name when provided; renders `Battle in progress` fallback when `battleName` is `undefined`/`null`/empty/whitespace`; calls `onViewBattle` once when pressed; asserts `accessibilityRole="button"` and the exact `accessibilityLabel`. (Casing mirrors source: `ActiveBattleBanner.test.tsx`.)
  - [x] Extend the Room View route test at `frontend/__tests__/app/munchkin/[roomNumber].test.tsx` (do NOT add test files under `frontend/app` — Expo Router forbids non-route files there). Add a `vi.mock('@/hooks/useRoomBattle', ...)` with a hoisted mutable state ref (mirror the existing `mockCharactersState`/`mockConnectionState` pattern in that file) and extend the existing `vi.mock('expo-router', ...)` to also expose `router.push` (or `useRouter`) — match whatever shape 5.1's implementation/tests use. Assert: (a) banner present when mocked `battle !== null` and shows the name; (b) banner absent when `battle === null`; (c) pressing the banner calls the router push with the same target 5.1 uses and does **not** navigate on mount (no auto-nav — AC4); (d) the existing Battle button remains rendered/unaffected when no battle is active.
  - [x] Meet the **70% line coverage floor** for the frontend pipeline. Note: frontend `vitest.config.ts` coverage `include` is `api/**`, `config/**`, `hooks/**` only — this story adds **no hook/api code**, so it does not move the coverage gate; still write the behaviour tests above (project rule: assert behaviour/contracts, coverage is a floor not the goal). Do not widen the coverage `include` scope.

- [ ] **Task 4 — Frontend cross-surface verification** (AC: 1, 2, 3, 4)
  - [x] From `frontend/`: typecheck (strict TS) passes with the new component + wiring; `vitest run --coverage` passes (≥70% line floor, no regressions in existing Room View tests).
  - [ ] Manual smoke on web (`docker-compose` backend + frontend, after 5.1 is merged): enter a room with an active battle → banner appears above the character list showing the battle name; tap it → Battle View opens; from a room with no active battle → no banner, Battle button still works; reload the app in an active-battle room → banner re-appears on mount, no auto-navigation into Battle View. Note any platform (iOS/Android) not verified.
  - [x] No backend, infra, or shared-config changes are expected in this story; if you find yourself editing `backend/**` or `vitest.config.ts`, you are out of scope.

## Dev Notes

### Developer context (what this story actually is)

A small, contained frontend addition: one new presentational component + ~5 lines of
wiring in an existing screen + tests. The risk in this story is **not complexity** —
it is (a) implementing before the 5.1 seam exists, (b) over-building (adding realtime,
touching the Battle button, refactoring the header), and (c) getting the navigation
target out of sync with 5.1. Keep the diff minimal and scoped.

### Banner is a single button (design resolution — locked)

The UX spec has a surface-level tension: §12.1 lists "View Battle in `ActiveBattleBanner`"
under the *secondary VioletButton* tier, while §11.4 describes the banner anatomy as
`⚔️ icon · "Battle in progress" label · "View Battle →" action text` and §12.3 says the
banner is "Not dismissible — reflects live server state", and §13.5 assigns the banner a
**single** `accessibilityLabel="Battle in progress. Tap to view."` with
`accessibilityRole="button"`.

**Resolution (authoritative for this story):** the **entire banner is one `Pressable`
(one accessibility button)**. Render `View Battle →` as affordance *text inside* that
Pressable — do **NOT** embed a `VioletButton`/nested `TouchableOpacity`. Rationale:
(1) §13.5's single static label + §11.4 anatomy + §12.3 "whole strip, not dismissible"
are the more specific component-level specs and they describe one tappable strip;
(2) nesting a touchable inside a touchable is a known React Native accessibility/gesture
anti-pattern (double focus, ambiguous tap target). §12.1's table entry is a generic
button-tier reference and is **superseded here** by the specific component spec. Do not
"correct" this back to a nested VioletButton.

### State source & realtime boundary

- Banner visibility is driven solely by `useRoomBattle(roomId).battle` (`!== null`).
  `useRoomBattle` is 5.1's HTTP-on-mount TanStack Query hook (key `['battle', roomId]`,
  `enabled: Boolean(roomId)`). On cold start / app reopen the component remounts and the
  query runs — that satisfies AC4 ("warm resume reflects state") with **no extra code**.
- Do **not** add a WebSocket subscription, do not extend `useReconnectOnForeground`, do
  not call `refresh` on reconnect. Live cross-client battle sync (banner updating when
  *another* player starts/concludes a battle without a remount) is **Story 5.4**. In 5.2
  it is acceptable that the banner only reflects state at mount/refresh time.
- While `useRoomBattle` is loading and `battle` is still `null`, render no banner (avoid
  flicker). Do not show a banner skeleton/spinner — UX §11.4 states only Visible/Hidden.
- Defensive `name` fallback: 5.1's product decision makes `name` a required non-empty
  string, so in practice the name is always present. Still implement the
  `battleName?.trim() || 'Battle in progress'` fallback for null-safety (cheap, prevents
  an empty banner if the contract ever loosens). Do not add more elaborate validation.

### Placement decision (epic AC vs UX spec — reconciled)

Epic AC says the banner is "shown in the character list header". UX §11.4 says placement
is "Between `RoomCodeHeader` and character list — always visible when battle active". The
current Room View has **no `RoomCodeHeader` component** (room code is rendered inline in
`Stack.Screen` `headerTitle`). Both phrasings reconcile to: **render the banner as a
direct sibling in `index.tsx`, above `<RoomCharactersList>` and below the
connection-retry `Pressable`**. This keeps it persistently visible (not scrolling with
the FlatList) and avoids reserving the list's `ListHeaderComponent` slot (already used
for `actionError`). Do not refactor the header or the list component to add a header
slot — that is unnecessary churn (project rule: minimal, localized edits).

### Navigation target must match Story 5.1 exactly

Story 5.1 Task 12 wires the previously-hidden Battle button so that, when an active
battle exists, pressing it routes to the existing `(battle)` route for the room (ADR-2/AC2
of 5.1). Story 5.2's `View Battle` action must perform the **identical navigation call**
(same `router.push` path/params) so the two entry points behave consistently. After 5.1
is merged: open `frontend/app/munchkin/[roomNumber]/index.tsx`, find 5.1's Battle-button
press handler, and reuse the same navigation expression in `handleViewBattle` (extract a
shared `useCallback` if both live in this screen — but only if 5.1's handler is in this
file; otherwise just mirror the exact call). Architecture ADR-4: Battle View is an Expo
Router **modal group** `(battle)` so Room View stays in the stack and back-navigation
returns without refetching room state — confirm the modal presentation 5.1 set up is
respected (5.2 does not configure routing/layout itself).

### Existing patterns to mirror (do not reinvent)

- Tappable token-styled strip: the `connectionRetryButton` `Pressable` in
  `app/munchkin/[roomNumber]/index.tsx` (`accessibilityLabel` + `accessibilityRole="button"`
  + `AppTheme` tokens, no hardcoded literals) — mirror this for the banner.
- Component file conventions: PascalCase component file in `frontend/components/munchkin/`
  (e.g. `RoomCharacterCard.tsx`), `memo`-wrapped function component, explicit prop
  interface, default export, `StyleSheet.create` at bottom referencing `AppTheme`.
- `testID` convention: `VioletButton` accepts/forwards a `testID`; the
  `create-character-button` testID is used in route tests — give the banner a stable
  `testID` for the same reason.
- Route-test mocking: `frontend/__tests__/app/munchkin/[roomNumber].test.tsx` already
  mocks `expo-router` (`Stack.Screen`, `useLocalSearchParams`), `expo-clipboard`,
  `expo-haptics`, `react-native-safe-area-context`, and `@/hooks/useCharacters` via
  `vi.hoisted` mutable refs. Extend that file the same way for `@/hooks/useRoomBattle`
  and `router.push`; do not create a parallel test harness.
- Theme tokens (`frontend/constants/theme.ts`): `AppTheme.colors.danger = '#922525'`,
  `AppTheme.colors.textPrimary = '#FFFFFF'`, `AppTheme.colors.actionSecondary = '#6E6BD4'`,
  `AppTheme.spacing.{xs,sm,md,lg,xl}`, `AppTheme.radius.{sm,md,lg,pill}`,
  `AppTheme.typography.{caption,labelSm,labelMd}`.

### Project Structure Notes

- Frontend layered boundaries: `app/` route composes screens, `components/` is
  presentational, `hooks/` orchestrates data. The banner is presentational
  (`components/munchkin/`); data comes from `useRoomBattle` (a hook from 5.1); the screen
  (`app/munchkin/[roomNumber]/index.tsx`) wires them and owns navigation. Keep this
  separation — no `useRoomBattle` call inside the banner component.
- Frontend TS is **strict** — the new component and props interface must be fully typed;
  import the `Battle` type from `@/api/battles` (5.1) only if you need its `name` field
  type in the screen; the banner itself takes a plain `battleName?: string | null` to stay
  decoupled from the API type.
- Expo Router rule: every file under `frontend/app` must be a route/layout — the banner
  lives under `frontend/components/munchkin/`, and its test is co-located there; the Room
  View route test stays under `frontend/__tests__/app/...`.
- Definition of done: the frontend surface passes typecheck + `vitest --coverage`
  (≥70% line floor) with no regression to existing Room View tests; behaviour is asserted,
  not coverage-padded. No other surface (backend/infra) is touched.
- Naming: component file `ActiveBattleBanner.tsx` (PascalCase), test
  `ActiveBattleBanner.test.tsx` (casing mirrors source), prop interface exported.

### Previous-story intelligence (Story 5.1 — the in-epic predecessor)

Story 5.1 (`5-1-start-a-battle.md`, status `ready-for-dev`, not yet coded) establishes
the entire battle seam this story builds on. Key locked decisions from 5.1 that 5.2 must
respect:

- **`name` is always a non-empty string.** 5.1's product decision (confirmed by Ivan
  2026-05-16) overrides architecture ADR-13 ("name optional/nullable"): the backend
  requires `name`; the presentational layer generates a default (e.g. `Battle • 16 May,
  23:40`). So the banner will, in practice, always have a name to show. Do not re-add
  nullable-name handling beyond the cheap defensive fallback.
- **`useRoomBattle` return shape (5.1 Task 9):** `{ battle: Battle | null; isLoading:
  boolean; errorMessage: string | null; refresh: () => Promise<void> }`, TanStack Query
  key `['battle', roomId]`, HTTP-on-mount only (no WS in 5.1 either — WS is 5.4).
- **`Battle` type (5.1 Task 8, `frontend/api/battles.ts`):** includes `id`, `roomId`,
  `name`, `status: 'active'|'concluded'|'discarded'`, sides, `result`. 5.2 only needs
  `battle !== null` and `battle.name`.
- **Battle View is a modal `(battle)` group (5.1 Task 11, ADR-4).** 5.2 must not
  re-configure routing; just navigate with the same call 5.1's Battle button uses.
- 5.1's Battle button is the existing hidden `TouchableOpacity` in `index.tsx`
  (`styles.battleButton, { opacity: 0 }`, inside the `height: 0` `actionButtons` view).
  5.1 makes it visible/functional; **5.2 must not touch it**.

No git history exists for battle implementation yet — recent commits (#54/#55, Epic 4
stories) are documentation/orchestrator only; the repo convention they show is **one
focused PR per story with the touched surface's quality gate green**. Keep 5.2 a single
small frontend PR.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-battle-management.md#story-52-show-active-battle-in-room-view] (AC, "Covers: UX-DR10", "Depends on: 3.1, 3.2")
- [Source: _bmad-output/implementation-artifacts/5-1-start-a-battle.md] (the seam: `useRoomBattle`, `Battle` type, `(battle)` route, Battle-button wiring, name decision)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/11-component-strategy.md#114-new-reusable-components] (`ActiveBattleBanner` purpose/anatomy/placement/states/tokens)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/12-ux-consistency-patterns.md#121-button-hierarchy, #123-modal-overlay-patterns, #126-empty-loading-states] (banner not dismissible; no banner pre-game)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/13-responsive-design-accessibility.md#135-react-native-accessibility-props] (`accessibilityLabel="Battle in progress. Tap to view."`, `accessibilityRole="button"`)
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#frontend-architecture] (ADR-4 modal `(battle)` group, ADR-10 warm resume — Room View reflects active battle, no auto-navigate, ADR-15 `useRoomBattle` HTTP+WS pattern)
- [Source: frontend/app/munchkin/[roomNumber]/index.tsx] (Room View screen to wire; `connectionRetryButton` Pressable pattern; hidden Battle button at the `actionButtons` view — do not touch)
- [Source: frontend/components/munchkin/RoomCharactersList.tsx] (list component — banner sits above it; `ListHeaderComponent` reserved for `actionError`)
- [Source: frontend/components/VioletButton.tsx, frontend/components/munchkin/RoomCharacterCard.tsx] (component/`testID`/`memo`/`StyleSheet`+`AppTheme` conventions)
- [Source: frontend/constants/theme.ts] (`AppTheme` tokens: `danger`, `textPrimary`, spacing, radius, typography)
- [Source: frontend/__tests__/app/munchkin/[roomNumber].test.tsx] (route-test mocking harness to extend; never put test files under `frontend/app`)
- [Source: frontend/vitest.config.ts] (jsdom env, coverage `include` = api/config/hooks only — do not widen; 70% floor)
- [Source: _bmad-output/project-context.md] (frontend strict TS, layered boundaries, Expo Router route-only rule, test casing/co-location, minimal-edits rule, 70% coverage floor)

### Resolved decisions

1. **Banner = single Pressable/button** (not a nested VioletButton). UX §12.1's secondary-button tier reference is superseded by the specific §11.4/§12.3/§13.5 component spec (one tappable strip, single static accessibility label). See "Banner is a single button".
2. **Placement = direct sibling above `RoomCharactersList`** in `index.tsx` (not in the list's `ListHeaderComponent`, not via a new `RoomCodeHeader`). Reconciles epic "character list header" with UX "between header and list" without adding churn.
3. **No realtime in 5.2.** Banner reflects `useRoomBattle` mount/refresh state only; live cross-client sync is Story 5.4. AC4 (warm resume) is satisfied by the hook's HTTP-on-mount with zero extra code.
4. **Navigation target mirrors Story 5.1's Battle button exactly** — reuse 5.1's `router.push` call; do not invent a path. Hard-blocked until 5.1 is merged.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:unit -- components/munchkin/ActiveBattleBanner.test.tsx` from `frontend/` — passed 7 tests.
- `npm run test:room-route -- '__tests__/app/munchkin/[roomNumber].test.tsx'` from `frontend/` — passed 21 tests.
- `npm run tsc` from `frontend/` — passed.
- `npm run test:coverage` from `frontend/` — passed 114 unit tests + 38 route tests; 80.37% line coverage.
- `npm run lint` from `frontend/` — passed with one pre-existing warning in `frontend/app/munchkin/modal-change-caracter.tsx`.
- Manual web smoke was attempted on ports 19006, 19007, 19010, and 19012, but Expo reported each requested port as already in use while `curl`/`lsof` showed no listener; backend health at `http://localhost:8080/health` returned `{"service":"nginx","status":"ok"}`.
- Static web export was attempted with `EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo export --platform web --output-dir /private/tmp/munch-web-smoke`; export completed, but browser load of the exported bundle still failed with `Missing EXPO_PUBLIC_API_URL in a non-development environment`, so manual web smoke remains unverified.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added a memoized `ActiveBattleBanner` single-Pressable component with battle-name fallback, stable accessibility label, token-based styling, and deterministic `testID`.
- Wired the banner into Room View above `RoomCharactersList`, driven by the existing `useRoomBattle(roomId).battle` result and reusing the Story 5.1 battle route navigation shape.
- Added component and route tests for banner visibility, fallback text, press behavior, no-banner state, no auto-navigation on mount, and existing Battle button availability.

### File List

- _bmad-output/implementation-artifacts/5-2-show-active-battle-in-room-view.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/app/munchkin/[roomNumber]/index.tsx
- frontend/components/munchkin/ActiveBattleBanner.tsx
- frontend/components/munchkin/ActiveBattleBanner.test.tsx
- frontend/__tests__/app/munchkin/[roomNumber].test.tsx

### Change Log

- 2026-05-18: Implemented Story 5.2 Active Battle banner and Room View wiring; added component and route coverage; automated frontend gates passed; manual web smoke remains blocked by local Expo/static runtime issues.
