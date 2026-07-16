## MODIFIED Requirements

### Requirement: Localizable caption copy
Caption copy SHALL be stored as data keyed by locale. The compositor SHALL render a single configurable locale, defaulting to `en`, and SHALL generate all supported App Store listing locales when invoked in batch. The supported store-screenshot locales SHALL be `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk`, and `es`; each locale SHALL provide caption copy for all four slides. Additional locales SHALL be added as data without compositor logic changes.

#### Scenario: English renders by default
- **WHEN** the compositor runs with no locale override
- **THEN** it renders English caption copy

#### Scenario: A configured locale renders in its own output directory
- **WHEN** the compositor runs with a supported locale override
- **THEN** it renders that locale's caption copy
- **AND** it writes previews into that locale's output directory without overwriting another locale's previews

#### Scenario: Batch rendering covers all listing locales
- **WHEN** the localized screenshot pipeline runs in batch mode
- **THEN** it renders the four-slide preview set for every supported store-screenshot locale
- **AND** it fails if any locale is missing caption data

#### Scenario: Adding a locale requires only data
- **WHEN** a new locale's caption strings are added to the caption data and it is included in the store-screenshot locale configuration
- **THEN** that locale can be rendered without modifying compositor logic
