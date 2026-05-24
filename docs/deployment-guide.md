# Deployment Guide

The repository ships four independent delivery pipelines, all triggered from `main` and split by surface:

| Pipeline | What it deploys | Workflow file |
|---|---|---|
| Backend | Six Lambdas + WebSocket API + HTTP API + SNS topics + IAM | `.github/workflows/backend-ci-cd.yml` |
| Frontend web + infrastructure | Web export → S3 + CloudFront via Pulumi | `.github/workflows/frontend-infra-cd.yml` |
| iOS | TestFlight upload via Fastlane Match | `.github/workflows/ios-app-store-cd.yml` |
| Android | Play Store internal track via Fastlane | `.github/workflows/android-play-store-cd.yml` |

This document describes each pipeline end-to-end plus the manual deployment paths for cases when CI is unavailable.

## Backend (AWS SAM)

### What gets deployed

`backend/sam/template.yaml` defines:

- One HTTP API stage `api` with explicit CORS allow-list for `https://helpamunch.click` and the methods `GET, POST, PATCH, DELETE, OPTIONS`.
- One WebSocket API stage `ws` with `$connect`, `$disconnect`, `$default` routes integrated to `RoomNotificationsFunction`.
- Six Lambda functions (User, Room, Character, RoomNotifications, Battle, LogReader, LogWriter) on `nodejs20.x`, `arm64`, 512 MB, 15s timeout, X-Ray Active tracing.
- Two SNS topics (`${stack}-room-character-events`, `${stack}-log-events`) plus per-service IAM roles with least-privilege `sns:Publish`, `execute-api:ManageConnections`, and `AWSLambdaBasicExecutionRole + AWSXRayDaemonWriteAccess` policies.
- HTTP API event mappings for every public route (see [API Contracts - Backend](./api-contracts-backend.md)).
- An SNS event source for `RoomNotificationsFunction` (subscribes to `RoomCharacterEventsTopic`) and for `LogWriterFunction` (subscribes to `LogEventsTopic`).
- Stack outputs `ApiBaseUrl` and `WebSocketApiUrl` (both consumed by the Pulumi stack).

### CI pipeline

Trigger: push or PR touching `backend/**` or the workflow file.

1. **Build matrix** (one job per service): `npm ci`, `docker build`, `npm run typecheck -w <service>`, `npx vitest run <service>`. Skipping pure non-test services is wired but currently every service has tests.
2. **Coverage gate** (single job): `npm run test:coverage` from `backend/`. Threshold `lines >= 70`.
3. **Deploy** (only on `main`):
   - OIDC-assume `${{ vars.AWS_DEPLOY_ROLE_NAME }}` in `${{ vars.AWS_ACCOUNT_ID }}` for `${{ vars.AWS_REGION }}`.
   - `npm run sam:build` (esbuild bundler defined inline in the SAM template).
   - `sam deploy --config-file sam/samconfig.toml --no-confirm-changeset --no-fail-on-empty-changeset --parameter-overrides ...` with secrets bound to `*MongoUri` parameters and `RoutePrefix`/`CharacterServiceUrl` from CI vars.

Required CI variables and secrets (validated at the start of the deploy job):

| Type | Name | Purpose |
|---|---|---|
| var | `AWS_ACCOUNT_ID` | Account that hosts the SAM stack. |
| var | `AWS_REGION` | Region for SAM (`eu-central-1`). |
| var | `AWS_DEPLOY_ROLE_NAME` | OIDC-assumable role with `cloudformation:*`, `lambda:*`, `sns:*`, `iam:*` for the stack. |
| var | `API_PREFIX` | Value passed to the `RoutePrefix` parameter (typically `/api/`). |
| var | `CHARACTER_SERVICE_URL` | Internal URL room-service uses to call character-service (for cloud, this is the HTTP API URL with the `/api` prefix). |
| secret | `USER_MONGO_URI` / `ROOM_MONGO_URI` / `CHARACTER_MONGO_URI` / `ROOM_NOTIFICATIONS_MONGO_URI` | MongoDB Atlas connection strings (`MONGODB-AWS` IAM auth). |

Note: the SAM template also accepts `BattleMongoUri`, `RoomNotificationsMongoUri`, and `LogMongoUri`. The CI workflow only validates four of those; the remaining defaults from the template are picked up if not overridden. When wiring a new MongoDB Atlas database, override its parameter explicitly via `--parameter-overrides`.

### Manual deploy

From `backend/`:

```bash
aws sso login --profile munch-helper       # or whatever auth flow you use
npm run sam:build
npm run sam:deploy
```

`sam:deploy` reads `sam/samconfig.toml`, which declares stack name `munch-helper-user-service`, region `eu-central-1`, and (placeholder) MongoDB URIs. Override the URIs:

```bash
sam deploy \
  --config-file sam/samconfig.toml \
  --parameter-overrides "UserMongoUri=mongodb+srv://... RoomMongoUri=mongodb+srv://... CharacterMongoUri=mongodb+srv://... RoomNotificationsMongoUri=mongodb+srv://... LogMongoUri=mongodb+srv://... BattleMongoUri=mongodb+srv://... CharacterServiceUrl=https://helpamunch.click/api CharacterCallTimeoutMs=2000 RoutePrefix=/api/"
```

