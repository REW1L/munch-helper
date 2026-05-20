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
| `GET` | `/battles?roomId=...&status=active` | Get the active battle for a room |
| `POST` | `/battles` | Start a battle |
| `PATCH` | `/battles/{id}` | Update an active battle |
| `POST` | `/battles/{id}/conclude` | Conclude an active battle |
| `DELETE` | `/battles/{id}` | Discard an active battle |

## WebSocket Contract

OpenAPI models room notifications as `/rooms/{roomId}`:

- `GET /rooms/{roomId}?userId=...`: WebSocket handshake
- `DELETE /rooms/{roomId}`: disconnect contract

Server-to-client event schemas:

- `character_created`
- `character_updated`
- `character_deleted`
- `battle_started`
- `battle_updated`
- `battle_concluded`
- `battle_discarded`

Character events contain `event` and `event_body.characterId`. Battle events contain `event` and `event_body.battleId`.

## Notes

- OpenAPI uses a few nonstandard HTTP method choices relative to conventional REST naming. Generated consumers and docs should stay aligned with the spec unless runtime code changes deliberately.
- The live frontend WebSocket client constructs `/ws?roomId=...&userId=...`, so the repository currently contains both an API-contract view and an edge-routing view of notifications.
