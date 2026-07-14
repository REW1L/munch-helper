## Context

The shared Pillow compositor renders the four App Store and Google Play slides inside local, platform-specific bezel assets. Its current composition adds two accent-driven effects around the device: a blurred colored glow based on the full device alpha and a narrow horizontal accent divider at the caption-band boundary. These treatments compete with the bezel and make the caption-to-device transition feel over-designed.

The shared `maestro/app_store_battle.yaml` flow waits for the active battle, then scrolls to the monster panel. Both platform capture runners execute that same flow and take the source screenshot only after it completes, so the published battle slide is necessarily scrolled away from its initial context.

## Goals / Non-Goals

**Goals:**

- Retain the successful static iPhone and Android bezel assets as the primary device frame.
- Make the device presentation quieter by removing colored glow and the hard divider, while keeping enough neutral depth to separate the device from its background.
- Capture a stable, top-of-battle view on both platforms.
- Preserve canvas dimensions, caption copy, palette values, fixture data, and the four-slide story.

**Non-Goals:**

- Redesigning the app's battle UI or making the complete battle form fit within one viewport.
- Replacing or editing the existing bezel artwork.
- Changing seeds, story captions, localization, or the number/order of published slides.
- Adding visual-diff infrastructure or publishing screenshots to a store.

## Decisions

### D1: Remove the accent halo; retain a neutral device shadow

The compositor will stop creating the blurred per-slide accent layer around the device alpha. It will retain a low-key black/neutral shadow derived from the bezel alpha so the device remains visibly elevated above the lower canvas without looking illuminated.

*Alternative considered:* reducing the glow opacity or blur. Rejected because any colored halo continues to compete with the hardware edge and reproduces the feedback at a smaller intensity.

### D2: Eliminate the hard caption/device divider

The compositor will remove the explicit horizontal accent rectangle at the caption-band edge. The caption band and lower canvas can remain distinct theme surfaces; spacing below the text, the device shadow, and the device bezel are the visual transition.

*Alternative considered:* replacing the line with a subtler gradient or thinner stroke. Rejected because it preserves a visual rule between copy and device rather than simplifying the composition.

### D3: Stop on the initial battle viewport

The battle Maestro flow will wait for a stable top-of-screen element (the active battle title and/or Player Side) after opening the battle and will not run a scroll command. The source screenshot therefore shows the battle name, status/comparison, and opening player context rather than a mid-form position. The same flow is deliberately shared by the iOS and Android capture runners to guarantee parity.

*Alternative considered:* capture a purpose-built battle summary screen. Rejected because it adds product/UI work and breaks the established story-to-screen mapping; the existing battle view already provides an appropriate initial-state composition.

## Risks / Trade-offs

- [Removing color reduces the apparent separation on very dark slides] → Keep the existing neutral shadow and verify both platform canvases at their native output dimensions.
- [Top-of-screen content can render slower than the old lower-panel assertion] → Wait for stable active-battle and Player Side content before capture, using the fixture's deterministic `Dungeon Door` title.
- [Platform viewport differences could expose different amounts of the player panel] → Regenerate and inspect both iPhone and Android output sets; the unscrolled requirement applies to both, not an identical pixel crop.
- [Generated images are ignored by Git] → Treat fresh local generation and visual review as a required verification step and retain the runner's slide-to-room mapping for reproducibility.

## Migration Plan

No runtime migration or deployment is needed. Update the compositor and shared flow, regenerate the local iPhone and Android source and captioned previews, then visually review all eight outputs. Rollback is to restore the prior compositor effects and battle-flow scroll if the refined treatment is not approved.

## Open Questions

None. The requested direction is to keep the bezels while removing the glow, remove the caption boundary line, and use the unscrolled battle view.
