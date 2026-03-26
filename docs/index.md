# Project Documentation Index

Generated: 2026-03-19T22:50:33Z

## Project Overview

- Type: monorepo with 3 parts
- Primary language: TypeScript
- Architecture: Expo client + service-oriented backend + Pulumi-managed frontend edge
- Scan level: quick

## Quick Reference

### Backend

- Type: backend services
- Stack: Node.js, Express, MongoDB, Redis, AWS SAM
- Root: `backend/`

### Frontend

- Type: mobile/web client
- Stack: Expo, React Native, Expo Router, TanStack Query
- Root: `frontend/`

### Infrastructure

- Type: infrastructure
- Stack: Pulumi, S3, CloudFront, Route53
- Root: `infrastructure/`

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Architecture - Backend](./architecture-backend.md)
- [Architecture - Frontend](./architecture-frontend.md)
- [Architecture - Infrastructure](./architecture-infrastructure.md)
- [Component Inventory - Frontend](./component-inventory-frontend.md)
- [Development Guide - Backend](./development-guide-backend.md)
- [Development Guide - Frontend](./development-guide-frontend.md)
- [Development Guide - Infrastructure](./development-guide-infrastructure.md)
- [Deployment Guide](./deployment-guide.md)
- [Integration Architecture](./integration-architecture.md)
- [API Contracts - Backend](./api-contracts-backend.md)
- [Data Models - Backend](./data-models-backend.md)

## Existing Documentation

- [Root README](./../README.md) - top-level product and repository overview
- [Backend README](./../backend/README.md) - local runtime and SAM workflow
- [Frontend README](./../frontend/README.md) - frontend architecture and developer commands
- [Infrastructure README](./../infrastructure/README.md) - Pulumi deployment workflow
- [OpenAPI Specification](./openapi/openapi.yaml) - backend API contract source
- [Product Description](./descriptions/MunchHelper.md) - feature-oriented overview

## Getting Started

1. Read [Project Overview](./project-overview.md).
2. Use [Source Tree Analysis](./source-tree-analysis.md) to locate relevant code.
3. Pick the part-specific architecture doc for the area you want to change.
4. Use the corresponding development guide before running local commands.

## Notes

- This document set reflects a quick initial scan plus selective reads of important runtime files.
- A deeper follow-up scan would be useful if you want exhaustive model-field documentation or route-by-route implementation notes.
