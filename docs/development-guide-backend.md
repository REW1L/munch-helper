# Development Guide - Backend

## Prerequisites

- Node.js 20+ (CI pins 20). Use `nvm install 20 && nvm use 20` or equivalent.
- npm 10+.
- Docker + Docker Compose (Compose v2, invoked as `docker compose`).
- AWS SAM CLI (only required for the SAM local/deploy flows).
- AWS credentials configured via `aws configure`, `aws sso login`, or environment variables (only required for `sam:deploy`).

## Local Setup

The backend is a single npm workspace at `backend/`. Install once at that root:

```bash
cd backend
cp .env.example .env
npm ci
```

`.env` defaults are wired to the Docker Compose container hostnames - matching the host port mappings in `docker-compose.local.yml`. There is nothing secret in the file; do not check in changes that override the defaults locally.

## Running the Stack

The standard local flow is the Docker Compose stack: it boots Nginx, all six services, five Mongo containers, and Redis.

```bash
cd backend
./scripts/dev-up.sh    # docker compose up --build -d
```

Endpoints (host):

| URL | Service |
|---|---|
| `http://localhost:8080` | Nginx edge (single client entrypoint) |
| `http://localhost:8082` | user-service |
| `http://localhost:8083` | room-service |
| `http://localhost:8084` | character-service |
| `http://localhost:8085` | room-notifications-service (HTTP unused; WS available at `/ws`) |
| `http://localhost:8086` | battle-service |
| `http://localhost:8087` | log-service |
| `mongodb://localhost:27021..27025` | one Mongo per service |
| `redis://localhost:6379` | Redis Pub/Sub |

Smoke checks:

```bash
curl http://localhost:8080/health
curl http://localhost:8082/health
curl http://localhost:8083/health
curl http://localhost:8084/health
curl http://localhost:8086/health
curl http://localhost:8087/health
```

To stop:

```bash
./scripts/dev-down.sh
```

Mongo data persists in named volumes (`mongo-user-data`, etc.). To wipe state, run `docker compose down -v` from `backend/`.

## Running Without Docker

The npm workspace also exposes per-service local servers that talk to whatever Mongo/Redis you point them at via env vars. Two options:

### All services in one terminal

```bash
cd backend
npm run dev
```

This uses `concurrently` to start six `tsx watch` processes. You will need:

- A Mongo instance reachable per service (`USER_MONGO_URI`, `ROOM_MONGO_URI`, `CHARACTER_MONGO_URI`, `BATTLE_MONGO_URI`, `LOG_MONGO_URI`, `ROOM_NOTIFICATIONS_MONGO_URI`).
- Redis at `REDIS_URL` (room-notifications, log-service) and `CHARACTER_EVENTS_REDIS_URL` / `BATTLE_EVENTS_REDIS_URL` (character, battle).
- The right ports free (8082..8087).

You will not get the Nginx edge this way - clients would need to call each service directly, which means CORS handling is the client's problem. Prefer the Compose stack for client testing.

### Single service in dev mode

```bash
cd backend
npm run dev -w character-service       # tsx watch src/index.ts
```

Or `npm start -w character-service` for one-shot.

Run a typecheck without starting the server:

```bash
cd backend
npm run typecheck                      # all services in series
npm run typecheck -w character-service # one service
```

## SAM Local

The same Express apps can run behind SAM's API Gateway emulator without the Compose stack. From `backend/`:

```bash
npm run sam:build       # esbuild bundles each Lambda
npm run sam:local:api   # starts http://localhost:3000 with the SAM template
```

The `sam:local:api` script wires the Mongo URIs to the local Compose ports (`27021..27025` over `host.docker.internal`) so you can keep using the Compose Mongo containers under SAM emulation. There are also one-off `sam:invoke:user:health/create/update` scripts that fire sample events from `sam/events/`.

## Tests

Single Vitest project (one config: `backend/vitest.config.ts`). Coverage gate: `lines >= 70`.

```bash
cd backend
npm test                               # vitest run
npm run test:coverage                  # vitest run --coverage; HTML at backend/coverage/index.html
```

Filter by service:

```bash
cd backend
npx vitest run user-service
npx vitest run --reporter verbose battle-service
```

Conventions:

- Tests are colocated with sources (`backend/<service>/src/*.test.ts`).
- Tests inject in-memory model implementations into `createApp()` instead of mocking Mongoose; the service interfaces (`UserModelLike`, `BattleModelLike`, etc.) exist precisely for this.
- Publishers are mocked with `vi.fn()` so we can assert payload shapes (especially `eventType`, `actorId`, `event_body.characterId`/`battleId`, `changes`).
- Lambda paths (`<service>/src/lambda*.test.ts`) verify the SAM handler wiring with stubbed AWS clients.

When adding a new feature, add tests for:

