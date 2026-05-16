# Story 5.1: Start a Battle

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to create a battle for my room when no battle is active,
so that the group has a shared battle state to use for the current encounter.

This is the **foundational story of Epic 5 (Battle Management)**. It introduces a brand-new
`battle-service` microservice, the `battles` collection, the battle HTTP contract, and the
frontend battle API/hook/Battle-View skeleton. Subsequent stories build on this seam:
5.2 (Room View active-battle banner), 5.3 (manage battle state — PATCH), 5.4 (realtime
battle events), 5.6 (conclude), 5.7 (discard).

## Acceptance Criteria

1. **Create when none active.** Given no battle is currently active in the room, when I start a battle from the Room View, then a new battle is created for that room with `status: 'active'`; the battle can include a user-provided `name` or fall back to a generated default; and only one active battle is allowed per room.
2. **No second active battle.** Given a battle is already active in the room, when I attempt to start another, then the app does not create a second active battle and I am routed to the existing active battle instead (HTTP `409` on the create attempt; the client recovers by navigating to the existing battle).
3. **Battle View opens with state loaded.** Given a battle has been created successfully, when creation completes, then the Battle View opens with the active battle state loaded, and the active battle can be retrieved by room using the active-battle query contract (`GET /battles?roomId=X&status=active`).

## Scope Boundaries (READ FIRST — prevents over-build and regressions)

