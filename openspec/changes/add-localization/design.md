## Context

The frontend is an Expo Router app with many hardcoded English strings across screens, components, hooks, accessibility labels, placeholders, tests, and long-form privacy/support content. There is no existing i18n layer. Backend APIs store and return language-neutral identifiers and user-generated room/game data, but log entries also include English summary strings that should become fallback display text instead of the primary localized source.

The first supported locale set is English, Polish, German, French, Lithuanian, Latvian, Estonian, Russian, Belarusian, and Ukrainian. English remains the default and fallback.

## Goals / Non-Goals

**Goals:**

- Provide a single frontend localization layer for UI strings, navigation titles, accessibility labels, placeholders, errors, and game-domain labels.
- Detect the device/browser language on first launch and choose a supported locale when available.
- Let users manually choose a language from the profile/change-user UI and persist that choice locally.
- Apply language changes immediately without backend synchronization.
- Keep translation lookup type-safe enough to catch missing English keys during development.
- Prefer structured room history and battle payloads for localized rendering, using backend summary strings only as fallback.

**Non-Goals:**

- Translating user-generated names, room codes, typed monster names, backend ids, or internal enum values at rest.
- Adding per-room or account-level language settings.
- Changing backend APIs or database schema for the initial implementation.
- Building a full settings screen before the app has more settings to host.
- Guaranteeing legal-quality translations for privacy text without later human review.

## Decisions

### Use a small internal translation layer

Create `frontend/i18n` with supported locale metadata, English source strings, locale dictionaries, a translation function, interpolation support, and a React provider/hook. This avoids introducing a large i18n framework for the app's current needs while keeping the public API straightforward.

Alternative considered: add `i18next` or another full framework. That would provide mature pluralization and ecosystem features, but it is heavier than needed for a compact Expo app and would make the first extraction more complex.

### Add locale detection through Expo/browser platform APIs

Use a locale detection helper that supports native and web. If an Expo locale helper dependency is added, keep it isolated behind this helper so the rest of the app depends only on local `i18n` APIs. Match full locale tags to base language codes, for example `fr-CA` to `fr`.

Alternative considered: rely only on JavaScript `navigator.language`. That works on web but is insufficient for native.

### Store only the user override

Persist the selected locale in AsyncStorage under a dedicated key. On startup, load the stored locale first; if absent or invalid, detect the device/browser locale; if unsupported, use English. Changing the language writes the override locally and updates the provider state immediately.

Alternative considered: store the language in the user profile/backend. This would make language follow users across devices but introduces account/profile coupling for a preference that should be local and does not need multiplayer synchronization.

### Put the first language picker in the profile UI

Add a language picker to the existing change-user/profile modal, near nickname and avatar controls. This keeps the preference reachable without creating a mostly empty settings surface.

Alternative considered: create a new settings screen. That is likely premature until there are more preferences.

### Localize room history from structured payloads

Update log and battle history presentation to render known event types from structured payload fields. Use the backend-provided `summary` as a fallback when payload data is incomplete or the event type is unknown. This lets different users in the same room view the same event in different languages without changing stored history.

Alternative considered: have the backend store localized summaries. That would duplicate content per language, require selecting one language at event-write time, and fail for rooms with users in different languages.

### Keep English complete and fallback-based

English is the canonical translation resource. Other locales may fall back per key to English so the app remains usable if a translated key is missing. Development tests should verify all locale dictionaries conform to the English key shape or explicitly rely on fallback behavior.

Alternative considered: fail hard on missing non-English keys. That improves translation completeness but makes partial rollout and iterative review painful.

## Risks / Trade-offs

- Long labels can break compact mobile layouts in German, French, Polish, Lithuanian, Latvian, Estonian, Russian, Belarusian, and Ukrainian -> review key screens on small widths and prefer flexible layout constraints where labels appear in buttons or headers.
- Legal/privacy translations can carry compliance risk -> keep English as source of truth and flag translated privacy/support prose for human review before release.
- Existing tests assert literal English strings -> centralize English test defaults and update assertions to render through the provider where localization affects UI.
- Missing structured log payload details can limit localization -> keep summary fallback and add localized rendering only where payloads are sufficient.
- Adding device locale detection may require a new Expo dependency -> isolate it behind a helper and keep the rest of the localization layer independent.

## Migration Plan

1. Add localization infrastructure with English-only strings and tests for fallback behavior.
2. Wrap the app root in the localization provider.
3. Extract strings screen-by-screen, keeping English behavior stable.
4. Add the profile language picker and local persistence.
5. Add non-English locale dictionaries for the first language set.
6. Update log/history rendering to prefer structured localized labels with summary fallback.
7. Run unit tests, type checks, and targeted UI checks for the most text-dense screens.

Rollback is straightforward: keep English translations intact and remove or hide the language picker if non-English rollout needs to pause.

## Open Questions

- Should privacy policy translations ship with the first localized UI release, or should the app keep legal text in English until human-reviewed translations are available?
- Should language names be displayed in their native form, English form, or both?
