## 1. Seed battle and history data

- [ ] 1.1 Extend `scripts/seed-app-store-room.mjs` to start a battle via `POST /battles` with at least one monster and player participation, and leave it **active** for the battle screenshot
- [ ] 1.2 In the same seed, create and `POST /battles/:id/conclude` at least one battle so the shared history log is populated via side effects
- [ ] 1.3 Verify the seeded battle and log render non-empty by hitting `GET /battles?roomId=...&status=active` and `GET /logs?roomId=...`
- [ ] 1.4 Ensure the active battle used for the screenshot is not the one that gets concluded (seed order / separate battles)

## 2. Maestro flows for the new screens

- [ ] 2.1 Add `maestro/app_store_battle.yaml` that navigates from the room to the active battle screen and asserts on stable seeded text
- [ ] 2.2 Add `maestro/app_store_log.yaml` that navigates to the history log screen and asserts a log entry is visible
- [ ] 2.3 Prefer assertions on non-localized identifiers (seeded names, room id) to keep flows i18n-robust

## 3. Capture pipeline — App Store (6.9″ only)

- [ ] 3.1 In `scripts/capture-app-store-screenshots.mjs`, reduce `deviceProfiles` to the single 6.9″ profile (iPhone 17 Pro Max → `iphone69`); remove the 6.3″, 6.1″, and iPad profiles
- [ ] 3.2 Replace the `flows` array with the four story flows: rooms-home, room-view, battle, log
- [ ] 3.3 Confirm captured PNGs land in `screenshots/iphone69` at 1320×2868

## 4. Capture pipeline — Google Play (1080×2400 only)

- [ ] 4.1 In `scripts/capture-google-play-screenshots.mjs`, use the same four story `flows`
- [ ] 4.2 Pin capture to a 1080×2400 device (Pixel 6a); fail fast if `wm size` ≠ 1080×2400 and write output to `screenshots/android1080x2400`
- [ ] 4.3 Invoke the caption compositor over the Android output after capture

## 5. Caption-band compositor rewrite

- [ ] 5.1 In `scripts/generate-app-store-preview-redesign.py`, remove the dim overlay, scrim gradient, and top-chrome retouch
- [ ] 5.2 Implement the band-above-clean-shot layout: solid brand band (eyebrow/headline/sub) occupying ~20–30% of canvas height, above an undimmed, rounded-corner device shot with a soft shadow
- [ ] 5.2a Bottom-crop the device screenshot to fit the region below the band (keep top content visible) instead of scaling it down; make the band ratio / crop offset tunable per slide and base
- [ ] 5.3 Replace the hardcoded palette with values mirrored from `frontend/constants/theme.ts`, with a comment linking to the source
- [ ] 5.4 Define two fixed base canvases (iPhone 1320×2868, Android 1080×2400) with per-base band height and type scale; select the base by source directory
- [ ] 5.5 Move caption copy into a locale-keyed structure `CAPTIONS[locale][slide]` with `en` populated and a default `LOCALE=en`; write output to a locale-scoped path
- [ ] 5.6 Apply the four-slide accent mapping: rooms-home→`accent`, room-view→`actionSecondary`, battle→`danger`, log→`parchmentText`
- [ ] 5.7 Run the compositor over both `iphone69` and `android1080x2400` sources

## 6. Docs and verification

- [ ] 6.1 Update `scripts/README-screenshots.md`: new 4-beat story, battle/log flows, 6.9″-only iOS, 1080×2400-only Android, new compositor + palette + locale model, and the ~20–30% band + bottom-crop behavior
- [ ] 6.2 Run the full pipeline end to end for both stores and visually verify all 8 slides (caption matches the post-crop screenshot content)
- [ ] 6.3 Confirm final dimensions: iPhone outputs 1320×2868, Android outputs 1080×2400
- [ ] 6.4 Flag (outside this change) that iPad/tablet sets and the Google Play feature graphic are handled separately
