# Munch Helper

Munch Helper is a digital companion for tabletop games, currently focused on Munchkin. It provides shared room state, character tracking, and real-time updates across web and mobile clients.

Live app: https://helpamunch.click

<a href="https://apps.apple.com/us/app/munch-helper/id6760627502"><img src="frontend/assets/images/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg" height="40" alt="Download on the App Store"></a> <a href="https://play.google.com/store/apps/details?id=click.helpamunch.mobileapp"><img src="frontend/assets/images/GetItOnGooglePlay_Badge_Web_color_English.svg" height="40" alt="Get it on Google Play"></a>

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
- Room management: create Classic (`munchkin`) or Second Edition (`munchkin-2e`) rooms and join or resume by code
- Second Edition companion support: localized guide, character Gold Pieces tracking, and edition-aware battle reminders
- Character management: list, create, update, and delete characters
- Battle management: start, patch, conclude, and discard the active battle (one active battle per room)
- Room history: cursor-paginated log of character and battle lifecycle events (`/logs`, `/logs/:logId`)
- Real-time room notifications over WebSocket: `character_created`, `character_updated`, `character_deleted`, `battle_started`, `battle_updated`, `battle_concluded`, `battle_discarded`
- Frontend app routes for onboarding, room flow, Munchkin gameplay, battle composer, and room history
- Frontend web export and infrastructure deployment

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

- Edge (Nginx): `http://localhost:8080`
- User service: `http://localhost:8082`
- Room service: `http://localhost:8083`
- Character service: `http://localhost:8084`
- Room notifications service: `ws://localhost:8085`
- Battle service: `http://localhost:8086`
- Log service: `http://localhost:8087`
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
npm run typecheck
npm run test
npm run test:coverage
```

For every change under `frontend/`, also run the mobile E2E gate from the repository root before opening a PR, whether or not the Git hook runs:

```bash
npm run test:e2e:mobile
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

- Current agent instructions: `AGENTS.md`
- Historical project context: `_bmad-output/project-context.md` (verify before reuse)
- Planning artifacts: `_bmad-output/planning-artifacts/`
- Implementation artifacts: `_bmad-output/implementation-artifacts/`
- Current sprint plan/status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Project knowledge (for grounding): `docs/`

OpenSpec is required for every new feature; see `AGENTS.md`. BMAD can provide additional planning context. Recommended full BMAD flow (for new or major work):

OpenSpec workflow instructions for the supported assistants are generated in `.agents/`, `.claude/`, `.cursor/`, `.github/`, and `.kiro/`. To refresh them after upgrading the OpenSpec CLI, run `openspec update` from the repository root and commit the generated changes. Codex reads the shared `.agents/skills/` instructions.

1. Generate/refresh context: `bmad-bmm-generate-project-context`
2. Plan: `bmad-bmm-create-prd` -> `bmad-bmm-create-ux-design` (if UI changes) -> `bmad-bmm-create-architecture` -> `bmad-bmm-create-epics-and-stories`
3. Readiness check: `bmad-bmm-check-implementation-readiness`
4. Build cycle: `bmad-bmm-sprint-planning` -> `bmad-bmm-create-story` -> `bmad-bmm-dev-story` -> `bmad-bmm-code-review`
5. Optional quality/support: `bmad-bmm-qa-automate`, `bmad-bmm-sprint-status`, `bmad-bmm-retrospective`

Quick path (for small scoped changes):

1. `bmad-bmm-quick-spec`
2. `bmad-bmm-quick-dev` or `bmad-bmm-quick-dev-new-preview`

How to keep BMAD artifacts useful:

1. Treat active `_bmad-output/` artifacts as the record of their own planning and execution state, not as current repository-wide implementation rules.
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
