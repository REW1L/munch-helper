---
stepsCompleted: ['step-01', 'step-02', 'step-03', 'step-04']
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# munch-helper - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for munch-helper, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: New users can enter the product without prior account setup.
FR2: Users can establish and retain a usable player identity for future sessions.
FR3: Users can update their visible player profile information.
FR4: Users can enter the app and begin a game session from any supported platform.
FR5: Users can create a new room for a supported game session.
FR6: Users can join an existing room using room-specific entry information.
FR7: Users can re-enter an existing session without creating conflicting or duplicate participation state.
FR8: Players in a room can see the current participants in that room.
FR9: Players in a room can see a shared view of room state relevant to the current session.
FR10: The product can preserve room participation state during an active connected session.
FR11: Users can leave a room and return to the broader app flow without breaking room integrity for others.
FR12: Hosts and joining players can rely on room setup and room entry as the starting point for the full session experience.
FR13: A player can create a character for use within a room.
FR14: A player can view their own character details within the room context.
FR15: Players in a room can view summaries of other room characters.
FR16: A player can update the mutable attributes of a character during a session.
FR17: The product can maintain character ownership or association within the room context.
FR18: The product can prevent room state from becoming confusing or unusable because of duplicate or conflicting character records.
FR19: A player can remove or otherwise end the active use of a character when that character is no longer part of the session.
FR20: Players can initiate a battle within an active room.
FR21: A battle can be named or otherwise identified within the session context.
FR22: Users can add battle participants and opposing forces to an active battle.
FR23: Users can adjust battle-relevant values during the course of a battle.
FR24: Users can view the current state of an in-progress battle.
FR25: Users can determine the outcome or current result state of a battle.
FR26: Users can conclude a battle and preserve its outcome as part of the room session record.
FR27: Users can discard or abandon a battle that should not remain part of the active session state.
FR28: Users can return to and continue an active battle within the same room session while that battle remains active.
FR29: Users can access a room-level history of meaningful session events.
FR30: Users can review character creation events in room history.
FR31: Users can review character change events in room history.
FR32: Users can review battle summaries in room history.
FR33: Users can open or inspect completed battle records from the room history.
FR34: Users can use room history to identify prior character events and completed battle outcomes within the room context.
FR35: Changes to relevant room state can become visible to participants during an active session.
FR36: Players can remain aware of room changes without manually rebuilding state from scratch.
FR37: Users can recover from temporary disconnection, app restart, or delayed state refresh without losing the ability to continue the session.
FR38: A player joining late can understand the current room and gameplay context well enough to participate.
FR39: The product can restore sufficient current room context after reconnection or delayed refresh for users to continue an active session.
FR40: The core session loop can be completed on iOS.
FR41: The core session loop can be completed on Android.
FR42: The core session loop can be completed on web.
FR43: Users can access core room, character, battle, and log capabilities on each supported platform.
FR44: Users can complete the documented core session workflow on each supported platform.
FR45: Support and maintenance workflows can identify when failures occur in core room, character, battle, log, or session-continuity flows.
FR46: Support and maintenance workflows can distinguish whether a core session failure is related to room state, character state, battle state, log history, or session continuity.
FR47: The product can be reviewed against an explicit release-readiness checklist for the completed cross-platform session experience.
FR48: The product can be prepared for app store distribution without excluding any core documented user workflow.

### NonFunctional Requirements

NFR1: Core room-entry actions, including create and join, shall complete within 3 seconds under normal supported conditions.
NFR2: Character updates, battle interactions, and room-log access shall complete within 2 seconds under normal supported conditions.
NFR3: Recovery from reconnect or delayed refresh shall restore usable room context within 5 seconds under normal supported conditions.
NFR4: The product shall preserve the integrity of active room, character, battle, and log state during normal connected use.
NFR5: Temporary disconnections or refresh interruptions shall not commonly result in duplicate participation state, lost battle continuity, or unusable room history.
NFR6: Core session flows shall remain dependable across iOS, Android, and web for the supported release scope.
NFR7: The core session workflow shall be release-validated on iOS, Android, and web.
NFR8: No supported platform shall ship with a materially incomplete version of the documented core session workflow.
NFR9: Release approval for this increment shall require parity of the core room, character, battle, and log experience across all supported platforms.
NFR10: Core session failures shall be diagnosable through clear product behaviors and observable failure boundaries.
NFR11: Release readiness shall be assessed through an explicit checklist covering the completed cross-platform session experience.
NFR12: Newly completed battle, log, and recovery flows shall be covered by regression-oriented validation before release.
NFR13: User and session data shall be protected in transit and at rest using standard security practices appropriate to a consumer companion application.
NFR14: The product shall avoid exposing one player's room or session data outside the intended room context.
NFR15: The next phase shall not introduce unnecessary data collection or permission requests beyond what is required for the supported core experience.
NFR16: Core user flows shall remain operable and understandable for a broad public audience across supported platforms.
NFR17: Users shall be able to enter rooms, manage characters, run battles, and review logs without avoidable accessibility barriers in the supported release scope.

### Additional Requirements

