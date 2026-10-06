# Proposal

## Why

The full Change Character modal currently renders the same destructive action in both the scrollable form and the bottom action row on web and iOS. The duplicate sits beside Save and Cancel, making accidental deletion easier and crowding localized action labels on narrow screens.

## What Changes

- Remove the redundant web/iOS delete control from the bottom action row and its unused style.
- Keep character deletion available through the in-form button and existing confirmation dialog.
- Update the delete-character Maestro flow to use the in-form control on web, iOS, and Android, scrolling to it where necessary.
- Add regression coverage for the footer controls and retain the existing confirmation/deletion coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `localized-ui-layout`: the character edit modal action row contains only Save and Cancel, while the delete action remains in the scrollable form.

## Impact

- Affected code: `frontend/app/munchkin/modal-change-caracter.tsx` and its component tests.
- Affected E2E flow: `maestro/e2e/delete-character.yaml`.
- No API, dependency, or backend changes.
