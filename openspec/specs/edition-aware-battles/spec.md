# Edition-aware Battles

## Requirements

### Requirement: Battle guidance reflects the room edition
Second Edition battle presentation SHALL explain that player combat strength is compared with monster strength, one helper may assist, rewards wait until all monsters are resolved, shared victory can occur, and a Level 10 victory normally requires a kill. It SHALL explain the six-player Level 10 restriction while treating cards and exceptions as player-managed. The live battle score in both editions SHALL show players winning a tie when any active player-side participant, including a helper, has the Warrior class; matching SHALL ignore surrounding whitespace and letter case. The comparison label and tone SHALL agree with that outcome. A tie without a Warrior SHALL remain a monster win. This is guidance only, and players continue to record outcomes themselves.

#### Scenario: Present a Second Edition battle
- **WHEN** a player opens the battle composer in a 2e room
- **THEN** edition-aware guidance is visible and numeric strength alone is not represented as authoritative rules enforcement

#### Scenario: Record a player-reported outcome
- **WHEN** a player concludes or views a 2e battle
- **THEN** the UI presents the recorded outcome without claiming it was validated against untracked cards

#### Scenario: Warrior wins a Classic tie
- **WHEN** a Classic battle has equal player and monster totals and an active participant is a Warrior
- **THEN** the score summary shows Players Win and the comparison indicates the player side is ahead

#### Scenario: Warrior wins a Second Edition tie
- **WHEN** a Second Edition battle has equal player and monster totals and an active participant is a Warrior
- **THEN** the score summary shows Players Win and the comparison indicates the player side is ahead

#### Scenario: Helping Warrior wins a tie
- **WHEN** a tie includes a Warrior in a helper slot among the active player-side participants
- **THEN** the score summary treats the player side as winning

#### Scenario: Non-Warrior tie
- **WHEN** a battle has equal totals and no active player-side participant is a Warrior
- **THEN** the comparison remains Even and the score summary shows Monsters Win
