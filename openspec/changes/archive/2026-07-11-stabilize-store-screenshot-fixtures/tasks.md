## 1. Fixture Seeding

- [x] 1.1 Reduce `scripts/seed-app-store-room.mjs` to four seeded characters with distinct names, avatar IDs, colors, levels, powers, classes, races, and genders
- [x] 1.2 Ensure seeded avatar IDs do not repeat within the cast and avoid the configured screenshot profile avatars where practical
- [x] 1.3 Keep the active battle and concluded battle fixture generation based on real backend actions and existing log side effects
- [x] 1.4 Confirm `npm run screenshots:seed` reports four seeded characters plus active/concluded battle metadata

## 2. Per-Slide Capture Isolation

- [x] 2.1 Update `scripts/capture-app-store-screenshots.mjs` so each flow seeds its own room immediately before capture and receives that room's `ROOM_ID`
- [x] 2.2 Update `scripts/capture-google-play-screenshots.mjs` so each flow seeds its own room immediately before capture and receives that room's `ROOM_ID`
- [x] 2.3 Print a slide filename to room ID mapping from both capture runners for debugging
- [x] 2.4 Preserve `launchApp: clearState: true` behavior in the Maestro flows unless a flow-specific reason requires otherwise

## 3. Maestro And Assertions

- [x] 3.1 Update `maestro/app_store_room_view.yaml` assertions to match names retained in the smaller seeded cast
- [x] 3.2 Update `maestro/app_store_battle.yaml` assertions if participant or visible text changes after the cast reduction
- [x] 3.3 Update `maestro/app_store_log.yaml` so it waits for story history entries and does not rely on setup noise

## 4. Caption Frame Separation

- [x] 4.1 Adjust `scripts/generate-app-store-preview-redesign.py` to add clearer visual separation between the outer caption frame and embedded screenshot using the existing theme palette
- [x] 4.2 Preserve the bare rounded screenshot style with no hardware bezel, no screenshot dimming overlay, and no text over the app screenshot
- [x] 4.3 Re-run the compositor against available source screenshots and confirm iPhone and Android output dimensions remain unchanged

## 5. Documentation

- [x] 5.1 Update `scripts/README-screenshots.md` to describe per-slide room seeding and slide-to-room output
- [x] 5.2 Update the README stability notes to remove the old intentional-overpopulation rationale and document the realistic four-character seed
- [x] 5.3 Document that local screenshot data is disposable and that the pipeline relies on fresh isolated fixtures rather than production history filtering

## 6. Verification

- [x] 6.1 Run or dry-run `npm run screenshots:seed` against a local backend and inspect the reported cast and fixture metadata
- [x] 6.2 Run the App Store screenshot pipeline and regenerate `screenshots/iphone69_store_preview/en`
- [x] 6.3 Run the Google Play screenshot pipeline and regenerate `screenshots/android1080x2400_store_preview/en`
- [x] 6.4 Visually verify all eight phone previews: realistic player counts, no duplicated seeded characters, clean log story, and distinct screenshot/frame boundary
- [x] 6.5 Confirm the log screenshots do not show repeated screenshot-profile `created` rows above `Dungeon Door` or `Fallen Gate`
