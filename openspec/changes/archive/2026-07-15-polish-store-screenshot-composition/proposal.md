## Why

The current captioned store previews distract from the app with an accent-colored glow around the otherwise successful device bezels and a hard line between the caption and screenshot regions. The battle slide is also captured after a scroll, making the game state harder to understand at a glance.

## What Changes

- Remove the accent-colored halo from around the static iPhone and Android device bezels while retaining the platform-appropriate bezels and a restrained neutral shadow.
- Remove the hard horizontal accent divider between the caption band and device area, letting spacing, tonal surfaces, and the bezel establish hierarchy.
- Clip captured app pixels to the rounded screen opening inside each static bezel so screenshot corners cannot visibly protrude past the device border.
- Change the shared battle Maestro flow to capture the initial, unscrolled battle view and assert a stable top-of-screen battle state before capture.
- Regenerate and visually review all captioned iPhone and Android previews to confirm the refined composition and unscrolled battle slide.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `store-screenshots`: Refine store-preview device styling and require the battle source screenshot to be captured from its initial, unscrolled position.

## Impact

- `scripts/generate-app-store-preview-redesign.py` composition effects, caption/device boundary treatment, and screen clipping inside the bezel.
- `maestro/app_store_battle.yaml`, used by both iOS and Android screenshot runners.
- Regenerated ignored artifacts under `screenshots/iphone69_store_preview/en` and `screenshots/android1080x2400_store_preview/en`.
- `scripts/README-screenshots.md` if its visual-composition description needs to reflect the new treatment.
