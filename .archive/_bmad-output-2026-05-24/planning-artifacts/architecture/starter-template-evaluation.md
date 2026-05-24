# Starter Template Evaluation

## Primary Technology Domain

Mobile-first full-stack — Expo/React Native frontend + Node.js Lambda microservices backend. Brownfield project with fully established stack. No external starter template applies.

## Starter Options Considered

All new services must follow the existing service patterns already established in the repository. Two distinct internal patterns serve as the reference bases.

## Selected Starter: Existing Service Patterns

**Rationale for Selection:**
Introducing an external scaffold would create structural divergence and violate project-context rules about service boundary consistency. The correct templates are the two existing services that most closely match the new services' structural needs.

**Initialization Approach:**
```bash
# battle-service  → copy character-service, adapt name/env/routes/SNS topic
# log-service     → copy room-notifications-service, strip WebSocket fan-out, add Mongoose
#                   write (SNS writer Lambda) + add HTTP read app (GET /logs?roomId=X)
```

**Architectural Decisions by Service:**

**`battle-service` — base: `character-service`**
- Entry points: `src/app.ts` (Express), `src/index.ts` (local server), `src/lambda.ts` (API Gateway Lambda)
- Domain files: `src/service.ts`, `src/models/Battle.ts`, `src/publisher.ts` (battle_* SNS events)
- Own MongoDB collection via `BATTLE_MONGO_URI`
- Own SNS topic for `battle_started`, `battle_updated`, `battle_concluded`, `battle_discarded`
- SAM template: single HTTP API Lambda function

**`log-service` — base: `room-notifications-service` + `character-service` hybrid**
- Entry points: `src/subscriber.ts` (SNS-triggered Lambda — `SNSEvent → void`), `src/app.ts` (Express read API), `src/index.ts` (local Redis subscriber + HTTP server), `src/lambda-read.ts` (HTTP API Gateway Lambda)
- Domain files: `src/models/LogEvent.ts`
- Own MongoDB collection via `LOG_MONGO_URI`
- Subscribes to both character SNS topic and battle SNS topic
- SAM template: **two Lambda functions** — SNS trigger writer + HTTP API reader
- Local dev: Redis subscriber process + HTTP server

**Testing Structure:**
- `battle-service`: lifecycle state machine transitions (active → concluded → discarded) are the primary coverage target
- `log-service`: two independent test suites — SNS handler tests (mock SNSEvent, assert DB write) + HTTP handler tests (supertest, assert filtered roomId response)
