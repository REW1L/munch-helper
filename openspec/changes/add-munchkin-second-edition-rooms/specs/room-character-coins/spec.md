# Room Character Coins

## ADDED Requirements

### Requirement: Second Edition characters have room-scoped Gold Pieces
The system SHALL initialize a newly created character in a `munchkin-2e` room with 500 GP and SHALL expose a validated way to adjust the balance. Balances SHALL be nonnegative integers. Coin state SHALL remain separate from Classic character data and a character's balance in another room.

#### Scenario: Initialize a Second Edition character
- **WHEN** a default character is created for a Second Edition room
- **THEN** that room's character balance is 500 GP

#### Scenario: Adjust a balance
- **WHEN** an authorized room participant submits a nonzero integer `goldPiecesDelta` with the matching room id
- **THEN** the new balance is returned and published to room participants and history

#### Scenario: Apply concurrent adjustments
- **WHEN** two participants adjust the same balance before either client refreshes
- **THEN** both signed adjustments are applied atomically and neither update overwrites the other

#### Scenario: Reject invalid adjustment
- **WHEN** a mutation is non-integer, targets a character outside the room, or makes the balance negative
- **THEN** the mutation is rejected and state is unchanged

#### Scenario: Reject Classic character adjustments
- **WHEN** a coin adjustment targets a Classic character with no Second Edition balance
- **THEN** the request is rejected and no character update is written

#### Scenario: Initialize currency on the server
- **WHEN** a client creates a character with an explicit `goldPieces` value
- **THEN** the request is rejected; the server initializes new Second Edition characters at 500 GP

#### Scenario: Preserve Classic data
- **WHEN** a Classic room or historical Classic character is read
- **THEN** legacy gender and other character data remain unchanged and Classic UI does not present 2e coin controls

### Requirement: Coin changes synchronize across clients
Successful coin changes SHALL use the existing room notification and history paths so participants see updates live and after reconnect.

#### Scenario: Reconnect after a coin adjustment
- **WHEN** a participant reconnects after another participant changes a balance
- **THEN** refreshed character state contains the latest balance
