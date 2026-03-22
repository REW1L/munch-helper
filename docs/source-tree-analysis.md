# Source Tree Analysis

Generated: 2026-03-19T22:50:33Z

## Top Level

```text
munch-helper/
|-- backend/                # Microservices, local orchestration, SAM deployment
|   |-- user-service/       # User creation and profile updates
|   |-- room-service/       # Room creation and joining flows
|   |-- character-service/  # Character CRUD and event publishing
|   |-- room-notifications-service/ # WebSocket event fan-out
|   |-- nginx/              # Local reverse proxy entry point
|   |-- sam/                # AWS SAM template and sample events
|   |-- scripts/            # Local dev lifecycle scripts
|   `-- docker-compose.local.yml
|-- frontend/               # Expo Router app and web export
|   |-- app/                # Route files and screen composition
|   |-- api/                # HTTP and WebSocket client modules
|   |-- hooks/              # Feature orchestration hooks
|   |-- components/         # Shared UI building blocks
|   |-- context/            # User profile context
|   |-- config/             # Runtime config validation
|   |-- constants/          # Theme and avatar metadata
|   |-- assets/             # Static assets
|   |-- ios/ android/       # Native platform projects
|   `-- dist/               # Web export artifacts
|-- infrastructure/         # Pulumi deployment for frontend + edge routing
|   |-- index.ts            # Main stack definition
|   |-- Pulumi.yaml         # Stack metadata
|   `-- Pulumi.dev.yaml     # Environment config
|-- docs/                   # Product, OpenAPI, and generated project docs
|-- scripts/                # Workspace-level helper scripts
`-- _bmad/                  # BMAD configuration and memory
```

## Backend Critical Folders

- `backend/user-service/src/`: Express app, Mongo bootstrap, Lambda handler, `User` model, service tests
- `backend/room-service/src/`: room API, inter-service call orchestration, `Room` model
- `backend/character-service/src/`: character API, publisher abstraction, `Character` model
- `backend/room-notifications-service/src/`: WebSocket server and Lambda event bridge, `RoomConnection` model
- `backend/sam/template.yaml`: cloud HTTP API, WebSocket API, SNS topic, IAM roles, Lambda wiring
- `backend/docker-compose.local.yml`: local composition of Nginx, MongoDB, Redis, and all services

## Frontend Critical Folders

- `frontend/app/`: route entry points including landing, room list, room gameplay, privacy, and support screens
- `frontend/api/`: API wrappers for users, rooms, characters, and WebSocket transport
- `frontend/hooks/`: room/user orchestration and WebSocket subscription logic
- `frontend/components/munchkin/`: domain UI such as character cards, pickers, and room lists
- `frontend/config/runtime.ts`: environment validation and API base URL resolution
- `frontend/dist/`: deployable static web build consumed by Pulumi

## Infrastructure Critical Folders

- `infrastructure/index.ts`: S3 bucket, CloudFront distribution, Route53 aliases, artifact upload loop
- `infrastructure/bin/index.js`: Pulumi entry script

## Entry Points

- Backend local HTTP edge: `backend/nginx/nginx.conf` via Docker Compose on `http://localhost:8080`
- Backend service processes: each service `src/index.ts`
- Backend Lambda handlers: each service `src/lambda.ts`
- Frontend app bootstrap: `frontend/app/_layout.tsx`
- Frontend runtime HTTP/WebSocket base: `frontend/config/runtime.ts`
- Infrastructure deployment entry: `infrastructure/index.ts`

## Cross-Part Interface Points

- Frontend -> Backend HTTP: `/api/users`, `/api/rooms`, `/api/characters`
- Frontend -> Backend WebSocket: `/ws?roomId=...&userId=...`
- Room service -> Character service: synchronous HTTP call during create/join flow
- Character service -> Notifications service:
  - Local: Redis pub/sub
  - Cloud: SNS -> Lambda -> API Gateway WebSocket management API
