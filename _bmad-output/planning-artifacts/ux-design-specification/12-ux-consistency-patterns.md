# 12. UX Consistency Patterns

## 12.1 Button Hierarchy

**Rule:** Never more than one primary action visible at a time per layer (card, sheet, screen).

| Tier | Style | Token | Usage |
|---|---|---|---|
| Primary | Full-width, dark text | `accent` (#D4C26E) bg | One per layer — Save in QuickEditSheet, Start/Resolve in Battle screen |
| Secondary | Standard button, white text | `actionSecondary` (#6E6BD4) bg | VioletButton — "Change", "View Battle" in ActiveBattleBanner |
| Destructive | Standard button, white text | `danger` (#922525) bg | Discard changes, Forfeit battle |
| Ghost | No background, caption size | `textMuted` text | "Edit more…" in QuickEditSheet — available but not the recommended next step |
| Disabled | No background | `surfaceSubtle` bg + `textMuted` text | Saving state in QuickEditSheet; visually inert, not gold — prevents confusion with active accent |

## 12.2 Feedback Patterns

**Optimistic updates:** Stat value updates immediately in the UI on local tap (before server confirmation). `useRealtimeFlash` fires on server confirmation — the flash serves as visual acknowledgement. On server error: revert value quietly with a brief border flash in `danger` color. No toast for errors on stat changes.

**Haptic confirmation:** `Haptics.ImpactFeedbackStyle.Light` on every stat +/− tap. Fires immediately, before save — confirms the tap was registered. Required, not optional.

**Save confirmation:** No toast. The local optimistic update + realtime flash sequence is the confirmation signal.

**Clipboard copy:** Inline state change on RoomCodeHeader — "Copy" → "Copied ✓" for 1500ms, then resets. No toast.

**Reconnecting state:** `ReconnectingBanner` top-of-screen, low-prominence (`surfaceSubtle` bg, `textMuted` text). Auto-dismisses on reconnect. Escalates to "Connection lost · Retry" button after 8s timeout.

**Field error:** `danger` border tint on the errored field + short inline label below. Never a blocking modal for a field-level error.

## 12.3 Modal & Overlay Patterns

| Layer | Component | Presentation | Dismiss |
|---|---|---|---|
| Bottom sheet | `QuickEditSheet` | Slides up from bottom (~60% screen height) | Tap outside (undo toast if dirty), swipe down |
| Full modal | `ChangeCharacterModal` | Centered full-screen overlay | Explicit close button only |
| Screen | Battle / Log | Expo Router stack push | Back chevron (standard stack header) |
| Banner | `ActiveBattleBanner` | Inline strip in list header | Not dismissible — reflects live server state |

**Stacking rule:** `QuickEditSheet` and `ChangeCharacterModal` are never open simultaneously. Enforced via `isSheetOpen` state gate — modal open is blocked until sheet's `onDismiss` callback fires. Prevents race condition on slow devices.

**Dirty state dismiss:** No blocking confirmation prompt (disruptive in tabletop context). Instead: accidental dismiss triggers a brief **Undo toast (1500ms)** at bottom of screen. Tap "Undo" restores previous sheet state. Toast auto-expires silently if ignored.

## 12.4 Form Patterns

**Stepper inputs (+/−):**
- Tap target: **entire button container** minimum 44×44pt — not just the label text
- Haptic: `Light` impact on every tap
- Display: current value between the two buttons, bold, `accent` color
- Floor: 0 (value cannot go negative)
- Ceiling: No ceiling besides practical limits (e.g. level 20, power 50) — no hardcoded max, but UX should prevent wild values

**Picker inputs (class/race):**
- Scroll-type picker, always shows current value
- Full text labels — no icon-only

**Text inputs (character name):**
- `autoCapitalize="words"`, `autoCorrect={false}`

**Validation timing:** On Save tap, not on blur — mid-edit interruption is disruptive in a noisy environment.

## 12.5 Navigation Patterns

Currently single-stack. Battle and Log are accessed via push navigation from Room View — a descriptive constraint of the current scope, not a permanent architectural rule.

| Pattern | Component | Mechanism |
|---|---|---|
| Stack push | Battle screen, Log screen | Expo Router `router.push()` |
| Bottom sheet | QuickEditSheet | Local component state, not a route |
| Full modal overlay | ChangeCharacterModal | Existing Expo Router modal route |

## 12.6 Empty & Loading States

| State | Screen | Message | CTA |
|---|---|---|---|
| Empty character list | Room View | "No characters yet. Add yours to get started." | Primary button (host only) |
| Empty log | Log screen | "No events recorded yet." | None |
| Battle not started | Room View | No banner; Battle button label = "Battle" | — |
| Room loading | Room View | Full-screen spinner + "Loading room…" on `background` | Not interruptible |
| Room not found (warm resume) | — | Graceful fallback to Main Screen + toast | — |

---
