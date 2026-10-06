# Spec Delta

## Purpose

Players can open the rules guide matching their current room edition from a compact, accessible room header control.

## ADDED Requirements

### Requirement: Rules entry in room header
The room screen SHALL display a localized, accessible rules icon beside the room code and Copy control for Classic and Second Edition rooms. It SHALL omit the former full-width rules action from the room body and hide the icon on battle and history detail routes.

#### Scenario: Classic room rules
- **WHEN** a player activates the header rules icon in a Classic room
- **THEN** the Classic guide opens and Back returns to that room

#### Scenario: Second Edition room rules
- **WHEN** a player activates the header rules icon in a persisted Second Edition room
- **THEN** the Second Edition guide opens and Back returns to that room

#### Scenario: Detail header
- **WHEN** a player opens battle or history from either room edition
- **THEN** the detail header has no room rules icon

### Requirement: Compact and accessible room header
The room header SHALL keep its back action, room label and code, Copy control, and rules icon usable at the smallest supported width and with long localized room labels. The icon SHALL have a localized accessibility label and stable automation identifier.

#### Scenario: Narrow localized header
- **WHEN** a long supported room label is shown at iPhone SE width
- **THEN** the room code and Copy control remain visible and independently activatable beside the rules icon

#### Scenario: Screen reader focus
- **WHEN** assistive technology focuses the rules icon
- **THEN** it is announced as a button to open rules in the active language
