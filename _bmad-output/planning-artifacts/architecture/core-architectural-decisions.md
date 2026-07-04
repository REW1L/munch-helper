# Core Architectural Decisions

## Data Architecture

### Battle Schema

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

### Log Schema

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

## Auth & Security

No changes to authentication model. Anonymous UUID identity (`deviceId`) is preserved. All battle and log endpoints enforce `roomId` isolation at the query level — queries always include `WHERE roomId = :roomId` and are never cross-room.

## API Design

### Battle API (`battle-service`)

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

### Log API (`log-service`)

```
GET  /logs?roomId=X&limit=50&before=<_id>   Paginated room log (cursor via MongoDB _id)
GET  /logs/:logId                            Single log entry detail
```

**Pagination:** Cursor-based via MongoDB `_id` (not `occurredAt`). `before` param is the `_id` string of the last seen item. Consistent ordering via compound index `{ roomId: 1, _id: -1 }`.

## SNS Topic Architecture (Consumer-Owned)

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

## Frontend Architecture

### New Files

```
frontend/api/battles.ts          HTTP client for battle-service endpoints
frontend/api/logs.ts             HTTP client for log-service endpoints
frontend/hooks/useRoomBattle.ts  HTTP-on-mount + WS subscription for active battle
frontend/hooks/useBattleActions.ts  PATCH / conclude / discard mutations
frontend/hooks/useRoomLogs.ts    Paginated log query with cursor state
```

### Routing

```
app/munchkin/[roomNumber]/(battle)/index.tsx   Battle View — Expo Router modal group
app/munchkin/[roomNumber]/log.tsx              Log View
```

Battle View uses a modal group (`(battle)`) so Room View stays in the navigation stack behind it — back navigation returns to Room View without re-fetching room state.

### Hook Pattern: `useRoomBattle(roomId)`

Mirrors `useRoomCharacters` exactly:
1. On mount: `GET /battles?roomId=X&status=active` — initial state load
2. WebSocket subscription: handles `battle_started`, `battle_updated`, `battle_concluded`, `battle_discarded` events
3. Returns: `{ battle: Battle | null, isLoading, error }`

Room View highlights the battle button / shows active battle indicator when `battle !== null`.

### WebSocket Client Extension

`RoomWebSocketClient` extended with new `battle_*` event handlers only. Existing character event handlers are not modified. `battle_updated` WebSocket event is emitted by `room-notifications-service` for realtime UI sync (separate from log persistence — `battle_updated` is NOT logged but IS broadcast via WebSocket).

### Warm Resume

On app cold start or reconnect → always navigate to Room View. Room View queries `useRoomBattle` on mount. If an active battle exists, Room View reflects this (highlighted button, active battle indicator). User taps the battle button to navigate to Battle View. No auto-navigation to Battle View.

### Character Deleted During Active Battle

Frontend handles via `character_deleted` WebSocket event: removes character from Battle View display. No backend cascade. The battle record retains original `characterIds` for historical reference (concluded/discarded battles show who participated).

## Infrastructure

### SAM Template Additions

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

### IAM Policy Additions

- `battle-service`: `sns:Publish` on `NOTIFICATIONS_TOPIC_ARN` + `LOG_TOPIC_ARN`
- `character-service`: adds `sns:Publish` on `LOG_TOPIC_ARN` (additive to existing notifications publish)
- `log-service`: `sns:Subscribe` on `LOG_TOPIC_ARN`

### Local Nginx

```nginx
location /battles { proxy_pass http://battle-service:3000; }
location /logs    { proxy_pass http://log-service:3000; }
```

## Implementation Sequence

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

## Architecture Decision Records (ADR Summary)

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
