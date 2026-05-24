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

## Story Project Automation

This repository includes `.github/workflows/story-project-sync.yml` to keep BMAD stories and implementation specs aligned with repository issues and the GitHub Project at `https://github.com/users/REW1L/projects/1`.

Required repository secret:

- `GH_PROJECT_TOKEN`: classic PAT with `repo` and `project` scope. The workflow uses this token for `gh issue` and `gh project` commands because the target project is user-owned.

Current project assumptions:

- Project owner: `REW1L`
- Project number: `1`
- Project title: `Munch Helper project`
- Status field name: `Status`
- Required status options: `Ready for Dev`, `Review`, `Done`

Supported lifecycle sync:

- A story mentioned in `_bmad-output/planning-artifacts/**` on `main` creates or reuses a matching repository issue and adds it to the project.
- A story or approved `spec-*.md` file added under `_bmad-output/implementation-artifacts/` creates the issue and project item if missing, then sets project status to `Ready for Dev`.
- A pull request that touches exactly one tracked implementation artifact and whose artifact status is no longer `ready-for-dev` sets the project status to `Review`.
- A merged `main` change that moves a tracked implementation artifact status to `done` sets the project status to `Done`.
- A pull request for a tracked implementation artifact that is closed without merge moves the project status from `Review` back to `Ready for Dev`.

## Auto-implementation Orchestrator

When `story-project-sync` transitions a project item to **Ready for Dev**, it posts a deterministic marker comment on the associated issue. The `.github/workflows/ready-for-dev-orchestrator.yml` workflow fires on that comment and automatically attempts implementation using available coding-assistant CLIs.

### Required secrets

| Secret | Purpose |
|--------|---------|
| `ANTHROPIC_API_KEY` | Claude CLI (`claude`) |
| `OPENAI_API_KEY` or `CODEX_API_KEY` | Codex CLI (`codex`) |
| `COPILOT_GITHUB_TOKEN` | GitHub Copilot CLI — must be a PAT with **Copilot Requests** scope; do **not** reuse `GITHUB_TOKEN` |
| `KIRO_API_KEY` | Kiro CLI (`kiro-cli`) |

Any CLI whose secret is absent is silently skipped during pre-flight; the cascade continues with the remaining CLIs.

### Cascade behaviour

Agents are invoked in a configurable order (default: `claude → codex → copilot → kiro-cli`) with a per-agent timeout (default: 30 min). After each invocation the orchestrator reads the spec file's `status:` frontmatter field. When it sees `review`, `in-review`, or `done`, it:

1. Commits all workspace changes to `auto-dev/issue-<n>`
2. Pushes the branch
3. Opens a PR with body `Closes #<n>`

`story-project-sync` then advances the project board from **Ready for Dev** to **Review** when the PR is opened.

If all CLIs are exhausted without reaching `review`, `in-review`, or `done`, the workflow pushes partial work (if any) and exits non-zero. The operator can re-run the workflow to resume from the existing branch.

### Trigger methods

**Automatic** — `story-project-sync` posts the marker comment on every `Ready for Dev` transition. The orchestrator fires automatically.

**Manual** — run the workflow from the CLI:

```bash
gh workflow run ready-for-dev-orchestrator.yml -f issue_number=42
```

You can also override the agent order:

```bash
gh workflow run ready-for-dev-orchestrator.yml \
  -f issue_number=42 \
  -f agent_order=claude,codex
```

### Marker-comment contract

Any process with write access can trigger the orchestrator by posting a comment with this exact shape:

```
🚀 **Status moved to Ready for Dev** — auto-implementation orchestrator queued.

<!-- auto-dev:trigger v1 -->
```json
{"version": 1, "issue_number": 42, "spec_file": "_bmad-output/implementation-artifacts/3-1-apptheme-token-migration.md"}
```
```

The orchestrator's job-level `if` accepts only comments authored by `REW1L` or `github-actions[bot]`, so external commenters cannot trigger CLI runs.

### Run-log artifact

Each run uploads a `agent-logs-issue-<n>` artifact containing one log file per CLI invocation (`agent-<name>.log`). Download it from the **Actions** tab to inspect the raw output from each coding assistant.

## Documentation

- Project docs index: `docs/index.md`
- Backend docs: `backend/README.md`
- Frontend docs: `frontend/README.md`
- Infrastructure docs: `infrastructure/README.md`
- BMAD framework/config: `_bmad/`
- BMAD generated outputs: `_bmad-output/`

## License

GNU General Public License v3.0. See `LICENSE`.
