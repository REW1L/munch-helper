# Story 6.4: Room History API Returns Paginated Events

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want room history to load in pages,
so that I can review older session events without waiting for the full history to load.

## Acceptance Criteria

1. **Given** `logReader` receives `GET /logs?roomId=X` (no cursor), **when** the request is processed, **then** it returns up to `limit` (default `50`) `LogEvent` entries for **exactly** that `roomId`, in **reverse chronological order via MongoDB `_id`** (newest first), as a **bare JSON array** (no envelope wrapper), each entry exposing `id` (never raw `_id`), `roomId`, `eventType`, `actorId`, `summary`, `payload`, `occurredAt`, `createdAt`, `updatedAt`.
2. **Given** `GET /logs?roomId=X&before=<_id>`, **when** the request is processed, **then** the query is `{ roomId, _id: { $lt: ObjectId(before) } }` sorted `{ _id: -1 }` — the `before` cursor is **exclusive**, so the first item of the next page is strictly older than (never equal to) the last item of the previous page (no duplicate boundary item across pages).
3. **Given** `GET /logs?roomId=X&limit=N`, **when** `N` is a valid positive integer, **then** at most `N` entries are returned; `N` is **clamped to a maximum of `100`**; a missing/blank `limit` defaults to `50`; a non-numeric / `<= 0` `limit` is a `400` client error `{ message }` (do not silently coerce garbage to the default).
4. **Given** the compound index `{ roomId: 1, _id: -1 }` defined on the `LogEvent` model **by Story 6.2**, **when** the paginated query runs, **then** it relies on that index for consistent ordering and roomId isolation — Story 6.4 **must not (re)define the index** (Story 6.2 owns the model + index); it only consumes it. (Task 0 verifies the index exists; absence is a Story 6.2 gap to flag, not to silently patch here.)
5. **Given** an empty room history (no `LogEvent` documents for `roomId`), **when** `GET /logs?roomId=X` runs, **then** the response is `200` with a bare empty array `[]` and **no error** (empty is a valid terminal state, not a 404).
6. **Given** `roomId` is **missing or blank**, **when** `GET /logs` is requested, **then** the response is `400` with `{ message: <non-empty> }` and **no Mongo query is issued** (fail before the query, never run an unfiltered cross-room scan).
7. **Given** `before` is present but **not a valid 24-hex MongoDB ObjectId**, **when** `GET /logs` is requested, **then** the response is `400 { message }` (reject before querying — do not let an invalid cast throw a `502`).
8. **Given** `GET /logs/:logId?roomId=X` (single-entry detail endpoint, architecture-mandated and explicitly deferred to this story by Story 6.2’s router seam), **when** processed, **then** it returns the single `LogEvent` matching **both** `_id === :logId` **and** `roomId === X` (strict roomId isolation — never cross-room) as a direct resource object; **when** `logId` is not a valid ObjectId or `roomId` is missing/blank → `400 { message }`; **when** no entry matches that `(_id, roomId)` pair → `404 { message }`.
9. **Given** the response shape, **when** the app (Story 6.5) consumes it, **then** the contract is stable and sufficient to (a) render each entry and (b) request the next page: the client derives the next cursor as the **`id` of the last entry in the array**, and an array shorter than `limit` (including `[]`) signals end-of-history. No server-side `nextCursor`/`hasMore` field is added (cursor is client-derived from `id`); this contract is documented for Story 6.5 to depend on.
10. **Given** an unexpected/internal failure (e.g. Mongo throws mid-query), **when** it surfaces, **then** the Lambda/Express error path returns `502 { message: 'Unexpected error' }` (never `500`), matching the existing service convention; validation failures stay `400`, not-found stays `404`.
11. **Given** the coverage gate, **when** `npm test` / `npm run test:coverage` run from `backend/`, **then** `log-service` reader tests are discovered and counted (Story 6.2 Task 7 wiring), and the **70% line floor still passes** — tests assert real behavior: roomId filter, `_id` `$lt` exclusive cursor, `limit` default/clamp/reject, empty result, missing/invalid `roomId`, invalid `before`, `/logs/:logId` hit/404/cross-room-miss, `502` mapping.

