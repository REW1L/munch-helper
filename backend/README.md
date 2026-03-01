# Munch Helper Backend (Local Microservices)

This backend is split into local microservices under `backend`:

- `gateway` (single client entrypoint)
- `user-service`
- `room-service`
- `character-service`

## Scope

Implemented in this phase:

- User management (`POST /users`, `GET /users/:userId`, `PATCH /users/:userId`)
- Room management (`POST /rooms`, `POST /rooms/associations`)
- Character management (`GET /characters?roomId=...`, `POST /characters`, `PATCH /characters/:characterId`, `DELETE /characters/:characterId`)
- Room service synchronous call to character service on create/join flow.

Postponed:

- WebSocket notifications
- Messaging/broker integrations

## Prerequisites

- Node.js 20+
- Docker

## Local startup

1. Copy env template:

```bash
cp .env.example .env
```

2. Build and start all services + Mongo:

```bash
./scripts/dev-up.sh
```

Gateway runs on `http://localhost:8080` by default.

## Local shutdown

```bash
./scripts/dev-down.sh
```