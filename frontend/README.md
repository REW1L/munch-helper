# Munch Helper Frontend

Native-first Expo Router client for Munch Helper.

## Architecture

The app follows a layered frontend architecture:

1. `api/*`
Typed transport + endpoint modules (`users`, `rooms`, `characters`).

2. `hooks/*`
Feature-oriented orchestration (`useUser`, `useRoomCharacters`, `useRoomCreate`, `useRoomJoin`).

3. `context/*`
Global user profile context shared across route groups.

4. `app/*`
Expo Router route files and screen composition.

5. `components/*`
Reusable UI building blocks and app shell boundary components.

Runtime config is validated at startup in `config/runtime.ts`; invalid production config fails fast.

## Prerequisites

- Node.js 24+
- npm 10+
- Xcode (for iOS simulator) / Android Studio (for Android emulator)

## Environment

Required variables:

- `EXPO_PUBLIC_API_URL`

Example `.env` for local development:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Production builds must provide a valid absolute URL. In development only, the app can fall back to `http://localhost:8080`.

## Local Development

Install dependencies:

```bash
npm ci
```

Run app:

```bash
npm run start
```

Run platform targets:

```bash
npm run ios
npm run android
```

## Quality Gates

Run these before opening a PR:

```bash
npm run lint
npm run tsc
npm run test
```

CI (`.github/workflows/frontend-infra-cd.yml`) enforces the same checks before web artifact export.

## Testing Strategy

- Unit tests cover transport/resilience behavior in `api/http.test.ts`.
- Add hook tests next for:
  - `hooks/useUser.ts`
  - `hooks/useCharacters.ts`

Focus on cancellation, retry behavior, and stale response protection.

## Build and Release

Web export (for infra deployment):

```bash
EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web
```

Artifacts are written to `frontend/dist`.


## Deployment

Frontend web artifacts are deployed with infrastructure from this repository.
See `../infrastructure/README.md` for Pulumi workflow details.
