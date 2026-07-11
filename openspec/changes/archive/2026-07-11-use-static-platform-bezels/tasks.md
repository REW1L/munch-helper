## 1. Bezel Assets

- [x] 1.1 Create `scripts/assets/device-bezels/` for static screenshot bezel inputs
- [x] 1.2 Add or document the required iPhone-style transparent PNG bezel asset for `iphone69`
- [x] 1.3 Add or document the required Android/Pixel-style transparent PNG bezel asset for `android1080x2400`
- [x] 1.4 Record asset provenance, export expectations, and licensing/usage notes in `scripts/assets/device-bezels/README.md`
- [x] 1.5 Define explicit screen-rectangle metadata for both bezel targets

## 2. Compositor Implementation

- [x] 2.1 Update `scripts/generate-app-store-preview-redesign.py` to load platform-specific bezel metadata and assets
- [x] 2.2 Replace bare rounded screenshot placement with screen-content fitting behind the transparent bezel overlay
- [x] 2.3 Preserve caption band rendering, slide copy, output directories, and output canvas dimensions
- [x] 2.4 Enforce `iphone69` -> iPhone bezel and `android1080x2400` -> Android bezel mapping without cross-platform fallback
- [x] 2.5 Fail fast with actionable errors when a required bezel asset or screen rectangle is missing or invalid
- [x] 2.6 Keep source screenshot dimension validation before compositing

## 3. Documentation

- [x] 3.1 Update `scripts/README-screenshots.md` to describe static platform bezel requirements
- [x] 3.2 Document that Figma may be used only to export static assets and is not required during generation
- [x] 3.3 Document how to tune screen rectangles and visually verify bezel alignment

## 4. Verification

- [x] 4.1 Run the compositor against existing `screenshots/iphone69` and `screenshots/android1080x2400` source screenshots
- [x] 4.2 Confirm generated App Store previews remain `1320x2868`
- [x] 4.3 Confirm generated Google Play previews remain `1080x2400`
- [x] 4.4 Visually verify all four App Store previews use the iPhone-style bezel with readable app content
- [x] 4.5 Visually verify all four Google Play previews use the Android/Pixel-style bezel and do not show iPhone hardware
- [x] 4.6 Verify missing-asset behavior fails clearly instead of producing bare screenshot output
