# Room Editions

## ADDED Requirements

### Requirement: Rooms persist a supported game edition
The system SHALL persist either `munchkin` (Classic) or `munchkin-2e` (Second Edition) as a room's type. Creation requests that omit the type SHALL continue to create `munchkin` rooms. Unsupported types SHALL be rejected with the existing message-shaped client error.

#### Scenario: Legacy room creation defaults to Classic
- **WHEN** a caller creates a room without `roomTypeId`
- **THEN** the room is persisted and returned as `munchkin`

#### Scenario: Second Edition creation
- **WHEN** a caller creates a room with `roomTypeId` `munchkin-2e`
- **THEN** the persisted room and create response identify `munchkin-2e`

#### Scenario: Unsupported edition
- **WHEN** a caller submits any unsupported room type
- **THEN** creation returns a 400 response with the established `{ message }` error shape

### Requirement: Join and restore resolve the persisted edition
The system SHALL return the persisted room type from every successful room association response, including repeated joins. The frontend SHALL route and restore sessions according to this persisted type, regardless of the tile or client-supplied intent.

#### Scenario: Join a Second Edition room from either tile
- **WHEN** a player joins a valid `munchkin-2e` room code
- **THEN** the response identifies `munchkin-2e` and the client opens its Second Edition room

#### Scenario: Rejoin is idempotent and edition-aware
- **WHEN** an already associated player joins again
- **THEN** no duplicate character is created and the stored edition is returned

#### Scenario: Restore a Classic session
- **WHEN** a saved session is restored for a legacy `munchkin` room
- **THEN** the client opens Classic with its existing character data and behavior

#### Scenario: Wait for metadata before automatic character creation
- **WHEN** a room screen loads without an edition route hint and room metadata is still pending
- **THEN** the client does not auto-create a Classic character until the server confirms the room edition

### Requirement: Room loading screen names only a known edition
While a room is being created or joined, the loading screen header SHALL name the edition the client knows: the requested type when creating (Classic when none is requested) and the route's room type hint when joining. A join without a hint SHALL show a neutral title rather than assuming Classic.

#### Scenario: Creating a Second Edition room
- **WHEN** the loading screen opens to create a room with `roomTypeId` `munchkin-2e`
- **THEN** its header reads `Munch ⚔️` followed by the localized Second Edition label

#### Scenario: Creating a Classic room
- **WHEN** the loading screen opens to create a room with `roomTypeId` `munchkin` or no type
- **THEN** its header reads `Munch ⚔️` followed by the localized Classic label

#### Scenario: Joining a room of unknown edition
- **WHEN** the loading screen opens to join a room code without a room type hint
- **THEN** its header reads `Munch ⚔️` without an edition label, including when the join fails
