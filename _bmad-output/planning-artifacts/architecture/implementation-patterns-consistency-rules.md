# Implementation Patterns & Consistency Rules

## Critical Conflict Points Identified

**12 areas where AI agents could make different choices — all resolved below.**

## Naming Patterns

### Database / Mongoose

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

### API Routes

- Resources: **lowercase plural** — `/battles`, `/logs` (not `/battle`, `/Battle`)
- Route params: **`:id`** — `/battles/:id` (not `/battles/{id}`)
- Query params: **camelCase** — `?roomId=X&status=active` (not `?room_id=X`)
- Sub-routes: **lowercase kebab** — `/battles/:id/conclude`

### Event Types (SNS + WebSocket)

- **`snake_case` strings** — `battle_started`, `battle_concluded`, `character_deleted`
- Never camelCase (`battleStarted`) or PascalCase (`BattleStarted`)

### Backend Code

- Source files: **camelCase** — `publisher.ts`, `service.ts`, `subscriber.ts`
- Model files: **PascalCase** — `Battle.ts`, `LogEvent.ts`
- Functions: **camelCase** — `publishBattleStarted()`, `getBattleByRoomId()`
- Environment variables: **`ALL_CAPS_SNAKE_CASE`** — `LOG_TOPIC_ARN`, `NOTIFICATIONS_TOPIC_ARN`, `BATTLE_MONGO_URI` (never `logTopicArn`, never `NOTIF_ARN`)

### Frontend Code

- Component files: **PascalCase** — `BattleView.tsx`, `LogView.tsx`
- API modules: **camelCase** — `battles.ts`, `logs.ts`
- Hook files: **camelCase** — `useRoomBattle.ts`, `useRoomLogs.ts`
- Hook naming convention: `use` + scope + noun — `useRoomBattle`, `useRoomLogs`, `useBattleActions`

## Structure Patterns

### Backend Service File Structure (all services must follow)

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

### Frontend File Structure (new additions)

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

## Format Patterns

### API Responses — direct (no envelope)

```json
// ✅ correct — direct resource
{ "id": "abc", "roomId": "room-1", "status": "active" }

// ❌ wrong — wrapped
{ "data": { "id": "abc" }, "success": true }
```

### Error Responses — `{ message: string }`

```json
// ✅ correct
{ "message": "Battle already active for this room" }

// ❌ wrong
{ "error": { "type": "CONFLICT", "detail": "..." } }
```

### HTTP Status Codes

| Situation | Code |
|---|---|
| Domain state conflict (not active, already exists) | `409` |
| Validation / bad input | `400` |
| Resource not found | `404` |
| Unexpected error in Lambda | `502` (never `500`) |

### Data Formats

- Dates: **ISO-8601 strings** — `"2026-03-24T22:00:00.000Z"` (never Unix timestamps)
- Booleans: `true`/`false` (never `1`/`0`)
- JSON fields: **camelCase** throughout

## Communication Patterns

### Event Payload Contract

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

### Publisher Pattern — dual-topic fan-out

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

### Frontend HTTP Client

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

### Frontend Hook Return Shape (mirrors `useRoomCharacters`)

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

### TanStack Query Key Convention

```typescript
// battle queries
queryKey: ['battle', roomId]

// log queries
queryKey: ['logs', roomId]

// existing (reference)
queryKey: ['characters', roomId]
```

Consistent key shapes prevent cache invalidation bugs — never invent custom key structures.

## Process Patterns

### Error Handling — Backend

- Catch unexpected errors → `res.status(502).json({ message: 'Unexpected error' })` (never `500` in Lambda)
- Validate `status === 'active'` before PATCH/DELETE/conclude → `409` on violation
- Use same error shape as existing services: `{ message: string }`

### Test Coverage Gate

- New endpoints: minimum one success-path test + one failure-path test (co-located)
- 70% line coverage is a **CI hard gate** — never merge below threshold
- `battle-service` primary coverage target: state machine transitions (`active → concluded`, `active → discarded`)
- `log-service` primary coverage target: SNS handler writes correct document; HTTP reader returns filtered roomId results

## Enforcement Summary

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
