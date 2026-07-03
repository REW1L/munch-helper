## Context

Munch Helper's frontend is an Expo/React Native app (Expo SDK 55, React 19, `expo-router`) with English-only, hardcoded UI strings spread across ~25 screen/component files under `app/**` and `components/**`. There is no i18n layer today; the only locale-aware code is a single `new Intl.DateTimeFormat(undefined, …)` call in the battle/room log. User state (nickname, avatar) is already persisted in AsyncStorage via `hooks/useUser.ts`, and app-wide context is provided through React context in `app/_layout.tsx` (`userProfileContext`, `QueryClientProvider`).

This change adds a client-side localization layer plus catalogs for nine launch languages (Polish, German, French, Lithuanian, Latvian, Estonian, Russian, Belarusian, Ukrainian) with English as default/fallback. Server-provided text is out of scope.

## Goals / Non-Goals

**Goals:**
- Establish a single, keyed translation API used everywhere UI text is rendered.
- English as source-of-truth and runtime fallback; enforce key parity across catalogs.
- Detect device locale on first launch; let users override and persist the choice.
- Locale-aware date/time/number formatting tied to the active language.
- A low-friction workflow for adding future languages (drop in a catalog file).

**Non-Goals:**
- Backend/server-message localization.
- RTL layout support (none of the launch languages are RTL).
- Pluralization/gender grammar beyond what the chosen library provides out of the box; complex ICU authoring is deferred unless a string demands it.
- Translation-management tooling (TMS), over-the-air catalog updates, or professional translation sourcing (initial translations may be seeded and refined later).

## Decisions

### Decision: Use `i18next` + `react-i18next` for the runtime
Provides a mature, well-supported translation runtime with key-based lookup, per-language resource bundles, built-in fallback chains, interpolation, and pluralization — all framework-agnostic and proven on React Native. The `useTranslation()` hook integrates cleanly with the existing functional-component + context architecture and re-renders on language change.

- **Alternatives considered:**
  - *Hand-rolled context + JSON maps*: minimal deps but we'd reimplement fallback, interpolation, plural rules, and change-propagation — more code to own for no real benefit.
  - *`expo-localization` alone*: it only exposes device locale/region, not a translation runtime; we still use it, but for detection only (below).
  - *`react-intl` (FormatJS)*: powerful ICU support but heavier authoring ergonomics; overkill for the current string set.

### Decision: Use `expo-localization` for device-locale detection only
`expo-localization` exposes the device's preferred locales. On first launch (no saved preference) we take the top device locale, reduce it to its primary language subtag (e.g. `de-AT` → `de`), and match against the supported set, defaulting to `en`. This keeps detection native-accurate while `i18next` owns activation.

### Decision: Catalog structure — one resource file per language, namespaced by feature area
Store catalogs under `frontend/i18n/locales/<lang>/…` (or a single `<lang>.json` per language to start). English (`en`) is authored first and is the reference. Keys are stable, semantic identifiers grouped by screen/feature (e.g. `rooms.create.title`). A lightweight parity check (test + optional script) asserts every non-English catalog has exactly the English key set.

- **Alternative considered:** co-locating strings next to components. Rejected — spreads catalogs across the tree, making parity checks and translator hand-off harder.

### Decision: Persist preference in AsyncStorage under a dedicated key
Follow the existing `hooks/useUser.ts` pattern with a separate `language` key (independent of the user profile so it applies even before/without a profile). A saved preference takes precedence over device detection. Expose language state and a setter via a small hook/context initialized in `app/_layout.tsx` alongside the existing providers.

- **Alternative considered:** storing language inside the user profile object. Rejected — language is a device/app setting that should work pre-profile and shouldn't round-trip to the backend.

### Decision: Initialize i18n before first render; gate UI until ready
Because activation depends on an async AsyncStorage read, initialize i18n during app startup (in the root layout, alongside splash-screen handling) and avoid rendering translated UI until the language is resolved, preventing a visible English-then-translated flash.

### Decision: Route date/number formatting through the active locale
Replace the `Intl.DateTimeFormat(undefined, …)` call and any ad-hoc formatting with a small helper that reads the active language and passes the corresponding BCP-47 locale to `Intl`. This ties formatting to the same source of truth as text.

## Risks / Trade-offs

- **Bundle size grows with ten catalogs** → Catalogs are small JSON; bundle all initially. If size becomes a concern, revisit lazy-loading per language later (non-goal for launch).
- **Startup flash / delay from async preference read** → Gate rendering behind i18n-ready + keep the read fast; reuse existing splash-screen hold so there's no extra perceived delay.
- **Translation drift (keys added without updating all catalogs)** → Enforce parity with a CI-run test/script; missing keys still fall back to English at runtime so users are never blocked.
- **Low-quality initial translations for less-common languages (lt, lv, et, be)** → Ship seeded translations, mark for native-speaker review; English fallback guarantees usability meanwhile.
- **Missed hardcoded strings during extraction** → Add a lint/grep sweep and code review to catch inline literals; incremental — remaining strings simply stay English until keyed.
- **`Intl` locale data availability on Hermes/React Native** → Verify the target `Intl` build supports the required locales; if a locale's formatting is unavailable, fall back to `en` formatting without erroring.

## Migration Plan

1. Add dependencies (`i18next`, `react-i18next`, `expo-localization`) and scaffold `frontend/i18n/` (config, detection, English catalog).
2. Wire the i18n provider + initialization into `app/_layout.tsx`; add the persisted-language hook.
3. Author the English catalog by extracting existing strings screen-by-screen; replace literals with keyed lookups incrementally (English behavior unchanged throughout).
4. Add the language selector UI and the locale-aware formatting helper.
5. Add the nine non-English catalogs and the parity test.
6. Update existing tests to assert against keys / the English catalog.

**Rollback:** The change is client-only and additive. Reverting the i18n provider and restoring literals (or defaulting activation to `en`) returns the app to English-only with no data migration.

## Open Questions

- Where should the language selector live — inside the existing profile/user modal (`app/main/modal-change-user.tsx`) or a dedicated settings surface? (Leaning toward the profile modal for launch.)
- Do we seed non-English translations via machine translation for review, or block launch on human translation? (Assumed: seed + review.)
- Should the selector show language names in their own language (endonyms) plus a flag/label, or English names? (Assumed: endonyms.)
