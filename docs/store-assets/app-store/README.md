# App Store — Store Assets

Store listing copy for the App Store submission.

## Layout

- `description/<code>.txt` — App Store description field (long copy)
- `promotional-text/<code>.txt` — App Store promotional text field
  (short hook, max 170 chars, updatable without a new build)
- `subtitle/<code>.txt` — App Store subtitle field (max 30 chars, indexed
  for search)
- `keywords/<code>.txt` — App Store keyword field (max 100 chars,
  comma-separated, indexed for search)
- `whats-new/<code>.txt` — App Store "What's New" release notes
  (max 4000 chars, per-release)

`en` is the source; every other file is a localization of it.

Locales mirror the app's supported languages
(`frontend/i18n/languages.ts`): `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`,
`ru`, `be`, `uk`.

Store-only locales (App Store listing, no matching app UI language): `es`.

## Screenshot localization

Store screenshots use exactly the locales represented by the four listing-copy
directories (`description`, `promotional-text`, `subtitle`, and `whats-new`):
`en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk`, and `es`. This list
is maintained in `scripts/store-screenshot-locales.json` and is intentionally
smaller than the app UI's language list.

The capture runners build each locale with a screenshot-only language override
and save matching localized UI and captioned previews under
`screenshots/<target>_store_preview/<locale>/`. When a listing locale is added
or removed, update the JSON configuration and the four caption strings for
each screenshot slide, then run `python3 scripts/generate-app-store-preview-redesign.py --validate`
before capturing the full store set.

## Conventions

- **No emojis.** The App Store description field does not support them, so
  every emoji header/bullet from the marketing draft is rendered as a plain
  `•` bullet or dropped. Promotional text is kept emoji-free for consistency.
- **Paragraphs** are separated by a blank line. No hard line breaks inside a
  paragraph — the store wraps text automatically.
- **Promotional text** is a single sentence, at most 170 characters, and
  reuses the description's positive tone (no time/speed promises).
- **Subtitle** carries generic, high-volume terms (score, tracker, counter,
  game night) that complement — and do not repeat — words already in the
  app Name, since Apple indexes Name + Subtitle + keyword field together.
- **Keyword field** uses comma-separated single words with no space after
  the comma (spaces waste characters). Words already in the Name or Subtitle
  are omitted; Apple auto-combines tokens, so `board` + `game` covers
  "board game". Keywords are localized per market.
- **Brand:** `Munch Helper` is left untranslated in every locale.
- **Game name:** the trademarked title stays out of the app **Name** field
  (trademark safety) but may appear in the description body. It is kept in
  Latin script for Latin-script locales (`Munchkin`) and transliterated for
  Cyrillic locales (`Манчкин` for `ru`, `Манчкін` for `uk`/`be`) to match how
  players search in those markets.
  - **Trademark note:** the `keywords` field also includes the game term
    (`munchkin` / `манчкин` / `манчкін`). Unlike the description body
    (editorial nominative use), the keyword field is indexed metadata and
    carries the same trademark-rejection risk as the Name. Keep it if the
    ASO value is worth the risk; drop that token to play it safe.

## Related

- App Name (trademark-safe): `Munch Helper — Level Counter & Score for Game Night`
- Short description and keyword analysis live in the ASO working notes.
