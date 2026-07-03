## Why

Munch Helper currently presents its user interface, accessibility labels, legal/support content, default generated names, and game history text in English only. Adding localization makes the app usable for a broader set of players while keeping English as the reliable default and fallback.

## What Changes

- Add app localization with English as the default and fallback language.
- Support the first language set: Polish, German, French, Lithuanian, Latvian, Estonian, Russian, Belarusian, and Ukrainian.
- Detect the device or browser locale on first launch and choose the best supported language when possible.
- Allow users to manually change the app language from the profile/user preferences UI.
- Persist the selected language locally on the device and apply it without backend synchronization.
- Extract user-visible app strings, navigation titles, accessibility labels, placeholders, error fallbacks, and game-domain labels into translation resources.
- Render room history and battle summaries from structured event data where possible so they can be localized per user.
- Keep user-generated data, room codes, backend identifiers, and internal enums language-neutral.

## Capabilities

### New Capabilities

- `localization`: Covers language detection, manual language selection, local persistence, translation fallback behavior, and localized rendering of app UI and game-domain text.

### Modified Capabilities

- None.

## Impact

- Frontend app localization infrastructure, context/hooks, and translation resources.
- Profile/change-user UI where language selection will live initially.
- React Native and Expo navigation titles, accessibility labels, placeholders, and error fallbacks.
- Munchkin room, battle, character, log, support, and privacy screens.
- Frontend tests that currently assert exact English strings.
- No backend API or data model changes are expected, though frontend log rendering should prefer structured payload fields over backend summary strings when localizing history entries.