1. Each happy-path route in `app.test.ts` (status code + body + side effects).
2. The validation branches that produce 400.
3. Boundary cases for the persistence path in `service.test.ts` if it has interesting logic (e.g., the room-id retry, the duplicate-key recovery).
4. The publisher payload factory (`publisher.test.ts`) - especially when adding new fields.

## Adding a Backend Service

1. Copy an existing service folder. `battle-service` is the most feature-complete template; `user-service` is the simplest.
2. Update `package.json` (`name`, scripts) and `tsconfig.json` (`include`).
3. Add the service to `backend/package.json#workspaces`.
4. Add a Mongo container to `docker-compose.local.yml` and a service container that builds the new folder.
5. Add an Nginx upstream + location to `nginx/nginx.conf`.
6. Add a Lambda + IAM role + HTTP API event integration to `sam/template.yaml`. Use the existing services as the template; keep the `BuildMethod: esbuild` block.
7. Add a CI matrix entry in `.github/workflows/backend-ci-cd.yml`.
8. Document the new endpoints in `docs/api-contracts-backend.md` and (eventually) `docs/openapi/`.

## Environment Variables (per service)

| Variable | Default | Used by |
|---|---|---|
| `USER_SERVICE_PORT` | 8082 | user-service local |
| `ROOM_SERVICE_PORT` | 8083 | room-service local |
| `CHARACTER_SERVICE_PORT` | 8084 | character-service local |
| `ROOM_NOTIFICATIONS_PORT` | 8085 | room-notifications-service local (legacy `ROOM_NOTIFICATIONS_SERVICE_PORT` also accepted) |
| `PORT` | 8086 / 8087 | battle-service / log-service local (each defaults to its own value) |
| `USER_MONGO_URI` / `ROOM_MONGO_URI` / `CHARACTER_MONGO_URI` / `BATTLE_MONGO_URI` / `LOG_MONGO_URI` / `ROOM_NOTIFICATIONS_MONGO_URI` | local-friendly defaults | each service connects on bootstrap |
| `CHARACTER_SERVICE_URL` | `http://localhost:8083` | room-service axios call (note: the room→character call goes from room-service:8083 to character-service URL, even though room-service binds the same port - see service.ts) |
| `CHARACTER_CALL_TIMEOUT_MS` | 2000 | room-service axios timeout |
| `CHARACTER_EVENTS_REDIS_URL` / `BATTLE_EVENTS_REDIS_URL` | unset | When set, character/battle services publish to Redis. When unset, they fall back to a noop publisher (see `publisher.ts`). |
| `REDIS_URL` | `redis://localhost:6379` | room-notifications-service local subscriber, log-service local subscriber |
| `ROOM_CHARACTER_EVENTS_CHANNEL` | `room-character-events` | shared channel name |
| `ROOM_LOG_EVENTS_CHANNEL` | `room-log-events` | shared channel name |
| `ROOM_CHARACTER_EVENTS_TOPIC_ARN` | unset | cloud only - Lambda publish target for character + battle services |
| `LOG_TOPIC_ARN` | unset | cloud only - Lambda publish target for log events; required by `LogWriterFunction` |
| `ROOM_NOTIFICATIONS_WS_ENDPOINT` | unset | cloud only - the `https://<id>.execute-api...` URL used to call back into the WebSocket API |
| `ROUTE_PREFIX` | `/` | Lambda apps strip this prefix before routing. SAM sets this to `/api/`. |

## Common Tasks

### Inspect the Mongo state of a single service

```bash
docker exec -it munch-mongo-character mongosh munch_character_service
> db.characters.find().pretty()
```

### Tail a single service's logs

```bash
docker compose -f backend/docker-compose.local.yml logs -f character-service
```

### Manually publish a Redis event for testing

```bash
docker exec -it munch-redis redis-cli PUBLISH room-character-events '{"event":"character_updated","roomId":"Frog4521","event_body":{"characterId":"abc"},"emittedAt":"2026-05-24T00:00:00.000Z"}'
```

The room-notifications-service should pick it up and fan it out to any active WS subscribers for `Frog4521`.

### Replay a SAM event locally

```bash
cd backend
npm run sam:invoke:user:create
```

Sample events live in `sam/events/`. To craft a new event quickly: capture an HTTP API request via `sam local start-api` plus `--debug`, save the inbound JSON, and feed it via `sam local invoke <FunctionName> -e <file>`.

## Quality Gates Before Pushing

The CI workflow (`.github/workflows/backend-ci-cd.yml`) runs:

1. `npm ci`
2. `docker build` per service
3. `npm run typecheck -w <service>` per service
4. `npx vitest run "<service>" --config vitest.config.ts` per service that has tests
5. `npm run test:coverage` (single coverage gate enforces `lines >= 70`)

Run `npm run test:coverage` before pushing - it includes both the type-check coverage of the test suites and the line-coverage gate, and is the same command the gate uses.
