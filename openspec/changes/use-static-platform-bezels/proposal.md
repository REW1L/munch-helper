## Why

Manual review of the refined store screenshots showed that the previous bare rounded screenshot frame does not make the app read clearly as a physical phone. Store listings need stronger device context, and Google Play must not show the app inside an iPhone-style frame.

## What Changes

- Replace the obsolete bare-screenshot frame requirement with static device bezel framing for captioned store previews.
- Use platform-appropriate bezel assets: an iPhone-style bezel for App Store screenshots and an Android/Pixel-style bezel for Google Play screenshots.
- Make the compositor fit captured source screenshots into configured screen rectangles behind transparent bezel assets.
- Keep screenshot generation independent from live Figma access; Figma Product Bezels or equivalent design kits may be used only as one-time sources for committed/local static assets.
- Fail fast when required bezel assets or screen-rectangle metadata are missing so store output cannot silently fall back to the old bare screenshot style.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `store-screenshots`: Captioned store previews now require static, platform-appropriate device bezel assets instead of bare rounded screenshot frames.

## Impact

- `scripts/generate-app-store-preview-redesign.py`: compositor changes for bezel asset loading, screen-rectangle placement, and platform-specific rendering.
- `scripts/assets/device-bezels/`: new static bezel assets and metadata/documentation for iOS and Android targets.
- `scripts/README-screenshots.md`: documentation update for required assets, export expectations, and generation behavior.
- Screenshot outputs under `screenshots/iphone69_store_preview/en` and `screenshots/android1080x2400_store_preview/en` must be regenerated and visually reviewed.
