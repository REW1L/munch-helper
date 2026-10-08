# Proposal

## Why

The Second Edition battle composer repeats rules already available on the room's Rules screen. This extra block consumes vertical space and pushes the battle editor down during play.

## What Changes

- Remove combat rules and notice text from the Second Edition battle composer.
- Keep the Second Edition combat rules and notice on the Rules screen.
- Preserve Classic battle presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `edition-aware-battles`: The battle composer omits guidance while the Rules screen continues to provide edition-specific rules.

## Impact

Frontend battle route and its route tests; Second Edition Rules route tests remain the contract for the retained content. No API, translation, or dependency changes.
