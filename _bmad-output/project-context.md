---
project_name: 'munch-helper'
user_name: 'Ivan'
date: '2026-03-20'
sections_completed: ['technology_stack', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_style_rules', 'development_workflow_rules', 'critical_dont_miss_rules']
existing_patterns_found: 16
status: 'complete'
rule_count: 104
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Node.js split baseline: backend targets Node.js 20+; frontend local dev expects Node.js 24+.
- TypeScript: 5.9.x family across frontend, backend, and infrastructure.
- Frontend runtime set: Expo 55 + Expo Router 55 + React 19.2.0 + React Native 0.83.2 (treat as a coordinated compatibility set).
- Frontend core libs: TanStack Query 5.90.21, Zod 4.3.6.
- Backend core libs: Express 5.1.0, Mongoose 8.19.1, Redis 5.8.2, AWS SDK v3 modules.
- Infrastructure: Pulumi 3.203.0 with Pulumi AWS 7.10.0.
- Testing split: backend uses Vitest 3.2.4; frontend uses Vitest 4.0.18; both use v8 coverage provider.
- Version-change guardrail: do not bump Expo/React/React Native independently; do not change dependency versions without validating both frontend and backend test and coverage gates.

## Critical Implementation Rules

### Language-Specific Rules
- Treat frontend and backend TypeScript strictness differently: frontend is strict; backend services are currently non-strict. Do not silently normalize one side to the other in feature work.
- Keep module system alignment in backend services: preserve NodeNext module and resolution settings when adding or moving files.
- Prefer explicit exported types/interfaces at API and service boundaries (request payloads, response shapes, model contracts).
- Keep path alias usage consistent on frontend only where configured; avoid introducing alias patterns into backend packages without explicit config support.
- Validate runtime config and external inputs at boundaries (env vars, HTTP payloads, query params) before business logic executes.
- Use async/await with structured try/catch around I/O boundaries; route operational failures through existing error middleware or established error response patterns.
- Preserve current typed error handling style: narrow unknown errors before reading properties, and return stable client-facing error shapes.
- Keep imports grouped and minimal; do not introduce circular imports across service modules.
- Maintain explicit function return types for public helpers and API-layer functions where inference could hide contract drift.

### Framework-Specific Rules
- Keep frontend layered boundaries intact: app routes compose screens, hooks orchestrate behavior, api modules own transport details, and components stay mostly presentational.
- Validate runtime configuration at startup and fail fast for invalid production API configuration; do not add silent production fallbacks.
- Use TanStack Query for server-state concerns and keep query defaults aligned with existing app-level configuration unless there is a clear feature-specific reason.
- Keep Expo Router conventions: route behavior is defined by file structure in app, and global providers stay in the root layout.
- Preserve React hook discipline: only call hooks at top level, keep dependency arrays explicit, and avoid creating hidden side effects in render paths.
- For backend services, keep Express app construction separated from process bootstrap to preserve testability and Lambda/server entrypoint reuse.
- Preserve existing route-prefix/stage handling patterns used for Lambda compatibility; avoid hardcoding environment-specific paths in handlers.
- Keep service boundaries strict: user-service, room-service, character-service, and room-notifications-service should not absorb each other's responsibilities.
- Keep infrastructure as code declarative in Pulumi; avoid ad-hoc runtime provisioning logic in application services.
- Do not bypass existing WebSocket/event flow contracts when adding real-time features; publish/propagate through established notifications patterns.

### Testing Rules
- Keep test files colocated with source using *.test.ts / *.test.tsx naming to match current include patterns.
- Backend tests run in Node environment; frontend tests run in jsdom. Do not mix environment assumptions between suites.
- Preserve coverage provider/reporters: v8 with text, html, and json-summary outputs.
- Maintain the 70% line coverage threshold baseline; do not reduce thresholds without explicit approval.
- Coverage is a floor, not the goal: prioritize assertions on critical behavior and boundary contracts.
- For backend coverage, keep include/exclude behavior aligned with current config (service source included, tests/index/model folders excluded where configured).
- For frontend coverage, keep focus on api, config, and hooks unless intentionally extending scope.
- Write tests for behavior contracts, not implementation internals: API transport behavior, retry/cancellation logic, hooks orchestration, and service route contracts.
- For new endpoints/hooks, include at least one success-path and one failure-path test.
- Mock external boundaries (network, database, messaging, process env) but avoid mocking the unit under test.
- Preserve deterministic tests: avoid time/network flakiness and explicitly control retries/delays in tests.
- Keep app construction separate from process bootstrap so route behavior remains directly testable.
- For bug fixes, add a regression test that would fail before the fix and pass after.
- Any dependency or config change affecting runtime behavior must run both frontend and backend test/coverage pipelines before merge.
- For cross-service behavior changes, add/update boundary tests where integrations occur, not only isolated unit tests.

### Code Quality & Style Rules
- Keep naming conventions consistent with current structure:
	- frontend route and module files: lowercase or kebab-style where already used.
	- React components and exported component files: PascalCase.
	- service/domain files in backend: concise lowercase names aligned to feature responsibility.
- Preserve directory responsibilities:
	- frontend/api for transport contracts, frontend/hooks for orchestration, frontend/components for reusable UI, frontend/app for route composition.
	- backend/*-service/src for each bounded context; avoid cross-service leakage.
- Keep edits minimal and localized: avoid opportunistic renames/moves/reformats in feature tasks unless explicitly requested.
- Preserve existing public API signatures and route contracts unless the task explicitly includes contract changes.
- Keep imports clean and stable:
	- external packages first, then internal modules.
	- use established alias patterns only where configured.
	- avoid unused exports and avoid creating circular dependencies.
- Prefer small, composable functions with explicit boundary types for requests/responses and service contracts.
- Avoid premature shared-core coupling across services; only centralize shared types/contracts when a maintained shared module is explicitly part of the design.
- Keep comments sparse and purposeful: document non-obvious invariants and why, not line-by-line what.
- Preserve existing error response consistency instead of introducing ad hoc message/shape formats.
- Keep lint/type/test quality gates green before completion.
- For infrastructure TypeScript, keep declarative resource definitions and avoid embedding mutable runtime behavior in IaC code paths.
- Avoid hidden magic values; use explicit config for URLs, timeouts, retry settings, and env-driven behavior.
- When changing behavior, env vars, or endpoint contracts, update the nearest relevant docs (README/OpenAPI/docs) in the same change.

### Development Workflow Rules
- Treat this repository as a multi-surface workspace (root, frontend, backend, infrastructure): run checks in the correct package context, not only at root.
- Definition of done: every touched surface must pass its relevant quality checks before work is marked complete.
- Run targeted checks first (changed surface), then run cross-layer checks when API/contracts/shared behavior are impacted.
- Prefer existing npm scripts/wrappers for standard workflows; avoid ad hoc shell chains unless no script exists.
- Preserve local dev orchestration paths instead of inventing alternatives:
	- backend local stack via existing docker-compose scripts.
	- optional backend SAM flow via existing SAM scripts/template.
- Keep environment configuration explicit and non-secret:
	- use documented env var names.
	- do not hardcode production endpoints or credentials.
- Keep changes scoped to requested behavior; avoid incidental cross-service or cross-layer churn in one PR.
- For API/contract changes, update dependent layers in the same change set (backend contract, frontend client usage, and docs/openapi where applicable).
- Breaking contract changes require explicit coordination and atomic updates across producer, consumer, and documentation.
- Keep dependency and lockfile updates intentional and scope-limited to affected packages.
- Maintain deployment path consistency:
	- frontend web export artifact flow aligns with infrastructure artifactDir expectations.
	- infrastructure changes remain in Pulumi code and config, not ad hoc scripts.
- If runtime behavior differs by environment (local/dev/prod), encode the distinction explicitly in config handling and tests.
- Preserve existing script entrypoints as team conventions; add new scripts only when they remove repeated manual steps and are documented.
- For behavior/config changes, include concise verification notes summarizing what was validated.

### Critical Don't-Miss Rules
- Do not bypass runtime config validation in production paths; missing or invalid API base URL must fail fast.
- Do not hardcode environment-specific endpoints, secrets, or credentials in source code or tests.
- Do not merge backend/frontend compatibility assumptions:
	- Node baseline differs between surfaces.
	- backend TypeScript strictness differs from frontend strictness.
- Do not break service boundaries by adding direct data-layer coupling across microservices.
- Do not introduce contract changes silently:
	- API request/response shape changes must update consumers and docs in the same change.
	- breaking changes require explicit coordination and clear verification.
- Do not change event names or event payload contracts for notifications without coordinated producer/consumer updates.
- Do not bypass established real-time flow contracts for room notifications; preserve publish and broadcast pathways.
- Do not swallow operational errors; preserve stable, client-facing error shapes and route failures through established handling paths.
- Do not fix coverage with low-value assertions; prioritize behavior and boundary guarantees.
- Do not add flaky tests (timing/network dependence without control); tests must be deterministic.
- Do not mask failing tests by globally loosening retries/timeouts.
- Do not perform broad opportunistic refactors or mass formatting churn during feature/bug tasks unless explicitly requested.
- Do not change dependency versions or lockfiles incidentally; keep upgrades intentional and scoped.
- Do not embed mutable runtime operational logic inside IaC definitions; keep infrastructure declarative.
- Do not ship local-only assumptions; validate behavior parity expectations between local and cloud/SAM paths.
- Do not perform breaking env-var/config-key renames without coordinated, atomic updates across all consumers.
- Do not leave documentation stale when behavior/config/contracts changed.

---

## Usage Guidelines

For AI Agents:
- Read this file before implementing any code.
- Follow all rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new, repeatable patterns emerge.

For Humans:
- Keep this file lean and focused on agent execution needs.
- Update this file when technology stack, contracts, or workflows change.
- Review quarterly for outdated or redundant rules.
- Remove rules that become obvious and no longer prevent mistakes.

Last Updated: 2026-03-20
