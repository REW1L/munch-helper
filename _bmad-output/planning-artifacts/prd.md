---
inputDocuments:
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture-frontend.md
  - docs/architecture-backend.md
  - docs/integration-architecture.md
  - _bmad-output/project-context.md
  - docs/descriptions/MunchHelper.md
  - docs/descriptions/MunchHelper/Frontend.md
  - docs/descriptions/MunchHelper/Backend Services.md
  - docs/descriptions/MunchHelper/Infrastructure/Infrastructure.md
  - docs/descriptions/MunchHelper/Frontend/Main View.md
  - docs/descriptions/MunchHelper/Frontend/Room View.md
  - docs/descriptions/MunchHelper/Frontend/Battle View.md
  - docs/descriptions/MunchHelper/Frontend/Log View.md
  - docs/descriptions/MunchHelper/Frontend/Create Character View.md
  - docs/descriptions/MunchHelper/Frontend/Change Character View.md
  - docs/descriptions/MunchHelper/Backend Services/User Management.md
  - docs/descriptions/MunchHelper/Backend Services/Room Management.md
  - docs/descriptions/MunchHelper/Backend Services/Character Management.md
  - docs/descriptions/MunchHelper/Backend Services/Room Notifications.md
workflowType: 'prd'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 19
classification:
  projectType: mobile_app
  domain: general
  complexity: low
  projectContext: brownfield
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
date: '2026-03-19T23:18:39Z'
---

# Product Requirements Document - munch-helper

**Author:** Ivan
**Date:** 2026-03-19T23:18:39Z

## Executive Summary

Munch Helper is an existing brownfield mobile-first companion product for Munchkin game sessions. The current system already supports user identity, room creation and joining, character management, and near-real-time synchronization of character changes across players in the same room. The next phase is not a repositioning or scope expansion effort. It is a product-completion and stabilization phase focused on closing the gap between the documented intended experience and the functionality that is currently implemented.

The product exists to reduce the friction of running an in-person Munchkin session. Its value is in giving players shared visibility into room state, character progression, and gameplay changes without replacing the physical game itself. The primary problem now is that core parts of the intended experience, especially battles and logs, are documented as part of the product but are not yet fully implemented as dependable end-user capabilities. As a result, the current product delivers only part of the promised gameplay support loop.

This PRD defines the next increment as a brownfield completion phase for the existing product. The goal is to make Munch Helper feel complete, coherent, and reliable as a Munchkin companion by finishing missing core features, reducing workflow gaps, and improving confidence in the existing room-based multiplayer experience. Success in this phase means users can create or join a room, manage characters, run battles, review logs, and rely on the product throughout a real session with fewer missing flows and fewer breakdowns.

### What Makes This Special

Munch Helper is differentiated by its role as a lightweight shared state layer for live tabletop play. It is not a digital board game and not a generic notes tool. Its value comes from making chaotic, social, in-person sessions easier to manage while staying aligned with the existing play experience. The product is strongest when it quietly removes bookkeeping, visibility, and coordination problems for a whole table.

The core insight is that the highest-value next step is not adding broader scope. It is making the current promise real. Completing battles and logs, and stabilizing the room-and-character loop around them, creates a more meaningful product improvement than expanding into adjacent features before the core session workflow is dependable.

## Project Classification

- Project Type: Mobile app
- Domain: General consumer gaming companion
- Complexity: Low domain complexity
- Project Context: Brownfield existing system

## Success Criteria

### User Success

- Players can complete the intended core session flow in one room: create or join room, manage characters, run a battle, conclude it, and review logs.
- Players can understand current room state without needing off-app clarification for basic character and battle status.
- Realtime room updates are dependable enough that players trust the app during a live session.

### Business Success

- The product reaches a "complete enough to recommend" state for the current Munchkin use case before any scope expansion.
- Early users rate the experience as reliably useful for live play, not just partially functional.
- Operational cost remains within the existing startup constraint.

