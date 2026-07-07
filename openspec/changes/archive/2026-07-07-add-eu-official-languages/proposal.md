## Why

Munch Helper currently localizes into 10 languages (en, pl, de, fr, lt, lv, et, ru, be, uk), covering Central/Eastern Europe and the Baltics but leaving most of the EU — Southern, Western, and Nordic markets — reading English. Completing coverage of the 24 official EU languages removes that gap, reaches players in their native language across the whole single market, and does so cheaply because the localization layer, selector, detection, and parity tests already exist: each new language is an additive catalog drop-in.

## What Changes

- Add catalogs for the 17 remaining official EU languages so the app ships all 24: Spanish (`es`), Italian (`it`), Portuguese (`pt`), Dutch (`nl`), Greek (`el`), Czech (`cs`), Slovak (`sk`), Hungarian (`hu`), Romanian (`ro`), Bulgarian (`bg`), Croatian (`hr`), Slovenian (`sl`), Danish (`da`), Swedish (`sv`), Finnish (`fi`), Irish (`ga`), and Maltese (`mt`).
- Register each new language in `SUPPORTED_LANGUAGES` (code + endonym) and in the i18next `resources` bundle so it appears in the in-app selector and participates in device-locale detection and catalog-parity tests.
- Seed each catalog with a full translation of the English source-of-truth key set (no missing/extra/empty keys), marking machine-seeded catalogs for later native-speaker review; English remains the default and fallback.
- No RTL languages are introduced (all 17 are LTR), so no layout-direction work is required.

## Capabilities

### New Capabilities
<!-- None — this extends existing localization behavior rather than introducing a new capability. -->

### Modified Capabilities
- `localization`: The "Supported languages" requirement expands from 10 to 27 (the 10 existing plus the 17 new EU official languages) with English still the default/fallback and source-of-truth catalog. Parity, fallback, detection, and selector requirements are unchanged in behavior but now apply across the larger set.

## Impact

- **Code (frontend only, additive):**
  - New files: `frontend/i18n/locales/{es,it,pt,nl,el,cs,sk,hu,ro,bg,hr,sl,da,sv,fi,ga,mt}.ts` — each `satisfies TranslationResource`.
  - `frontend/i18n/languages.ts` — extend `SUPPORTED_LANGUAGES` (drives `LanguageCode`, detection, selector).
  - `frontend/i18n/resources.ts` — import and register the 17 new catalogs.
- **Tests:** `frontend/i18n/__tests__/catalogParity.test.ts` automatically covers the new languages via `SUPPORTED_LANGUAGE_CODES`; no test edits needed, but all new catalogs must pass parity + no-empty-values.
- **Backend:** Out of scope — client-rendered UI only; server text unchanged.
- **Bundle size:** Grows by 17 small catalogs, bundled inline like the existing ones; lazy-loading remains a future non-goal.
- **No breaking changes**, no data migration, no dependency changes.
