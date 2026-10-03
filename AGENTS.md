# Repository instructions for coding agents

This file applies to the whole repository. For feature and bug work, deliver code, tests, contracts, documentation, a GitHub pull request, and fixes for any failures on that PR. Do not merge or deploy unless the task calls for it. Keep changes focused and report any check that could not run.

## Orient before editing

1. Read `README.md`, `docs/index.md`, and `_bmad-output/project-context.md`. For the part being changed, read its README, architecture document, and development guide under `docs/`.
2. Read the relevant requirements in `openspec/specs/`, any active change in `openspec/changes/`, and any applicable story or implementation spec in `_bmad-output/implementation-artifacts/`. Every new feature must have an OpenSpec change with proposal, design, spec, and tasks before implementation. Extend the relevant active change if one already exists; do not create a duplicate. Treat its scenarios as acceptance criteria and keep tasks current as work progresses. Follow the repository's OpenSpec skills for proposal, implementation, verification, spec sync, and archive. BMAD stories remain useful context; preserve and update their acceptance criteria and status where the feature is tracked there.
3. Trace behavior through actual source, tests, package scripts, and `.github/workflows/` before changing it. Generated docs and `_bmad-output/project-context.md` contain useful patterns but may lag the source. For example, current `frontend/package.json` uses Expo 57, React Native 0.86, and TypeScript 6; older docs mention Expo 55 and TypeScript 5.9. Resolve such conflicts using code and executable configuration, then update affected docs.
4. Check `git status`, branch, and existing changes. This checkout can be a detached worktree. Create a focused `codex/<topic>` branch before committing, unless the user specified another branch. Do not overwrite unrelated changes.

## Architecture and contracts

- `frontend/` is the Expo Router app for iOS, Android, and web. Keep routes and layouts in `frontend/app/`, server-state orchestration in `hooks/`, transport and wire types in `api/`, reusable UI in `components/`, and runtime validation in `config/runtime.ts`. Tests for routes belong under `frontend/__tests__/app/`, never inside `app/`.
- `backend/` is an npm workspace of six Express services (`user`, `room`, `character`, `battle`, `room-notifications`, `log`). Each service owns its Mongo data. Keep app construction injectable and separate from local `index.ts` and Lambda `lambda.ts` bootstrap. Preserve `ROUTE_PREFIX` behavior and the local Nginx versus cloud API Gateway paths.
- The local full stack uses Docker Compose, Nginx, Mongo, and Redis; cloud uses SAM/Lambda, API Gateway, SNS, and MongoDB Atlas. Cross-service behavior must work in both paths. Infrastructure for the web export and edge lives in `infrastructure/` (Pulumi).
- For HTTP or data-shape changes, update producer, frontend consumer, boundary tests, `docs/api-contracts-backend.md`, `docs/data-models-backend.md` where applicable, and the relevant `docs/openapi/` files. OpenAPI coverage may be incomplete; check the actual routes. Preserve stable error shapes and validate inputs at boundaries.
- For real-time changes, coordinate event producers, `backend/room-notifications-service/src/app.ts`, log persistence, `frontend/api/webSocket.ts`, and subscribed hooks. The client receives only `event` and `event_body`; internal events contain more fields. Keep event names and payloads synchronized and test both Redis/local and SNS/Lambda seams as appropriate.
- Keep frontend runtime URL validation. Do not hardcode credentials or environment endpoints. For mutations, inspect `frontend/api/http.ts` retry behavior: a non-idempotent operation may need `retryCount: 0` (battle discard is the precedent). Preserve TanStack Query invalidation and WebSocket reconnect behavior.
- Keep translation keys and catalogs in `frontend/i18n/` aligned across supported languages. Test long localized strings, small screens, and accessible motion behavior for UI changes. Prefer stable `testID` selectors in Maestro flows over translated text.
- Treat the Expo SDK, React, React Native, Expo modules, native build tooling, and the frontend lockfile as a compatibility set. Use Expo's dependency checks for intentional upgrades. Backend and frontend have different Node baselines (CI: 20 and 24 respectively), and backend TypeScript is non-strict while frontend is strict.

## TDD and local verification

For each behavior change, work in a red → green → refactor loop:

1. Derive observable cases from the acceptance criteria, including failures and edge cases. Add or update the smallest useful automated test **before** production code. For a bug, first add a regression test that reproduces it.
2. Run that targeted test and confirm it fails for the expected reason. A compile error or unrelated setup failure does not demonstrate the behavior. Record the command and failure when useful for the PR.
3. Implement the smallest change that makes it pass. Refactor with the test still passing. Repeat for the next behavior. Test contracts and side effects, not implementation details; control time and external boundaries so tests remain deterministic.
4. Run affected package checks locally, then cross-surface and end-to-end checks for integration changes. Never reduce coverage thresholds or skip or rewrite a failing test to hide a regression. If a required check cannot run because hardware, credentials, or tooling are unavailable, run every available check, document the precise gap and reason in the PR, and leave the PR open. The mobile pre-commit gate runs for staged `frontend/` changes; bypass it only when it cannot run locally, with the reason and unrun platforms recorded in the PR. Do not describe a blocked check as passing.

Use the commands from the appropriate directory:

| Surface | Targeted work | Before PR / relevant full gate |
| --- | --- | --- |
| Backend | `cd backend && npx vitest run <service> --config vitest.config.ts`; `npm run typecheck -w <service>` | `cd backend && npm run typecheck && npm run test:coverage` (70% line threshold); match CI Docker build for changed service when relevant |
| Frontend | `cd frontend && npx vitest run <test-file>` for the default suite; `npm run test:room-route` for route tests | `cd frontend && npm run lint && npm run typecheck && npm run test:coverage` (unit coverage plus route suite, 70% line threshold) |
| Infrastructure | `cd infrastructure && npm run lint` | `cd infrastructure && npm run build`; use `pulumi preview` only with the intended stack and credentials |
| Cross-layer/mobile | `npm run e2e:stack:start` / `npm run e2e:stack:stop`; see `docs/development-guide-e2e.md` | `npm run test:e2e:mobile` for staged frontend changes (also runs from the Husky pre-commit hook); GitHub PR `e2e-web` is the web end-to-end gate |

Install from each package lockfile with `npm ci` in `backend/`, `frontend/`, or `infrastructure/` as needed. The root package is a script shell, not a substitute for those checks. `frontend/vitest.config.ts` excludes route tests; `frontend/vitest.room-route.config.ts` runs them. The current backend CI service matrix omits `battle-service`; run its targeted typecheck and test locally even though the aggregate coverage job includes it. A local macOS Maestro web run has a documented driver issue, so rely on the PR's Linux `e2e-web` result when that issue reproduces. Do not claim unrun native, web, or cloud checks passed.

## Pull request and CI loop

1. Review the final diff for scope, secrets, generated files, and documentation drift. Keep package lockfile edits with their manifest edits. Avoid committing generated native folders or build output unless the task explicitly requires them.
2. Run the relevant local gates, commit on the focused branch, push it, and open a GitHub PR against the repository's default branch. Include the requirement or issue link, concise change summary, red/green test evidence, exact verification commands, and any unrun checks or risks. Do not mark an unfinished change complete.
3. Inspect the PR checks with GitHub CLI or the available GitHub tools. Workflow path filters mean a docs-only PR may show no backend/frontend checks; run the appropriate local validation anyway. Classify each failing check as code, test, configuration, or external service failure from its logs.
4. Fix failures caused by the change, rerun the smallest relevant local test and its package gate, push the correction, and watch the new CI run. Repeat until all applicable checks are green. If a failure is external or cannot be reproduced, give the PR a precise diagnosis and evidence; do not silently ignore it. Keep the PR open for review; merging is a separate action.

## Further references

- `docs/integration-architecture.md` for boundary contracts and retry/event pitfalls.
- `docs/development-guide-backend.md`, `docs/development-guide-frontend.md`, `docs/development-guide-infrastructure.md`, and `docs/development-guide-e2e.md` for local setup and commands.
- `docs/release-readiness-checklist.md` and `docs/deployment-guide.md` for release-impacting changes.
- `openspec/specs/` for durable product requirements; archived changes under `openspec/changes/archive/` are historical context.
- `_bmad-output/implementation-artifacts/deferred-work.md` for known work that is not automatically in scope.
