# Executive Summary

## Project Vision

Munch Helper is a lightweight shared-state companion for live Munchkin sessions. Its value is not replacing the physical game — it's removing the bookkeeping, visibility, and coordination friction that slows a real table down. The current phase is completion: making the existing room, character, battle, and log loop dependable enough to recommend for a real session.

## Target Users

Small groups (2–6 players) playing Munchkin in person, using iOS or Android phones as a secondary tool while engaging with physical cards and each other. Users are casually tech-savvy and interact with the app frequently but briefly, in a social and often noisy setting. The physical game is primary; the app is a support layer.

## Core Flow

1. **Identity** — User profile created anonymously or named, persisted locally and reconciled with the backend on startup.
2. **Room entry** — Create a room (generates a friendly code) or join via code. A default character is automatically created for the joining user.
3. **Character management** — Any player can create, update, or modify any character in the room. Each player sees which character is associated with them via a visual indicator ("You" label or equivalent). Editing is open and intentional — no permission gates.
4. **Battle** — Any player can start, manage, or conclude a battle. No battle owner. One active battle at a time per room. Discard requires confirmation.
5. **Logs** — Character creation/update events and battle summaries are available in a log view, with the ability to drill into finished battles.
6. **Session continuity** — Cold start (app fully closed) opens the Main screen. Warm resume (app backgrounded or tab switched) returns directly to the Room screen.

## Key Design Challenges

1. **Frictionless room entry** — Cold launch to seated-in-a-room must feel instant. Create/join plus auto character creation cannot feel like a setup wizard.
2. **Speed over depth during play** — Every interaction must be fast and purposeful. Players are mid-game, handling cards, and talking simultaneously.
3. **Battle complexity on a small screen** — Two sides, modifiers, multiple characters, live result. The hardest design problem in the product.
4. **Shared state coherence** — Realtime WebSocket updates must surface clearly without interrupting a player mid-action. Conflict legibility (not prevention) is the goal — last write wins, but the saved state must be visually obvious.
5. **Session continuity vs. bootstrap re-entry** — Warm resume must skip the default character creation bootstrap. Two entry paths (initial join, warm resume) must converge on the same room state.
6. **Concurrent character editing** — Multiple players can edit any character simultaneously. No permission UI needed; brief update cues (e.g. a "updated" flash) make the outcome legible.

## Design Opportunities

1. **The "war room" moment** — The Room View is a shared live scoreboard. Designing it as a glanceable panel rather than a scrollable list creates immediate session value.
2. **"Yours is highlighted, others are editable"** — The ownership indicator is purely visual and informational, never a gate. This creates a friendly shared-accountability feel consistent with the Munchkin spirit.
3. **Battle as a shared climax** — The Battle View is the peak moment of every turn. Real-time updates across both sides, with a clear result state, can be a standout experience.
4. **Character card as identity** — Name, avatar, color, and level make each player's character visually distinct. Expressive character cards add personality to a functional tool.
5. **Log as session memory** — Low effort to design, high value to players. Leaning into a narrative feel (level-ups, battle outcomes) gives the log view emotional resonance.