> **⛔ SCOPE GUARD & PREREQUISITE — READ BEFORE WRITING ANY CODE.**
> This story implements **only the `logReader` paginated read contract** inside the **router seam Story 6.2 already created** (`backend/log-service/src/routes/logs.ts`, marked with the inline `// Story 6.4: cursor pagination + roomId-filtered query + GET /logs/:logId implemented here` comment). It replaces Story 6.2’s deliberately-empty `GET /logs → []` skeleton with the real roomId-filtered, `_id`-cursor query, adds `GET /logs/:logId`, and adds the reader tests.
>
> It **does NOT build**: `log-service` scaffolding, the `LogEvent` model or its `{ roomId:1, _id:-1 }` index, `db.ts`, `app.ts`/`buildLogApp`, `lambda-read.ts`, `subscriber.ts`/`logWriter`, the SNS/Redis persistence path, `backend/vitest.config.ts` / `backend/package.json` workspace wiring, the SAM `LogReaderFunction` / `LogEventsTopic`, docker-compose/nginx — **all of that is Story 6.2**. It does **not** make `character-service`/`battle-service` publish events (Stories 6.1 / 6.3). It does **not** touch any frontend (Stories 6.5–6.7).
>
> **Hard blocked-by (must be `done` before this story can be implemented): Story 6.2.** At create time Story 6.2 is `ready-for-dev`, not `done`, and `backend/log-service/` **does not exist on `main`** (verified: only `battle-service`, `character-service`, `room-service`, `room-notifications-service`, `user-service` exist). Stories 6.1 and 6.3 (the event *producers*) are **not** blockers for the reader — `logReader` queries the `logevents` collection regardless of who wrote the documents, and the reader tests mock the model layer. **If `backend/log-service/` (with the model + router seam + reader wiring) is absent when implementation starts, HALT and report blocked-on-6.2** — do not scaffold `log-service` here (that is a massive out-of-scope blast radius that collides with Story 6.2’s own implementation). See Task 0.

## Tasks / Subtasks

- [x] **Task 0 — Verify Story 6.2 prerequisites (blocking gate; AC: 4, 8, 11)**
  - [x] Confirm `backend/log-service/src/routes/logs.ts` exists with a `GET /logs` handler and the Story 6.4 seam comment, currently returning `200 []` for a present `roomId` and `400 { message }` for missing/blank `roomId`.
  - [x] Confirm `backend/log-service/src/models/LogEvent.ts` exists and declares the compound index `logEventSchema.index({ roomId: 1, _id: -1 })`, `{ timestamps: true }`, and the `_id → id` `toJSON` transform (AC 4). Note the exact model export name and document field names actually delivered.
  - [x] Confirm the read app/wiring delivered by 6.2: the Express app factory (`app.ts`/`buildLogApp`), how the router obtains its data access (a `LogModelLike` DI seam à la `battle-service` `createApp(model, …)`, **or** a `service.ts` model adapter, **or** the router importing `LogEvent` directly) — **read the actual file; do not assume.** Record which pattern 6.2 chose; conform to it (see Dev Notes “Conform to 6.2’s delivered seam”).
  - [x] Confirm `backend/vitest.config.ts` `test.include` + `coverage.include` list `log-service/src/**` and `backend/package.json` `workspaces` lists `log-service` (Story 6.2 Task 7). If absent, the new reader tests will silently not run / not count toward the 70% gate — **flag it in Completion Notes** (it is a 6.2 wiring gap; do not re-do 6.2’s wiring as part of 6.4 unless trivially confirming).
  - [x] Confirm the SAM `LogReaderFunction` routes the detail path (either `/logs/{proxy+}` or an explicit `GET /logs/{logId}`) to the Express app so `GET /logs/:logId` is reachable in cloud.
  - [x] **If `backend/log-service/` or the `routes/logs.ts` seam is missing → STOP.** Record in Completion Notes: “Story 6.4 blocked on Story 6.2 (log-service scaffold/model/router seam not yet delivered).” Do not scaffold `log-service`, do not create the model/index, do not wire vitest/SAM here.

