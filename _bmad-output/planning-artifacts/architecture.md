---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-24T23:19:52.000Z'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/project-context.md'
  - 'docs/index.md'
  - 'docs/project-overview.md'
  - 'docs/architecture-backend.md'
  - 'docs/architecture-frontend.md'
  - 'docs/architecture-infrastructure.md'
  - 'docs/integration-architecture.md'
  - 'docs/data-models-backend.md'
  - 'docs/api-contracts-backend.md'
  - 'docs/descriptions/MunchHelper.md'
  - 'docs/descriptions/MunchHelper/Backend Services.md'
  - 'docs/descriptions/MunchHelper/Backend Services/Character Management.md'
  - 'docs/descriptions/MunchHelper/Backend Services/Room Management.md'
  - 'docs/descriptions/MunchHelper/Backend Services/Room Notifications.md'
  - 'docs/descriptions/MunchHelper/Backend Services/User Management.md'
  - 'docs/descriptions/MunchHelper/Frontend.md'
  - 'docs/openapi/openapi.yaml'
  - 'docs/openapi/paths/*'
  - 'docs/openapi/schemas/*'
  - 'docs/openapi/parameters/*'
workflowType: 'architecture'
project_name: 'munch-helper'
user_name: 'Ivan'
date: '2026-03-23T22:04:03.765Z'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
48 FRs across 8 capability areas. The two new first-class capabilities driving the majority of architectural decisions are Battle Management (FR20–28) and Session History & Logs (FR29–34). The remaining FRs address stabilization and recovery of the existing room/character/realtime loop or define release-readiness gates.

**Non-Functional Requirements:**
- Performance: room entry < 3s, character/battle/log interactions < 2s, reconnect recovery < 5s
- Reliability: room, character, battle, and log state must survive disconnections without duplication or corruption
- Cross-platform: iOS, Android, and web must reach parity on all core session flows
- Security: data in transit and at rest; no cross-room data leakage; no unnecessary device permissions
- Accessibility: WCAG AA minimum; 44×44pt touch targets; no color-only encoding
- Cost: $150/month operational ceiling — serverless-first architecture preserved
- Test coverage: 70% line coverage floor maintained across all touched surfaces

**Scale & Complexity:**
- Primary domain: Mobile-first full-stack (Expo/React Native + Node.js Lambda microservices)
- Complexity level: Medium (low domain complexity + medium technical complexity from realtime + serverless + multi-platform + brownfield)
- Estimated architectural components: 2 new backend services (battle-service, log-service), 2 new frontend screens (Battle View, Log View), 1 enhanced screen (Room View), new WebSocket event types

### Technical Constraints & Dependencies

- Brownfield service boundaries preserved: user-service, room-service, character-service, room-notifications-service — no inter-service data layer coupling
- Serverless constraint: Lambda means no in-memory shared state; all transient session state (including in-progress battle state) must be DB-persisted
- WebSocket event contract: battle lifecycle events must use the same SNS/Redis → room-notifications fanout schema pattern as character events
- Cost ceiling: $150/month — new services must use existing serverless/managed-service cost profile without adding new paid managed services
- TypeScript strictness split: frontend is strict; backend services are non-strict
- Test coverage floor: 70% maintained; new endpoints require success-path + failure-path tests
- Expo compatibility set lock: Expo 55 / React Native 0.83 / React 19.2

### Cross-Cutting Concerns Identified

1. **Realtime event propagation** — Battle state changes need to surface on all connected clients via `battle_started`, `battle_updated`, `battle_concluded`, `battle_discarded` events through the existing SNS/Redis fanout pipeline
2. **Serverless persistence for multi-step operations** — Battle creation/conclusion are multi-step; rollback logic must mirror the room creation rollback pattern
3. **Optimistic UI updates** — Battle interactions must follow the TanStack Query optimistic update + reconcile pattern established for characters
4. **Cross-platform rendering parity** — Battle View and Log View must work on iOS, Android, and web; expo-specific primitives have graceful web fallbacks
5. **Data model extension** — Battle schema (roomId, name, sides, modifiers, status, outcome, timestamps) and Log schema (eventType, roomId, actorId, summary, payload, occurredAt) align with existing MongoDB/Mongoose service patterns
6. **Idempotency and deduplication** — One active battle per room enforced at service level (409 Conflict); late-joining players query current battle state, not reconstruct from events
7. **Error handling consistency** — Battle and log endpoints follow existing 400/404/502 response contracts
8. **Design token consolidation** — Migrate hardcoded hex values in existing components to AppTheme tokens before building new screens (prerequisite task)

### Architectural Decisions Confirmed in Context Phase


| Decision | Rationale |
|---|---|
| `battle-service` — new independent Lambda microservice | Clean domain boundary, own MongoDB collection, own SNS topic, no synchronous dependencies on other services |
| `log-service` — SNS/Redis aggregator | Subscribes to character + battle topics; unified history interface; thin event schema with pre-rendered summaries |
| `GET /battles?roomId=X&status=active` for live state | Keeps room-service clean; warm resume orchestration handled in frontend hook layer |
| One active battle per room (`409 Conflict` on duplicate) | Enforced at service level per UX spec constraint |
| Frontend: `battles.ts` + `logs.ts` API modules, `useRoomBattle` + `useRoomLogs` hooks | Mirrors existing `characters.ts` / `useRoomCharacters` pattern |

## Starter Template Evaluation

### Primary Technology Domain

Mobile-first full-stack — Expo/React Native frontend + Node.js Lambda microservices backend. Brownfield project with fully established stack. No external starter template applies.

### Starter Options Considered

All new services must follow the existing service patterns already established in the repository. Two distinct internal patterns serve as the reference bases.

### Selected Starter: Existing Service Patterns

**Rationale for Selection:**
Introducing an external scaffold would create structural divergence and violate project-context rules about service boundary consistency. The correct templates are the two existing services that most closely match the new services' structural needs.

