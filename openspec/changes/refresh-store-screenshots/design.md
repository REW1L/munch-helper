## Context

The store screenshots are produced by a local pipeline (not committed — `screenshots/` is gitignored):

1. `seed-app-store-room.mjs` seeds a room + cast of characters in the local backend.
2. `capture-app-store-screenshots.mjs` / `capture-google-play-screenshots.mjs` build the release app, run Maestro flows to reach each screen, and capture PNGs.
3. `generate-app-store-preview-redesign.py` composites marketing captions onto the iPhone PNGs.

Three problems motivate this change (see proposal): the captured story no longer matches gameplay, the caption compositor floats text over a *dimmed* screenshot using an off-brand hardcoded palette, and Android gets no captions at all. The app already contains the two screens the new story needs — the battle screen (`frontend/app/munchkin/[roomNumber]/(battle)/index.tsx`) and the history log (`frontend/app/munchkin/[roomNumber]/log.tsx`) — but neither is captured today.

Constraints locked during exploration:
- **Exactly 4 slides**, one per story beat.
- **Bare device screenshot** (rounded corners + soft shadow), not a hardware bezel.
- **English captions**, stored as locale-keyed data so other languages are a later data-only addition.
- **Fixed canvases**: App Store 6.9″ only (1320×2868); Google Play 1080×2400 only. Both already approved sizes.
- Palette must come from `frontend/constants/theme.ts`.

## Goals / Non-Goals

**Goals:**
- Tell the 4-beat game story (room → power/class → battle → history) on both stores.
- Caption text on a solid, on-brand contrast band **above** a clean, full-brightness device shot.
- Reuse the app's real palette so marketing frames read as the same app users open.
- Make the compositor store-agnostic across the two fixed canvases and run it for Android too.
- Keep the copy pipeline localizable without a rewrite.

**Non-Goals:**
- Localizing caption text now (only the data structure must support it).
- iPad, 6.3″, or 6.1″ App Store screenshot sets, and any tablet sets.
- The Google Play feature graphic (1024×500) — handled in a separate change; `create-google-play-feature-graphic.swift` is untouched here.
- Hardware device bezels / frames.
- Changing any app or backend code — screens and endpoints already exist.
- Animated App Preview videos (a separate `preview_video` flow already exists and is untouched).

## Decisions

### D1: Populate battle + history by performing real actions, not fabricating data
The log service exposes only `GET /logs` — log events are side effects of battle/character actions. So the seed script will *perform* actions: create characters (already done), start a battle via `POST /battles` and leave it **active** (for the battle screenshot), and `POST /battles/:id/conclude` on at least one battle (to fill the history log). This keeps seeded data internally consistent with what the app would actually produce.
- *Alternative considered*: inserting log rows directly — rejected; no write endpoint and it would drift from real event shapes.

### D2: One compositor, two fixed base canvases
Rather than deriving band geometry from arbitrary device resolutions, the compositor hardcodes two bases — `IPHONE = 1320×2868` and `ANDROID = 1080×2400` — each with its own band height and type scale tuned once. The compositor detects which base a source directory belongs to (`iphone69` vs `android1080x2400`) and applies that base's constants.
- *Alternative considered*: keep the current `min(scale_x, scale_y)` dynamic scaling from a single base — rejected; unnecessary now that both sizes are fixed, and it was the source of the "variable Android resolution" risk.

### D3: Band-above-clean-shot composition
Each output = solid brand-background canvas with two regions:
- **Top band**: occupies roughly the top **20–30%** of the canvas height. Holds eyebrow (accent color), headline (textPrimary/white), sub (muted/cream), left-aligned or centered per a per-slide flag.
- **Device region**: the raw screenshot, **undimmed**, placed in the remaining ~70–80%, rounded corners, soft drop shadow, optional accent glow behind it.
No full-image dim, no top-chrome retouch, no scrim gradient over the screenshot (all present in the current script) — the band provides contrast instead.
- *Alternative considered*: refine the existing dim+overlay — rejected by product decision (want a true solid band).

