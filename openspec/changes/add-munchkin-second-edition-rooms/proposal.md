# Proposal

## Why

Players need to identify and join Munchkin Second Edition rooms without changing the meaning or behavior of existing Classic rooms. The new edition also introduces player-tracked coin balances and battle nuances that the current Classic-only companion does not represent.

## What Changes

- Add persisted `munchkin-2e` rooms while retaining `munchkin` as the default for legacy callers and rooms; return the room type from association joins and route using stored metadata.
- Add edition-aware create, join, restore, room header, and rules navigation on web and mobile.
- Add an original localized 2e guide linked to the official rules PDF.
- Track room-scoped Gold Pieces for 2e characters with validated mutations, real-time updates, and history; hide gender as a game stat in 2e while preserving existing Classic data.
- Make battle guidance and outcome presentation edition-aware without claiming to enforce card effects or altering historical Classic semantics.

## Capabilities

### New Capabilities
- `room-editions`: Persisted edition selection and edition-aware room entry and presentation.
- `munchkin-second-edition-guide`: Original localized guidance and official rules reference for 2e rooms.
- `room-character-coins`: Room-scoped, validated character coin tracking with events and history.
- `edition-aware-battles`: Edition-aware battle guidance and presentation.

### Modified Capabilities

None.

## Impact

Room, character, battle, notifications, and log services; Mongo schemas; frontend room APIs, hooks, routes, character and battle UI; localization catalogs; OpenAPI and API/data/architecture/development documentation; Maestro E2E coverage. No new dependency is expected.
