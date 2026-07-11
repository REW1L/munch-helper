## Why

The current App Store / Google Play screenshots tell an onboarding-funnel story ("start fast", "join in seconds", "track updates", "edit stats") that no longer matches how the app plays, and the marketing overlay uses an off-brand hardcoded palette with text floated over a dimmed screenshot. We want screenshots that tell the actual game story — gather your table, gain power and swap classes, fight the monster, replay the history — with captions on a solid, on-brand contrast band above a clean, undimmed device shot.

## What Changes

- **New 4-beat story** replacing the 4 onboarding slides. Each slide maps to one beat and one screen:
  1. `rooms-home` — gather the whole table in one room
  2. `room-view` — everyone gains power and changes class in real time
  3. `battle` *(newly captured)* — team up to fight the monster
  4. `log` *(newly captured)* — replay every twist in the game history
- **Capture the battle and log screens**, which exist in the app but were never captured. Add `app_store_battle.yaml` and `app_store_log.yaml` Maestro flows and wire them into the shared capture flow list.
- **Extend the seed** so the battle screen and history log are populated: start a battle and leave it active, and conclude at least one battle so the shared log fills via the services' side effects (the log service has no write endpoint — events are produced by battle/character actions).
- **New compositor layout**: a solid brand caption band (eyebrow + headline + sub) occupying roughly the top 20–30% of the canvas, above a clean, full-brightness device screenshot with rounded corners and a soft shadow/glow — replacing the current dim-and-overlay style. To keep the on-band text visually recognizable, the device screenshot may be cropped from the bottom to fit the remaining region.
- **On-brand palette**: caption band colors are drawn from `frontend/constants/theme.ts` (`background`, `accent`, `actionSecondary`, `danger`, `parchmentText`, `surfaceWarm`) instead of the script's hardcoded hexes.
- **Locale-keyed caption copy**: captions ship in English now, but are stored as data keyed by locale (default `en`) so the other store languages can be added later as data, not code.
- **Fixed canvas sizes, both stores**: iOS captures **only the 6.9″ iPhone (1320×2868)** — App Store scales it to all iPhone models — and Android captures **only 1080×2400** (Pixel 6a), matching sizes already approved for the store. The App Store script drops the 6.3″, 6.1″, and iPad profiles.
- **Cross-store parity**: the caption-band compositor becomes store-agnostic with two fixed base canvases (1320×2868 and 1080×2400) and runs over both the iPhone and Android outputs; today only iPhone gets a text overlay and Android gets none.
- Update `scripts/README-screenshots.md` to describe the new story, screens, canvases, and compositor.

## Capabilities

### New Capabilities
- `store-screenshots`: Defines the store screenshot deliverable — the 4-beat story and its screen mapping, the seed data required to render each screen, the caption-band visual layout and on-brand palette, the locale-keyed caption model, and the fixed per-store canvas dimensions for App Store (1320×2868) and Google Play (1080×2400).

### Modified Capabilities
<!-- No existing spec captures the screenshot pipeline; this is net-new. -->

## Impact

- **Scripts**: `scripts/seed-app-store-room.mjs` (add battle + concluded-battle seeding), `scripts/capture-app-store-screenshots.mjs` (6.9″ only; add battle/log flows), `scripts/capture-google-play-screenshots.mjs` (pin 1080×2400; add flows; invoke compositor), `scripts/generate-app-store-preview-redesign.py` (new band layout, theme palette, locale-keyed copy, two fixed bases, run over android1080x2400), `scripts/README-screenshots.md`.
- **Maestro**: new `maestro/app_store_battle.yaml`, `maestro/app_store_log.yaml`.
- **Backend/API**: no code changes — uses existing `POST /battles`, `PATCH /battles/:id`, `POST /battles/:id/conclude`, and existing log side effects.
- **App code**: none — screens already exist (`(battle)/index.tsx`, `log.tsx`).
- **Output artifacts** (gitignored): `screenshots/iphone69/*`, `screenshots/android1080x2400/*`, and the redesigned caption-band previews.
- **Out of scope (separate change)**: iPad and tablet screenshot sets, and the Google Play feature graphic (`scripts/create-google-play-feature-graphic.swift` / `screenshots/google-play/feature-graphic.png`) — these differ significantly from phone images and will be handled on their own. If the app is still offered on iPad in App Store Connect, an iPad set remains separately required.
