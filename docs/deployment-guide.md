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

## CI/CD Workflows Found

- `.github/workflows/backend-ci-cd.yml`
- `.github/workflows/frontend-infra-cd.yml`
- `.github/workflows/android-play-store-cd.yml`
- `.github/workflows/ios-app-store-cd.yml`

## Operational Notes

- CloudFront routes `/api/*` to the backend HTTP API and `/ws*` to the backend WebSocket API.
- Static content is served from a private S3 bucket through CloudFront.
