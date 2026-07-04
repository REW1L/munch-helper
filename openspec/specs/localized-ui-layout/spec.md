# localized-ui-layout Specification

## Purpose

UI containers and controls must remain usable across all supported languages. Because localized text is often longer than the English source and the app ships many languages, layouts that were sized around fixed English strings can clip content or wrap button labels. This capability defines the layout-resilience guarantees: overflow content stays reachable (scrollable), and button labels stay on a single line by shrinking to fit rather than wrapping.

## Requirements

### Requirement: Overflowing modal content stays reachable via scrolling

Modals whose content can exceed the available viewport height SHALL allow the user to scroll to every control, on the smallest supported screen. Scroll containers MUST NOT constrain their scrollable content to the viewport height (e.g. via a fixed `height: '100%'` on the content container), because that disables scrolling and clips off-screen controls.

#### Scenario: Reaching all languages in the profile modal on a small screen

- **WHEN** the profile modal (`ChangeUserModal`) is open on an iPhone SE with all supported languages listed
- **THEN** the user can scroll the modal content to see and tap every language option, including the last one, and can reach the Save/Cancel actions

#### Scenario: Short content does not force scrolling

- **WHEN** the profile modal content fits within the viewport on a larger screen (e.g. iPhone 16)
- **THEN** the content is fully visible without clipping and without introducing unnecessary empty scroll space

### Requirement: Button labels stay on a single line by shrinking to fit

Button labels SHALL render on a single line across all supported languages. When a localized label is wider than its button, the label MUST shrink to fit rather than wrap to a second line, down to a defined minimum scale of the base font size; below that minimum the label truncates rather than wraps. This policy MUST be applied consistently to every button in the app through a shared label component, including the shared `VioletButton`. Buttons whose labels can exceed the available space MUST give the label a bounded width so the shrink-to-fit behavior can take effect rather than overflowing the layout.

#### Scenario: Longer localized label shrinks instead of wrapping

- **WHEN** a button renders a label that is longer than its English equivalent (for example German "Abbrechen" or Ukrainian "Скасувати" on a half-width modal action button)
- **THEN** the label stays on one line, shrinking its font size to fit within the button, and does not wrap to a second line

#### Scenario: Readability floor is preserved

- **WHEN** a localized label would need to shrink below the minimum font scale (0.75 of the base size) to fit
- **THEN** the label is held at the minimum scale and truncated rather than shrunk further or wrapped

#### Scenario: Short label renders unchanged

- **WHEN** a button renders a label that already fits at the base font size (for example English "Save")
- **THEN** the label renders at the base font size with no visible scaling or truncation

#### Scenario: Every button shares the single-line policy

- **WHEN** any button in the app renders its label, whether built from the shared `VioletButton` or an inline button style
- **THEN** it uses the shared shrink-to-fit label component so the single-line-with-shrink behavior is identical everywhere

#### Scenario: Buttons in a shared row bound their width so labels shrink

- **WHEN** multiple buttons share a horizontal row with limited space (for example the Rooms Create/Join buttons) and a localized label is wider than the button's share of that space
- **THEN** each button constrains its width to its share of the row and the label shrinks to fit within it, rather than the button growing to its content width and pushing the row off-screen
