# Proposal

## Why

Second Edition character cards use a taller, separate layout and visually isolate Gold Pieces from level and strength. This makes rooms harder to scan and shows fewer players at once on small screens.

## What Changes

- Reuse the Classic character-card row and place the Second Edition GP balance inline with level and strength using the same stat style.
- Put the attributes box between character details and Change, matching the Classic row.
- Move Second Edition coin adjustments into Quick Edit and the full Change modal so compact cards retain an editing path.
- Preserve the GP testID, accessible balance label, nonnegative integer validation, and Classic behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `room-character-coins`: specify coin editing through the character edit flows and readable inline balance.

## Impact

Frontend character card, Quick Edit sheet, Change Character modal, room route wiring, component and route tests, and the existing room-character-coins specification. No backend or wire contract change; adjustments continue to use `goldPiecesDelta`.
