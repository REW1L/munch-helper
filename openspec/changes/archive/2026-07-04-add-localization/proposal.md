## Why

The Munch Helper app currently ships with English-only, hardcoded UI strings, which excludes non-English-speaking players and blocks growth in target markets (Central/Eastern Europe and the Baltics). Introducing localization now — before the string count grows further — lets us reach players in their native language and establishes a translation workflow the app can extend to future languages with minimal effort.

## What Changes

- Introduce an internationalization (i18n) layer in the Expo/React Native frontend: a translation catalog per language, a runtime translation function, and locale-aware date/number formatting.
- Extract all user-facing hardcoded strings from screens and components (`app/**`, `components/**`) into keyed translation resources, with English as the source/reference catalog.
- Ship translations for the first launch languages: Polish, German, French, Lithuanian, Latvian, Estonian, Russian, Belarusian, and Ukrainian, with **English as the default and fallback**.
- Detect the device locale on first launch and select the closest supported language, falling back to English when unsupported.
- Add an in-app language selector so users can override the detected language, and persist the choice locally (AsyncStorage) so it survives restarts.
- Apply locale-aware formatting to dates/times already rendered via `Intl` (e.g., battle/room logs) so they honor the active language.

## Capabilities

### New Capabilities
- `localization`: Multi-language support for the app UI — a keyed string catalog with English as source-of-truth and fallback, device-locale detection, an in-app language selector, persisted language preference, and locale-aware date/number formatting across the supported language set (en, pl, de, fr, lt, lv, et, ru, be, uk).

### Modified Capabilities
<!-- No existing specs in openspec/specs/; nothing to modify. -->

## Impact

- **Frontend (`frontend/`)**: New i18n dependency (e.g., `i18next` + `react-i18next`, or `expo-localization` + a lightweight runtime) and `expo-localization` for device-locale detection. New `frontend/i18n/` module and per-language resource files. String extraction touches most screens/components under `app/**` and `components/**`. Root layout (`app/_layout.tsx`) gains an i18n provider/initialization. User preference persistence extends the existing AsyncStorage usage (`hooks/useUser.ts` pattern).
- **UX**: New language selector entry point (in the profile/user modal or a settings surface) plus first-run locale detection.
- **Backend**: Out of scope — this change localizes client-rendered UI only; server-provided text (if any) is unchanged.
- **Testing**: New unit tests for locale detection, fallback, key coverage/parity across catalogs, and persistence; existing snapshot/text-based tests updated to assert against translation keys or the English catalog.