**Initialization Approach:**
```bash
# battle-service  → copy character-service, adapt name/env/routes/SNS topic
# log-service     → copy room-notifications-service, strip WebSocket fan-out, add Mongoose
#                   write (SNS writer Lambda) + add HTTP read app (GET /logs?roomId=X)
```

**Architectural Decisions by Service:**

**`battle-service` — base: `character-service`**
- Entry points: `src/app.ts` (Express), `src/index.ts` (local server), `src/lambda.ts` (API Gateway Lambda)
- Domain files: `src/service.ts`, `src/models/Battle.ts`, `src/publisher.ts` (battle_* SNS events)
- Own MongoDB collection via `BATTLE_MONGO_URI`
- Own SNS topic for `battle_started`, `battle_updated`, `battle_concluded`, `battle_discarded`
- SAM template: single HTTP API Lambda function

**`log-service` — base: `room-notifications-service` + `character-service` hybrid**
- Entry points: `src/subscriber.ts` (SNS-triggered Lambda — `SNSEvent → void`), `src/app.ts` (Express read API), `src/index.ts` (local Redis subscriber + HTTP server), `src/lambda-read.ts` (HTTP API Gateway Lambda)
- Domain files: `src/models/LogEvent.ts`
- Own MongoDB collection via `LOG_MONGO_URI`
- Subscribes to both character SNS topic and battle SNS topic
- SAM template: **two Lambda functions** — SNS trigger writer + HTTP API reader
- Local dev: Redis subscriber process + HTTP server

**Testing Structure:**
- `battle-service`: lifecycle state machine transitions (active → concluded → discarded) are the primary coverage target
- `log-service`: two independent test suites — SNS handler tests (mock SNSEvent, assert DB write) + HTTP handler tests (supertest, assert filtered roomId response)

## Core Architectural Decisions

### Data Architecture

#### Battle Schema

```typescript
// MongoDB collection: battles
{
  _id: ObjectId,                         // aliased to id in responses
  roomId: string,                        // required, indexed
  name: string | null,                   // optional battle label
  status: 'active' | 'concluded' | 'discarded',
  playerSide: {
    characterIds: string[],              // snapshot at battle start
    bonuses: BonusItem[]                 // distinct, removable
  },
  monsterSide: {
    monsters: MonsterItem[],             // first = main monster; subsequent = wandering
    bonuses: BonusItem[]                 // distinct, removable
  },
  result: 'players_win' | 'monster_wins' | null,
  createdAt: Date,
  concludedAt: Date | null,
  updatedAt: Date
}

type BonusItem  = { id: string; value: number }   // value is signed integer (+5, -10, etc.)
type MonsterItem = { id: string; name: string; level: number }
```

**Effective strength calculation:**
- Player effective strength: `sum(characters[].level)` + `sum(playerSide.bonuses[].value)`
- Monster effective strength: `sum(monsterSide.monsters[].level)` + `sum(monsterSide.bonuses[].value)`

**Indexes:**
- `{ roomId: 1, status: 1 }` — unique partial index: `{ partialFilterExpression: { status: 'active' } }` enforces one active battle per room
- `{ roomId: 1, createdAt: -1 }` — history queries

#### Log Schema

```typescript
// MongoDB collection: logevents
{
  _id: ObjectId,
  roomId: string,
  eventType: 'character_created' | 'character_updated' | 'character_deleted'
           | 'battle_started' | 'battle_concluded' | 'battle_discarded',
  actorId: string,                       // characterId or battleId
  summary: string,                       // pre-rendered display string (e.g. "Battle 'Dragon' concluded — players win")
  payload: Record<string, unknown>,      // raw event payload for drill-in
  occurredAt: Date
}
```

**Note:** `battle_updated` is NOT logged. The log captures lifecycle events only; intermediate battle state mutations (bonus/monster changes) are not persisted to the log.

**Indexes:**
- `{ roomId: 1, _id: -1 }` — compound cursor pagination index (primary query path)

### Auth & Security

No changes to authentication model. Anonymous UUID identity (`deviceId`) is preserved. All battle and log endpoints enforce `roomId` isolation at the query level — queries always include `WHERE roomId = :roomId` and are never cross-room.

### API Design

#### Battle API (`battle-service`)

```
POST   /battles                          Start battle (409 if active exists for roomId)
GET    /battles?roomId=X&status=active   Query active battle (warm resume / initial state)
PATCH  /battles/:id                      Full-replace update of name/playerSide/monsterSide
POST   /battles/:id/conclude             Dedicated conclude (requires result field)
DELETE /battles/:id                      Soft discard (sets status: 'discarded')
```

**PATCH semantics:** Client sends the complete updated `playerSide` and/or `monsterSide` objects. Server replaces arrays wholesale. Last-write-wins. Client generates `BonusItem.id` and `MonsterItem.id` as UUID v4 values for optimistic local state management.

**Status guard:** PATCH, DELETE, and `/conclude` all validate `status === 'active'` — return `409 Conflict` if not active.

**Conclude contract:**
```json
POST /battles/:id/conclude
{ "result": "players_win" | "monster_wins" }
```

#### Log API (`log-service`)

```
GET  /logs?roomId=X&limit=50&before=<_id>   Paginated room log (cursor via MongoDB _id)
GET  /logs/:logId                            Single log entry detail
```

**Pagination:** Cursor-based via MongoDB `_id` (not `occurredAt`). `before` param is the `_id` string of the last seen item. Consistent ordering via compound index `{ roomId: 1, _id: -1 }`.

### SNS Topic Architecture (Consumer-Owned)

A critical design principle: **SNS topics are owned by the consuming service**, not the publishing service.

```
room-notifications-service  →  owns  notifications SNS topic (ARN: NOTIFICATIONS_TOPIC_ARN)
log-service                 →  owns  log SNS topic            (ARN: LOG_TOPIC_ARN)

Publishers:
  character-service  →  publishes to NOTIFICATIONS_TOPIC_ARN + LOG_TOPIC_ARN
  battle-service     →  publishes to NOTIFICATIONS_TOPIC_ARN + LOG_TOPIC_ARN
```

