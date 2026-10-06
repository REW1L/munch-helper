# Munch Helper

Munch Helper is a shared companion for Munchkin games. Players can create or join a room, manage characters, track battles, and see room activity update in real time. It supports Munchkin Classic and Second Edition across iOS, Android, and web.

- Web app: [helpamunch.click](https://helpamunch.click)
- iOS app: [App Store](https://apps.apple.com/us/app/munch-helper/id6760627502)

## Repository layout

```text
backend/         Express services, local Docker stack, and AWS SAM deployment
frontend/        Expo Router app for iOS, Android, and web
infrastructure/  Pulumi stack for the web app and edge routing
docs/            Architecture, contracts, development, and deployment guides
maestro/         Mobile and web end-to-end flows
openspec/        Product requirements and change proposals
```

The root npm package provides workspace-level helpers. Backend, frontend, and infrastructure each have their own dependencies and lockfile. The supported runtime is Node.js 24.

## Product capabilities

- Create and join Classic or Second Edition rooms with room codes.
- Manage a room's characters, including Second Edition Gold Pieces.
- Start, edit, conclude, or discard the active battle in a room.
- Receive character and battle updates in real time.
- Browse a room's cursor-paginated activity history.
- Read localized in-app guides for both supported editions.

## Local development

### Start the backend

Docker Compose starts the local services, per-service MongoDB databases, Redis, and Nginx edge. The frontend uses the edge at `http://localhost:8080`.

```bash
cd backend
cp .env.example .env
./scripts/dev-up.sh
```

Stop the stack with:

```bash
cd backend
./scripts/dev-down.sh
```

### Start the app

In another terminal:

```bash
cd frontend
npm ci
echo 'EXPO_PUBLIC_API_URL=http://localhost:8080' > .env
npm run start
```

Then use the Expo terminal to open a platform, or run `npm run ios`, `npm run android`, or `npm run web` from `frontend/`. iOS and Android require their respective simulator/emulator toolchains.

## Checks

Run checks from the package you changed. The commands below match the current package scripts:

```bash
# Backend
cd backend
npm run typecheck
npm test
npm run test:coverage
```

```bash
# Frontend
cd frontend
npm run lint
npm run typecheck
npm test
npm run test:coverage
```

```bash
# Infrastructure
cd infrastructure
npm run lint
npm run build
```

The root coverage helper runs frontend and backend coverage and combines their reports:

```bash
npm run coverage
```

For every change under `frontend/`, run the mobile E2E quality gate from the repository root:

```bash
npm run test:e2e:mobile
```

See the [E2E development guide](docs/development-guide-e2e.md) for prerequisites and platform details. The backend and frontend coverage gates require at least 70% line coverage.

## Architecture and contracts

The backend has six Express services: `user-service`, `room-service`, `character-service`, `battle-service`, `room-notifications-service`, and `log-service`. Locally, Nginx routes HTTP and WebSocket traffic; Redis carries service events. In AWS, SAM deploys Lambda functions behind API Gateway, with SNS for event fanout and MongoDB Atlas for persistence.

The frontend is an Expo Router app. Routes live in `frontend/app/`, server-state orchestration in `frontend/hooks/`, transport and wire types in `frontend/api/`, and runtime configuration validation in `frontend/config/runtime.ts`.

The Pulumi project publishes the web export to S3 and CloudFront and routes API and WebSocket traffic to the backend. CI workflows for backend, web and infrastructure, iOS, and Android are described in the [deployment guide](docs/deployment-guide.md).

Read [API contracts](docs/api-contracts-backend.md) and [data models](docs/data-models-backend.md) for backend behavior. The OpenAPI description is maintained under [`docs/openapi/`](docs/openapi/); check its coverage notes before relying on it as a complete contract.

## Documentation map

Start at [the documentation index](docs/index.md), then use the guide for the part you are changing:

- [Backend development](docs/development-guide-backend.md) and [backend architecture](docs/architecture-backend.md)
- [Frontend development](docs/development-guide-frontend.md) and [frontend architecture](docs/architecture-frontend.md)
- [Infrastructure development](docs/development-guide-infrastructure.md) and [infrastructure architecture](docs/architecture-infrastructure.md)
- [Integration architecture](docs/integration-architecture.md) for cross-service behavior
- [Deployment guide](docs/deployment-guide.md) for release pipelines

For coding-agent requirements, see [`AGENTS.md`](AGENTS.md). New features require an OpenSpec change before implementation; see its proposal and implementation workflows in `.agents/skills/`.

## License

GNU General Public License v3.0. See [LICENSE](LICENSE).
