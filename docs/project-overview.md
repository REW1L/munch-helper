# Munch Helper Project Overview

Generated: 2026-03-19T22:50:33Z

## Summary

Munch Helper is a board-game companion platform centered on Munchkin. The repository is a TypeScript monorepo with three main parts:

- `backend/`: local-first microservices plus AWS SAM deployment targets
- `frontend/`: Expo Router application for iOS, Android, and web
- `infrastructure/`: Pulumi stack for static frontend hosting and API/WebSocket edge routing

The product supports anonymous or profile-backed users, room creation and joining, character management, and near-real-time synchronization of character updates between players in the same room.

## Repository Classification

- Repository type: Monorepo / multi-part application
- Primary languages: TypeScript, YAML
- Primary architecture: Mobile/web client + service-oriented backend + infrastructure-as-code
- Scan mode used for this document set: Initial quick scan with targeted reads of manifests, README files, orchestration config, and selected entry points

## Parts

| Part | Path | Role | Primary stack |
| --- | --- | --- | --- |
| Backend | `backend/` | User, room, character, and notification services | Node.js 20, Express 5, Mongoose, Redis, AWS SAM |
| Frontend | `frontend/` | Native-first client and web export | Expo 55, React Native, Expo Router, TanStack Query, Zod |
| Infrastructure | `infrastructure/` | CDN, storage, DNS, and origin routing | Pulumi, AWS S3, CloudFront, Route53 |

## Runtime Model

1. The frontend talks to HTTP APIs under `/api`.
2. Room and character actions are handled by backend services behind Nginx locally or API Gateway in AWS.
3. Character mutations publish room events.
4. `room-notifications-service` distributes those events over WebSocket connections.
5. The frontend subscribes through `RoomWebSocketClient` and updates room state in near real time.

## Notable Existing Documentation

- `README.md`: top-level product and repository overview
- `backend/README.md`: local backend and AWS SAM workflows
- `frontend/README.md`: frontend architecture and commands
- `infrastructure/README.md`: Pulumi deployment workflow
- `docs/openapi/`: API contract source
- `docs/descriptions/`: feature-oriented product descriptions

## Known Observations

- `backend/package.json` declares a `gateway` workspace, but the current `backend/` tree does not contain a `gateway/` folder. Local edge routing is currently represented by `backend/nginx/`.
- The root README still lists a `backend/gateway/` directory in the sample project tree, so the generated docs treat that as historical or planned rather than present.
