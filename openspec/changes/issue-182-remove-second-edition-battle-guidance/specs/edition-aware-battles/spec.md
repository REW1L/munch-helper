# Spec Delta

## MODIFIED Requirements

### Requirement: Battle guidance reflects the room edition
Second Edition battle presentation SHALL explain that player combat strength is compared with monster strength, one helper may assist, rewards wait until all monsters are resolved, shared victory can occur, and a Level 10 victory normally requires a kill. It SHALL explain the Warrior tie exception and six-player Level 10 restriction while treating cards and exceptions as player-managed. The Second Edition Rules screen SHALL present this guidance; the battle composer SHALL omit the rules and notice block so players have more room for the battle editor. Numeric strength alone SHALL not be represented as authoritative rules enforcement.

#### Scenario: Present a Second Edition battle
- **WHEN** a player opens the Second Edition Rules screen
- **THEN** the combat rules and notice remain visible there

#### Scenario: Omit combat guidance from a Second Edition battle
- **WHEN** a player opens the battle composer in a Second Edition room
- **THEN** the combat rules and notice block is not displayed and the battle editor remains available

#### Scenario: Record a player-reported outcome
- **WHEN** a player concludes or views a Second Edition battle
- **THEN** the UI presents the recorded outcome without claiming it was validated against untracked cards

#### Scenario: Preserve Classic battle behavior
- **WHEN** a player views an existing Classic battle or history entry
- **THEN** existing Classic rendering and outcome semantics remain unchanged
