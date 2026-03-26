# Frontend Development Guide

Generated: 2026-03-19T22:50:33Z

## Prerequisites

- Node.js 24+
- npm 10+
- Xcode for iOS simulator support
- Android Studio for Android emulator support

## Setup

1. `cd frontend`
2. `npm ci`
3. Create `.env` with:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
```

## Main Commands

```bash
cd frontend
npm run start
npm run ios
npm run android
npm run web
npm run lint
npm run tsc
npm run test
npm run test:coverage
```

## Build Output

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://your-api-domain npm run export:web
```

Artifacts are written to `frontend/dist`.

## Development Notes

- Runtime configuration is validated at startup.
- The frontend expects the backend edge to expose both HTTP `/api` and WebSocket `/ws`.
- React Query is configured globally with a 15 second stale time and one retry by default.
