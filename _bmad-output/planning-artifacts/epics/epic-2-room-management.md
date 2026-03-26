# Epic 2: Room Management

Players can create and join rooms, access room entry information, re-enter a session without creating duplicate state, and copy the room code instantly to share with latecomers.

## Story 2.1: Room Creation `[DONE]`

As a host,
I want to create a new game room,
So that my group has a shared session space to play in.

**Acceptance Criteria:**

**Given** I am on the rooms view
**When** I tap "Create Room"
**Then** a new room is created and I am navigated to the room view as the host
**And** a unique room code is generated for the room

## Story 2.2: Room Code Visibility `[DONE]`

As a host,
I want the room code to be visible at any point during the session,
So that players who arrive late can still get the code to join.

**Acceptance Criteria:**

**Given** I am inside an active room
**When** I view the room
**Then** the room code is visible without any additional navigation or extra steps
**And** the code remains accessible throughout the session

## Story 2.3: Room Joining `[DONE]`

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

## Story 2.4: Session Re-entry Without Duplicate State `[DONE]`

As a player,
I want to re-enter a room I previously left or was disconnected from,
So that I can rejoin the session without creating a duplicate or conflicting presence.

**Acceptance Criteria:**

**Given** I previously joined a room and have since left or been disconnected
**When** I re-enter the room using the same room code
**Then** I rejoin without creating a duplicate participant record
**And** the room state I left is still intact for the other participants

## Story 2.5: Room Code Copy-to-Clipboard via Header Button `[TODO]`

As a player inside a room,
I want to tap a copy button next to the room code to copy it instantly,
So that I can share the code with latecomers without manually selecting or retyping it.

**Acceptance Criteria:**

**Given** I am inside an active room
**When** I view Room View in any state (empty, pre-game, or in-game)
**Then** the room code and inline copy button are visible in Room View `Stack.Screen` header options (same visual layer as the title)
**And** the room "label" (e.g. "Room") is styled with the `labelMd` token
**And** the room code is styled with `accent` color and remains available regardless of room content state
**And** the button is accessible: `accessibilityLabel="Copy room code [code]"`, `accessibilityRole="button"`

**Given** I tap the copy button
**When** the tap is registered
**Then** the room code is copied to the device clipboard via `expo-clipboard`
**And** the button label changes to "Copied ✓" for 1500ms then resets — no toast

**Given** I am using a screen reader
**When** I focus the copy button
**Then** the accessibility label announces the full room code

> **Covers:** UX-DR3