`LOG_TOPIC_ARN` is a **required** environment variable in `character-service` and `battle-service`. Missing configuration logs a startup warning and causes log entries to be absent — treated as degraded mode, not a crash.

**Local dev (Redis Pub/Sub):** Same ownership pattern. `room-notifications-service` owns the notifications Redis channel; `log-service` owns the log Redis channel. Publishers subscribe both channels at startup.

**Event payload contract — all events must include:**
```json
{
  "eventType": "battle_started",
  "roomId": "...",              // MANDATORY in all event bodies
  "actorId": "...",
  "occurredAt": "ISO-8601",
  "...display context..."       // producer includes sufficient fields for log-service to render summary without HTTP calls
}
```

**Example — character_updated payload:**
```json
{
  "eventType": "character_updated",
  "roomId": "room-123",
  "actorId": "char-456",
  "characterName": "Thunderboot McGee",
  "changedFields": ["level"],
  "level": 7,
  "occurredAt": "2026-03-24T22:00:00.000Z"
}
```

### Frontend Architecture

#### New Files

```
frontend/api/battles.ts          HTTP client for battle-service endpoints
frontend/api/logs.ts             HTTP client for log-service endpoints
frontend/hooks/useRoomBattle.ts  HTTP-on-mount + WS subscription for active battle
frontend/hooks/useBattleActions.ts  PATCH / conclude / discard mutations
frontend/hooks/useRoomLogs.ts    Paginated log query with cursor state
```

#### Routing

```
app/munchkin/[roomNumber]/(battle)/index.tsx   Battle View — Expo Router modal group
app/munchkin/[roomNumber]/log.tsx              Log View
```

Battle View uses a modal group (`(battle)`) so Room View stays in the navigation stack behind it — back navigation returns to Room View without re-fetching room state.

#### Hook Pattern: `useRoomBattle(roomId)`

Mirrors `useRoomCharacters` exactly:
1. On mount: `GET /battles?roomId=X&status=active` — initial state load
2. WebSocket subscription: handles `battle_started`, `battle_updated`, `battle_concluded`, `battle_discarded` events
3. Returns: `{ battle: Battle | null, isLoading, error }`

Room View highlights the battle button / shows active battle indicator when `battle !== null`.

#### WebSocket Client Extension

`RoomWebSocketClient` extended with new `battle_*` event handlers only. Existing character event handlers are not modified. `battle_updated` WebSocket event is emitted by `room-notifications-service` for realtime UI sync (separate from log persistence — `battle_updated` is NOT logged but IS broadcast via WebSocket).

#### Warm Resume

On app cold start or reconnect → always navigate to Room View. Room View queries `useRoomBattle` on mount. If an active battle exists, Room View reflects this (highlighted button, active battle indicator). User taps the battle button to navigate to Battle View. No auto-navigation to Battle View.

#### Character Deleted During Active Battle

Frontend handles via `character_deleted` WebSocket event: removes character from Battle View display. No backend cascade. The battle record retains original `characterIds` for historical reference (concluded/discarded battles show who participated).

### Infrastructure

#### SAM Template Additions

```yaml
BattleServiceFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/lambda.handler
    Events:
      Api:
        Type: HttpApi
        Properties:
          Path: /battles/{proxy+}
          Method: ANY

LogWriterFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/subscriber.handler
    Events:
      SNSTrigger:
        Type: SNS
        Properties:
          Topic: !Ref LogTopic

LogReaderFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/lambda-read.handler
    Events:
      Api:
        Type: HttpApi
        Properties:
          Path: /logs/{proxy+}
          Method: ANY
```

#### IAM Policy Additions

- `battle-service`: `sns:Publish` on `NOTIFICATIONS_TOPIC_ARN` + `LOG_TOPIC_ARN`
- `character-service`: adds `sns:Publish` on `LOG_TOPIC_ARN` (additive to existing notifications publish)
- `log-service`: `sns:Subscribe` on `LOG_TOPIC_ARN`

#### Local Nginx

```nginx
location /battles { proxy_pass http://battle-service:3000; }
location /logs    { proxy_pass http://log-service:3000; }
```

### Implementation Sequence

1. **AppTheme token migration** — prerequisite; migrate hardcoded hex values to AppTheme tokens in existing components before building new screens
2. **`battle-service`** — scaffold from `character-service`; schema; all battle API routes; SNS publisher for both topics
3. **`log-service`** — scaffold from `room-notifications-service`; `LogEvent` model; SNS subscriber (`logWriter`); HTTP read API (`logReader`)
4. **`character-service` publisher extension** — add `LOG_TOPIC_ARN` publish alongside existing notifications publish
5. **`room-notifications-service`** — verify/add battle SNS + Redis subscriptions for `battle_*` WebSocket fanout
6. **Frontend API modules + hooks** — `battles.ts`, `logs.ts`, `useRoomBattle`, `useBattleActions`, `useRoomLogs`
7. **Room View enhancements** — sticky header, battle state indicator, QuickEditSheet, reanimated border flash
8. **Battle View** — modal group screen, sides display, PATCH mutations, conclude/discard actions
9. **Log View** — paginated list, cursor scroll, summary display
10. **Cross-platform validation + coverage gate** — iOS, Android, web parity; 70% coverage floor

### Architecture Decision Records (ADR Summary)

