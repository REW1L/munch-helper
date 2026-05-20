# Backend API Contracts

Generated: 2026-03-19T22:50:33Z

Source of truth for this summary: `docs/openapi/`.

## HTTP Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/users` | Create a user |
| `PATCH` | `/users/{userId}` | Update a user profile |
| `POST` | `/rooms` | Create a room |
| `POST` | `/rooms/associations` | Join a room |
| `GET` | `/characters?roomId=...` | List characters in a room |
| `PUT` | `/characters` | Create a character |
| `POST` | `/characters/{characterId}` | Update a character |
| `DELETE` | `/characters/{characterId}` | Delete a character |
| `DELETE` | `/battles/{id}` | Discard an active battle (Story 5.7 — soft delete) |

<!-- Battle endpoints owned by Stories 5.1 / 5.3 / 5.6 (GET, POST, PATCH, POST conclude)
     are implemented but not yet captured here. See deferred-work backlog for backfill. -->

## WebSocket Contract

OpenAPI models room notifications as `/rooms/{roomId}`:

- `GET /rooms/{roomId}?userId=...`: WebSocket handshake
- `DELETE /rooms/{roomId}`: disconnect contract

Server-to-client event schemas:

- `character_created`
- `character_updated`
- `character_deleted`
- `battle_discarded` (Story 5.7)

Character events contain `event` and `event_body.characterId`. Battle events contain `event` and `event_body.battleId`.

<!-- battle_started / battle_updated / battle_concluded are emitted by stories 5.1 /
     5.3 / 5.6 but not yet documented here. See deferred-work backlog. -->

## Notes

- OpenAPI uses a few nonstandard HTTP method choices relative to conventional REST naming. Generated consumers and docs should stay aligned with the spec unless runtime code changes deliberately.
- The live frontend WebSocket client constructs `/ws?roomId=...&userId=...`, so the repository currently contains both an API-contract view and an edge-routing view of notifications.
