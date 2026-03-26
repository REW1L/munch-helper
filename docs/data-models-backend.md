# Backend Data Models

Generated: 2026-03-19T22:50:33Z

This quick-scan summary is derived from OpenAPI schemas and service model file locations.

## Core Entities

### User

Source hints:

- `docs/openapi/schemas/User.yaml`
- `backend/user-service/src/models/User.ts`

Fields:

- `id: string`
- `name: string`
- `avatarId: integer`

### Room

Source hints:

- `backend/room-service/src/models/Room.ts`
- `docs/openapi/schemas/CreateRoomResponse.yaml`
- `docs/openapi/schemas/JoinRoomResponse.yaml`

Confirmed contract fields:

- `roomId: string` in create/join responses

The quick scan confirms a dedicated Room model file, but not the full persisted schema fields.

### Character

Source hints:

- `docs/openapi/schemas/Character.yaml`
- `backend/character-service/src/models/Character.ts`

Fields:

- `id: string`
- `userId: string`
- `name: string`
- `avatar: integer`
- `color: string` in hex format
- `level: integer`
- `power: integer`
- `class: string[]`
- `race: string[]`
- `gender: string[]`

### RoomConnection

Source hints:

- `backend/room-notifications-service/src/models/RoomConnection.ts`

The notifications service keeps a persisted connection model, but this quick scan did not read the schema deeply enough to document all fields.

## Data Ownership

- `user-service` owns user profile records
- `room-service` owns room/session records
- `character-service` owns character records
- `room-notifications-service` owns connection/session metadata for notification fan-out

## Follow-Up

For a field-complete schema reference, do a deep scan of the four `src/models/` files and any service-layer validation logic.
