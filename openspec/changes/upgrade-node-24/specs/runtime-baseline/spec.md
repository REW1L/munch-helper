# Spec Delta

## Purpose

Defines the Node.js major version supported across local development, automated workflows, containerized services, and deployed backend functions so the repository runs on one consistent baseline.

## ADDED Requirements

### Requirement: Node.js 24 is the project runtime baseline

All maintained project runtime surfaces SHALL use Node.js 24, including local development guidance, continuous integration workflows, service containers, and deployed backend functions.

#### Scenario: Backend runs on the unified runtime

- **WHEN** backend services are built, tested, or deployed
- **THEN** they use Node.js 24

#### Scenario: Repository workflows use the unified runtime

- **WHEN** a GitHub Actions workflow sets up Node.js for repository scripts or builds
- **THEN** it selects Node.js 24
