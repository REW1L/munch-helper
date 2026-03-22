# Infrastructure Development Guide

Generated: 2026-03-19T22:50:33Z

## Prerequisites

- Node.js and npm
- Pulumi CLI
- AWS credentials for the target account
- Frontend build artifacts in `frontend/dist`

## Main Commands

```bash
cd infrastructure
npm install
npm run build
npm run lint
npm run preview
npm run up
npm run destroy
```

## First-Time Stack Setup

```bash
cd infrastructure
pulumi stack init dev
pulumi config set aws:region eu-central-1
pulumi config set munch-helper-frontend:artifactDir ../frontend/dist
```

## Notes

- The stack expects an ACM certificate for `helpamunch.click` in `us-east-1`.
- Backend origin values are read from an existing CloudFormation stack rather than created inside this Pulumi project.
