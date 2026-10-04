# Design

## Context

Backend CI, its Docker images, and SAM currently target Node.js 20. Other CI workflows already use Node.js 24. The runtime upgrade does not change application contracts or dependencies.

## Goals / Non-Goals

**Goals:**
- Use Node.js 24 for local guidance, CI, Docker, and Lambda.
- Keep current architecture and dependency versions intact.
- Make current repository documentation match the supported runtime.

**Non-Goals:**
- Upgrade application dependencies or change runtime behavior beyond the Node.js major version.
- Rewrite historical scan reports or archived planning artifacts.

## Decisions

- Pin GitHub Actions to `node-version: 24`, containers to the Node 24 Alpine image, and SAM to `nodejs24.x`. These are the runtime selectors consumed by their respective platforms.
- Declare Node.js 24 in the root, backend, and infrastructure package manifests' `engines` fields; the frontend was already configured for Node.js 24 in its build workflows. Refresh affected lockfiles through npm.
- Update current guidance and architecture/deployment summaries. Historical scan output and completed planning records remain historical records.

## Risks / Trade-offs

- **Runtime incompatibility in a dependency or native build tool** → Run backend and frontend package gates plus infrastructure checks on Node.js 24, then use PR CI to identify platform-specific issues.
- **AWS SAM runtime support mismatch** → Validate the SAM template build and rely on backend CI before the PR is considered green.

## Migration Plan

Update selectors and metadata in one branch, run affected local checks, open a PR, then address CI failures until all applicable PR checks are green. Rollback is reverting the focused PR.