**IN scope for 5.1:**
- New `backend/battle-service` scaffolded from `character-service`.
- `Battle` Mongoose model + indexes (full schema defined now; only `name`/`playerSide`/`monsterSide`/`status` written by this story's endpoints).
- `POST /battles` (create; `409` if an active battle already exists for the room).
- `GET /battles?roomId=X&status=active` (active-battle query; returns the battle or JSON `null`).
- Local + cloud wiring for the new service (docker-compose, nginx, SAM, workspaces, vitest, .env, README).
- Frontend: `api/battles.ts`, `hooks/useRoomBattle.ts` (HTTP-on-mount only), `hooks/useBattleActions.ts` (only `start`), `(battle)/index.tsx` Battle View that **loads and displays** the active battle, and a minimal Room View entry point that starts a battle / routes to the existing one.

**OUT of scope (explicitly owned by later stories — do NOT build here):**
- ❌ Realtime/event publishing of `battle_started` and WebSocket fan-out → **Story 5.4**. Do not wire SNS/Redis publishing, do not modify `room-notifications-service`, do not extend `RoomWebSocketClient`, do not add SNS topics/IAM publish in SAM. (Provide only a no-op publisher seam — see Technical Requirements.) None of the 5.1 ACs require realtime.
- ❌ `ActiveBattleBanner` and the rich Room View battle indicator → **Story 5.2**. 5.1 only needs the minimal entry point to satisfy AC1–AC3.
- ❌ Managing players/monsters/bonuses inside the battle (`PATCH /battles/:id`) → **Story 5.3**. Battle View in 5.1 is a load-and-display skeleton.
- ❌ `PATCH` / `POST /conclude` / `DELETE` endpoints and their `useBattleActions` methods → Stories 5.3 / 5.6 / 5.7.
- ❌ `log-service` and `LOG_TOPIC_ARN` wiring → **Epic 6**. Do not create a log SNS topic or LogEvents model in this story.

## Tasks / Subtasks

- [ ] **Task 1 — Scaffold `backend/battle-service` from `character-service`** (AC: 1, 2, 3)
  - [ ] Create `backend/battle-service/` mirroring `backend/character-service/` structure: `package.json` (name `battle-service`, same scripts/deps incl. `@aws-sdk/client-sns`, `@codegenie/serverless-express`, `express`, `mongoose`, `redis`, `tsx`), `tsconfig.json` (identical: `NodeNext`, `strict: false`), `Dockerfile` (base `node:20-alpine`, `EXPOSE 8086`, `CMD ["npm","start"]`).
  - [ ] `src/db.ts` — copy verbatim (shared mongoose connect-once helper).
  - [ ] `src/app.ts` — `createApp(battleModel, options)` Express factory: `cors()`, `morgan('dev')`, `express.json()`, the `routePrefix` strip middleware (copy from character-service `normalizeRoutePrefix` + middleware), `GET /health` returning `{ service: 'battle-service', status: 'ok' }`, plus battle routes (Task 3). Keep endpoints **inline in `app.ts`** (the existing repo convention — `character-service` has no `routes/` folder; do not introduce one despite the architecture diagram).
  - [ ] `src/service.ts` — `createBattleModel(): BattleModelLike` wrapping the Mongoose `Battle` model, and `buildBattleApp(options)` calling `createApp` (mirror `character-service/src/service.ts`).
  - [ ] `src/index.ts` (local entry) and `src/lambda.ts` (`serverlessExpress` handler) mirroring character-service, reading the env vars in Task 6.
  - [ ] **Error handler MUST return `502`** for unexpected errors with body `{ message: 'Unexpected error' }` — do NOT copy character-service's `res.status(500).json({ message, details })` handler. (Architecture rule: never `500` in Lambda; error body is `{ message: string }` only, no `details`.) [Source: architecture/implementation-patterns-consistency-rules.md#http-status-codes, #error-handling-backend]

- [ ] **Task 2 — `Battle` Mongoose model + indexes** (AC: 1, 2)
  - [ ] `src/models/Battle.ts` with the full schema below. Embedded `BonusItem { id: string; value: number }` and `MonsterItem { id: string; name: string; level: number }` subdocuments.
  - [ ] Schema options: `{ timestamps: true, toJSON: { virtuals: true, transform: (_, ret) => { delete ret._id; delete ret.__v; } } }` so the API exposes `id`, never raw `_id`/`__v`. (Architecture mandates the explicit toJSON transform — note `character-service` relies on the virtual `id` only; follow the architecture here.)
  - [ ] Indexes:
    - `{ roomId: 1, status: 1 }` **unique partial index**: `{ unique: true, partialFilterExpression: { status: 'active' } }` — DB-level guarantee of one active battle per room.
    - `{ roomId: 1, createdAt: -1 }` — for future history queries (define now, harmless).
  - [ ] Model name `'Battle'`, collection resolves to `battles` (camelCase plural). Field names camelCase.

- [ ] **Task 3 — `POST /battles` create endpoint** (AC: 1, 2)
  - [ ] Validate body: `roomId` required non-empty string → `400 { message }` if missing. `name` optional: accept a non-empty string or treat absent/empty as `null`.
  - [ ] Pre-check: query for an existing `status: 'active'` battle for `roomId`. If found → respond `409 { message: 'A battle is already active for this room' }` and include the existing battle id so the client can route to it (e.g. `{ message, activeBattleId }`). [decision: see Dev Notes "GET/409 response shapes"]
  - [ ] Create the battle: `{ roomId, name: name ?? null, status: 'active', playerSide: { characterIds: [], bonuses: [] }, monsterSide: { monsters: [], bonuses: [] }, result: null }`. (Empty sides; populating them is Story 5.3.)
  - [ ] Wrap `Battle.create` so a Mongo duplicate-key error (`code === 11000`, from the partial unique index — concurrent double-start race) is mapped to the **same `409`** as the pre-check, NOT a `502`.
  - [ ] On success respond `201` with the battle JSON (direct resource, no envelope).
  - [ ] Call the no-op publisher seam (Task 7) inside a `try/catch` that logs but never throws — mirrors character-service's `publisher.publish(...)` placement. Publish payload/transport itself is **Story 5.4**; here it is a no-op.

- [ ] **Task 4 — `GET /battles?roomId=X&status=active` active-battle query** (AC: 2, 3)
  - [ ] Validate `roomId` query param present → `400 { message }` if missing.
  - [ ] Find the single `status: 'active'` battle for `roomId`.
  - [ ] If found → `200` with the battle JSON. If none → `200` with JSON body `null` (Content-Type `application/json`). **Do not return `404`** — the frontend `apiRequest` throws `ApiError` on non-2xx, and `getActiveBattle` must resolve to `Battle | null`. [Source: frontend/api/http.ts behavior]
  - [ ] (For 5.1 only `status=active` needs handling; ignore other `status` values gracefully.)

- [ ] **Task 5 — Backend local + cloud wiring** (AC: 1, 2, 3)
  - [ ] `backend/package.json`: add `battle-service` to `workspaces`; add it to the `dev`, `start`, and `typecheck` concurrently scripts (mirror the character-service entries).
  - [ ] `backend/vitest.config.ts`: add `battle-service/src/**/*.test.ts` to `test.include` and `battle-service/src/**/*.ts` to `coverage.include` (the 70% gate ignores the service otherwise). Keep the existing root-config pattern — do **not** add a per-service `vitest.config.ts` (character-service has none; follow the repo, not the architecture diagram).
  - [ ] `backend/docker-compose.local.yml`: add `battle-service` (build `./battle-service`, port `8086:8086`, env per Task 6, `depends_on: [mongo-battle, redis]`) and `mongo-battle` (`image: mongo:7`, `27024:27017`, volume `mongo-battle-data`); register the volume.
  - [ ] `backend/nginx/nginx.conf`: add `upstream battle_service { server battle-service:8086; }` and a `location /battles { ... }` block that **mirrors the full `/characters` block** (OPTIONS CORS preflight `return 204`, the `proxy_set_header` lines, `proxy_hide_header` + `add_header ... always` CORS, `proxy_pass http://battle_service;`). Do not use the simplified one-line snippet from the architecture doc.
  - [ ] `backend/sam/template.yaml`: add a `BattleMongoUri` parameter; add `BattleServiceRole` (basic execution + XRay, **no SNS publish policy in 5.1**); add `BattleServiceFunction` (`CodeUri: ../battle-service`, `Handler: lambda.handler`, esbuild `Metadata` block copied from CharacterServiceFunction, env `BATTLE_MONGO_URI` + `ROUTE_PREFIX`) with HttpApi events for `POST /battles` and `GET /battles`. Update the template `Description`. Do **not** add an SNS topic or `LOG_TOPIC_ARN`.
  - [ ] `backend/sam/events/battle-post-battles.json`: new HttpApi `POST /battles` test event (model on `sam/events/user-post-users.json` envelope).
  - [ ] `backend/.env.example`: add `BATTLE_SERVICE_PORT`/`PORT` (whichever `index.ts` reads — keep consistent), `BATTLE_MONGO_URI=mongodb://localhost:27024/munch_battle_service`, and a `BATTLE_SERVICE_URL` line consistent with the existing block.
  - [ ] `backend/README.md`: document the new service, its port, and endpoints (project rule: update docs when config/behavior changes).

- [ ] **Task 6 — Battle-service environment variables** (AC: 1)
  - [ ] Use these names (architecture-mandated, `ALL_CAPS_SNAKE_CASE`), and make `index.ts`/`lambda.ts`/compose/.env/SAM all agree on the exact same names: `BATTLE_MONGO_URI`, `PORT` (local listen port — default `8086`), `ROUTE_PREFIX` (lambda). **Do not** reuse character-service's `CHARACTER_*` names. [Source: architecture/project-structure-boundaries.md#new-backend-services, implementation-patterns-consistency-rules.md#backend-code]
  - [ ] Provide sane defaults so the service boots locally without a `.env` (mirror character-service: `mongodb://localhost:27024/munch_battle_service`, port `8086`).

- [ ] **Task 7 — No-op publisher seam (placeholder only)** (AC: 1)
  - [ ] Add `src/publisher.ts` exporting a `BattleEventPublisher` interface and a `NoopBattleEventPublisher` (logs and returns) — copy the *shape* of `character-service`'s Noop publisher. Default the app to the Noop publisher.
  - [ ] Do **not** implement SNS/Redis publishers, dual-topic fan-out, or payload contracts here — that is Story 5.4. The seam exists only so the create handler has a stable `publisher.publish(...)` call site.

- [ ] **Task 8 — Frontend `api/battles.ts`** (AC: 1, 2, 3)
  - [ ] Use `apiRequest` from `@/api/http` only (never raw fetch/axios). Export TS types: `Battle`, `BonusItem`, `MonsterItem`, `BattleStatus = 'active'|'concluded'|'discarded'`, `BattleResult = 'players_win'|'monster_wins'`, `StartBattlePayload = { roomId: string; name?: string | null }`.
  - [ ] `startBattle(payload: StartBattlePayload): Promise<Battle>` → `POST /battles` (body the payload). Surface the `409` distinctly (it carries `activeBattleId`) so callers can route to the existing battle — see `ApiError` (`status`, `details`) in `@/api/http`.
  - [ ] `getActiveBattle(roomId: string, signal?: AbortSignal): Promise<Battle | null>` → `GET /battles?roomId=${encodeURIComponent(roomId)}&status=active`; pass `{ signal }`; return `null` when the body is `null`.

- [ ] **Task 9 — Frontend `hooks/useRoomBattle.ts`** (AC: 2, 3)
  - [ ] Mirror the **structure** of `frontend/hooks/useCharacters.ts` (`useRoomCharacters`) but HTTP-only. Use TanStack Query `useQuery` with key `['battle', roomId]`, `queryFn` calling `getActiveBattle(roomId, signal)`, `enabled: Boolean(roomId)`.
  - [ ] Return shape: `{ battle: Battle | null; isLoading: boolean; errorMessage: string | null; refresh: () => Promise<void> }` (`refresh` = `queryClient.invalidateQueries`/`refetch`). 
  - [ ] **No WebSocket subscription** in this hook (battle `battle_*` WS handling is Story 5.4). Do not touch `frontend/api/webSocket.ts` / `useRoomWebSocket`.

- [ ] **Task 10 — Frontend `hooks/useBattleActions.ts`** (AC: 1, 2)
  - [ ] `useBattleActions(roomId)` returning `{ start, isLoading, errorMessage }` only. `start(payload)` = `useMutation` calling `startBattle`, invalidating `['battle', roomId]` on settle. (Do not pre-stub `patch`/`conclude`/`discard` — later stories add them; project rule: no half-finished implementations.)

- [ ] **Task 11 — Battle View modal route `(battle)/index.tsx`** (AC: 3)
  - [ ] Create `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx`. Read `roomNumber` via `useLocalSearchParams`, resolve `roomId`, call `useRoomBattle(roomId)`.
  - [ ] Render: loading state; error state; and the loaded battle's identity/status — battle `name` (or a generated default label when `name` is `null`, see Dev Notes) and `status`, plus placeholder Player Side / Monster Side sections (empty in 5.1; populated in 5.3). All styling via `AppTheme` tokens (`@/constants/theme`) — no hardcoded hex/px/font sizes.
  - [ ] Present as a **modal** so Room View stays in the navigation stack (ADR-4). There is no `_layout.tsx` under `[roomNumber]/` today and existing modals live at `app/munchkin/modal-*.tsx`; add the minimal layout/Stack.Screen config needed for `presentation: 'modal'` on the `(battle)` group and verify back-navigation returns to Room View without refetching room state.

- [ ] **Task 12 — Room View entry point** (AC: 1, 2, 3)
  - [ ] In `frontend/app/munchkin/[roomNumber]/index.tsx`, wire the existing hidden placeholder **Battle** button (currently `style={[styles.battleButton, { opacity: 0 }]}` near the action buttons) to be visible and functional. Keep changes minimal — the rich `ActiveBattleBanner` is Story 5.2.
  - [ ] Use `useRoomBattle(roomId)` to know if an active battle exists. On press:
    - If `battle !== null` → `router.push` to the `(battle)` route for this room (AC2: route to existing).
    - If `battle === null` → call `useBattleActions().start({ roomId })`; on success `router.push` to the `(battle)` route (AC1, AC3); on `409` (race: another player just started) → refresh `useRoomBattle` and navigate to the now-existing battle instead of surfacing an error.
  - [ ] Surface other errors via the screen's existing inline error pattern (see how Room View handles `actionError` for character create).

- [ ] **Task 13 — Tests** (AC: 1, 2, 3)
  - [ ] Backend (co-located, `<source>.test.ts`, run by root `backend/vitest.config.ts`): `src/app.test.ts` (or `service.test.ts`) using `supertest` — success path: `POST /battles` creates an active battle (`201`, correct shape, `id` not `_id`); failure path: second `POST` for same room → `409`; `GET ...status=active` returns the battle then `null` after none; validation `400` for missing `roomId`; unexpected error → `502`. Cover the duplicate-key→409 mapping. Model-file tests are excluded from coverage by config, so assert the unique-active behavior through the route/service tests.
  - [ ] Frontend (co-located, Vitest+jsdom; coverage scope = `api/**`,`hooks/**`): `api/battles.test.ts` (mock `@/api/http`; assert URL/encoding, `null` handling, `409` surfacing), `hooks/useRoomBattle.test.ts` and `hooks/useBattleActions.test.ts` (wrap in `QueryClientProvider`, mock the api module). Route/screen behavior tests for Battle View + Room View entry point go under `frontend/__tests__/app/...` (NOT inside `frontend/app`), mocking `expo-router` and the battle hooks.
  - [ ] Meet the 70% line coverage floor for both pipelines; assert behavior/contracts, not internals.

- [ ] **Task 14 — Cross-surface verification** (AC: 1, 2, 3)
  - [ ] Backend: `npm run typecheck` and `npm test`/`test:coverage` from `backend/` pass with battle-service included.
  - [ ] Frontend: typecheck + `vitest run --coverage` pass.
  - [ ] Local manual smoke (docker-compose up): create room → from Room View tap Battle → battle created, Battle View opens with loaded state; tap Battle again from Room View → routes to the same battle (no duplicate); confirm `GET /battles?roomId=X&status=active` returns it. Verify on web at minimum; note any platform not verified.

## Dev Notes

### ⚠️ Critical conflict — architecture doc vs. actual repo (read before wiring events)

The architecture documents (`core-architectural-decisions.md`, `implementation-patterns-consistency-rules.md`) describe an **idealized** event/topic model that does **not** match the running codebase:

| Architecture doc says | Actual repo (verified) |
|---|---|
| `NOTIFICATIONS_TOPIC_ARN`, topic "RoomNotificationsTopic" | SNS topic resource is `RoomCharacterEventsTopic`; env var `ROOM_CHARACTER_EVENTS_TOPIC_ARN` |
| Redis channel `room_notifications` | Channel `room-character-events` (env `ROOM_CHARACTER_EVENTS_CHANNEL`) |
| Event payload `{ eventType, roomId, actorId, occurredAt, ... }` | Producer/consumer use `{ event, roomId, event_body: { characterId }, emittedAt, correlationId }` (see `character-service/src/publisher.ts`, `frontend/api/webSocket.ts` `isValidNotificationEvent`) |
| `routes/<x>.ts` folder per service | Endpoints inline in `src/app.ts`; only `models/` is a subfolder |
| per-service `vitest.config.ts` | Single root `backend/vitest.config.ts` + npm workspaces |
| Lambda errors → `502` | `character-service/src/app.ts` actually returns `500` (an existing inconsistency) |

**For 5.1 this conflict is contained because event publishing is OUT of scope (Story 5.4).** Do NOT attempt to reconcile event contracts, rename the existing SNS topic, or modify `room-notifications-service`/`webSocket.ts` here — doing so would risk regressing the working character realtime flow (project rule: "Do not change event names or event payload contracts for notifications without coordinated producer/consumer updates"). When in doubt, follow the **actual repo conventions**; follow the architecture only for net-new battle-specific decisions (schema, indexes, status codes, HTTP contract, query keys, file/route names) where there is no existing pattern to conflict with.

### Battle schema (authoritative for the model)

```typescript
// MongoDB collection: battles
{
  _id: ObjectId,                         // aliased to id via toJSON; never exposed raw
  roomId: string,                        // required, indexed
  name: string | null,                   // optional battle label (nullable)
  status: 'active' | 'concluded' | 'discarded',
  playerSide: { characterIds: string[]; bonuses: BonusItem[] },
  monsterSide: { monsters: MonsterItem[]; bonuses: BonusItem[] },
  result: 'players_win' | 'monster_wins' | null,
  createdAt: Date, concludedAt: Date | null, updatedAt: Date  // timestamps:true manages createdAt/updatedAt
}
type BonusItem  = { id: string; value: number }   // signed int
type MonsterItem = { id: string; name: string; level: number }
```
For 5.1, new battles are created with empty `playerSide`/`monsterSide` and `result: null`; `concludedAt: null`. [Source: architecture/core-architectural-decisions.md#battle-schema, #adr-summary ADR-1, ADR-13, ADR-14]

### GET / 409 response shapes (decisions to lock in)
- `GET /battles?roomId=X&status=active`: `200` + battle JSON when active exists; `200` + literal JSON `null` when none. Never `404` (frontend `apiRequest` throws on non-2xx; `getActiveBattle` must resolve `Battle | null`).
- `POST /battles` duplicate: `409` with `{ message, activeBattleId }`. The extra `activeBattleId` is an additive, non-breaking field that lets the Room View route the user to the existing battle (AC2) without a second round-trip. Frontend reads it from `ApiError.details`.
- All error bodies are `{ message: string }` (plus the additive `activeBattleId` on the create-409). No `{ error: {...} }`, no `details` from the generic 502 handler. [Source: architecture/implementation-patterns-consistency-rules.md#error-responses, #http-status-codes]

### Battle "generated default name" (AC1)
Schema `name` is nullable (ADR-13). Treat the "generated default name" as a **presentational** concern: the server stores the user-provided string or `null`; the Battle View renders a default label (e.g. `"Battle"` or a creation-time-based label) when `name` is `null`. This keeps the contract simple and matches the nullable schema. If the product intent is server-generated persisted default names instead, raise it (see Questions) — but absent that, do not invent a server-side name generator.

### Files to create / modify (exact paths)

NEW (backend): `backend/battle-service/{package.json,tsconfig.json,Dockerfile}`, `backend/battle-service/src/{app.ts,index.ts,lambda.ts,db.ts,service.ts,publisher.ts}`, `backend/battle-service/src/models/Battle.ts`, co-located `*.test.ts`, `backend/sam/events/battle-post-battles.json`.
MODIFY (backend): `backend/package.json`, `backend/vitest.config.ts`, `backend/docker-compose.local.yml`, `backend/nginx/nginx.conf`, `backend/sam/template.yaml`, `backend/.env.example`, `backend/README.md`.
NEW (frontend): `frontend/api/battles.ts`, `frontend/hooks/useRoomBattle.ts`, `frontend/hooks/useBattleActions.ts`, `frontend/app/munchkin/[roomNumber]/(battle)/index.tsx` (+ minimal layout for modal presentation if required), co-located `*.test.ts`, route tests under `frontend/__tests__/app/...`.
MODIFY (frontend): `frontend/app/munchkin/[roomNumber]/index.tsx` (wire Battle button only).

### Existing patterns to mirror (do not reinvent)
- Backend service scaffold: `backend/character-service/src/{app.ts,service.ts,index.ts,lambda.ts,db.ts,models/Character.ts}` — copy structure, the `normalizeRoutePrefix` + prefix-strip middleware, the connect-once `db.ts`, and the `service.ts` model-wrapper + `buildXApp` pattern. Diverge only where noted (502 not 500; `{message}` not `{message,details}`; explicit toJSON transform).
- Backend tests: `backend/character-service/src/app.test.ts` style with `supertest`.
- Frontend HTTP client: `frontend/api/http.ts` `apiRequest<T>(path, { method, body, signal, retryCount })`; `ApiError { status, details }`; retries 408/429/≥500; parses JSON by content-type. Mirror `frontend/api/characters.ts` (`getCharactersByRoom`, `createCharacter`) for the api module shape.
- Frontend data hook: `frontend/hooks/useCharacters.ts` (`useRoomCharacters`) — TanStack Query key `['characters', roomId]`; copy the query/refresh structure (omit the WS + optimistic-mutation machinery for 5.1's read hook). QueryClient is provided in `frontend/app/_layout.tsx` (`staleTime 15s`, `retry 1`).
- Query key convention: `['battle', roomId]` (and future `['logs', roomId]`). Never invent custom key shapes. [Source: architecture/implementation-patterns-consistency-rules.md#tanstack-query-key-convention]
- Theme: `frontend/constants/theme.ts` `AppTheme.{colors,spacing,radius,typography}`. Existing modal screens to reference for presentation: `frontend/app/munchkin/modal-create-character.tsx`, `modal-change-caracter.tsx`.
- Routing prerequisite is already satisfied: Story 3.2 migrated `[roomNumber].tsx` → `[roomNumber]/index.tsx` (directory route exists; nested routes supported). No further structural migration needed.

### Project Structure Notes
- Backend services are isolated bounded contexts; `battle-service` owns the `battles` collection exclusively — no other service reads/writes it; no synchronous inter-service HTTP. [Source: architecture/project-structure-boundaries.md#data-ownership, #service-communication]
- Backend TS is non-strict (`strict: false`, `NodeNext`); frontend TS is strict. Do not normalize one to the other. Keep imports external-first then internal; no circular deps. [Source: project-context.md]
- Naming: collection/fields camelCase; model file `Battle.ts` (PascalCase); api module `battles.ts`/hooks `useRoomBattle.ts` (camelCase); event-type strings (when later added) snake_case. [Source: architecture/implementation-patterns-consistency-rules.md#naming-patterns]
- Test casing mirrors source exactly (`Battle.test.ts`, not `battle.test.ts`); co-located, never in a separate `__tests__` folder for backend; frontend route tests MUST live in `frontend/__tests__` (Expo Router forbids non-route files under `frontend/app`). [Source: project-context.md testing rules]
- Definition of done: every touched surface (backend, frontend, infra) passes its own typecheck/test/coverage gate; coverage 70% floor is a CI hard gate; assert behavior, not coverage padding.

### Previous-work intelligence (cross-epic, no prior story in Epic 5)
Story 5.1 is the first in Epic 5, so there is no in-epic predecessor. Patterns established by completed Epics 1–4 that this story builds on: the `apiRequest`/`ApiError` HTTP utility, TanStack Query-based room hooks (`useRoomCharacters`), the `RoomWebSocketClient`/`useRoomWebSocket` realtime layer (consumed later in 5.4, not here), the AppTheme token system (migration completed in Story 3.1), and the `[roomNumber]/index.tsx` directory route (Story 3.2). Recent git history (Epic 4/7: reconnection/session-restore, release pipelines) shows the team's convention of one focused PR per story with both surfaces' quality gates green — keep this change scoped to Battle "start" only.

### References
- [Source: _bmad-output/planning-artifacts/epics/epic-5-battle-management.md#story-51-start-a-battle]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#battle-schema] (schema, indexes, API design, ADRs 1/4/13/14/15/16)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md] (naming, response/error format, HTTP status codes, query keys, test co-location)
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md] (battle-service structure, data ownership, infra changes)
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR20, #FR21, #FR28] (initiate/name/continue active battle)
- [Source: backend/character-service/src/*] (scaffold reference)
- [Source: frontend/api/http.ts, frontend/api/characters.ts, frontend/hooks/useCharacters.ts, frontend/constants/theme.ts] (frontend patterns)
- [Source: backend/{package.json,vitest.config.ts,docker-compose.local.yml,nginx/nginx.conf,sam/template.yaml,.env.example}] (wiring touchpoints)
- [Source: _bmad-output/project-context.md] (all critical implementation rules)

### Open Questions (for product/Ivan — non-blocking; sensible defaults assumed above)
1. "Generated default name": assumed presentational (server stores `null`, UI shows a default label). Confirm, or specify a server-side persisted default format if required.
2. AC2 routing on `409`: assumed the create-409 returns `activeBattleId` so the client can navigate to the existing battle. Confirm this additive field is acceptable, or prefer the client re-query `GET ...status=active` then navigate.
3. Battle View modal presentation: assumed an Expo Router modal group `(battle)` with `presentation: 'modal'` keeping Room View in-stack (ADR-4). Confirm modal vs. full-screen push is the desired UX for 5.1's skeleton.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
