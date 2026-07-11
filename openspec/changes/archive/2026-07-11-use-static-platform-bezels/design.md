## Context

The current caption compositor places captured app screenshots below a caption band with rounded corners, shadow, glow, and stroked boundaries. That treatment improved contrast but still leaves the app looking like a floating crop rather than a physical phone in store-listing review.

The earlier screenshot design intentionally avoided hardware bezels. That decision is now obsolete: reviewed assets need device context, and platform-specific presentation matters. App Store screenshots should use an iPhone-style frame, while Google Play screenshots should use an Android/Pixel-style frame so Android users do not see the app presented inside Apple hardware.

The screenshot generator should remain deterministic and local. Figma's iOS 26 Product Bezels can be used as the source for exported assets, but the generation script should not require live Figma access.

## Goals / Non-Goals

**Goals:**

- Render captioned App Store and Google Play previews with static device bezel assets.
- Use platform-appropriate assets: iPhone-style for `iphone69`, Android/Pixel-style for `android1080x2400`.
- Fit captured source screenshots into configured screen rectangles behind transparent bezel overlays.
- Keep output canvas sizes unchanged: `1320x2868` for App Store and `1080x2400` for Google Play.
- Fail fast when required bezel assets or metadata are missing.
- Document how bezel assets are sourced, stored, and tuned.

**Non-Goals:**

- Calling Figma during screenshot generation.
- Generating device bezels procedurally in Pillow as the primary path.
- Adding iPad/tablet screenshot support.
- Reworking the four-slide story, captions, fixture data, Maestro flows, or screenshot capture runners except where needed to invoke the compositor.
- Changing runtime app UI.

## Decisions

### D1: Store static bezel assets under `scripts/assets/device-bezels`

The repo will keep local static bezel assets used by the compositor. The expected initial assets are:

- `scripts/assets/device-bezels/iphone69.png`
- `scripts/assets/device-bezels/android1080x2400.png`

Each asset should be a transparent PNG containing the visible device shell/bezel. The compositor will place the captured app screenshot behind the asset, clipped to a configured screen rectangle.

- *Alternative considered*: live export from Figma during generation. Rejected because it makes screenshot generation dependent on a design-tool session and credentials.
- *Alternative considered*: procedural bezels in Pillow. Rejected as the primary path because store-listing quality is better with carefully designed static assets.

### D2: Use explicit screen-rectangle metadata

The compositor will not infer the usable screen area from image pixels. It will use explicit per-base metadata, such as:

```json
{
  "iphone69": {
    "platform": "ios",
    "asset": "iphone69.png",
    "screen": { "x": 42, "y": 42, "width": 1236, "height": 2784 }
  },
  "android1080x2400": {
    "platform": "android",
    "asset": "android1080x2400.png",
    "screen": { "x": 36, "y": 34, "width": 1008, "height": 2332 }
  }
}
```

The metadata may live in Python data structures or a JSON sidecar. A JSON sidecar is preferable if tuning assets is expected without editing script logic; embedded Python data is acceptable if the values remain tightly coupled to the compositor.

- *Alternative considered*: detect transparent bounds automatically. Rejected because bevels, shadows, holes, and antialiasing make automatic screen detection brittle.

### D3: Compose screenshots as screen content, then bezel overlay

For each slide, the compositor should:

1. Compute the region below the caption band.
2. Size the outer bezel placement to fit that region while preserving the bezel asset's aspect ratio.
3. Scale/crop the source screenshot into the bezel metadata's screen rectangle.
4. Paste the screen content behind the bezel.
5. Composite the combined device frame into the store canvas with shadow or glow as needed.

This keeps existing caption copy and canvas dimensions stable while changing the screenshot presentation from a bare rounded crop to a device-framed presentation.

### D4: Enforce platform mapping

The compositor should map `iphone69` only to the iOS bezel asset and `android1080x2400` only to the Android bezel asset. It should not fall back from one platform's bezel to the other.

Google Play previews must never be generated with an iPhone-style bezel. If the Android bezel asset is missing, generation should fail for the Android output instead of producing misleading store assets.

### D5: Keep source screenshots full-fidelity before fitting

The source screenshots remain raw simulator/emulator captures. Any cropping needed to fit the device screen rectangle should happen during compositing. The source capture dimensions should continue to be validated before rendering so stale or wrong-device captures fail clearly.

## Risks / Trade-offs

- **Static asset licensing or provenance is unclear** -> Document the asset source and only commit assets that are allowed for this project.
- **Screen-rectangle metadata is slightly off** -> Keep the values data-driven and visually inspect all generated previews after tuning.
- **Bezel reduces visible app content** -> Adjust caption band ratio, device gap, and outer device placement while preserving output dimensions.
- **Android asset quality lags iOS asset quality** -> Treat Android bezel sourcing as required, not optional, because platform mismatch is worse than the old bare frame.
- **Figma export changes over time** -> Store the exported PNGs locally so generation is reproducible.

## Migration Plan

1. Add static iOS and Android bezel assets plus metadata.
2. Update the shared caption compositor to render screenshots behind platform-specific bezels.
3. Update screenshot documentation.
4. Regenerate App Store and Google Play captioned previews.
5. Visually inspect all eight phone previews for platform-appropriate framing, readable app content, unchanged output dimensions, and no iPhone bezel in Google Play outputs.

Rollback is to the previous compositor and previously approved screenshot outputs.
