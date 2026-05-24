# API Contracts - Backend

Authoritative source: `docs/openapi/openapi.yaml`. The reference below is a flatter, prose-formatted view of the same surface, derived from the actual route handlers and Mongoose schemas as of this scan.

All paths are relative to the backend base URL:
- Local: `http://localhost:8080`
- Cloud: `https://helpamunch.click/api`

All requests and responses use `application/json`. There is no authentication header today; identity is conveyed by `userId` in the request body or query string.

Conventions:
- 400 = client validation failure (specific `message` field).
- 404 = resource not found (Mongo `CastError` for malformed ids is also mapped to 404).
- 409 = conflict (e.g., battle already concluded, battle already active).
- 500 = unhandled error (most services).
- 502 = unhandled error (battle-service) or upstream failure (room-service when character-service call fails).

## Health

| Method | Path | Service |
|---|---|---|
| GET | `/health` | each service exposes its own health on the same path internally |

Response: `{ "service": "<service-name>", "status": "ok" }`.

The Nginx edge also serves a `GET /health` that returns `{ "service": "nginx", "status": "ok" }` without forwarding upstream.

## Users

### `POST /users`

Create a user.

**Request body:**

```json
{ "name": "Munch Player", "avatarId": 3 }
```

- `name` (string, required, non-empty after trim).
- `avatarId` (number, required).

**Responses:**

- `201 Created`:
  ```json
  {
    "id": "<userId>",
    "name": "Munch Player",
    "avatarId": 3,
    "createdAt": "<ISO date>",
    "updatedAt": "<ISO date>"
  }
  ```
- `400 Bad Request`:
  - `Field name is required and must be a non-empty string`
  - `Field avatarId is required and must be a number`

### `GET /users/:userId`

Read a user.

**Responses:**

- `200 OK` with the same shape as create.
- `404 Not Found` if the user does not exist or `userId` is malformed.

### `PATCH /users/:userId`

Partial update. At least one of `name` / `avatarId` must be provided.

**Request body** (any subset):

```json
{ "name": "Renamed", "avatarId": 5 }
```

- `name` (string, non-empty when provided).
- `avatarId` (number when provided).

**Responses:**

- `200 OK` with the updated user shape.
- `400 Bad Request`:
  - `Field name must be a non-empty string when provided`
  - `Field avatarId must be a number when provided`
  - `No valid fields provided for update`
- `404 Not Found` for unknown / malformed `userId`.

## Rooms

### `POST /rooms`

Create a Munchkin room. Provisions a default character for the owner via an internal call to character-service.

**Request body:**

```json
{
  "roomTypeId": "munchkin",
  "userId": "<userId>",
  "userName": "Munch Player",
  "avatarId": 3
}
```

- `roomTypeId` (string, defaults to `"munchkin"`; only `"munchkin"` accepted).
- `userId` (string, required, non-empty after trim).
- `userName` (string, optional - used as the default character name; defaults to `"Adventurer"`).
- `avatarId` (number, optional - used as the default character avatar; defaults to `1`).

**Responses:**

- `201 Created`:
  ```json
  {
    "roomId": "Frog4521",
    "roomTypeId": "munchkin",
    "userId": "<userId>",
    "characterId": "<characterId>",
    "createdAt": "<ISO date>"
  }
  ```
- `400 Bad Request`:
  - `Only roomTypeId "munchkin" is supported in local mode`
  - `Field userId is required and must be a non-empty string`
- `502 Bad Gateway`:
  - `Failed to create default character for room owner` (with `details` from the upstream error). Room and association rows are rolled back before responding.

### `POST /rooms/associations`

Join an existing room. Idempotent on `(roomId, userId)`.

**Request body:**

```json
{
  "roomId": "Frog4521",
  "userId": "<userId>",
  "userName": "Munch Player",
  "avatarId": 3
}
```

- `roomId` (string, required, non-empty after trim).
- `userId` (string, required, non-empty after trim).
- `userName`, `avatarId` (used for default character provisioning if the user is new to the room).

**Responses:**

- `200 OK` (already joined):
  ```json
  {
    "roomId": "Frog4521",
    "userId": "<userId>",
    "characterId": "<existing characterId>",
    "joinedAt": "<ISO date>",
    "alreadyJoined": true
  }
  ```
- `201 Created` (new association):
  ```json
  {
    "roomId": "Frog4521",
    "userId": "<userId>",
    "characterId": "<new characterId>",
    "joinedAt": "<ISO date>",
    "alreadyJoined": false
  }
  ```
- `400 Bad Request`:
  - `Field roomId is required and must be a non-empty string`
  - `Field userId is required and must be a non-empty string`
- `404 Not Found`: `Room not found`.
- `502 Bad Gateway`: `Failed to create default character while joining room` (with `details`).

A duplicate-key 11000 race on the `(roomId, userId)` unique index is recovered by reading the existing association and returning 200 with `alreadyJoined: true`.

## Characters

### `GET /characters?roomId=`

List characters for a room, oldest first.

**Query parameters:**

- `roomId` (string, required).

**Responses:**