| ADR | Area | Decision |
|---|---|---|
| ADR-1 | Battle discard | Soft delete (`status: 'discarded'`); partial unique index on `status:'active'` only |
| ADR-2 | Conclude endpoint | Dedicated `POST /battles/:id/conclude` with required `result`; `PATCH` for name/sides only |
| ADR-3 | Log-service structure | Single service; two named Lambda functions — `logWriter` (SNS) + `logReader` (HTTP) |
| ADR-4 | Battle View routing | Expo Router modal group `(battle)/index.tsx`; Room View stays in stack |
| ADR-5 | Log event scope | `battle_updated` NOT logged; log captures lifecycle events only |
| ADR-6 | SNS topic ownership | Consumer-owned topics; `room-notifications-service` owns notifications topic; `log-service` owns log topic; producers publish to both |
| ADR-7 | Log pagination | Cursor-based via MongoDB `_id`; compound index `{ roomId:1, _id:-1 }` |
| ADR-8 | Battle mutation safety | Status guard (must be `active`) on PATCH/DELETE/conclude; last-write-wins for concurrent PATCH |
| ADR-9 | Character delete in battle | No backend cascade; frontend removes from display via `character_deleted` WS event; battle record retains original `characterIds` |
| ADR-10 | Warm resume | Room View always on reconnect; Room View reflects active battle via `useRoomBattle`; no auto-navigate to Battle View |
| ADR-11 | Log summary generation | Producers include display context in event payload; `log-service` builds summary string without outbound HTTP calls |
| ADR-12 | Log topic config | `LOG_TOPIC_ARN` required env var in character-service and battle-service; startup warns if absent |
| ADR-13 | Battle name | Optional (nullable); log summaries include name when present |
| ADR-14 | Battle sides structure | `BonusItem[]` per side (distinct, removable, signed int value); `MonsterItem[]` for main + wandering monsters |
| ADR-15 | Room View battle detection | `useRoomBattle` HTTP-on-mount + WebSocket subscription; identical pattern to `useRoomCharacters` |
| ADR-16 | Battle mutation API | Full-replace PATCH for sides (complete array sent by client); no sub-resource endpoints; client generates item IDs (UUID v4) |

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

**12 areas where AI agents could make different choices — all resolved below.**

### Naming Patterns

#### Database / Mongoose

- Collection names: **camelCase plural** — `battles`, `logEvents` (not `log_events`, not `Battles`)
- Field names: **camelCase** — `roomId`, `playerSide`, `createdAt` (not `room_id`, `player_side`)
- Model files: **PascalCase** — `Battle.ts`, `LogEvent.ts`
- `_id` **always aliased to `id`** in `toJSON` transform — never expose raw `_id` in API responses
- Schemas **always use `{ timestamps: true }`** — never manually define `createdAt`/`updatedAt`

```typescript
// ✅ correct
const battleSchema = new Schema(
  { roomId: String, playerSide: Object },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => { delete ret._id; delete ret.__v; }
    }
  }
);

// ❌ wrong — manual timestamps, snake_case fields, raw _id
const battle_schema = new Schema({
  room_id: String,
  created_at: Date,
  updated_at: Date
});
```

#### API Routes

- Resources: **lowercase plural** — `/battles`, `/logs` (not `/battle`, `/Battle`)
- Route params: **`:id`** — `/battles/:id` (not `/battles/{id}`)
- Query params: **camelCase** — `?roomId=X&status=active` (not `?room_id=X`)
- Sub-routes: **lowercase kebab** — `/battles/:id/conclude`

#### Event Types (SNS + WebSocket)

- **`snake_case` strings** — `battle_started`, `battle_concluded`, `character_deleted`
- Never camelCase (`battleStarted`) or PascalCase (`BattleStarted`)

#### Backend Code

- Source files: **camelCase** — `publisher.ts`, `service.ts`, `subscriber.ts`
- Model files: **PascalCase** — `Battle.ts`, `LogEvent.ts`
- Functions: **camelCase** — `publishBattleStarted()`, `getBattleByRoomId()`
- Environment variables: **`ALL_CAPS_SNAKE_CASE`** — `LOG_TOPIC_ARN`, `NOTIFICATIONS_TOPIC_ARN`, `BATTLE_MONGO_URI` (never `logTopicArn`, never `NOTIF_ARN`)

#### Frontend Code

- Component files: **PascalCase** — `BattleView.tsx`, `LogView.tsx`
- API modules: **camelCase** — `battles.ts`, `logs.ts`
- Hook files: **camelCase** — `useRoomBattle.ts`, `useRoomLogs.ts`
- Hook naming convention: `use` + scope + noun — `useRoomBattle`, `useRoomLogs`, `useBattleActions`

### Structure Patterns

#### Backend Service File Structure (all services must follow)

```
src/
  app.ts                   Express app factory
  lambda.ts                API Gateway Lambda entry
  index.ts                 Local server entry
  service.ts               Business logic
  publisher.ts             SNS/Redis event publishing
  subscriber.ts            SNS/Redis consumer (log-service only)
  models/
    Battle.ts              Mongoose model + schema
    Battle.test.ts         ← co-located test
  routes/
    battles.ts             Express router
    battles.test.ts        ← co-located test
  service.test.ts          ← co-located test
```

**Test co-location rule:** Test files sit alongside the source file they test as `<source>.test.ts`. Test file **casing mirrors source exactly** — `Battle.test.ts` not `battle.test.ts`, `BattleView.test.tsx` not `battleView.test.tsx`.

#### Frontend File Structure (new additions)

```
frontend/
  api/
    http.ts                Shared fetch client (existing — do not duplicate)
    battles.ts             NEW — battle-service HTTP wrappers
    logs.ts                NEW — log-service HTTP wrappers
  hooks/
    useRoomBattle.ts       NEW
    useBattleActions.ts    NEW
    useRoomLogs.ts         NEW
  app/munchkin/
    [roomNumber]/
      index.tsx            Migrated from [roomNumber].tsx (prerequisite)
      (battle)/
        index.tsx          NEW — Battle View modal screen
      log.tsx              NEW — Log View screen
```

**Note:** `app/munchkin/[roomNumber].tsx` must be migrated to `app/munchkin/[roomNumber]/index.tsx` before Battle View and Log View can be added as nested routes. This is step 0 of the Room View enhancement work.

### Format Patterns

#### API Responses — direct (no envelope)

```json
// ✅ correct — direct resource
{ "id": "abc", "roomId": "room-1", "status": "active" }

// ❌ wrong — wrapped
{ "data": { "id": "abc" }, "success": true }
```

