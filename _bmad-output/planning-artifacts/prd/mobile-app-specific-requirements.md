# Mobile App Specific Requirements

## Project-Type Overview

Munch Helper is a cross-platform companion product that must support iOS, Android, and web as active platforms in this phase. The product requirement for the next increment is that the core session experience is complete and usable across all three platforms, so battles, logs, room flows, and character flows are not delivered on one platform while remaining incomplete or degraded on another.

This phase remains focused on completion and stabilization of the existing product. Platform support in this PRD means users on iOS, Android, and web can complete the intended session loop with consistent outcomes and without platform-specific feature gaps in the core experience.

## Product Experience Constraints

- The product shall support iOS, Android, and web in the next phase.
- The product shall provide the core room, character, battle, and log experience across all supported platforms.
- The completed session loop shall be available across iOS, Android, and web without material platform-specific gaps.
- Remaining platform differences, if any, shall not prevent users from completing the core session workflow on any supported platform.

## Device Permissions

- The next phase shall not require new device-specific capabilities beyond standard local storage and network access.
- The product shall avoid introducing unnecessary device permission prompts that interrupt core session use or create inconsistent cross-platform behavior.

## Offline Mode

- Offline support remains out of scope for this increment.
- The product shall be defined for dependable connected use during active sessions.

## Push Strategy

- Push notifications remain out of scope for this increment.
- This phase shall prioritize in-session awareness and live room continuity over background re-engagement features.

## Store Readiness

- App store readiness is an explicit requirement for this phase.
- The product increment shall be complete enough, stable enough, and policy-safe enough to support release preparation for the relevant distribution channels.
- Core user flows shall not remain materially incomplete at the point of release preparation.

## Release Quality Considerations

- This increment shall be judged as a cross-platform product completion release, not as a platform-specific feature drop.
- The main product risk is shipping nominal support for battles and logs without a dependable, end-to-end experience across iOS, Android, and web.
