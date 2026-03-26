# Requirements Inventory

## Functional Requirements

FR1: New users can enter the product without prior account setup.
FR2: Users can establish and retain a usable player identity for future sessions.
FR3: Users can update their visible player profile information.
FR4: Users can enter the app and begin a game session from any supported platform.
FR5: Users can create a new room for a supported game session.
FR6: Users can join an existing room using room-specific entry information.
FR7: Users can re-enter an existing session without creating conflicting or duplicate participation state.
FR8: Players in a room can see the current participants in that room.
FR9: Players in a room can see a shared view of room state relevant to the current session.
FR10: The product can preserve room participation state during an active connected session.
FR11: Users can leave a room and return to the broader app flow without breaking room integrity for others.
FR12: Hosts and joining players can rely on room setup and room entry as the starting point for the full session experience.
FR13: A player can create a character for use within a room.
FR14: A player can view their own character details within the room context.
FR15: Players in a room can view summaries of other room characters.
FR16: A player can update the mutable attributes of a character during a session.
FR17: The product can maintain character ownership or association within the room context.
FR18: The product can prevent room state from becoming confusing or unusable because of duplicate or conflicting character records.
FR19: A player can remove or otherwise end the active use of a character when that character is no longer part of the session.
FR20: Players can initiate a battle within an active room.
FR21: A battle can be named or otherwise identified within the session context.
FR22: Users can add battle participants and opposing forces to an active battle.
FR23: Users can adjust battle-relevant values during the course of a battle.
FR24: Users can view the current state of an in-progress battle.
FR25: Users can determine the outcome or current result state of a battle.
FR26: Users can conclude a battle and preserve its outcome as part of the room session record.
FR27: Users can discard or abandon a battle that should not remain part of the active session state.
FR28: Users can return to and continue an active battle within the same room session while that battle remains active.
FR29: Users can access a room-level history of meaningful session events.
FR30: Users can review character creation events in room history.
FR31: Users can review character change events in room history.
FR32: Users can review battle summaries in room history.
FR33: Users can open or inspect completed battle records from the room history.
FR34: Users can use room history to identify prior character events and completed battle outcomes within the room context.
FR35: Changes to relevant room state can become visible to participants during an active session.
FR36: Players can remain aware of room changes without manually rebuilding state from scratch.
FR37: Users can recover from temporary disconnection, app restart, or delayed state refresh without losing the ability to continue the session.
FR38: A player joining late can understand the current room and gameplay context well enough to participate.
FR39: The product can restore sufficient current room context after reconnection or delayed refresh for users to continue an active session.
FR40: The core session loop can be completed on iOS.
FR41: The core session loop can be completed on Android.
FR42: The core session loop can be completed on web.
FR43: Users can access core room, character, battle, and log capabilities on each supported platform.
FR44: Users can complete the documented core session workflow on each supported platform.
FR45: Support and maintenance workflows can identify when failures occur in core room, character, battle, log, or session-continuity flows.
FR46: Support and maintenance workflows can distinguish whether a core session failure is related to room state, character state, battle state, log history, or session continuity.
FR47: The product can be reviewed against an explicit release-readiness checklist for the completed cross-platform session experience.
FR48: The product can be prepared for app store distribution without excluding any core documented user workflow.

## NonFunctional Requirements

NFR1: Core room-entry actions, including create and join, shall complete within 3 seconds under normal supported conditions.
NFR2: Character updates, battle interactions, and room-log access shall complete within 2 seconds under normal supported conditions.
NFR3: Recovery from reconnect or delayed refresh shall restore usable room context within 5 seconds under normal supported conditions.
NFR4: The product shall preserve the integrity of active room, character, battle, and log state during normal connected use.
NFR5: Temporary disconnections or refresh interruptions shall not commonly result in duplicate participation state, lost battle continuity, or unusable room history.
NFR6: Core session flows shall remain dependable across iOS, Android, and web for the supported release scope.
NFR7: The core session workflow shall be release-validated on iOS, Android, and web.
NFR8: No supported platform shall ship with a materially incomplete version of the documented core session workflow.
NFR9: Release approval for this increment shall require parity of the core room, character, battle, and log experience across all supported platforms.
NFR10: Core session failures shall be diagnosable through clear product behaviors and observable failure boundaries.
NFR11: Release readiness shall be assessed through an explicit checklist covering the completed cross-platform session experience.
NFR12: Newly completed battle, log, and recovery flows shall be covered by regression-oriented validation before release.
NFR13: User and session data shall be protected in transit and at rest using standard security practices appropriate to a consumer companion application.
NFR14: The product shall avoid exposing one player's room or session data outside the intended room context.
NFR15: The next phase shall not introduce unnecessary data collection or permission requests beyond what is required for the supported core experience.
NFR16: Core user flows shall remain operable and understandable for a broad public audience across supported platforms.
NFR17: Users shall be able to enter rooms, manage characters, run battles, and review logs without avoidable accessibility barriers in the supported release scope.

