# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## [v2.0.0] - 2026-03-13

### Breaking Changes
- Removed the backend gateway service and replaced it with an Nginx-based edge layer for local and deployment flows.
- Updated service routing and ports to align with the new backend entrypoint architecture.

### Added
- New room notifications microservice for real-time room character events.
- Character event publishing pipeline in character-service, including stronger logging and publishing flow handling.
- Frontend WebSocket API client and room subscription support:
  - Added RoomWebSocketClient.
  - Added useRoomWebSocket hook.
  - Added tests for WebSocket client and hook behavior.
- Expanded backend tests for room notifications app paths.
- Nginx configuration for improved CORS handling and integration with WebSocket traffic.
- aws4 dependency updates needed for signed requests in room notifications/backend integration.

### Changed
- Refactored backend architecture and CI/CD pipeline to remove gateway-specific stages and align with current test coverage and services.
- Updated AWS SAM template and infrastructure wiring for the room notifications and real-time flow.
- Updated docker-compose local setup and backend package dependency graph.
- Improved operational logging across character-service and room-notifications-service.
- Updated technical documentation for backend services, frontend integration, and infrastructure descriptions.

### Fixed
- Corrected local WebSocket connection request parsing and related error messaging.
- Adjusted room notifications role permissions to allow GET connections in WebSocket API usage.

### Diff Summary
- 39 files changed, 3460 insertions, 240 deletions.
- Key areas: backend service architecture, real-time notifications pipeline, frontend WebSocket integration, CI/CD and infrastructure updates.
