# Design

## Context

The battle route computes player and monster totals from the editable `draft`; the comparison label currently appears inside the ScrollView while totals appear in separate side panels. `useRoomEdition` identifies Second Edition, and room character objects include role/class values.

## Approach

Place a compact summary footer as a sibling after the ScrollView inside the existing SafeAreaView. The footer uses the route's current totals and outcome, so draft edits update synchronously and refreshed character state feeds through existing query/WebSocket behavior. Keep the current inline comparison for contextual continuity. Use semantic translated labels and an accessible summary label, with stable test IDs. Reserve footer space structurally by letting the ScrollView flex within the safe area rather than overlaying it.

For ties, Classic remains monster-favored. Second Edition ties are player-favored only when a selected active participant has the Warrior role; removed participants do not count. Side colors indicate the winning side, while a tie with no Warrior uses the monster color.

## Risks

Long translations can widen the summary; use flexible, wrapping layout and emphasize numeric values without forcing a single line. Safe-area layout behavior must be checked at narrow mobile dimensions and on web.