## Additional Requirements

- **No external starter template**: This is a brownfield project with a fully established stack. New services scaffold from existing services (battle-service scaffolds from character-service; log-service scaffolds from room-notifications-service + character-service hybrid).
- **New backend services**: Two new AWS Lambda microservices must be built — `battle-service` (HTTP API) and `log-service` (SNS subscriber `logWriter` + HTTP API reader `logReader`).
- **SAM template additions**: New `BattleServiceFunction`, `LogWriterFunction` (SNS trigger), and `LogReaderFunction` (HTTP API) entries required in the SAM template.
- **IAM policy additions**: `battle-service` needs `sns:Publish` on `NOTIFICATIONS_TOPIC_ARN` + `LOG_TOPIC_ARN`; `character-service` adds `sns:Publish` on `LOG_TOPIC_ARN`; `log-service` needs `sns:Subscribe` on `LOG_TOPIC_ARN`.
- **Local Nginx routing**: Add `location /battles` and `location /logs` proxy entries.
- **Room View routing migration prerequisite**: `app/munchkin/[roomNumber].tsx` must be migrated to `app/munchkin/[roomNumber]/index.tsx` before Battle View and Log View can be added as nested Expo Router routes. This is step 0 of Room View enhancement.
- **AppTheme token migration prerequisite**: Migrate all hardcoded hex values in existing components to AppTheme tokens before building new screens — this is step 1 of the implementation sequence.
- **Dual-topic SNS fan-out**: character-service and battle-service must publish to both the notifications topic and the log topic using `Promise.allSettled` so a log topic failure does not block notifications.
- **Log event scope (ADR-5)**: `battle_updated` is NOT logged; log captures lifecycle events only (character_created, character_updated, character_deleted, battle_started, battle_concluded).
- **Battle mutation safety (ADR-8)**: Status guard (must be `active`) enforced on PATCH/DELETE/conclude; last-write-wins for concurrent PATCHes.
- **Log pagination (ADR-7)**: Cursor-based via MongoDB `_id`; compound index `{ roomId: 1, _id: -1 }` required.
- **Test coverage gate**: 70% coverage floor must be met before release. Battle-service primary targets: create/conclude/discard flows. Log-service primary targets: SNS handler writes correct document; HTTP reader returns filtered roomId results.
- **Cross-platform validation**: iOS, Android, and web parity must be validated before release (step 10 of implementation sequence).
- **`LOG_TOPIC_ARN` configuration**: Required environment variable in character-service and battle-service; missing config logs a startup warning and causes log entries to be absent (degraded mode, not a crash).
- **WebSocket extension**: `RoomWebSocketClient` extended with `battle_*` event handlers only; existing character event handlers are not modified.
- **Warm resume (ADR-10)**: On reconnect, always navigate to Room View; Room View reflects active battle via `useRoomBattle`; no auto-navigate to Battle View.
- **Character deleted during active battle (ADR-9)**: No backend cascade; frontend removes from display via `character_deleted` WebSocket event; battle record retains original `characterIds`.

## UX Design Requirements