- **No external starter template**: This is a brownfield project with a fully established stack. New services scaffold from existing services (battle-service scaffolds from character-service; log-service scaffolds from room-notifications-service + character-service hybrid).
- **New backend services**: Two new AWS Lambda microservices must be built — `battle-service` (HTTP API) and `log-service` (SNS subscriber `logWriter` + HTTP API reader `logReader`).
- **SAM template additions**: New `BattleServiceFunction`, `LogWriterFunction` (SNS trigger), and `LogReaderFunction` (HTTP API) entries required in the SAM template.
- **IAM policy additions**: `battle-service` needs `sns:Publish` on `NOTIFICATIONS_TOPIC_ARN` + `LOG_TOPIC_ARN`; `character-service` adds `sns:Publish` on `LOG_TOPIC_ARN`; `log-service` needs `sns:Subscribe` on `LOG_TOPIC_ARN`.
- **Local Nginx routing**: Add `location /battles` and `location /logs` proxy entries.
- **Room View routing migration prerequisite**: `app/munchkin/[roomNumber].tsx` must be migrated to `app/munchkin/[roomNumber]/index.tsx` before Battle View and Log View can be added as nested Expo Router routes. This is step 0 of Room View enhancement.
- **AppTheme token migration prerequisite**: Migrate all hardcoded hex values in existing components to AppTheme tokens before building new screens — this is step 1 of the implementation sequence.
- **Dual-topic SNS fan-out**: character-service and battle-service must publish to both the notifications topic and the log topic using `Promise.allSettled` so a log topic failure does not block notifications.
- **Log event scope (ADR-5)**: `battle_updated` is NOT logged; log captures lifecycle events only (character_created, character_updated, character_deleted, battle_started, battle_concluded).
- **Battle mutation safety (ADR-8)**: Status guard (must be `active`) enforced on PATCH/DELETE/conclude; last-write-wins for concurrent PATCHes.
- **Log pagination (ADR-7)**: Cursor-based via MongoDB `_id`; compound index `{ roomId: 1, _id: -1 }` required.
- **Test coverage gate**: 70% coverage floor must be met before release. Battle-service primary targets: create/conclude/discard flows. Log-service primary targets: SNS handler writes correct document; HTTP reader returns filtered roomId results.
- **Cross-platform validation**: iOS, Android, and web parity must be validated before release (step 10 of implementation sequence).
- **`LOG_TOPIC_ARN` configuration**: Required environment variable in character-service and battle-service; missing config logs a startup warning and causes log entries to be absent (degraded mode, not a crash).
- **WebSocket extension**: `RoomWebSocketClient` extended with `battle_*` event handlers only; existing character event handlers are not modified.
- **Warm resume (ADR-10)**: On reconnect, always navigate to Room View; Room View reflects active battle via `useRoomBattle`; no auto-navigate to Battle View.
- **Character deleted during active battle (ADR-9)**: No backend cascade; frontend removes from display via `character_deleted` WebSocket event; battle record retains original `characterIds`.

### UX Design Requirements

