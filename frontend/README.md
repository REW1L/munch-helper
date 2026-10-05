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
Expo Router route files and screen composition, including the App Store support page at `/support` and localized Munchkin Classic and Second Edition guides at `/munchkin/rules`.

5. `components/*`
Reusable UI building blocks and app shell boundary components.

Runtime config is validated at startup in `config/runtime.ts`; invalid production config fails fast.

The Munchkin rules route contains concise, original overviews of Classic and Second Edition play. It does not bundle or display copyrighted rulebooks; it links to the official edition-specific PDFs as authoritative external sources. Second Edition rooms also track each character's Gold Pieces balance, starting at 500 GP, while physical card effects remain player-managed.

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
npm run typecheck
npm run test
```

For every change under `frontend/`, run `npm run test:e2e:mobile` from the repository root before opening a PR. The pre-commit hook may run it automatically, but the requirement does not depend on the hook being installed.

CI (`.github/workflows/frontend-infra-cd.yml`) enforces the same checks before web artifact export.

`npm run test` executes both the unit suite and the dedicated Expo Router room-route suite.

## Testing Strategy

- `npm run test:unit` runs the main frontend unit and hook suites.
- `npm run test:room-route` runs all Expo Router tests under `__tests__/app/`, including Rooms, Munchkin rules, and room gameplay routes.
- `npm run test:watch` watches the unit suite only; rerun `npm run test:room-route` after route-level changes.
- Unit tests cover transport/resilience behavior in `api/http.test.ts`.
- Add hook tests next for:
  - `hooks/useUser.ts`
  - `hooks/useCharacters.ts`
- For Expo Router, keep `app/*` route-only. Do not place test files inside `frontend/app`.
- Put tests for files in `frontend/app` under `frontend/__tests__`.

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
