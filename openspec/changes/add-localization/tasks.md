## 1. Localization Infrastructure

- [x] 1.1 Create `frontend/i18n` locale metadata for `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, and `uk`.
- [x] 1.2 Implement a typed English translation resource and per-locale dictionary loading with English fallback for missing keys.
- [x] 1.3 Implement translation lookup with interpolation for dynamic values such as names, room codes, counts, and timestamps.
- [x] 1.4 Implement locale normalization so full locale tags such as `fr-CA` map to supported base languages such as `fr`.
- [x] 1.5 Implement native/web locale detection behind a local helper, adding an Expo locale dependency only if required.
- [x] 1.6 Implement an AsyncStorage-backed language preference loader and saver.
- [x] 1.7 Add a localization provider and hook, then wrap the app root so screens can read and update the active language.

## 2. Language Selection UI

- [x] 2.1 Add a language field to the profile/change-user modal using the supported language list.
- [x] 2.2 Persist language changes locally and update the active UI language immediately after selection.
- [x] 2.3 Ensure language selection does not update backend user profile data or shared room state.
- [x] 2.4 Add tests for saved language loading, unsupported locale fallback, and manual language changes.

## 3. UI String Extraction

- [x] 3.1 Extract landing, rooms, support, privacy, shop, profile, room join, room create, avatar, and character modal strings into translation resources.
- [x] 3.2 Extract Munchkin room, character card, quick edit, reconnecting banner, active battle banner, battle action, and battle editor strings into translation resources.
- [x] 3.3 Extract navigation titles, accessibility labels, placeholders, button labels, confirmation dialog text, and error fallback messages.
- [x] 3.4 Keep user-generated names, room codes, typed monster names, backend identifiers, and internal enum values unmodified.
- [x] 3.5 Add translations for Polish, German, French, Lithuanian, Latvian, Estonian, Russian, Belarusian, and Ukrainian.

## 4. Localized Game History

- [x] 4.1 Update log entry rendering to use structured event payload data for known character and battle events.
- [x] 4.2 Update battle history modal labels, statuses, result names, and accessibility text to use localization resources.
- [x] 4.3 Preserve backend-provided summary text as fallback when an event is unknown or lacks required structured payload data.
- [x] 4.4 Add tests proving the same structured event can render in at least English and one non-English locale while fallback summaries still display.

## 5. Verification

- [x] 5.1 Add tests that verify supported locale metadata includes all first-launch languages.
- [x] 5.2 Add tests that verify missing non-English translation keys fall back to English.
- [x] 5.3 Update existing frontend tests that asserted literal English UI strings to render through the localization provider.
- [x] 5.4 Run frontend unit tests and room-route tests.
- [x] 5.5 Run TypeScript checking and linting for the frontend.
- [x] 5.6 Perform targeted UI review on small mobile widths for text-heavy screens and long translated labels.
