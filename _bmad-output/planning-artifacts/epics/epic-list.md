# Epic List

## Epic 1: Player Identity & Onboarding
Players can enter the app without creating an account, establish a persistent player identity with name and avatar, and update their profile before or during a session.
**FRs covered:** FR1, FR2, FR3
**Status:** Existing (brownfield — all stories DONE)

## Epic 2: Room Management
Players can create a new game room and share the room code, join an existing room, and re-enter a session without creating duplicate participation state.
**FRs covered:** FR4, FR5, FR6, FR7, FR12
**Status:** Existing + Enhancement (room code copy-to-clipboard is TODO)

## Epic 3: Character Management
Players can create a character for a room, view their own character details and other players' character summaries, update character attributes (full modal for name/class/race, quick sheet for level/power), and remove a character from the session.
**FRs covered:** FR8, FR9, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR35, FR36
**Status:** Existing + Enhanced (prerequisite stories — AppTheme token migration, Room View routing migration — are gates for Epics 5 and 6)

## Epic 4: Realtime Room Awareness & Recovery
Players see a shared live view of room state, receive real-time visual signals when room character updates are surfaced to the client, and can recover from temporary disconnections or join a session late without losing context.
**FRs covered:** FR10, FR11, FR37, FR38, FR39
**Status:** Existing + Enhanced
**Cross-platform exit criteria apply to this epic**

## Epic 5: Battle Management
Players can create and resume a single active battle in a room, manage both sides of the battle in real time, and either conclude or discard it so the room returns to a clear, usable state.
**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28
**Status:** New
**Cross-platform exit criteria apply to this epic**

## Epic 6: Room History
Players can open a room history view to catch up on what happened earlier in the session and revisit completed battle details when needed.
**FRs covered:** FR29, FR30, FR31, FR32, FR33, FR34
**Status:** New
**Cross-platform exit criteria apply to this epic**

## Epic 7: Distribution, Availability, Supportability & Release Operations
Users can access Munch Helper through web and mobile distribution channels, while the team can ship updates quickly and reliably through collaborative development workflows, automated deployment pipelines, supportability instrumentation, and release-readiness operations.
**FRs covered:** FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR48
**NFRs addressed:** NFR6, NFR7, NFR8, NFR9, NFR11, NFR12
**Status:** Existing + New (store presence and web CI/CD are in place; mobile release automation and release-facing content refinement remain in progress)
