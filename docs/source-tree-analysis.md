# Source Tree Analysis

This document provides an annotated map of the repository. Use it to find the right entry point for any change. Folders prefixed `_bmad`/`.agents`/`.kiro`/`.claude`/`.github/skills` are BMAD framework assets (skill definitions, planning artifacts, agent personas) and are not described file-by-file here; treat them as configuration.

## Top-Level Layout

```text
munch-helper/
├── backend/                 # Six Express + Mongoose microservices, shared SAM template, Nginx edge
├── frontend/                # Expo Router app (iOS, Android, web)
├── infrastructure/          # Pulumi stack for frontend hosting (S3 + CloudFront + Route 53)
├── docs/                    # This documentation set + OpenAPI + release evidence
│   ├── descriptions/        # Product-facing descriptions of MunchHelper modules
│   ├── openapi/             # OpenAPI 3.1 spec (paths/, schemas/, parameters/)
│   ├── release/             # Release run logs and validation matrix
│   ├── release-evidence/    # Per-release evidence templates and snapshots
│   └── release-validation/  # Channel availability playbooks
├── scripts/                 # Workspace-level helpers: screenshots, story sync, web channel validation
├── maestro/                 # Maestro E2E flows used by capture and regression scripts
├── screenshots/             # App-store screenshot output directory
├── videos/                  # App-store preview video output directory
├── _bmad/                   # BMAD framework module config (do not edit by hand)
├── _bmad-output/            # BMAD planning + implementation artifacts (PRD, UX, epics, stories)
├── .github/workflows/       # Six CI/CD workflows (backend, frontend+infra, iOS, Android, story sync, orchestrator)
├── package.json             # Workspace shell (no runtime dependencies; only scripts)
├── README.md                # Repository entry point
├── CHANGELOG.md             # Notable changes (currently records v2.0.0 gateway removal)
└── LICENSE                  # GPL v3
```

## Backend

```text
backend/
├── package.json             # Workspace root for six Mongoose services. Provides `dev`, `start`, `test`,
│                              `test:coverage`, `typecheck`, `sam:build`, `sam:local:api`, `sam:invoke:*`, `sam:deploy`.
├── docker-compose.local.yml # Boots nginx + 6 services + 5 Mongo containers + Redis on host ports 8080-8087, 27021-27025, 6379.
├── nginx/
│   └── nginx.conf           # Single client entrypoint on :8080; reverse-proxies /users /rooms /characters
│                              /battles /logs /ws to the corresponding service container, with explicit
│                              CORS handling and WebSocket upgrade headers on /ws.
├── scripts/
│   ├── dev-up.sh            # `docker compose -f docker-compose.local.yml up --build -d`
│   └── dev-down.sh          # `docker compose -f docker-compose.local.yml down`
├── sam/
│   ├── template.yaml        # SAM template with HTTP API (api stage), WebSocket API (ws stage), six Lambdas
│   │                          (UserService, RoomService, CharacterService, RoomNotifications, BattleService,
│   │                          LogWriter, LogReader), two SNS topics (room-character-events, log-events),
│   │                          and per-service IAM roles. Each Lambda is bundled by esbuild (cjs, es2022, minified).
│   ├── samconfig.toml       # `sam deploy` defaults: stack `munch-helper-user-service`, region eu-central-1.
│   └── events/              # Sample event JSON for `sam local invoke` testing.
├── vitest.config.ts         # Single Vitest project covering all services. Coverage gate: lines >= 70%.
├── .env.example             # Default ports + Mongo URIs + log channel name. Used by tsx local runs.
├── battle-service/
│   ├── Dockerfile, package.json, tsconfig.json
│   └── src/
│       ├── index.ts         # Local bootstrap: builds FanOut publisher (notifications + log) and listens.
│       ├── lambda.ts        # SAM entrypoint: same publisher wired to two SNS topics.
│       ├── app.ts           # Express routes /battles (GET/POST/PATCH/DELETE/conclude) with full validation.
│       ├── service.ts       # Mongoose-backed BattleModelLike factory; toBattleLike normalizer.
│       ├── publisher.ts     # SnsBattleEventPublisher, RedisBattleEventPublisher, NoopBattleEventPublisher,
│       │                     FanOutBattleEventPublisher; payload factories for started/updated/concluded/discarded.
│       ├── db.ts            # Deduped Mongoose connection (singleton).
│       ├── supportSignal.ts # Structured `support.failure` console logger with subsystem and code enum.
│       └── models/Battle.ts # Battle schema with partial unique index on (roomId, status='active').
├── character-service/       # Same shape as battle-service. Owns Character schema and `character_*` events.
├── log-service/             # Same shape; routes are split into `routes/logs.ts`. `lambda-read.ts` is the
│                              read API entrypoint; `subscriber.ts` is the SNS-driven write entrypoint.
├── room-notifications-service/
│   ├── src/
│   │   ├── index.ts         # `ws.WebSocketServer` for local; subscribes to Redis room-character-events
│   │   │                     channel and fans out to `(roomId)` matched sockets.
│   │   ├── lambda.ts        # SAM entrypoint: handles $connect/$disconnect/$default WS routes, plus SNS
│   │   │                     events from the room-character-events topic; uses ApiGatewayManagementApi to
│   │   │                     deliver and prunes 410 Gone connections.
│   │   ├── app.ts           # Pure parsers: parseConnectRequest, parseLocalConnectionRequest,
│   │   │                     parseNotificationEvent (validates character_* and battle_* shapes).
│   │   ├── service.ts       # Mongoose RoomConnection upsert/list/remove; sendEventToConnections fanout.
│   │   ├── types.ts         # Notification event union types shared with publisher payloads.
│   │   └── models/RoomConnection.ts # connectionId/roomId/userId schema with timestamps.
├── room-service/            # Same shape as battle-service but no event publisher. Owns Room and
│                              RoomAssociation schemas. Calls character-service via axios on create/join to
│                              provision a default character per user.
└── user-service/            # Same shape; owns User schema. Smallest service; no event publisher.
```

