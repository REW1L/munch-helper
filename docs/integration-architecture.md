# Integration Architecture

## Purpose

This document describes how the three parts of Munch Helper interact: which calls cross which boundaries, what shape the payloads take, and how cloud and local topologies stay in sync. It is the contract document for any change that touches more than one part.

## Integration Topology

```text
              Frontend (iOS / Android / web)
                        │
        ┌───────────────┼────────────────┐
        │HTTPS REST     │HTTPS REST      │WebSocket
        ▼               ▼                ▼
   /users         /rooms /characters    /ws?roomId=&userId=
   /battles       /logs                  ▲
        │               │                │
        └───────┬───────┘                │
                │                        │
                ▼                        ▼
        Backend HTTP API            Backend WS API
        (one Lambda per service)    (RoomNotifications fanout)

Backend internal
  room-service     ──axios POST /characters──►  character-service
  character-service ──SNS publish──► room-character-events ──► RoomNotifications (fanout)
  character-service ──SNS publish──► log-events           ──► LogWriter (persist)
  battle-service   ──SNS publish──► both topics (lifecycle events to log only)
  log-service (read) ◄── HTTP /logs from frontend
```

In local mode, the same flow uses Nginx as the edge and Redis Pub/Sub as the event bus.

## Cross-part Integration Points

| From | To | Type | Details |
|---|---|---|---|
| Frontend | user-service | HTTP | `POST /users`, `GET /users/:userId`, `PATCH /users/:userId` |
| Frontend | room-service | HTTP | `POST /rooms`, `POST /rooms/associations` |
| Frontend | character-service | HTTP | `GET /characters?roomId=`, `POST /characters`, `PATCH /characters/:id`, `DELETE /characters/:id` |
| Frontend | battle-service | HTTP | `GET /battles?roomId=&status=active`, `POST /battles`, `PATCH /battles/:id`, `POST /battles/:id/conclude`, `DELETE /battles/:id` |
| Frontend | log-service | HTTP | `GET /logs?roomId=&limit=&before=`, `GET /logs/:logId?roomId=` |
| Frontend | room-notifications-service | WebSocket | `wss://…/ws?roomId=&userId=`. Receives `{event, event_body}` payloads. |
| room-service | character-service | HTTP (internal) | `POST /characters` to provision the default character on create/join. axios with `CHARACTER_CALL_TIMEOUT_MS` (default 2000ms). |
| character-service | room-notifications-service | SNS / Redis | Topic `room-character-events` (cloud) / channel `room-character-events` (local). |
| character-service | log-service | SNS / Redis | Topic `log-events` (cloud) / channel `room-log-events` (local). |
| battle-service | room-notifications-service | SNS / Redis | Same `room-character-events` topic. battle-service publishes `battle_*` events alongside character events. |
| battle-service | log-service | SNS / Redis | `log-events` topic / `room-log-events` channel. Restricted to lifecycle events: `battle_started`, `battle_concluded`, `battle_discarded` (no `battle_updated`). |
| Frontend (web export) | infrastructure (S3+CloudFront) | static asset upload (Pulumi) | Files written by `expo export --platform web` are uploaded to the S3 bucket; CloudFront proxies `/api/*` and `/ws[*]` back to the backend stack. |
| infrastructure | backend SAM stack | CloudFormation outputs | `aws.cloudformation.getStack({ name: 'munch-helper-user-service' })` reads `ApiBaseUrl` and `WebSocketApiUrl` outputs. |

## Shared Contracts

### Notification Payload (over WebSocket)

The WebSocket forwards a strictly minimal envelope. The full payload is published internally; only `event` and `event_body` are sent to clients.

```ts
type CharacterEventType = 'character_created' | 'character_updated' | 'character_deleted';
type BattleEventType    = 'battle_started' | 'battle_updated' | 'battle_concluded' | 'battle_discarded';

interface ClientNotification {
  event: CharacterEventType | BattleEventType;
  event_body:
    | { characterId: string }   // for character_*
    | { battleId: string };     // for battle_*
}
```

The frontend's `isValidNotificationEvent` (in `frontend/api/webSocket.ts`) is the consumer-side schema check. The backend's `parseNotificationEvent` (in `backend/room-notifications-service/src/app.ts`) is the upstream check. Both must be updated together when adding a new event type.

### Internal Event Payload (over SNS / Redis)

The full event payload published to the bus carries operational fields that are not forwarded to clients:

```ts
interface InternalEventPayload {
  event: string;            // same as eventType
  eventType: string;        // backwards compat alias
  roomId: string;
  actorId: string;          // characterId or battleId depending on event family
  event_body: { characterId: string } | { battleId: string };
  emittedAt: string;        // ISO timestamp
  occurredAt: string;       // ISO timestamp; same as emittedAt at publish time
  correlationId?: string;
  // For character_*:
  character?: { id, name, avatarId, color };
  changes?: Record<string, { prev: unknown; next: unknown }>;
  // For battle_*:
  battle?: { id, name, status, result, playerSide, monsterSide };
}
```

