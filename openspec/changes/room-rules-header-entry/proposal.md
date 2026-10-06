# Proposal

## Why

The Second Edition room's rules button uses a full row beneath the main actions, and Classic rooms cannot open their guide from inside a room. Issue #169 calls for a compact, consistent entry in the room header.

## What Changes

- Put a rules icon button in the room header for Classic and Second Edition rooms and remove the 2e body button.
- Open the guide matching persisted room edition; hide the icon on battle and history detail routes.
- Keep the room code and Copy control usable at narrow widths and with long localized labels.
- Add localized accessibility text, route coverage, and Maestro coverage for both editions.

## Capabilities

### New Capabilities

- `room-rules-navigation`: Edition-aware, accessible rules entry from a room header.

### Modified Capabilities

None.

## Impact

Frontend room routes, room header component, locale catalogs, route tests, Maestro flows, and frontend documentation. No backend or API change.
