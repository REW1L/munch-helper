# Desired Emotional Response

## Primary Emotional Goals

- **Confidence at entry** — Players feel immediately ready: "I'm in, I'm set up, I'm ready." Zero anxiety about whether the room join worked or the character exists.
- **Calm control during play** — The app quietly supports the session without demanding attention. Players feel aided, not managed. The app fades into the table.
- **Trust in the system** — Realtime updates and persistent state make players feel the app is reliable. They stop wondering "is this up to date?" and just play.

## Emotional Journey Mapping

| Moment | Desired feeling | Failure feeling to avoid |
|---|---|---|
| First launch / room entry | Confidence, readiness | Confusion, setup anxiety |
| Room View mid-session | Calm, ambient awareness | Overwhelm, information noise |
| Realtime stat update arrives | Quiet delight ("it just updated") | Surprise or distrust ("wait, did that change?") |
| Editing a character stat | Effortless control | Friction, fear of mistakes |
| During a battle | Excitement + clarity | Calculation anxiety, confusion about result |
| Something goes wrong (network, conflict) | Trust ("it handled it") | Frustration, mystery, silent failure |
| Warm resume mid-session | Continuity ("I'm right back") | Disorientation, reload anxiety |
| Cold start | Clean intentionality | Confusion about where to go |

## Micro-Emotions

- **Confidence over confusion** — Every screen state must be immediately legible. No orphan states, no "what do I do here?" moments.
- **Trust over skepticism** — Realtime updates should feel reliable enough that players stop verifying the app's state out loud.
- **Delight over mere satisfaction** — The first time a stat update silently appears from another player should feel like a small magic trick. Not a feature — a moment.
- **Belonging over isolation** — Character color and avatar make each player's presence felt, even when they're not the one currently editing.

## Design Implications

- **Confidence → Clear entry flow** — Room creation/join with immediate character presence. No intermediate "waiting" states without feedback.
- **Calm control → Low-density Room View** — Characters as scannable cards, not a data table. Level and power prominent; secondary stats secondary.
- **Trust → Visible update cues** — Brief, non-blocking flash when a character is updated by another player. Subtle but present.
- **Delight → Realtime feel** — Avoid polling artifacts. Updates should appear smoothly, not jerk in. Animation budget is small but purposeful.
- **Trust during errors → Honest error states** — Network issues shown clearly with recovery path. Never a blank screen or silent stale state.

## Emotional Design Principles

1. **Invisible reliability** — The app earns trust by never surprising players with unexpected states. Consistency is more emotional than polish.
2. **Delight through precision** — Small moments of delight (a stat update, a battle result snapping into place) are more powerful than decorative animations.
3. **Social warmth** — Color, avatar, and the "You" indicator make each player feel *present* in the room, not just represented as a data row.
4. **Calm is a design output** — The Room View's job is to lower cognitive load, not raise engagement. A calm player is a trusting player.