The `log-service` consumer reads `actorId`, `roomId`, `eventType`, `payload`, and `occurredAt` (or `emittedAt` as fallback) and produces a `LogEvent` document. It also computes a `summary` string at write time so the read API does not have to.

### Room/Character/Battle/Log Resource Shapes

See [Data Models - Backend](./data-models-backend.md) for the schema definitions and [API Contracts - Backend](./api-contracts-backend.md) for HTTP request/response shapes.

## Cross-environment Mapping

| Concern | Local | Cloud |
|---|---|---|
| HTTP entrypoint | Nginx on `localhost:8080` (`/users`, `/rooms`, `/characters`, `/battles`, `/logs`) | API Gateway HTTP API stage `api` (CloudFront `/api/*` → API Gateway) |
| WebSocket | Nginx WS upgrade on `localhost:8080/ws` → `room-notifications-service:8085` | API Gateway WebSocket API stage `ws` (CloudFront `/ws[*]` → API Gateway WS) |
| Notifications transport | Redis Pub/Sub channel `room-character-events` | SNS topic `${stack}-room-character-events` |
| Log transport | Redis Pub/Sub channel `room-log-events` | SNS topic `${stack}-log-events` |
| Connection storage | In-memory `Map<WebSocket, {roomId, userId}>` | Mongo collection `roomconnections` (`RoomConnection` model) |
| MongoDB | One container per service (ports 27021..27025) | MongoDB Atlas with `MONGODB-AWS` IAM auth |
| Route prefix | none | `/api/` (set via SAM `RoutePrefix` parameter; stripped at runtime by each Express app) |
| TLS | none | CloudFront → API Gateway HTTPS only |
| CORS | Nginx adds `Access-Control-Allow-*` headers explicitly | HTTP API CORS configuration on the SAM template (`https://helpamunch.click` allow-list) |

The `EXPO_PUBLIC_API_URL` env on the frontend is the single switch that decides which environment the client targets:

- Dev: `http://localhost:8080`
- Production: `https://helpamunch.click`

The frontend's `frontend/api/webSocket.ts::RoomWebSocketClient.connect` rewrites the URL with `http(s) → ws(s)` and strips a trailing `/api` if present, so a single `EXPO_PUBLIC_API_URL=https://helpamunch.click/api` style URL would still produce a valid WebSocket origin. In current configs the URL has no `/api` suffix because CloudFront does the routing.

## Lifecycle Sequences

### Room creation

```text
client                  room-service             character-service
  │   POST /rooms          │                         │
  │ ───────────────────────►                         │
  │                        │  1. Mongo: insert Room  │
  │                        │  2. POST /characters    │
  │                        │ ───────────────────────► (axios, 2s timeout)
  │                        │                         │  Mongo: insert Character
  │                        │                         │  publish character_created → notifications + log
  │                        │  3. Mongo: insert       │
  │                        │     RoomAssociation     │
  │                        │                         │
  │   201 with {roomId,    │                         │
  │             characterId}                         │
  │ ◄──────────────────────                          │
```

If the character call fails, room-service rolls back: `deleteMany({ roomId })` for associations and `deleteOne({ _id: room.id })` for the room. Returns 502 with the upstream error message.

### Character update propagation

```text
client A                          character-service                 room-notifications-service                client B
   │  PATCH /characters/:id           │                                       │                                  │
   │ ────────────────────────────────►                                       │                                  │
   │                                  │  1. Mongo findById (pre-read)        │                                  │
   │                                  │  2. Mongo findByIdAndUpdate          │                                  │
   │                                  │  3. publisher.publish(character_updated)
   │                                  │     ├──► notifications topic ────────►│  fanout to all WS for roomId    │
   │                                  │     │                                  │ ────────────────────────────────►│
   │                                  │     └──► log topic ──► LogWriter persist
   │   200 OK                         │                                       │                                  │
   │ ◄────────────────────────────────                                       │                                  │
```

