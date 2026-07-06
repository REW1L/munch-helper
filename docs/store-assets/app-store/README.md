# App Store — Store Assets

Store listing copy for the App Store submission.

## Files

- `en.txt` — source description (English)
- `<code>.txt` — localized descriptions, one per store locale

Locales mirror the app's supported languages
(`frontend/i18n/languages.ts`): `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`,
`ru`, `be`, `uk`.

Store-only locales (App Store listing, no matching app UI language): `es`.

## Conventions

- **No emojis.** The App Store description field does not support them, so
  every emoji header/bullet from the marketing draft is rendered as a plain
  `•` bullet or dropped.
- **Paragraphs** are separated by a blank line. No hard line breaks inside a
  paragraph — the store wraps text automatically.
- **Brand:** `Munch Helper` is left untranslated in every locale.
- **Game name:** the trademarked title stays out of the app **Name** field
  (trademark safety) but may appear in the description body. It is kept in
  Latin script for Latin-script locales (`Munchkin`) and transliterated for
  Cyrillic locales (`Манчкин` for `ru`, `Манчкін` for `uk`/`be`) to match how
  players search in those markets.

## Related

- App Name (trademark-safe): `Munch Helper — Level Counter & Score for Game Night`
- Short description and keyword analysis live in the ASO working notes.