UX-DR1: Consolidate all hardcoded color values in existing components into AppTheme tokens before building new screens. Specifically: `VioletButton` `#6E6BD4` → `AppTheme.colors.actionSecondary`; `RoomCharacterCard` `#A67560` → `AppTheme.colors.surfaceWarm`; `[roomNumber].tsx` logButton `#353535` → `AppTheme.colors.surfaceSubtle`; `CurrentCharacterFooter` `#544C4C` → `AppTheme.colors.elevated`; any remaining per-screen COLORS constants → corresponding AppTheme tokens.
UX-DR2: Extend `AppTheme.colors` with new role-based tokens: `danger` (#922525), `textAccentSoft` (#E8D89A), `elevated` (#4C4545), `surfaceWarm` revised to #8A6150 (darkened from #A67560 for improved contrast). Existing tokens `accent` (#D4C26E), `actionSecondary` (#6E6BD4), `textMuted`, `surface` are retained.
UX-DR3: Create `RoomCodeHeader` component — sticky header permanently visible in Room View. Displays room code in `accent` color with an inline copy-to-clipboard button (expo-clipboard). Copy interaction: inline "Copy" → "Copied ✓" state change for 1500ms, then reset. Accessible: `accessibilityLabel="Copy room code [code]"`, `accessibilityRole="button"`.
UX-DR4: Update `RoomCharacterCard` component — apply `textAccentSoft` to character name, `accent` to stat values, wire `useRealtimeFlash` hook for realtime update signal, make full card tappable to open QuickEditSheet. Accessible: `accessible={true}`, `accessibilityLabel="[Name], Level [N], Power [N]"`, `accessibilityRole="button"`, `accessibilityHint="Tap to edit stats"`.
UX-DR5: Update `CurrentCharacterFooter` component — apply same token updates as RoomCharacterCard (textAccentSoft for name, accent for stats), align background to `AppTheme.colors.elevated` (#4C4545).
UX-DR6: Update `VioletButton` component — replace hardcoded `#6E6BD4` with `AppTheme.colors.actionSecondary`.
UX-DR7: Create `QuickEditSheet` component — bottom sheet (~60% screen height) that slides up from bottom. Contains level and power +/− stepper controls (StatStepper), a Save primary button, and an "Edit more…" ghost link that routes to `ChangeCharacterModal`. States: Clean (no changes), Dirty (Save active), Saving (brief loading, Save disabled with surfaceSubtle bg). Dismiss: tap outside triggers Undo toast (1500ms) if dirty. Never open simultaneously with `ChangeCharacterModal` — enforced via `isSheetOpen` state gate.
UX-DR8: Create `StatStepper` component — stepper for level/power values. Tap targets minimum 44×44pt for both +/− buttons. Current value displayed bold in `accent` color between buttons. Floor: 0. No upper ceiling — level and power are unbounded. Haptic: `Haptics.ImpactFeedbackStyle.Light` on every tap (fires immediately before save). Accessible: `accessibilityLabel="Increase level"` / `"Decrease level"`, `accessibilityRole="button"`.
UX-DR9: Create `useRealtimeFlash(color: string)` hook — border color interpolation from transparent → `color` → transparent over 300ms total (fade in → hold 100ms → fade out) via `react-native-reanimated`. Border only (not background) to avoid layout repaints. Supports concurrent multi-card updates without visual conflict. Reduced motion: skip interpolation, apply border color immediately and remove after 300ms.
UX-DR10: Create `ActiveBattleBanner` component — inline strip in the Room View character list header. Shown when a battle is active. Displays battle name (if any) and a "View Battle" VioletButton. Not dismissible — reflects live server state from `useRoomBattle`. Accessible: `accessibilityLabel="Battle in progress. Tap to view."`, `accessibilityRole="button"`.
UX-DR11: Create `ReconnectingBanner` component — top-of-screen banner with low-prominence styling (`surfaceSubtle` bg, `textMuted` text). Auto-dismisses on reconnect. Escalates to "Connection lost · Retry" button after 8 seconds. Uses `AccessibilityInfo.announceForAccessibility(message)` called imperatively on mount (not `accessibilityLiveRegion` — cross-platform unreliable in React Native).
UX-DR12: Create `LogEntry` component — displays a single log event. Anatomy: small character avatar (24×24, character color background), character name (`body`, `textAccentSoft`), field label (`caption`, `textMuted`), `prev → new` value (`body bold`, `accent`), timestamp (`caption`, `textMuted`, right-aligned). Accessible: `accessibilityLabel="[Name], [field] changed from [prev] to [new], [time] ago"`.
UX-DR13: Build Battle View screen — Expo Router modal group `app/munchkin/(battle)/index.tsx`. Two-sided layout: monster side (`danger` color, #922525) and player side (`accent` color, #D4C26E). Displays BonusItem and MonsterItem lists per side. PATCH mutations for updating sides. Conclude action (POST /battles/:id/conclude with required result) and Discard action (soft delete, `danger` button with explicit confirmation step before execution). Conclude button is primary action (one per screen). Back navigation via standard stack header chevron.
UX-DR14: Build Log View screen — `app/munchkin/[roomNumber]/log.tsx`. Paginated scrollable list of `LogEntry` components. Cursor-based pagination (scroll to load more). Empty state: "No events recorded yet." with no CTA. Safe area applied at screen level only via `useSafeAreaInsets()`.
UX-DR15: Optimistic updates with error revert — stat value updates immediately in UI on local tap (before server confirmation). `useRealtimeFlash` fires on server confirmation as visual acknowledgement. On server error: revert value quietly with a brief border flash in `danger` color. No toast for errors on stat changes.
UX-DR16: Implement reduced motion support — check `useReducedMotion()` from `react-native-reanimated` app-wide. When enabled: `useRealtimeFlash` skips border interpolation (apply immediately, remove after 300ms); `QuickEditSheet` snaps directly to open/closed position instead of spring animation.
UX-DR17: Implement colour blindness accessibility testing requirement — run Xcode Accessibility Inspector colour filter (Deuteranopia + Protanopia) against Room View and QuickEditSheet before release. Document results. All accent-coloured elements must pair colour with bold weight or a primary affordance shape.
UX-DR18: Apply responsive layout conventions across all screens — use `flex` and percentage widths throughout; no hardcoded pixel widths. Portrait-only (landscape locked). Apply `useSafeAreaInsets()` at screen level only (not inside components). Minimum test target: iPhone SE (375pt).
UX-DR19: Apply button hierarchy rule throughout all new screens — never more than one primary action (`accent` bg) visible per layer. Secondary = VioletButton (`actionSecondary`). Destructive = `danger` bg. Ghost = `textMuted` text, no background. Disabled = `surfaceSubtle` bg + `textMuted` text (not gold, to avoid confusion with active accent).
UX-DR20: Implement field error pattern — `danger` border tint on errored field + short inline label below. Never a blocking modal for field-level errors. Validation triggers on Save tap, not on blur.
UX-DR21: QA device targets — iPhone SE (375pt minimum size validation), iPhone 16 (standard iOS baseline), Pixel 6a or similar mid-range Android (representative Android performance baseline). VoiceOver and TalkBack accessibility flows must be validated on Room View and QuickEditSheet.

### FR Coverage Map

FR1: Epic 1 — User can enter the product without prior account setup
FR2: Epic 1 — User establishes and retains a persistent player identity
FR3: Epic 1 — User updates their visible player profile information
FR4: Epic 2 — User enters the app and begins a game session from any supported platform
FR5: Epic 2 — User creates a new room for a supported game session
FR6: Epic 2 — User joins an existing room using room-specific entry information
FR7: Epic 2 — User re-enters an existing session without creating duplicate participation state
FR8: Epic 3 — Players see the current participants in the room
FR9: Epic 3 — Players see a shared view of room state relevant to the current session
FR10: Epic 4 — Product preserves room participation state during an active connected session
FR11: Epic 4 — User leaves a room without breaking room integrity for others
FR12: Epic 2 — Hosts and joining players rely on room setup and entry as the starting point for the full session experience
FR13: Epic 3 — Player creates a character for use within a room
FR14: Epic 3 — Player views their own character details within the room context
FR15: Epic 3 — Players view summaries of other room characters
FR16: Epic 3 — Player updates the mutable attributes of a character during a session (quick edit)
FR17: Epic 3 — Product maintains character ownership or association within the room context
FR18: Epic 3 — Product prevents room state from becoming confusing due to duplicate or conflicting character records
FR19: Epic 3 — Player removes or ends the active use of a character
FR20: Epic 5 — Players initiate a battle within an active room
FR21: Epic 5 — A battle can be named or identified within the session context
FR22: Epic 5 — Users add battle participants and opposing forces to an active battle
FR23: Epic 5 — Users adjust battle-relevant values during the course of a battle
FR24: Epic 5 — Users view the current state of an in-progress battle
FR25: Epic 5 — Users determine the outcome or result state of a battle
FR26: Epic 5 — Users conclude a battle and preserve its outcome as part of the room session record
FR27: Epic 5 — Users discard or abandon a battle that should not remain part of active session state
FR28: Epic 5 — Users return to and continue an active battle within the same room session
FR29: Epic 6 — Users access a room-level history of meaningful session events
FR30: Epic 6 — Users review character creation events in room history
FR31: Epic 6 — Users review character change events in room history
FR32: Epic 6 — Users review battle summaries in room history
FR33: Epic 6 — Users open or inspect completed battle records from room history
FR34: Epic 6 — Users use room history to identify prior character events and completed battle outcomes
FR35: Epic 3 — Changes to relevant room state become visible to participants during an active session
FR36: Epic 3 — Players remain aware of room changes without manually rebuilding state
FR37: Epic 4 — Users recover from temporary disconnection or app restart without losing the ability to continue the session
FR38: Epic 4 — A player joining late can understand the current room and gameplay context well enough to participate
FR39: Epic 4 — Product restores sufficient room context after reconnection or delayed refresh
FR40: Epic 7 — Core session loop can be completed on iOS
FR41: Epic 7 — Core session loop can be completed on Android
FR42: Epic 7 — Core session loop can be completed on web
FR43: Epic 7 — Users access core room, character, battle, and log capabilities on each supported platform
FR44: Epic 7 — Users complete the documented core session workflow on each supported platform
FR45: Epic 7 — Support workflows can identify failures in core room, character, battle, log, or session-continuity flows
FR46: Epic 7 — Support workflows can distinguish the type of core session failure
FR47: Epic 7 — Product can be reviewed against an explicit release-readiness checklist
FR48: Epic 7 — Product can be prepared for app store distribution without excluding any core documented workflow

## Epic List

### Epic 1: Player Identity & Onboarding
Players can enter the app without creating an account, establish a persistent player identity with name and avatar, and update their profile before or during a session.
**FRs covered:** FR1, FR2, FR3
**Status:** Existing (brownfield — all stories DONE)

### Epic 2: Room Management
Players can create a new game room and share the room code, join an existing room, see the current participants, and leave or re-enter a room without breaking session integrity for others.
**FRs covered:** FR4, FR5, FR6, FR7, FR10, FR11, FR12
**Status:** Existing + Enhancement (room code copy-to-clipboard is TODO)

### Epic 3: Character Management
Players can create a character for a room, view their own character details and other players' character summaries, update character attributes (full modal for name/class/race, quick sheet for level/power), and remove a character from the session.
**FRs covered:** FR8, FR9, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR35, FR36
**Status:** Existing + Enhanced (prerequisite stories — AppTheme token migration, Room View routing migration — are gates for Epics 5 and 6)

### Epic 4: Realtime Room Awareness & Recovery
Players see a shared live view of room state, receive real-time visual signals when other players make changes, and can recover from temporary disconnections or join a session late without losing context.
**FRs covered:** FR10, FR11, FR37, FR38, FR39
**Status:** Existing + Enhanced
**Cross-platform exit criteria apply to this epic**

### Epic 5: Battle Management
Players can create and resume a single active battle in a room, manage both sides of the battle in real time, and either conclude or discard it so the room returns to a clear, usable state.
**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28
**Status:** New
**Cross-platform exit criteria apply to this epic**

### Epic 6: Room History
Players can open a room history view to catch up on what happened earlier in the session and revisit completed battle details when needed.
**FRs covered:** FR29, FR30, FR31, FR32, FR33, FR34
**Status:** New
**Cross-platform exit criteria apply to this epic**

### Epic 7: Distribution, Availability & Release Operations
Users can access Munch Helper through web and mobile distribution channels, while the team can ship updates quickly and reliably through collaborative development workflows, automated deployment pipelines, and release-readiness operations.
**FRs covered:** FR40, FR41, FR42, FR43, FR44, FR47, FR48
**NFRs addressed:** NFR6, NFR7, NFR8, NFR9, NFR11, NFR12
**Status:** Existing + New (store presence and web CI/CD are in place; mobile release automation and release-facing content refinement remain in progress)

## Epic 1: Player Identity & Onboarding

Players can enter the app without an account, establish a persistent player identity with a random name and avatar, and optionally update their profile at any time.

### Story 1.1: Landing Screen `[DONE]`

As a new or returning user,
I want to land on a screen that clearly explains what Munch Helper is and gives me a single button to enter the app,
So that I immediately understand the app's purpose and know how to proceed.

**Acceptance Criteria:**

**Given** I open the app
**When** the landing screen loads
**Then** I see the app name, a short description of its purpose, and a prominent "Rooms" button
**And** Privacy and Support links are accessible from the landing screen
**And** tapping "Rooms" navigates me to the rooms view

### Story 1.2: Automatic Player Identity Creation `[DONE]`

As a new player navigating to the rooms view for the first time,
I want a player identity to be silently created for me with a random name and avatar,
So that I can join or create a room immediately without any setup friction.

**Acceptance Criteria:**

**Given** I am a new user with no existing player identity
**When** I navigate to the rooms view
**Then** a random player name and avatar are automatically assigned to me with no visible setup prompt
**And** this identity is persisted locally for future sessions
**And** no account registration or manual input is required

### Story 1.3: Optional Player Profile Update `[DONE]`

As a player,
I want to optionally update my display name and avatar,
So that I can personalise how I appear to others if I choose to.

**Acceptance Criteria:**

**Given** I have an automatically assigned player identity
**When** I choose to open profile settings
**Then** I can update my name and avatar
**And** saving my changes persists the updated profile for future sessions
**And** if I skip or ignore profile settings entirely, the auto-assigned identity continues to work without any prompt or interruption

## Epic 2: Room Management

Players can create and join rooms, access room entry information, re-enter a session without creating duplicate state, and copy the room code instantly to share with latecomers.

### Story 2.1: Room Creation `[DONE]`

As a host,
I want to create a new game room,
So that my group has a shared session space to play in.

**Acceptance Criteria:**

**Given** I am on the rooms view
**When** I tap "Create Room"
**Then** a new room is created and I am navigated to the room view as the host
**And** a unique room code is generated for the room

### Story 2.2: Room Code Visibility `[DONE]`

As a host,
I want the room code to be visible at any point during the session,
So that players who arrive late can still get the code to join.

**Acceptance Criteria:**

**Given** I am inside an active room
**When** I view the room
**Then** the room code is visible without any additional navigation or extra steps
**And** the code remains accessible throughout the session

### Story 2.3: Room Joining `[DONE]`

As a player,
I want to join an existing room using a room code,
So that I can participate in a session my host has already created.

**Acceptance Criteria:**

**Given** I am on the rooms view
**When** I enter a valid room code and tap "Join"
**Then** I am navigated into the room as a participant
**And** the host and other players can see me in the participants list

**Given** I enter an invalid or expired room code
**When** I tap "Join"
**Then** I see a clear error message and remain on the rooms view

### Story 2.4: Session Re-entry Without Duplicate State `[DONE]`

As a player,
I want to re-enter a room I previously left or was disconnected from,
So that I can rejoin the session without creating a duplicate or conflicting presence.

**Acceptance Criteria:**

**Given** I previously joined a room and have since left or been disconnected
**When** I re-enter the room using the same room code
**Then** I rejoin without creating a duplicate participant record
**And** the room state I left is still intact for the other participants

### Story 2.5: Room Code Copy-to-Clipboard via Header Button `[TODO]`

As a player inside a room,
I want to tap a copy button next to the room code to copy it instantly,
So that I can share the code with latecomers without manually selecting or retyping it.

**Acceptance Criteria:**

**Given** I am inside an active room
**When** I view the room header
**Then** the room code is displayed in `accent` color alongside an inline copy icon button
**And** the button is accessible: `accessibilityLabel="Copy room code [code]"`, `accessibilityRole="button"`

**Given** I tap the copy button
**When** the tap is registered
**Then** the room code is copied to the device clipboard via `expo-clipboard`
**And** the button label changes to "Copied ✓" for 1500ms then resets — no toast

**Given** I am using a screen reader
**When** I focus the copy button
**Then** the accessibility label announces the full room code

> **Covers:** UX-DR3

## Epic 3: Character Management

Players can create, view, quick-edit, and remove characters. Includes prerequisite AppTheme token migration and Room View routing migration that gate Epics 5 and 6.

### Story 3.1: AppTheme Token Migration `[TODO]` ⛔ Gate for Epics 5–6

As a developer,
I want all hardcoded colour values in existing components migrated to AppTheme tokens,
So that new screens can be built consistently without introducing hardcoded hex values.

**Acceptance Criteria:**

**Given** the existing components `VioletButton`, `RoomCharacterCard`, `CurrentCharacterFooter`, and `[roomNumber].tsx`
**When** the migration is complete
**Then** `#6E6BD4` → `AppTheme.colors.actionSecondary` in `VioletButton`
**And** `#A67560` → `AppTheme.colors.surfaceWarm` (`#8A6150`) in `RoomCharacterCard`
**And** `#544C4C` → `AppTheme.colors.elevated` in `CurrentCharacterFooter`
**And** `#353535` → `AppTheme.colors.surfaceSubtle` in `[roomNumber].tsx` log button
**And** new tokens `danger`, `textAccentSoft`, `elevated`, `surfaceWarm` are added to `AppTheme.colors`
**And** zero hardcoded hex values remain in any migrated component

> **Covers:** UX-DR1, UX-DR2

### Story 3.2: Room View Routing Migration `[TODO]` ⛔ Gate for Epics 5–6

As a developer,
I want `app/munchkin/[roomNumber].tsx` migrated to `app/munchkin/[roomNumber]/index.tsx`,
So that Battle View and Log View can be added as nested Expo Router routes.

**Acceptance Criteria:**

**Given** the current flat route `app/munchkin/[roomNumber].tsx`
**When** the migration is complete
**Then** the Room View is served from `app/munchkin/[roomNumber]/index.tsx` with identical behaviour
**And** all existing navigation to the room route continues to work without changes
**And** nested routes `battle/` and `log/` can be added under `[roomNumber]/` in future epics

### Story 3.3: Automatic Character Creation on Room Join `[DONE]`

As a player,
I want a character to be automatically created for me with default values when I join or create a room,
So that I'm immediately present in the session without any setup step.

**Acceptance Criteria:**

**Given** I join or create a room
**When** I enter the room
**Then** a character with default name, class, race, gender, avatar, and colour is automatically created and associated with my player identity
**And** this character is visible to all room participants immediately

**Given** I want to play an additional character (e.g. a second character for role-playing purposes)
**When** I manually create a new character
**Then** a new character is created with no association to any player identity
**And** the unassociated character is visible in the room alongside associated characters

### Story 3.4: Character Details View `[DONE]`

As a player,
I want to view my own character's full details within the room,
So that I can see all my stats and attributes at a glance.

**Acceptance Criteria:**

**Given** I have a character in the current room
**When** I view my character
**Then** I can see name, avatar, level, power, and all assigned classes, races, and genders
**And** multiple values per attribute (e.g. two classes) are displayed correctly
**And** my character is visually distinct from other players' characters

### Story 3.5: Room Character List `[DONE]`

As a player,
I want to see full attribute cards for all characters in the room,
So that I and others can track every character's complete state at a glance.

**Acceptance Criteria:**

**Given** there are one or more characters in the room
**When** I view the Room View
**Then** each character card displays name, avatar, level, power, and all classes, races, and genders
**And** my own character card is visually distinguished from others

### Story 3.6: Updated Character Card Styling `[TODO]`

As a player,
I want character cards to use the app's design token system with clear stat colours,
So that names and values are easy to read, especially in low-light conditions.

**Acceptance Criteria:**

**Given** the Room View displays character cards
**When** cards are rendered after the token migration (Story 3.1)
**Then** character names use `textAccentSoft` and stat values use `accent`
**And** `RoomCharacterCard` and `CurrentCharacterFooter` have no remaining hardcoded hex values
**And** the full card is tappable to open QuickEditSheet

> **Covers:** UX-DR4, UX-DR5
> **Depends on:** Story 3.1

### Story 3.7: Quick Character Stat Editing `[TODO]`

As a player,
I want to tap my character card and quickly adjust my level and power from a bottom sheet,
So that I can update my stats mid-game without navigating away from the Room View.

**Acceptance Criteria:**

**Given** I am viewing the Room View
**When** I tap my character card
**Then** a `QuickEditSheet` slides up from the bottom (~60% screen height) with level and power steppers
**And** each stepper has +/− buttons with minimum 44×44pt tap targets
**And** both level and power are floored at 0 with no upper ceiling
**And** `Haptics.ImpactFeedbackStyle.Light` fires on every tap before save
**And** stat values update optimistically in the UI immediately on tap

**Given** I make changes in the QuickEditSheet
**When** I tap Save
**Then** changes are persisted to the server
**And** the sheet closes and the updated stats are visible in the Room View

**Given** I make changes and then dismiss the sheet by tapping outside
**When** the sheet closes
**Then** an Undo toast appears for 1500ms — tapping it restores the previous state

**Given** a save request fails
**When** the server returns an error
**Then** the stat value reverts quietly with a brief `danger` border flash — no toast

> **Covers:** UX-DR7, UX-DR8, UX-DR15, UX-DR20
> **Depends on:** Stories 3.1, 3.2

### Story 3.8: Realtime Update Signal on Character Cards `[TODO]`

As a player,
I want to see a brief visual flash on a character card when another player updates their stats,
So that I know the change was made by someone else and not a display glitch.

**Acceptance Criteria:**

**Given** another player updates their character stats
**When** the update is received via WebSocket
**Then** a border flash animates on that character's card using the character's own colour — transparent → colour → transparent over 300ms
**And** multiple cards can flash concurrently without visual conflict
**And** when reduced motion is enabled, the border colour is applied immediately and removed after 300ms with no interpolation

> **Covers:** UX-DR9
> **Depends on:** Stories 3.1, 3.6

### Story 3.9: Full Character Attribute Editing `[DONE]`

As a player,
I want to edit my character's name, class, race, gender, avatar, and colour via a full modal,
So that I can make complete changes to my character's identity during a session.

**Acceptance Criteria:**

**Given** I have a character in the current room
**When** I open the full character edit modal (via "Edit more…" in QuickEditSheet or directly)
**Then** I can update name, class, race, gender, avatar, and colour — including multiple values per attribute
**And** saving persists all changes and closes the modal
**And** `QuickEditSheet` and `ChangeCharacterModal` are never open simultaneously

### Story 3.10: Unassociated Character Removal `[TODO]`

As a player,
I want to remove an unassociated character from the room,
So that the session state stays clean when an extra character is no longer needed.

**Acceptance Criteria:**

**Given** there is an unassociated character in the room
**When** I choose to remove it
**Then** the character is removed from the room and no longer visible to any participant
**And** the room remains usable for the remaining players without broken state

**Given** a character is associated with a player identity
**When** I view that character's options
**Then** no removal option is shown — associated characters cannot be removed

## Epic 4: Realtime Room Awareness & Recovery

Players stay in sync with live room state, see a visual indicator when connectivity drops, and can recover from disconnections or resume from background without losing context.

### Story 4.1: Live Room State Synchronisation `[DONE]`

As a player in an active room,
I want changes made by other players to appear in my view automatically,
So that I always see the current room state without manually refreshing.

**Acceptance Criteria:**

**Given** I am inside an active room
**When** another player makes a change (character update, room event)
**Then** my Room View reflects the updated state without any manual action on my part
**And** I do not need to leave and re-enter the room to see the latest state

### Story 4.2: Graceful Room Exit `[DONE]`

As a player,
I want to leave a room without disrupting the session for others,
So that the room remains intact and usable after I exit.

**Acceptance Criteria:**

**Given** I am in an active room
**When** I leave the room
**Then** I am returned to the rooms view
**And** the room continues to function normally for remaining participants
**And** my characters and session contributions remain in the room state

### Story 4.3: Reconnection & Session Restore `[TODO]`

As a player who has experienced a disconnection or backgrounded the app,
I want the app to restore my room context automatically on reconnect,
So that I can continue the session without losing state or having to rejoin manually.

**Acceptance Criteria:**

**Given** I am disconnected from an active room due to a network drop
**When** connectivity is restored
**Then** the app reconnects automatically and restores the current room state within 5 seconds
**And** I am returned to the Room View — not redirected to Battle View even if a battle is active
**And** the active battle state is reflected in the Room View via `useRoomBattle` without auto-navigation

**Given** I background the app while in an active room and then bring it back to the foreground
**When** the app resumes
**Then** room context is restored automatically as above

**Given** the app crashes and is relaunched, or is fully removed from device memory and restarted cold
**When** the app starts
**Then** session restore does NOT apply — the user starts from the landing screen and must re-enter the room manually

**Given** reconnection fails after 8 seconds
**When** the timeout is reached
**Then** a "Connection lost · Retry" button is shown so I can manually trigger reconnection

### Story 4.4: Reconnecting Banner `[TODO]`

As a player experiencing a temporary connection issue,
I want a low-prominence banner to appear at the top of the screen,
So that I'm aware of the connection state without being blocked from viewing the room.

**Acceptance Criteria:**

**Given** the app detects a disconnection
**When** reconnection is in progress
**Then** a `ReconnectingBanner` appears at the top of the screen with `surfaceSubtle` background and `textMuted` text
**And** the banner auto-dismisses when connection is restored
**And** after 8 seconds it escalates to a "Connection lost · Retry" button
**And** on mount, `AccessibilityInfo.announceForAccessibility` is called with the reconnecting message

> **Covers:** UX-DR11
> **Depends on:** Story 4.3

### Story 4.5: Late-Join Context Awareness `[TODO]`

As a player joining a room mid-session,
I want to immediately see the current room state including active characters and any in-progress battle,
So that I can understand what's happening and participate without confusion.

**Acceptance Criteria:**

**Given** a room has active characters and possibly an in-progress battle
**When** I join the room
**Then** I see the current character list with all attributes
**And** if a battle is active, the `ActiveBattleBanner` is visible in the Room View
**And** I can navigate to the Battle View to see the full current battle state

### Story 4.6: Reduced Motion Support `[TODO]`

As a player with motion sensitivity,
I want the app to respect my device's reduced motion preference,
So that animations don't cause discomfort during play.

**Acceptance Criteria:**

**Given** I have reduced motion enabled on my device
**When** I use the app
**Then** `useRealtimeFlash` applies the border colour immediately and removes it after 300ms without interpolation
**And** `QuickEditSheet` snaps directly to open/closed position without spring animation

> **Covers:** UX-DR16
> **Depends on:** Stories 3.7, 3.8

## Epic 5: Battle Management

Players can create and resume a single active battle in a room, manage both sides of the battle in real time, and either conclude or discard it so the room returns to a clear, usable state.

### Story 5.1: Start a Battle `[TODO]`

As a player,
I want to create a battle for my room when no battle is active,
So that the group has a shared battle state to use for the current encounter.

**Acceptance Criteria:**

**Given** no battle is currently active in the room
**When** I start a battle from the Room View
**Then** a new battle is created for that room with status `active`
**And** the battle can include a user-provided name or a generated default name
**And** only one active battle is allowed per room

**Given** a battle is already active in the room
**When** I attempt to start another battle
**Then** the app does not create a second active battle
**And** I am routed to the existing active battle instead

**Given** a battle has been created successfully
**When** the creation completes
**Then** the Battle View opens with the active battle state loaded
**And** the active battle can be retrieved by room using the active-battle query contract

### Story 5.2: Show Active Battle in Room View `[TODO]`

As a player,
I want the Room View to clearly show when a battle is active,
So that I can tell the room is in battle state and return to it quickly.

**Acceptance Criteria:**

**Given** an active battle exists for the room
**When** I view the Room View
**Then** an `ActiveBattleBanner` is shown in the character list header
**And** the banner displays the battle name when one is available
**And** the banner includes a `View Battle` action

**Given** I tap `View Battle` from the active battle banner
**When** the action is triggered
**Then** I am navigated to the Battle View for the current active battle
**And** the Battle View shows the latest available battle state

**Given** no battle is active for the room
**When** I view the Room View
**Then** no active battle banner is shown
**And** the battle entry point remains available for starting a battle

**Given** I reconnect or reopen the app during an active room session
**When** the Room View loads
**Then** it checks for an active battle for the room
**And** it reflects that state in the banner without automatically forcing navigation into the Battle View

> **Covers:** UX-DR10
> **Depends on:** Stories 3.1, 3.2

### Story 5.3: Manage Battle State `[TODO]`

As a player,
I want to manage the players, monsters, and bonuses in an active battle,
So that the battle state stays accurate as play changes.

**Acceptance Criteria:**

**Given** I am in the Battle View for an active battle
**When** the screen loads
**Then** I see separate player and monster sides
**And** the current totals or outcome comparison for both sides is visible

**Given** I am managing the player side
**When** I add or remove room characters
**Then** the battle state updates to reflect the selected participants

**Given** I am managing the monster side
**When** I add or remove monsters
**Then** the battle state updates to reflect the selected monsters

**Given** I am managing either side
**When** I add or remove bonus items
**Then** the battle state updates to reflect those modifiers
**And** bonus items are removed and re-added rather than edited in place

**Given** I save a battle-state change
**When** the update is submitted
**Then** the full updated side state is persisted for the active battle
**And** only active battles can be updated

> **Covers:** UX-DR13
> **Depends on:** Stories 3.1, 3.2

### Story 5.4: Realtime Battle Updates from Battle Actions `[TODO]`

As a player,
I want battle changes made by other players to appear in real time,
So that everyone sees the same current battle state during the encounter.

**Acceptance Criteria:**

**Given** a battle is started, updated, concluded, or discarded by another player
**When** that battle change is published for the room
**Then** connected clients in the room receive the corresponding `battle_*` realtime update
**And** existing non-battle realtime behaviour remains unaffected

**Given** another player changes the active battle
**When** I am viewing the Room View or Battle View
**Then** my screen updates to reflect the latest battle state
**And** the Room View banner remains accurate

**Given** realtime delivery is temporarily interrupted
**When** the Room View or Battle View restores battle state
**Then** the app reconciles to the latest active battle for the room
**And** it does not create duplicate active battle state in the UI

### Story 5.5: Realtime Battle Updates from Character Changes `[TODO]`

As a player,
I want the battle's player side to reflect character updates made in the room,
So that the battle stays aligned with the current state of participating characters.

**Acceptance Criteria:**

**Given** a character participating in the active battle is updated in the room
**When** that character update is received by the client
**Then** the Battle View updates that character's displayed battle information using the latest character state

**Given** a character participating in the active battle is deleted from the room
**When** that room change is received by the client
**Then** the Battle View removes that character from the displayed active player side
**And** the persisted battle record retains the original participation history

**Given** a character update is received for a room character that is not participating in the active battle
**When** the update is processed
**Then** the current Battle View state is unchanged

**Given** I return to the Battle View after room character changes were made
**When** the active battle state is shown
**Then** the displayed player-side character information is consistent with the latest room character state

### Story 5.6: Conclude a Battle `[TODO]`

As a player,
I want to conclude an active battle with an explicit result,
So that the room can leave battle state and preserve the outcome.

**Acceptance Criteria:**

**Given** an active battle exists
**When** I conclude the battle and choose a result
**Then** the battle is updated to status `concluded` with the selected result
**And** concluding the battle requires an explicit result value

**Given** a battle has been concluded successfully
**When** the update is applied
**Then** the room no longer shows an active battle banner
**And** players are returned to a clear non-battle room state

**Given** another player is connected to the same room
**When** the battle is concluded
**Then** their client receives the concluded battle update in real time
**And** the active battle UI is removed from their room state

### Story 5.7: Discard a Battle `[TODO]`

As a player,
I want to discard an active battle that should not remain in session state,
So that the room can recover cleanly from an invalid or abandoned battle.

**Acceptance Criteria:**

**Given** an active battle exists
**When** I choose to discard it
**Then** I must confirm the discard action before it is applied

**Given** I confirm the discard action
**When** the discard is submitted
**Then** the battle is updated to status `discarded`
**And** discarded battles can no longer be managed as active battles

**Given** a battle has been discarded successfully
**When** the update is applied
**Then** the room no longer shows an active battle banner
**And** players are returned to a clear non-battle room state

**Given** another player is connected to the same room
**When** the battle is discarded
**Then** their client receives the discarded battle update in real time
**And** the active battle UI is removed from their room state

## Epic 6: Room History

Players can review a chronological history of character events and battle outcomes in a dedicated room history view so the group can understand what happened earlier in the session and revisit completed battle details when needed.

### Story 6.1: Character Events Are Published for Room History `[TODO]`

As a player,
I want character creation, update, and removal events to appear in room history,
So that the group can understand how the session state changed over time.

**Acceptance Criteria:**

**Given** a character is created, updated, or deleted
**When** `character-service` processes the event
**Then** it publishes the event to both `NOTIFICATIONS_TOPIC_ARN` and `LOG_TOPIC_ARN` via `Promise.allSettled`
**And** a missing `LOG_TOPIC_ARN` in `character-service` emits a startup warning without crashing the service
**And** the published payload includes enough display context for room history summaries without outbound HTTP calls
**And** a failed publish to one topic does not prevent the other topic publish attempt from completing

### Story 6.2: Published Events Are Stored and Readable in Room History `[TODO]`

As a player,
I want published session events to be stored and returned in room history,
So that history entries are available when I open the room history view.

**Acceptance Criteria:**

**Given** the room history subscriber service is deployed with `logWriter` and `logReader`
**When** `logWriter` starts
**Then** if `LOG_TOPIC_ARN` is absent, the Lambda fails with an error because the subscriber cannot function without the topic configuration

**Given** `logWriter` receives a supported SNS event
**When** the event is processed
**Then** it writes a `LogEvent` document to MongoDB with the correct `roomId`, `type`, `summary`, and `createdAt`
**And** it handles `character_created`, `character_updated`, `character_deleted`, `battle_started`, `battle_concluded`, and `battle_discarded`
**And** unsupported event types are ignored without creating a log entry

### Story 6.3: Battle Lifecycle Events Are Published for Room History `[TODO]`

As a player,
I want battle start, conclusion, and discard events to appear in room history,
So that the group has a durable record of battle outcomes during the session.

**Acceptance Criteria:**

**Given** `log-service` is deployed and `LOG_TOPIC_ARN` is set
**When** a battle is created, concluded, or discarded
**Then** `battle-service` publishes to `LOG_TOPIC_ARN` via `Promise.allSettled` alongside `NOTIFICATIONS_TOPIC_ARN`
**And** the event payload includes sufficient display context such as battle name, result, and character names for room history summaries without outbound HTTP calls
**And** a failed publish to one topic does not prevent the other topic publish attempt from completing
**And** `battle_updated` is not published for room history

### Story 6.4: Room History API Returns Paginated Events `[TODO]`

As a player,
I want room history to load in pages,
So that I can review older session events without waiting for the full history to load.

**Acceptance Criteria:**

**Given** `logReader` receives a `GET /logs?roomId=X&limit=50&before=<_id>` request
**When** the request is processed
**Then** it returns log entries filtered strictly by `roomId` in reverse chronological order using cursor-based pagination via MongoDB `_id`
**And** the compound index `{ roomId: 1, _id: -1 }` is in place
**And** the `before` cursor is exclusive so the next page does not repeat the last item from the previous page
**And** an empty room history returns an empty list with no error
**And** an invalid or missing `roomId` returns a client error response
**And** the response shape is stable enough for the app to render entries and request the next page
**And** test coverage verifies persistence and HTTP reader filtering behavior

### Story 6.5: Room History Loads in the App `[TODO]`

As a player,
I want the app to load room history as I browse it,
So that I can move through recent and older session events without leaving the room flow.

**Acceptance Criteria:**

**Given** I open the Room History View
**When** the screen mounts
**Then** the app requests the first page of log entries for the active room
**And** scrolling to the bottom loads the next page using the server cursor
**And** if the request fails, I see a recoverable error state
**And** while a request is in progress, I see a loading state appropriate to the view

### Story 6.6: Room History View Shows Character Events `[TODO]`

As a player,
I want to review character-related room history entries,
So that I can understand how characters changed over the course of the session.

**Acceptance Criteria:**

**Given** I am in the Room View
**When** I navigate to the Room History View
**Then** I see a scrollable list of `LogEntry` components in reverse chronological order
**And** scrolling to the bottom loads older entries via cursor pagination

**Given** a `character_created` event entry
**When** it is displayed
**Then** it shows the character's avatar, name, and a "created" label

**Given** a `character_updated` event entry
**When** it is displayed
**Then** it shows the character's avatar, name, and all changed fields as individual `prev → new` rows — multiple field changes from a single update are each shown

**Given** a `character_deleted` event entry
**When** it is displayed
**Then** it shows the character's avatar, name, and a "removed" label

**Given** no events have been recorded yet
**When** I open the Room History View
**Then** I see the empty state message "No events recorded yet." with no CTA

**Given** room history cannot be loaded
**When** I open the Room History View
**Then** I see an error state with a retry action

> **Covers:** UX-DR12, UX-DR14
> **Depends on:** Stories 3.1, 3.2, 6.5

### Story 6.7: Room History View Shows Battle Events and Opens Completed Battles `[TODO]`

As a player,
I want to review battle-related room history entries and open completed battle details,
So that I can understand battle outcomes and revisit the full record when needed.

**Acceptance Criteria:**

**Given** a battle lifecycle entry (`battle_started`, `battle_concluded`, or `battle_discarded`)
**When** it is displayed
**Then** it shows the battle name (if set), the event type, and relevant context (result for concluded, "discarded" label for discarded)
**And** I can tap any completed battle entry to inspect the full battle record
**And** if battle record drill-in is unavailable, the entry is shown as non-interactive rather than failing silently

> **Covers:** UX-DR12, UX-DR14
> **Depends on:** Stories 3.1, 3.2, 6.5, Epic 5 completed battle record support

## Epic 7: Distribution, Availability & Release Operations

Users can access Munch Helper through web and mobile distribution channels, while the team can ship updates quickly and reliably through collaborative development workflows, automated deployment pipelines, and release-readiness operations.

### Story 7.1: Collaborative Release Foundation `[DONE]`

As a developer,
I want a shared release foundation for signing, secrets, infrastructure references, and release conventions,
So that multiple developers can contribute and ship without breaking the delivery workflow.

**Acceptance Criteria:**

**Given** a developer is preparing a release change
**When** they review the project release setup
**Then** the repository contains documented Fastlane lanes, signing approach, required secrets, and production infrastructure references
**And** iOS signing uses match-based certificate management
**And** the release setup is usable by more than one developer without relying on undocumented local machine state

### Story 7.2: Web Availability Pipeline `[DONE]`

As a user,
I want the current web version of Munch Helper to be deployed automatically,
So that the web channel stays available without manual release work.

**Acceptance Criteria:**

**Given** a push to the release branch
**When** the web release workflow runs
**Then** the web build completes successfully and is deployed to production
**And** the live web version reflects the current release branch state
**And** no manual deployment step is required to make the web release available

### Story 7.3: Automated iOS Delivery `[TODO]`

As a team,
I want the iOS pipeline to build, sign, and deliver the app to TestFlight automatically,
So that iOS releases are repeatable and do not depend on manual intervention.

**Acceptance Criteria:**

**Given** a push to the release branch
**When** the iOS GitHub Actions workflow runs
**Then** it invokes the configured Fastlane iOS lane
**And** match pulls the correct provisioning profiles and certificates using repository secrets
**And** a signed `.ipa` is produced and delivered to TestFlight
**And** the workflow fails with actionable logs if signing or delivery cannot be completed

### Story 7.4: Automated Android Delivery `[TODO]`

As a team,
I want the Android pipeline to build, sign, and deliver the app to the Play internal track automatically,
So that Android releases are repeatable and do not depend on manual intervention.

**Acceptance Criteria:**

**Given** a push to the release branch
**When** the Android GitHub Actions workflow runs
**Then** it invokes the configured Fastlane Android lane
**And** the keystore and Play credentials are correctly mapped from repository secrets
**And** a signed `.aab` is produced and delivered to the Play internal track
**And** the workflow fails with actionable logs if signing or delivery cannot be completed

### Story 7.5: Release-Facing Compliance Content `[TODO]`

As a user,
I want the privacy and support pages to reflect the current app behavior and support path,
So that I can trust the published release information and stores can review the app accurately.

**Acceptance Criteria:**

**Given** I open the privacy page from the app or its public URL
**When** the page loads
**Then** it reflects the current app scope including anonymous identity, session data, and room participation behavior
**And** the content is readable and accessible on supported screen sizes
**And** the URL is stable for store submission use

**Given** I open the support page from the app or its public URL
**When** the page loads
**Then** it reflects the current app features and provides a clear support path for the current release
**And** the content is readable and accessible on supported screen sizes

### Story 7.6: Cross-Platform Release Readiness Checklist `[TODO]`

As a team,
I want an explicit release-readiness checklist for the cross-platform core session experience,
So that we can decide whether a release is shippable based on defined criteria instead of assumptions.

**Acceptance Criteria:**

**Given** a candidate release
**When** the team runs the release-readiness review
**Then** there is a documented checklist covering iOS, Android, and web core session flows
**And** the checklist includes room, character, battle, log, and session-continuity validation
**And** the checklist captures known failure categories and release blockers clearly enough for go/no-go decisions

### Story 7.7: Release Channel Availability Validation `[TODO]`

As a user,
I want to be able to access the current release from each intended distribution channel,
So that the completed app is actually available where I expect to get it.

**Acceptance Criteria:**

**Given** a release has passed the readiness checklist
**When** channel availability is validated
**Then** the current release is reachable on the intended web, iOS, and Android distribution channels
**And** store or channel metadata does not misrepresent the supported core session experience
**And** no intended channel is treated as release-ready while missing a materially incomplete core workflow
