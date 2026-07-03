# localization

## Purpose

Multi-language support for the app UI: a keyed string catalog with English as the source-of-truth and runtime fallback, device-locale detection, an in-app language selector, a persisted language preference, and locale-aware date/number formatting across the supported language set (en, pl, de, fr, lt, lv, et, ru, be, uk).

## Requirements

### Requirement: Supported languages
The app SHALL support the following languages, with English (`en`) as the default and fallback: English, Polish (`pl`), German (`de`), French (`fr`), Lithuanian (`lt`), Latvian (`lv`), Estonian (`et`), Russian (`ru`), Belarusian (`be`), and Ukrainian (`uk`). English SHALL be the source-of-truth catalog against which all other catalogs are measured.

#### Scenario: All UI strings render in a supported language
- **WHEN** a user selects any supported language
- **THEN** all user-facing UI strings render translated in that language with no untranslated English text leaking through, except where a key is missing (see fallback requirement)

#### Scenario: Unsupported language requested
- **WHEN** the app is asked to activate a language code that is not in the supported set
- **THEN** the app SHALL activate English (`en`) instead

### Requirement: Keyed translation catalog
All user-facing text SHALL be resolved through a translation function keyed by stable identifiers rather than hardcoded string literals in components. Each supported language SHALL have its own catalog of translations keyed identically to the English catalog.

#### Scenario: Component renders text via translation key
- **WHEN** a screen or component needs to display user-facing text
- **THEN** it SHALL obtain that text from the translation function using a key, not from an inline literal

#### Scenario: Catalog key parity
- **WHEN** the translation catalogs are validated
- **THEN** every non-English catalog SHALL contain exactly the same set of keys as the English catalog, with no missing and no extra keys

### Requirement: Missing translation fallback
When a key is missing or empty in the active language, the app SHALL fall back to the English value for that key so the user never sees a raw key or an empty string.

#### Scenario: Key missing in active language
- **WHEN** the active language catalog has no value for a requested key
- **THEN** the app SHALL render the English value for that key

#### Scenario: Key missing in English too
- **WHEN** a requested key is absent from every catalog including English
- **THEN** the app SHALL render a safe placeholder (the key itself) rather than crash

### Requirement: Device locale detection
On first launch, when no language preference has been persisted, the app SHALL detect the device locale and activate the closest matching supported language, defaulting to English when no supported match exists.

#### Scenario: Device locale matches a supported language
- **WHEN** the app launches for the first time with no saved preference and the device locale is a supported language (matching by primary language subtag, e.g. `de-AT` → `de`)
- **THEN** the app SHALL activate that supported language

#### Scenario: Device locale not supported
- **WHEN** the app launches for the first time with no saved preference and the device locale is not in the supported set
- **THEN** the app SHALL activate English

### Requirement: In-app language selector
The app SHALL provide an in-app control that lets the user view the active language, see the list of supported languages, and switch to any supported language. The change SHALL take effect immediately without requiring an app restart.

#### Scenario: User switches language
- **WHEN** the user opens the language selector and chooses a different supported language
- **THEN** the visible UI SHALL update to the newly selected language without an app restart

#### Scenario: Active language indicated
- **WHEN** the user opens the language selector
- **THEN** the currently active language SHALL be visually indicated in the list

### Requirement: Persisted language preference
A user-selected language SHALL be persisted to local device storage and reloaded on subsequent launches, taking precedence over device-locale detection.

#### Scenario: Preference survives restart
- **WHEN** the user has selected a language and later relaunches the app
- **THEN** the app SHALL activate the previously selected language, ignoring the device locale

#### Scenario: Explicit choice overrides device locale
- **WHEN** a saved language preference exists that differs from the device locale
- **THEN** the app SHALL honor the saved preference

### Requirement: Locale-aware formatting
Dates, times, and numbers rendered to the user SHALL be formatted according to the active language's locale conventions rather than a fixed locale.

#### Scenario: Date rendered in active locale
- **WHEN** a date or time is displayed (e.g. in room or battle logs) while a non-English language is active
- **THEN** it SHALL be formatted using that language's locale conventions

#### Scenario: Formatting follows a language switch
- **WHEN** the user switches the active language
- **THEN** subsequently rendered dates, times, and numbers SHALL reflect the newly active locale
