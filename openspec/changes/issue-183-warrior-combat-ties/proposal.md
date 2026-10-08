# Proposal

## Why

The battle score summary can contradict Munchkin's Warrior tie rule: Classic always awards a tie to the monsters, and the 2e outcome summary can say Players Win while the comparison still says Even. This misleads players using the live score guide.

## What Changes

- Apply the Warrior tie rule in both Classic and Second Edition battle views.
- Recognize canonical Warrior class values after trimming whitespace and ignoring case.
- Include any participating player, including a helper, when resolving a tie.
- Keep the comparison label and tone consistent with the displayed outcome.
- Document and test the rule while keeping outcomes player-reported and non-enforcing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `edition-aware-battles`: define consistent, edition-independent Warrior tie guidance in the live battle score.

## Impact

Frontend battle route and route tests, Maestro battle flow, edition-aware battle OpenSpec requirement. No API, persistence, dependency, or wire-contract changes.
