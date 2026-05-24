# 7. Defining Core Experience

## 7.1 Defining Experience

The defining experience of munch-helper is the **Room View → Character Modal → Save loop**:

> "Tap any character card → edit stats in a focused modal → save → room updates for everyone."

Every successful Munchkin session will involve this loop dozens of times. If this interaction is effortless, the whole product feels right. The Room View is a live awareness layer — a dashboard. The Character Modal is the action layer — a cockpit. The transition between them is the experience heartbeat of every session.

## 7.2 User Mental Model

Users come from two reference points:
- **Physical stat tracking** (pen, paper, tokens) — chaotic, error-prone, authoritative only if you're watching
- **Level Counter** — familiar +/− button controls, character-centric main screen

They expect: tap a thing, change a number, be done. They don't want to think about "did that save?" — but they do want an explicit confirmation before a stat is committed, because changes are intentional, not casual (once or twice per turn, not continuous).

The character name visible in the modal header is sufficient context — no ownership labelling needed. All characters are editable by all players, symmetrically.

## 7.3 Success Criteria

- Room View: full room state (all characters, levels, gear) legible in **≤ 2 seconds**
- Character modal: tap card → modal open in **< 300ms** (feels instant)
- Stat change + save: **3 taps or fewer** (tap card → tap +/− → tap Save)
- After save: modal closes, Room View updates, border flash fires on all devices
- New player can discover how to update their level within **30 seconds** of joining

## 7.4 Novel vs. Established Patterns

Combining established patterns innovatively:
- **Established**: bottom sheet / modal editor (familiar mobile pattern)
- **Established**: tap-to-open card interaction
- **Established**: explicit Save button for intentional edits
- **Novel twist**: realtime border flash signal on Room View cards (reuses existing character color + `surfaceWarm` border baseline instead of introducing a new UI token)
- **Novel twist**: full peer edit access with no permission gates — any player edits any character

No user education required. The patterns are immediately legible to any smartphone user.

## 7.5 Experience Mechanics

**1. Initiation**
User taps any character card on the Room View. No long-press, no edit button — tap is the universal entry.

**2. Interaction**
Character Modal slides up (bottom sheet). Header shows character name. Controls: +/− for Level, Power, and any other tracked stats. All controls use `Haptics.ImpactFeedbackStyle.Light` on every tap — tactile confirmation is required behavior.

**3. Feedback**
- Stat numbers update instantly on tap (optimistic local update)
- Haptic pulse on every +/−
- Save button becomes active once any change is made
- Tap outside with no changes → dismiss cleanly
- Tap outside with unsaved changes → sheet dismisses, brief Undo toast appears at bottom (1500ms). Tap "Undo" to restore sheet state with changes preserved. Toast auto-expires silently if ignored.

**4. Completion**
User taps Save → modal closes → Room View reflects updated stats → border color flash fires on the updated character card across all connected devices (700ms, character's own color against the `surfaceWarm` border baseline). Likely websocket echoes from the same client are suppressed to avoid duplicate confirmation flashes.

---