### Technical Success

- Missing core documented capabilities for battles and logs are delivered within existing service boundaries.
- Existing room, character, and realtime flows remain stable after the new increment.
- Automated test coverage remains at or above the documented baseline, with regression coverage for the newly completed core flows.

### Measurable Outcomes

- `100%` of the documented core room flow is available to end users: room, character, battle, and log flows.
- `70%+` automated test coverage remains in place across touched surfaces.
- Critical production issues for these core flows are resolved within `2 weeks`.
- Early operating cost remains under `$150/month`.
- Post-release user feedback reaches at least `4.0/5` once enough ratings exist to make that metric meaningful.

## Product Scope

### MVP - Minimum Viable Product

- Complete battles and logs as first-class user capabilities.
- Close workflow gaps in room and character flows that prevent dependable live-session use.
- Stabilize realtime synchronization around the completed session loop.

### Growth Features (Post-MVP)

- Retention, monetization, profile progression, points, and purchase-related features.
- Broader UX polish beyond the critical live-session flow.
- Expanded support beyond the current Munchkin-focused product promise.

### Vision (Future)

- A highly dependable tabletop companion that can support richer session history, stronger social play support, and possibly broader game coverage after the core experience is complete.

## User Journeys

### Journey 1: Primary Player, Full Success Path

Marta is sitting down with friends to play Munchkin and wants the app to reduce table friction, not become another thing to manage. She opens Munch Helper, creates or joins a room, sees the room state load quickly, and gets a character into the session without confusion. During play, she updates her character, sees other players reflected in the room, starts a battle when needed, completes that battle, and later reviews what happened in the room log. The value moment is when the group can keep playing without arguing over current state or manually reconstructing what happened a few turns ago.

This journey reveals requirements for dependable room entry, clear character ownership and editing, battle lifecycle support, and readable room history.

### Journey 2: Primary Player, Recovery and Edge Case Path

Alex joins a live session after others have already started. He may reconnect, reopen the app, or arrive after room state has changed. He needs the room to reflect current character state, avoid duplicate or missing character records, and recover cleanly if a realtime update is delayed or a battle is already in progress. He should be able to understand what is happening, recover from temporary sync issues, and continue playing without breaking the room for others.

This journey reveals requirements for robust state restoration, duplicate prevention, reconnection behavior, and clear recovery when room or battle state is not pristine.

### Journey 3: Host / Session Organizer

Nina is the player informally coordinating the session. She creates the room, gets others connected, and expects the app to support the whole table from the start of the game through active play. She does not want to explain missing features or work around incomplete flows once the group is already using the product. Her success condition is that the app can be trusted as the shared session record for all players, especially once battles begin and the game state becomes more chaotic.

This journey reveals requirements for reliable room bootstrap, confidence in the "core loop is complete," and enough clarity that the host does not need to act as a manual fallback system.

### Journey 4: Support / Troubleshooting User

Ivan, acting as operator or maintainer of the product, needs to understand when the live session experience breaks down. If battles, logs, or realtime synchronization fail, he needs enough observable behavior and reproducible workflow boundaries to identify whether the problem is in room management, character updates, notifications, or client rendering. His success condition is that failures in core session flows can be diagnosed and fixed quickly without guessing across service boundaries.

This journey reveals requirements for stable flow definitions, actionable failure boundaries, and acceptance criteria that make regressions visible before release.

### Journey Requirements Summary

- Room entry must be dependable for both create and join flows.
- Character creation and editing must remain stable as the foundation for all later gameplay flows.
- Battle handling must support an end-to-end lifecycle that users can start, progress, conclude, revisit, and trust.
- Log visibility must help players reconstruct meaningful session events, not just expose raw system activity.
- Realtime synchronization and recovery behavior must support live play without duplicate, stale, or confusing room state.
- The product must be supportable as a brownfield system with clear boundaries between frontend, backend services, and realtime notifications.

