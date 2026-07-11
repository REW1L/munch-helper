## ADDED Requirements

### Requirement: Isolated slide fixtures

The screenshot capture pipeline SHALL use an isolated seeded room fixture for each captured story slide. A fresh app launch or screenshot-profile join for one slide SHALL NOT add users, characters, or log events to the room used by another slide.

#### Scenario: Each slide gets its own room

- **WHEN** the App Store or Google Play screenshot pipeline captures the four story slides
- **THEN** the runner seeds a room for each slide before running that slide's Maestro flow
- **AND** each slide flow receives the room ID for its own seeded room

#### Scenario: Repeated clear-state launches do not pollute one history

- **WHEN** the flows launch the app with cleared local state
- **THEN** any screenshot-profile user or character created by that flow belongs only to that flow's room
- **AND** the log screenshot room does not contain screenshot-profile create events from earlier slide captures

#### Scenario: Room mapping is observable

- **WHEN** the capture runner seeds per-slide rooms
- **THEN** it reports the slide filename and room ID mapping in command output for troubleshooting

### Requirement: Realistic seeded table

The store screenshot seed SHALL create a realistic Munchkin table size. The seeded cast SHALL contain four named characters with distinct avatar IDs, and joined capture flows MAY add the screenshot profile as an additional visible player.

#### Scenario: Seeded cast is bounded

- **WHEN** the store screenshot seed completes
- **THEN** it creates four seeded characters before any screenshot-profile join occurs
- **AND** the resulting joined-room screenshots show no more than six visible player characters

#### Scenario: Seeded characters are visually distinct

- **WHEN** seeded characters are displayed in room, battle, or log screenshots
- **THEN** their names and avatar IDs are distinct within the seeded cast
- **AND** no repeated seeded avatar makes two different seeded characters look duplicated

### Requirement: Story-first history screenshot

The history/log store screenshot SHALL visibly prioritize meaningful game-story events. Repeated screenshot-profile setup events SHALL NOT appear above the intended battle and table-update history in the captured log screenshot.

#### Scenario: Log screenshot starts with story events

- **WHEN** the log screenshot is captured from its isolated fixture
- **THEN** visible entries include the seeded active battle `Dungeon Door` and concluded battle `Fallen Gate`
- **AND** those story entries are not pushed below repeated screenshot-profile `created` rows

#### Scenario: Fixture uses real side effects

- **WHEN** the log screenshot fixture is seeded
- **THEN** battle and history entries are produced through existing character and battle actions
- **AND** the seed does not write log rows directly

### Requirement: Distinct caption frame

Captioned store previews SHALL keep the embedded app screenshot visually distinct from the surrounding caption frame while preserving the app theme palette and the bare rounded screenshot style.

#### Scenario: Screenshot boundary is visible

- **WHEN** a captioned slide is composited
- **THEN** the app screenshot has a visible boundary against the outer frame
- **AND** dark in-app backgrounds do not visually merge with the caption/background area

#### Scenario: Frame remains on-brand

- **WHEN** the compositor adds frame separation
- **THEN** it uses colors or derived treatments from the palette mirrored from `frontend/constants/theme.ts`
- **AND** it does not introduce a hardware device bezel
