# Spec Delta

## Purpose

Let players discover and read concise, localized game guidance while preserving attribution to the authoritative rules source and avoiding copied rulebook content.

## ADDED Requirements

### Requirement: Game tile rules entry

Each game tile with an available guide SHALL expose a localized Rules action that opens that game's rules view without starting, creating, or joining a room.

#### Scenario: Open Munchkin Classic rules

- **WHEN** a player activates Rules on the Munchkin Classic tile
- **THEN** the app opens the Munchkin Classic rules view
- **AND** no room modal is opened and no room mutation is attempted

#### Scenario: Rules action remains usable on a small screen

- **WHEN** the Games screen is displayed at the smallest supported viewport width
- **THEN** the Rules, Create, and Join actions remain visible, readable, and independently activatable

### Requirement: Game overview and structured guide

The Munchkin Classic rules view SHALL provide an original game description and concise guidance covering the objective and victory, setup, turn sequence, characters and cards, combat, items and trading, help, running away and death, and curses.

#### Scenario: Player reads the complete guide

- **WHEN** a player opens the Munchkin Classic rules view and scrolls through it
- **THEN** every required topic is presented under a distinguishable heading
- **AND** all content remains reachable on the smallest supported screen

#### Scenario: General and card-specific rules differ

- **WHEN** a player reads the guide's explanation of rule priority
- **THEN** the guide explains in original wording that explicit card instructions take precedence over the general guide

### Requirement: Copyright-safe rules summary

The in-app guide SHALL describe gameplay in newly authored language and MUST NOT reproduce rulebook artwork, extended examples, or substantial rulebook prose. It SHALL identify itself as a summary and direct players to the official rulebook for authoritative details.

#### Scenario: Guide content is reviewed against the source

- **WHEN** the in-app guide is compared with the official rulebook
- **THEN** it communicates the required mechanics through paraphrase rather than copied passages
- **AND** it contains no images or extended worked examples from the rulebook

### Requirement: Attributed official source

The rules view SHALL name the official Munchkin Classic rulebook as its source and provide an accessible external link to `https://munchkin.game/site-munchkin/assets/files/1138/munchkin_rules-1.pdf`.

#### Scenario: Open official source

- **WHEN** a player activates the source link
- **THEN** the app asks the platform to open the official PDF URL

#### Scenario: Source link is announced

- **WHEN** assistive technology focuses the source link
- **THEN** it is announced as a link to the official Munchkin Classic rulebook PDF

### Requirement: Localized and accessible rules experience

The Rules action, rules screen title, description, guide headings and body text, summary notice, and source attribution SHALL use the active app language and expose meaningful accessibility semantics.

#### Scenario: Read rules in a supported language

- **WHEN** a player opens the rules view with any supported language active
- **THEN** the complete rules experience renders in that language without missing, extra, or empty catalog values

#### Scenario: Navigate the rules view with assistive technology

- **WHEN** a player uses a screen reader on the rules view
- **THEN** the screen exposes its title and section headings as headings and identifies the official-source control as a link
