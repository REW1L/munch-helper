# Deployment Guide

Generated: 2026-03-19T22:50:33Z

## Backend Deployment

The backend uses AWS SAM from `backend/sam/template.yaml`.

### Provisioned Resources

- HTTP API
- WebSocket API and stage
- SNS topic for room character events
- Lambda functions for user, room, character, and notifications services
- IAM roles and permissions for Lambda execution and WebSocket connection management

### Deploy

```bash
cd backend
npm run sam:build
npm run sam:deploy
```

## Frontend Deployment

The frontend is exported as static web assets and then uploaded by Pulumi.

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web

cd ../infrastructure
npm install
pulumi preview
pulumi up
```

### Store Submission URLs

The iOS App Store and Google Play submissions should use these canonical release-facing URLs:

- Privacy Policy: `https://helpamunch.click/privacy`
- Support: `https://helpamunch.click/support`

The routes are owned by Expo Router files at `frontend/app/privacy.tsx` and
`frontend/app/support.tsx`. The frontend infrastructure workflow builds them with
`npm run export:web` and Pulumi publishes the static export to `helpamunch.click`.

## CI/CD Workflows Found

- `.github/workflows/backend-ci-cd.yml`
- `.github/workflows/frontend-infra-cd.yml`
- `.github/workflows/android-play-store-cd.yml`
- `.github/workflows/ios-app-store-cd.yml`

### Release Channel Validation

Story 7.9 release channel validation produces a repeatable availability record for the current web, iOS, and Android release candidate. Run the playbook at `docs/release-validation/channel-availability-playbook.md`, start from the evidence template at `docs/release-evidence/TEMPLATE-channel-availability.md`, and save completed records under `docs/release-evidence/`.

The web reachability check is automated with `scripts/validate-web-channel.mjs`:

```bash
node scripts/validate-web-channel.mjs --version <release-version>
```

Prior evidence examples include `docs/release-evidence/1.1.1-2026-05-23-channel-availability.md`.

## Operational Notes

- CloudFront routes `/api/*` to the backend HTTP API and `/ws*` to the backend WebSocket API.
- Static content is served from a private S3 bucket through CloudFront.

## Release Readiness

Before any iOS, Play, or web release is approved, run the
[Release Readiness Checklist](./release-readiness-checklist.md) against the
candidate release and preserve the completed evidence record for that release.
