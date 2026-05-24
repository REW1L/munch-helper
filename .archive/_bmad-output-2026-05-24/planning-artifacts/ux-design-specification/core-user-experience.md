# Core User Experience

## Defining Experience

The core experience of Munch Helper is **ambient awareness** — every player, on their own device, has a complete and live picture of the room at all times without asking anyone. The product is not a scorekeeper operated by one person; it is a true peer model where every phone is a full first-class participant with complete read and write access.

The make-or-break moment is the **2-second room orientation**: a player picks up their phone mid-session and immediately understands everything — who has what level, who is in a battle, what changed. If they have to ask out loud, the app has failed.

The most critical interaction to get right is not any single tap — it is the Room View read. Stat editing is frequent; room reading is constant.

## Platform Strategy

- **Primary platforms:** iOS and Android (Expo/React Native), touch-first
- **Web:** Secondary export target; not a design priority
- **Key platform constraint:** Multi-screen simultaneity — 2 to 6 phones held simultaneously in close physical proximity. Every screen is someone's primary screen. Design decisions on font size, contrast, information density, color coding, and update visibility must account for legibility across all devices at once, including in poor lighting conditions.
- **No offline mode** — out of scope; realtime sync is a hard dependency, not an enhancement.
- **WebSocket is the product** — realtime synchronization is what makes the experience work. Without it, six independent editors create chaos instead of clarity.

## Effortless Interactions

- **Room state consumption** — reading the room should require zero cognitive effort. The Room View must be so well organized that players absorb information passively without consciously using the app.
- **Character identification** — color + avatar creates a visual namespace per player. Any player should be able to locate any character on any phone instantly.
- **Warm resume** — switching back to the app mid-session returns players to exactly where they were, with live state already loaded.
- **Realtime updates** — stat changes propagate silently across all devices. Players should never need to refresh or ask someone to update their phone.
- **Auto character creation** — joining a room creates your character automatically. No setup step before you can participate.

## Critical Success Moments

1. **The 2-second orientation** — Player picks up phone mid-session and immediately understands full room state. This is the primary success metric for the Room View.
2. **First room entry** — From cold launch to sitting in a room with a character feels instant, not like a setup flow. This is the first impression of the product.
3. **Stat update propagation** — Player A changes their level; Player B sees it on their phone without touching anything. This is the moment the product earns trust.
4. **Battle conclusion** — Battle is concluded by any player; result is immediately visible and resolved on all screens. The conclude action becomes visually unavailable, preventing double-taps. This is the climax payoff of the battle flow.

## Experience Principles

1. **Ambient over active** — The best interactions are ones users don't notice. Design the Room View to be absorbed, not operated.
2. **Peer parity** — Every player has the same access, the same view, and the same agency. No coordinator, no passive observers.
3. **Live by default** — State is always current. Loading states and stale data are failures, not acceptable UX states.
4. **Speed at the table** — Players are mid-game, mid-conversation, mid-chaos. Every flow must complete in the fewest possible taps with no hesitation moments.
5. **Legible across six screens** — Every design decision must hold up on a phone held across a table in a dimly lit room, not just in a design tool at 100% zoom.
