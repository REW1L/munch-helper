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
- [x] 5.3 Manually confirm in the running app: the selector lists all 27 languages by endonym, switching to a few new ones (e.g. `es`, `el`, `fi`) updates the UI immediately with no untranslated English leaking and no layout overflow, and device-locale detection resolves a new-language locale (e.g. `es-ES` → `es`)
  - Validated live on **iPhone SE (3rd gen)** simulator (min-size target) via `npm run ios` (Expo dev client) + maestro:
    - **All 27 endonyms render & scroll** — flow scrolled the wrapped grid from `English` at the top down through `Español, Ελληνικά, …, Suomi, Gaeilge, Malti` (last row) with no overflow or clipping on the smallest screen.
    - **Immediate live switching (no restart)** — tapped `Español` → whole UI re-rendered Spanish (`Idioma`/`Guardar`); `Ελληνικά` → Greek (`Παιχνίδια`/`Δημιουργία`/`Συμμετοχή`/`Αποθήκευση`/`Ακύρωση`/`Αλλαγή`); `Suomi` → Finnish (`Pelit`/`Klassinen`/`Luo`/`Liity`/`Tallenna`/`Peruuta`/`Vaihda`). No English leaked in any.
    - **Device-locale detection** — set simulator locale to `es-ES`, cleared app state, relaunched: landing auto-detected `es` (`Privacidad`/`Soporte`/`Tu compañero para juegos de mesa como Munchkin`/`Salas`).
  - Note: `pod install`/`expo run:ios` requires `LANG=en_US.UTF-8` (CocoaPods fails on ASCII-8BIT otherwise).
