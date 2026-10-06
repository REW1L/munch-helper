# Design

## Context

`RoomCharacterCard` currently forks the Second Edition layout into a 142px vertical card with separate attributes and inline decrement/input/increment controls. Classic uses an 85px horizontal card with character details, attributes, and Change in one row. Coin updates already use the backward-compatible `goldPiecesDelta` mutation.

## Decisions

- Use one horizontal card structure for both editions. Add the Second Edition balance as another stat text in the existing stats row.
- Keep `AttributeList` edition-aware (`showGender={false}` for Second Edition) and put its existing scrollable box between the character body and Change button.
- Remove tile-level coin controls and their callback plumbing.
- Add a Gold Pieces stepper to Quick Edit for Second Edition. Its draft starts from the displayed balance (500 when absent), clamps decrements at zero, and saves a delta from the opening balance.
- Add a nonnegative integer Gold Pieces field to the full Change modal for Second Edition. Submit a delta from the opening balance alongside the existing character fields.
- Keep coin mutations as deltas with `retryCount: 0`; this preserves the existing wire contract and avoids replaying non-idempotent updates. Send a coin delta in its own character update request because the backend rejects combining it with other character fields.
- Keep `gold-pieces-${id}` on the balance text and preserve `coinBalanceA11y`.

## Risks and mitigations

Long localized attributes and large coin values can compete for horizontal space. Keep the nickname and attribute content bounded/scrollable, allow the stats text to shrink, and test long names, 12 500 GP, and narrow layouts. Classic cards must retain gender and not expose coin editing.

## Verification

Add component coverage for shared row structure, stat styling, accessibility, testID, and absent tile controls; exercise coin editing through both edit surfaces and room mutation wiring. Run the targeted frontend suite and required repository frontend/mobile checks.