UX-DR1: Consolidate all hardcoded color values in existing components into AppTheme tokens before building new screens. Specifically: `VioletButton` `#6E6BD4` → `AppTheme.colors.actionSecondary`; `RoomCharacterCard` `#A67560` → `AppTheme.colors.surfaceWarm`; `[roomNumber].tsx` logButton `#353535` → `AppTheme.colors.surfaceSubtle`; `CurrentCharacterFooter` `#544C4C` → `AppTheme.colors.elevated`; any remaining per-screen COLORS constants → corresponding AppTheme tokens.
UX-DR2: Extend `AppTheme.colors` with new role-based tokens: `danger` (#922525), `textAccentSoft` (#E8D89A), `elevated` (#4C4545), `surfaceWarm` revised to #8A6150 (darkened from #A67560 for improved contrast). Existing tokens `accent` (#D4C26E), `actionSecondary` (#6E6BD4), `textMuted`, `surface` are retained.
UX-DR3: Create `RoomCodeHeader` component — sticky header permanently visible in Room View. Displays room code in `accent` color with an inline copy-to-clipboard button (expo-clipboard). Copy interaction: inline "Copy" → "Copied ✓" state change for 1500ms, then reset. Accessible: `accessibilityLabel="Copy room code [code]"`, `accessibilityRole="button"`.
UX-DR4: Update `RoomCharacterCard` component — apply `textAccentSoft` to character name, `accent` to stat values, wire `useRealtimeFlash` hook for realtime update signal, make full card tappable to open QuickEditSheet. Accessible: `accessible={true}`, `accessibilityLabel="[Name], Level [N], Power [N]"`, `accessibilityRole="button"`, `accessibilityHint="Tap to edit stats"`.
UX-DR5: Update `CurrentCharacterFooter` component — apply same token updates as RoomCharacterCard (textAccentSoft for name, accent for stats), align background to `AppTheme.colors.elevated` (#4C4545).
UX-DR6: Update `VioletButton` component — replace hardcoded `#6E6BD4` with `AppTheme.colors.actionSecondary`.
UX-DR7: Create `QuickEditSheet` component — bottom sheet (~60% screen height) that slides up from bottom. Contains level and power +/− stepper controls (StatStepper), a Save primary button, and an "Edit more…" ghost link that routes to `ChangeCharacterModal`. States: Clean (no changes), Dirty (Save active), Saving (brief loading, Save disabled with surfaceSubtle bg). Dismiss: tap outside triggers Undo toast (1500ms) if dirty. Never open simultaneously with `ChangeCharacterModal` — enforced via `isSheetOpen` state gate.
UX-DR8: Create `StatStepper` component — stepper for level/power values. Tap targets minimum 44×44pt for both +/− buttons. Current value displayed bold in `accent` color between buttons. Floor: 0. No upper ceiling — level and power are unbounded. Haptic: `Haptics.ImpactFeedbackStyle.Light` on every tap (fires immediately before save). Accessible: `accessibilityLabel="Increase level"` / `"Decrease level"`, `accessibilityRole="button"`.
UX-DR9: Create `useRealtimeFlash(color: string)` hook — border color interpolation from transparent → `color` → transparent over 300ms total (fade in → hold 100ms → fade out) via `react-native-reanimated`. Border only (not background) to avoid layout repaints. Supports concurrent multi-card updates without visual conflict. Reduced motion: skip interpolation, apply border color immediately and remove after 300ms.
UX-DR10: Create `ActiveBattleBanner` component — inline strip in the Room View character list header. Shown when a battle is active. Displays battle name (if any) and a "View Battle" VioletButton. Not dismissible — reflects live server state from `useRoomBattle`. Accessible: `accessibilityLabel="Battle in progress. Tap to view."`, `accessibilityRole="button"`.
UX-DR11: Create `ReconnectingBanner` component — top-of-screen banner with low-prominence styling (`surfaceSubtle` bg, `textMuted` text). Auto-dismisses on reconnect. Escalates to "Connection lost · Retry" button after 8 seconds. Uses `AccessibilityInfo.announceForAccessibility(message)` called imperatively on mount (not `accessibilityLiveRegion` — cross-platform unreliable in React Native).
UX-DR12: Create `LogEntry` component — displays a single log event. Anatomy: small character avatar (24×24, character color background), character name (`body`, `textAccentSoft`), field label (`caption`, `textMuted`), `prev → new` value (`body bold`, `accent`), timestamp (`caption`, `textMuted`, right-aligned). Accessible: `accessibilityLabel="[Name], [field] changed from [prev] to [new], [time] ago"`.
UX-DR13: Build Battle View screen — Expo Router modal group `app/munchkin/(battle)/index.tsx`. Two-sided layout: monster side (`danger` color, #922525) and player side (`accent` color, #D4C26E). Displays BonusItem and MonsterItem lists per side. PATCH mutations for updating sides. Conclude action (POST /battles/:id/conclude with required result) and Discard action (soft delete, `danger` button with explicit confirmation step before execution). Conclude button is primary action (one per screen). Back navigation via standard stack header chevron.
UX-DR14: Build Log View screen — `app/munchkin/[roomNumber]/log.tsx`. Paginated scrollable list of `LogEntry` components. Cursor-based pagination (scroll to load more). Empty state: "No events recorded yet." with no CTA. Safe area applied at screen level only via `useSafeAreaInsets()`.
UX-DR15: Optimistic updates with error revert — stat value updates immediately in UI on local tap (before server confirmation). `useRealtimeFlash` fires on server confirmation as visual acknowledgement. On server error: revert value quietly with a brief border flash in `danger` color. No toast for errors on stat changes.
UX-DR16: Implement reduced motion support — check `useReducedMotion()` from `react-native-reanimated` app-wide. When enabled: `useRealtimeFlash` skips border interpolation (apply immediately, remove after 300ms); `QuickEditSheet` snaps directly to open/closed position instead of spring animation.
UX-DR17: Implement colour blindness accessibility testing requirement — run Xcode Accessibility Inspector colour filter (Deuteranopia + Protanopia) against Room View and QuickEditSheet before release. Document results. All accent-coloured elements must pair colour with bold weight or a primary affordance shape.
UX-DR18: Apply responsive layout conventions across all screens — use `flex` and percentage widths throughout; no hardcoded pixel widths. Portrait-only (landscape locked). Apply `useSafeAreaInsets()` at screen level only (not inside components). Minimum test target: iPhone SE (375pt).
UX-DR19: Apply button hierarchy rule throughout all new screens — never more than one primary action (`accent` bg) visible per layer. Secondary = VioletButton (`actionSecondary`). Destructive = `danger` bg. Ghost = `textMuted` text, no background. Disabled = `surfaceSubtle` bg + `textMuted` text (not gold, to avoid confusion with active accent).
UX-DR20: Implement field error pattern — `danger` border tint on errored field + short inline label below. Never a blocking modal for field-level errors. Validation triggers on Save tap, not on blur.
UX-DR21: QA device targets — iPhone SE (375pt minimum size validation), iPhone 16 (standard iOS baseline), Pixel 6a or similar mid-range Android (representative Android performance baseline). VoiceOver and TalkBack accessibility flows must be validated on Room View and QuickEditSheet.

## FR Coverage Map

FR1: Epic 1 — User can enter the product without prior account setup
FR2: Epic 1 — User establishes and retains a persistent player identity
FR3: Epic 1 — User updates their visible player profile information
FR4: Epic 2 — User enters the app and begins a game session from any supported platform
FR5: Epic 2 — User creates a new room for a supported game session
FR6: Epic 2 — User joins an existing room using room-specific entry information
FR7: Epic 2 — User re-enters an existing session without creating duplicate participation state
FR8: Epic 3 — Players see the current participants in the room
FR9: Epic 3 — Players see a shared view of room state relevant to the current session
FR10: Epic 4 — Product preserves room participation state during an active connected session
FR11: Epic 4 — User leaves a room without breaking room integrity for others
FR12: Epic 2 — Hosts and joining players rely on room setup and entry as the starting point for the full session experience
FR13: Epic 3 — Player creates a character for use within a room
FR14: Epic 3 — Player views their own character details within the room context
FR15: Epic 3 — Players view summaries of other room characters
FR16: Epic 3 — Player updates the mutable attributes of a character during a session (quick edit)
FR17: Epic 3 — Product maintains character ownership or association within the room context
FR18: Epic 3 — Product prevents room state from becoming confusing due to duplicate or conflicting character records
FR19: Epic 3 — Player removes or ends the active use of a character
FR20: Epic 5 — Players initiate a battle within an active room
FR21: Epic 5 — A battle can be named or identified within the session context
FR22: Epic 5 — Users add battle participants and opposing forces to an active battle
FR23: Epic 5 — Users adjust battle-relevant values during the course of a battle
FR24: Epic 5 — Users view the current state of an in-progress battle
FR25: Epic 5 — Users determine the outcome or result state of a battle
FR26: Epic 5 — Users conclude a battle and preserve its outcome as part of the room session record
FR27: Epic 5 — Users discard or abandon a battle that should not remain part of active session state
FR28: Epic 5 — Users return to and continue an active battle within the same room session
FR29: Epic 6 — Users access a room-level history of meaningful session events
FR30: Epic 6 — Users review character creation events in room history
FR31: Epic 6 — Users review character change events in room history
FR32: Epic 6 — Users review battle summaries in room history
FR33: Epic 6 — Users open or inspect completed battle records from room history
FR34: Epic 6 — Users use room history to identify prior character events and completed battle outcomes
FR35: Epic 3 — Changes to relevant room state become visible to participants during an active session
FR36: Epic 3 — Players remain aware of room changes without manually rebuilding state
FR37: Epic 4 — Users recover from temporary disconnection or app restart without losing the ability to continue the session
FR38: Epic 4 — A player joining late can understand the current room and gameplay context well enough to participate
FR39: Epic 4 — Product restores sufficient room context after reconnection or delayed refresh
FR40: Epic 7 — Core session loop can be completed on iOS
FR41: Epic 7 — Core session loop can be completed on Android
FR42: Epic 7 — Core session loop can be completed on web
FR43: Epic 7 — Users access core room, character, battle, and log capabilities on each supported platform
FR44: Epic 7 — Users complete the documented core session workflow on each supported platform
FR45: Epic 7 — Support workflows can identify failures in core room, character, battle, log, or session-continuity flows
FR46: Epic 7 — Support workflows can distinguish the type of core session failure
FR47: Epic 7 — Product can be reviewed against an explicit release-readiness checklist
FR48: Epic 7 — Product can be prepared for app store distribution without excluding any core documented workflow
