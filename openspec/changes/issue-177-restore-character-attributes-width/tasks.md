# Tasks

## 1. Restore content-driven attributes sizing

- [x] 1.1 Add a component regression test for intrinsic attributes-box sizing in Classic and Second Edition cards; confirm it fails against the fixed 88px style.
- [x] 1.2 Remove the fixed width and no-shrink override from the shared attributes box; verify the component regression test passes and Second Edition GP rendering remains covered.

## 2. Validate and prepare review evidence

- [x] 2.1 Run the frontend targeted test, lint, typecheck, and mobile E2E gate; make the delete-character flow scroll to its target reliably on Android while retaining the working swipe sequence for web.
- [x] 2.2 Capture before/after screenshots for Classic and Second Edition tiles at iPhone SE and iPhone 16 Pro sizes for the PR description.
