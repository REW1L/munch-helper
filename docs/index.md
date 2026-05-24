# Project Documentation Index

Generated: 2026-05-24
Scan level: exhaustive
Repository: monorepo with three parts (backend, frontend, infrastructure)
Primary language: TypeScript

## Project Structure Summary

Munch Helper is a digital companion for tabletop games (currently focused on Munchkin) that ships to iOS, Android, and the web (`https://helpamunch.click`). The repository contains:

- **Backend** (`backend/`): six Node.js + Express microservices fronted by Nginx locally and by AWS API Gateway + Lambda + SNS in production. Schemas are owned per-service in MongoDB.
- **Frontend** (`frontend/`): Expo Router app on React Native 0.83.2 + React 19.2 + TanStack Query, with a hand-rolled refcounted WebSocket client.
- **Infrastructure** (`infrastructure/`): Pulumi stack that hosts the Expo web export on S3 + CloudFront and proxies `/api/*` and `/ws[*]` to the backend stack.

## Quick Reference by Part

### Backend (`backend/`)

| Aspect | Value |
|---|---|
| Language / runtime | TypeScript 5.9 on Node.js 20 |
| Framework | Express 5 + Mongoose 8 |
| Datastore | MongoDB 7 (per service) |
| Real-time | SNS topics in cloud, Redis Pub/Sub locally |
| Tests | Vitest 3.2.4 (single project) with v8 coverage at `lines >= 70` |
| Deploy | AWS SAM via `.github/workflows/backend-ci-cd.yml` |
| Local entrypoint | `backend/scripts/dev-up.sh` (Docker Compose) |
| Cloud entrypoint | `backend/sam/template.yaml` |

Services: `user-service`, `room-service`, `character-service`, `battle-service`, `log-service`, `room-notifications-service`. All share the same internal layout (`index.ts` / `lambda.ts` / `app.ts` / `service.ts` / `db.ts` / `models/` / `supportSignal.ts`, plus `publisher.ts` for character + battle).

### Frontend (`frontend/`)

| Aspect | Value |
|---|---|
| Language | TypeScript 5.9 (strict) |
| App | Expo 55 + Expo Router 55 + React 19.2 + React Native 0.83.2 |
| State | TanStack Query 5 + AsyncStorage + Zod-validated runtime config |
| Tests | Vitest 4.0.18 (two configs: unit + room-route) |
| E2E | Maestro flows under `maestro/` |
| Web build | `expo export --platform web` → `frontend/dist` |
| Mobile delivery | Fastlane (`frontend/fastlane/`) |

### Infrastructure (`infrastructure/`)

| Aspect | Value |
|---|---|
| IaC | Pulumi 3.203.0 (TypeScript) |
| Cloud | AWS S3 + CloudFront + Route 53 + ACM (us-east-1) |
| Discovery | Reads `ApiBaseUrl` and `WebSocketApiUrl` from the backend SAM stack |
| Deploy | `pulumi up`, automated by `.github/workflows/frontend-infra-cd.yml` |

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Architecture - Backend](./architecture-backend.md)
- [Architecture - Frontend](./architecture-frontend.md)
- [Architecture - Infrastructure](./architecture-infrastructure.md)
- [Integration Architecture](./integration-architecture.md)
- [API Contracts - Backend](./api-contracts-backend.md)
- [Data Models - Backend](./data-models-backend.md)
- [Component Inventory - Frontend](./component-inventory-frontend.md)
- [Development Guide - Backend](./development-guide-backend.md)
- [Development Guide - Frontend](./development-guide-frontend.md)
- [Development Guide - Infrastructure](./development-guide-infrastructure.md)
- [Deployment Guide](./deployment-guide.md)
- [Project Parts Metadata](./project-parts.json)

## Existing Reference Documentation

- [Root README](./../README.md) — top-level product and repository overview
- [Backend README](./../backend/README.md) — local runtime and SAM workflow
- [Frontend README](./../frontend/README.md) — frontend architecture and developer commands
- [Infrastructure README](./../infrastructure/README.md) — Pulumi deployment workflow
- [OpenAPI Specification](./openapi/openapi.yaml) — partial API surface (user, room, character, DELETE /battles/{id})
- [Product Description: Munch Helper](./descriptions/MunchHelper.md)
- [Backend Services Description](./descriptions/MunchHelper/Backend%20Services.md)
- [Frontend Description](./descriptions/MunchHelper/Frontend.md)
- [Release Readiness Checklist](./release-readiness-checklist.md)
- [Diagnostic Validation Matrix](./release/diagnostic-validation-matrix.md)
- [Release Support Reference](./release-support-reference.md)
- [Channel Availability Playbook](./release-validation/channel-availability-playbook.md)
- [Release Evidence Index](./release-evidence/README.md) and [TEMPLATE](./release-evidence/TEMPLATE-channel-availability.md)
- [BMAD Project Context](./../_bmad-output/project-context.md) — operational rules for AI assistants

## Getting Started

1. Read [Project Overview](./project-overview.md) to orient.
2. Use [Source Tree Analysis](./source-tree-analysis.md) to find the right entry point.
3. Pick the architecture document for the part you are touching.
4. Use the matching development guide before running local commands.
5. Before merging, read the relevant section of the [Deployment Guide](./deployment-guide.md) so you understand how the change ships.

## Working With AI Assistants

The repo is BMAD-enabled. Treat `_bmad-output/project-context.md` as the durable rule set for any AI assistant. Spec workflows (`_bmad-output/implementation-artifacts/`) are tracked by `.github/workflows/story-project-sync.yml`, and "Ready for Dev" issues can trigger an auto-implementation cascade via `.github/workflows/ready-for-dev-orchestrator.yml`.

For a brownfield PRD, point the PRD workflow at `docs/index.md`. For UI-only features, reference `docs/architecture-frontend.md` plus `docs/component-inventory-frontend.md`. For API-only features, reference `docs/architecture-backend.md` plus `docs/api-contracts-backend.md` and `docs/data-models-backend.md`. For full-stack features, also include `docs/integration-architecture.md`.

## Notes

- The CHANGELOG records that v2.0.0 removed an earlier gateway service and replaced it with the Nginx edge layer; the current tree reflects that.
- OpenAPI under `docs/openapi/` covers every shipped REST endpoint plus the WebSocket connect at `/ws` (modeled with `x-protocol: websocket` and a `serverToClient` schema list for the seven `character_*` and `battle_*` events).
- Class / race / gender are stored as JSON-encoded strings end-to-end. Migrating to native arrays would be a coordinated frontend + backend change.
- Backend TypeScript is intentionally `strict: false`; frontend is `strict: true`. Do not normalize.