#### Error Responses — `{ message: string }`

```json
// ✅ correct
{ "message": "Battle already active for this room" }

// ❌ wrong
{ "error": { "type": "CONFLICT", "detail": "..." } }
```

#### HTTP Status Codes

| Situation | Code |
|---|---|
| Domain state conflict (not active, already exists) | `409` |
| Validation / bad input | `400` |
| Resource not found | `404` |
| Unexpected error in Lambda | `502` (never `500`) |

#### Data Formats

- Dates: **ISO-8601 strings** — `"2026-03-24T22:00:00.000Z"` (never Unix timestamps)
- Booleans: `true`/`false` (never `1`/`0`)
- JSON fields: **camelCase** throughout

### Communication Patterns

#### Event Payload Contract

All SNS/Redis events **must** include:

```typescript
interface BaseEvent {
  eventType: string;        // snake_case
  roomId: string;           // MANDATORY — pipeline contract; all consumers depend on this
  actorId: string;          // characterId or battleId
  occurredAt: string;       // ISO-8601
  // + display context for log-service (name, changedFields, result, etc.)
  // log-service must be able to render a summary with NO outbound HTTP calls
}
```

#### Publisher Pattern — dual-topic fan-out

```typescript
// publisher.ts — use publishToAll helper; topics fail independently
async function publishToAll(topics: string[], payload: BaseEvent): Promise<void> {
  await Promise.allSettled(
    topics.map(topic => publishToTopic(topic, payload))
  );
  // allSettled: log topic failure does NOT block notifications publish
}

export async function publishBattleStarted(payload: BattleStartedPayload): Promise<void> {
  await publishToAll([NOTIFICATIONS_TOPIC_ARN, LOG_TOPIC_ARN], payload);
}
```

**Rule:** Never `await publish(topic1); await publish(topic2)` — sequential calls mean topic 1 failure blocks topic 2. Use `Promise.allSettled`.

#### Frontend HTTP Client

All API modules use `apiRequest` from `@/api/http` — **never** import `axios` directly or create a new `fetch` call outside this utility:

```typescript
// ✅ correct — battles.ts
import { apiRequest } from '@/api/http';

export async function getActiveBattle(roomId: string, signal?: AbortSignal): Promise<Battle | null> {
  return apiRequest<Battle | null>(`/battles?roomId=${roomId}&status=active`, { signal });
}

// ❌ wrong — bypasses retry logic, error handling, base URL config
import axios from 'axios';
const res = await axios.get(`/battles?roomId=${roomId}`);
```

#### Frontend Hook Return Shape (mirrors `useRoomCharacters`)

```typescript
// useRoomBattle.ts
export function useRoomBattle(roomId: string | undefined): UseRoomBattleResult

interface UseRoomBattleResult {
  battle: Battle | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

// useBattleActions.ts
interface UseBattleActionsResult {
  start: (payload: StartBattlePayload) => Promise<Battle>;
  patch: (battleId: string, payload: PatchBattlePayload) => Promise<Battle>;
  conclude: (battleId: string, result: BattleResult) => Promise<Battle>;
  discard: (battleId: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}
```

#### TanStack Query Key Convention

```typescript
// battle queries
queryKey: ['battle', roomId]

// log queries
queryKey: ['logs', roomId]

// existing (reference)
queryKey: ['characters', roomId]
```

Consistent key shapes prevent cache invalidation bugs — never invent custom key structures.

### Process Patterns

#### Error Handling — Backend

- Catch unexpected errors → `res.status(502).json({ message: 'Unexpected error' })` (never `500` in Lambda)
- Validate `status === 'active'` before PATCH/DELETE/conclude → `409` on violation
- Use same error shape as existing services: `{ message: string }`

#### Test Coverage Gate

- New endpoints: minimum one success-path test + one failure-path test (co-located)
- 70% line coverage is a **CI hard gate** — never merge below threshold
- `battle-service` primary coverage target: state machine transitions (`active → concluded`, `active → discarded`)
- `log-service` primary coverage target: SNS handler writes correct document; HTTP reader returns filtered roomId results

### Enforcement Summary

**All AI agents MUST:**

- Use `camelCase` for all MongoDB fields and JSON API fields
- Use `snake_case` for all event type strings
- Include `roomId` in every SNS/Redis event payload
- Alias `_id` → `id` in all Mongoose `toJSON` transforms
- Use `{ timestamps: true }` in all Mongoose schema options
- Co-locate test files as `<source>.test.ts` with matching casing
- Return direct API responses (no envelope wrapper)
- Return `{ message: string }` for all error responses
- Use `@/api/http` `apiRequest` in all frontend API modules — never raw fetch or axios
- Use `Promise.allSettled` for multi-topic publishing in `publisher.ts`
- Use `ALL_CAPS_SNAKE_CASE` for all environment variable names
- Follow `['battle', roomId]` / `['logs', roomId]` TanStack Query key shapes

**Anti-patterns to reject:**

```typescript
// ❌ snake_case MongoDB fields
{ room_id: String, player_side: Object }

// ❌ manual timestamps in schema
{ createdAt: { type: Date, default: Date.now } }

// ❌ wrapped API response
res.json({ data: battle, success: true })

// ❌ raw _id in response
res.json({ _id: battle._id })

// ❌ 500 in Lambda
res.status(500).json({ error: 'Internal Server Error' })

// ❌ sequential multi-topic publish
await publish(NOTIFICATIONS_TOPIC_ARN, payload);
await publish(LOG_TOPIC_ARN, payload);

// ❌ raw axios in frontend API module
import axios from 'axios';
const res = await axios.get('/battles');

// ❌ camelCase event type
{ eventType: 'battleStarted' }

// ❌ test file in separate folder
src/__tests__/Battle.test.ts

// ❌ test file casing mismatch
src/models/battle.test.ts  // source is Battle.ts
```

## Project Structure & Boundaries

### New Backend Services