- `200 OK`:
  ```json
  {
    "items": [
      {
        "id": "<characterId>",
        "roomId": "Frog4521",
        "userId": "<userId or null>",
        "name": "Adventurer",
        "avatarId": 1,
        "color": "#A2B4C6",
        "level": 1,
        "power": 0,
        "class": "[\"Cleric\"]",
        "race": "[\"Human\"]",
        "gender": "[\"male\"]",
        "createdAt": "<ISO date>",
        "updatedAt": "<ISO date>"
      }
    ]
  }
  ```
- `400 Bad Request`: `Query parameter roomId is required`.

The frontend's `frontend/api/characters.ts::parseArrayField` handles legacy comma-separated values defensively.

### `POST /characters`

Create a character.

**Request body:**

```json
{
  "roomId": "Frog4521",
  "userId": "<userId or null>",
  "name": "Munchqueen",
  "avatarId": 2,
  "color": "#8AFF22",
  "level": 1,
  "power": 0,
  "class": "[\"Cleric\"]",
  "race": "[\"Human\"]",
  "gender": "[\"female\"]"
}
```

Required: `roomId`, `name`, `avatarId`, `color` (hex `#RRGGBB`).

**Responses:**

- `201 Created` with the same shape as the list item plus the publish side-effect: a `character_created` event is emitted to the notifications and log buses.
- `400 Bad Request`:
  - `Field roomId is required and must be a non-empty string`
  - `Field name is required and must be a non-empty string`
  - `Field avatarId is required and must be a number`
  - `Field color is required and must be a valid hex color (#RRGGBB)`

### `PATCH /characters/:characterId`

Partial update. The allowed update keys are `name`, `avatarId`, `color`, `level`, `power`, `class`, `race`, `gender`, `userId`.

**Request body** (any subset of the allowed keys). String fields are trimmed; color is normalized to upper-case.

**Responses:**

- `200 OK` with the updated character.
- `400 Bad Request`:
  - `No valid fields provided for update`
  - `Field name must be a non-empty string when provided`
  - `Field avatarId must be a number when provided`
  - `Field color must be a valid hex color (#RRGGBB) when provided`
- `404 Not Found` if the character does not exist.

A successful update emits `character_updated` with a `changes` map containing only the fields whose value actually changed (`Object.is` comparison). The pre-update read is enrichment-only - if it fails, the update still goes through and `changes` is omitted.

### `DELETE /characters/:characterId`

Delete a character.

**Responses:**

- `204 No Content` (no body) and a `character_deleted` event emitted.
- `404 Not Found` if the character does not exist.

## Battles

### `GET /battles?roomId=&status=active`

Returns the active battle for a room or `null`.

**Query parameters:**

- `roomId` (string, required).
- `status` (string, optional). Only `"active"` is supported. Any other value resolves to `null`.

**Responses:**

- `200 OK` with `Battle | null`:
  ```json
  {
    "id": "<battleId>",
    "roomId": "Frog4521",
    "name": "Battle May 24, 14:32",
    "status": "active",
    "playerSide": {
      "characterIds": ["<characterId>"],
      "bonuses": [{ "id": "<uuid>", "value": 5 }]
    },
    "monsterSide": {
      "monsters": [{ "id": "<uuid>", "name": "Fungeater", "level": 25 }],
      "bonuses": []
    },
    "result": null,
    "concludedAt": null,
    "createdAt": "<ISO date>",
    "updatedAt": "<ISO date>"
  }
  ```
- `400 Bad Request`: `Query parameter roomId is required`.

### `POST /battles`

Start a battle. Enforces "one active battle per room" via a partial unique index on `(roomId, status='active')`. Two-attempt retry handles a concurrent double-start race.

**Request body:**

```json
{ "roomId": "Frog4521", "name": "Battle May 24, 14:32" }
```

- `roomId` (string, required).
- `name` (string, required, non-empty after trim).

**Responses:**

- `201 Created` with the new `Battle` shape (same as `GET /battles`). Emits `battle_started` to both buses.
- `400 Bad Request`:
  - `Field roomId is required and must be a non-empty string`
  - `Field name is required and must be a non-empty string`
- `409 Conflict`:
  ```json
  {
    "message": "A battle is already active for this room",
    "activeBattleId": "<existing battleId>"
  }
  ```
  The frontend uses `activeBattleId` to navigate directly to the existing battle.

### `PATCH /battles/:id`

Update name and/or sides on an active battle.

**Request body** (any subset of the three keys):

```json
{
  "name": "Renamed Battle",
  "playerSide": {
    "characterIds": ["<characterId>"],
    "bonuses": [{ "id": "<uuid>", "value": 5 }]
  },
  "monsterSide": {
    "monsters": [{ "id": "<uuid>", "name": "Fungeater", "level": 25 }],
    "bonuses": []
  }
}
```

- `name` (string, non-empty when provided).
- `playerSide.characterIds` (string[], non-empty unique strings).
- `playerSide.bonuses` and `monsterSide.bonuses` (`{id, value}[]`; `value` is integer; ids unique within a side).
- `monsterSide.monsters` (`{id, name, level}[]`; `name` non-empty; `level` integer >= 0; ids unique).

**Responses:**

