# Design

## Decisions

- The stable room type is `munchkin-2e`; `munchkin` remains the default when an older client omits the field. Room-type validation happens at the API boundary and preserves `{ message }` errors.
- Room association responses include the persisted `roomTypeId`, including idempotent and duplicate-key paths. Join/create client routes use this response, never the entry tile, as authority. Session restoration resolves from room persistence before rendering.
- 2e capacity (3–6 players) is displayed as tabletop guidance rather than enforced by the service, so late join and casual room tracking remain possible.
- Gold Pieces are integer, nonnegative character state initialized to 500 for new characters in 2e rooms. A room-scoped mutation sets the balance to an explicit nonnegative integer; the client supports increment, decrement, and custom balance entry. No game-rule automation or spending validation is implied. Existing characters joining a 2e room receive the edition default only when their 2e coin balance is absent. Classic documents are not rewritten.
- Coin changes publish `character_updated` with the resulting character snapshot so existing notification and history pipelines can synchronize participants. Coin adjustments are logged as character updates.
- Physical cards, decks, hands, items, and their effects remain outside app state. Character gender remains stored for compatibility, but 2e views omit it as a game stat.
- Battle comparison remains a player-entered aid. For 2e, the UI explains that victory can depend on class abilities/card effects and displays outcomes as recorded by players. It does not infer a rules-valid winner from numeric totals. Existing Classic battle records retain their current rendering and semantics.
- The 2e guide is original explanatory copy, localized with parity, and links to the official PDF. It does not reproduce rulebook text.

## Data and API

- `Room.roomTypeId` allows `munchkin` and `munchkin-2e`; creation without a value stores `munchkin`.
- `POST /rooms/associations` adds `roomTypeId` to every success response. Creation already returns it.
- Character coin mutations are room scoped and validated against character and room membership; they return the updated character. Invalid/negative resulting balances use the service's established message error shape.
- Character update events carry updated character data through the existing notification and log fan-out.

## Frontend

- Keep shared room, character, battle, notification, and history components. Branch labels/help/forms only where edition behavior differs.
- Give each edition a distinct create/join entry and guide route. Resolve the room type before navigating after join and when restoring a saved room.
- Render coin controls on character cards/details for 2e only; provide accessible increment/decrement/custom adjustment controls and prevent balances below zero.
- Keep supported translation catalogs in parity and ensure the room screen adapts to small widths and reduced motion.

## Verification

Add backend boundary/service/publisher tests, frontend API/hook/route/component tests, OpenAPI updates, and a dedicated Maestro create/join/rules flow. Run relevant package checks and the required root mobile E2E gate. The issue also identifies Linux PR `e2e-web` as a required cross-platform check.
