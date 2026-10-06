# Tasks

## 1. Header behavior

- [x] 1.1 Add route regression tests for Classic and 2e header rules navigation, hidden detail-route icon, and removal of the body action; verify targeted tests fail for the expected behavior before implementation.
- [x] 1.2 Move the rules entry to the room layout header and remove the 2e body action; verify the targeted room route tests pass.
- [x] 1.3 Keep the room label, code, Copy control, and rules target usable in a narrow header with long localized labels; add focused component assertions and verify them with route tests.
- [x] 1.4 Document the room header and edition rules navigation in the frontend README and architecture/component docs; compare described paths against code.

## 2. Localization and device flow

- [x] 2.1 Add rules accessibility and room-label keys in every supported catalog; verify catalog parity and route accessibility assertions.
- [x] 2.2 Update the 2e Maestro flow and add Classic room rules navigation; run the scenario flows where a device is available and record any exact blocker.

## 3. Integration gate

- [x] 3.1 Run frontend lint, typecheck, coverage, required root mobile E2E gate, and OpenSpec validation/verification; review the diff, then open a PR and inspect its checks.