## Mobile App Specific Requirements

### Project-Type Overview

Munch Helper is a cross-platform companion product that must support iOS, Android, and web as active platforms in this phase. The product requirement for the next increment is that the core session experience is complete and usable across all three platforms, so battles, logs, room flows, and character flows are not delivered on one platform while remaining incomplete or degraded on another.

This phase remains focused on completion and stabilization of the existing product. Platform support in this PRD means users on iOS, Android, and web can complete the intended session loop with consistent outcomes and without platform-specific feature gaps in the core experience.

### Product Experience Constraints

- The product shall support iOS, Android, and web in the next phase.
- The product shall provide the core room, character, battle, and log experience across all supported platforms.
- The completed session loop shall be available across iOS, Android, and web without material platform-specific gaps.
- Remaining platform differences, if any, shall not prevent users from completing the core session workflow on any supported platform.

### Device Permissions

- The next phase shall not require new device-specific capabilities beyond standard local storage and network access.
- The product shall avoid introducing unnecessary device permission prompts that interrupt core session use or create inconsistent cross-platform behavior.

### Offline Mode

- Offline support remains out of scope for this increment.
- The product shall be defined for dependable connected use during active sessions.

### Push Strategy

- Push notifications remain out of scope for this increment.
- This phase shall prioritize in-session awareness and live room continuity over background re-engagement features.

### Store Readiness

- App store readiness is an explicit requirement for this phase.
- The product increment shall be complete enough, stable enough, and policy-safe enough to support release preparation for the relevant distribution channels.
- Core user flows shall not remain materially incomplete at the point of release preparation.

### Release Quality Considerations

- This increment shall be judged as a cross-platform product completion release, not as a platform-specific feature drop.
- The main product risk is shipping nominal support for battles and logs without a dependable, end-to-end experience across iOS, Android, and web.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Completion-and-stabilization MVP for an existing product.  
**Delivery Needs:** Product, design, engineering, QA, and release-validation coverage sufficient to complete and verify the cross-platform core session experience.

The MVP for this phase is the smallest release that makes the current product promise true. It is not the smallest imaginable feature set and not a partial feature drop. It is the smallest coherent version of Munch Helper that users can rely on during a real session across iOS, Android, and web.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Primary player full success path
- Primary player recovery and re-entry path
- Host/session organizer trust path
- Support and troubleshooting path for core flow failures

**Must-Have Capabilities:**
- Dependable room create and join flows
- Stable character creation, editing, and room visibility
- End-to-end battle lifecycle support as a first-class user capability
- End-to-end room log visibility that helps users understand prior session events
- Realtime synchronization that keeps core room state dependable during live play
- Cross-platform support for the core session loop on iOS, Android, and web

**MVP Release Gates:**
- The core session loop is complete enough to support real-session use
- Cross-platform behavior is materially consistent for core flows
- Product quality is sufficient for app store release preparation
- No core user flow remains materially incomplete at release time

### Post-MVP Features

**Phase 2 (Post-MVP):**
- UX polish beyond critical session completion
- Enhanced session history and richer secondary gameplay support
- Improvements that deepen engagement after the core loop is stable
- Non-blocking quality-of-life enhancements

**Phase 3 (Expansion):**
- Retention and progression systems
- Monetization and points-related capabilities
- Broader product breadth beyond the current Munchkin-focused companion promise
- Additional game or use-case expansion

### Risk Mitigation Strategy

**Technical Risks:**  
The main technical risk is incomplete or inconsistent battles/logs behavior across frontend, backend, and realtime boundaries. Mitigation is to keep scope centered on the existing service boundaries and evaluate success through end-to-end user flows rather than isolated feature delivery.

**Market Risks:**  
The main market risk is that users still perceive the app as incomplete even after the increment. Mitigation is to define MVP success around session usefulness and trust, not around raw feature count.

