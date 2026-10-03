# Proposal

## Why

Players can create or join a Munchkin room from the Games screen, but they cannot learn or refresh the game rules without leaving Munch Helper and finding a trustworthy source themselves. A concise, original in-app guide will make the game tile more useful while directing players to the official rulebook for authoritative details.

## What Changes

- Add a localized Rules action to the Munchkin Classic tile on the Games screen.
- Add a localized, scrollable Munchkin Classic rules screen with an original game description and concise explanations of the objective, setup, turn flow, combat, items and trading, help, running away and death, and curses.
- Identify the official Munchkin Classic rulebook as the source and expose its PDF URL as an accessible external link.
- Keep the in-app guide copyright-safe by paraphrasing gameplay concepts and excluding rulebook artwork, extended examples, and copied prose; clarify that the official rulebook is authoritative.
- Add route, interaction, localization-parity, accessibility, and mobile end-to-end coverage for opening the guide and its source link.

## Capabilities

### New Capabilities

- `game-rules`: Discovering and reading a localized, copyright-safe game guide from a game tile, with attribution and a link to the authoritative rules source.

### Modified Capabilities

None. The existing `localization` and `localized-ui-layout` requirements already govern the new screen and action without changing those requirements.

## Impact

- **Frontend routes and navigation:** `frontend/app/rooms.tsx` and a new static Munchkin rules route under `frontend/app/munchkin/`.
- **Frontend presentation:** a reusable or route-local sectioned rules layout that remains readable on small screens and uses existing theme and button-label conventions.
- **Localization:** the English source catalog and every supported locale receive matching rules keys and translated values.
- **Tests and E2E:** new route tests for the Games and rules screens, catalog parity coverage, and a Maestro flow that opens the guide from the Munchkin Classic tile.
- **Documentation:** frontend routing/component documentation is updated to describe the rules route and external-source behavior.
- **External source:** [Official Munchkin Classic rules PDF](https://munchkin.game/site-munchkin/assets/files/1138/munchkin_rules-1.pdf). No backend, API, persistence, or infrastructure contract changes are required.