```
backend/
├── battle-service/                          NEW — scaffold from character-service
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── .env.example                         BATTLE_MONGO_URI, NOTIFICATIONS_TOPIC_ARN,
│   │                                        LOG_TOPIC_ARN, NOTIFICATIONS_REDIS_CHANNEL,
│   │                                        LOG_REDIS_CHANNEL, REDIS_URL, PORT
│   └── src/
│       ├── app.ts                           Express app factory
│       ├── index.ts                         Local server entry
│       ├── lambda.ts                        API Gateway Lambda entry
│       ├── service.ts
│       ├── service.test.ts
│       ├── publisher.ts                     publishToAll + publishToAllChannels helpers;
│       │                                    battle_* events to both topics/channels
│       ├── publisher.test.ts
│       ├── models/
│       │   ├── Battle.ts                    Mongoose schema — BonusItem + MonsterItem embedded
│       │   └── Battle.test.ts
│       └── routes/
│           ├── battles.ts                   Express router — all battle endpoints
│           └── battles.test.ts
│
└── log-service/                             NEW — scaffold from room-notifications-service
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── .env.example                         LOG_MONGO_URI, LOG_TOPIC_ARN,
    │                                        LOG_REDIS_CHANNEL, REDIS_URL, PORT
    └── src/
        ├── app.ts                           Express read API factory
        ├── index.ts                         Local entry — Promise.all([startSubscriber(),
        │                                    startHttpServer()]) — runs both concurrently
        ├── lambda-read.ts                   HTTP API Gateway Lambda entry (logReader)
        ├── subscriber.ts                    SNS-triggered Lambda entry (logWriter) — SNSEvent → void
        ├── subscriber.test.ts
        ├── models/
        │   ├── LogEvent.ts                  Mongoose schema
        │   └── LogEvent.test.ts
        └── routes/
            ├── logs.ts                      Express router — GET /logs
            └── logs.test.ts
```

### Modified Backend Services

```
backend/
├── character-service/
│   └── src/
│       └── publisher.ts                     MODIFIED — behavior change (not purely additive):
│                                            single-channel Redis → dual-channel; add
│                                            publishToAllChannels helper; add LOG_TOPIC_ARN
│                                            SNS publish. Requires publisher.test.ts update.
│
└── room-notifications-service/
    └── src/
        └── subscriber.ts                    MODIFIED — add battle_* SNS/Redis subscriptions
                                             for WebSocket fanout (battle_started,
                                             battle_updated, battle_concluded, battle_discarded)
```

### Infrastructure Changes

#### `backend/sam/template.yaml` — MODIFIED

Additions to the single shared SAM template:

```yaml
# New SNS Topic
LogEventsTopic:                            # owned by log-service (subscriber)
  Type: AWS::SNS::Topic

# New Lambda Functions
BattleServiceFunction:
  CodeUri: ../battle-service
  Handler: lambda.handler
  Events: HttpApi → /battles/{proxy+} (ALL methods)
  Environment: BATTLE_MONGO_URI, NOTIFICATIONS_TOPIC_ARN (=RoomNotificationsTopic),
               LOG_TOPIC_ARN (=LogEventsTopic), ROUTE_PREFIX
  IAM: sns:Publish on RoomNotificationsTopic + LogEventsTopic

LogWriterFunction:                         # logWriter — SNS-triggered
  CodeUri: ../log-service
  Handler: subscriber.handler
  Events: SNS → LogEventsTopic
  Environment: LOG_MONGO_URI

LogReaderFunction:                         # logReader — HTTP
  CodeUri: ../log-service
  Handler: lambda-read.handler
  Events: HttpApi → /logs/{proxy+} (ALL methods)
  Environment: LOG_MONGO_URI, ROUTE_PREFIX

# Extend CharacterServiceFunction IAM:
#   add sns:Publish on LogEventsTopic (additive to existing RoomNotificationsTopic)
```

#### `backend/sam/events/` — NEW test event files

```
backend/sam/events/
  battle-post-battles.json               NEW — HttpApi POST /battles event
  battle-post-conclude.json              NEW — HttpApi POST /battles/:id/conclude event
  battle-patch-battle.json               NEW — HttpApi PATCH /battles/:id event
  log-get-logs.json                      NEW — HttpApi GET /logs?roomId=X event
  log-sns-event.json                     NEW — SNS envelope format (reference
                                               room-notifications-service existing pattern)
```

**Note:** `log-sns-event.json` must use the AWS SNS message envelope schema — reference the existing SNS event format used by `room-notifications-service` tests, not a raw payload.

#### `backend/docker-compose.local.yml` — MODIFIED

```yaml
# Add services:
battle-service:
  build: ./battle-service
  ports: ["8086:8086"]
  environment:
    BATTLE_MONGO_URI: mongodb://mongo-battle:27017/munch_battle_service
    NOTIFICATIONS_REDIS_CHANNEL: room_notifications    # existing channel
    LOG_REDIS_CHANNEL: log_events                         # new channel
    REDIS_URL: redis://redis:6379
    PORT: 8086
  depends_on: [mongo-battle, redis]

log-service:
  build: ./log-service
  ports: ["8087:8087"]
  environment:
    LOG_MONGO_URI: mongodb://mongo-log:27017/munch_log_service
    LOG_REDIS_CHANNEL: log_events
    REDIS_URL: redis://redis:6379
    PORT: 8087
  depends_on: [mongo-log, redis]

mongo-battle:
  image: mongo
  ports: ["27024:27017"]

mongo-log:
  image: mongo
  ports: ["27025:27017"]
```

#### `backend/nginx/nginx.conf` — MODIFIED

```nginx
# Add upstreams:
upstream battle_service  { server battle-service:8086; }
upstream log_service     { server log-service:8087; }

# Add location blocks:
location /battles { proxy_pass http://battle_service; }
location /logs    { proxy_pass http://log_service; }
```

### New Frontend Files

