## 1. Modal scroll fix

- [x] 1.1 In `frontend/app/main/modal-change-user.tsx`, remove `height: '100%'` from the `contentContainer` style so the `ScrollView` content can exceed the viewport and scroll (replaced with `flexGrow: 1` so the warm panel still fills the viewport when content is short)
- [x] 1.2 Verify the `ScrollView` `style` keeps `flex: 1` and the container keeps `maxHeight: '80%'` so the button row stays pinned below the scroll area

## 2. Shared shrink-to-fit button label

- [x] 2.1 Create `frontend/components/ButtonLabel.tsx`: a `Text` wrapper applying `numberOfLines={1}`, `adjustsFontSizeToFit`, and `minimumFontScale={0.75}`, forwarding `style`, `children`, `testID`, and other text props
- [x] 2.2 Add a unit test for `ButtonLabel` asserting the three overflow props are set and that `style`/`children`/`testID` pass through
- [x] 2.3 Refactor `frontend/components/VioletButton.tsx` to render its `title` via `ButtonLabel` (preserve existing `violetButtonText` style)

## 3. Adopt ButtonLabel at inline button sites

- [x] 3.1 `app/index.tsx` — privacy, support, and rooms button labels
- [x] 3.2 `app/main/modal-change-user.tsx` — Change Avatar, Save, Cancel labels
- [x] 3.3 `app/main/modal-change-avatar.tsx` — Select Avatar, Cancel labels
- [x] 3.4 `app/main/modal-room-create.tsx` — Yes, No labels
- [x] 3.5 `app/main/modal-room-join.tsx` — Join, Cancel labels
- [x] 3.6 `app/main/modal-shop.tsx` — Quit-shop label (the `buy` buttons already use `VioletButton`)
- [x] 3.7 `app/munchkin/modal-create-character.tsx` — Create, Cancel labels
- [x] 3.8 `app/munchkin/modal-change-caracter.tsx` — Delete Character, Save, Cancel labels
- [x] 3.9 `app/munchkin/[roomNumber]/index.tsx` — Battle, Log, connection-lost retry labels
- [x] 3.10 `app/munchkin/[roomNumber]/log.tsx` — both Retry labels
- [x] 3.11 `app/munchkin/[roomNumber]/(battle)/index.tsx` — Save-battle label (Player/Monster side already use `VioletButton`)
- [x] 3.12 Grep for remaining button `Text` render sites (`*ButtonText`, modal `buttonText`) to confirm none were missed
- [x] 3.13 Additional word-button sites found by the sweep and converted: `app/rooms.tsx` (Create/Join; Change already `VioletButton`), `components/ConfirmDialog.tsx` (web confirm/cancel), `components/munchkin/BattleConcludeAction.tsx` (Conclude), `components/munchkin/BattleDiscardAction.tsx` (Discard), `components/munchkin/QuickEditSheet.tsx` (Edit more…, Save), `components/munchkin/BattleSidePanel.tsx` (Add monster, Save, Cancel — still literal English), `components/munchkin/RoomHeaderTitle.tsx` (copy label). Single-glyph +/−/- stepper buttons intentionally left as-is (glyphs cannot wrap; shrink policy targets text labels)
- [x] 3.14 Found during device validation: the Rooms Create/Join buttons (`app/rooms.tsx` `gameActions`/`actionButton`) had no bounded width, so `ButtonLabel`'s `adjustsFontSizeToFit` was a no-op and long localized labels (uk "Приєднатися") overflowed off-screen instead of shrinking. Fixed by giving `gameActions` `flex: 1` and swapping `actionButton`'s `minWidth: 80` for `flex: 1` + `minWidth: 0` so the two buttons share the row and the labels shrink to fit.

## 4. Verification

- [x] 4.1 Run `tsc`, lint, and the frontend test suite; update any tests that assert on button `Text` structure — tsc clean, lint clean (one pre-existing unrelated warning), 325 tests pass (244 unit + 81 room-route)
- [x] 4.2 iPhone SE (3rd gen) simulator, `uk`: profile modal scrolls to reveal all 10 languages incl. "Українська" and reaches Save/Cancel (pinned button bar). Verified via maestro flow + screenshots. This reproduces and fixes the original bug-report scenario.
- [x] 4.3 iPhone SE `uk` and iPhone 16 Pro `de`/`uk`: no button label wraps — "Зберегти"/"Скасувати", "Speichern"/"Abbrechen", "Change Avatar"/"Змінити аватар" all single-line; every language chip single-line. Verified via maestro + screenshots.
- [x] 4.4 Baseline confirmed: iPhone 16 Pro (`de`/`uk`) and Pixel 6 emulator (`en`/`uk`, ≈Pixel 6a) — short labels render full-size, no clipping. Android `adjustsFontSizeToFit` verified working: uk "Приєднатися" (11 chars) shrinks to fit its bounded Rooms button rather than clipping (resolves the design's Android font-shrink risk). No label hit the 0.75 truncation floor in these flows; `landing.joinBeta` not exercised (web-only screen).
