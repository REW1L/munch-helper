# Project Overview

## What is Munch Helper

Munch Helper is a digital companion for tabletop games, currently focused on Munchkin. It provides shared room state, character tracking, real-time gameplay updates, battle resolution, and a per-room history log across iOS, Android, and web clients. The live web app is hosted at `https://helpamunch.click`, and the iOS app ships through the App Store as `click.helpamunch.mobileapp`.

The product is split into three coordinated parts in a single repository:

- **Frontend** (`frontend/`): Expo Router app shipping to iOS, Android, and the web export served by the infrastructure stack.
- **Backend** (`backend/`): Six Express/Mongoose microservices fronted by an Nginx reverse proxy locally and by API Gateway + Lambda + SNS in AWS.
- **Infrastructure** (`infrastructure/`): Pulumi stack that publishes the frontend web export to S3 + CloudFront and routes the custom domain through Route 53.

## Repository Type

Multi-part TypeScript monorepo with three independently buildable parts. Top-level `package.json` is a workspace shell that exposes screenshot/coverage helpers; each part has its own dependency tree, lockfile, and CI workflow. The CHANGELOG records that v2.0.0 removed an earlier gateway service and replaced it with the Nginx edge layer; the current tree reflects that decision.

## Technology Stack Summary

| Surface | Language | Framework | Data | Real-time | Tests |
|---|---|---|---|---|---|
| Backend | Node.js 20 + TypeScript 5.9 | Express 5, Mongoose 8 | MongoDB 7 (per-service DB) | AWS SNS (cloud) / Redis Pub/Sub (local) | Vitest 3.2.4 + supertest |
| Frontend | TypeScript 5.9 | Expo 55, Expo Router 55, React 19.2.0, React Native 0.83.2 | TanStack Query 5, AsyncStorage, Zod | Native WebSocket via API Gateway WebSocket (cloud) or `ws` server (local) | Vitest 4.0.18 + Testing Library + jsdom; Maestro for E2E |
| Infrastructure | TypeScript 5.9 | Pulumi 3.203.0, Pulumi AWS 7.10.0 | S3 (artifact bucket) | n/a | n/a |

Backend services share a single set of dependencies (Express, Mongoose, `morgan`, `cors`, `dotenv`, `tsx`, `aws4`, `@codegenie/serverless-express`); event-publishing services additionally pull in `@aws-sdk/client-sns` and `redis`; `room-notifications-service` pulls in `ws` and `@aws-sdk/client-apigatewaymanagementapi`. Battle and character services share the same publisher pattern.

## Architecture at a Glance

- **Service-oriented backend** with one Express app per bounded context. Each service has the same shape: `index.ts` (local server), `lambda.ts` (`@codegenie/serverless-express` wrapper), `app.ts` (Express app builder taking model and publisher dependencies), `service.ts` (Mongoose-backed model factory), `db.ts` (deduped Mongoose connection), `models/` (Mongoose schemas), `supportSignal.ts` (structured failure logger). Lambda apps strip a configurable `ROUTE_PREFIX` so the same handlers work behind the API Gateway stage prefix.
- **Layered Expo Router frontend**: `app/` (routes only) → `hooks/` (orchestration with TanStack Query) → `api/` (typed transport over `fetch`) → `config/runtime.ts` (Zod-validated env). A refcounted `RoomWebSocketClient` registry shares one socket per `(roomId, userId)` across hooks.
- **Pulumi-driven edge**: Static web artifacts go to a private S3 bucket behind a CloudFront distribution with OAC. The same distribution proxies `/api/*` to the backend HTTP API and `/ws` and `/ws/*` to the WebSocket API, so the web client stays single-origin under `helpamunch.click`.

A more detailed architectural breakdown lives in:

- [Architecture - Backend](./architecture-backend.md)
- [Architecture - Frontend](./architecture-frontend.md)
- [Architecture - Infrastructure](./architecture-infrastructure.md)
- [Integration Architecture](./integration-architecture.md)

