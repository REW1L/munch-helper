# Frontend Architecture

Generated: 2026-03-19T22:50:33Z

## Executive Summary

The frontend is a native-first Expo Router application that targets iOS, Android, and web from one TypeScript codebase. It uses route files for navigation, a small context layer for the current user profile, and TanStack Query plus custom hooks for server interaction and room synchronization.

## Stack

| Category | Technology |
| --- | --- |
| App framework | Expo 55 |
| UI runtime | React 19, React Native 0.83 |
| Routing | Expo Router |
| Server state | TanStack Query |
| Validation | Zod |
| Testing | Vitest, Testing Library |
| Native support | Expo dev client, iOS and Android native projects |

## Architecture Pattern

- Route-driven screen composition in `app/`
- Thin API layer in `api/`
- Feature hooks in `hooks/`
- Global user profile context in `context/`
- Runtime configuration validation before app boot

## Key Runtime Flow

1. `frontend/app/_layout.tsx` validates runtime config and creates a shared `QueryClient`.
2. `useUserProfile` provides user identity state to the app tree.
3. Route screens call hook-level orchestration for rooms and characters.
4. `RoomWebSocketClient` derives a WebSocket URL from the HTTP API base, subscribes to room events, and reconnects with exponential backoff.
5. Hook-level code updates local query state after HTTP mutations and WebSocket events.

## Component Overview

- App shell:
  - `RootErrorBoundary.tsx`
  - route stack in `app/_layout.tsx`
- Shared UI:
  - `VioletButton.tsx`
- Munchkin-specific UI:
  - `AttributeList.tsx`
  - `CurrentCharacterFooter.tsx`
  - `NativePicker.tsx`
  - `RoomCharacterCard.tsx`
  - `RoomCharactersList.tsx`

## Route Overview

- `/`: entry screen
- `/rooms`: room list or lobby flow
- `/munchkin`: room-type flow
- `/munchkin/[roomNumber]`: active room gameplay
- `/main/modal-*`: modal flows for user/avatar/room/shop actions
- `/privacy`: privacy policy
- `/support`: support page

## Configuration

- Required environment variable: `EXPO_PUBLIC_API_URL`
- Development can fall back to `http://localhost:8080`
- Production requires a valid absolute URL

## Testing Strategy

- API transport tests cover HTTP and WebSocket behavior
- Hook tests cover user, room, character, and WebSocket orchestration
- Linting and typecheck are part of the expected quality gate