```
frontend/
├── api/
│   ├── battles.ts                           NEW — apiRequest wrappers for battle-service
│   └── logs.ts                              NEW — apiRequest wrappers for log-service
│
├── hooks/
│   ├── useRoomBattle.ts                     NEW — HTTP-on-mount + WS subscription
│   ├── useBattleActions.ts                  NEW — start/patch/conclude/discard mutations
│   └── useRoomLogs.ts                       NEW — paginated log query with cursor state
│
└── app/munchkin/
    ├── [roomNumber].tsx                     DELETED — migrated to directory route
    └── [roomNumber]/
        ├── index.tsx                        MIGRATED from [roomNumber].tsx
        │                                    ⚠️ HARD PREREQUISITE — atomic commit before
        │                                    any Battle View or Log View work begins
        ├── (battle)/
        │   └── index.tsx                    NEW — Battle View (Expo Router modal group)
        └── log.tsx                          NEW — Log View
```

### Architectural Boundaries

#### Service Communication (no synchronous inter-service HTTP calls)

```
Frontend
  │
  ├── GET/POST/PATCH/DELETE /battles  ──→  battle-service
  ├── GET /logs                       ──→  log-service (logReader)
  ├── GET/POST/PATCH/DELETE /characters──→ character-service  (unchanged)
  └── WS /ws                          ──→  room-notifications-service (unchanged)

battle-service
  ├──→ RoomNotificationsTopic (SNS) / room_notifications (Redis)
  └──→ LogEventsTopic (SNS)           / log_events (Redis)

character-service  [MODIFIED]
  ├──→ RoomNotificationsTopic (SNS) / room_notifications (Redis)  [existing]
  └──→ LogEventsTopic (SNS)           / log_events (Redis)             [NEW]

room-notifications-service  [MODIFIED]
  ←── RoomNotificationsTopic (SNS) / room_notifications (Redis)  [existing]
  ←── battle_* events on same channel                                  [NEW subscription]
  └──→ WebSocket broadcast to room clients

log-service (logWriter)
  ←── LogEventsTopic (SNS) / log_events (Redis)
  └──→ logEvents MongoDB collection
```

#### Data Ownership

| Collection | Owner | No other service reads or writes |
|---|---|---|
| `battles` | `battle-service` | ✅ |
| `logEvents` | `log-service` | ✅ |
| `characters` | `character-service` | ✅ (unchanged) |
| `rooms` | `room-service` | ✅ (unchanged) |

### Requirements → Structure Mapping

| FR Range | Capability | Primary Files |
|---|---|---|
| FR20–28 | Battle Management | `backend/battle-service/src/`, `frontend/api/battles.ts`, `frontend/hooks/useBattle*.ts`, `app/munchkin/[roomNumber]/(battle)/index.tsx` |
| FR29–34 | Session History & Logs | `backend/log-service/src/`, `frontend/api/logs.ts`, `frontend/hooks/useRoomLogs.ts`, `app/munchkin/[roomNumber]/log.tsx` |
| FR1–19 | Room/Character/Realtime stabilisation | Existing services + `[roomNumber]/index.tsx` Room View enhancements |
| FR35–48 | Release readiness / cross-cutting | Coverage gate (all services), AppTheme migration, cross-platform parity |

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:** All 16 ADRs are internally consistent. Consumer-owned SNS topics (ADR-6) aligns with the `publishToAll` / `Promise.allSettled` pattern. Full-replace PATCH (ADR-16) is compatible with last-write-wins (ADR-8). Soft delete (ADR-1) works with the partial unique index. No contradictions found.

**Pattern ↔ technology alignment:** Node 20 + Express 5 + Mongoose 8 confirmed compatible. Expo Router modal group `(battle)` requires the `[roomNumber]/` directory migration — prerequisite is documented. TanStack Query keys are consistent with the existing `['characters', roomId]` pattern.

**SNS topic alignment:** `RoomNotificationsTopic` (renamed from `RoomCharacterEventsTopic`) is owned by `room-notifications-service`. Both `character-service` and `battle-service` publish to it. `LogEventsTopic` is owned by `log-service`. Coherent with ADR-6.

### Requirements Coverage Validation ✅

| FR | Requirement | Coverage |
|---|---|---|
| FR20 | Start a battle in a room | `POST /battles`, 409 guard, partial unique index |
| FR21 | Name a battle | `name` nullable field, `PATCH /battles/:id` |
| FR22 | Warm resume to active battle | `useRoomBattle` HTTP-on-mount, ADR-10 ⚠️ see note |
| FR23 | Adjust battle values (bonuses) | Full-replace PATCH, `BonusItem[]`, ADR-16 |
| FR24 | Add/remove monsters | `MonsterItem[]` in `monsterSide`, full-replace PATCH |
| FR25 | Conclude a battle | `POST /battles/:id/conclude`, ADR-2 |
| FR26 | Discard a battle | `DELETE /battles/:id`, soft delete, ADR-1 |
| FR27 | One active battle per room | Partial unique index, 409 Conflict |
| FR28 | Character deleted during battle | Frontend WS handler, ADR-9 |
| FR29 | Session history log | `log-service`, `logEvents` collection |
| FR30 | Log character events | `character-service` publisher extension, ADR-12 |
| FR31 | Log battle lifecycle events | `battle-service` publisher, ADR-5 |
| FR32 | Log view in frontend | `log.tsx`, `useRoomLogs`, cursor pagination |
| FR33 | Log entry detail | `GET /logs/:logId` |
| FR34 | Pre-rendered summaries | ADR-11 — producers include display context |

⚠️ **FR22 / ADR-10 alignment note:** ADR-10 specifies "Room View always on resume, tap to enter Battle View." Story author must confirm this matches UX spec intent (battle indicator tap-to-enter vs auto-navigate to Battle View) before implementing Battle View.

**NFR coverage:**
- Performance (< 2s interactions): ARM64 + 512MB Lambda globals; no synchronous inter-service calls in hot path ✅
- $150/month ceiling: two new Lambda functions + existing MongoDB Atlas tier; no new paid services ✅
- 70% coverage floor: CI gate defined in patterns section ✅
- Cross-platform parity: Expo Router + React Native patterns unchanged; new screens follow existing conventions ✅

