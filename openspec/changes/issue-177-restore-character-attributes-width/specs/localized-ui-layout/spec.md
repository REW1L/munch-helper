# Spec Delta

## ADDED Requirements

### Requirement: Character attribute boxes preserve room for tile content
Character tiles SHALL size the race/class/gender attributes box from its content and padding rather than reserving a fixed width. The box SHALL allow the avatar, nickname, level, strength, and any Second Edition Gold Pieces balance to retain usable space within the tile.

#### Scenario: Classic tile uses content-driven attribute sizing
- **WHEN** a Classic character tile is rendered
- **THEN** the attributes box has no fixed width or non-shrinking width rule and sizes to its content and padding

#### Scenario: Second Edition tile preserves room for stats
- **WHEN** a Second Edition character tile is rendered with a long nickname and a formatted Gold Pieces balance
- **THEN** the attributes box remains content-driven while the nickname, level, strength, and Gold Pieces remain in the shared tile row

#### Scenario: Narrow screen retains tile content
- **WHEN** either edition's character tile is rendered on a narrow screen
- **THEN** the attributes box does not reserve unnecessary fixed horizontal space for the avatar, nickname, and stats
