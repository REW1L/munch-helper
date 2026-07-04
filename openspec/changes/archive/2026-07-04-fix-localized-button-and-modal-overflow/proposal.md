## Why

Shipping 10 launch languages exposed layout that was hand-tuned around fixed, short English strings. Two regressions now break core flows: the profile modal cannot scroll to reach every language on small screens (iPhone SE), and buttons across the app wrap longer localized labels (German, Ukrainian) onto a second line. Both are latent fragility that English masked — the fix hardens the UI so the next language can't silently re-break it.

## What Changes

- **Fix the profile modal scroll.** `ChangeUserModal` wraps its content in a `ScrollView`, but the `contentContainerStyle` sets `height: '100%'`, which pins scrollable content to the viewport height and disables scrolling. On short screens the bottom language chips are clipped and unreachable. Remove the fixed height so the content can exceed the viewport and scroll.
- **Introduce a shared shrink-to-fit button label.** A new `ButtonLabel` primitive centralizes the overflow policy for button text: `numberOfLines={1}` + `adjustsFontSizeToFit` + `minimumFontScale={0.75}`. Labels shrink to fit rather than wrapping to a second line; below the minimum scale they truncate rather than wrap.
- **Adopt `ButtonLabel` at every button render site**, including folding `VioletButton` onto it so both the shared and inline button styles share one policy.

## Capabilities

### New Capabilities
- `localized-ui-layout`: UI containers and controls must remain usable across all supported languages — overflow content stays reachable (scrollable), and button labels stay on a single line by shrinking to fit rather than wrapping.

### Modified Capabilities
<!-- None. The `localization` capability governs catalogs/detection/persistence; this change governs layout resilience and does not alter those requirements. -->

## Impact

- **Frontend UI code:**
  - `frontend/app/main/modal-change-user.tsx` — remove `height: '100%'` from the scroll content container.
  - New `frontend/components/ButtonLabel.tsx` (shrink-to-fit text primitive).
  - `frontend/components/VioletButton.tsx` — render label via `ButtonLabel`.
  - Inline button `Text` sites adopt `ButtonLabel`: `app/index.tsx`, `app/rooms.tsx`, `app/main/modal-change-user.tsx`, `app/main/modal-change-avatar.tsx`, `app/main/modal-room-create.tsx`, `app/main/modal-room-join.tsx`, `app/main/modal-shop.tsx`, `app/munchkin/modal-create-character.tsx`, `app/munchkin/modal-change-caracter.tsx`, `app/munchkin/[roomNumber]/index.tsx`, `app/munchkin/[roomNumber]/log.tsx`, `app/munchkin/[roomNumber]/(battle)/index.tsx`.
- **No API, backend, dependency, or i18n-catalog changes.** Behavior and accessibility labels are unchanged; only text rendering and one style value change.
- **Validation devices:** iPhone SE (min size / scroll + narrowest button width), iPhone 16 (iOS baseline), Pixel 6a (mid-range Android). Stress locales: German (`de`) and Ukrainian (`uk`).
