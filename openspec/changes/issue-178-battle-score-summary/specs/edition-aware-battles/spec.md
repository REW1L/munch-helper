# Edition-aware Battles

## MODIFIED Requirements

### Requirement: Battle guidance reflects the room edition
Second Edition battle presentation SHALL explain that player combat strength is compared with monster strength, one helper may assist, rewards wait until all monsters are resolved, shared victory can occur, and a Level 10 victory normally requires a kill. It SHALL explain the Warrior tie exception and six-player Level 10 restriction while treating cards and exceptions as player-managed. The active battle screen SHALL also keep a summary visible outside the scrolling battle content, showing the player total, monster total, and current comparison outcome. It SHALL update from the current draft and room character state. A Classic tie favors monsters; in Second Edition, a tie favors players when a participating character has the Warrior role, and otherwise favors monsters. The summary SHALL remain accessible, localized in every supported locale, and must not cover battle controls or respect the device safe area.

#### Scenario: Present a Second Edition battle
- **WHEN** a player opens the battle composer in a 2e room
- **THEN** edition-aware guidance is visible and numeric strength alone is not represented as authoritative rules enforcement

#### Scenario: Record a player-reported outcome
- **WHEN** a player concludes or views a 2e battle
- **THEN** the UI presents the recorded outcome without claiming it was validated against untracked cards

#### Scenario: Preserve Classic battle behavior
- **WHEN** a player views an existing Classic battle or history entry
- **THEN** existing Classic rendering and outcome semantics remain unchanged

#### Scenario: Show both totals and outcome while scrolling
- **WHEN** a player views an active battle at any scroll position
- **THEN** both side totals and the current outcome remain visible together

#### Scenario: Update after a local draft edit
- **WHEN** a player changes a side's level, bonus, helper, or monster
- **THEN** the summary immediately reflects the updated totals and outcome

#### Scenario: Update after a remote character change
- **WHEN** room character state changes through a real-time update
- **THEN** the summary reflects the resulting player total and outcome

#### Scenario: Apply edition-aware tie resolution
- **WHEN** the totals are tied in a Classic room
- **THEN** the summary identifies monsters as winning
- **WHEN** the totals are tied in a Second Edition room and a participating character is a Warrior
- **THEN** the summary identifies players as winning
- **WHEN** the totals are tied in a Second Edition room without a participating Warrior
- **THEN** the summary identifies monsters as winning

#### Scenario: Keep summary usable on all supported platforms
- **WHEN** the battle screen is shown on iOS, Android, or web
- **THEN** the summary respects bottom safe-area insets, does not obscure actions, fits small screens and long translations, and announces both totals and outcome through accessibility
