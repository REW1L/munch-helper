## ADDED Requirements

### Requirement: Custom confirmation dialogs stay within the visible viewport

Custom confirmation dialogs SHALL be rendered in a viewport-level presentation container so that the backdrop covers the screen and the dialog remains visible, independent of the trigger component's position in the view hierarchy.

#### Scenario: Battle discard confirmation is centered on iOS

- **WHEN** a user opens the battle discard confirmation from the battle screen on iOS
- **THEN** the dialog appears within the visible device window with its backdrop covering the screen, and both the cancel and confirm actions are visible and tappable

#### Scenario: Confirmation dialog remains usable on web

- **WHEN** a user opens a custom confirmation dialog on web
- **THEN** the dialog remains centered in the viewport and backdrop interaction can cancel it
