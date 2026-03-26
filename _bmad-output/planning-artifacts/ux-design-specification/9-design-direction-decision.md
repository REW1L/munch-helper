# 9. Design Direction Decision

## 9.1 Directions Explored

Three directions evaluated against actual frontend code (`RoomCharacterCard`, `RoomCharactersList`, `ChangeCharacterModal`, `CurrentCharacterFooter`):

- **D1 — As-Is**: Current implementation baseline — surfaceWarm cards, white text, "Change" button per card, centered full-editor modal, room number in nav title only
- **D2 — Refined**: Same horizontal card structure, design tokens applied, sticky room code header, two-tier modal (bottom sheet for quick edits → full modal for advanced)
- **D3 — Compact Grid**: 2-column compact cards, no attributes box, tap-to-open bottom sheet only

## 9.2 Chosen Direction: D2 — Refined

The horizontal card layout is retained. The attributes box (race/class/gender) remains visible on every card — players need this information at a glance during gameplay (card interactions depend on race and class). Hiding it behind a tap would create real friction multiple times per session.

## 9.3 What Changes from Current

| Component | Current | Refined |
|---|---|---|
| `characterNickname` color | `#FFFFFF` (hardcoded) | `textAccentSoft` `#E8D89A` |
| `characterStats` color | `#FFFFFF` (hardcoded) | `accent` `#D4C26E` |
| Room code | Nav bar title only | Sticky header + copy-to-clipboard |
| Edit trigger | "Change" button only | Full card tap + "Change" button |
| Edit modal | Centered full editor (always) | Two-tier: bottom sheet (quick) → full modal (advanced) |
| `CurrentCharacterFooter` bg | `#544C4C` (hardcoded) | `AppTheme.colors.elevated` `#4C4545` |

## 9.4 Two-Tier Edit Pattern

**Quick path** (bottom sheet — used every turn):
Level +/− and Power +/− controls with Save button. Covers ~90% of in-game edits. Triggered by tapping anywhere on the character card.

**Full path** (centered modal — used rarely):
"Edit more…" link at the bottom of the sheet routes to the existing `ChangeCharacterModal` for name, class, race, gender, avatar, and color changes. These happen at most once per session.

This pattern maps directly to usage frequency — stats change every turn, attributes change rarely.

## 9.5 Design Rationale

Direction 2 is the minimum-viable visual improvement: no structural rebuild of existing components, focused token adoption, and a meaningful UX upgrade to the edit flow. The attributes box is load-bearing UX — it surfaces race and class that players need to resolve card interactions mid-game without opening a modal.

## 9.6 Implementation Approach

1. Update `RoomCharacterCard` — apply `textAccentSoft` to name, `accent` to stat values
2. Update `CurrentCharacterFooter` — align background to `AppTheme.colors.elevated`
3. Add room code sticky header to `[roomNumber].tsx` (above `RoomCharactersList`) with copy-to-clipboard via `expo-clipboard`
4. Create `QuickEditSheet` component — bottom sheet with level/power +/− controls, Save, and "Edit more…" link
5. Wire `onChangePress` to full card `onPress` in addition to the existing "Change" button
6. "Edit more…" in `QuickEditSheet` closes sheet and opens existing `ChangeCharacterModal`

---
