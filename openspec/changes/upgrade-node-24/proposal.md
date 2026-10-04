# Proposal

## Why

The repository currently runs backend development, CI, containers, and Lambda on Node.js 20 while other workflows already use Node.js 24. Aligning every maintained runtime on Node.js 24 removes this split and gives the project one supported Node baseline.

## What Changes

- Move backend GitHub Actions, service container images, and the AWS SAM Lambda runtime to Node.js 24.
- Set the repository's local and automated tooling guidance to Node.js 24.
- Update current runtime and deployment documentation to describe the unified baseline.

## Capabilities

### New Capabilities

- `runtime-baseline`: The supported Node.js version used by local development, CI, containers, and deployed backend functions.

### Modified Capabilities

None.

## Impact

Impacts backend Dockerfiles and SAM configuration, GitHub Actions workflows, repository agent instructions, and current runtime/deployment documentation. No application API or dependency changes are expected.
