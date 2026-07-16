## Context

The screenshot pipeline has one shared set of English Maestro flows and one compositor that contains an English-only `CAPTIONS` entry. It already scopes generated previews by locale, but no non-English locale can render. The App Store listing assets define the intended market set: `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk`, and `es`.

The UI language is resolved from persisted preference first, then the device locale. Current capture flows clear application state and assert English accessibility text, which prevents deterministic localized capture. The existing four slides, isolated fixtures, platform canvases, and static bezels remain valid and are not being redesigned.

## Goals / Non-Goals

**Goals:**

- Generate localized captioned previews for every App Store listing locale on both existing store targets.
- Capture the app UI in the same locale as its caption band.
- Keep the locale set derived from the committed listing assets and fail clearly if the asset set and screenshot configuration drift.
- Make screenshot-flow synchronization independent of translated UI labels where practical.
- Verify text layout and glyph coverage, including Cyrillic locales, at native output dimensions.

**Non-Goals:**

- Supporting the app's additional UI-only languages that do not have listing assets.
- Changing translated app strings, store-listing copy, fixture content, slide order, image dimensions, or bezel composition.
- Uploading assets to App Store Connect or Google Play, creating new device targets, or changing production behavior.

## Decisions

### D1: The store-asset directory is the canonical locale set

The pipeline will use the locale codes represented by the complete App Store listing asset set, with an explicit expected set of `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk`, and `es`. It will reject missing caption data or incomplete listing directories rather than silently producing a partial release set.

*Alternative considered:* use every value in `SUPPORTED_LANGUAGES`. Rejected because it would create screenshots for markets without matching store listings and expand the requested scope from 11 to 27 locales.

### D2: Caption copy remains data-driven and keeps per-slide visual metadata shared

The compositor will store translated eyebrow, headline, and subcopy under each supported locale while retaining the existing slide source, destination, accent, band ratio, and crop metadata as shared slide definitions. Headlines will be wrapped based on actual font measurement rather than relying on English's fixed line splitting, so longer translations can fit without code paths per locale.

*Alternative considered:* duplicate the complete slide configuration for every locale. Rejected because visual geometry would drift and make future caption edits error-prone.

### D3: Screenshot mode accepts an explicit app-language override

The frontend language resolver will accept a build-time screenshot-only override that takes precedence during automated capture. Both iOS and Android runners will build/install per locale with that value, ensuring a `clearState` launch displays the intended UI language without simulator locale reconfiguration or manual language selection.

*Alternative considered:* change the simulator/device system locale for each run. Rejected because it is slower, host-dependent, and risks state leakage between locales.

### D4: Maestro flows use stable content and accessibility identifiers instead of translated labels

Navigation targets and readiness checks will use test IDs or other locale-neutral selectors. Fixture-specific names such as `Dungeon Door` remain suitable only when they are intentionally fixture data, not UI copy. The flows will receive the locale only where it is needed to select build/output inputs, not to duplicate 11 near-identical YAML flow sets.

*Alternative considered:* maintain a localized string map for all Maestro assertions. Rejected because translated UI copy changes would make the automation brittle and add avoidable translation maintenance.

### D5: Generate a locale-scoped set for both stores and verify it mechanically and visually

Each locale render writes the unchanged four filenames into its existing locale directory beneath `screenshots/iphone69_store_preview/<locale>` and `screenshots/android1080x2400_store_preview/<locale>`. Automated checks will validate the locale set, four outputs, expected native dimensions, and renderability; visual review will inspect all language layouts at native size, with specific attention to Cyrillic text and longer captions.

*Alternative considered:* render only one store as a localization proof. Rejected because the two canvas type scales and crops differ, so a caption that fits one store can fail in the other.

## Risks / Trade-offs

- [Translations overflow the caption band] → Measure and wrap translated text dynamically, and validate/render every locale on both canvas sizes.
- [The selected system font lacks Cyrillic glyphs] → Select and validate a font with Latin and Cyrillic coverage before accepting outputs.
- [Build-time language selection requires reinstalling for each locale] → Keep the 11-locale loop explicit and report the active locale and output path so failures are reproducible.
- [Locale-neutral selectors require small UI instrumentation] → Add focused accessibility/test identifiers only at the existing flow interaction points, preserving visible UI copy.
- [Store assets drift after this change] → Validate the canonical listing locale set and document the maintenance rule next to the assets and screenshot workflow.

## Migration Plan

1. Add locale configuration, captions, and deterministic language override.
2. Update shared flows and both store runners to process the canonical locale set.
3. Regenerate all localized local outputs and run mechanical checks plus native-dimension visual review.
4. Roll back by restoring the prior English-only runner/compositor behavior; generated screenshots are gitignored and do not require data migration.

## Open Questions

None. The confirmed scope is limited to the locales with App Store listing assets.