**Resource Risks:**  
The main resource risk is spreading effort across too many secondary improvements before the core loop is dependable. Mitigation is to defer monetization, progression, broader expansion, and non-critical enhancements until the current product promise is complete.

## Functional Requirements

### User Identity & Session Entry

- FR1: New users can enter the product without prior account setup.
- FR2: Users can establish and retain a usable player identity for future sessions.
- FR3: Users can update their visible player profile information.
- FR4: Users can enter the app and begin a game session from any supported platform.
- FR5: Users can create a new room for a supported game session.
- FR6: Users can join an existing room using room-specific entry information.
- FR7: Users can re-enter an existing session without creating conflicting or duplicate participation state.

### Room Participation & Shared Session Context

- FR8: Players in a room can see the current participants in that room.
- FR9: Players in a room can see a shared view of room state relevant to the current session.
- FR10: The product can preserve room participation state during an active connected session.
- FR11: Users can leave a room and return to the broader app flow without breaking room integrity for others.
- FR12: Hosts and joining players can rely on room setup and room entry as the starting point for the full session experience.

### Character Management

- FR13: A player can create a character for use within a room.
- FR14: A player can view their own character details within the room context.
- FR15: Players in a room can view summaries of other room characters.
- FR16: A player can update the mutable attributes of a character during a session.
- FR17: The product can maintain character ownership or association within the room context.
- FR18: The product can prevent room state from becoming confusing or unusable because of duplicate or conflicting character records.
- FR19: A player can remove or otherwise end the active use of a character when that character is no longer part of the session.

### Battle Management

- FR20: Players can initiate a battle within an active room.
- FR21: A battle can be named or otherwise identified within the session context.
- FR22: Users can add battle participants and opposing forces to an active battle.
- FR23: Users can adjust battle-relevant values during the course of a battle.
- FR24: Users can view the current state of an in-progress battle.
- FR25: Users can determine the outcome or current result state of a battle.
- FR26: Users can conclude a battle and preserve its outcome as part of the room session record.
- FR27: Users can discard or abandon a battle that should not remain part of the active session state.
- FR28: Users can return to and continue an active battle within the same room session while that battle remains active.

### Session History & Logs

- FR29: Users can access a room-level history of meaningful session events.
- FR30: Users can review character creation events in room history.
- FR31: Users can review character change events in room history.
- FR32: Users can review battle summaries in room history.
- FR33: Users can open or inspect completed battle records from the room history.
- FR34: Users can use room history to identify prior character events and completed battle outcomes within the room context.

### Realtime Room Awareness & Recovery

- FR35: Changes to relevant room state can become visible to participants during an active session.
- FR36: Players can remain aware of room changes without manually rebuilding state from scratch.
- FR37: Users can recover from temporary disconnection, app restart, or delayed state refresh without losing the ability to continue the session.
- FR38: A player joining late can understand the current room and gameplay context well enough to participate.
- FR39: The product can restore sufficient current room context after reconnection or delayed refresh for users to continue an active session.

### Cross-Platform Product Consistency

- FR40: The core session loop can be completed on iOS.
- FR41: The core session loop can be completed on Android.
- FR42: The core session loop can be completed on web.
- FR43: Users can access core room, character, battle, and log capabilities on each supported platform.
- FR44: Users can complete the documented core session workflow on each supported platform.

### Product Supportability & Release Readiness

- FR45: Support and maintenance workflows can identify when failures occur in core room, character, battle, log, or session-continuity flows.
- FR46: Support and maintenance workflows can distinguish whether a core session failure is related to room state, character state, battle state, log history, or session continuity.
- FR47: The product can be reviewed against an explicit release-readiness checklist for the completed cross-platform session experience.
- FR48: The product can be prepared for app store distribution without excluding any core documented user workflow.

## Non-Functional Requirements

### Performance

