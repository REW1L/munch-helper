# 8. Visual Foundation

## 8.1 Color System

Built on the existing `AppTheme` (source of truth: `frontend/constants/theme.ts`). No new colors introduced beyond the extension tokens from Step 6, plus one addition from visual hierarchy discovery.

**Base palette:**

| Token | Value | Role |
|---|---|---|
| `background` | `#3C3636` | App background — dark warm |
| `surface` | `#473F3F` | Default card/surface |
| `elevated` | `#4C4545` | Raised surfaces (modals, sheets) |
| `accent` | `#D4C26E` | Gold — stat values + primary affordance |
| `danger` | `#922525` | Destructive actions, monster side |
| `textPrimary` | `#FFFFFF` | Primary text |
| `textMuted` | `#D9D9D9` | Secondary/caption text |

**Extension tokens (to add to `AppTheme.colors`):**

| Token | Value | Role |
|---|---|---|
| `actionSecondary` | `#6E6BD4` | Violet — secondary action buttons |
| `surfaceWarm` | `#8A6150` | Warm brown — character card surface |
| `surfaceSubtle` | `#353535` | Dark grey — muted surfaces |
| `textAccentSoft` | `#E8D89A` | Soft gold — character names on cards and modal header |

**`accent` usage rule:** `#D4C26E` is reserved for exactly two purposes — (1) numerical values the player cares most about (level, Power stat values), and (2) the primary actionable element on any given screen. Using `accent` outside these contexts dilutes its signal value.

`textAccentSoft` (`#E8D89A`) is the desaturated sibling — used for character names. Close enough to `accent` to read as family; muted enough that full-strength stat numbers dominate in vibrancy.

## 8.2 Typography System

System fonts only for this phase — SF Pro (iOS) and Roboto (Android), resolved automatically by React Native. Zero bundle size cost, native rendering quality.

**Type scale:**

| Role | Size | Weight | Color | Usage |
|---|---|---|---|---|
| `displayLarge` | 32pt | 700 | `accent` | Room code display |
| `heading1` | 22pt | 700 | `textPrimary` | Screen titles |
| `heading2` | 18pt | 600 | `textAccentSoft` | Character name in modal header |
| `statNumberLarge` | 28pt | 700 | `accent` | Level/Power values in modal |
| `statNumberCard` | 20pt | 700 | `accent` | Level/Power values on Room View cards |
| `cardName` | 15pt | 700 | `textAccentSoft` | Character name on Room View card |
| `body` | 15pt | 400 | `textPrimary` | General content |
| `caption` | 12pt | 400 | `textMuted` | Labels, secondary info |

**Card hierarchy principle:** Name (`cardName`) and stat values (`statNumberCard`) are visual equals — same approximate weight, both warm gold tones. Name uses `textAccentSoft`, stats use full `accent`. Partners, not headline and subhead.

## 8.3 Spacing & Layout Foundation

Existing spacing tokens retained, one addition:

| Token | Value |
|---|---|
| `xs` | 4pt |
| `sm` | 8pt |
| `md` | 12pt |
| `lg` | 16pt |
| `xl` | 24pt |
| `xxl` | 32pt *(new — modal horizontal padding)* |

**Room View layout — single-column stacked list:**
- `FlatList` in one-column mode (default `numColumns=1`)
- Full-width cards for clearer scan/read order and reliable tap targets on small screens
- Outer horizontal padding: `sm` (8pt) each side
- Vertical rhythm between cards: `sm` (8pt) to keep the list compact without crowding
- Card internal padding: `md` (12pt)
- Room code header: Screen title area, above character list — visible on all Room View states (empty, pre-game, in-game)

**Character Modal layout:**
- Bottom sheet, `elevated` background (`#4C4545`)
- `xxl` (32pt) horizontal padding
- `lg` (16pt) vertical rhythm between stat rows
- Stat row: `caption` label + `statNumberLarge` value + −/+ controls
- Minimum touch target: 44×44pt on all interactive elements
- Save button: full-width, `accent` background, pinned to bottom of sheet

**Density principle:** Compact but complete — maximum useful information per screen, no stat omitted from cards, and predictable vertical scan order over grid density.

## 8.4 Accessibility Considerations

- **Contrast**: `textPrimary` white on `background` `#3C3636` ≈ 9:1 — exceeds WCAG AA (4.5:1 required)
- **Soft gold contrast**: `textAccentSoft` `#E8D89A` on `surface` `#473F3F` ≈ 7:1 — passes AA
- **Touch targets**: all interactive controls minimum 44×44pt
- **Color independence**: stat labels (`caption`) always accompany values — no color-only encoding
- **Haptics**: `Light` impact on every +/− provides tactile confirmation layer
- **Realtime signals**: border flash is supplementary — Room View stat values are always the ground truth

---
