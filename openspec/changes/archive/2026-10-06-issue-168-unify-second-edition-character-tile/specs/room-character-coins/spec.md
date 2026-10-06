# Room Character Coins

## Modified Requirements

### Requirement: Second Edition characters have room-scoped Gold Pieces
The system SHALL initialize a newly created character in a `munchkin-2e` room with 500 GP and SHALL expose a validated way to adjust the balance. Balances SHALL be nonnegative integers. Coin state SHALL remain separate from Classic character data and a character's balance in another room. The room card SHALL display the balance inline with level and strength in the same stat style, and Second Edition coin adjustments SHALL be available through Quick Edit and the full Change Character modal. Classic rooms SHALL not present coin editing.

#### Scenario: Initialize a Second Edition character
- **WHEN** a default character is created for a Second Edition room
- **THEN** that room's character balance is 500 GP

#### Scenario: Adjust a balance
- **WHEN** an authorized room participant submits a valid coin adjustment
- **THEN** the new balance is returned and published to room participants and history

#### Scenario: Adjust a balance from Quick Edit
- **WHEN** a participant edits a Second Edition character's balance in Quick Edit and saves a nonnegative integer balance
- **THEN** the balance is updated through the existing coin delta contract and shown inline beside level and strength

#### Scenario: Adjust a balance from full character edit
- **WHEN** a participant edits a Second Edition character's balance in the full Change Character modal and saves a nonnegative integer balance
- **THEN** the balance is updated through the existing coin delta contract

#### Scenario: Reject invalid adjustment
- **WHEN** a mutation is non-integer, targets a character outside the room, or makes the balance negative
- **THEN** the mutation is rejected and state is unchanged

#### Scenario: Preserve Classic data
- **WHEN** a Classic room or historical Classic character is read
- **THEN** legacy gender and other character data remain unchanged and Classic UI does not present 2e coin controls

### Requirement: Coin changes synchronize across clients
Successful coin changes SHALL use the existing room notification and history paths so participants see updates live and after reconnect.

#### Scenario: Reconnect after a coin adjustment
- **WHEN** a participant reconnects after another participant changes a balance
- **THEN** refreshed character state contains the latest balance
