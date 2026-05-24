# Architecture - Backend

## Executive Summary

The backend is a service-oriented Node.js + TypeScript codebase organized as an npm workspace with six Express microservices and an Nginx edge layer. Each service is dual-targeted: it ships as a long-running container locally and as an AWS Lambda function in production. Operational concerns - real-time fanout, room-history persistence, CORS, route prefixing, structured failure logging - are factored into reusable seams so the service code stays small.

Local and cloud topologies are intentionally close: the same Express apps run unchanged behind both Nginx (local) and API Gateway (cloud); the same notification payload shape flows through both Redis Pub/Sub (local) and Amazon SNS (cloud).

## Technology Stack

| Category | Technology | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 20.x | Pinned in CI (`backend-ci-cd.yml`) and SAM (`Runtime: nodejs20.x`). |
| Language | TypeScript | 5.9.x | `strict: false` across services (per project-context); module: `NodeNext`. |
| HTTP framework | Express | ^5.1.0 | Same major version in every service. |
| ORM | Mongoose | ^8.19.1 | One Mongoose connection per service; deduped via shared `db.ts`. |
| Datastore | MongoDB | 7 | Per-service database; one Mongo container per service in local mode. |
| Real-time transport (cloud) | API Gateway WebSocket + AWS SDK v3 (`@aws-sdk/client-apigatewaymanagementapi`) | latest | Cloud only; the room-notifications Lambda manages connections via this SDK. |
| Real-time transport (local) | `ws` 8.x | ^8.18.3 | Local-only WebSocket server inside `room-notifications-service`. |
| Pub/Sub (cloud) | Amazon SNS via `@aws-sdk/client-sns` | latest | Two topics: `room-character-events` and `log-events`. |
| Pub/Sub (local) | Redis 7 + `redis` (node-redis 5) | ^5.8.2 | Channels: `room-character-events`, `room-log-events`. |
| Lambda adapter | `@codegenie/serverless-express` | ^4.17.1 | Wraps the same Express app for API Gateway HTTP API. |
| HTTP client | axios (room-service) | ^1.12.2 | Used only for room→character internal call; everything else is direct HTTP from clients. |
| Code generation utility | `random-words` (room-service) | ^2.0.1 | Source of room-id slugs (e.g., `Frog4521`). |
| Testing | Vitest + supertest | 3.2.4 / 7.1.4 | Single root Vitest project across all services. v8 coverage; threshold `lines >= 70`. |
| IaC | AWS SAM CLI | latest | `sam build` (esbuild bundler) + `sam deploy`. |
| Edge (local) | Nginx 1.27-alpine | container | Single client entrypoint with CORS handling and WS upgrade. |

Backend Node version differs from the frontend (Node 24+ for the Expo app); never assume parity.

## Architecture Pattern

