# Device Bezels

Static transparent PNG bezels used by `scripts/generate-app-store-preview-redesign.py`.

Required assets:

- `iphone69.png` - iPhone-style bezel for App Store `iphone69` previews.
- `android1080x2400.png` - Android/Pixel-style bezel for Google Play `android1080x2400` previews.
- `device-bezels.json` - platform mapping, asset names, and usable screen rectangles.

The current assets are local static PNGs generated for this project so screenshot generation works without Figma access. They may be replaced with exported assets from Figma's iOS 26 Product Bezels or an Android device kit when those exports are available, provided the replacement assets can be used in this repository and the `screen` rectangles in `device-bezels.json` are retuned.

Generation must not call Figma. Figma or other design kits are only asset sources; export transparent PNGs first, then run the compositor from local files.

## Tuning

Each `screen` rectangle is measured in the bezel asset's own pixels:

- `x`, `y`: top-left corner of the app screen area.
- `width`, `height`: size of the transparent screen window where captured app screenshots are fitted.

After replacing an asset, run:

```bash
python3 scripts/generate-app-store-preview-redesign.py
```

Then visually inspect all generated previews for:

- app content aligned under the transparent screen window
- no visible gaps between screenshot content and bezel
- iPhone-style frame only on App Store outputs
- Android/Pixel-style frame only on Google Play outputs