## Implemented Capabilities

- User profiles: create, read, update, with `userId` derived server-side and stored locally via AsyncStorage.
- Rooms: create a room (auto-generated word+digit code), join by code, owner association on create, deduplicated join association, default character provisioning on both flows.
- Characters: list per room, create, patch, delete; values include name, avatar, color (hex), level, power, and free-form arrays for class/race/gender persisted as JSON-encoded strings.
- Battles: start (one active per room enforced by Mongo partial unique index), patch, conclude with `players_win`/`monster_wins`, and discard. Player and monster sides each carry a list of bonuses; monster side carries a list of monsters with name and level.
- Room history: every character lifecycle event and every battle lifecycle event is published to the log channel and persisted as `LogEvent` documents; the frontend pages through them with cursor-based `before=<logId>`.
- Real-time: WebSocket fanout of `character_*` and `battle_*` events to all participants of a room, with foreground reconnect, exponential-backoff retry, heartbeat ping, and a "Reconnecting…" UI banner with timeout fallback.
- Release operations: per-platform CD workflows for backend SAM deploy, frontend web build + Pulumi deploy, iOS Fastlane TestFlight upload, Android Fastlane Play Store internal track upload, BMAD story sync to GitHub Projects, and a "Ready for Dev" auto-implementation orchestrator.

## Known Gaps and Deferred Work

All capabilities listed under "Implemented Capabilities" above are shipped end-to-end (backend `battle-service` and `log-service`, frontend `(battle)` and `log.tsx` routes, the `useRoomBattle`/`useRoomLogs` hooks, and the corresponding WebSocket fanouts). Remaining backlog items are tracked in `_bmad-output/implementation-artifacts/deferred-work.md`. Notable themes from that backlog as of this scan:

- Observability hardening on the publisher legs (Redis offline-queue timeouts, `support.failure` emission from local fanout paths, correlation middleware in `room-service`).
- A few hand-validation gaps on `PATCH /characters/{id}` for non-`name`/`avatarId`/`color` fields.
- `connectToMongo` does not auto-reconnect after a dropped connection (repo-wide pattern).
- `battle-service` is missing from the per-service CI matrix in `backend-ci-cd.yml` even though SAM deploy ships it.
- `BattleMongoUri` and `LogMongoUri` rely on the SAM template defaults instead of being passed by the deploy workflow.
- A small CI helper to lint release-run artifacts and cross-check the diagnostic-validation matrix template version.

## Key Files for First-Time Readers

- `README.md` — top-level orientation, quick-start, and BMAD workflow notes
- `docs/index.md` — primary entry point for documentation
- `docs/source-tree-analysis.md` — annotated repository layout
- `_bmad-output/project-context.md` — operational rules baked into AI-assist workflows
- `backend/sam/template.yaml` — production deployment topology in code
- `infrastructure/index.ts` — single source of truth for the edge stack
- `frontend/app/_layout.tsx` — global providers, runtime config validation, query client defaults

## How the Surfaces Interact

```text
Mobile / web client (Expo Router)
    │  HTTPS  /users  /rooms  /characters  /battles  /logs
    │  WSS    /ws?roomId=&userId=
    ▼
Local: nginx:8080  ─►  user-service:8082, room-service:8083, character-service:8084,
                       battle-service:8086, log-service:8087, room-notifications:8085
                       (+ MongoDB per service, Redis Pub/Sub for character & log channels)

AWS:  CloudFront ─► HTTP API (api stage) ─► Lambda per service
                ─► WebSocket API (ws stage) ─► RoomNotificationsFunction
       SNS  room-character-events  ─► RoomNotificationsFunction (fanout to connections)
       SNS  log-events             ─► LogWriterFunction (persist to log Mongo)
```

The local Docker Compose stack mirrors the production topology closely enough that the same client builds work against both, controlled only by `EXPO_PUBLIC_API_URL`. The local Redis Pub/Sub channels (`room-character-events`, `room-log-events`) play the role of the SNS topics in cloud.
