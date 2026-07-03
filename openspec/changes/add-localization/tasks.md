## 1. Dependencies & scaffolding

- [x] 1.1 Add `i18next`, `react-i18next`, and `expo-localization` to `frontend/package.json` and install
- [x] 1.2 Create `frontend/i18n/` module with an i18n config that registers all ten languages (`en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk`), sets `en` as `fallbackLng`, and disables key-as-error behavior so missing keys resolve via fallback
- [x] 1.3 Define a typed list of supported languages (code + endonym display name) in `frontend/i18n/` for use by detection and the selector

## 2. Locale detection & persistence

- [x] 2.1 Implement device-locale detection using `expo-localization` that reduces the top device locale to its primary language subtag and matches it against the supported set, defaulting to `en`
- [x] 2.2 Implement a persisted-language store in AsyncStorage under a dedicated `language` key (following the `hooks/useUser.ts` pattern), independent of the user profile
- [x] 2.3 Implement resolution order on startup: saved preference (if any) → device detection → `en`

## 3. App integration

- [x] 3.1 Create a language hook/context exposing the active language and a setter that updates i18next and persists the choice
- [x] 3.2 Initialize i18n in `app/_layout.tsx` and gate rendering until the language is resolved (reuse the existing splash-screen hold to avoid an English-then-translated flash)
- [x] 3.3 Wrap the app with the i18n provider alongside the existing `userProfileContext` / `QueryClientProvider` providers

## 4. English source catalog & string extraction

- [x] 4.1 Author the English (`en`) catalog with stable, feature-namespaced keys (e.g. `rooms.create.title`)
- [x] 4.2 Extract hardcoded strings from `app/main/**` (user, avatar, room create/join, shop modals) into keyed lookups
- [x] 4.3 Extract hardcoded strings from `app/munchkin/**` (room index, character modals, battle, log) into keyed lookups
- [x] 4.4 Extract hardcoded strings from top-level screens (`app/index.tsx`, `app/rooms.tsx`, `app/support.tsx`, `app/privacy.tsx`) and shared `components/**` (`ConfirmDialog`, `VioletButton`, `munchkin/*`) into keyed lookups
- [x] 4.5 Sweep for remaining inline literals (grep/lint) and confirm no user-facing text bypasses the translation function

> Notes / intentional remainder (English-fallback, tracked for follow-up):
> - **`components/munchkin/LogEntry.tsx`**: log-line sentence composition (`'Unknown character'`, `'Log entry'`, `'Battle '` prefix, `'discarded'`) builds phrases procedurally with relative-time appends; safe extraction needs an interpolation-based rework and is deferred.
> - **`app/privacy.tsx`**: legal privacy-policy body kept in English pending professional legal translation (deliberate).
> - **Game data values** (`race`/`class`/`gender` values, `NativePicker` `<Select>` sentinel): kept canonical because they are persisted to the backend and used as logic sentinels.
> - **Gaming shorthand** (`CurrentCharacterFooter` `lvl`/`str` suffixes, `· Level` in battle history) and **brand strings** (`Munch ⚔️`, decorative store-badge a11y labels): left as-is.

## 5. Locale-aware formatting

- [x] 5.1 Add a formatting helper that maps the active language to a BCP-47 locale and wraps `Intl.DateTimeFormat`/`Intl.NumberFormat`, falling back to `en` formatting if a locale is unavailable
- [x] 5.2 Replace the existing `Intl.DateTimeFormat(undefined, …)` usage in the munchkin log with the helper

## 6. Language selector UI

- [x] 6.1 Build a language selector control listing all supported languages by endonym with the active language indicated
- [x] 6.2 Add the selector to the profile/user modal (`app/main/modal-change-user.tsx`) and confirm switching updates the UI immediately without restart

## 7. Non-English catalogs

- [x] 7.1 Create catalog files for `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk` mirroring the English key set
- [x] 7.2 Populate translations for each language (seed, mark less-common languages for native-speaker review)

## 8. Testing & validation

- [x] 8.1 Add a catalog parity test asserting every non-English catalog has exactly the English key set (no missing, no extra)
- [x] 8.2 Add unit tests for device-locale detection (supported match by subtag, unsupported → `en`) and persistence precedence (saved preference overrides device locale, survives restart)
- [x] 8.3 Add a test for missing-key fallback to English and key-as-placeholder when absent everywhere
- [x] 8.4 Update existing text/snapshot tests to assert against translation keys or the English catalog
- [x] 8.5 Run `npm run tsc`, `npm run lint`, and `npm test` in `frontend/` and confirm all pass
