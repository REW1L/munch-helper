## 1. Seed catalogs (Western & Southern EU)

Each file lives at `frontend/i18n/locales/<code>.ts`, mirrors `en.ts` exactly as `const <code> = { ... } as const satisfies TranslationResource; export default <code>;`, translates every value, and preserves all `{{...}}` placeholders verbatim.

- [x] 1.1 Create `es.ts` (Español)
- [x] 1.2 Create `it.ts` (Italiano)
- [x] 1.3 Create `pt.ts` (Português)
- [x] 1.4 Create `nl.ts` (Nederlands)
- [x] 1.5 Create `el.ts` (Ελληνικά)

## 2. Seed catalogs (Central Europe)

- [x] 2.1 Create `cs.ts` (Čeština)
- [x] 2.2 Create `sk.ts` (Slovenčina)
- [x] 2.3 Create `hu.ts` (Magyar)
- [x] 2.4 Create `ro.ts` (Română)
- [x] 2.5 Create `sl.ts` (Slovenščina)

## 3. Seed catalogs (Balkans, Nordics & islands)

- [x] 3.1 Create `bg.ts` (Български)
- [x] 3.2 Create `hr.ts` (Hrvatski)
- [x] 3.3 Create `da.ts` (Dansk)
- [x] 3.4 Create `sv.ts` (Svenska)
- [x] 3.5 Create `fi.ts` (Suomi)
- [x] 3.6 Create `ga.ts` (Gaeilge)
- [x] 3.7 Create `mt.ts` (Malti)

## 4. Register the languages

- [x] 4.1 Add the 17 new entries (code + endonym) to `SUPPORTED_LANGUAGES` in `frontend/i18n/languages.ts`, appended after the existing 10 (endonyms per design.md)
- [x] 4.2 Import and register the 17 new catalogs in the `resources` map in `frontend/i18n/resources.ts` (import order mirroring the languages list)
- [x] 4.3 Verify `LanguageCode`, `SUPPORTED_LANGUAGE_CODES`, and `isSupportedLanguage` now include all 27 codes (type-check passes with each locale's `satisfies TranslationResource`)

## 5. Verify

- [x] 5.1 Run `catalogParity.test.ts` (and the i18n test suite) — all 26 non-English catalogs must have exactly the English key set, no missing/extra/empty values
- [x] 5.2 Type-check the frontend (`tsc`) — no locale file has missing/extra keys or wrong shape
- [ ] 5.3 Manually confirm in the running app: the selector lists all 27 languages by endonym, switching to a few new ones (e.g. `es`, `el`, `fi`) updates the UI immediately with no untranslated English leaking and no layout overflow, and device-locale detection resolves a new-language locale (e.g. `es-ES` → `es`)
  - Statically verified (no live device pass yet): the selector renders `SUPPORTED_LANGUAGES.map(...)` with a `flexWrap: 'wrap'` layout (`components/LanguageSelector.tsx`), so all 27 endonyms appear and wrap without overflow; catalog-parity + no-empty-values tests guarantee no untranslated English; `detectLanguage.test.ts` covers primary-subtag resolution (`es-ES` → `es`); `LanguageProvider.test.tsx` covers immediate, restart-free switching. **Remaining:** eyeball the selector + a few switches on a real simulator (per on-device validation setup) before release.