- `200 OK` with the updated battle. Emits `battle_updated` to the notifications bus only (the log bus is gated to lifecycle events).
- `400 Bad Request` with the matching validation message.
- `404 Not Found` if the battle does not exist.
- `409 Conflict`: `Battle is not active`.

### `POST /battles/:id/conclude`

Conclude the active battle.

**Request body:**

```json
{ "result": "players_win" }
```

- `result` (`"players_win" | "monster_wins"`, required).

**Responses:**

- `200 OK` with the concluded battle (`status: "concluded"`, `result`, `concludedAt`). Emits `battle_concluded`.
- `400 Bad Request`: `Field result is required and must be "players_win" or "monster_wins"`.
- `404 Not Found`.
- `409 Conflict`: `Battle is not active`.

### `DELETE /battles/:id`

Discard the active battle (soft delete - sets `status: "discarded"`).

**Responses:**

- `200 OK` with the discarded battle. Emits `battle_discarded`.
- `404 Not Found`.
- `409 Conflict`: `Battle is not active`.

The frontend disables retry on this endpoint to avoid the "successful soft-delete + 5xx network blip → retry sees `status !== active` → 409" sequence.

## Logs (Room History)

### `GET /logs?roomId=&limit=&before=`

Cursor-paginated room history, newest first.

**Query parameters:**

- `roomId` (string, required).
- `limit` (positive integer, optional). Default 50, capped at 100.
- `before` (24-hex Mongo ObjectId, optional). Returns events older than this id.

**Responses:**

- `200 OK`:
  ```json
  [
    {
      "id": "<logId>",
      "roomId": "Frog4521",
      "eventType": "character_updated",
      "actorId": "<characterId>",
      "summary": "Munchqueen updated: level 1 → 2",
      "payload": { /* full event payload as published */ },
      "occurredAt": "<ISO date>",
      "createdAt": "<ISO date>",
      "updatedAt": "<ISO date>"
    }
  ]
  ```
  Clients derive the next cursor from the last entry's `id`. A page shorter than `limit` (including `[]`) means the history is exhausted.
- `400 Bad Request`:
  - `roomId is required`
  - `limit must be a positive integer`
  - `before must be a valid ObjectId`

### `GET /logs/:logId?roomId=`

Read a single log event scoped to a room.

**Responses:**

- `200 OK` with the same shape as a list item.
- `400 Bad Request`:
  - `roomId is required`
  - `logId must be a valid ObjectId`
- `404 Not Found`: `Log event not found` (returned both when the id does not exist and when it belongs to a different room).

### Supported `eventType` values

```text
character_created
character_updated
character_deleted
battle_started
battle_concluded
battle_discarded
```

`battle_updated` events are deliberately not persisted to the room history.

## WebSocket

### `wss://.../ws?roomId=&userId=`

Subscribe to room notifications.

**Connect**:

- The client opens a WebSocket to the URL with `roomId` and `userId` as query parameters.
- Successful connect: server keeps the socket and starts forwarding events.
- On reject (cloud): API Gateway returns 400 if `roomId`/`userId` are missing. The Nginx local proxy returns 1008 with reason `Expected /ws?roomId=<id>&userId=<id>` for invalid connect URLs.

**Server messages**:

The server forwards a strictly minimal envelope. The client never sees the full internal payload:

```ts
type ClientNotification =
  | { event: 'character_created'  | 'character_updated' | 'character_deleted'; event_body: { characterId: string } }
  | { event: 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded'; event_body: { battleId: string } };
```

**Client messages**:

The client may send a `{ "type": "ping" }` heartbeat every 30 seconds (default). The server does not require it; any other message on `$default` is currently a no-op (cloud) or ignored (local).

**Disconnect**:

- Client-initiated `close()` cleans up the connection on the server.
- Server-side cloud cleanup happens via `$disconnect`. Stale connections are pruned when a fanout attempt receives 410 Gone from `ApiGatewayManagementApi.GetConnectionCommand`.

## Error Shapes

All errors use:

```json
{ "message": "<human-readable message>", "details": "<optional - originating error message>" }
```

For 409 on `POST /battles`, an additional field is included:

```json
{ "message": "A battle is already active for this room", "activeBattleId": "<id>" }
```

## OpenAPI Coverage

`docs/openapi/openapi.yaml` references every endpoint above:

- `paths/users.yaml`, `paths/users_{userId}.yaml`
- `paths/rooms.yaml`, `paths/rooms_associations.yaml`
- `paths/characters.yaml`, `paths/characters_{characterId}.yaml`
- `paths/battles.yaml`, `paths/battles_{id}.yaml`, `paths/battles_{id}_conclude.yaml`
- `paths/logs.yaml`, `paths/logs_{logId}.yaml`
- `paths/ws.yaml` (WebSocket connect at `/ws`, modeled with `x-protocol: websocket` and a `serverToClient` schema list for the seven `character_*` and `battle_*` events)

Schemas that describe request and response bodies live under `docs/openapi/schemas/`; parameters under `docs/openapi/parameters/`. The OpenAPI doc is the authoritative shape; this prose contract document is the human-friendly summary of the same surface.
