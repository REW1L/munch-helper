# Tasks

## 1. Update the screen contract and coverage

- [x] 1.1 Update Second Edition battle route coverage to assert the guidance block is absent while battle editing remains usable and Classic presentation is unchanged; run the targeted route test and confirm it fails before implementation.
- [x] 1.2 Confirm Rules route coverage still asserts the Second Edition combat rules and notice; run the targeted Rules route test.

## 2. Remove redundant battle guidance

- [x] 2.1 Remove the guidance block from the battle route and any styles used only by it; run the targeted battle route test.
- [x] 2.2 Run frontend lint and typecheck, capture before/after Second Edition battle screenshots for the PR, and run `npm run test:e2e:mobile` from the repository root; record any environment-blocked checks precisely.
