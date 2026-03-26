# Project Context Analysis

## Requirements Overview

**Functional Requirements:**
48 FRs across 8 capability areas. The two new first-class capabilities driving the majority of architectural decisions are Battle Management (FR20–28) and Session History & Logs (FR29–34). The remaining FRs address stabilization and recovery of the existing room/character/realtime loop or define release-readiness gates.

**Non-Functional Requirements:**
- Performance: room entry < 3s, character/battle/log interactions < 2s, reconnect recovery < 5s
- Reliability: room, character, battle, and log state must survive disconnections without duplication or corruption
- Cross-platform: iOS, Android, and web must reach parity on all core session flows
- Security: data in transit and at rest; no cross-room data leakage; no unnecessary device permissions
- Accessibility: WCAG AA minimum; 44×44pt touch targets; no color-only encoding
- Cost: $150/month operational ceiling — serverless-first architecture preserved
- Test coverage: 70% line coverage floor maintained across all touched surfaces

**Scale & Complexity:**
- Primary domain: Mobile-first full-stack (Expo/React Native + Node.js Lambda microservices)
- Complexity level: Medium (low domain complexity + medium technical complexity from realtime + serverless + multi-platform + brownfield)
- Estimated architectural components: 2 new backend services (battle-service, log-service), 2 new frontend screens (Battle View, Log View), 1 enhanced screen (Room View), new WebSocket event types

## Technical Constraints & Dependencies

- Brownfield service boundaries preserved: user-service, room-service, character-service, room-notifications-service — no inter-service data layer coupling
- Serverless constraint: Lambda means no in-memory shared state; all transient session state (including in-progress battle state) must be DB-persisted
- WebSocket event contract: battle lifecycle events must use the same SNS/Redis → room-notifications fanout schema pattern as character events
- Cost ceiling: $150/month — new services must use existing serverless/managed-service cost profile without adding new paid managed services
- TypeScript strictness split: frontend is strict; backend services are non-strict
- Test coverage floor: 70% maintained; new endpoints require success-path + failure-path tests
- Expo compatibility set lock: Expo 55 / React Native 0.83 / React 19.2

## Cross-Cutting Concerns Identified

1. **Realtime event propagation** — Battle state changes need to surface on all connected clients via `battle_started`, `battle_updated`, `battle_concluded`, `battle_discarded` events through the existing SNS/Redis fanout pipeline
2. **Serverless persistence for multi-step operations** — Battle creation/conclusion are multi-step; rollback logic must mirror the room creation rollback pattern
3. **Optimistic UI updates** — Battle interactions must follow the TanStack Query optimistic update + reconcile pattern established for characters
4. **Cross-platform rendering parity** — Battle View and Log View must work on iOS, Android, and web; expo-specific primitives have graceful web fallbacks
5. **Data model extension** — Battle schema (roomId, name, sides, modifiers, status, outcome, timestamps) and Log schema (eventType, roomId, actorId, summary, payload, occurredAt) align with existing MongoDB/Mongoose service patterns
6. **Idempotency and deduplication** — One active battle per room enforced at service level (409 Conflict); late-joining players query current battle state, not reconstruct from events
7. **Error handling consistency** — Battle and log endpoints follow existing 400/404/502 response contracts
8. **Design token consolidation** — Migrate hardcoded hex values in existing components to AppTheme tokens before building new screens (prerequisite task)

## Architectural Decisions Confirmed in Context Phase


| Decision | Rationale |
|---|---|
| `battle-service` — new independent Lambda microservice | Clean domain boundary, own MongoDB collection, own SNS topic, no synchronous dependencies on other services |
| `log-service` — SNS/Redis aggregator | Subscribes to character + battle topics; unified history interface; thin event schema with pre-rendered summaries |
| `GET /battles?roomId=X&status=active` for live state | Keeps room-service clean; warm resume orchestration handled in frontend hook layer |
| One active battle per room (`409 Conflict` on duplicate) | Enforced at service level per UX spec constraint |
| Frontend: `battles.ts` + `logs.ts` API modules, `useRoomBattle` + `useRoomLogs` hooks | Mirrors existing `characters.ts` / `useRoomCharacters` pattern |
