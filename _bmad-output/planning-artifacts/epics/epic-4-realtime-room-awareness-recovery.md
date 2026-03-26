# Epic 4: Realtime Room Awareness & Recovery

Players stay in sync with live room state, see a visual indicator when connectivity drops, and can recover from disconnections or resume from background without losing context.

## Story 4.1: Live Room State Synchronisation `[DONE]`

As a player in an active room,
I want changes made by other players to appear in my view automatically,
So that I always see the current room state without manually refreshing.

**Acceptance Criteria:**

**Given** I am inside an active room
**When** another player makes a change (character update, room event)
**Then** my Room View reflects the updated state without any manual action on my part
**And** I do not need to leave and re-enter the room to see the latest state

## Story 4.2: Graceful Room Exit `[DONE]`

As a player,
I want to leave a room without disrupting the session for others,
So that the room remains intact and usable after I exit.

**Acceptance Criteria:**

**Given** I am in an active room
**When** I leave the room
**Then** I am returned to the rooms view
**And** the room continues to function normally for remaining participants
**And** my characters and session contributions remain in the room state

## Story 4.3: Reconnection & Session Restore `[TODO]`

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

## Story 4.4: Reconnecting Banner `[TODO]`

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

## Story 4.5: Late-Join Context Awareness `[TODO]`

As a player joining a room mid-session,
I want to immediately see the current room state including active characters,
So that I can understand what's happening and participate without confusion.

**Acceptance Criteria:**

**Given** a room has active characters
**When** I join the room
**Then** I see the current character list with all attributes fully visible

## Story 4.6: Reduced Motion Support `[TODO]`

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
