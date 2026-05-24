# Design System Foundation

## Design System Choice

**Custom design system — consolidate and extend the existing `AppTheme`.**

The frontend already has an established custom design system built on React Native `StyleSheet` with a defined token set in `constants/theme.ts`. No third-party UI library is in use and none should be introduced. The correct path for this phase is:
1. **Consolidate first** — pull all hardcoded color values in existing components into `AppTheme` tokens before building new screens.
2. **Extend second** — build new screens (battle, log) entirely from `AppTheme` tokens with zero hardcoded hex values.

## Rationale for Selection

- The existing dark warm palette (`#3C3636` background, `#D4C26E` gold accent) already establishes a strong visual identity appropriate for a game companion — bold, warm, and legible in low light.
- Battle and Log buttons are already stubbed in the Room View (`opacity: 0`, marked TODO). New screens must feel native to the existing visual language.
- Introducing a third-party design system at this stage would require re-skinning existing screens — scope not warranted for a brownfield completion phase.
- All required primitives are already installed: `expo-haptics` for tactile stat feedback, `expo-clipboard` for room code sharing, `react-native-reanimated` for update animations.

## Implementation Approach

**Phase 1 — Consolidation (in scope, prerequisite):**

Migrate all hardcoded values in existing components into `AppTheme` tokens. Specifically:
- `VioletButton`: `#6E6BD4` → `AppTheme.colors.actionSecondary`
- `RoomCharacterCard`: `#A67560` → `AppTheme.colors.surfaceWarm`
- `[roomNumber].tsx` `logButton`: `#353535` → `AppTheme.colors.surfaceSubtle`
- Any remaining per-screen `COLORS` constants → corresponding `AppTheme` tokens

After consolidation, `AppTheme` is the single unambiguous reference for all new component work.

**Phase 2 — Extension (new screens):**

All new components (battle view, log view, stat controls, room code display) use `AppTheme` tokens exclusively. No hardcoded values in new code.

## Customization Strategy

**Tokens to add to `AppTheme.colors`:**

| Token | Value | Role |
|---|---|---|
| `actionSecondary` | `#6E6BD4` | Violet — secondary action buttons |
| `surfaceWarm` | `#8A6150` | Warm brown — card-style surfaces |
| `surfaceSubtle` | `#353535` | Dark grey — muted surface (log button) |

Token naming is **role-based, not component-specific** — `surfaceWarm` applies to any warm card surface, not only the character card. This prevents per-component token proliferation as new screens are added.

**New component patterns for new screens:**

- **Stat increment controls (+/−):** Large tap targets (min 44×44pt), `Haptics.ImpactFeedbackStyle.Light` on every tap via `expo-haptics` *(required behavior, not optional polish)*, immediate visual feedback, no save confirmation for non-destructive increments.
- **Room code display:** `AppTheme.colors.accent` (`#D4C26E`) for code text, copy-to-clipboard icon inline via `expo-clipboard`, always visible in Room View header.
- **Realtime update signal:** Border color interpolation on the updated character card using that character's own color value against the `surfaceWarm` baseline — `surfaceWarm` → character color → `surfaceWarm` over 700ms. Reduced motion skips interpolation and restores `surfaceWarm` after the same 700ms window. Border only (not background) to avoid layout repaints and support concurrent multi-card updates without visual conflict. Scale pulse (`1.0 → 1.03 → 1.0`) deferred to post-launch iteration.
- **Battle view sides:** `AppTheme.colors.danger` (`#922525`) for monster side, `AppTheme.colors.accent` (`#D4C26E`) for player side.
- **Destructive actions (Discard Battle):** `AppTheme.colors.danger` with explicit confirmation step before execution.

---
