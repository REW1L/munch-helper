# Backend Architecture

Generated: 2026-03-19T22:50:33Z

## Executive Summary

The backend is a small service-oriented system organized around bounded gameplay concerns. Each main domain area runs as an isolated Node.js service with its own MongoDB database. Local development uses Docker Compose plus Nginx as a single edge. Cloud deployment packages the HTTP services as Lambda functions behind API Gateway and uses a separate WebSocket path for room notifications.

## Stack

| Category | Technology |
| --- | --- |
| Runtime | Node.js 20 |
| Framework | Express 5 |
| Persistence | MongoDB via Mongoose |
| Async messaging | Redis locally, SNS in AWS |
| Real-time transport | `ws` locally, API Gateway WebSocket in AWS |
| Deployment | Docker Compose, AWS SAM |
| Testing | Vitest, Supertest |

## Services

| Service | Purpose | Main files |
| --- | --- | --- |
| `user-service` | create and update user profiles | `src/app.ts`, `src/service.ts`, `src/models/User.ts` |
| `room-service` | create rooms and join existing rooms | `src/app.ts`, `src/service.ts`, `src/models/Room.ts` |
| `character-service` | character CRUD and event publication | `src/app.ts`, `src/service.ts`, `src/models/Character.ts`, `src/publisher.ts` |
| `room-notifications-service` | room subscription tracking and WebSocket fan-out | `src/index.ts`, `src/lambda.ts`, `src/models/RoomConnection.ts` |

## Architecture Pattern

- API-first microservices with per-service persistence
- Thin HTTP edge in local development
- Event-driven real-time update pipeline for room state changes
- Dual runtime strategy:
  - local process/server mode for fast development
  - Lambda adapter mode for AWS deployment

## Data Architecture

- Separate Mongo databases are configured for users, rooms, characters, and notifications.
- Service ownership is explicit in environment variables:
  - `USER_MONGO_URI`
  - `ROOM_MONGO_URI`
  - `CHARACTER_MONGO_URI`
  - `ROOM_NOTIFICATIONS_MONGO_URI`
- The room notifications Lambda persists connection metadata and uses WebSocket management APIs to fan out events.

## API Design

- HTTP APIs are documented in `docs/openapi/`.
- Exposed business routes:
  - `POST /users`
  - `PATCH /users/{userId}`
  - `POST /rooms`
  - `POST /rooms/associations`
  - `GET /characters`
  - `PUT /characters`
  - `POST /characters/{characterId}`
  - `DELETE /characters/{characterId}`
- Real-time route:
  - `GET /rooms/{roomId}` modeled as WebSocket handshake in OpenAPI

## Deployment Modes

### Local

- `backend/docker-compose.local.yml` starts Nginx, Redis, three Mongo instances, and all services.
- Ports:
  - `8080`: Nginx edge
  - `8082`: user-service
  - `8083`: room-service
  - `8084`: character-service
  - `8085`: room-notifications-service

### AWS

- `backend/sam/template.yaml` provisions:
  - HTTP API
  - WebSocket API and stage
  - SNS topic for room character events
  - IAM roles per function
  - Lambda functions for user, room, character, and notifications services

## Testing Strategy

- Each service contains `*.test.ts` files adjacent to app, DB, service, and Lambda code.
- Workspace-level backend commands run tests and coverage across services.

## Risks And Notes

- The workspace manifest references a `gateway` package that is not present in the current tree.
- HTTP method naming in the OpenAPI files does not always follow conventional REST semantics, for example `PUT /characters` for create and `POST /characters/{characterId}` for update. Treat the OpenAPI files as the source of truth unless the runtime code is intentionally changed.
