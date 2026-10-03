# Tasks

## 1. Add the Games tile rules entry

- [x] 1.1 Add `frontend/__tests__/app/rooms.test.tsx` coverage for a visible, accessible Rules action that navigates to `/munchkin/rules` without opening Create/Join UI, and run `cd frontend && npx vitest run __tests__/app/rooms.test.tsx -c vitest.room-route.config.ts` to confirm the new assertions fail for the missing behavior.
- [x] 1.2 Update `frontend/app/rooms.tsx` with the localized `ButtonLabel`-based Rules action and a small-screen-safe two-row action layout while preserving existing Create/Join IDs and behavior; rerun the Rooms route test and confirm it passes.

## 2. Build the copyright-safe rules view

- [x] 2.1 Add `frontend/__tests__/app/munchkin/rules.test.tsx` cases for the title, game description, all required topic headings, scroll container, summary notice, heading/link accessibility roles, exact official PDF URL, and rejected `Linking.openURL`; run the file with the room-route Vitest config and confirm it fails because the route is absent.
- [x] 2.2 Implement `frontend/app/munchkin/rules.tsx` as a themed static stack route with concise, newly authored English descriptions for objective/victory, setup, turn flow, characters/cards, combat, items/trading, help, running away/death, curses, and card-specific rule priority; run the targeted rules route test and confirm it passes.
- [x] 2.3 Compare every English section against the reviewed official six-page PDF for mechanical accuracy and original wording, confirm no rulebook images, extracted text, or extended examples were added to tracked files, and verify the summary identifies the official rulebook as authoritative.
- [x] 2.4 Update `frontend/README.md`, `docs/architecture-frontend.md`, and `docs/component-inventory-frontend.md` with the new route, content/source boundary, and component responsibility; verify every documented path and behavior against the implementation.

## 3. Localize and validate the full experience

- [x] 3.1 Extend the catalog test to require the `gameRules` namespace and its complete heading/body key set, then run `cd frontend && npx vitest run i18n/__tests__/catalogParity.test.ts` to confirm it fails before the catalogs are updated.
- [x] 3.2 Add the Rules action and complete rules-view translations to English and every supported locale, preserving exact key parity and non-empty values; rerun the catalog test and `cd frontend && npm run typecheck` to confirm both pass.
- [x] 3.3 Add route assertions for long localized labels/content and accessibility semantics at the smallest supported viewport, then rerun the Rooms and rules route tests to confirm all actions and content remain reachable and correctly announced.

## 4. Exercise cross-platform navigation and delivery gates

- [x] 4.1 Add a focused Maestro flow under `maestro/e2e/` that opens Rooms, activates `open-munchkin-rules`, verifies the rules screen, scrolls to the official-source control, and returns; run the flow against the local E2E stack or record the precise environment blocker. Local run blocked: Maestro reported zero connected devices for the one required shard.
- [x] 4.2 Run the frontend gates `cd frontend && npm run lint && npm run typecheck && npm run test:coverage`, run a production web export with a valid `EXPO_PUBLIC_API_URL`, and run the repository-required `npm run test:e2e:mobile`; fix change-caused failures and record any unavailable check exactly. Frontend checks and export passed. The full iOS suite passed; the final rules flow passed independently on iOS and Android. The aggregate Android rerun was blocked when Expo could not select the already-running `Maestro_ANDROID_pixel_6_android-33` AVD by name.
- [ ] 4.3 Validate the completed change with the OpenSpec verification workflow, review the final diff for scope/copyright/secrets/generated files, commit and push `codex/add-game-rules-view`, open the GitHub PR with red/green and verification evidence, then inspect and fix applicable PR checks until green or precisely diagnose an external blocker.
