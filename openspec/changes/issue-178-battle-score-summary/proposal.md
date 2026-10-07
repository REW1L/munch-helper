# Proposal

## Why

During battle, players cannot see both combat totals and the comparison result at once. They must scroll between the comparison label and side totals, making it difficult to judge the impact of an edit.

## What Changes

- Keep a compact battle score summary visible while battle content scrolls.
- Show player and monster totals plus the current winner/tie, respecting Classic and Second Edition tie rules.
- Localize and expose the summary accessibly across supported platforms.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `edition-aware-battles`: Battle presentation continuously summarizes both sides and resolves displayed ties according to room edition and participating Warrior roles.

## Impact

Frontend battle route, translations, route tests, and Maestro coverage. No API or backend changes.
