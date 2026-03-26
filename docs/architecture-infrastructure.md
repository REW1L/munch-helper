# Infrastructure Architecture

Generated: 2026-03-19T22:50:33Z

## Executive Summary

The infrastructure project deploys the static frontend and fronts the backend APIs behind a single public domain. It uses Pulumi to provision storage, CDN, TLS, DNS records, and artifact uploads.

## Stack

| Category | Technology |
| --- | --- |
| IaC | Pulumi |
| Cloud provider | AWS |
| Static hosting | S3 |
| CDN and origin routing | CloudFront |
| DNS | Route53 |
| Certificates | ACM in `us-east-1` |

## Resources Created

- Private S3 bucket for frontend artifacts
- Public access blocking and ownership controls
- CloudFront Origin Access Control for S3
- CloudFront distribution with:
  - default static origin
  - `/api/*` origin to backend HTTP API
  - `/ws` and `/ws/*` origin to backend WebSocket API
- Route53 `A` and `AAAA` alias records for `helpamunch.click`
- Bucket policy allowing CloudFront-only reads

## Deployment Model

- The stack resolves backend outputs from CloudFormation stack `munch-helper-user-service` in `eu-central-1`.
- The frontend artifact directory defaults to `../frontend/dist`.
- Deployment fails fast if that directory does not exist.
- Artifact uploads set cache headers based on file type and path.

## Architecture Notes

- The infrastructure project is frontend-focused rather than a full environment bootstrap.
- Backend infrastructure lifecycle is managed separately through AWS SAM in `backend/sam/`.
