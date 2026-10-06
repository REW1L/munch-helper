# Design

## Context

The full Change Character modal already renders the destructive action inside its scrollable form. Web and iOS additionally render a second copy in the footer; the footer's Save and Cancel buttons share the row with that duplicate.

## Goals / Non-Goals

**Goals:**
- Keep one delete entry point in the form and preserve its existing confirmation and pending states.
- Keep the footer focused on Save and Cancel across platforms.
- Keep the web and iOS E2E paths able to reach and confirm deletion through the form.

**Non-Goals:**
- Change deletion behavior, confirmation copy, modal sizing, or other character editing controls.

## Decisions

- Remove only the platform-conditional footer delete button and its `webDeleteButton` style. The form button remains the single delete control and retains its stable `delete-character-button` test ID.
- Render the existing confirmation dialog beside the outer edit modal rather than nesting its modal presentation inside the edit modal. Web needs the dialog as a top-level modal; the nested presentation prevented the existing confirmation from becoming visible after tapping the form control.
- Update the dedicated Maestro deletion flow to scroll to and select that form control on web, iOS, and Android, then explicitly confirm through the existing dialog. This avoids depending on platform-specific duplicate test IDs or tapping a hard-coded screen coordinate.
- Add component regression assertions that the footer exposes Save and Cancel, platform-specific footer delete IDs are absent, and the confirmation presentation is outside the edit modal; retain existing tests that exercise confirmation and pending deletion.

## Risks / Trade-offs

- [Delete button is below the fold on smaller screens] → Keep it in the existing scroll view and make the Maestro flow scroll to it before tapping.
- [Platform E2E accessibility behavior differs] → Use the shared test ID and existing confirmation dialog test ID for each platform branch.
