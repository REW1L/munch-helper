## Modified Requirements

### Requirement: Battle guidance reflects the room edition
The live battle score SHALL treat a tie as a player win in both Classic and Second Edition when any active player-side participant, including a helper, has the Warrior class. Warrior matching SHALL ignore leading/trailing whitespace and letter case. The comparison label and tone SHALL agree with the resulting outcome. A tie without a Warrior SHALL remain a monster win. This is guidance only; players continue to record battle outcomes themselves.

#### Scenario: Warrior wins a Classic tie
- **WHEN** a Classic battle has equal player and monster totals and an active participant is a Warrior
- **THEN** the score summary shows Players Win and the comparison label and tone indicate the player side is ahead

#### Scenario: Warrior wins a Second Edition tie
- **WHEN** a Second Edition battle has equal player and monster totals and an active participant is a Warrior
- **THEN** the score summary shows Players Win and the comparison label and tone indicate the player side is ahead

#### Scenario: Helping Warrior wins a tie
- **WHEN** a tie includes a Warrior in a helper slot among the active player-side participants
- **THEN** the score summary treats the player side as winning

#### Scenario: Class value has surrounding whitespace or different case
- **WHEN** a participating class value contains `Warrior` with surrounding whitespace or different letter case
- **THEN** it is recognized as the Warrior class for tie guidance

#### Scenario: Non-Warrior tie
- **WHEN** a battle has equal totals and no active player-side participant is a Warrior
- **THEN** the comparison label remains Even and the score summary shows Monsters Win

#### Scenario: Present a Second Edition battle
- **WHEN** a player opens the battle composer in a 2e room
- **THEN** edition-aware guidance is visible and numeric strength alone is not represented as authoritative rules enforcement

#### Scenario: Record a player-reported outcome
- **WHEN** a player concludes a battle after viewing the score guidance
- **THEN** the selected player-reported result is recorded without being validated against the displayed totals
