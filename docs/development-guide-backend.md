# Backend Development Guide

Generated: 2026-03-19T22:50:33Z

## Prerequisites

- Node.js 20+
- npm 10+
- Docker
- AWS SAM CLI for Lambda workflows

## Setup

1. `cd backend`
2. `cp .env.example .env`
3. `./scripts/dev-up.sh`

## Local Runtime

- HTTP edge: `http://localhost:8080`
- WebSocket edge: `ws://localhost:8080/ws?roomId=<RoomId>&userId=<UserId>`
- Direct service ports:
  - user `8082`
  - room `8083`
  - character `8084`
  - notifications `8085`

## Main Commands

```bash
cd backend
npm test
npm run test:coverage
npm run typecheck
./scripts/dev-up.sh
./scripts/dev-down.sh
```

## SAM Commands

```bash
cd backend
npm run sam:build
npm run sam:local:api
npm run sam:invoke:user:health
npm run sam:invoke:user:create
npm run sam:invoke:user:update
npm run sam:deploy
```

## Notes

- Local compose uses one Mongo container per main HTTP domain service plus Redis for event transport.
- The repository currently documents `room-notifications-service` as both a local WebSocket server and an AWS Lambda consumer for SNS/WebSocket events.