Client A receives both:
- the HTTP 200 response with the updated character (used for optimistic-update reconciliation), and
- the WebSocket echo `character_updated` (suppressed via the per-character "suppressible echo" marker so we don't flash the card border for our own update).

Client B receives only the WebSocket echo and reflects the change after invalidating the `['characters', roomId]` query.

### Battle conclude

`POST /battles/:id/conclude` does an atomic `findOneAndUpdate({ _id, status: 'active' }, { status: 'concluded', result, concludedAt })`. If no document matches, the service does a follow-up `findById` to distinguish 404 (truly missing) from 409 (already concluded).

The `battle_concluded` event flows through both legs:
- notifications: forwarded to WS clients (UI dismisses the active-battle banner and the battle modal).
- log: persisted as a `LogEvent`.

## Failure Modes and Recovery

### HTTP failures

`apiRequest` retries 408/429/5xx once by default. The discard-battle path opts out (`retryCount: 0`) to avoid the "successful soft-delete + 5xx network blip → retry sees no active battle → 409" pitfall. New mutation paths should follow the same logic when idempotency is not free.

### WebSocket failures

`RoomWebSocketClient` reconnects with exponential backoff (3s, 6s, 12s, 24s, 48s by default; up to 5 attempts). When the WebSocket reconnects (`onOpen`), `useRoomCharacters` and `useRoomBattle` re-invalidate their queries to re-sync. The hook also tracks `isReconnecting` (stale state) and `isTimedOut` (>8s without recovery; surfaces a manual retry button).

In cloud mode, API Gateway can return `410 Gone` when a connection has expired. `room-notifications-service::sendEventToConnections` maps that to a `removeConnection(connectionId)` call so subsequent fanouts skip it.

### Event publish failures

`FanoutCharacterEventPublisher` and `FanOutBattleEventPublisher` use `Promise.allSettled` so a failing leg never blocks the other. Failures are logged through `logSupportFailure` with subsystem (`character` / `battle`) and code (`character_event_publish_failed` / `battle_event_publish_failed`), correlation id, room, and actor id. There is no automatic retry on the publish side - failures are recorded and the original HTTP response still reflects the database state.

### Log persistence failures

`LogWriterFunction` (cloud) or the local `log-service` Redis subscriber catches `persistLogEvent` failures and emits `support.failure` with code `log_persist_failed`. Failed events are not requeued automatically; SNS does not redrive without explicit configuration.

## Schema Evolution Rules

These cross-part contracts must change atomically:

1. **Notification event types**. New event types require updates in:
   - `backend/<publisher>-service/src/publisher.ts` (define the payload factory + event union)
   - `backend/room-notifications-service/src/app.ts::parseNotificationEvent` (validation)
   - `backend/room-notifications-service/src/types.ts` (notification union)
   - `frontend/api/webSocket.ts::isValidNotificationEvent` (client validation)
   - `frontend/api/webSocket.ts::CharacterEventType` / `BattleEventType` (client union)
   - frontend hook(s) that subscribe (`useRoomCharacters`, `useRoomBattle`).
2. **Log event types**. Add the new value to `backend/log-service/src/models/LogEvent.ts::LogEventType` enum and to `SUPPORTED_LOG_EVENT_TYPES` in `backend/log-service/src/service.ts`. Frontend's `LogEntry` component already falls back gracefully to a neutral "summary only" row for unknown types, so it survives a backend-only addition - but a coordinated frontend update is required to render the new type richly.
3. **API resource shapes**. PATCH endpoints accept partial updates already; adding a new optional field is non-breaking. Adding a required field is breaking and requires a coordinated frontend rollout.
4. **Route paths**. Adding a new route to a service requires updating `backend/nginx/nginx.conf` (local) and `backend/sam/template.yaml` (cloud). The infrastructure stack does not need to change unless the new path needs a different origin.
5. **Stack outputs.** The Pulumi stack reads `ApiBaseUrl` and `WebSocketApiUrl` from the backend SAM stack. Renaming or removing those outputs requires a coordinated update of `infrastructure/index.ts`.

## Local Bring-up Sequence

To stand up everything end-to-end on a fresh machine:

```bash
# 1. Backend (services + nginx + Mongo + Redis)
cd backend && cp .env.example .env && ./scripts/dev-up.sh

# 2. Frontend (against local backend)
cd frontend && npm ci && echo "EXPO_PUBLIC_API_URL=http://localhost:8080" > .env && npm run start
```

Health probes:

- `curl http://localhost:8080/health` → `{ "service": "nginx", "status": "ok" }`
- `curl http://localhost:8082/health` → `{ "service": "user-service", "status": "ok" }` (etc., per service)
- A WebSocket smoke test: `wscat -c "ws://localhost:8080/ws?roomId=Test1234&userId=user-1"`

Tear down: `cd backend && ./scripts/dev-down.sh`. The compose stack does not delete Mongo volumes by default (named volumes `mongo-*-data`).

## Cross-cutting Concerns

- **CORS**: Nginx handles preflight in local mode; API Gateway HTTP API config does it in cloud. Both allow `https://helpamunch.click`. When testing the web export against the local backend, set `EXPO_PUBLIC_API_URL=http://localhost:8080` and Nginx accepts `*` origins.
- **Correlation IDs**: Originate at character-service or battle-service from `x-correlation-id` / `x-request-id` (sanitized). Propagated to event payloads. The frontend currently does not generate or send correlation ids.
- **Time**: All timestamps are UTC ISO strings.
- **Pagination**: Only the room history (log) endpoint paginates. Cursor is the last `LogEvent.id` (a 24-hex Mongo ObjectId), passed back as `before=<id>`. A short page (`length < limit`) signals exhaustion.
- **Identity**: Every request that needs a user includes `userId` in the body or query string. There is no JWT or session middleware. This is intentional for the current product stage.
