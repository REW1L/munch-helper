# Design

## Context

The battle route computes totals from active participants and draft bonuses. It currently applies the Warrior exception only to 2e and only to the pinned outcome label. Stored class values are string arrays, normally canonical English picker values, but existing data may have surrounding whitespace or case differences.

## Decisions

- A tie is a player win in either room edition when any active participant has a class value equal to `Warrior` after trimming and case-folding.
- All battle participants are checked; the official Classic rules explicitly say a helping Warrior wins a tie for the side.
- A tie without a Warrior remains a monster win.
- The comparison label says Players ahead when a Warrior wins a tie; its border uses the player-win accent. A tie without a Warrior remains Even with neutral styling while the outcome remains Monsters Win, preserving the existing score-comparison meaning.
- This is display guidance only. It does not change battle conclusion APIs or validate the player's recorded result.
- Localized/free-text class names remain unsupported because the picker stores canonical English values.

## Verification

Route tests cover Classic and 2e Warrior ties, a helper Warrior, whitespace/case normalization, and non-Warrior ties. A Maestro flow exercises the live battle result with a Warrior participant.
