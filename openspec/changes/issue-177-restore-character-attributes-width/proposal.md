# Proposal

## Why

The unified room character tile applies a fixed 88px width to the race/class/gender box in both editions, reducing space for the avatar, nickname, and stats. Restore the earlier content-driven width so the tile remains balanced across editions and screen sizes.

## What Changes

- Remove the fixed width and no-shrink behavior from the shared character attributes box.
- Add regression coverage for intrinsic sizing in Classic and Second Edition tiles, preserving the inline Second Edition GP balance.

## Capabilities

### New Capabilities

### Modified Capabilities
- `localized-ui-layout`: Character tiles keep attribute-box sizing content-driven so other tile content retains usable horizontal space across editions and screen sizes.

## Impact

- `frontend/components/munchkin/RoomCharacterCard.tsx` and its component tests.
- `openspec/specs/localized-ui-layout` layout contract.
