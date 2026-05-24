# Epic 3: Character Management

Players can create, view, quick-edit, and remove characters. Includes prerequisite AppTheme token migration and Room View routing migration that gate Epics 5 and 6.

## Story 3.1: AppTheme Token Migration (technical prerequisite) `[TODO]` ⛔ Gate for Epics 5–6

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

## Story 3.2: Room View Routing Migration (technical prerequisite) `[TODO]` ⛔ Gate for Epics 5–6

As a developer,
I want `app/munchkin/[roomNumber].tsx` migrated to `app/munchkin/[roomNumber]/index.tsx`,
So that Battle View and Log View can be added as nested Expo Router routes.

**Acceptance Criteria:**

**Given** the current flat route `app/munchkin/[roomNumber].tsx`
**When** the migration is complete
**Then** the Room View is served from `app/munchkin/[roomNumber]/index.tsx` with identical behaviour
**And** all existing navigation to the room route continues to work without changes
**And** nested routes `battle/` and `log/` can be added under `[roomNumber]/` in future epics

## Story 3.3: Automatic Character Creation on Room Join `[DONE]`

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

## Story 3.4: Character Details View `[DONE]`

As a player,
I want to view my own character's full details within the room,
So that I can see all my stats and attributes at a glance.

**Acceptance Criteria:**

**Given** I have a character in the current room
**When** I view my character
**Then** I can see name, avatar, level, power, and all assigned classes, races, and genders
**And** multiple values per attribute (e.g. two classes) are displayed correctly
**And** my character is visually distinct from other players' characters

## Story 3.5: Room Character List `[DONE]`

As a player,
I want to see full attribute cards for all characters in the room,
So that I and others can track every character's complete state at a glance.

**Acceptance Criteria:**

**Given** there are one or more characters in the room
**When** I view the Room View
**Then** each character card displays name, avatar, level, power, and all classes, races, and genders
**And** my own character card is visually distinguished from others

## Story 3.6: Updated Character Card Styling `[TODO]`

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

## Story 3.7: Quick Character Stat Editing `[TODO]`

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

## Story 3.8: Realtime Update Signal on Character Cards `[TODO]`

As a player,
I want to see a brief visual flash on a character card when a realtime character update is received in the room,
So that I can immediately notice that the card data was refreshed.

**Acceptance Criteria:**

**Given** a character update is received via the room WebSocket
**When** the update is received via WebSocket
**Then** a border flash animates on that character's card using the character's own colour over 700ms, transitioning from the room surface border colour to the character colour and back to the room surface border colour
**And** multiple cards can flash concurrently without visual conflict
**And** when reduced motion is enabled, the border colour is applied immediately using the character colour and restored to the room surface border colour after 700ms with no interpolation
**And** locally initiated websocket echo updates from the same client are suppressed to avoid duplicate flashes

> **Covers:** UX-DR9
> **Depends on:** Stories 3.1, 3.6

## Story 3.9: Full Character Attribute Editing `[DONE]`

As a player,
I want to edit my character's name, class, race, gender, avatar, and colour via a full modal,
So that I can make complete changes to my character's identity during a session.

**Acceptance Criteria:**

**Given** I have a character in the current room
**When** I open the full character edit modal (via "Edit more…" in QuickEditSheet or directly)
**Then** I can update name, class, race, gender, avatar, and colour — including multiple values per attribute
**And** saving persists all changes and closes the modal
**And** `QuickEditSheet` and `ChangeCharacterModal` are never open simultaneously

## Story 3.10: Unassociated Character Removal `[TODO]`

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