- NFR1: Core room-entry actions, including create and join, shall complete within 3 seconds under normal supported conditions.
- NFR2: Character updates, battle interactions, and room-log access shall complete within 2 seconds under normal supported conditions.
- NFR3: Recovery from reconnect or delayed refresh shall restore usable room context within 5 seconds under normal supported conditions.

### Reliability

- NFR4: The product shall preserve the integrity of active room, character, battle, and log state during normal connected use.
- NFR5: Temporary disconnections or refresh interruptions shall not commonly result in duplicate participation state, lost battle continuity, or unusable room history.
- NFR6: Core session flows shall remain dependable across iOS, Android, and web for the supported release scope.

### Cross-Platform Consistency

- NFR7: The core session workflow shall be release-validated on iOS, Android, and web.
- NFR8: No supported platform shall ship with a materially incomplete version of the documented core session workflow.
- NFR9: Release approval for this increment shall require parity of the core room, character, battle, and log experience across all supported platforms.

### Supportability

- NFR10: Core session failures shall be diagnosable through clear product behaviors and observable failure boundaries.
- NFR11: Release readiness shall be assessed through an explicit checklist covering the completed cross-platform session experience.
- NFR12: Newly completed battle, log, and recovery flows shall be covered by regression-oriented validation before release.

### Security & Privacy

- NFR13: User and session data shall be protected in transit and at rest using standard security practices appropriate to a consumer companion application.
- NFR14: The product shall avoid exposing one player's room or session data outside the intended room context.
- NFR15: The next phase shall not introduce unnecessary data collection or permission requests beyond what is required for the supported core experience.

### Accessibility

- NFR16: Core user flows shall remain operable and understandable for a broad public audience across supported platforms.
- NFR17: Users shall be able to enter rooms, manage characters, run battles, and review logs without avoidable accessibility barriers in the supported release scope.

## Constraints & Guardrails

- The next phase shall preserve the current brownfield service boundaries across frontend, backend services, realtime notifications, and infrastructure.
- The next phase shall not require platform-specific divergence in the core feature set across iOS, Android, and web.
- Offline support remains out of scope for this increment.
- Push notifications remain out of scope for this increment.
- New device-dependent capabilities beyond standard local storage and network access are not required for this increment.
- The increment shall remain aligned to app store release preparation requirements.
- The increment shall preserve the existing cost sensitivity of the product, with early operational cost expected to remain under `$150/month`.

## Assumptions

- The current room, character, and realtime foundation is sufficient to support completion of the core session loop without redefining the product.
- The next release should prioritize completion of the documented Munchkin companion experience over product expansion.
- Users will evaluate the product primarily on whether it is dependable during real live sessions, not on breadth of secondary features.
- iOS, Android, and web are all active supported platforms for this phase and must remain aligned in core capability coverage.
- Release-readiness work is part of this increment, not a separate later initiative.

## Risks

- Battles and logs may be implemented in a way that is nominally complete but still not dependable enough for real-session use.
- Cross-platform parity may drift, leaving one supported platform materially behind the others.
- Realtime synchronization gaps may undermine trust in room, battle, or log state even when individual features exist.
- The team may consume time on non-critical polish or expansion before the core loop is actually dependable.
- Release preparation may surface store-readiness or cross-platform completeness gaps later than desired.

## Out of Scope

- Monetization, points, and progression features
- Broader retention or re-engagement systems
- Push notifications
- Offline mode
- New hardware-dependent capabilities
- Expansion beyond the current Munchkin-focused companion promise
- Support for additional games or broader product-market expansion in this increment

## Decision Points

- Battle scope depth: should Phase 1 support only the documented battle lifecycle, or also richer battle history and secondary battle analysis in the same release?
- Log detail depth: should logs remain focused on character events and battle summaries, or should broader room-event coverage be included in Phase 1?
- Web parity threshold: if a supported platform has a minor UX limitation but complete core capability coverage, does that still qualify as acceptable parity for release?
