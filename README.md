# Munch Helper

Munch Helper is a digital companion for tabletop games, currently focused on Munchkin. It provides shared room state, character tracking, and real-time updates across web and mobile clients.

Live app: https://helpamunch.click

[![Download on the App Store](frontend/assets/images/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg)](https://apps.apple.com/us/app/munch-helper/id6760627502)

## Repository Structure

```text
munch-helper/
├── backend/         # Node.js microservices + Docker local stack + AWS SAM
├── frontend/        # Expo Router app (iOS, Android, Web)
├── infrastructure/  # Pulumi stack for frontend hosting (S3 + CloudFront)
├── docs/            # Architecture, API contracts, OpenAPI spec
├── scripts/         # Workspace-level utility scripts
└── README.md
```

## What Is Implemented

- User management: create, read, and update users
- Room management: create room and join room
- Character management: list, create, update, and delete characters
- Real-time room notifications over WebSocket (`character_created`, `character_updated`, `character_deleted`)
- Frontend app routes for onboarding, room flow, and Munchkin gameplay screens
- Frontend web export and infrastructure deployment

Not implemented yet:

- Battle system and room history features

## Tech Stack

- Backend: Node.js, TypeScript, Express, MongoDB, Redis, Docker, AWS Lambda/SAM
- Frontend: Expo Router, React Native, TypeScript, Vitest
- Infrastructure: Pulumi (TypeScript), AWS S3, CloudFront

## Quick Start

### 1. Backend (local microservices)

```bash
cd backend
cp .env.example .env
./scripts/dev-up.sh
```

Local endpoints:

- Gateway: `http://localhost:8080`
- User service: `http://localhost:8082`
- Room service: `http://localhost:8083`
- Character service: `http://localhost:8084`
- Room notifications service: `ws://localhost:8085`
- Proxied room notifications: `ws://localhost:8080/ws?roomId=<RoomId>&userId=<UserId>`

Stop services:

```bash
cd backend
./scripts/dev-down.sh
```

### 2. Frontend

```bash
cd frontend
npm ci
echo "EXPO_PUBLIC_API_URL=http://localhost:8080" > .env
npm run start
```

Run native targets:

```bash
npm run ios
npm run android
```

## Testing

Workspace coverage:

```bash
npm run coverage
```

Backend:

```bash
cd backend
npm test
npm run test:coverage
```

Frontend:

```bash
cd frontend
npm run lint
npm run tsc
npm run test
npm run test:coverage
```

## AWS SAM (backend)

From `backend/`:

```bash
npm run sam:build
npm run sam:local:api
npm run sam:deploy
```

See `backend/README.md` for details.

## Web Export and Infrastructure Deploy

Build frontend web artifacts:

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web
```

Deploy infrastructure:

```bash
cd infrastructure
npm install
pulumi stack init dev
pulumi config set aws:region eu-central-1
pulumi config set munch-helper-frontend:artifactDir ../frontend/dist
pulumi up
```

See `infrastructure/README.md` for details.

## BMAD Docs and Workflow

This repository is BMAD-enabled. Use these folders as your working map:

- `_bmad/`: BMAD framework config, manifests, agent/workflow definitions
- `_bmad-output/`: generated BMAD outputs (project context, planning, implementation)
- Official BMAD docs (setup and workflow reference): `https://docs.bmad-method.org/`

Primary artifact locations in this repo:

- Project context: `_bmad-output/project-context.md`
- Planning artifacts: `_bmad-output/planning-artifacts/`
- Implementation artifacts: `_bmad-output/implementation-artifacts/`
- Current sprint plan/status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Project knowledge (for grounding): `docs/`

Recommended full BMAD flow (for new or major work):

1. Generate/refresh context: `bmad-bmm-generate-project-context`
2. Plan: `bmad-bmm-create-prd` -> `bmad-bmm-create-ux-design` (if UI changes) -> `bmad-bmm-create-architecture` -> `bmad-bmm-create-epics-and-stories`
3. Readiness check: `bmad-bmm-check-implementation-readiness`
4. Build cycle: `bmad-bmm-sprint-planning` -> `bmad-bmm-create-story` -> `bmad-bmm-dev-story` -> `bmad-bmm-code-review`
5. Optional quality/support: `bmad-bmm-qa-automate`, `bmad-bmm-sprint-status`, `bmad-bmm-retrospective`

Quick path (for small scoped changes):

1. `bmad-bmm-quick-spec`
2. `bmad-bmm-quick-dev` or `bmad-bmm-quick-dev-new-preview`

How to keep BMAD artifacts useful:

1. Treat `_bmad-output/*` as the source of truth for planning and execution state.
2. Update affected artifacts when scope or implementation changes.
3. Keep `docs/` aligned with shipped architecture/runtime behavior so future BMAD runs stay grounded.

## Documentation

- Project docs index: `docs/index.md`
- Backend docs: `backend/README.md`
- Frontend docs: `frontend/README.md`
- Infrastructure docs: `infrastructure/README.md`
- BMAD framework/config: `_bmad/`
- BMAD generated outputs: `_bmad-output/`

## License

GNU General Public License v3.0. See `LICENSE`.
