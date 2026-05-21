# Story 6.6: Room History View Shows Character Events

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to review character-related room history entries,
so that I can understand how characters changed over the course of the session.

## Acceptance Criteria

1. **Given** I am in the Room View, **when** I navigate to the Room History (Log) screen (the existing Log button revealed/wired by Story 6.5), **then** the screen renders a **scrollable list of `LogEntry` rows in reverse-chronological order** — the order returned by `useRoomLogs` (Story 6.4's newest-first array) is rendered **as-is** (no client re-sort), each list item being a `LogEntry` for one `LogEvent`.
2. **Given** the first page is rendered, **when** the user scrolls to the end of the list, **then** older entries load via the cursor pagination already implemented by Story 6.5 (`useRoomLogs.loadNextPage()` driven by the screen's `FlatList onEndReached`) — Story 6.6 **renders** the appended entries; it does **not** re-implement pagination, the cursor, or the next-page request.
3. **Given** a `character_created` entry (`eventType === 'character_created'`), **when** it is displayed, **then** the row shows the character's **avatar** (from `payload.character.avatarId` on a `payload.character.color` background), the character's **name** (`payload.character.name`), and a **"created"** label.
4. **Given** a `character_deleted` entry (`eventType === 'character_deleted'`), **when** it is displayed, **then** the row shows the character's avatar, name, and a **"removed"** label.
5. **Given** a `character_updated` entry (`eventType === 'character_updated'`), **when** it is displayed, **then** the row shows the character's avatar, name, and **every changed field as its own `prev → new` row** — i.e. one rendered diff row per key in `payload.changes` (a single update with multiple changed fields renders multiple `prev → new` rows, not a collapsed summary). Field label uses caption styling; the `prev → new` value uses the accent value styling.
6. **Given** no events have been recorded yet (`useRoomLogs` returns an **empty** entries list, **not** loading, **not** error), **when** the screen is shown, **then** it displays the empty-state message **exactly** `No events recorded yet.` with **no CTA** (this copy is **owned by Story 6.6** — Story 6.5 deliberately deferred it).
7. **Given** room history cannot be loaded (first-page error surfaced by `useRoomLogs.errorMessage` with no entries), **when** the screen is shown, **then** the user sees an **error state with a retry action** that re-issues the first page — Story 6.6 **uses the recoverable error+retry scaffolding Story 6.5 built** (it does not build a second/different error UI); it only verifies this satisfies the epic-6.6 "error state with a retry action" AC and that `LogEntry`/empty rendering never replaces it.
8. **Given** an entry whose `eventType` is **not** a character event (`battle_started` / `battle_concluded` / `battle_discarded`), **when** `LogEntry` renders it, **then** it renders a **safe, non-crashing neutral fallback** (the entry's `summary` text) and **does not** pin battle layout, battle context fields, or battle drill-in — those are **Story 6.7** and `LogEntry` exposes a clearly-marked seam for them. `LogEntry` must never throw or render blank for any of the 6 supported event types or for missing/partial `payload` display context.
9. **Given** accessibility, **when** a `LogEntry` row renders, **then** the row exposes a single descriptive `accessibilityLabel` per UX-DR12 — created: `"<name> created, <relative time>"`; removed: `"<name> removed, <relative time>"`; updated: `"<name>, <field> changed from <prev> to <new>, <relative time>"` (concatenated for multiple fields) — and the avatar `Image` is **not** an independent a11y node competing with the row label.
10. **Given** the quality gate, **when** `npm test` / `npm run test:coverage` run from `frontend/`, **then** a co-located `components/munchkin/LogEntry.test.tsx` is discovered by the default `vitest.config.ts` (`include: ['**/*.test.{ts,tsx}']`) and the **70% line floor still passes** (do not lower it); tests assert real behavior — each character variant's avatar+name+label, multi-field `character_updated` → one `prev → new` row per changed key, missing/partial `payload.character`/`payload.changes` degrades without throwing, out-of-range `avatarId` falls back safely, a `battle_*` type renders the neutral `summary` fallback without throwing, and the a11y label shape per AC 9.

> **⛔ SCOPE GUARD & DEPENDENCY GATE — READ BEFORE WRITING ANY CODE.**
>
> **This story builds ONLY:** the `LogEntry` component (UX-DR12) **for character events**, its `prev → new` diff rows, the empty-state copy `No events recorded yet.` (UX 12.6, deferred to here by Story 6.5), a small deterministic relative-time helper for the timestamp, the wiring that **replaces Story 6.5's placeholder render seam** in `app/munchkin/[roomNumber]/log.tsx` with `<LogEntry entry={item} />` (and renders the empty copy in 6.5's empty branch), and the `LogEntry` test. It is the **character-event rendering layer on top of Story 6.5's data/scaffold foundation**.
>
> **It does NOT build:** `frontend/api/logs.ts`, `frontend/hooks/useRoomLogs.ts`, the `useInfiniteQuery` cursor pagination, the `log.tsx` route file / `_layout.tsx` registration, revealing/wiring the hidden Log button, the `FlatList` / `onEndReached` / footer spinner / initial loading indicator / **recoverable error+retry scaffolding** — **all of that is Story 6.5**. It does **NOT** build battle-event rows, battle context (name/result), or completed-battle drill-in — **all Story 6.7** (`LogEntry` leaves a marked seam + safe fallback for `battle_*`). It does **NOT** touch any backend (Stories 6.1/6.2/6.3/6.4), add realtime/WebSocket history updates, or add any dependency / lockfile churn.
>
> **Dependency on Story 6.5 (HARD — read Task 0 first).** Story 6.5 is `ready-for-dev`, **not `done`**, and on the current branch **none of `frontend/api/logs.ts`, `frontend/hooks/useRoomLogs.ts`, or `frontend/app/munchkin/[roomNumber]/log.tsx` exist** (verified). 6.6 has **nothing to render into and no hook/entry type to consume** without 6.5. **Task 0 is a blocking HALT gate:** if the Story 6.5 deliverables (the `log.tsx` screen with its render seam + `useRoomLogs` hook + the `api/logs.ts` entry type) are absent when implementation starts, **STOP and report "blocked on Story 6.5"** — do **not** scaffold 6.5's data layer, hook, route, or pagination here (that is a large out-of-scope blast radius that collides with 6.5's own implementation). This differs from Story 6.5's *soft* contract-lock gate precisely because 6.5's frontend can be unit-tested against a mocked transport with zero backend, whereas 6.6 cannot meaningfully exist (no component host, no entry type, no seam) until 6.5's files are on the branch.
>
> **Defer cross-story-owned names (do not pre-pin; conform to what 6.5/6.7 actually deliver):**
> - **Story 6.5 owns:** the entry **type name and field names** exported from `frontend/api/logs.ts` (this story assumes `id, roomId, eventType, actorId, summary, payload, occurredAt, createdAt?, updatedAt?` with `payload: unknown` — per 6.5 Task 1 / Story 6.4 contract — but **read 6.5's delivered `api/logs.ts`** and use its real exported type/field names); the `useRoomLogs` **return-object shape** (`entries`, `isLoading`, `isFetchingNextPage`, `hasNextPage`, `errorMessage`, `loadNextPage`, `refresh` per 6.5 Task 2 — **consume what 6.5 exported, do not redefine it**); the `log.tsx` **render-seam contract** (6.5 ships a "clearly-commented minimal placeholder `renderItem`" + an empty-result neutral branch — 6.6 replaces exactly those, nothing else in `log.tsx`). Record any assumed-vs-delivered variance in Completion Notes (same defer-to-owning-story discipline Stories 6.1–6.5 used).
> - **Story 6.7 owns:** the battle-event `LogEntry` variants (`battle_started`/`battle_concluded`/`battle_discarded` layout, battle name/result context) and completed-battle drill-in. 6.6 must **not** pin a battle prop shape, battle-row layout, or drill-in handler — only a neutral non-crashing `summary` fallback + a one-line seam comment for 6.7.
> - **Story 6.1 owns** the character event `payload` shape (`payload.character: { id, name, avatarId, color }`, `payload.changes: Record<string,{prev,next}>` for `character_updated`). 6.6 reads it **defensively** (it is typed `unknown` by 6.5) and degrades gracefully if a field is absent; it does not "correct" 6.1.

## Tasks / Subtasks

- [x] **Task 0 — HARD prerequisite gate: verify Story 6.5 deliverables exist (blocking; AC: 1, 2, 7)**
  - [x] Confirm **`frontend/app/munchkin/[roomNumber]/log.tsx`** exists, renders the history list via a `FlatList` (or 6.5's chosen list), and contains 6.5's **marked render seam** (a placeholder `renderItem` 6.5 explicitly flagged for 6.6/6.7) **and** the empty / initial-loading / recoverable-error+retry / next-page-footer scaffolding. Note the exact `renderItem` signature and the empty branch location — 6.6 replaces **only** those two spots.
  - [x] Confirm **`frontend/hooks/useRoomLogs.ts`** exists and exports a hook whose result exposes the entries array + `isLoading` + `isFetchingNextPage` + `hasNextPage` + `errorMessage` + `loadNextPage` + `refresh` (whatever 6.5 named them — **record the real names**; `LogEntry` itself only needs a single `entry`, but `log.tsx` wiring consumes 6.5's hook result, so conform to it).
  - [x] Confirm **`frontend/api/logs.ts`** exists and exports the per-entry type (assumed: `id, roomId, eventType, actorId, summary, payload, occurredAt, createdAt?, updatedAt?`, `payload` permissive/`unknown`). **Use 6.5's real exported type name + fields**; if they differ from this story's assumption, follow 6.5 and record the variance in Completion Notes.
  - [x] Confirm `frontend/constants/avatars.ts` default-exports the avatar image array (verified length **10**, indices 0–9) and `frontend/constants/theme.ts` exports `AppTheme` (verify `AppTheme.typography` has **`caption`/`labelSm`/`labelMd` only — NO `body`/`heading2`/`displayLarge`** → see Dev Notes "AppTheme typography reality check").
  - [x] **If `log.tsx` (with its render seam) OR `useRoomLogs` OR `api/logs.ts` is missing → STOP.** Record in Completion Notes: *"Story 6.6 blocked on Story 6.5 (log screen / useRoomLogs / api/logs not yet delivered)."* Do **not** create the route, hook, api module, pagination, or loading/error scaffolding here.

- [x] **Task 1 — `LogEntry` component: character variants (AC: 3, 4, 5, 8, 9)**
  - [x] Create `frontend/components/munchkin/LogEntry.tsx` (PascalCase component file — [Source: architecture/implementation-patterns-consistency-rules.md#Frontend Code]). Props: a single `entry` typed via **6.5's exported entry type** from `@/api/logs` (do not redefine the entry type here — import it; defer-to-owning-story).
  - [x] Narrow `entry.payload` **defensively** to the Story 6.1 character display context: read `payload.character` → `{ name, avatarId, color }` and (for `character_updated`) `payload.changes` → `Record<string, { prev: unknown; next: unknown }>`. `payload` is `unknown` from 6.5 — guard every access (optional chaining + safe fallbacks); never assume a field is present (AC 8).
  - [x] Branch on `entry.eventType`:
    - `character_created` → avatar + name + a **"created"** label.
    - `character_deleted` → avatar + name + a **"removed"** label.
    - `character_updated` → avatar + name + **one `prev → new` row per key in `payload.changes`** (map over `Object.entries(changes)`; each row: `<fieldLabel>` caption + `<prev> → <new>` accent/bold). If `changes` is absent/empty, fall back to the entry's `summary` text (matches Story 6.2's deterministic summary) rather than rendering an empty update.
    - `battle_started` / `battle_concluded` / `battle_discarded` → render the neutral `entry.summary` text only, with an inline `// Story 6.7 owns battle-event variants + completed-battle drill-in` seam comment. **Do not** pin battle layout/props/drill-in.
    - any other/unknown type → same neutral `summary` fallback (never throw, never blank).
  - [x] **Avatar:** `import avatars from '@/constants/avatars'`; render `<Image source={avatars[avatarId] ?? avatars[0]} />` inside a `<View style={[styles.avatarWrapper, { backgroundColor: color ?? AppTheme.colors.surfaceWarm }]}>` — guard `avatarId` against out-of-range/non-number (array length 10) and missing `color`. Mirror the existing avatar idiom in [components/munchkin/RoomCharacterCard.tsx](frontend/components/munchkin/RoomCharacterCard.tsx) (color-bg wrapper + `Image source={avatars[...]}`), at **48×48** (intentional variance vs. UX-DR12's 24×24 anatomy — see Documented variances #6: 48×48 keeps the avatar legible against the single-column row layout and prevents the log list from feeling visually empty; still well below the 75×75 character-card size).
  - [x] **Timestamp:** right-aligned caption showing relative time from `entry.occurredAt` (see Task 2). UX-DR12 anatomy: avatar (48×48 — intentional variance vs. spec 24×24, see Documented variances #6 — character-color bg) · name · field label · `prev → new` value · timestamp (right-aligned).
  - [x] **Accessibility (UX-DR12, AC 9):** set one `accessibilityLabel` on the row container (created/removed/updated phrasings in AC 9, multi-field updates concatenated) and set the avatar `Image` to `accessibilityElementsHidden`/`importantForAccessibility="no-hide-descendants"` (or `accessible={false}`) so it does not compete with the row label. Row is informational (not a button) for character events — do **not** add a press handler (drill-in is 6.7/battle-only).
  - [x] **Styling:** pure `StyleSheet.create` with **`AppTheme` colors/spacing/radius tokens only**; name → `AppTheme.colors.textAccentSoft`; field label + timestamp → `...AppTheme.typography.caption` + `AppTheme.colors.textMuted`; `prev → new` value → `AppTheme.colors.accent` + bold. **Do NOT reference `AppTheme.typography.body`** (it does not exist — see Dev Notes). No hardcoded colors. `memo` the component (it renders in a list — mirror `RoomCharacterCard`'s `memo`).

- [x] **Task 2 — Deterministic relative-time helper (AC: 3, 4, 5, 9)**
  - [x] Add a small **pure** formatter `formatRelativeTime(iso: string, now: number = Date.now()): string` producing the UX-DR12 idiom (`"just now"`, `"3m ago"`, `"2h ago"`, `"4d ago"`; sensible fallback for an unparseable/empty `occurredAt` — e.g. empty string or `""`, never throw). **No new dependency** (no `date-fns`/`dayjs`/`moment` — project-context: no dep/lockfile churn; the codebase has **no** existing relative-time util).
  - [x] Make it deterministic/testable by accepting an injected `now` (default `Date.now()`); the unit test passes a fixed `now` (no fake timers needed, no flakiness — project-context "deterministic tests").
  - [x] **Placement (lead with the clean option):** co-locate the helper next to `LogEntry` (e.g. `components/munchkin/logEntryTime.ts`, or a non-exported pure fn inside `LogEntry.tsx` if it stays tiny) and unit-test it. *Rationale:* it is `LogEntry`-specific presentational formatting and belongs with the component; `components/**` is **not** in `vitest.config.ts` `coverage.include` (`['api/**','config/**','hooks/**']`), so this does not move the 70% floor — but still test it for behavior (project-context: test behavior, coverage is a floor not the goal). *Lower-value alternative:* placing it under `config/` would pull it into the coverage-counted set; only do that if there is a real cross-feature reuse need (there is not in 6.6) and then it must be exhaustively tested so it doesn't drag the floor. Default to the co-located helper.

- [x] **Task 3 — Wire `LogEntry` + empty copy into Story 6.5's `log.tsx` seam (AC: 1, 2, 6, 7)**
  - [x] In `app/munchkin/[roomNumber]/log.tsx`, **replace only Story 6.5's marked placeholder `renderItem`** with `renderItem={({ item }) => <LogEntry entry={item} />}` (conform to 6.5's actual `renderItem`/list prop names). Preserve **everything else** 6.5 built: list component, `onEndReached`/`loadNextPage` wiring, `onEndReachedThreshold`, footer next-page spinner, initial loading indicator, the recoverable error+retry block, `SafeAreaView`/`useSafeAreaInsets` usage, `AppTheme` styles. **No opportunistic refactor of `log.tsx`** (minimal-edit rule, [Source: _bmad-output/project-context.md]).
  - [x] In 6.5's **empty-result neutral branch** (the spot 6.5 left with a one-line comment that 6.6 owns the empty copy), render the empty state: the exact text `No events recorded yet.` with **no CTA/button** (UX 12.6). Show it **only** when not loading **and** not error **and** entries are empty (mutually exclusive with loading/error — 6.5 already enforces loading/error exclusivity; keep empty subordinate to both).
  - [x] Do **not** add a second/different error UI: epic-6.6 AC 7 ("error state with a retry action") is satisfied by 6.5's recoverable first-page error+`refresh` retry. Verify it visually/behaviorally and note in Completion Notes that the epic-6.6 error AC is met by the 6.5-built scaffolding (consume, don't duplicate — documented variance vs. the epic listing the error/empty ACs under 6.6).
  - [x] Confirm reverse-chronological order is the array order from `useRoomLogs` rendered **as-is** (Story 6.4 returns newest-first; 6.5 preserves it; 6.6 must **not** sort/reverse/de-dupe — AC 1).

- [x] **Task 4 — Tests (AC: 10; covers 3, 4, 5, 8, 9)**
  - [x] Create `frontend/components/munchkin/LogEntry.test.tsx` (casing mirrors source — [Source: architecture/implementation-patterns-consistency-rules.md#Test co-location rule]; discovered by default `vitest.config.ts`, jsdom). Use the established component-test idiom (`@testing-library/react` `render`/`screen`, the `react-native` → `react-native-web` alias + `test/setup.ts` already configured; reference [components/munchkin/ActiveBattleBanner.test.tsx](frontend/components/munchkin/ActiveBattleBanner.test.tsx) / [RoomCharacterCard.test.tsx](frontend/components/munchkin/RoomCharacterCard.test.tsx) for the pattern). Mock nothing internal — `LogEntry` is pure-presentational; build entry fixtures inline.
  - [x] Assert, per behavior contract (project-context: ≥1 success + ≥1 failure/edge per behavior): (a) `character_created` → name + "created" label + avatar `Image` present; (b) `character_deleted` → "removed" label; (c) `character_updated` with **two** changed fields in `payload.changes` → **two** distinct `prev → new` rows (the AC-5 multi-field guarantee — highest-value assertion, assert explicitly not incidentally); (d) `character_updated` with empty/absent `changes` → falls back to `summary`, no crash; (e) missing/partial `payload.character` (no `name`/`avatarId`/`color`) → renders without throwing, safe fallbacks (a11y label still produced); (f) out-of-range `avatarId` (e.g. `99`) → no crash, fallback avatar; (g) a `battle_*` entry → renders `summary` text, no throw, no battle layout pinned; (h) the row `accessibilityLabel` matches the AC-9 shape for created/removed/updated (multi-field concatenation).
  - [x] If `formatRelativeTime` is a separate module, add `components/munchkin/logEntryTime.test.ts` asserting `just now` / minutes / hours / days buckets and an unparseable input → safe fallback (deterministic via injected `now`).
  - [x] Optionally a tiny delta to 6.5's `log.tsx` route test (under `frontend/__tests__/app/...`, run by `npm run test:room-route`) asserting the empty branch shows `No events recorded yet.` and a populated list renders `LogEntry` rows — **only if** it does not duplicate/own 6.5's route-test responsibilities (6.5 owns that file; keep additions minimal or note as 6.7-adjacent). Never place a test under `frontend/app/**` (Expo-Router route-only rule).
  - [x] Run the gate from `frontend/`: `npm test` then `npm run test:coverage`. `LogEntry` is in `components/**` (not in `coverage.include`) so it does not raise the floor; **the 70% line floor must still pass — do not lower it** ([Source: _bmad-output/project-context.md]). Deterministic only; no real timers/network.

- [x] **Task 5 — Docs in the same change (AC: 6, 8)**
  - [x] Per the docs-in-same-change rule ([Source: _bmad-output/project-context.md]): if a frontend component/route doc enumerates components, add `LogEntry` (character-event variants; battle variants + drill-in noted as Story 6.7). If Story 6.5 added a Room History / Log doc note, extend it with the entry-rendering + empty-state copy. Do **not** invent a new doc file; if none exists to update, record "no FE doc deltas required" in Completion Notes. No env/dependency/lockfile changes (verify none introduced).

### Review Findings

- [x] [Review][Patch] Avatar rendered at 48×48 instead of UX-DR12 24×24 [frontend/components/munchkin/LogEntry.tsx:239,244,247-249] — UX-DR12 anatomy + Task 1 Avatar + Dev Notes "Scale avatar to 24×24" all mandated 24×24; both `avatarWrapper` and `avatar` use 48×48. Flagged by Blind Hunter, Edge Case Hunter, and Acceptance Auditor. **Resolved (2026-05-21): spec amended to 48×48** — at 24×24 the avatar is illegible against the single-column row layout and the log list reads visually empty; 48×48 keeps the avatar visible while still well below the 75×75 character-card size. Captured as Documented variance #6 and in Completion Notes; no code change.
- [x] [Review][Defer] `formatDisplayValue` renders nested-object diffs as `[object Object]` [frontend/components/munchkin/LogEntry.tsx:formatDisplayValue final return] — deferred, pre-existing. `payload.changes` per Story 6.1 only carries flat scalar/array values for character events; nested objects are not produced by current event sources. Document for future event types.

## Dev Notes

### What this story is (and is not)

- **Is:** the **character-event rendering layer** — the `LogEntry` component (UX-DR12) for `character_created`/`character_updated`/`character_deleted`, the per-field `prev → new` diff rows, the `No events recorded yet.` empty copy (UX 12.6, deferred here by Story 6.5), a deterministic relative-time helper, and the **two-spot wiring** that swaps Story 6.5's render-seam placeholder for `<LogEntry>` and fills 6.5's empty branch. ([Source: epics/epic-6-room-history.md#Story 6.6]; [Source: ux-design-specification/11-component-strategy.md#11.4 LogEntry], [#11.6 Phase 2 step 8 — `LogEntry` is the step *after* the Log screen]; [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] UX-DR12/UX-DR14.)
- **Is not:** the data layer / hook / route / pagination / loading-error scaffolding (Story 6.5), battle-event rows or completed-battle drill-in (Story 6.7), any backend (Stories 6.1/6.2/6.3/6.4), or realtime/WS history. The screen is correct and testable because `LogEntry` is pure-presentational and tested with inline entry fixtures (no network, no hook, no backend).

### The data `LogEntry` renders (lock onto it — AC 3, 4, 5, 8)

`useRoomLogs` (Story 6.5) yields entries from `GET /logs` (Story 6.4 contract). Each entry:

```ts
// shape assumed from Story 6.4 AC 1/9 + Story 6.5 Task 1 — IMPORT 6.5's real exported type
{
  id: string;
  roomId: string;
  eventType: 'character_created' | 'character_updated' | 'character_deleted'
           | 'battle_started' | 'battle_concluded' | 'battle_discarded';
  actorId: string;
  summary: string;          // deterministic plain-text fallback (Story 6.2 buildSummary)
  payload: unknown;         // permissive — Story 6.5 keeps it untyped; 6.6 narrows defensively
  occurredAt: string;       // ISO-8601 — relative-time source
  createdAt?: string;
  updatedAt?: string;
}
```

For **character** events, `payload` is the Story 6.1 additive superset; the fields 6.6 renders from:

```ts
payload.character: { id: string; name: string; avatarId: number; color: string }   // create/update/delete
payload.changes?: Record<string, { prev: unknown; next: unknown }>                  // character_updated ONLY
```

- **Avatar** = `avatars[payload.character.avatarId]` on a `payload.character.color` background. `avatars` is the default export of `@/constants/avatars` (array of 10 `require(...)` image refs, indices 0–9 — **guard out-of-range**: `avatars[avatarId] ?? avatars[0]`).
- **Name** = `payload.character.name` (fallback to `actorId` or `summary` if absent — never render empty/`undefined`).
- **`character_updated` diff rows** = iterate `payload.changes`; **one row per key** (AC 5: multiple changed fields → multiple rows). `summary` (e.g. `"Thrognar updated: level 7 → 8"`) is the deterministic fallback when `changes` is empty/absent.
- `summary` strings come from Story 6.2 `buildSummary` (`"<name> created"`, `"<name> removed"`, `"<name> updated: <field> <prev> → <next>, …"`) — use as the safe fallback, not the primary render for character variants (the rich avatar/name/diff UI is the AC).
- **Defensive rule:** `payload` is `unknown` (Story 6.5 keeps it un-narrowed so 6.6/6.7 own narrowing). Treat every `payload.*` access as possibly-absent (a degraded producer or partial event must not crash the list — AC 8). Frontend is **strict TS**: narrow via guards / `typeof` checks, do not blanket-`any`.

> **Variance discipline:** Stories 6.4/6.5/6.1 are `ready-for-dev` (not `done`). These field names are the *documented* contract. **Import 6.5's real exported entry type from `frontend/api/logs.ts`** and conform to whatever 6.5 actually shipped; if a name differs, follow 6.5 and record it in Completion Notes (do not "correct" 6.5/6.1). Same defer-to-owning-story discipline Stories 6.1–6.5 used for cross-owned names.

### AppTheme typography reality check (disaster prevention — AC 3, 5, 10)

UX-DR12 specifies "name (`body`, `textAccentSoft`)", "`prev → new` value (`body bold`, `accent`)". **`frontend/constants/theme.ts` `AppTheme.typography` has ONLY `caption`, `labelSm`, `labelMd` — there is NO `body`, `heading2`, `displayLarge`, or `statNumberLarge` token.** Referencing `AppTheme.typography.body` compiles to `undefined` and spreads nothing (silent style loss / potential crash on `...undefined`).

**Follow the existing in-codebase idiom** (see [RoomCharacterCard.tsx](frontend/components/munchkin/RoomCharacterCard.tsx) and [(battle)/index.tsx](frontend/app/munchkin/[roomNumber]/(battle)/index.tsx)): use **`AppTheme.colors` + `AppTheme.spacing`/`radius`** for tokens and **inline `fontSize`/`fontWeight`** for body-weight text (e.g. name `fontSize:16,fontWeight:'700',color:AppTheme.colors.textAccentSoft`), and spread `...AppTheme.typography.caption` only where a real caption token applies (field label / timestamp, `color: AppTheme.colors.textMuted`). The `prev → new` value: `fontWeight:'700', color: AppTheme.colors.accent`. This is a **documented intentional variance** vs. UX-DR12's token names (the UX spec names a typographic scale the implemented `AppTheme` never defined; existing components already resolve "body" as inline 15–16px). Record it in Completion Notes; do **not** invent/add new `AppTheme.typography` tokens (out of scope; would be a cross-cutting theme change — minimal-edit rule).

### Boundary with Story 6.7 — `LogEntry` is shared; 6.6 builds the character half

Both Story 6.6 and Story 6.7 are listed as covering UX-DR12 (`LogEntry`) + UX-DR14 (Log View). Ownership split:
- **Story 6.5** = the Log *screen* scaffold + render seam + data hook (no rows).
- **Story 6.6 (this)** = create `LogEntry` with **character** variants + empty copy; for `battle_*` types render a **neutral, non-crashing `summary` fallback** + a one-line `// Story 6.7: battle-event variants + completed-battle drill-in` seam comment.
- **Story 6.7** = extend `LogEntry` with battle-event layout/context and completed-battle drill-in (it owns that prop/handler contract).

So 6.6 **creates** `LogEntry` but must **not** pin battle props, a battle row layout, an `onPress`/drill-in handler, or `/logs/:logId` usage (Story 6.7's notes + Story 6.4 confirm battle drill-in renders from the in-list `payload`, no `/logs/:logId` FE caller). Keep `LogEntry` open for extension: branch on `eventType`, character branches fully built, non-character branches a guarded `summary` fallback. This is the same defer-to-owning-story discipline used across Epic 6.

### Loading / error / empty — consume Story 6.5's scaffolding (AC 6, 7)

- 6.5 builds: initial loading indicator, next-page footer spinner, **recoverable first-page error + Retry (`refresh`)**, next-page-error-keeps-history, and the `FlatList` with `onEndReached → loadNextPage`. 6.6 must **not** duplicate or replace any of it.
- Epic-6.6 lists "empty state" and "error state with retry" ACs, but Story 6.5 already implemented the error/retry/loading and **deliberately deferred only the empty copy** to 6.6. Therefore: 6.6 ships the **empty copy** (`No events recorded yet.`, no CTA — UX 12.6) into 6.5's empty branch, and **verifies** (not rebuilds) that 6.5's recoverable error+retry satisfies epic-6.6 AC 7. Document this division in Completion Notes (intentional variance vs. a literal reading that 6.6 owns the error UI — 6.5's Dev Notes/ACs explicitly own error+loading; 6.6 owns rows + empty copy).
- Empty is subordinate to loading & error (never show empty copy while loading or while an error is surfaced) — 6.5 already enforces loading/error mutual exclusivity; keep empty inside the `!isLoading && !errorMessage && entries.length === 0` branch 6.5 left for it.

### Current state of files (read before editing)

- **`frontend/app/munchkin/[roomNumber]/log.tsx`** — *created by Story 6.5; does not exist on this branch yet (Task 0 HALT gate).* When present: contains the list + a marked placeholder `renderItem` + an empty-branch comment 6.5 left for 6.6. 6.6 edits **exactly two spots** (renderItem → `<LogEntry>`; empty branch → copy). Read it fully first; conform to its prop/variable names.
- **`frontend/hooks/useRoomLogs.ts`** / **`frontend/api/logs.ts`** — *created by Story 6.5; absent now.* 6.6 imports 6.5's exported **entry type** (for `LogEntry`'s `entry` prop) and `log.tsx` consumes 6.5's hook result. Do not redefine either.
- [frontend/components/munchkin/RoomCharacterCard.tsx](frontend/components/munchkin/RoomCharacterCard.tsx) — **the avatar idiom to mirror**: `import avatars from '@/constants/avatars'`, `<View style={[..., { backgroundColor: character.color }]}><Image source={avatars[character.avatar]} .../></View>`, `memo`, pure `StyleSheet` + `AppTheme` colors, inline fontSize/fontWeight for name. Scale avatar to 48×48 for `LogEntry` (intentional variance vs. UX-DR12's 24×24, see Documented variances #6), not the 75×75 card size.
- [frontend/constants/avatars.ts](frontend/constants/avatars.ts) — default export, **10** image refs, indices 0–9 (guard `avatarId`).
- [frontend/constants/theme.ts](frontend/constants/theme.ts) — `AppTheme`; **typography = caption/labelSm/labelMd only** (no `body`). Colors include `accent`, `textAccentSoft`, `textMuted`, `surfaceWarm`, `surfaceSubtle`, `danger`, `elevated`, `background`, `surface`, `textPrimary`.
- [frontend/app/munchkin/[roomNumber]/(battle)/index.tsx](frontend/app/munchkin/[roomNumber]/(battle)/index.tsx) — state-block/`stateText` styling reference (6.5's scaffold mirrors this; 6.6's empty copy should visually align with 6.5's existing state blocks — match, don't reinvent).
- [frontend/components/munchkin/ActiveBattleBanner.test.tsx](frontend/components/munchkin/ActiveBattleBanner.test.tsx), [RoomCharacterCard.test.tsx](frontend/components/munchkin/RoomCharacterCard.test.tsx) — the component-test pattern (`@testing-library/react` `render`/`screen`, jsdom, `react-native`→`react-native-web` alias via `vitest.config.ts`, `test/setup.ts`).
- [frontend/vitest.config.ts](frontend/vitest.config.ts) — default unit config: `include: ['**/*.test.{ts,tsx}']`, excludes `__tests__/app/**`; **coverage `include: ['api/**','config/**','hooks/**']` — `components/**` is NOT coverage-counted**, so `LogEntry` doesn't raise/lower the floor, but the 70% floor (computed over api/config/hooks) must still pass and must not regress. Route tests for `log.tsx` live under `frontend/__tests__/app/...` via [vitest.room-route.config.ts](frontend/vitest.room-route.config.ts) (Story 6.5 owns that file).

### Conventions to honor ([Source: _bmad-output/project-context.md] + architecture)

- **Frontend strict TS** — explicit prop interface; narrow `unknown` `payload` via guards/`typeof` (no blanket `any`). Import the entry type from `@/api/logs` (6.5-owned) — do not re-declare it (avoid contract drift / circular concerns).
- **Layered boundaries** — `LogEntry` is a presentational `components/munchkin/*` component: **no** `apiRequest`, **no** TanStack Query, **no** data fetching, **no** navigation inside it. It receives one `entry` prop and renders. Orchestration stays in `log.tsx` (route) / `useRoomLogs` (hook). ([Source: architecture/...#frontend layered boundaries]; [Source: _bmad-output/project-context.md] "components stay mostly presentational".)
- **AppTheme tokens only** — pure `StyleSheet.create`, `AppTheme.colors/spacing/radius`; **never** hardcode colors; **never** reference non-existent `AppTheme.typography.body` (see reality check). Mirror existing components' inline-fontSize-for-body idiom.
- **Expo Router** — `app/**` is route-only; `LogEntry` lives in `components/munchkin/`, its test alongside it (not under `app/`).
- **Minimal, localized edits** — new `LogEntry.tsx` (+ optional `logEntryTime.ts`) + their tests + the **two-spot** `log.tsx` change. No opportunistic refactor of 6.5's `log.tsx`/hook/api, no theme changes, no dependency/lockfile churn.
- **Stable rendering** — never throw/blank for any of the 6 supported event types or partial payloads; `summary` is the universal safe fallback.
- **a11y** — one descriptive row `accessibilityLabel` per UX-DR12; avatar `Image` hidden from a11y so it doesn't double-announce.
- **Docs-in-same-change** if a component/route doc exists (Task 5).

### Testing standards summary

- `LogEntry` is pure-presentational → test by rendering with **inline entry fixtures** (no mocks of internals; the `react-native`→`react-native-web` alias + `test/setup.ts` are already configured — same as `RoomCharacterCard.test.tsx`).
- ≥1 success + ≥1 failure/edge per behavior (project-context): each character variant (created/updated/deleted) renders the right label/avatar/name; **multi-field `character_updated` → exactly N `prev → new` rows for N changed keys** (highest-value AC-5 assertion — assert the count explicitly); empty/absent `changes` → `summary` fallback; missing `payload.character` fields → no throw + safe fallback + a11y label still correct; out-of-range `avatarId` → fallback avatar, no crash; `battle_*` type → neutral `summary`, no throw, no battle layout; a11y label shape per AC 9.
- Relative-time helper (if separate): deterministic via injected `now` — assert `just now`/minutes/hours/days buckets + unparseable→safe fallback. No fake timers, no real `Date.now()` in assertions.
- Coverage: `LogEntry` (`components/**`) is **not** in `coverage.include` so it does not move the 70% floor — but still assert real behavior (project-context: "coverage is a floor, not the goal"; test behavior contracts). The floor (over `api/config/hooks`) must still pass and not regress; **do not lower it** ([Source: _bmad-output/project-context.md]; [Source: architecture/implementation-patterns-consistency-rules.md#Test Coverage Gate]).

### Project Structure Notes

- New: `frontend/components/munchkin/LogEntry.tsx` (+ `LogEntry.test.tsx`), optionally `frontend/components/munchkin/logEntryTime.ts` (+ `logEntryTime.test.ts`). Modified: **only** `frontend/app/munchkin/[roomNumber]/log.tsx` (Story-6.5-created) at two seam points (renderItem + empty branch). No new top-level dirs; no backend; no deps; no theme changes. `LogEntry` placement under `components/munchkin/` matches the existing room/character component grouping ([Source: architecture/implementation-patterns-consistency-rules.md#Frontend File Structure]; [Source: _bmad-output/project-context.md] "frontend/components for reusable UI").
- **Documented variances (record in Completion Notes, do not silently "fix"):**
  1. **UX-DR12 typography token names (`body`/`body bold`) do not exist in `AppTheme`** — implemented via the existing inline-fontSize + `AppTheme.colors` idiom (same as `RoomCharacterCard`); no new theme tokens added (cross-cutting theme change is out of scope).
  2. **Epic-6.6 "error state with retry" is satisfied by Story 6.5's recoverable error+`refresh` scaffolding** (6.5 explicitly owns error/loading and deferred only the empty copy to 6.6) — 6.6 ships the empty copy and verifies (not rebuilds) the error path.
  3. **`LogEntry` is created here but battle variants + completed-battle drill-in are Story 6.7** — `battle_*` types render a neutral `summary` fallback with a seam comment; no battle prop/layout/drill-in pinned (defer-to-owning-story).
  4. **Exact 6.5-owned names** (entry type from `api/logs.ts`, `useRoomLogs` result fields, `log.tsx` renderItem/empty-branch shape) taken from 6.5's *delivered* code at implementation time; any assumed-vs-real difference recorded.
  5. **`No events recorded yet.` empty copy is owned/shipped here** (Story 6.5 deliberately deferred it) — exact string, no CTA (UX 12.6).
  6. **Avatar rendered at 48×48 instead of UX-DR12's 24×24 anatomy** — at 24×24 the character avatar is too small to read against the single-column row layout and the log list looks visually empty; 48×48 keeps the avatar legible and the row visually balanced while still being well below the 75×75 character-card size. UX consequence is internal to `LogEntry` (no theme change, no shared-token change). Recorded here per the defer-to-owning-story / record-don't-silently-fix discipline.

### Cross-story context

- **Story 6.5 (`ready-for-dev`, NOT done) — HARD prerequisite.** Provides the `log.tsx` screen + render seam + empty branch, `useRoomLogs`, and `api/logs.ts` entry type. 6.6 has no host/seam/type without it → Task 0 HALT gate (not a soft contract-lock — 6.6 cannot be unit-tested-around-it the way 6.5 could mock its backend).
- **Story 6.4 (`ready-for-dev`) — entry shape source.** Defines `id, eventType, summary, payload, occurredAt, …` (bare newest-first array). 6.6 renders that shape (via 6.5's type); order preserved as-is (no client sort).
- **Story 6.1 (`ready-for-dev`) — character `payload` producer.** Defines `payload.character{id,name,avatarId,color}` + `payload.changes` (character_updated). 6.6 reads it defensively; does not import/modify it.
- **Story 6.7 (`backlog`) — battle half of `LogEntry` + drill-in.** Extends the `LogEntry` 6.6 creates. 6.6 leaves a guarded `summary` fallback + seam comment for `battle_*`; pins nothing battle-side.
- **Story 6.2 (`ready-for-dev`) — `summary` producer.** `buildSummary` makes the deterministic plain-text used as 6.6's universal safe fallback.
- This story is the **character-event UI payoff of Epic 6's pipeline** (6.1 publish → 6.2 store → 6.4 read → 6.5 load → **6.6 render characters**); 6.7 completes it with battle entries.

### References

- [Source: epics/epic-6-room-history.md#Story 6.6] — story + ACs (scrollable newest-first `LogEntry` list, cursor pagination, created/updated/deleted variants, per-field `prev → new` rows, empty `No events recorded yet.` no CTA, error+retry)
- [Source: epics/epic-6-room-history.md#Story 6.5] — the data/scaffold foundation (screen, `useRoomLogs`, `api/logs.ts`, render seam, error/loading scaffolding, **explicitly defers empty copy to 6.6**)
- [Source: epics/epic-6-room-history.md#Story 6.7] — battle-event variants + completed-battle drill-in (the `LogEntry` half 6.6 must leave open)
- [Source: _bmad-output/implementation-artifacts/6-5-room-history-loads-in-the-app.md] — render-seam contract, `useRoomLogs` return shape, `payload` kept `unknown`/permissive for 6.6, empty-copy deferral, vitest split
- [Source: _bmad-output/implementation-artifacts/6-1-character-events-are-published-for-room-history.md#Key design decision — payload shape] — `payload.character{id,name,avatarId,color}` + `payload.changes` superset 6.6 renders
- [Source: _bmad-output/implementation-artifacts/6-4-room-history-api-returns-paginated-events.md#Acceptance Criteria] — entry fields (`id, eventType, summary, payload, occurredAt, …`), bare newest-first array, no client re-sort
- [Source: _bmad-output/implementation-artifacts/6-2-published-events-are-stored-and-readable-in-room-history.md#Summary rules] — deterministic `summary` strings used as 6.6's safe fallback
- [Source: ux-design-specification/11-component-strategy.md#11.4 LogEntry] — anatomy: 24×24 character-color avatar (implementation uses **48×48** per Documented variances #6 — single-column row legibility) · name (textAccentSoft) · field label (caption, textMuted) · `prev → new` (bold, accent) · timestamp (caption, textMuted, right-aligned); [#11.6] Phase 2 step 8 (`LogEntry` after the Log screen)
- [Source: ux-design-specification/12-ux-consistency-patterns.md#12.6] — Empty log: `No events recorded yet.` · CTA: None
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] — UX-DR12 (`LogEntry` anatomy + `accessibilityLabel="[Name], [field] changed from [prev] to [new], [time] ago"`), UX-DR14 (Log View paginated list, empty copy, safe area at screen level)
- [Source: architecture/implementation-patterns-consistency-rules.md#Frontend Code, #Frontend File Structure, #Test co-location rule] — PascalCase component file, `components/` placement, `<Source>.test.tsx` matching casing, 70% floor
- [Source: _bmad-output/project-context.md] — frontend strict TS, layered api/hooks/components/app boundaries, AppTheme tokens, components presentational, Expo-Router route-only `app/`, ≥1 success/≥1 failure per behavior, minimal/scoped edits, no dep/lockfile churn, deterministic tests, docs-in-same-change
- [frontend/components/munchkin/RoomCharacterCard.tsx](frontend/components/munchkin/RoomCharacterCard.tsx), [frontend/constants/avatars.ts](frontend/constants/avatars.ts), [frontend/constants/theme.ts](frontend/constants/theme.ts) — avatar idiom, avatar array (10), `AppTheme` (no `body` token)
- [frontend/app/munchkin/[roomNumber]/(battle)/index.tsx](frontend/app/munchkin/[roomNumber]/(battle)/index.tsx) — state-block styling 6.5's scaffold mirrors; align empty copy visually
- [frontend/components/munchkin/RoomCharacterCard.test.tsx](frontend/components/munchkin/RoomCharacterCard.test.tsx), [frontend/components/munchkin/ActiveBattleBanner.test.tsx](frontend/components/munchkin/ActiveBattleBanner.test.tsx) — component-test pattern to copy
- [frontend/vitest.config.ts](frontend/vitest.config.ts), [frontend/vitest.room-route.config.ts](frontend/vitest.room-route.config.ts) — `components/**` not coverage-counted; route tests run via `test:room-route` (6.5-owned)

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-21: Verified Story 6.5 deliverables exist before implementation: `frontend/app/munchkin/[roomNumber]/log.tsx`, `frontend/hooks/useRoomLogs.ts`, and `frontend/api/logs.ts`.
- 2026-05-21: Initial focused test command failed before implementation because `vitest` was not installed in this worktree; ran `npm install` from `frontend/` using the existing lockfile/package, then proceeded with targeted/full gates.
- 2026-05-21: Focused tests fixed by mocking React Native `Image` in `LogEntry.test.tsx` to avoid react-native-web asset resolution for mocked avatar IDs.

### Completion Notes List

- Story 6.6 is complete and ready for review.
- Implemented `LogEntry` as a memoized presentational component using Story 6.5's exported `LogEvent` type. Character create/delete/update entries render avatar, name, label, timestamp, and per-field update diffs; partial/missing payloads degrade to safe summary/name fallbacks without throwing.
- Added co-located `formatRelativeTime` helper with deterministic tests for `just now`, minute, hour, day, and invalid-input buckets. No date dependency was added.
- Replaced the Story 6.5 placeholder row seam in `log.tsx` with `<LogEntry entry={item} />` and added the exact empty-state copy `No events recorded yet.` while preserving Story 6.5 pagination/loading/error/retry behavior and rendering entry order as-is.
- Verified the Story 6.5-owned first-page retry path remains the error UI for AC 7; Story 6.6 does not duplicate error scaffolding.
- Left battle events as a neutral summary fallback with an inline Story 6.7 seam; no battle layout, drill-in, or battle prop contract was pinned.
- Used existing AppTheme reality: `caption`/`labelSm`/`labelMd` only. Name and diff values use the local inline font-size/font-weight idiom with AppTheme colors, with no new theme tokens.
- Updated the existing Log View doc to include character `LogEntry` rows, empty copy, and the Story 6.7 battle-row deferral.
- Validated with `npm run tsc`, `npm test`, and `npm run test:coverage` from `frontend/`; coverage line floor passed at 84.96%.
- Addressed manual review comment: array diffs now render as comma-separated values and empty arrays render as `<Empty>` (for example `Human, Elf → Human, Dwarf` and `<Empty> → Warrior`), including accessibility-label text.
- Addressed follow-up manual review comment: stringified JSON array diffs now use the same display formatting as real arrays, while ordinary strings remain unchanged.
- Documented variance #6 (avatar 48×48 vs. UX-DR12's 24×24): code review (2026-05-21) flagged the avatar size against the spec; after review, the spec was amended to record 48×48 as an intentional variance — at 24×24 the character avatar is illegible against the single-column row layout and the log list reads visually empty; 48×48 keeps the avatar visible and the row balanced while remaining well below the 75×75 character-card size. Spec references and Documented variances list updated; no code change needed.

### File List

- `_bmad-output/implementation-artifacts/6-6-room-history-view-shows-character-events.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/descriptions/MunchHelper/Frontend/Log View.md`
- `frontend/__tests__/app/munchkin/[roomNumber]/log.test.tsx`
- `frontend/app/munchkin/[roomNumber]/log.tsx`
- `frontend/components/munchkin/LogEntry.test.tsx`
- `frontend/components/munchkin/LogEntry.tsx`
- `frontend/components/munchkin/logEntryTime.test.ts`
- `frontend/components/munchkin/logEntryTime.ts`

### Change Log

- 2026-05-21: Implemented Story 6.6 character `LogEntry` rendering, empty history copy, tests, docs, and story/sprint status updates.
- 2026-05-21: Addressed manual review comment for array diff display formatting.
- 2026-05-21: Addressed manual review follow-up for stringified array diff display formatting.
- 2026-05-21: Code review (3-layer adversarial) — patch finding "avatar 48×48 vs spec 24×24" resolved by amending spec to 48×48 with rationale (single-column row legibility); added Documented variance #6 and Completion Notes entry. No code change.
