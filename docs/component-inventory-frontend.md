# Component Inventory - Frontend

This is a categorized inventory of every React component the frontend ships, with their props and intent. Components live under `frontend/components/` (general) and `frontend/components/munchkin/` (munchkin-specific). Routes (`frontend/app/**`) are listed under [Architecture - Frontend](./architecture-frontend.md#routing-structure) and not duplicated here.

## App-shell Components

### `<RootErrorBoundary>` (`components/RootErrorBoundary.tsx`)

Class error boundary wrapping the entire route tree. Logs uncaught render errors to the console (`Unhandled app error:`) and renders a centered fallback with the error message. Reset is handled by reloading the app.

Props: `children: React.ReactNode`.

### `<ConfirmDialog>` (`components/ConfirmDialog.tsx`)

Cross-platform confirmation dialog. On native, it delegates to `Alert.alert` with destructive styling for the confirm action. On web, it renders an inline overlay modal with a backdrop press-to-cancel.

Props:
- `visible: boolean`
- `title: string`
- `message: string`
- `confirmLabel: string`
- `cancelLabel?: string` (default `"Cancel"`)
- `onConfirm: () => void`
- `onCancel: () => void`

Used by `BattleDiscardAction` and `modal-change-caracter.tsx`.

### `<VioletButton>` (`components/VioletButton.tsx`)

The standard CTA button used in the rooms tab and inside cards (the "Change" action). Single solid color, supports `disabled`.

Props: `title`, `onPress`, `disabled?`, `testID?`.

## Munchkin Layout / Header Components

### `<RoomHeaderTitle>` (`components/munchkin/RoomHeaderTitle.tsx`)

Renders the room code and a copy button in the navigation header. Used by `[roomNumber]/_layout.tsx` and `[roomNumber]/index.tsx`.

Props: `roomCode`, `buttonLabel`, `accessibilityLabel`, `onCopyPress`.

### `<ReconnectingBanner>` (`components/munchkin/ReconnectingBanner.tsx`)

Top-of-screen banner shown while the room WebSocket is reconnecting. Calls `AccessibilityInfo.announceForAccessibility('Reconnecting…')` when it mounts.

Props: `visible: boolean`. Returns `null` when `false`.

### `<ActiveBattleBanner>` (`components/munchkin/ActiveBattleBanner.tsx`)

Tap-to-open banner that appears under the room header when there is an active battle. Renders the battle name and a "View Battle →" affordance.

Props: `battleName?: string | null`, `onViewBattle: () => void`. `memo`-wrapped.

## Room Character Components

### `<RoomCharactersList>` (`components/munchkin/RoomCharactersList.tsx`)

`FlatList` that renders `RoomCharacterCard` for every character in the room. Displays loading, error, and action-error states; mounts a "Create a character" footer button. `memo`-wrapped.

Props:
- `characters: Character[]`
- `isLoading`, `errorMessage`, `actionError` - state pass-through
- `realtimeUpdateSignals: Record<string, number>` - per-character flash signal (incremented on remote updates)
- `isCreateBlocked: boolean` - disables the create button while a current-character delete is in flight
- `onCreateCharacter: () => void`
- `onChangePress: (character) => void`

### `<RoomCharacterCard>` (`components/munchkin/RoomCharacterCard.tsx`)

The card row for a single character. Shows the avatar, nickname, level/power, and a vertical scroll of `AttributeList`. Includes a "Change" CTA. Animates a colored border flash for 700ms when its `realtimeFlashSignal` increments (indicating a real-time update for this character). Reads `AccessibilityInfo.isReduceMotionEnabled` and substitutes a step-color fallback for users who request reduced motion. `memo`-wrapped.

Props:
- `character: RoomCharacter`
- `onChangePress: (character) => void`
- `realtimeFlashSignal?: number`

### `<CurrentCharacterFooter>` (`components/munchkin/CurrentCharacterFooter.tsx`)

Renders a sticky footer for the current user's own character. Same layout as `RoomCharacterCard` but always at the bottom of the screen. `memo`-wrapped.

Props: `character`, `onChangePress`.

### `<AttributeList>` (`components/munchkin/AttributeList.tsx`)

Renders the character's `race`, `gender`, and `class` arrays as a vertical list of compact text rows. `memo`-wrapped.

Props: `character: RoomCharacter`, `variant?: 'card' | 'footer'` (font/color tuning only).

### `<NativePicker>` (`components/munchkin/NativePicker.tsx` + `.ios.tsx`)

Picker abstraction with platform split. iOS uses `@expo/ui/swift-ui::Picker` (SwiftUI menu picker); other platforms use `@react-native-picker/picker`.

Props: `selectedValue`, `onValueChange`, `options: string[]`, `pickerKey: string`. The `<Select>` placeholder is built in.

### `<QuickEditSheet>` (`components/munchkin/QuickEditSheet.tsx`)

Bottom-sheet for editing only the current user's character `level`/`power`. Includes haptic feedback per step (`expo-haptics::ImpactFeedbackStyle.Light`), drag-to-dismiss with a `PanResponder`, a configurable error-flash border, and a "Edit more…" affordance to open the full edit modal.

Props:
- `visible: boolean`
- `character: RoomCharacter | null`
- `onClose: () => void`
- `onSave: (stats: { level, power }) => Promise<void>`
- `onOpenFullEdit: () => void`
- `hasErrorFlash: boolean`

The component reads `AccessibilityInfo.isReduceMotionEnabled` and substitutes instant transitions for the slide animations when reduced motion is on.

## Battle Components

### `<BattleSidePanel>` (`components/munchkin/BattleSidePanel.tsx`)

Renders one of the two battle sides (`players` or `monsters`) inside the battle modal. Self-contained: includes the participant list, the bonus list, the bonus-add buttons (`-10/-5/-2/-1/+1/+2/+5/+10`), and (for monsters) a modal "Add monster" dialog.

Props:
- `side: 'players' | 'monsters'`
- `title: string`
- `total: number` (computed by the parent)
- `toneColor: string` (theme color)
- `bonuses: BonusItem[]`
- For `players`: `activeParticipants`, `characters`, `selectedCharacterIds`, `removedCharacterIds`, `onAddCharacter`, `onRemoveCharacter`
- For `monsters`: `monsters`, `onAddMonster`, `onRemoveMonster`
- Always: `onAddBonus(value)`, `onRemoveBonus(bonusId)`

`memo`-wrapped. Removed characters render with strikethrough text and can be dropped from the draft via the same `onRemoveCharacter` callback.

### `<BattleConcludeAction>` (`components/munchkin/BattleConcludeAction.tsx`)

Conclude UI: two radio buttons (Players Win / Monsters Win) plus a "Conclude" CTA. Surfaces a "Save your changes before concluding" hint when the parent reports `dirtyHint`. `memo`-wrapped.

Props: `selectedResult`, `onSelectResult`, `onConclude`, `disabled`, `isConcluding`, `dirtyHint`.

### `<BattleDiscardAction>` (`components/munchkin/BattleDiscardAction.tsx`)

Discard CTA + ConfirmDialog wrapper. `memo`-wrapped.

Props: `onConfirmDiscard`, `confirmVisible`, `onRequestConfirm`, `onCancelConfirm`, `isDiscarding`.

### `<BattleHistoryModal>` (`components/munchkin/BattleHistoryModal.tsx`)

Read-only modal that opens when a user taps a `battle_concluded` or `battle_discarded` log entry that has a usable payload. Uses `useRoomCharacters` to resolve `characterIds` to nicknames, and renders the player and monster sides side-by-side along with bonuses and the result chip. `memo`-wrapped.

Props: `entry: LogEvent | null`, `roomId`, `userProfile`, `onClose`.

## Log Components

### `<LogEntry>` (`components/munchkin/LogEntry.tsx`)

Renders a single room-history row with one of four variants based on `entry.eventType`:

- `character_created` / `character_deleted`: avatar + name + action label + relative time.
- `character_updated`: avatar + name + a list of `field: prev → next` rows. Falls back to `entry.summary` when no diff is present.
- `battle_started`: sword glyph + battle name + "started".
- `battle_concluded` / `battle_discarded`: sword glyph + battle name + result chip (or "discarded"). Tappable when the payload is usable.

`memo`-wrapped. All variants set rich `accessibilityLabel` text including the relative time and (when applicable) the diff or result.

Props: `entry: LogEvent`, `onPress?: (entry) => void`.

Helper modules:
- `logEntryTime.ts::formatRelativeTime` - "just now / Nm ago / Nh ago / Nd ago".
- `logEntryBattle.ts::narrowBattlePayload` - strict type narrowing for battle payloads.
- `logEntryBattle.ts::hasUsableBattlePayload` - returns true when the payload has a `name`, `playerSide`, or `monsterSide`. Used to gate `LogEntry` interactivity.
- `logEntryBattle.ts::getBattleResultLabel` - "Players Win" / "Monsters Win" / fallback.
- `logEntryBattle.ts::formatSignedValue` - `+5` / `-3` formatting for bonuses.

## Modals (under `app/`)

These render as React Native `Modal` components but live alongside their consuming routes for clarity. They do not register as Expo Router routes:

| Modal | File | Purpose |
|---|---|---|
| `ChangeAvatarModal` | `app/main/modal-change-avatar.tsx` | 10-cell avatar grid picker. |
| `ChangeUserModal` | `app/main/modal-change-user.tsx` | Edit nickname; opens `ChangeAvatarModal`. |
| `ShopModal` | `app/main/modal-shop.tsx` | Coin shop placeholder; currently disabled in `rooms.tsx`. |
| `RoomCreateModal` | `app/main/modal-room-create.tsx` | "Create a room for {game}?" confirmation. |
| `RoomJoinModal` | `app/main/modal-room-join.tsx` | Room code input. |
| `CreateCharacterModal` | `app/munchkin/modal-create-character.tsx` | New character form (color, name, gender). |
| `ChangeCharacterModal` | `app/munchkin/modal-change-caracter.tsx` (sic) | Full edit modal. Renders dropdowns for class/race, level/power steppers, color picker, gender radio, and a destructive delete with `ConfirmDialog`. |

## Categorization Summary

| Category | Components |
|---|---|
| Layout / Shell | `RootErrorBoundary`, `RoomHeaderTitle`, `ReconnectingBanner`, `ActiveBattleBanner` |
| Form / Input | `VioletButton`, `ConfirmDialog`, `NativePicker`, `QuickEditSheet`, modals (Change*, Create*, Join*) |
| Display | `AttributeList`, `RoomCharacterCard`, `CurrentCharacterFooter`, `LogEntry` |
| Lists | `RoomCharactersList`, log FlatList in `app/munchkin/[roomNumber]/log.tsx` |
| Modals (route-owned) | `RoomCreateModal`, `RoomJoinModal`, `ChangeUserModal`, `ChangeAvatarModal`, `ShopModal`, `CreateCharacterModal`, `ChangeCharacterModal`, `BattleHistoryModal` |
| Battle composer | `BattleSidePanel`, `BattleConcludeAction`, `BattleDiscardAction` |

## Theming

All visual decisions go through `frontend/constants/theme.ts::AppTheme`. Components consume:

- `AppTheme.colors.*` (background, surface, surfaceWarm, surfaceSubtle, elevated, accent, danger, actionSecondary, textPrimary, textMuted, textAccentSoft, parchment*).
- `AppTheme.spacing.*` (xs/sm/md/lg/xl).
- `AppTheme.radius.*` (sm/md/lg/pill).
- `AppTheme.typography.*` (caption, labelSm, labelMd).

`Fonts` (`Platform.select`) provides `sans/serif/rounded/mono` registers for iOS/web/default.

The brand accent is `#D4C26E` (warm gold), the danger is `#922525` (deep red), and the action-secondary is `#6E6BD4` (violet, used for the `<VioletButton>`).

## Reusable Patterns

- Components prefer flat composition (no deeply nested HOCs).
- All animations check `AccessibilityInfo.isReduceMotionEnabled` and provide a static fallback.
- Touch targets are at least 44pt; even compact controls (e.g., bonus buttons) honor that minimum.
- Test ids follow the `kebab-case-feature` convention (`character-card`, `change-character-button`, `battle-comparison-label`, `monster-name-input`, etc.) and are intentionally exposed for Maestro flows under `maestro/`.