**Service per bounded context with shared scaffolding**. The six services - `user-service`, `room-service`, `character-service`, `battle-service`, `room-notifications-service`, `log-service` - share zero code at the package level (each has its own `package.json`, lockfile is the parent's), but follow the same internal layout so a developer who knows one knows them all.

### Common Internal Shape

```text
<service>/src/
├── index.ts          # Local server bootstrap. Reads env, builds dependencies, starts http listener.
├── lambda.ts         # SAM/Lambda entrypoint. Same dependencies wired to AWS resources, wrapped with serverless-express.
├── app.ts            # Express app builder. Pure: takes injected models and (optionally) publisher.
├── service.ts        # Mongoose-backed factory for the model interfaces declared in app.ts.
├── db.ts             # Shared singleton Mongoose connection (deduped concurrent connect attempts).
├── supportSignal.ts  # Structured failure logger (subsystem + code enum).
├── publisher.ts      # (character + battle + room-notifications) Pub/Sub abstractions.
└── models/*.ts       # Mongoose schemas + indexes.
```

`app.ts` accepts Model interfaces (e.g., `UserModelLike`, `BattleModelLike`) instead of concrete Mongoose models. Tests substitute lightweight implementations; production wires Mongoose. This is the project's single most important pattern - keep it intact when adding new services.

### Lambda Route-Prefix Stripping

Every service that exposes HTTP routes accepts a `ROUTE_PREFIX` env (defaults to `/`). When the prefix is non-trivial, an Express middleware strips it from `req.url` before the route matcher runs:

```ts
if (routePrefix !== '/') {
  app.use((req, _res, next) => {
    if (req.url === routePrefix) req.url = '/';
    else if (req.url.startsWith(`${routePrefix}/`)) req.url = req.url.slice(routePrefix.length) || '/';
    next();
  });
}
```

This keeps the route handlers identical between local mode (no prefix) and SAM cloud mode (prefix `/api/` based on `samconfig.toml`). When adding a new route, write it without the prefix.

## Data Architecture

Each service owns a private MongoDB database. There is no shared schema and no cross-service Mongo access. Cross-service consistency is enforced at the application layer, not at the database layer.

### Datastores

| Service | Local Mongo | Cloud Mongo |
|---|---|---|
| user-service | `mongo-user` (host port 27021) | MongoDB Atlas via `MONGODB-AWS` auth (`UserMongoUri`) |
| room-service | `mongo-room` (27022) | Atlas (`RoomMongoUri`) |
| character-service | `mongo-character` (27023) | Atlas (`CharacterMongoUri`) |
| battle-service | `mongo-battle` (27024) | Atlas (`BattleMongoUri`) |
| log-service | `mongo-log` (27025) | Atlas (`LogMongoUri`) |
| room-notifications-service | shares an Atlas DB for connection records | Atlas (`RoomNotificationsMongoUri`) |

See [Data Models - Backend](./data-models-backend.md) for the schema-level breakdown.

### Connection Singleton (`db.ts`)

All services use the same idempotent connect pattern:

```ts
let connectionPromise = null;
async function connectToMongo(uri) {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri).catch(err => { connectionPromise = null; throw err; });
  }
  await connectionPromise;
}
```

Lambdas call `connectToMongo` on every invocation, but the singleton makes that a no-op after warm start. The `.catch` clears the promise so a transient failure does not poison the connection forever.

## API Design

The five HTTP-exposed services together provide the public REST surface:

| Method | Path | Service | Purpose |
|---|---|---|---|
| GET | `/health` | each service | Liveness check |
| POST | `/users` | user-service | Create a user |
| GET | `/users/:userId` | user-service | Read a user |
| PATCH | `/users/:userId` | user-service | Update name and/or avatarId |
| POST | `/rooms` | room-service | Create a room (provisions default character) |
| POST | `/rooms/associations` | room-service | Join a room (idempotent on `(roomId, userId)`) |
| GET | `/characters?roomId=` | character-service | List characters in a room |
| POST | `/characters` | character-service | Create a character |
| PATCH | `/characters/:characterId` | character-service | Patch character fields (no-op-resistant; emits `character_updated`) |
| DELETE | `/characters/:characterId` | character-service | Delete a character |
| GET | `/battles?roomId=&status=active` | battle-service | Fetch the active battle (or `null`) |
| POST | `/battles` | battle-service | Start a battle (409 if one is active) |
| PATCH | `/battles/:id` | battle-service | Patch name/playerSide/monsterSide |
| POST | `/battles/:id/conclude` | battle-service | Conclude with `players_win` / `monster_wins` |
| DELETE | `/battles/:id` | battle-service | Discard the active battle |
| GET | `/logs?roomId=&limit=&before=` | log-service | Cursor-paginated room history |
| GET | `/logs/:logId?roomId=` | log-service | Read a single log event scoped to a room |
| WS | `/ws?roomId=&userId=` | room-notifications-service | Subscribe to room notifications |

Full request/response shapes are in [API Contracts - Backend](./api-contracts-backend.md). The OpenAPI spec under `docs/openapi/` covers the user, room, character paths and `DELETE /battles/{id}` only - the other battle paths and the log endpoints are intentionally deferred (`docs/openapi/openapi.yaml` says so explicitly).

### Validation Pattern

Each route handler is hand-written validation, not a schema library. Conventions:

- Reject early with `res.status(400).json({ message })` for bad request bodies; never throw to the error middleware for known shape issues.
- Trim string fields before persisting.
- Use `Object.prototype.hasOwnProperty.call(body, key)` to detect "absent vs explicit undefined" on PATCH so partial updates work.
- Mongoose `CastError` is caught and translated to `404 Not Found` (treating malformed ids as misses, not 5xx).
- Mongo `code: 11000` (duplicate key) on associations is translated to a 200 with `alreadyJoined: true` (room-service) or to a 409 with `activeBattleId` (battle-service double-start race).

### Correlation IDs (character-service, battle-service)

Both services attach a correlation id middleware that:

1. Reads `x-correlation-id` or `x-request-id` from the inbound request, sanitizes ASCII control characters with a `replace(/[\x00-\x1F\x7F]/g, '')` step (header-injection guard).
2. Falls back to `randomUUID()` when neither is present.
3. Echoes the value back via `res.setHeader('x-correlation-id', …)` and stores it in `res.locals.correlationId` so publishers can attach it to event payloads.

`logSupportFailure` always carries the correlation id, so a failure on the publish side can be tied to the original HTTP request through CloudWatch.

## Real-time Event Architecture

Events flow through a fanout publisher. Both `character-service` and `battle-service` build a `FanOut*EventPublisher` with two legs - `notifications` and `log` - so a single domain action ends up in two destinations:

```text
HTTP request                    publisher.publish(payload)
       │                                  │
       ▼                                  ├─► notifications leg (SNS topic / Redis channel)
   Mongo write                            │       │
                                          │       ▼
                                          │   room-notifications-service fanout to WS
                                          │
                                          └─► log leg (SNS topic / Redis channel)
                                                  │
                                                  ▼
                                              log-service persists LogEvent
```

The fan-out wraps each leg with `Promise.allSettled` so a failing leg never blocks the other. Publish failures are logged through `logSupportFailure` with the relevant subsystem (`character` / `battle`), correlation id, and `event_publish_failed` codes. The `battle-service` fan-out additionally restricts the `log` leg to lifecycle events (`battle_started`, `battle_concluded`, `battle_discarded`) to keep mid-battle PATCH noise out of room history; the notifications leg gets every event including `battle_updated`.

### Notification Payload Shape

Every notification event uses the same envelope (see `frontend/api/webSocket.ts` for the matching consumer):

```jsonc
{
  "event": "character_updated",            // also CHANGED to eventType in newer payloads
  "eventType": "character_updated",
  "roomId": "Frog4521",
  "actorId": "<characterId or battleId>",
  "event_body": { "characterId": "..." }, // or { "battleId": "..." }
  "emittedAt": "2026-05-24T00:00:00.000Z",
  "occurredAt": "2026-05-24T00:00:00.000Z",
  "correlationId": "<uuid>",
  "character": { "id": "...", "name": "...", "avatarId": 0, "color": "#A2B4C6" },
  "changes": { "level": { "prev": 1, "next": 2 } } // optional, only on character_updated
}
```

Only the `event` and `event_body` fields are forwarded over the wire to the WS client; the rest is for the log writer and observability. `room-notifications-service/src/app.ts` enforces this at the boundary - any field outside `{ event, event_body }` is dropped before fanout.

## Component Overview

### user-service

The simplest service. Owns the `User` schema, exposes create/read/update. No event publisher, no axios client. Validates that `name` is a non-empty string and `avatarId` is a number.

### room-service

Owns the `Room` and `RoomAssociation` schemas. Two endpoints, both call out to character-service:

- `POST /rooms`: creates the room (auto-id via `random-words` with up to 5 retries on duplicate slug), then calls character-service to provision a default character for the owner. If character creation fails, both the room and any association are rolled back and a 502 is returned.
- `POST /rooms/associations`: idempotent. If the user is already in the room, returns 200 with `alreadyJoined: true`; otherwise provisions a default character and creates the association. Falls back gracefully on a unique-key 11000 race.

The default character's color is computed deterministically from `userId` (or, if absent, `roomId:userName`) so the same user always gets the same color.

### character-service

Largest service by route count. Owns the `Character` schema. Class/race/gender are stored as JSON-encoded strings (legacy shape) and the frontend parses them back into arrays. Color must match `^#[0-9a-fA-F]{6}$`; invalid colors fall back to a deterministic hash of the character id at response time. Every successful mutation publishes through the `FanoutCharacterEventPublisher`.

PATCH builds a `changes` diff between the pre-update document and the post-update document using `Object.is` semantics, then includes only fields that actually changed. The pre-update read is enrichment-only - if it fails, the update still proceeds and `changes` is omitted. This is by design: keeping the pre-read non-blocking is what makes the update path resilient to transient Mongo read failures.

### battle-service

Owns the `Battle` schema with a partial unique index on `(roomId, status='active')`. The double-start race is handled with two attempts:

```ts
for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS && !battle; attempt += 1) {
  const active = await findOne({ roomId, status: 'active' });
  if (active) return res.status(409).json({ activeBattleId: active.id });
  try {
    battle = await create({...});
  } catch (e) {
    if (isDuplicateKeyError(e)) continue; // re-check on the next iteration
    throw e;
  }
}
```

`isDuplicateKeyError` inspects three locations - top-level `code`, `cause.code`, and `writeErrors[0].code` - because Mongo surfaces 11000 differently for single vs bulk vs versioned writes.

`PATCH /battles/:id` is restricted to `active` battles. `POST /battles/:id/conclude` and `DELETE /battles/:id` use `findOneAndUpdate({ _id, status: 'active' }, …)` to atomically transition state and detect already-concluded races (returns 409 with the same shape).

The default error handler maps `entity.parse.failed` to 400 and everything else to 502 (intentional - battle service treats unhandled errors as upstream/dependency failures). Other services map unhandled errors to 500.

### room-notifications-service

Owns the `RoomConnection` schema (cloud only - local mode keeps connections in-memory). Two completely separate code paths:

- **Local** (`index.ts`): native `ws` server, parses `/ws?roomId=…&userId=…`, subscribes to the Redis channel, broadcasts to all sockets whose stored `roomId` matches.
- **Cloud** (`lambda.ts`): handles four event types in one Lambda:
  - SNS records (deliver to subscribed connections via `ApiGatewayManagementApi`),
  - WebSocket `$connect` (upsert connection),
  - `$disconnect` (remove connection),
  - `$default` (currently a no-op that returns 200).

`sendEventToConnections` calls `GetConnectionCommand` first to detect stale connections; a 410 Gone deletes the row and skips. Other failures are logged via `logSupportFailure` with subsystem `session_continuity` and code `ws_event_delivery_failed`.

`parseNotificationEvent` is the single source of truth for which events are valid notifications. Add a new event type here when introducing one.

### log-service

Different from the others: it has both an HTTP read API (Express + Mongoose) and a separate write path that subscribes to a queue. Two Lambda entrypoints exist:

- `subscriber.ts` (Lambda `LogWriterFunction`): reads SNS records, calls `parseLogEvent` then `persistLogEvent`. Required env: `LOG_TOPIC_ARN`.
- `lambda-read.ts` (Lambda `LogReaderFunction`): wraps the Express app for `GET /logs` + `GET /logs/:logId`.

Locally, both run inside a single `index.ts` process: an HTTP server on port 8087 plus a Redis subscription on `ROOM_LOG_EVENTS_CHANNEL` (default `room-log-events`).

`buildSummary` produces a human-readable line per event type at write time so the read API is fast and presentational logic stays out of the frontend (the frontend uses `summary` as fallback when payload introspection fails). Read paginates with `_id < before` for stable cursor ordering and clamps `limit` to 100 (default 50).

## Source Tree

See [Source Tree Analysis](./source-tree-analysis.md#backend) for the full annotated tree.

## Development Workflow

See [Development Guide - Backend](./development-guide-backend.md) for commands. Quality gates that the CI workflow enforces:

1. `npm ci` at `backend/`.
2. `docker build` per service (verifies Dockerfile + tsx-friendly install).
3. `npm run typecheck -w <service>` per service.
4. `npx vitest run <service> --config vitest.config.ts` per service that has tests (currently all six).
5. `npm run test:coverage` from `backend/` (single coverage gate enforces `lines >= 70`).

## Deployment Architecture

`sam/template.yaml` defines the production topology. See [Deployment Guide](./deployment-guide.md) for the full procedure. Highlights:

- Two SNS topics scoped per stack (`${stack}-room-character-events`, `${stack}-log-events`).
- Six Lambdas (one per service) plus the LogWriterFunction (`subscriber.handler`) and LogReaderFunction (`lambda-read.handler`).
- One HTTP API stage (`api`) with explicit allow-list for `https://helpamunch.click`.
- One WebSocket API stage (`ws`) with `$connect`, `$disconnect`, `$default` routes all integrated to `RoomNotificationsFunction`.
- Per-service IAM role with the minimum policies needed: `AWSLambdaBasicExecutionRole` + `AWSXRayDaemonWriteAccess` for everyone; `sns:Publish` to the two topics for character + battle services; `execute-api:ManageConnections` for the room notifications role.

The deploy step runs from `backend-ci-cd.yml`, OIDC-assumes the `AWS_DEPLOY_ROLE_NAME` role, and runs `sam deploy --config-file sam/samconfig.toml` with secrets bound to `*MongoUri` parameters.

## Testing Strategy

Single Vitest project at `backend/vitest.config.ts` covers all six services with `environment: node`, v8 coverage, and `lines >= 70` threshold. Tests are colocated with sources (`src/*.test.ts`).

Conventions observed across the test files (see e.g., `character-service/src/app.test.ts`, `battle-service/src/app.test.ts`):

- Tests inject in-memory model implementations into `createApp` instead of mocking Mongoose. This is why every service's `app.ts` exports both the model interfaces and the `createApp` factory.
- Publisher legs are mocked with explicit `vi.fn()` to assert on payload shape (especially `eventType`, `event`, `actorId`, `event_body`, and the optional `changes` map).
- Supertest drives the Express apps directly; no live HTTP server is needed.
- `index.ts` and `models/**/*.ts` are excluded from coverage to keep the gate focused on testable behavior.

Tests for the SAM Lambda paths exist (e.g., `lambda.test.ts` per service), confirming the `serverlessExpress` wiring + `connectToMongo` integration. Real AWS clients are stubbed.

## Known Constraints and Tradeoffs

- **Backend TypeScript is `strict: false`** and uses NodeNext module resolution. Frontend is `strict: true`. Do not normalize.
- **No shared types between services**. Adding a `shared/` workspace is an explicit non-goal until duplicate types appear in three or more places.
- **No JWT or session middleware.** Authentication is currently anonymous; `userId` comes from the client. Anything that depends on identity (rooms, characters, battles) trusts the client to send the right id. This is intentional for the current product stage.
- **`structured: false` log shape.** `logSupportFailure` writes to `console.error` with a short tag (`support.failure`) and a JSON-like body. CloudWatch consumers should grep on the tag.
- **Local Redis is not a queue.** A character event published while no notifications subscriber is running is lost (Redis Pub/Sub fire-and-forget). SNS in cloud mode also fans out without a queue, so retry logic is per-subscriber. Logs missed by the LogWriter cannot be replayed without re-publishing.
- **Battle PATCH does not detect partial conflicting updates** — if two clients PATCH simultaneously, last-write-wins. The 409 path only handles "battle is no longer active".

## Adding a New Service

1. Copy an existing service folder as the template (battle-service is the most feature-complete example).
2. Add the workspace to `backend/package.json#workspaces`.
3. Add a Mongo container to `backend/docker-compose.local.yml` and an upstream + location to `backend/nginx/nginx.conf`.
4. Add a Lambda + IAM role + HTTP API integration to `backend/sam/template.yaml`. Use esbuild metadata; do not hand-bundle.
5. Add the service to the build matrix and (optionally) the coverage tracker in `backend/vitest.config.ts`.
6. Add a CI matrix entry to `.github/workflows/backend-ci-cd.yml` (`build_and_test` job).
7. Document the new endpoints in `docs/openapi/` and `docs/api-contracts-backend.md`.
