# Munch Helper

A mobile application for managing and tracking board games with multiple players. Currently focused on **Munchkin**, enabling real-time character management with level counter and stats tracking, and game state synchronization across Web, iOS and Android devices.

# Overview

**Munch Helper** solves key problems in multiplayer board gaming:
- 👥 **Visibility**: Multiple players at a table can't easily see what others have in play
- 🧮 **Complexity**: Complex card interactions and score calculations complicate gameplay
- 📊 **Tracking**: Manual tracking of character stats, levels, and game events is error-prone

The app provides a digital companion for board games, particularly Munchkin, that streamlines gameplay while keeping the physical game intact.

# Project Goals

- Improve the player experience with digital support for multiplayer board games
- Create a mobile application (iOS and Android) for managing and tracking gameplay
- Build a scalable, cloud-native backend with clear service boundaries
- Deliver a highly testable codebase (>70% coverage) with automated testing

# Project Structure

```
munch-helper/
├── backend/                 # Microservices backend (Express.js + Lambda)
│   ├── gateway/            # API Gateway service
│   ├── user-service/       # User management and authentication
│   ├── room-service/       # Room and game session management
│   ├── character-service/  # Character data and game state
│   ├── sam/                # AWS SAM templates for Lambda deployment
│   └── scripts/            # Docker Compose startup scripts
├── frontend/               # Native mobile app (Expo Router + React Native)
│   ├── app/                # Route definitions and screens
│   ├── api/                # Typed HTTP client modules
│   ├── hooks/              # Feature-oriented composable logic
│   ├── components/         # Reusable UI components
│   ├── context/            # Global app state (user profile)
│   └── ios/, android/      # Platform-specific native code
├── infrastructure/         # Infrastructure as Code (Pulumi + AWS)
│   └── Frontend deployment configuration
└── docs/                   # Architecture and design documentation
    ├── descriptions/       # Feature specifications
    └── openapi/           # API specifications
```

# Technology Stack

## Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Serverless**: AWS Lambda with API Gateway
- **Container**: Docker (local development) and AWS SAM
- **Database**: MongoDB
- **Messaging**: AWS SNS (production), Redis Pub/Sub (local)
- **WebSocket**: AWS Lambda WebSocket API (production), Socket.IO (local)
- **Testing**: Vitest

## Frontend
- **Framework**: Expo Router (React Native)
- **Language**: TypeScript
- **State Management**: React Context + custom hooks
- **Platforms**: iOS and Android (native targets), Web (web export)
- **Testing**: Vitest
- **Linting**: ESLint

## Infrastructure
- **IaC**: Pulumi (TypeScript)
- **Cloud Provider**: AWS
- **CDN**: CloudFront
- **Storage**: S3 (artifact hosting)

# Core Features

## User Management
- Anonymous player access with limited game creation
- User registration for persistent profiles
- Avatar selection for character customization

## Room Management (Game Sessions)
- Create and join multiplayer game rooms
- Different room types (extensible design)
- Real-time player synchronization

## Character Management
- Create and manage player characters
- Track character stats (level, power, class, race, gender)
- Character ownership per player
- Real-time updates across all players in a room

## Battle System (NOT IMPLEMENTED YET)
- Real-time battle state management
- Card and buff tracking
- Event logging for game history

## Real-time Synchronization (NOT IMPLEMENTED YET)
- WebSocket-based room notifications
- Event-driven architecture for state updates
- Cross-device synchronization

# Getting Started

## Prerequisites

### All Platforms
- Node.js 20+ (backend) / Node.js 24+ (frontend)
- npm 10+

### Backend
- Docker
- AWS SAM CLI (optional, for Lambda deployment)

### Frontend
- Xcode 15+ (for iOS development)
- Android Studio (for Android development)

## Backend Development

1. **Start local services**:
   ```bash
   cd backend
   ./scripts/dev-up.sh
   ```
   This starts:
   - MongoDB instances (3 databases for each service)
   - Redis (for pub/sub)
   - Nginx gateway
   - All three microservices

   Gateway runs on `http://localhost:8080`

2. **Run tests**:
   ```bash
   cd backend
   npm test
   ```

3. **Stop services**:
   ```bash
   ./scripts/dev-down.sh
   ```

## Frontend Development

1. **Install dependencies**:
   ```bash
   cd frontend
   npm ci
   ```

2. **Configure environment**:
   ```bash
   # Create .env file
   echo "EXPO_PUBLIC_API_URL=http://localhost:8080" > .env
   ```

3. **Start development server**:
   ```bash
   npm run start
   ```

4. **Run on iOS/Android**:
   ```bash
   npm run ios    # Requires Xcode + iOS simulator
   npm run android # Requires Android SDK + emulator
   ```

5. **Quality gates before PR**:
   ```bash
   npm run lint
   npm run tsc
   npm run test
   ```

## Backend as AWS Lambda

The backend services support deployment to AWS Lambda with API Gateway:

```bash
cd backend

# Build Lambda artifacts
npm run sam:build

# Test locally
npm run sam:local:api

# Deploy to AWS
npm run sam:deploy
```