### D3a: Bottom-crop the device shot to fit
The device screenshot is placed at its native width (scaled to the region width) and, if taller than the remaining region, **cropped from the bottom** rather than shrunk to fit. This keeps the screenshot at a legible scale and preserves the top of the screen — where the most identifiable in-app content and headings live — so the on-band caption and the screenshot together stay visually recognizable. The band ratio (within 20–30%) is tuned per slide/base so the crop never removes the content the caption refers to.
- *Alternative considered*: scale the whole screenshot down to fit the region — rejected; shrinking makes in-app text illegible at store thumbnail sizes, defeating the point of the band.

### D4: Palette sourced from theme.ts, mirrored in the compositor
The Python compositor can't import the TS theme, so it holds a small palette dict that mirrors `frontend/constants/theme.ts` verbatim (`background #3C3636`, `accent #D4C26E`, `actionSecondary #6E6BD4`, `danger #922525`, `parchmentText #CEB464`, `surfaceWarm #8A6150`, `textPrimary #FFFFFF`). A comment ties it to the source file so the two stay in sync.
- *Alternative considered*: generate a JSON palette from theme.ts at build time — deferred; low churn, not worth the tooling now, but noted as a future option.

### D5: Locale-keyed caption data
Caption copy becomes a nested structure `CAPTIONS[locale][slide] = {eyebrow, headline[], sub, accent}` with `en` populated. The compositor reads a `LOCALE` (default `en`) and writes output into a locale-scoped path so future locales don't collide. Only `en` renders today.
- *Alternative considered*: inline per-slide English strings (status quo) — rejected; makes future localization a code change.

### D6: Slide → screen → accent mapping
| # | Screen  | Eyebrow          | Headline                       | Accent (theme token)      |
|---|---------|------------------|--------------------------------|---------------------------|
| 1 | rooms-home | GATHER THE TABLE | One room for the whole party   | `accent` #D4C26E          |
| 2 | room-view  | LIVE TABLE       | Watch everyone level up        | `actionSecondary` #6E6BD4 |
| 3 | battle     | INTO BATTLE      | Take on the monster together   | `danger` #922525          |
| 4 | log        | GAME HISTORY     | Replay every twist             | `parchmentText` #CEB464   |

## Risks / Trade-offs

- **Seed timing / battle state** → An active battle must survive until the battle flow captures it. Mitigation: seed the active battle last (or make the battle flow independent of the concluded ones) and assert on stable text in the Maestro flow.
- **Android emulator not 1080×2400** → capture would land in the wrong `android<W>x<H>` dir. Mitigation: pin capture to a Pixel 6a (native 1080×2400) and target the `android1080x2400` dir explicitly; fail fast if `wm size` ≠ 1080×2400.
- **Palette drift** between `theme.ts` and the compositor's mirror dict → colors silently diverge over time. Mitigation: comment linking to the source; future option (D4 alternative) to generate it.
- **Battle/log flows brittle to i18n text** → Maestro asserts on visible strings. Mitigation: assert on stable, non-localized identifiers (seeded character/monster names, room id) where possible.
- **iPad listing** → dropping the iPad set breaks an iPad listing if one exists. Mitigation: flagged in proposal as an out-of-scope check before shipping the listing.

## Migration Plan

No runtime deploy — this is local tooling producing store assets. Rollout is procedural:
1. Land script/flow changes.
2. Run `npm run screenshots:app-store` and `npm run screenshots:google-play`, then the compositor, and eyeball all 8 outputs.
3. Upload to App Store Connect (6.9″) and Play Console (1080×2400).
Rollback = re-upload the previously approved screenshots; the old script revision remains in git history.

## Open Questions

- Exact band height within the 20–30% range, per-slide crop offset, and type sizes — to be tuned visually against the first render so each caption still matches the visible (post-crop) screenshot content; not blocking.
