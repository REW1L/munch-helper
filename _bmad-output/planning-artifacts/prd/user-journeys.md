# User Journeys

## Journey 1: Primary Player, Full Success Path

Marta is sitting down with friends to play Munchkin and wants the app to reduce table friction, not become another thing to manage. She opens Munch Helper, creates or joins a room, sees the room state load quickly, and gets a character into the session without confusion. During play, she updates her character, sees other players reflected in the room, starts a battle when needed, completes that battle, and later reviews what happened in the room log. The value moment is when the group can keep playing without arguing over current state or manually reconstructing what happened a few turns ago.

This journey reveals requirements for dependable room entry, clear character ownership and editing, battle lifecycle support, and readable room history.

## Journey 2: Primary Player, Recovery and Edge Case Path

Alex joins a live session after others have already started. He may reconnect, reopen the app, or arrive after room state has changed. He needs the room to reflect current character state, avoid duplicate or missing character records, and recover cleanly if a realtime update is delayed or a battle is already in progress. He should be able to understand what is happening, recover from temporary sync issues, and continue playing without breaking the room for others.

This journey reveals requirements for robust state restoration, duplicate prevention, reconnection behavior, and clear recovery when room or battle state is not pristine.

## Journey 3: Host / Session Organizer

Nina is the player informally coordinating the session. She creates the room, gets others connected, and expects the app to support the whole table from the start of the game through active play. She does not want to explain missing features or work around incomplete flows once the group is already using the product. Her success condition is that the app can be trusted as the shared session record for all players, especially once battles begin and the game state becomes more chaotic.

This journey reveals requirements for reliable room bootstrap, confidence in the "core loop is complete," and enough clarity that the host does not need to act as a manual fallback system.

## Journey 4: Support / Troubleshooting User

Ivan, acting as operator or maintainer of the product, needs to understand when the live session experience breaks down. If battles, logs, or realtime synchronization fail, he needs enough observable behavior and reproducible workflow boundaries to identify whether the problem is in room management, character updates, notifications, or client rendering. His success condition is that failures in core session flows can be diagnosed and fixed quickly without guessing across service boundaries.

This journey reveals requirements for stable flow definitions, actionable failure boundaries, and acceptance criteria that make regressions visible before release.

## Journey Requirements Summary

- Room entry must be dependable for both create and join flows.
- Character creation and editing must remain stable as the foundation for all later gameplay flows.
- Battle handling must support an end-to-end lifecycle that users can start, progress, conclude, revisit, and trust.
- Log visibility must help players reconstruct meaningful session events, not just expose raw system activity.
- Realtime synchronization and recovery behavior must support live play without duplicate, stale, or confusing room state.
- The product must be supportable as a brownfield system with clear boundaries between frontend, backend services, and realtime notifications.