See [backend/README.md](backend/README.md) for detailed SAM configuration.

## Frontend Web Deployment

Export frontend as web artifacts for static hosting:

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web
```

Artifacts are written to `frontend/dist` and ready for infrastructure deployment.

# Deployment

## Infrastructure (AWS)

Frontend is deployed using Pulumi infrastructure as code:

```bash
cd infrastructure
npm install
pulumi stack init dev
pulumi config set aws:region eu-central-1
pulumi config set munch-helper-frontend:artifactDir ../frontend/dist
pulumi up
```

This deploys:
- Private S3 bucket for artifacts
- CloudFront distribution (CDN)
- Origin Access Control for security
- SPA routing (404/403 → `/index.html`)

See [infrastructure/README.md](infrastructure/README.md) for full details.

## Backend Deployment

Deploy backend services to AWS Lambda:

```bash
cd backend
npm run sam:build
npm run sam:deploy
```

Configure via `sam/samconfig.toml` or environment variables.

# API Specification

The complete OpenAPI specification is in [docs/openapi/openapi.yaml](docs/openapi/openapi.yaml).

## Main Endpoints

**User Management**
- `POST /users` - Create new user
- `GET /users/:userId` - Get user profile
- `PATCH /users/:userId` - Update user profile

**Room Management**
- `POST /rooms` - Create new game room
- `POST /rooms/associations` - Join existing room
- `GET /rooms/:roomId` (WebSocket) - Subscribe to room updates

**Character Management**
- `GET /characters?roomId=...` - List characters in a room
- `POST /characters` - Create character
- `PATCH /characters/:characterId` - Update character
- `DELETE /characters/:characterId` - Delete character

# Testing

## Backend
```bash
cd backend
npm test              # Run all tests
npm run test:watch   # Watch mode
```

## Frontend
```bash
cd frontend
npm test              # Run all tests
npm run test:watch   # Watch mode
```

**Current Coverage**: Working towards 70%+ target
**Testing Strategy**: Unit tests for critical paths (HTTP transport, retry logic, cancellation); hook tests for feature orchestration

# Architecture

## Microservices Pattern

The backend uses a clear separation of concerns:

- **Gateway**: Single entry point, request routing, authentication placeholder
- **User Service**: User profiles and auth
- **Room Service**: Game session management and WebSocket coordination
- **Character Service**: Character creation, updates, and game state

Communication patterns:
- HTTP for REST endpoints
- Service-to-service HTTP calls (room → character)
- WebSocket for real-time notifications
- Async messaging via SNS (production) or Redis (local)

## Frontend Architecture

Layered architecture with clear dependencies:

1. **Transport Layer** (`api/*`): Typed HTTP clients per domain
2. **Feature Layer** (`hooks/*`): Composable orchestration hooks
3. **State Layer** (`context/*`): Global app state (user profile)
4. **Route Layer** (`app/*`): Expo Router screen definitions
5. **Component Layer** (`components/*`): Reusable UI building blocks

# Database Schema

```
USER (1) ──── (N) CHARACTER
ROOM_TYPE (1) ──── (N) ROOM
ROOM (1) ──── (N) CHARACTER
```

**Tables**:
- `users`: Player profiles (name, avatar, timestamps)
- `room_types`: Game type definitions (Munchkin, extensible)
- `rooms`: Game sessions (type, creation time)
- `characters`: Player characters in rooms (stats, associations)

# Documentation

- **Architecture**: [docs/descriptions/MunchHelper.md](docs/descriptions/MunchHelper.md)
- **Backend Services**: [docs/descriptions/MunchHelper/Backend Services.md](docs/descriptions/MunchHelper/Backend%20Services.md)
- **Frontend Design**: [docs/descriptions/MunchHelper/Frontend.md](docs/descriptions/MunchHelper/Frontend.md)
- **API Spec**: [docs/openapi/openapi.yaml](docs/openapi/openapi.yaml)
- **Backend Details**: [backend/README.md](backend/README.md)
- **Frontend Details**: [frontend/README.md](frontend/README.md)
- **Infrastructure Details**: [infrastructure/README.md](infrastructure/README.md)

# Contributing

1. Run quality gates before opening a PR:
   ```bash
   npm run lint
   npm run tsc
   npm run test
   ```

2. Ensure test coverage in new features
3. Follow existing code structure and patterns
4. Update relevant documentation in `docs/`

# License

UNLICENSED

# Current Status

**Phase**: MVP Development
- Core backend services: ✅ Complete
- Frontend screens: ✅ In progress
- WebSocket integration: 🚧 Design complete, implementation pending
- Production deployment: 🚧 Infrastructure ready, Lambda SAM configured
- App store submissions: ⏳ Pending feature completion

# Get Started

```bash
# Clone repository
git clone <repo-url>
cd munch-helper

# Backend development
cd backend && ./scripts/dev-up.sh

# Frontend development (in another terminal)
cd frontend && npm ci && npm run start

# Open http://localhost:8084 for API
# and use `npm run ios` or `npm run android` for mobile
```

For detailed setup instructions, see:
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
- [infrastructure/README.md](infrastructure/README.md)
