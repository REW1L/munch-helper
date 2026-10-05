# Munchkin Second Edition Guide

## Requirements

### Requirement: Second Edition surfaces identify the edition and provide guidance
The system SHALL identify Second Edition rooms in create/join confirmation, room header, and rules entry points. It SHALL provide a localized original guide and a prominent link to the official Second Edition rules PDF.

#### Scenario: Open Second Edition guidance
- **WHEN** a player opens rules from a Second Edition room
- **THEN** the guide identifies 2e and links to the official PDF

#### Scenario: Guide covers edition-specific topics
- **WHEN** the guide is displayed
- **THEN** it summarizes setup, turn phases, coin economy, Roles, combat/help/shared victory, running away/death, and the six-player Level 10 exception in original concise language

#### Scenario: Guide preserves tabletop boundaries
- **WHEN** players read the guide
- **THEN** it makes clear the companion does not simulate physical cards or enforce card-specific exceptions

### Requirement: Localized guidance remains usable
The guide SHALL be translated across supported catalogs and fit small screens with accessible controls and reduced-motion behavior.

#### Scenario: Switch supported language
- **WHEN** a player switches locale
- **THEN** all guide labels and content use that locale without missing keys
