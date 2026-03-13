# Frontend

# Application views

[Main View](Frontend/Main%20View.md)

[Room View](Frontend/Room%20View.md)

[Create Character View](Frontend/Create%20Character%20View.md)

[Change Character View](Frontend/Change%20Character%20View.md)

[Battle View](Frontend/Battle%20View.md)

[Log View](Frontend/Log%20View.md)

# Architecturally significant requirements

## Runtime and deployment
- The frontend shall run as an Expo Router application with a single root layout that initializes shared providers before any screen is rendered.
- The frontend shall validate runtime configuration at startup and fail fast when production configuration is invalid.
- The frontend shall resolve all backend HTTP endpoints from `EXPO_PUBLIC_API_URL`; in development only, it may fall back to `http://localhost:8080`.
- The frontend shall derive WebSocket endpoints from the same configured API base URL so HTTP and realtime traffic stay environment-aligned.

## Application state and identity
- The frontend shall maintain a global user profile context at the application root so all route groups can access the current user identity.
- The frontend shall persist the user profile in local device storage and restore it on startup.
- The frontend shall reconcile the locally stored user profile with the backend on startup and refresh local state from the authoritative remote user record when available.
- If a previously stored user no longer exists remotely, the frontend shall recreate that user and continue using the recreated identity.

## Backend integration
- The frontend shall access backend capabilities through typed API modules instead of calling `fetch` directly from route components.
- The frontend shall use a shared HTTP transport that serializes JSON requests, normalizes non-success responses into structured API errors, and retries transient failures with bounded backoff.
- The frontend shall normalize backend character payloads into a frontend-specific model, including conversion of serialized list fields and fallback generation of deterministic character colors when backend colors are invalid.
- Room creation and room joining shall be executed through dedicated mutations that encapsulate the request contracts for room bootstrap flows.

## Room session behavior
- The frontend shall treat room character data as room-scoped server state managed through a shared query cache.
- Character creation and update flows shall apply optimistic UI updates and reconcile with the authoritative backend response.
- After the initial room character load completes, the frontend shall ensure the current user has a character in the room and avoid repeated automatic creation attempts within a short cooldown window.
- Room entry shall use a bootstrap route that resolves create-vs-join behavior before navigating to the concrete room route.

## Realtime updates
- The frontend shall keep room character views synchronized through a room-scoped WebSocket connection rather than client polling.
- WebSocket connections shall be keyed by both `roomId` and `userId`, and the frontend shall disconnect and recreate the connection when either value changes.
- The WebSocket client shall validate incoming notification payloads before fan-out to subscribers.
- The WebSocket client shall send heartbeat messages and attempt reconnection with exponential backoff and a bounded retry count after unintentional disconnects.
- Realtime character notifications shall invalidate cached room character queries so the UI refreshes from backend state after create, update, and delete events.