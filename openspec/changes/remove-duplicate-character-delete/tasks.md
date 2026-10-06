# Tasks

## 1. Remove duplicate footer action

- [x] 1.1 Add a component regression asserting the form has the sole delete control, the footer retains Save and Cancel, and platform-specific footer delete IDs are absent; run the targeted test and confirm it fails before the fix.
- [x] 1.2 Remove the web/iOS footer delete button and unused style; run the targeted component test and confirm it passes.

## 2. Keep deletion covered across platforms

- [x] 2.1 Update `maestro/e2e/delete-character.yaml` so web and iOS scroll to and tap `delete-character-button`, then use the confirmation dialog test ID; inspect the flow to confirm every platform follows the in-form path.
- [x] 2.2 Run frontend lint, typecheck, coverage, and the required root mobile E2E gate; record any check blocked by unavailable environment tooling (Docker daemon unavailable).
