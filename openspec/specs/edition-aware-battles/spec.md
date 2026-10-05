# Edition-aware Battles

## Requirements

### Requirement: Battle guidance reflects the room edition
Second Edition battle presentation SHALL explain that player combat strength is compared with monster strength, one helper may assist, rewards wait until all monsters are resolved, shared victory can occur, and a Level 10 victory normally requires a kill. It SHALL explain the Warrior tie exception and six-player Level 10 restriction while treating cards and exceptions as player-managed.

#### Scenario: Present a Second Edition battle
- **WHEN** a player opens the battle composer in a 2e room
- **THEN** edition-aware guidance is visible and numeric strength alone is not represented as authoritative rules enforcement

#### Scenario: Record a player-reported outcome
- **WHEN** a player concludes or views a 2e battle
- **THEN** the UI presents the recorded outcome without claiming it was validated against untracked cards

#### Scenario: Preserve Classic battle behavior
- **WHEN** a player views an existing Classic battle or history entry
- **THEN** existing Classic rendering and outcome semantics remain unchanged