The first deploy may need `--guided` to record bucket and capability defaults.

### Roll back

`sam` does not have a first-class roll-back. Either:

1. `git checkout <previous>` and re-deploy. The CD path is idempotent.
2. CloudFormation console → `munch-helper-user-service` → `Stack actions` → `Continue update rollback`.

## Frontend Web + Infrastructure

### What gets deployed

`infrastructure/index.ts` builds:

- Private S3 bucket `munch-helper-frontend-${accountId}-sandbox`.
- CloudFront distribution with three origins (S3, HTTP API, WS API) and custom error responses for SPA fallback.
- Route 53 A + AAAA aliases for `helpamunch.click`.
- One `BucketObjectv2` per file under `frontend/dist` with content-type and cache-control derived from the path.

### CI pipeline

Trigger: push or PR touching `frontend/**`, `infrastructure/**`, `backend/sam/template.yaml`, or the workflow file. (The SAM template is included because `infrastructure/index.ts` reads `ApiBaseUrl` and `WebSocketApiUrl` from the stack outputs.)

1. **Build job** (`build_frontend`):
   - `npm ci` in `frontend/`.
   - `npm run lint` (`expo lint`).
   - `npm run tsc`.
   - `npm run test:coverage`.
   - `EXPO_PUBLIC_API_URL=$API_BASE_URL npm run export:web --clear`.
   - Upload `frontend/dist` as the `frontend-dist` artifact.
2. **Deploy job** (`deploy_infrastructure`, only on `main`):
   - Download `frontend-dist` into `frontend/dist`.
   - `npm ci` in `infrastructure/`.
   - OIDC-assume the deploy role.
   - `pulumi up` via `pulumi/actions@v4` against `${{ vars.PULUMI_STACK_NAME }}` and `${{ secrets.PULUMI_CLOUD_URL }}`.

Required CI variables and secrets:

| Type | Name | Purpose |
|---|---|---|
| var | `AWS_ACCOUNT_ID`, `AWS_REGION`, `API_BASE_URL` | Build and deploy parameters. |
| var | `AWS_DEPLOY_ROLE_NAME`, `PULUMI_STACK_NAME` | Deploy parameters. |
| secret | `PULUMI_CLOUD_URL`, `PULUMI_CONFIG_PASSPHRASE` | Pulumi backend connection. |

### Manual deploy

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://helpamunch.click npm run export:web

cd ../infrastructure
npm install
pulumi stack select dev
pulumi up
```

See [Development Guide - Infrastructure](./development-guide-infrastructure.md) for first-time stack init.

### Roll back

The infrastructure rarely changes between releases - rolling back means redeploying a previous frontend artifact. Either:

1. `git checkout <previous>`, rebuild, `pulumi up`.
2. Or `aws s3 sync s3://<bucket-name> ./prev/` from a previous deploy snapshot, then re-upload.

CloudFront cache:

- HTML uses `no-cache, no-store, must-revalidate`, so the SPA shell flips immediately.
- `_expo/static/**` is content-hashed - the new commit's filenames replace the old ones.
- Other static files use `max-age=86400`; if needed, invalidate with `aws cloudfront create-invalidation`.

## iOS (TestFlight)

### What gets deployed

`frontend/fastlane/Fastfile` lane `ios beta`:

1. Sets up CI with `setup_ci`.
2. Loads the App Store Connect API key from disk (path written from `APP_STORE_CONNECT_KEY`).
3. Runs Match (`sync_code_signing(type: 'appstore', readonly: true)`).
4. Increments the build number based on the latest TestFlight build.
5. Configures manual signing with the Match-provisioned profile.
6. Runs `cocoapods` (`pod install`) and `build_app` (`xcodebuild`).
7. `upload_to_testflight(skip_waiting_for_build_processing: true)`.

### CI pipeline

Trigger: push to `main` touching `frontend/**` (excluding `frontend/android/**`).

1. Setup Node 24, Ruby 4.0.1.
2. Validate required secrets: `APP_STORE_CONNECT_KEY`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `MATCH_PASSWORD`, `MATCH_GIT_URL`, `MATCH_GIT_DEPLOY_KEY`, `EXPO_PUBLIC_API_URL`.
3. `npm ci && npm run prebuild:clean -- --platform ios`.
4. `bundle install` (Fastlane + cocoapods).
5. `webfactory/ssh-agent` registers `MATCH_GIT_DEPLOY_KEY` so Match can clone the certs repo.
6. Write the App Store Connect API key file from `APP_STORE_CONNECT_KEY`.
7. `bundle exec fastlane beta`.

Required secrets:

| Secret | Purpose |
|---|---|
| `APP_STORE_CONNECT_KEY`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect API key |
| `MATCH_PASSWORD`, `MATCH_GIT_URL`, `MATCH_GIT_DEPLOY_KEY` | Fastlane Match certificate vault |
| `APPLE_DEVELOPER_TEAM_ID` | Team id for manual signing |
| `EXPO_PUBLIC_API_URL` (or var) | Production API URL baked into the build |