### Implementation Readiness Validation ✅

**Decision completeness:** 16 ADRs with rationale. All critical paths have explicit decisions. No ambiguous items remain.

**Structure completeness:** Every new file named explicitly. Modified files flagged with nature of change (including `character-service` publisher as behavior change, not purely additive). Prerequisites sequenced.

**Pattern completeness:** 12 conflict points identified and resolved. Anti-patterns provided with concrete examples. All patterns have code samples.

### Gap Analysis

**Critical gaps:** None blocking.

**Important gaps:**

| Gap | Resolution |
|---|---|
| `room-notifications-service` subscriber wiring for `battle_*` | **Closed:** battle-service publishes to `RoomNotificationsTopic` which room-notifications-service already subscribes to. Change is additive handler only — no new subscription or topic needed. |
| `RoomNotificationsTopic` rename deployment | Requires **coordinated single `sam deploy`** of all dependent functions (character-service, battle-service, room-notifications-service). Not a rolling update — ARN changes on rename. |
| Shared TypeScript types (frontend/backend) | Frontend owns its type layer (`frontend/types/battle.ts`, `frontend/types/log.ts`); backend services define independent Mongoose interfaces. No cross-boundary type sharing (existing pattern). |

**Known limitations (future work):**

| Limitation | Future fix |
|---|---|
| SNS at-least-once delivery may produce duplicate `LogEvent` documents | Add `eventId` UUID to all event payloads + unique index on `LogEvent.eventId` |
| Per-character bonus breakdown not tracked | Add per-character bonus map to `playerSide` schema (deferred, ADR-14) |
| No optimistic locking on battle PATCH | Add version field for high-concurrency scenarios (deferred, ADR-8) |

**Minor gaps:**

| Gap | Action |
|---|---|
| Frontend error boundary for Battle View / Log View | Story author follows existing toast/alert pattern — not architecture-blocking |
| FR27 409 user-facing error message | Story author specifies in Battle View story acceptance criteria |

### Validation Issues Addressed

1. **`RoomNotificationsTopic` rename** — updated throughout document; deployment coordination documented
2. **`publishToAllChannels` test requirement** — failure-isolation test (one channel throws → other succeeds) explicitly required in `publisher.test.ts` for all services using dual-publish
3. **`[roomNumber]` route migration** — flagged as hard prerequisite atomic commit; requires manual smoke test on iOS + Android + web before any Battle View code is introduced
4. **`room-notifications-service` scope** — confirmed as additive handler addition only; lower risk than it appears

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analysed (48 FRs, 17 NFRs, brownfield completion phase)
- [x] Scale and complexity assessed (medium, 2–6 players, $150/month ceiling)
- [x] Technical constraints identified (serverless, Expo 55 lock, 70% coverage floor)
- [x] Cross-cutting concerns mapped (realtime, optimistic UI, idempotency, token migration)

**✅ Architectural Decisions**
- [x] 16 ADRs documented with rationale and trade-offs
- [x] Technology stack fully specified (existing stack preserved)
- [x] Integration patterns defined (consumer-owned topics, publishToAll, full-replace PATCH)
- [x] Performance and cost considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (camelCase fields, snake_case events, ALL_CAPS env vars)
- [x] Structure patterns defined (co-located tests, service file layout)
- [x] Communication patterns specified (event payload contract, apiRequest, publishToAllChannels)
- [x] Process patterns documented (error handling, coverage gate, optimistic updates)

**✅ Project Structure**
- [x] Complete new/modified file tree defined
- [x] Component and data boundaries established
- [x] Integration points and event flow mapped
- [x] Requirements-to-structure mapping complete

### Architecture Readiness Assessment

**Overall Status: ✅ READY FOR IMPLEMENTATION**

**Confidence: High** — brownfield completion with well-understood existing patterns. 16 decisions cross-checked, no contradictions, all 48 FRs architecturally covered.

**Key strengths:**
- Consumer-owned SNS topics eliminate cross-service subscription dependencies
- `publishToAll` / `Promise.allSettled` prevents cascading publish failures
- Full-replace PATCH simplifies implementation without meaningful concurrency risk at game scale
- Prerequisites explicitly sequenced — no ambiguity about what must land first

**Areas for post-MVP enhancement:**
- Per-character bonus breakdown (ADR-14 deferred)
- Battle sub-resource endpoints for granular log events (ADR-16 deferred)
- SNS event idempotency via `eventId` (known limitation)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all 16 ADRs exactly as documented — do not re-decide resolved questions
- Use implementation patterns from Step 5 consistently — refer to enforcement summary and anti-patterns
- Respect service and data boundaries — no cross-service DB queries, no synchronous inter-service HTTP in event handlers
- Refer to this document for all architectural questions before making independent decisions

**Implementation sequence (from Step 4):**
1. AppTheme token migration (prerequisite — existing components)
2. `[roomNumber].tsx` → `[roomNumber]/index.tsx` migration (hard prerequisite — atomic commit + 3-platform smoke test)
3. `backend/sam/template.yaml` — rename `RoomNotificationsTopic`, add `LogEventsTopic`, add battle/log functions (coordinated deploy)
4. `battle-service` scaffold + schema + API routes + publisher
5. `log-service` scaffold + `LogEvent` model + `logWriter` + `logReader`
6. `character-service` publisher extension (behavior change — dual-channel, requires test update)
7. `room-notifications-service` subscriber extension (additive `battle_*` handlers)
8. Frontend: `battles.ts`, `logs.ts`, `useRoomBattle`, `useBattleActions`, `useRoomLogs`
9. Room View enhancements (sticky header, battle indicator, QuickEditSheet, border flash)
10. Battle View (`(battle)/index.tsx`)
11. Log View (`log.tsx`)
12. Cross-platform validation + 70% coverage gate
