## Why

The refreshed store screenshots expose fixture instability: repeated fresh app launches create duplicate screenshot-profile users in the same seeded room, the history screenshot shows repeated "Captain Rowan created" rows instead of the intended battle story, and the table contains far more characters than a Munchkin game should show. The store assets should be reproducible, believable, and visually separated enough that the app screenshot does not blend into the surrounding caption frame.

## What Changes

- Seed an isolated room fixture for each captured story slide instead of reusing one room across all four Maestro flows.
- Keep `launchApp: clearState: true` so each flow starts from a predictable app state, but prevent repeated screenshot-profile joins from accumulating in the same room history.
- Reduce the seeded table to a realistic Munchkin-sized cast: four seeded characters, with the screenshot profile join producing roughly five visible players.
- Use distinct seeded character names and avatar IDs so screenshots do not show duplicated characters.
- Ensure the history/log screenshot prioritizes meaningful story events (`Dungeon Door`, `Fallen Gate`, table updates) rather than repeated screenshot-profile create events.
- Strengthen visual separation between the store background/caption band and the embedded app screenshot while preserving the existing on-brand palette and bare rounded screenshot style.
- Update Maestro assertions and screenshot documentation to match per-slide seeding and the smaller cast.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `store-screenshots`: Tighten screenshot fixture requirements so each slide uses isolated seeded data, the seeded table size matches the supported game, generated log screenshots avoid repeated screenshot-profile setup noise, and captioned previews maintain visible separation between frame and app screenshot.

## Impact

- **Scripts**: `scripts/seed-app-store-room.mjs` (bounded cast, unique avatars, optional per-slide fixture behavior if needed), `scripts/capture-app-store-screenshots.mjs` and `scripts/capture-google-play-screenshots.mjs` (seed per slide and pass that room ID into each flow), `scripts/generate-app-store-preview-redesign.py` (frame/screenshot contrast refinement), `scripts/README-screenshots.md`.
- **Maestro**: `maestro/app_store_room_view.yaml`, `maestro/app_store_battle.yaml`, `maestro/app_store_log.yaml`, and possibly `maestro/app_store_rooms_home.yaml` if assertions or setup assumptions change.
- **Backend/API**: no production API changes expected; the pipeline continues to use local backend endpoints and disposable local data.
- **App code**: no normal runtime behavior changes expected. Screenshot fixes should be achieved through local tooling and fixture isolation rather than filtering production history.
- **Output artifacts**: regenerated gitignored screenshots under `screenshots/iphone69*` and `screenshots/android1080x2400*` must be visually inspected.