- [x] **Task 1 — Implement the roomId-filtered, `_id`-cursor query (AC: 1, 2, 3, 5, 6, 7)**
  - [x] In whatever data-access layer 6.2 delivered (the `LogModelLike` adapter / `service.ts` / direct `LogEvent` use — per Task 0), add a paginated query: filter `{ roomId, ...(before ? { _id: { $lt: new mongoose.Types.ObjectId(before) } } : {}) }`, `.sort({ _id: -1 })`, `.limit(effectiveLimit)`. Map results through the model `toJSON` (or an explicit `toLogLike` mapper mirroring `battle-service/src/service.ts` `toBattleLike`) so responses expose `id`, never raw `_id`/`__v`.
  - [x] Parse + validate query params **before** touching Mongo: `roomId` required non-blank trimmed string → else `400` (AC 6); `limit` → default `50`, parse as integer, reject non-numeric / `<= 0` with `400`, clamp to max `100` (AC 3); `before` → if present must satisfy `mongoose.Types.ObjectId.isValid(before)` else `400` (AC 7). Reuse `mongoose` from `../db` (the established `export { mongoose }` singleton — same import style as `battle-service/src/models/Battle.ts`); do **not** add a new `mongodb`/`bson` dependency.
  - [x] Empty result set → return `[]` with `200` (AC 5) — no special-casing, the query simply yields zero docs.
  - [x] `roomId` isolation is enforced **at the query level** (`roomId` is always in the filter object); never issue an unfiltered or cross-room query ([Source: architecture/core-architectural-decisions.md#Auth & Security]).

- [x] **Task 2 — Wire the query into the `GET /logs` route, replacing the 6.2 skeleton (AC: 1, 2, 3, 5, 6, 7, 9, 10)**
  - [x] In `routes/logs.ts`, replace the skeleton’s `res.json([])` body with: validate params (Task 1) → on validation failure `res.status(400).json({ message })` → else `await` the paginated query → `res.status(200).json(entries)` as a **bare array** (no `{ data }`/`{ items, nextCursor }` envelope — AC 1/9, [Source: architecture/implementation-patterns-consistency-rules.md#API Responses — direct (no envelope)]).
  - [x] Keep the existing 6.2 error-handling/`502` path and `ROUTE_PREFIX` stripping **as-is** — they live in 6.2’s `app.ts`; do **not** re-implement prefix stripping or the `502` handler in the router. Route handler errors propagate via `next(error)` to the existing app-level `502 { message: 'Unexpected error' }` handler (mirror `battle-service/src/app.ts` `try { … } catch (error) { next(error); }`).
  - [x] Remove the now-satisfied portion of the `// Story 6.4: …` seam comment (leave the file clean — no “TODO/Story 6.4” marker once implemented).

- [x] **Task 3 — Add `GET /logs/:logId` single-entry detail (AC: 8, 10)**
  - [x] Add a `GET /logs/:logId` handler in `routes/logs.ts`. Require `roomId` query param (non-blank) and a valid-ObjectId `:logId` → else `400 { message }`. Query `{ _id: ObjectId(logId), roomId }` (strict roomId isolation — never look up by `_id` alone, [Source: architecture/core-architectural-decisions.md#Auth & Security]). Found → `200` direct resource (mapped to expose `id`). Not found for that `(_id, roomId)` pair → `404 { message }`.
  - [x] **Route ordering:** register `GET /logs/:logId` such that it does not shadow / is not shadowed by `GET /logs` (Express matches `/logs` and `/logs/:logId` distinctly; just ensure both are mounted on the same router 6.2 created and the literal collection route is not accidentally captured by the param route). Add a one-line comment only if the ordering is non-obvious.

- [x] **Task 4 — Reader tests (AC: 1–3, 5–11)**
  - [x] Co-locate tests as `<source>.test.ts` with **casing matching the source 6.2 delivered** (e.g. `routes/logs.test.ts`, and/or `service.test.ts` — match 6.2’s layout exactly; [Source: architecture/implementation-patterns-consistency-rules.md#Test co-location rule]). Use `supertest` + Vitest (the established stack — see `battle-service/src/app.test.ts`); the repo has **no `mongodb-memory-server`** — **mock the model/data layer** (inject a `LogModelLike` mock with `vi.fn()` like `battle-service` `buildBattleModel()`, or `vi.mock('../models/LogEvent', …)` with a chainable `find().sort().limit()` mock — whichever matches 6.2’s seam).
  - [x] **HTTP reader filtering behavior** (AC 1,2,6,7,9): `GET /logs?roomId=room-1` → `200`, array, each item has `id` and no `_id`; the query layer was called with `roomId: 'room-1'` and **no** `_id` filter (page 1). `GET /logs?roomId=room-1&before=<validOid>` → query called with `{ roomId, _id: { $lt: ObjectId(<validOid>) } }`, sort `{ _id: -1 }`. Missing/blank `roomId` → `400`, query layer **never invoked** (AC 6). Invalid `before` (`'not-an-oid'`) → `400`, query never invoked (AC 7).
  - [x] **Pagination / limit** (AC 3): default → `limit 50`; `?limit=10` → `limit 10`; `?limit=9999` → clamped `100`; `?limit=0` / `?limit=abc` → `400`. **Exclusive cursor** (AC 2): assert the `_id` filter is `$lt` (strictly less-than), not `$lte` — the boundary item is not repeated.
  - [x] **Empty + detail + error** (AC 5,8,10): query yields `[]` → `200 []`. `GET /logs/:logId?roomId=X` hit → `200` resource; not-found `(_id,roomId)` → `404`; valid `_id` but wrong `roomId` → `404` (cross-room isolation, explicit highest-value security assertion); bad `:logId` / missing `roomId` → `400`. Model throws → `502 { message: 'Unexpected error' }` (mirror `battle-service` `app.test.ts` “returns 502 for unexpected errors”).
  - [x] Deterministic: no real Mongo/network, no timing reliance. Run the gate from repo `backend/`: `cd backend && npm test` then `npm run test:coverage` (Vitest 3.2.4, v8, **70% line floor — do not lower**). Confirm `log-service` reader suites appear in output (proves Task 0’s 6.2 vitest wiring).

- [x] **Task 5 — Docs in the same change (AC: 1, 8, 9)**
  - [x] Update the nearest docs for the now-real endpoints (docs-in-same-change rule, [Source: _bmad-output/project-context.md]): if Story 6.2 added a `log-service` row / `/logs` proxy line to `backend/README.md`, extend it to document the real `GET /logs?roomId=X&limit=&before=` + `GET /logs/:logId?roomId=X` contract and the **client-derived cursor** rule (last entry’s `id` = next `before`; short/empty array = end). Do not invent a new doc file; do not duplicate what 6.2 already wrote — only reflect the contract this story makes real.
  - [x] Do **not** add/modify env vars, dependencies, or lockfiles (this story is pure read logic over what 6.2 wired). If none exist to update, note “no doc deltas required” in Completion Notes.

## Dev Notes

### What this story is (and is not)

- **Is:** architecture Implementation Sequence step 3’s `logReader` HTTP read API — the cursor-paginated, roomId-isolated `GET /logs` + `GET /logs/:logId` query layer, dropped into the router seam Story 6.2 stood up ([Source: architecture/core-architectural-decisions.md#Implementation Sequence] step 3; [#API Design — Log API]; [#ADR-7]).
- **Is not:** `log-service` scaffolding / model / index / SNS subscriber / infra / vitest+workspace wiring (all Story 6.2), the event producers (Stories 6.1 character / 6.3 battle), or any frontend (Stories 6.5 paginated loading / 6.6 character entries / 6.7 battle entries + drill-in). The reader is correct and testable even if zero real events have been published yet (it queries whatever is in `logevents`; tests mock the data layer).

### Conform to Story 6.2’s delivered seam (do not pre-pin 6.2-owned names)

Story 6.2 (still `ready-for-dev`) owns the exact shape of `log-service`’s read seam: the `LogEvent` model export name, document field names, the Express app factory name (`buildLogApp`/`createApp`), and **how `routes/logs.ts` reaches data** (DI `LogModelLike` adapter like `battle-service`, a `service.ts` adapter, or a direct `LogEvent` import). Story 6.2’s own scope guard says it ships “a clean router seam” returning `[]` and that pagination/`before`/`_id` cursor/response shape/`/logs/:logId` + their tests are **Story 6.4’s ACs** (explicit hand-off). **Read the actual 6.2-delivered files at implementation time and conform to whatever it built**; if a name the dev must reference differs from what this story assumes, follow 6.2’s real name and record the assumption/variance in Completion Notes (same defer-to-owning-story discipline Stories 6.1/6.2/6.3 used for env/channel names). Do not “correct” 6.2’s naming.

### Recommended response shape — lead with the clean approach (AC 1, 9)

**Recommended: a bare JSON array of `LogEvent` resources** (newest-first), with the next-page cursor **derived client-side from the last entry’s `id`**. Rationale, in order of weight:
1. **Consistency with the established seam** — Story 6.2’s skeleton already returns `200 []` (a bare array). Keeping a bare array means 6.4 narrows behavior without changing the shape 6.2 shipped, so 6.5 can be written against one stable contract.
2. **Architecture no-envelope rule is explicit** — `{ data, success }` / `{ items, … }` wrappers are an enumerated anti-pattern; responses are “direct resource” ([Source: architecture/implementation-patterns-consistency-rules.md#API Responses — direct (no envelope), #Enforcement Summary]).
3. **`_id`-cursor pagination needs no server-side cursor field** — the cursor *is* the last item’s `id` (ADR-7: “`before` param is the `_id` string of the last seen item”). A `nextCursor`/`hasMore` field would duplicate information already in the array and invite drift between it and the items.

Client/Story-6.5 contract (document this explicitly in Task 5 docs and Completion Notes so 6.5 has zero ambiguity):
- Page 1: `GET /logs?roomId=X` (optionally `&limit=N`).
- Next page: `GET /logs?roomId=X&before=<id of last entry received>`.
- **End-of-history:** a returned array with **fewer than `limit` items (including `[]`)**. The client stops paginating.

**Rejected alternative:** an envelope like `{ items: LogEvent[], nextCursor: string | null }`. Marginally more self-describing, but it violates the explicit no-envelope architecture rule, diverges from the bare-array skeleton 6.2 shipped (forcing a contract change 6.5 would then track), and stores a derivable value. Do not introduce it. (If a future story genuinely needs a server-asserted `hasMore`, that is a deliberate contract change owned by that story — not a silent 6.4 addition.)

### Cursor semantics — exact, and why (AC 2, 4, 7)

- Sort **`{ _id: -1 }`** (newest first). MongoDB `ObjectId` is monotonic-enough for this log’s ordering and is the architecture-chosen cursor key — **not `occurredAt`** ([Source: architecture/core-architectural-decisions.md#Pagination], [#ADR-7]: “Cursor-based via MongoDB `_id` (not `occurredAt`)”). Do not sort by `occurredAt`/`createdAt`.
- `before` is **exclusive**: `_id: { $lt: ObjectId(before) }` — `$lt`, never `$lte`. With `$lte` the last item of page N reappears as the first item of page N+1 (the explicit AC-2 “no duplicate boundary item” failure). The reader test must assert `$lt`.
- The `{ roomId: 1, _id: -1 }` compound index (Story 6.2’s `LogEvent` model) makes `filter {roomId, _id:$lt} + sort {_id:-1}` an index-covered range scan. **6.4 does not declare the index** (AC 4) — verify it in Task 0; if 6.2 omitted it, that is a 6.2 defect to flag in Completion Notes, not to silently add here (silently adding it would split index ownership across two stories and risk a divergent definition).
- `before` must be ObjectId-validated **before** constructing the query — `new mongoose.Types.ObjectId('garbage')` throws; an unguarded throw becomes a `502`. AC 7 requires `400` for a bad cursor, so guard with `mongoose.Types.ObjectId.isValid(before)` first.

### `GET /logs/:logId` — included here on purpose; roomId-isolated (AC 8)

The epic 6.4 AC text does not literally enumerate a detail endpoint, **but** (a) the architecture API design mandates `GET /logs/:logId — Single log entry detail` ([Source: architecture/core-architectural-decisions.md#API Design — Log API]); (b) Story 6.2’s router-seam comment and SAM `LogReaderFunction` route explicitly **defer `/logs/:logId` and its tests to Story 6.4** (“It does NOT implement … `/logs/:logId` — that is Story 6.4’s ACs and tests”). Omitting it here would orphan an architecture-defined, infra-routed endpoint. This is a **documented intentional variance** vs. the epic-text shorthand (same discipline Stories 6.2/6.3 used for their epic-vs-architecture conflicts) — record it in Completion Notes.

Honor the security rule for it: **all log queries enforce roomId isolation at the query level — never cross-room** ([Source: architecture/core-architectural-decisions.md#Auth & Security]). Therefore `GET /logs/:logId` **requires a `roomId` query param** and filters `{ _id, roomId }` (a valid `_id` under the wrong `roomId` ⇒ `404`, not a leak). No current frontend story consumes this endpoint (Story 6.7’s battle drill-in renders from the raw `payload` already present in each list entry — see Cross-story context), so keep the handler minimal and do not build speculative shaping; it exists to satisfy the architecture API + 6.2’s deferral, fully tested.

### Current state of files (read before editing)

- `backend/log-service/` — **does not exist on `main`** (verified: `ls backend/` shows only `battle-service`, `character-service`, `room-service`, `room-notifications-service`, `user-service`). It is created entirely by Story 6.2. **Everything this story edits lives in files Story 6.2 creates.** This is the hard block — Task 0 gates on it.
- `backend/battle-service/src/app.ts` — the **closest existing analog** for the read API 6.2 will mirror: `createApp(model, { routePrefix })` Express factory, DI `BattleModelLike` (`findOne`/`create` as `vi.fn()`-able seam), `ROUTE_PREFIX` stripping middleware, `GET /battles` query-param validation returning `400 { message }`, a final `app.use((err,…)=>{ res.status(502).json({ message:'Unexpected error' }) })` handler, and `next(error)` propagation from handlers. **Mirror this pattern; do not invent a different one.**
- `backend/battle-service/src/service.ts` — `buildBattleApp` + `createBattleModel()` adapter + `toBattleLike()` doc→DTO mapper (strips `_id`). The 6.4 query layer / `toLogLike` mapper should follow this exact shape if 6.2 used the DI pattern.
- `backend/battle-service/src/app.test.ts` — the **exact reader test pattern to copy**: `supertest` `request(createApp(model, …))`, `buildBattleModel()` returning `{ findOne: vi.fn(), … }`, asserts `response.body._id` is `undefined`, asserts `model.findOne` call args, asserts `400`/`502`/route-prefix cases, and a `model.findOne.mockRejectedValue(new Error(...))` → `502` test. Reuse this structure for `log-service` reader tests.
- `backend/battle-service/src/models/Battle.ts` — shows `import { mongoose } from '../db'`, `{ timestamps: true }`, `toJSON` transform deleting `_id`/`__v`, and `schema.index(...)` declarations. Story 6.2’s `LogEvent.ts` mirrors this incl. the `{ roomId:1, _id:-1 }` index — 6.4 reuses `mongoose.Types.ObjectId.isValid` / `new mongoose.Types.ObjectId(...)` from this same `../db` singleton (no new dependency).
- `backend/{battle,room-notifications}-service/src/db.ts` — identical `connectToMongo` singleton + `export { mongoose }`. Story 6.2 copies this verbatim; 6.4 just imports `mongoose` from it.
- `backend/vitest.config.ts` — `test.include` + `coverage.include` currently list **only** `user/room/character/battle/room-notifications` services (no `log-service`); global excludes `**/*.test.ts`, `**/index.ts`, `**/models/**/*.ts`. Story 6.2 Task 7 adds `log-service`. 6.4 **verifies** this (Task 0); 6.4’s reader logic lives in `routes/`/`service.ts` (not `models/`, not `index.ts`) so it **is** coverage-counted once 6.2’s include line exists.
- `backend/package.json` — `workspaces` + `dev`/`start`/`typecheck` chains list only the 5 existing services; Story 6.2 adds `log-service`. 6.4 does not modify this (verify-only in Task 0).

### Conventions to honor ([Source: _bmad-output/project-context.md] + architecture)

- Backend is **non-strict TypeScript / NodeNext** — match 6.2/battle-service import grouping (external first, then internal); dynamic test imports use the `.js` extension even for `.ts` source (`await import('./logs.js')` style) if a test needs it (prefer `supertest` against the app factory, which needs no dynamic import).
- API: resources lowercase plural (`/logs`), route param `:logId` (not `{logId}`), query params camelCase (`roomId`, `before`, `limit`). Responses are **direct resources / bare arrays** (no envelope); errors are `{ message: string }`; validation `400`, not-found `404`, **unexpected `502` never `500`** ([Source: architecture/implementation-patterns-consistency-rules.md#API Routes, #Format Patterns, #Enforcement Summary]).
- Mongoose: never expose raw `_id`/`__v` — responses go through the `_id → id` `toJSON` transform (6.2’s model) or an explicit `toLogLike` mapper. Dates stay ISO-8601 in JSON. camelCase fields throughout.
- `log-service` is a **bounded context** — `logReader` reads **only** the `logevents` collection; **no cross-service imports** (no importing from `character-service`/`battle-service`/`room-notifications-service`) and **no synchronous inter-service HTTP** (ADR-11). All display data is already in the stored `payload`/`summary`; the reader never enriches via HTTP.
- `roomId` isolation is enforced **in the query filter** on **every** log query (`GET /logs` and `GET /logs/:logId`) — never an unfiltered or cross-room read ([Source: architecture/core-architectural-decisions.md#Auth & Security]).
- Keep edits **minimal and localized** to the 6.2-created `routes/logs.ts` (+ its data-access seam + co-located tests + the one docs touch). No opportunistic refactor of 6.2’s scaffold, no dependency/lockfile churn, no model/index/infra/wiring changes (6.2 owns those).

### Testing standards summary

- Mock external boundaries only — mock the model/data layer (`LogModelLike` DI mock, or `vi.mock` the `LogEvent` model with a chainable `find().sort().limit()` returning a controlled array). The repo has **no `mongodb-memory-server`** — do not introduce one; do not hit real Mongo. Never mock the unit under test (the route/validation logic).
- One success-path **and** one failure-path per behavior: page-1 vs cursor page; valid `limit` vs `limit=0`/`abc`; valid `before` vs invalid `before`; present `roomId` vs missing `roomId`; detail hit vs `404` vs cross-room `404`; happy query vs model-throws→`502`.
- Highest-value assertions (make explicit, not incidental): (1) the `_id` cursor filter uses **`$lt`** (exclusive) — guards AC 2 against the page-boundary-duplicate bug; (2) **cross-room isolation** — a valid `_id` under the wrong `roomId` returns `404`, never the other room’s entry — guards the AC 8 / Auth-&-Security rule; (3) missing/blank `roomId` → `400` with the data layer **never called** — guards against an accidental unfiltered scan.
- Coverage focus is the reader query/validation/route logic (`routes/logs.ts` + the `service.ts`/adapter query method) — `models/**` and `index.ts` are globally coverage-excluded. Keep tests asserting real behavior; **70% line floor is a CI hard gate — do not lower it** ([Source: architecture/implementation-patterns-consistency-rules.md#Test Coverage Gate]: `log-service` primary coverage target = “HTTP reader returns filtered roomId results”).

### Project Structure Notes

- All 6.4 code lives in **Story-6.2-created** files under `backend/log-service/src/**`: primarily `routes/logs.ts` (replace skeleton query, add `/logs/:logId`), its data-access seam (`service.ts` adapter or model query — per 6.2’s delivered pattern), and co-located `*.test.ts`. Plus at most one docs touch (`backend/README.md` log row, only if 6.2 created it). **No new top-level files; no new service; no model/index/infra/wiring files** ([Source: architecture/project-structure-boundaries.md] log-service tree — `routes/logs.ts` is the designated `GET /logs` location; [Source: architecture/implementation-patterns-consistency-rules.md#Backend Service File Structure]).
- **Documented variances (do not “fix” silently; record in Completion Notes):**
  1. **`GET /logs/:logId` is implemented here** though epic 6.4 AC text only spells out `GET /logs` — justified by the architecture API design + Story 6.2’s explicit deferral of `/logs/:logId` + its tests to 6.4 + the SAM route; omitting it would orphan an architecture-defined, infra-routed endpoint.
  2. **Response is a bare array with a client-derived cursor** (no `nextCursor`/`hasMore` field) — chosen for no-envelope-rule + skeleton consistency; the client/Story-6.5 contract (last `id` = next `before`; short/empty ⇒ end) is documented as the stable contract instead of a server field.
  3. **`{ roomId:1, _id:-1 }` index ownership stays with Story 6.2** — 6.4 verifies and consumes it but never (re)declares it; if absent it is flagged as a 6.2 gap, not patched here (avoids split/divergent index ownership).
  4. **Exact 6.2-owned seam names** (model export, app factory, data-access pattern) are taken from 6.2’s real delivery at implementation time; any assumed name that differed is recorded — defer-to-owning-story discipline (same as Stories 6.1/6.2/6.3 for env/channel names).

### Cross-story context

- **Story 6.2 (`ready-for-dev`, NOT done) — hard prerequisite.** Creates `log-service` (scaffold, `LogEvent` model + `{roomId:1,_id:-1}` index + `toJSON`, `app.ts`/`buildLogApp`, `lambda-read.ts`, `routes/logs.ts` skeleton with the explicit Story 6.4 seam, vitest/workspace wiring, SAM `LogReaderFunction`/`LogEventsTopic`, docker-compose/nginx). 6.2’s scope guard explicitly hands pagination/`before`/`_id` cursor/response shape/`/logs/:logId` + their tests to **this** story. Task 0 gates on 6.2 being delivered; if not, HALT.
- **Stories 6.1 (`ready-for-dev`) & 6.3 (`ready-for-dev`) — producers, NOT blockers for the reader.** They make `character-service`/`battle-service` publish events that `logWriter` (6.2) persists. The reader queries `logevents` independent of who/whether anything was written; reader tests mock the data layer, so the reader can be implemented and fully tested before any producer lands. (They *are* needed before end-to-end room history shows real data, but that is the frontend stories’ concern, not 6.4’s correctness.)
- **Story 6.5 (`backlog`) — primary consumer.** “Room History Loads in the App” depends on exactly this paginated contract: first page on mount, next page on scroll “using the server cursor.” The bare-array + last-`id`-cursor + short/empty-array=end contract (AC 9 / Dev Notes “Recommended response shape”) is the contract 6.5 will build against — keep it stable and document it (Task 5).
- **Stories 6.6 / 6.7 (`backlog`) — render from the list response.** 6.6 renders character entries; 6.7 renders battle entries and drills into completed battles **from the raw `payload` already in each list entry** (per Story 6.3’s cross-story notes — drill-in uses the verbatim stored `payload`, not a separate `/logs/:logId` fetch). So `payload` must be returned intact in each `GET /logs` entry (it is — full `LogEvent` doc via `toJSON`), and `/logs/:logId` has no current frontend caller (kept minimal, per AC 8 rationale).

### References

- [Source: epics/epic-6-room-history.md#Story 6.4] — story + acceptance criteria (`GET /logs?roomId=X&limit=50&before=<_id>`, reverse-chron `_id` cursor, exclusive `before`, empty list, invalid/missing `roomId`, stable shape, persistence+HTTP-filter tests)
- [Source: epics/epic-6-room-history.md#Story 6.2] — upstream `log-service` scaffold/model/router-seam; explicit deferral of pagination + `/logs/:logId` + tests to 6.4
- [Source: epics/epic-6-room-history.md#Story 6.5] — downstream app paginated loading (consumes this contract)
- [Source: epics/epic-6-room-history.md#Story 6.7] — battle drill-in renders from raw stored `payload` in list entries (why `payload` ships intact; why `/logs/:logId` has no FE caller)
- [Source: architecture/core-architectural-decisions.md#API Design — Log API] — `GET /logs?roomId=X&limit=50&before=<_id>` + `GET /logs/:logId`
- [Source: architecture/core-architectural-decisions.md#Pagination] / [#ADR-7] — cursor via MongoDB `_id` (not `occurredAt`); `before` = `_id` of last seen item; consistent ordering via `{ roomId:1, _id:-1 }`
- [Source: architecture/core-architectural-decisions.md#Log Schema] — `LogEvent` fields (`roomId`, `eventType`, `actorId`, `summary`, `payload`, `occurredAt`); `{ roomId:1, _id:-1 }` index (declared by 6.2)
- [Source: architecture/core-architectural-decisions.md#Auth & Security] — all log endpoints enforce `roomId` isolation at the query level; never cross-room
- [Source: architecture/core-architectural-decisions.md#Implementation Sequence] — step 3: `log-service` … HTTP read API (`logReader`)
- [Source: architecture/core-architectural-decisions.md#ADR-3] — single `log-service`, two Lambdas (`logWriter` SNS + `logReader` HTTP)
- [Source: architecture/implementation-patterns-consistency-rules.md#API Routes, #Format Patterns, #API Responses — direct (no envelope), #Enforcement Summary] — `/logs` + `:logId` naming, camelCase query params, no-envelope, `{ message }` errors, `400`/`404`/`502` (never `500`)
- [Source: architecture/implementation-patterns-consistency-rules.md#Test Coverage Gate, #Backend Service File Structure, #Test co-location rule] — `log-service` reader coverage target, file structure, `<source>.test.ts` matching casing, 70% floor
- [Source: architecture/project-structure-boundaries.md] — `log-service/src/routes/logs.ts` is the `GET /logs` location; data ownership (`logEvents` owned solely by `log-service`); SAM `LogReaderFunction` HTTP route
- [Source: _bmad-output/project-context.md] — backend non-strict TS/NodeNext, service-boundary isolation, no cross-service HTTP, stable error shapes, 70% coverage floor, docs-in-same-change, scoped/minimal changes
- [backend/battle-service/src/app.ts](backend/battle-service/src/app.ts), [service.ts](backend/battle-service/src/service.ts), [app.test.ts](backend/battle-service/src/app.test.ts), [models/Battle.ts](backend/battle-service/src/models/Battle.ts), [lambda.ts](backend/battle-service/src/lambda.ts), [db.ts](backend/battle-service/src/db.ts) — analog read-API factory / DI model / supertest+mock-model test / `mongoose` singleton patterns to mirror
- [backend/room-notifications-service/src/db.ts](backend/room-notifications-service/src/db.ts) — identical `connectToMongo`/`export { mongoose }` singleton (6.2 copies this; 6.4 imports `mongoose` from the 6.2 copy)
- [backend/vitest.config.ts](backend/vitest.config.ts), [backend/package.json](backend/package.json) — verify Story 6.2 added `log-service` to `test.include`/`coverage.include`/`workspaces` (Task 0); not modified by 6.4

## Dev Agent Record

### Agent Model Used
GPT-5

### Debug Log References
- 2026-05-21: Verified Story 6.2 prerequisites: `backend/log-service/src/routes/logs.ts` skeleton existed with the Story 6.4 seam; `LogEvent` exports `LogEvent`, declares `{ roomId: 1, _id: -1 }`, timestamps, and `_id`/`__v` JSON cleanup; `buildLogApp` mounts `logsRouter`; route data access uses `service.ts` functions over the `LogEvent` model.
- 2026-05-21: Confirmed `backend/vitest.config.ts` includes `log-service/src/**/*.test.ts` and `log-service/src/**/*.ts`, `backend/package.json` workspaces includes `log-service`, and SAM routes both `/logs` and `/logs/{logId}` to `LogReaderFunction`.
- 2026-05-21: Installed backend workspace dependencies with `npm install` because `vitest` was missing in the worktree; no dependency versions or lockfile content changed.
- 2026-05-21: Validation commands from `backend/`: `npm test -- log-service/src/routes/logs.test.ts` passed (13 tests); `npm test` passed (27 files, 174 tests); `npm run test:coverage` passed (all files 86.7% lines; `log-service/src/routes/logs.ts` 95% lines); `npm run typecheck` passed.

### Completion Notes List
- Implemented the `GET /logs` paginated reader over the Story 6.2 `service.ts` seam: roomId-required filter, `_id` `$lt` exclusive cursor, `_id` descending sort, default `limit=50`, max `limit=100`, and `400` validation before any Mongo query.
- Added the architecture-deferred `GET /logs/:logId?roomId=X` detail endpoint with strict `{ _id, roomId }` lookup, `400` validation, `404` miss/cross-room behavior, direct resource response, and app-level `502 { message: 'Unexpected error' }` propagation for unexpected failures.
- Kept Story 6.2-owned model/index/SAM/workspace wiring intact; 6.4 consumes `LogEvent` and does not redefine the `{ roomId: 1, _id: -1 }` index.
- Preserved the bare-array list contract for Story 6.5: the next cursor is the last returned entry's `id`; a short or empty array means end-of-history. No `nextCursor` or `hasMore` envelope fields were added.
- Updated `backend/README.md` with the real log reader list/detail contract and client-derived cursor rule.

### File List
- backend/log-service/src/service.ts
- backend/log-service/src/routes/logs.ts
- backend/log-service/src/routes/logs.test.ts
- backend/README.md
- _bmad-output/implementation-artifacts/6-4-room-history-api-returns-paginated-events.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log
- 2026-05-21: Implemented room history paginated reader and detail endpoint; added reader tests and docs; marked story ready for review.

### Review Findings

_Code review 2026-05-21 (bmad-code-review, 3 layers: Blind Hunter / Edge Case Hunter / Acceptance Auditor). All 11 ACs verified satisfied; Scope Guard clean; 4 documented variances followed. No Critical/High findings._

- [x] [Review][Patch] `before`/`logId` accept 12-char non-hex strings — `mongoose.Types.ObjectId.isValid()` returns `true` for any 12-char string (treated as a 12-byte buffer), so a non-24-hex `before` or `:logId` passes validation, is silently coerced to a different ObjectId, and yields `200`/`404` instead of the AC7-mandated `400` for a non-24-hex cursor. Tighten to a 24-hex check (`/^[a-f\d]{24}$/i`). Low practical impact (real cursors are always 24-hex). [backend/log-service/src/routes/logs.ts:56, backend/log-service/src/routes/logs.ts:81]
- [x] [Review][Patch] No regression test for NoSQL-operator-shaped `roomId` — `?roomId[$ne]=` makes `qs` parse `request.query.roomId` into an object; the `typeof === 'string'` guard rejects it with `400` (roomId isolation stays intact), but this security boundary has no test. Add a test asserting operator-shaped `roomId` → `400` with the data layer never invoked. [backend/log-service/src/routes/logs.test.ts]
- [x] [Review][Patch] `toLogEventResource` has an unreachable fallback branch — the `{ ...document }` path and `json.id ?? json._id` / `String(id)` exist for non-Mongoose inputs that never occur (`find`/`findOne` always return hydrated docs with the `toJSON` `id` virtual); the dead path can produce `id: 'undefined'`. Simplify to assume a Mongoose document. [backend/log-service/src/service.ts:65]
- [x] [Review][Patch] List & detail tests assert resource shape with `objectContaining` — AC1 enumerates the exact entry field set, but `objectContaining` only proves fields are present, not that no extra fields leak. Tighten the list and detail body assertions to `toEqual`. [backend/log-service/src/routes/logs.test.ts:73, backend/log-service/src/routes/logs.test.ts:177]