### Key Backend Conventions

- Every service exports an Express app from `app.ts` that takes model dependencies. The model factory in `service.ts` provides Mongoose-backed implementations; tests substitute lightweight in-memory implementations.
- All Lambda entrypoints normalize a `ROUTE_PREFIX` env so production behind `/api` does not affect route handler paths.
- The same support-failure shape is reused in every service (`supportSignal.ts`) — keep it consistent when adding new failure categories.
- Battle and character services use a `FanOut*EventPublisher` to publish each event to two destinations: `notifications` (for live WebSocket fanout) and `log` (for room-history persistence). The fan-out is `Promise.allSettled` so a failing leg never blocks the other.

## Frontend

```text
frontend/
├── package.json             # Expo CLI scripts, vitest, expo-router, fastlane wrapper, maestro wrapper.
├── tsconfig.json            # Extends expo/tsconfig.base, strict, alias `@/*` -> ./*
├── app.json                 # Expo config: bundle id click.helpamunch.mobileapp, web output static, plugins.
├── eslint.config.js         # expo-config-flat + dist ignore + react-hooks/exhaustive-deps as warn.
├── vitest.config.ts         # Unit suite (jsdom). Excludes app routes (Expo Router constraint).
├── vitest.room-route.config.ts # Dedicated suite for the room route under __tests__/app/munchkin/[roomNumber]/...
├── test/
│   └── setup.ts             # Sets IS_REACT_ACT_ENVIRONMENT, runs cleanup() between tests.
├── app/                     # ROUTES ONLY (no test files allowed here per Expo Router).
│   ├── _layout.tsx          # Root layout: RootErrorBoundary -> QueryClientProvider -> userProfileContext -> Stack.
│   │                          Calls getRuntimeConfig() at mount to fail fast in production.
│   ├── index.tsx            # Landing page: privacy/support links, hero, "Rooms" CTA, web-only store badges.
│   ├── rooms.tsx            # Game selection home; opens create/join/change-user modals.
│   ├── privacy.tsx          # Static privacy policy page (App Store + Play Store compliance).
│   ├── support.tsx          # Static support contact page (mailto: SUPPORT_EMAIL).
│   ├── main/
│   │   ├── modal-room-create.tsx   # Confirmation modal: "Create a room for {game}?".
│   │   ├── modal-room-join.tsx     # Room code input modal.
│   │   ├── modal-change-user.tsx   # Edit nickname; opens modal-change-avatar.
│   │   ├── modal-change-avatar.tsx # 10-avatar grid picker.
│   │   └── modal-shop.tsx          # Coin shop placeholder (currently disabled in rooms.tsx).
│   └── munchkin/
│       ├── index.tsx        # Room bootstrap loader: calls useRoomCreate or useRoomJoin then dismissTo
│       │                     /munchkin/{roomId}.
│       ├── modal-create-character.tsx # New character form.
│       ├── modal-change-caracter.tsx  # Full edit modal (name, avatar, color, race, class, gender, level, power).
│       └── [roomNumber]/
│           ├── _layout.tsx  # Room navigation: copy-room-code header, conditional minimal back button on
│           │                  detail routes (battle, log).
│           ├── index.tsx    # Room view: characters list, current-character footer, ReconnectingBanner,
│           │                  ActiveBattleBanner, Battle/Log buttons, QuickEditSheet, Undo toast.
│           ├── log.tsx      # Room history: paginated FlatList of LogEntry; opens BattleHistoryModal.
│           └── (battle)/
│               ├── _layout.tsx  # Modal presentation; nested Stack.
│               └── index.tsx    # Battle composer: name input, save, conclude (radio Players Win /
│                                  Monsters Win), discard with confirm. Two BattleSidePanel instances.
├── api/
│   ├── http.ts              # Single fetch wrapper. ApiError, retry-on-408/429/5xx (default 1 retry),
│   │                          AbortController-aware, JSON body serialization.
│   ├── users.ts, rooms.ts, characters.ts, battles.ts, logs.ts # Typed endpoint modules.
│   └── webSocket.ts         # RoomWebSocketClient (auto-reconnect, heartbeat ping, listener fanout) plus
│                              acquireRoomWebSocketClient/releaseRoomWebSocketClient refcounted registry.
├── hooks/
│   ├── useUser.ts           # Loads/creates anonymous profile from AsyncStorage; recreates on remote 404.
│   ├── UseRoom.ts           # useRoomCreate, useRoomJoin (TanStack Query mutations).
│   ├── useCharacters.ts     # useRoomCharacters: query, optimistic mutations, WebSocket-driven invalidation,
│   │                          local-update echo suppression, ensure-current-character cooldown logic.
│   ├── useRoomBattle.ts     # Active-battle query keyed by roomId; invalidates on battle_* events.
│   ├── useBattleActions.ts  # start/patch/conclude/discard mutations + isLoading/isSaving/isDiscarding split.
│   ├── useRoomLogs.ts       # useInfiniteQuery cursor-paginated room history.
│   ├── useRoomCodeClipboard.ts # Copy to clipboard with reset-on-success label timeout.
│   ├── useRoomWebSocket.ts  # Wraps acquire/release registry; tracks isConnected/isReconnecting/isTimedOut.
│   └── useReconnectOnForeground.ts # AppState listener; calls onForeground when transitioning to active.
├── context/
│   └── UserContext.ts       # `userProfileContext` exposing UseUserResult to every screen.
├── config/
│   └── runtime.ts           # Zod-validated EXPO_PUBLIC_API_URL with dev fallback to http://localhost:8080.
├── constants/
│   ├── theme.ts             # AppTheme (colors, spacing, radius, typography) + Fonts platform map.
│   ├── avatars.ts           # 10 avatar require()s used everywhere.
│   └── releaseContent.ts    # SUPPORT_EMAIL + PRIVACY_EFFECTIVE_DATE.
├── utils/
│   ├── uuid.ts              # createUuidV4 (synchronous, used for new bonus and monster ids).
│   └── battlePlayerSide.ts  # reconcilePlayerParticipants + computePlayerTotal pure helpers.
├── components/
│   ├── RootErrorBoundary.tsx   # Class boundary; logs and renders fallback.
│   ├── VioletButton.tsx        # Shared CTA component.
│   ├── ConfirmDialog.tsx       # Cross-platform confirm: native delegates to Alert.alert, web inline modal.
│   └── munchkin/               # Room view building blocks (cards, banners, side panel, log entry, etc.)
├── __tests__/
│   └── app/                    # Tests for app routes (kept outside app/ per Expo Router rule).
├── public/manifest.json        # Web PWA manifest.
├── assets/                     # App icons, splash, avatars, store badges, monster art.
├── ios/                        # Generated by `expo prebuild`. Excluded from frontend npm scripts intentionally.
├── android/                    # Generated by `expo prebuild`.
├── fastlane/                   # iOS beta lane + Android build/deploy lanes; Match config; Pluginfile.
├── scripts/
│   ├── prebuild-clean.mjs      # Wraps `expo prebuild --clean --platform <p>`.
│   └── reset-project.js        # Optional helper to scaffold a fresh app/ directory.
└── Gemfile                     # Fastlane + cocoapods runtime.
```

### Frontend Conventions

- `app/` is for routes and layouts only; tests for those routes live under `__tests__/app/` and run through `vitest.room-route.config.ts`.
- Server state belongs in TanStack Query; client-side ephemeral UI state belongs in `useState`/`useReducer` inside the route or hook.
- All HTTP traffic goes through `apiRequest` so retry, JSON, and abort handling stay uniform.
- All real-time traffic goes through the shared `acquireRoomWebSocketClient` registry so two hooks for the same `(roomId, userId)` share a single socket.

## Infrastructure

```text
infrastructure/
├── package.json     # Pulumi CLI scripts (`preview`, `up`, `destroy`).
├── tsconfig.json    # commonjs, target es2021.
├── Pulumi.yaml      # Project name `munch-helper-frontend`; declares `artifactDir` config.
├── Pulumi.dev.yaml  # Stack config: aws:region eu-central-1; encrypted passphrase.
└── index.ts         # Entire stack:
                       - Reads CloudFormation outputs from the backend stack `munch-helper-user-service`
                         to discover ApiBaseUrl + WebSocketApiUrl.
                       - Imports the ACM cert for helpamunch.click from us-east-1.
                       - Creates a private S3 bucket with public-access block + bucket-owner-enforced ACLs.
                       - Creates a CloudFront distribution with three origins (S3, HTTP API, WebSocket API)
                         and ordered cache behaviors for /ws, /ws/*, /api/*.
                       - Configures SPA fallback (403/404 -> /index.html, 200).
                       - Uploads every file under ../frontend/dist with content-type and cache-control rules
                         (HTML no-cache; _expo/static immutable; everything else 1 day).
                       - Adds Route 53 A and AAAA alias records for helpamunch.click.
```

## CI/CD Workflows (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|---|---|---|
| `backend-ci-cd.yml` | push/PR on `backend/**` | Build, typecheck, test each backend service in parallel; coverage gate via `npm run test:coverage`; on `main`, OIDC-assume the deploy role and `sam deploy`. |
| `frontend-infra-cd.yml` | push/PR on `frontend/**`, `infrastructure/**`, or `backend/sam/template.yaml` | Lint + typecheck + test + `expo export --platform web`; on `main`, Pulumi-deploy the infrastructure stack with the produced artifact. |
| `ios-app-store-cd.yml` | push to `main` on `frontend/**` | Fastlane `beta` lane: Match certs, build .ipa, upload to TestFlight. |
| `android-play-store-cd.yml` | push to `main` on `frontend/**` | Fastlane `build` + `deploy` lanes; uploads .aab to Play internal track via GCP workload identity. |
| `story-project-sync.yml` | push/PR on `_bmad-output/**` or sync script | Syncs BMAD planning/implementation artifacts to the GitHub Project (REW1L/projects/1). |
| `ready-for-dev-orchestrator.yml` | manual dispatch or `Ready for Dev` issue comment marker | Cascades through claude → codex → copilot → kiro-cli to auto-implement an issue's spec. |

## Workspace Scripts (`scripts/`)

| Script | Purpose |
|---|---|
| `seed-app-store-room.mjs` / `seed-preview-video-room.mjs` | Hit the live API to create a deterministic room/state for screenshot or preview-video capture. |
| `capture-app-store-screenshots.mjs` / `capture-google-play-screenshots.mjs` | Use Maestro to capture per-platform screenshots into `screenshots/`. |
| `capture-preview-video.mjs` | Maestro-driven preview video capture; output goes to `videos/`. |
| `coverage-combined.mjs` | Combines frontend + backend Vitest coverage summaries (run from `npm run coverage`). |
| `story-project-sync.mjs` (+ test) | The actual implementation behind `story-project-sync.yml`. |
| `ready-for-dev-orchestrator.mjs` (+ test) | The cascade implementation called by `ready-for-dev-orchestrator.yml`. |
| `validate-web-channel.mjs` (+ test) + `web-channel-http.mjs` | HTTP probes to validate the web release channel (used by release-validation playbooks under `docs/release-validation/`). |
| `generate-app-store-preview-redesign.py` / `generate-android-preview-redesign.py` | Python helpers to redesign App Store / Play Store preview images. |
| `create-google-play-feature-graphic.swift` | Swift utility to generate the Play Store feature graphic. |
| `README-screenshots.md` | Instructions for the screenshot pipeline. |

## Maestro Flows (`maestro/`)

- `app_store_*.yaml` — flows used by `scripts/capture-app-store-screenshots.mjs`.
- `preview_video.yaml` + `sleep10s.js` — preview video capture flow.
- `character_removal.yaml` — regression flow used by `npm run maestro` from the frontend package.

## Critical Entry Points (cheat-sheet)

| Concern | File |
|---|---|
| Local backend bootstrap | `backend/scripts/dev-up.sh` (uses `backend/docker-compose.local.yml`) |
| Backend cloud topology | `backend/sam/template.yaml` |
| Backend service routing (local) | `backend/nginx/nginx.conf` |
| Backend route handlers | `backend/<service>/src/app.ts` |
| Backend Mongoose schemas | `backend/<service>/src/models/*.ts` |
| Frontend root provider tree | `frontend/app/_layout.tsx` |
| Frontend HTTP transport | `frontend/api/http.ts` |
| Frontend WebSocket | `frontend/api/webSocket.ts` |
| Frontend runtime config | `frontend/config/runtime.ts` |
| Edge stack | `infrastructure/index.ts` |
| Backend deploy (CI) | `.github/workflows/backend-ci-cd.yml` |
| Frontend + infra deploy (CI) | `.github/workflows/frontend-infra-cd.yml` |
| iOS / Android delivery | `.github/workflows/{ios-app-store-cd,android-play-store-cd}.yml` + `frontend/fastlane/Fastfile` |