### Manual lane

```bash
cd frontend
bundle install
export APP_STORE_CONNECT_KEY_PATH=$PWD/.tmp/app-store-connect-key.p8
mkdir -p $PWD/.tmp && cat > $APP_STORE_CONNECT_KEY_PATH <<'EOF'
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
EOF
bundle exec fastlane ios beta
```

## Android (Play Store internal track)

### What gets deployed

`frontend/fastlane/Fastfile` lanes `android build` and `android deploy`:

- `build`: query the latest Play Store internal track build number, bump `versionCode`, run `gradle assembleRelease bundleRelease`.
- `deploy`: `upload_to_play_store(track: 'internal', aab: ..., release_status: 'draft')`.
- `beta`: chains `build` then `deploy`.

### CI pipeline

Trigger: push to `main` touching `frontend/**` (excluding `frontend/ios/**`).

1. GCP authentication via `google-github-actions/auth@v2` with workload identity federation.
2. Setup Node 24, Java 17, Ruby 4.0.1.
3. Validate secrets: `ANDROID_SIGNING_KEY`, `ANDROID_SIGNING_KEY_PASSWORD`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `EXPO_PUBLIC_API_URL`.
4. `npm ci && npm run prebuild:clean -- --platform android`.
5. `bundle install`.
6. Decode the base64-encoded `ANDROID_SIGNING_KEY` to `$ANDROID_SIGNING_KEY_PATH`.
7. `bundle exec fastlane android build`.
8. Re-authenticate to GCP (the auth file is recreated for the deploy step).
9. `bundle exec fastlane android deploy`.

Required secrets:

| Secret | Purpose |
|---|---|
| `ANDROID_SIGNING_KEY`, `ANDROID_SIGNING_KEY_PASSWORD`, `ANDROID_SIGNING_KEY_ALIAS?` | Upload-key keystore |
| `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` | OIDC-assumable Google service account with `androidpublisher.releases.upload` |
| `EXPO_PUBLIC_API_URL` (or var) | Production API URL baked into the build |

### Manual lane

```bash
cd frontend
bundle install
export ANDROID_SIGNING_KEY_PATH=$PWD/.tmp/android-upload-key.jks
export ANDROID_SIGNING_KEY_PASSWORD=...
export ANDROID_SIGNING_KEY_ALIAS=upload-key-alias
export GOOGLE_GHA_CREDS_PATH=/path/to/key.json   # service account credentials
bundle exec fastlane android beta
```

## Story Project Sync + Ready-for-Dev Orchestrator

These are not deployment pipelines per se but they ship release-relevant automation.

### Story Project Sync (`story-project-sync.yml`)

Mirrors BMAD planning and implementation artifacts into the GitHub Project at `https://github.com/users/REW1L/projects/1`. Triggered by changes under `_bmad-output/**` and PRs against `_bmad-output/implementation-artifacts/**`. Sets the project status to `Ready for Dev`, `Review`, or `Done` based on PR state and artifact metadata.

Required secret: `GH_PROJECT_TOKEN` (PAT with `repo` and `project` scopes - cannot be the default `GITHUB_TOKEN` because the project is user-owned).

### Ready for Dev Orchestrator (`ready-for-dev-orchestrator.yml`)

When `story-project-sync` posts the marker comment `<!-- auto-dev:trigger v1 -->` on an issue, this workflow auto-attempts implementation by cascading through `claude → codex → copilot → kiro-cli`. Operator override via `gh workflow run ready-for-dev-orchestrator.yml -f issue_number=42 [-f agent_order=...]`.

Required secrets (any subset that exists is used; missing CLIs are skipped):

| Secret | CLI |
|---|---|
| `ANTHROPIC_API_KEY` | `claude` |
| `OPENAI_API_KEY` or `CODEX_API_KEY` | `codex` |
| `COPILOT_GITHUB_TOKEN` (PAT with Copilot Requests scope) | `copilot` |
| `KIRO_API_KEY` | `kiro-cli` |

The orchestrator commits to `auto-dev/issue-<n>`, pushes, and opens a PR closing the issue. `story-project-sync` then transitions the project board to `Review`.

## Release-readiness Sign-off

Before tagging a release, run through `docs/release-readiness-checklist.md` and capture evidence under `docs/release-evidence/<version>-<date>-channel-availability.md` (template at `docs/release-evidence/TEMPLATE-channel-availability.md`). The validation script under `scripts/validate-web-channel.mjs` is the recommended way to populate the web availability portion of the evidence file.

## Operational Runbooks

- Channel availability validation: `docs/release-validation/channel-availability-playbook.md`.
- Diagnostic validation matrix: `docs/release/diagnostic-validation-matrix.md`.
- Release support reference: `docs/release-support-reference.md`.
- Last completed run: `docs/release/runs/diagnostic-validation-f0ba65e-2026-05-23.md`.
