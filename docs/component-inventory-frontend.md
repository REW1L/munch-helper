# Frontend Component Inventory

Generated: 2026-03-19T22:50:33Z

## Shared Components

| Component | Category | Purpose |
| --- | --- | --- |
| `RootErrorBoundary.tsx` | Error boundary | Catches rendering/runtime failures at the app shell |
| `VioletButton.tsx` | Primitive | Shared button styling and behavior |

## Munchkin Domain Components

| Component | Category | Purpose |
| --- | --- | --- |
| `AttributeList.tsx` | Display | Renders character attributes and stats |
| `CurrentCharacterFooter.tsx` | Status/footer | Shows the active character summary/actions |
| `NativePicker.tsx` | Form input | Picker abstraction for native selection UI |
| `RoomCharacterCard.tsx` | Card/list item | Displays a room participant character |
| `RoomCharactersList.tsx` | Collection | Lists characters visible in a room |

## Hook-Level UI Orchestration

The frontend keeps a notable amount of behavior in hooks rather than heavyweight container components:

- `useUser.ts`
- `UseRoom.ts`
- `useCharacters.ts`
- `useRoomWebSocket.ts`

That split means the visible component inventory is intentionally small while room behavior lives in stateful orchestration modules.
