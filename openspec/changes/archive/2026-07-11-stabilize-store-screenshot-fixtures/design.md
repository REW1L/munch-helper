## Context

The `refresh-store-screenshots` change created a four-slide App Store / Google Play screenshot pipeline. The generated outputs surfaced three fixture-quality defects:

- The capture runners seed one room, then run multiple Maestro flows against that same room.
- Each Maestro flow launches the app with `clearState: true`; the screenshot profile therefore creates a new backend user on each flow.
- Each fresh profile join creates a new default character in the same room, which emits `character_created` and appears at the top of the newest-first history log.

The current seed also creates fourteen named characters and reuses avatar IDs. That helped avoid seeing the joined screenshot profile in one layout, but it now makes the screenshots look unlike a 2-6 player Munchkin game and makes some characters look duplicated.

This change assumes the screenshot pipeline runs against disposable local development data. The local database can be cleared or recreated between attempts, so the automation should prefer fresh isolated fixtures over complex cleanup or production behavior changes.

## Goals / Non-Goals

**Goals:**

- Keep the four-slide story from `refresh-store-screenshots`.
- Seed a fresh, isolated room for each captured slide so repeated `clearState` launches cannot pollute a shared room history.
- Show a realistic table size: four seeded characters plus the screenshot profile join where the UI flow requires it.
- Use distinct seeded characters and avatar IDs.
- Make the log screenshot show meaningful battle/history events without repeated screenshot-profile `created` rows.
- Preserve production app behavior and backend APIs.
- Improve store-frame separation so the embedded screenshot is visibly distinct from the caption/background area.

**Non-Goals:**

- Adding backend cleanup endpoints or direct log-write APIs.
- Filtering normal production history.
- Reworking the four story beats, captions, target canvases, or store output directories.
- Reintroducing hardware device bezels.
- Solving iPad/tablet screenshots or the Google Play feature graphic.

## Decisions

### D1: Seed one room per captured slide

The capture runners will seed immediately before each Maestro flow and pass that slide-specific `ROOM_ID` to the flow. This keeps `launchApp: clearState: true` intact while ensuring a screenshot-profile join can only affect the room used for that single slide.

- *Alternative considered*: reuse one seeded room and disable `clearState`. Rejected because cross-flow app state becomes harder to reason about and failures can cascade.
- *Alternative considered*: stable screenshot user identity. Rejected for this change because it touches app profile bootstrap behavior and is unnecessary when local data is disposable.
- *Alternative considered*: screenshot-only filtering of `character_created` log rows. Rejected as the primary fix because it changes the screen output instead of preventing fixture pollution.

### D2: Keep the seed as real backend actions

The seed will continue creating users/rooms/characters and performing battle API actions instead of fabricating logs. This preserves the previous design decision that history should come from real side effects.

The seed script may accept optional slide/context arguments later if needed for speed or tailoring, but the first implementation can simply create the same complete fixture per slide. The important contract is isolation, not minimal fixture data.

### D3: Bound the cast to four seeded characters

The seed cast will be reduced to four named characters with unique avatar IDs, colors, classes, races, levels, and powers. In joined screens, the screenshot profile becomes the fifth visible player, which is believable for a 2-6 player game.

The battle fixture will continue using a subset of the seeded characters as participants. Maestro assertions must be updated to names that remain in the smaller cast.

### D4: Treat log screenshot validation as content QA, not just dimensions

Existing verification checks dimensions and non-empty logs. This change needs a stronger visual/content check: regenerated log screenshots should visibly prioritize `Dungeon Door`, `Fallen Gate`, and table updates, and should not show repeated screenshot-profile create rows above those story events.

The runner can log the room ID used for each slide so the corresponding local API data can be inspected when a screenshot looks wrong.

### D5: Add a clearer frame boundary using the existing palette

The compositor should remain on-brand, but the current outer background and the app's internal background are close enough to merge visually. The fix should use existing theme colors and/or opacity treatments to create separation: for example a contrasting frame surface, a stronger rounded screenshot stroke, a divider under the band, or adjusted shadow/glow. The output should still be a bare rounded screenshot, not a hardware device mockup.

## Risks / Trade-offs

- **More seed operations per run** -> Screenshot generation gets slower and creates more local data. Mitigation: the database is disposable, and reliability/clarity is more important than speed for store assets.
- **Per-slide room IDs complicate debugging** -> A failed flow may refer to a different room than the previous slide. Mitigation: print a slide-to-room map from both capture runners.
- **Joined screenshot profile may still create one log row in the log room** -> One row can exist, but it must not dominate the visible history screenshot. Mitigation: seed the log room immediately before the log flow and verify story events are visible in the captured output.
- **Frame contrast changes could drift from the brand** -> Use only colors mirrored from `frontend/constants/theme.ts` and visually inspect both iPhone and Android outputs.

## Migration Plan

No runtime deployment is required. Implement the tooling changes, regenerate App Store and Google Play screenshots, then visually inspect all eight phone previews. Rollback is to the previous screenshot-generation revision or previously approved store assets.
