# Tasks

## Room edition contracts
- [x] Allow and validate `munchkin-2e` room creation while preserving the Classic default in Mongo, service, API types, and OpenAPI.
- [x] Return persisted room type from all association success paths; route new joins and session restores using server room metadata.
- [x] Add backend and frontend regression tests for both editions, unknown values, default behavior, idempotent joins, and rollback.

## 2e companion experience
- [x] Add edition selection, localized create/join confirmation, edition-aware room header, and dedicated localized rules guide with official PDF link.
- [x] Hide gender as a stat in 2e character flows without changing stored Classic data; support per-room 500 GP balances and validated adjustments.
- [x] Publish coin updates to participants and history; add battle guidance/outcome presentation for 2e without changing Classic records.
- [x] Add tests for character, battle, guide, localization parity, room history, and notification seams; add a scenario-specific Maestro flow.

## Contracts and verification
- [x] Update API/data/OpenAPI/architecture/development docs and relevant README files; verify with OpenSpec and package/mobile gates, recording unavailable checks accurately.
