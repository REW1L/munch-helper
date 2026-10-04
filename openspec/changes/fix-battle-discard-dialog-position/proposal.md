# Proposal

## Why

On iOS, the battle discard confirmation can appear below the visible screen because its overlay is positioned relative to the nested battle action view. This makes the confirmation difficult or impossible to use.

## What Changes

- Render custom confirmation dialogs in a screen-level modal on iOS so their backdrop and dialog are centered in the device window.
- Preserve the native Android alert and web modal behavior.
- Add an end-to-end regression flow for battle discard confirmation visibility and require scenario-specific E2E coverage for substantial frontend behavior changes and fixes.

## Capabilities

### New Capabilities

- `confirmation-dialog-presentation`: custom confirmation dialogs remain within the visible viewport regardless of where their trigger is nested.

### Modified Capabilities

None.

## Impact

- Affected code: `frontend/components/ConfirmDialog.tsx` and its tests.
- Affected docs and guidance: frontend architecture, component inventory, source tree analysis, E2E development guide, and `AGENTS.md`.
- No API, dependency, or backend changes.
