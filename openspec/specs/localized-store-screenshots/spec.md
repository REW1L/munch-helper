# localized-store-screenshots

## Purpose

Localized store screenshot generation keeps the App Store and Google Play
preview sets aligned with the complete set of localized listing assets while
rendering matching translated app UI and legible caption copy.

## Requirements

### Requirement: Complete localized store screenshot sets
The screenshot pipeline SHALL generate captioned four-slide App Store and Google Play preview sets for exactly the locale codes represented by the complete App Store listing assets: `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk`, and `es`. It SHALL NOT include UI-only languages that have no corresponding listing asset set.

#### Scenario: All listing locales generate both store sets
- **WHEN** localized screenshot generation completes successfully
- **THEN** each supported locale has exactly four App Store previews and four Google Play previews
- **AND** the output files retain the established story order and native canvas dimensions

#### Scenario: Listing locale data is incomplete
- **WHEN** a supported locale is missing required caption or listing-asset data
- **THEN** generation fails with an actionable message naming the locale and missing input
- **AND** it does not report a complete localized screenshot set

### Requirement: Captured UI matches its listing locale
The screenshot capture pipeline SHALL render the app UI in the same configured locale as the caption copy for every generated screenshot set.

#### Scenario: Localized capture starts from cleared state
- **WHEN** a locale-specific capture flow launches the app with cleared application state
- **THEN** the app resolves to the locale selected for that capture
- **AND** the resulting source screenshot does not depend on the simulator or device's ambient locale

#### Scenario: Shared flows remain locale-independent
- **WHEN** capture flows run for any supported listing locale
- **THEN** navigation and readiness checks use locale-neutral selectors or deterministic fixture content
- **AND** the pipeline does not require a separate translated Maestro flow for each locale

### Requirement: Localized caption legibility
The compositor SHALL render each supported locale's translated eyebrow, headline, and subcopy within the existing caption-band composition without clipping or unsupported glyphs.

#### Scenario: Captions fit both canvas sizes
- **WHEN** the compositor renders any supported locale for either platform canvas
- **THEN** the rendered caption text remains inside the caption band and is not clipped
- **AND** the four existing slide-specific accents and device framing remain unchanged

#### Scenario: Cyrillic captions render correctly
- **WHEN** the compositor renders Russian, Belarusian, or Ukrainian caption copy
- **THEN** every rendered character uses a supported glyph
- **AND** no replacement glyph, missing-character box, or encoding corruption appears
