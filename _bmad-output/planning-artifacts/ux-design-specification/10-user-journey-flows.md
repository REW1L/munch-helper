# 10. User Journey Flows

## 10.1 Journey 1 — Session Start

**Who:** Any player (Marta, Nina, Alex on first open)

```mermaid
flowchart TD
    A([App Launch]) --> B{Warm resume?}
    B -->|Yes — room in memory| C{Room still exists?}
    C -->|Yes| RV[Room View]
    C -->|No — room not found| D[Main Screen\nToast: Previous room no longer available]
    B -->|No — cold start| D
    D --> E{Has room code?}
    E -->|No| F[Create Room]
    E -->|Yes — deep link or paste| G[Join Room]
    F --> H[Room created · Code generated]
    G --> H2[Room joined]
    H --> I{Character exists\nin this room?}
    H2 --> I
    I -->|Yes| RV
    I -->|No| J[Create Character Modal]
    J --> K[Character created]
    K --> RV[Room View — ambient awareness]
```

---

## 10.2 Journey 2 — Mid-Session Join / Resume

**Who:** Alex — joins late or reconnects after interruption

```mermaid
flowchart TD
    A([App Launch]) --> B{Room state\nin memory?}
    B -->|Yes — warm resume| C{Room still exists?}
    C -->|Yes| RC{Realtime connected?}
    C -->|No| MS[Main Screen\nToast: Previous room no longer available]
    B -->|No — cold start| MS
    MS --> E[Enter room code or tap deep link]
    E --> F[Join Room]
    F --> G{Battle in progress?}
    G -->|Yes| H[Room View\nBattle banner visible]
    G -->|No| I[Room View — normal]
    RC -->|Yes| RV[Room View — live]
    RC -->|No — reconnecting| L[Reconnecting indicator\nSilent retry]
    L --> M{Reconnected?}
    M -->|Yes| RV
    M -->|No — timeout| N[Error state · Retry button]
    H --> RV
    I --> RV
```

---

## 10.3 Journey 3 — Room View Loop (Defining Experience)

**Who:** Every player, every turn

```mermaid
flowchart TD
    A[Room View\nAmbient awareness] --> B[Scan cards\n≤2 second orientation]
    B --> C{Edit needed?}
    C -->|No| A
    C -->|Yes| D[Tap character card]
    D --> E[QuickEditSheet opens\nlevel + power controls]
    E --> F{Changes made?}
    F -->|No — tap outside| G[Dismiss cleanly]
    G --> A
    F -->|Yes — tap outside| H[Discard prompt]
    H -->|Discard| A
    H -->|Keep editing| E
    F -->|Save tapped| I[Save]
    I --> J[Sheet closes]
    J --> K[Room View updates]
    K --> L[Log entry created\npreviousValue → newValue per field]
    L --> M[Border flash on all devices\n300ms · character color]
    M --> A
    E --> N[Edit more… tapped]
    N --> O[Sheet dismisses first]
    O --> P[ChangeCharacterModal opens\nname · class · race · color · avatar]
    P -->|Save| I
    P -->|Cancel| A
```

---

## 10.4 Journey 4 — Battle Lifecycle

**Who:** Any player initiates; battle belongs to the room — any connected player can manage it

```mermaid
flowchart TD
    A[Room View] --> B{Battle active?}
    B -->|Yes| VB[View Battle\nButton label: View Battle]
    B -->|No| TB[Tap Battle]
    TB --> C[Battle View\nEmpty sides]
    C --> D[Add players to player side]
    D --> E[Add monster + level]
    E --> F{Battle ready?}
    F -->|Still configuring| D
    F -->|Yes| G[Battle active\nAll devices: banner visible\nBattle button → View Battle]
    VB --> G
    G --> H{Outcome?}
    H -->|Players win| I[Conclude — Players Win]
    H -->|Monster wins| J[Conclude — Monster Wins]
    H -->|Abandon| K[Discard Battle]
    I --> L[Battle resolved\nLog entry created]
    J --> L
    K --> M{Confirm discard?}
    M -->|Yes| N[Battle discarded\nLog entry created]
    M -->|No| G
    L --> O[Room View\nBattle banner dismissed]
    N --> O
```

---

## 10.5 Log Entry Format

All log entries record both sides of every change:

```
{ field, previousValue, newValue, characterId, characterName, timestamp }
```

**Rendered as:** `Thrognar: Level 7 → 8` · `Zara: Power 4 → 9` · `"Bork" → "Bork the Mighty"`

Applies to:
- Stat saves from QuickEditSheet (level, power)
- Full modal saves (name, class, race, gender, color, avatar)
- Battle events (started, concluded — players win / monster wins, discarded)

---

## 10.6 Journey Patterns

| Pattern | Rule |
|---|---|
| **Entry** | Cold start → Main Screen; warm resume → Room View (with room-exists check) |
| **Edit** | Tap card → quick sheet → save → log entry + border flash |
| **Modal transition** | Sheet dismisses *before* full modal opens — sequential, not simultaneous |
| **Destructive** | Confirm before discard (battle only); stat edits are non-destructive |
| **Recovery** | Silent reconnect retry → visible indicator only on timeout → retry button |
| **Battle ownership** | Battle belongs to the room — any connected player manages regardless of initiator |

## 10.7 Flow Optimization Principles

- **Minimum taps to value:** stat change in 3 taps (tap card → tap +/− → Save)
- **Log is automatic:** players never manually record — every save writes a log entry
- **No blocking states:** reconnect retries silently; battle in progress doesn't block room entry
- **Discard is gated:** confirmation only on destructive actions (battle discard)
- **Realtime is supplementary:** Room View always shows ground truth; flash is additive signal
- **Battle is stateless for players:** anyone picks up where anyone left off

---
