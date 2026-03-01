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

## AWS SAM option (user-service on Lambda)

This repository now includes an optional SAM-based flow for deploying `user-service` to AWS Lambda.

Prerequisites:

- AWS SAM CLI
- Docker (for `sam local`)
- AWS credentials configured for deploy

Commands from `backend`:

```bash
# Build Lambda artifacts
npm run sam:build

# Run local API Gateway + Lambda emulation
npm run sam:local:api

# Invoke sample events directly
npm run sam:invoke:user:health
npm run sam:invoke:user:create
npm run sam:invoke:user:update

# Deploy to AWS using sam/samconfig.toml defaults
npm run sam:deploy
```

Notes:

- SAM template is in `sam/template.yaml`.
- The default local Mongo URI for SAM commands is `mongodb://host.docker.internal:27021/munch_user_service`.
- `sam/samconfig.toml` contains default stack and parameter values. Override `UserMongoUri` if needed.

## Local shutdown

```bash
./scripts/dev-down.sh
```