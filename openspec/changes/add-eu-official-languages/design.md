## Context

The localization layer (`frontend/i18n/`) already exists and was designed for cheap language extension: `SUPPORTED_LANGUAGES` (code + endonym) drives the `LanguageCode` union, device detection, and the selector; `resources.ts` bundles each catalog inline; `catalogParity.test.ts` enforces that every non-English catalog has exactly the English key set with no empty values via `SUPPORTED_LANGUAGE_CODES`. Adding a language today means: drop `locales/<code>.ts` mirroring `en.ts` (`satisfies TranslationResource`), register it in `SUPPORTED_LANGUAGES` and `resources`. This change applies that recipe 17 times to complete the 24 official EU languages. It is client-only and additive; no new dependencies, no schema changes, no RTL languages.

## Goals / Non-Goals

**Goals:**
- Ship translated catalogs for the 17 remaining EU official languages (`es`, `it`, `pt`, `nl`, `el`, `cs`, `sk`, `hu`, `ro`, `bg`, `hr`, `sl`, `da`, `sv`, `fi`, `ga`, `mt`).
- Keep English as source-of-truth/default/fallback; all new catalogs pass parity and no-empty-values.
- Each language appears in the selector by endonym and participates in device-locale detection.

**Non-Goals:**
- Professional/native-speaker translation sourcing (catalogs are machine-seeded, flagged for later review; English fallback guarantees usability meanwhile).
- Lazy-loading / per-language bundle splitting (revisit only if bundle size becomes a concern).
- RTL layout (none of the 17 are RTL).
- Backend / server-provided text.
- Regional variants (e.g. `pt-BR` vs `pt-PT`, `es-419`): only primary-subtag codes are added; detection already reduces regional tags to the primary subtag.

## Decisions

- **Which codes/endonyms.** Use ISO 639-1 primary subtags to match the existing detection scheme (`resolveSupportedLanguage`/`detectDeviceLanguage` reduce to primary subtag). Endonyms shown in the selector: `es` Español, `it` Italiano, `pt` Português, `nl` Nederlands, `el` Ελληνικά, `cs` Čeština, `sk` Slovenčina, `hu` Magyar, `ro` Română, `bg` Български, `hr` Hrvatski, `sl` Slovenščina, `da` Dansk, `sv` Svenska, `fi` Suomi, `ga` Gaeilge, `mt` Malti.
  - *Alternative considered:* BCP-47 regional tags (e.g. `pt-PT`). Rejected — the whole i18n layer keys on primary subtags; regional variants would need detection/type changes for no current benefit.
- **Portuguese = `pt` (European seeding, generic).** Ship one `pt` catalog usable for both PT and BR audiences; avoid committing to a regional split now. Revisit if data shows a need.
- **Catalog shape stays identical.** Each file is `const xx = { ... } as const satisfies TranslationResource; export default xx;`, mirroring `en.ts` exactly. Interpolation placeholders (`{{game}}`, `{{email}}`, `{{amount}}`, `{{time}}`, `{{name}}`, `{{level}}`, `{{power}}`) MUST be preserved verbatim in every translation.
- **Ordering.** Append the 17 new entries after the existing 10 in `SUPPORTED_LANGUAGES` and `resources` (keeps `en` first and existing order stable). Selector renders in array order; no alphabetical re-sort to avoid churn.
- **Number/date formatting.** No code change — `format.ts` passes the active language to `Intl` with an English fallback for engines lacking locale data (e.g. Hermes), which already covers all 17.

## Risks / Trade-offs

- **Machine-seeded translation quality (esp. `ga`, `mt`, `el`, `sl`).** → Ship seeded, flag for native-speaker review; English fallback per-key guarantees no broken UI. Parity + no-empty-values tests prevent missing/blank strings.
- **Placeholder corruption during translation** (a mistranslated/removed `{{...}}` breaks interpolation). → Preserve placeholders verbatim; the parity test catches structural drift, and reviewers spot-check interpolated strings.
- **`Intl` locale data gaps on Hermes for less-common locales** (e.g. `mt`, `ga`). → Already mitigated by `format.ts` try/catch English fallback; no crash, only fallback formatting.
- **Bundle grows by 17 catalogs.** → Each catalog is ~6–9 KB of strings, bundled inline like the existing 10; acceptable. Lazy-loading remains the escape hatch if needed later.
- **Selector list length (27 languages).** → The selector is already a scrollable list; no layout change expected, but verify scroll on a small device.

## Migration Plan

Additive and client-only. Deploy is a normal app release. Rollback = revert the new locale files and the `languages.ts`/`resources.ts` additions; no data migration (persisted preference for a removed code already falls back to `en` via `isSupportedLanguage`).
