## 1. Refine captioned device composition

- [x] 1.1 Update `scripts/generate-app-store-preview-redesign.py` to remove the per-slide accent glow while retaining a restrained neutral shadow behind each static bezel.
- [x] 1.2 Remove the explicit horizontal accent divider at the caption-band boundary without changing the configured canvas dimensions, caption placement, or bezel fitting.

## 2. Capture the initial battle state

- [x] 2.1 Update `maestro/app_store_battle.yaml` to wait for deterministic initial battle content, including `Dungeon Door` and Player Side.
- [x] 2.2 Remove the battle-flow scroll and Monster Side post-scroll assertion so `battle.png` is captured from the initial viewport for both iOS and Android runners.

## 3. Document and verify the refinement

- [x] 3.1 Update `scripts/README-screenshots.md` to describe the bezel-first composition with neutral depth and no colored halo or caption divider.
- [x] 3.2 Regenerate the App Store source and captioned screenshots; verify native dimensions and visually inspect all four iPhone slides for clean device edges and an unscrolled battle slide.
- [x] 3.3 Regenerate the Google Play source and captioned screenshots; verify native dimensions and visually inspect all four Android slides for clean device edges and an unscrolled battle slide.
