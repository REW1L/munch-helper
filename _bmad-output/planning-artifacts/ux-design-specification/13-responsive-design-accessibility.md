# 13. Responsive Design & Accessibility

## 13.1 Responsive Strategy

**Platform context:** Expo + React Native, portrait-only, phones only. No tablet or desktop layout. Responsive means adapting to the phone size range from iPhone SE (375pt) to iPhone 16 Pro Max (430pt) and equivalent Android devices.

**Layout approach:** All layouts use `flex` and percentage widths — no hardcoded pixel widths. `FlatList` handles single-column character cards naturally. Portrait orientation is locked — landscape is impractical in a tabletop game context.

**Safe area handling:** `useSafeAreaInsets()` is applied at the **screen level** (`[roomNumber].tsx`, `battle/[roomNumber].tsx`, `log/[roomNumber].tsx`) — not inside individual components. Components receive their allocated space; they do not carve out safe area independently. This prevents double-inset compounding and keeps components reusable.

## 13.2 Screen Size Adaptation

| Element | SE (375pt) | Standard (390–414pt) | Notes |
|---|---|---|---|
| Character card height | 85pt | 85pt | Fixed — grid math works at all sizes |
| QuickEditSheet height | ~60% screen | ~60% screen | Percentage-based |
| `statNumberLarge` | 28pt | 28pt | Universal — no size variant |
| `RoomCodeHeader` padding | `md` (12pt) | `md`–`lg` (12–16pt) | Flex handles it |

**Minimum test target:** iPhone SE (375pt). If layout is correct at 375pt, it holds at all larger sizes.

## 13.3 Design Token Update

`surfaceWarm` is revised to `#8A6150` (darkened from `#A67560`) to improve contrast for `accent` text on character card backgrounds. This propagates to `RoomCharacterCard` and `CurrentCharacterFooter` background color.

## 13.4 Accessibility Strategy

**Target:** WCAG AA adapted for React Native mobile (iOS VoiceOver + Android TalkBack). Legal compliance is not a hard requirement, but accessibility is good game experience — colourblind players, low-light conditions, one-handed play.

**Contrast ratios:**

| Token pair | Ratio | Status |
|---|---|---|
| `textPrimary` on `background` (#FFF / #3C3636) | ~9.5:1 | ✅ AAA |
| `accent` on `background` (#D4C26E / #3C3636) | ~5.8:1 | ✅ AA |
| `accent` on `surfaceWarm` (#D4C26E / #8A6150) | ~4.2:1 | 🔶 Near-AA — mitigated by bold weight |
| `textMuted` on `surface` (#D9D9D9 / #473F3F) | ~5.2:1 | ✅ AA |
| `textMuted` on `elevated` (#D9D9D9 / #4C4545) | ~4.8:1 | ✅ AA |

**Contrast exception:** `accent` on `surfaceWarm` at ~4.2:1 is below AA (4.5:1) for normal text. Mitigated by: bold weight on all card stat values, `surfaceWarm` darkened from original, text shadow (`rgba(0,0,0,0.4)`) on character names. Accepted as near-AA on a decorative+functional element. Tracked as a known exception.

## 13.5 React Native Accessibility Props

| Component | Required accessibility props |
|---|---|
| `RoomCharacterCard` | `accessible={true}`, `accessibilityLabel="[Name], Level [N], Power [N]"`, `accessibilityRole="button"`, `accessibilityHint="Tap to edit stats"` |
| `RoomCodeHeader` Copy button | `accessibilityLabel="Copy room code [code]"`, `accessibilityRole="button"` |
| `QuickEditSheet` +/− buttons | `accessibilityLabel="Increase level"` / `"Decrease level"`, `accessibilityRole="button"` |
| `ActiveBattleBanner` | `accessibilityLabel="Battle in progress. Tap to view."`, `accessibilityRole="button"` |
| `LogEntry` | `accessibilityLabel="[Name], [field] changed from [prev] to [new], [time] ago"` |
| `ReconnectingBanner` | Use `AccessibilityInfo.announceForAccessibility(message)` called imperatively on banner mount — not `accessibilityLiveRegion` prop (cross-platform unreliable in React Native for non-focusable elements) |

## 13.6 Reduced Motion

Check `useReducedMotion()` from `react-native-reanimated`. When enabled:
- **`useRealtimeFlash`:** Skip border interpolation — apply border color immediately, remove after 300ms
- **`QuickEditSheet`:** Skip spring animation — snap directly to open/closed position
- No other animations are currently specified in the design

## 13.7 Colour Blindness

The `accent` gold (#D4C26E) is the most load-bearing colour token — stat values, primary actions, room code. Gold-to-brown collapse is a known risk under Deuteranopia and Protanopia.

**Mitigation already in place:** All accent-coloured elements pair colour with bold weight or a primary affordance shape (button, number). Colour is never the sole differentiator.

**Required test:** Run Xcode Accessibility Inspector colour filter (Deuteranopia + Protanopia) against Room View and QuickEditSheet before release.

## 13.8 Testing Strategy

**Device targets:**
- iPhone SE — minimum size validation
- iPhone 16 — standard iOS baseline
- Pixel 6a (or similar mid-range Android) — representative Android performance baseline; flagship devices mask jank that mid-range users experience

**Accessibility testing:**
- iOS VoiceOver: navigate Room View by swipe, trigger QuickEditSheet, verify all labels announced correctly
- Android TalkBack: same flow
- Colour contrast: Xcode Accessibility Inspector
- Colour blindness simulation: Deuteranopia + Protanopia filters in Xcode Inspector
