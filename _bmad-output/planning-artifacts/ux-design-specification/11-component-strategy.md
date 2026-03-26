# 11. Component Strategy

## 11.1 Design System Coverage

No third-party UI library — pure React Native StyleSheet throughout. `AppTheme` (extended per Step 6) is the sole design token source. All components use `StyleSheet.create` with `AppTheme` token references.

## 11.2 Existing Components (Update Required)

| Component | File | Changes |
|---|---|---|
| `RoomCharacterCard` | `components/munchkin/RoomCharacterCard.tsx` | Apply `textAccentSoft` to name, `accent` to stat values, wire `useRealtimeFlash`, make full card tappable |
| `CurrentCharacterFooter` | `components/munchkin/CurrentCharacterFooter.tsx` | Apply same token updates, align bg to `AppTheme.colors.elevated` |
| `VioletButton` | `components/VioletButton.tsx` | Replace hardcoded `#6E6BD4` with `AppTheme.colors.actionSecondary` |
| `[roomNumber].tsx` | `app/munchkin/[roomNumber].tsx` | Wire `RoomCodeHeader`, `ActiveBattleBanner`, Battle/Log screen navigation, unhide action buttons |

## 11.3 New Screens

**`app/munchkin/[roomNumber]/(battle)/index.tsx` — Battle Screen**
- Full Expo Router stack push from Room View
- Back button pops to Room View (standard stack behaviour)
- Battle state is room-level (server), safe to navigate away and return
- Entry points: Battle button (no active battle) or "View Battle" via `ActiveBattleBanner`

**`app/munchkin/[roomNumber]/log.tsx` — Log Screen**
- Full Expo Router stack push from Room View
- Renders scrollable list of `LogEntry` components
- Ordered newest-first
- Entry point: Log button on Room View

## 11.4 New Reusable Components

---

**`RoomCodeHeader`**
- **Purpose:** Sticky room identification + share affordance, always visible
- **Anatomy:** Room label (caption) · room code (displayLarge, accent) · Copy button (copy-to-clipboard via `expo-clipboard`)
- **Placement:** `ListHeaderComponent` of `RoomCharactersList` FlatList — stays pinned during scroll
- **States:** Default · Copied (button briefly shows "Copied ✓")
- **Tokens:** `elevated` bg, `accent` code text, `caption` label

---

**`QuickEditSheet`**
- **Purpose:** Fast level/power edit without opening the full modal — covers ~90% of in-game edits
- **Anatomy:** Handle · character name (heading2, textAccentSoft) · Level row (+/−, statNumberLarge, accent) · Power row (+/−, statNumberLarge, actionSecondary) · Save button (full-width, accent) · "Edit more…" link (caption, textMuted)
- **Trigger:** Tap anywhere on `RoomCharacterCard`
- **States:** Clean (no changes) · Dirty (changes pending, Save active) · Saving (brief loading state)
- **Dismiss:** Tap outside with no changes → dismiss; tap outside with changes → Discard prompt
- **Transition:** "Edit more…" → sheet dismisses first → `ChangeCharacterModal` opens (sequential, never simultaneous)
- **Haptics:** `Light` impact on every +/− tap (required)
- **Implementation note:** `Modal transparent={true}` + `Animated.spring` bottom sheet — pure React Native, no third-party sheet library

---

**`ActiveBattleBanner`**
- **Purpose:** Persistent awareness signal on Room View when a battle is active; navigation entry to Battle screen
- **Anatomy:** ⚔️ icon · "Battle in progress" label · "View Battle →" action text
- **Placement:** Between `RoomCodeHeader` and character list — always visible when battle active, absent otherwise
- **States:** Visible (battle active) · Hidden (no battle)
- **Persistence:** Survives in-session navigation — does not dismiss on tab switch or app background
- **Tokens:** `danger` background (`#922525`), `textPrimary` text

---

**`LogEntry`**
- **Purpose:** Single row in the Log screen representing one session event
- **Anatomy:** Small character avatar (24×24, character color bg) · character name (body, textAccentSoft) · field label (caption, textMuted) · `prev → new` value (body bold, accent) · timestamp (caption, textMuted, right-aligned)
- **Variants:** Stat change · Battle event (started / concluded / discarded) · Character created
- **States:** Default only — log entries are immutable
- **Example renders:**
  - `[T] Thrognar · Level · 7 → 8 · 3m ago`
  - `[Z] Zara Swift · Power · 4 → 9 · 12m ago`
  - `⚔️ Battle · Players Win · 8m ago`

---

**`ReconnectingBanner`**
- **Purpose:** Non-blocking indicator that realtime connection is restoring
- **Anatomy:** Spinner · "Reconnecting…" label · silent auto-dismiss on reconnect
- **Placement:** Top of screen, below status bar — overlays content, does not push layout
- **States:** Visible (reconnecting) · Timeout (shows "Connection lost · Retry" with tap action) · Hidden
- **Tokens:** `surfaceSubtle` bg, `textMuted` text — intentionally low-prominence

---

## 11.5 New Hook

**`useRealtimeFlash(color: string)`**
- **Purpose:** Animated border highlight on `RoomCharacterCard` when another player updates that character's stats
- **Behaviour:** Border interpolates from transparent → `color` → transparent over 300ms via `react-native-reanimated`
- **Trigger:** Called externally when a realtime update arrives for the character's ID
- **Returns:** `animatedBorderStyle` — applied directly to card's border style
- **Constraints:** Border only (not background) — avoids layout repaints and supports concurrent multi-card flashes without visual conflict

## 11.6 Implementation Roadmap

**Phase 1 — Core session loop (unblocks live use):**
1. `RoomCodeHeader` — room entry confidence
2. `QuickEditSheet` — the defining experience
3. `useRealtimeFlash` — realtime signal
4. Token updates to `RoomCharacterCard`, `CurrentCharacterFooter`, `VioletButton`

**Phase 2 — Battle and Log (completes PRD promise):**
5. `ActiveBattleBanner`
6. `battle/[roomNumber].tsx` — Battle screen
7. `log/[roomNumber].tsx` — Log screen
8. `LogEntry` component

**Phase 3 — Resilience:**
9. `ReconnectingBanner`
10. Warm resume room-not-found recovery path

---
