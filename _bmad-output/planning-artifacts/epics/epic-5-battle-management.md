# Epic 5: Battle Management

Players can create and resume a single active battle in a room, manage both sides of the battle in real time, and either conclude or discard it so the room returns to a clear, usable state.

## Story 5.1: Start a Battle `[TODO]`

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

## Story 5.2: Show Active Battle in Room View `[TODO]`

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

## Story 5.3: Manage Battle State `[TODO]`

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

## Story 5.4: Realtime Battle Updates from Battle Actions `[TODO]`

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

## Story 5.5: Realtime Battle Updates from Character Changes `[TODO]`

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

## Story 5.6: Conclude a Battle `[TODO]`

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

## Story 5.7: Discard a Battle `[TODO]`

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
