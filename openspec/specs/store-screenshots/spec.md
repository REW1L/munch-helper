# store-screenshots

## Purpose

Store screenshot generation produces a four-slide phone preview story for App Store and Google Play using isolated local fixtures, deterministic capture flows, caption-band compositing, and static platform-appropriate device bezel assets.

## Requirements

### Requirement: Four-beat game story
The store screenshot set SHALL consist of exactly four slides, in order, each mapping to one game-story beat and one app screen:

1. `rooms-home` - gather the whole table in one room
2. `room-view` - everyone gains power and changes class in real time
3. `battle` - team up to fight the monster
4. `log` - replay every twist in the game history

The set SHALL NOT include the previous onboarding-funnel slides (`join-room`, `character-details`) in the published hero set.

#### Scenario: Slides are produced in story order
- **WHEN** the screenshot pipeline runs to completion for a store
- **THEN** exactly four captioned slides are produced
- **AND** they appear in the order `rooms-home`, `room-view`, `battle`, `log`

#### Scenario: Battle and log screens are captured
- **WHEN** the capture flows run
- **THEN** the battle screen and the history log screen are each captured as source screenshots

### Requirement: Seeded data renders every story screen
The seed step SHALL create data such that every captured screen shows meaningful, non-empty content, using only existing backend endpoints and log side effects.

#### Scenario: Battle screen has an active battle
- **WHEN** the battle screen is captured
- **THEN** an active battle created through `POST /battles` is visible with at least one monster and player participation

#### Scenario: History log is populated
- **WHEN** the history log screen is captured
- **THEN** it shows log events produced as side effects of seeded actions, including at least one concluded battle created through `POST /battles/:id/conclude`

#### Scenario: No direct log writes
- **WHEN** the seed populates history
- **THEN** it does so by performing battle or character actions, not by writing log rows directly

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

### Requirement: Battle source screenshot uses the initial battle viewport
The shared battle capture flow SHALL capture the active battle before any vertical scroll occurs. It SHALL wait for deterministic active-battle content in the initial viewport so both App Store and Google Play source screenshots show the battle's opening context.

#### Scenario: Battle capture completes without a scroll
- **WHEN** either platform runner executes the shared battle screenshot flow
- **THEN** the flow waits for the seeded active battle and initial Player Side content
- **AND** it does not execute a vertical scroll before the runner captures `battle.png`

#### Scenario: Battle slide retains active-battle context
- **WHEN** the captioned battle preview is generated from `battle.png`
- **THEN** the device screen shows the initial active-battle viewport
- **AND** the seeded `Dungeon Door` battle title is visible in that viewport

### Requirement: Caption band above a platform device shot
Each slide SHALL render caption text on a solid contrast band positioned above the captured app screen. The band SHALL occupy approximately the top 20-30% of the canvas height. The captured app screen SHALL be shown at full brightness inside the configured static platform device bezel and SHALL NOT be covered by a dimming overlay, scrim gradient, or top-chrome retouch. The captured app screen SHALL be clipped to the rounded screen opening of the configured platform bezel so square screenshot corners do not protrude past the device border. To keep both the caption and the screen recognizable, the captured screen MAY be cropped from the bottom to fit the remaining region rather than scaled down to fit. The compositor SHALL NOT add an accent-colored glow or halo around the device bezel, and it SHALL NOT draw a hard horizontal accent divider between the caption band and device area. A restrained neutral shadow MAY be used to retain device depth.

#### Scenario: Text sits on a solid band, not over the screenshot
- **WHEN** a slide is composited
- **THEN** the eyebrow, headline, and sub text render on a solid brand-colored band above the device screenshot
- **AND** the band occupies roughly the top 20-30% of the canvas height
- **AND** the device screenshot region contains no dimming overlay or text
- **AND** no hard horizontal accent divider is drawn at the boundary between the caption band and device area

#### Scenario: Device shot styling
- **WHEN** the device screenshot is placed
- **THEN** it is presented inside the configured platform-appropriate static bezel
- **AND** the app screenshot remains visually distinct from the surrounding caption frame
- **AND** screenshot pixels are clipped to the bezel's rounded screen opening
- **AND** no square screenshot corner is visible outside the device border
- **AND** no accent-colored glow or halo surrounds the bezel

#### Scenario: Bottom-crop to preserve legibility
- **WHEN** the device screenshot is taller than the region left below the band
- **THEN** it is cropped from the bottom rather than shrunk to fit
- **AND** the top of the screenshot remains visible

### Requirement: On-brand palette
Caption band and accent colors SHALL be drawn from the app theme defined in `frontend/constants/theme.ts`. The compositor SHALL NOT introduce marketing-only colors that do not exist in that theme.

#### Scenario: Colors match the app theme
- **WHEN** a slide is composited
- **THEN** the band background, text, and accent colors are values present in `frontend/constants/theme.ts`, such as `background`, `accent`, `actionSecondary`, `danger`, `parchmentText`, and `textPrimary`

#### Scenario: Per-slide accent
- **WHEN** each of the four slides is composited
- **THEN** its accent color matches the mapping: `rooms-home` -> `accent`, `room-view` -> `actionSecondary`, `battle` -> `danger`, `log` -> `parchmentText`

### Requirement: Localizable caption copy
Caption copy SHALL be stored as data keyed by locale, with `en` populated. The compositor SHALL render a single configurable locale, defaulting to `en`, and SHALL allow additional locales to be added as data without code changes.

#### Scenario: English renders by default
- **WHEN** the compositor runs with no locale override
- **THEN** it renders English caption copy

#### Scenario: Adding a locale requires only data
- **WHEN** a new locale's caption strings are added to the caption data
- **THEN** that locale can be rendered without modifying compositor logic

### Requirement: Fixed per-store canvas dimensions
The App Store output SHALL be produced only at the 6.9-inch iPhone size of `1320x2868`. The Google Play output SHALL be produced only at `1080x2400`. The App Store pipeline SHALL NOT produce 6.3-inch, 6.1-inch, or iPad sets.

#### Scenario: App Store canvas
- **WHEN** App Store slides are produced
- **THEN** each output image is exactly `1320x2868`
- **AND** no 6.3-inch, 6.1-inch, or iPad images are produced

#### Scenario: Google Play canvas
- **WHEN** Google Play slides are produced
- **THEN** each output image is exactly `1080x2400`

### Requirement: Cross-store parity
The caption-band compositor SHALL apply to both the App Store and Google Play outputs using two fixed base canvases, `1320x2868` and `1080x2400`. Both stores SHALL receive the same four-beat captioned story; Google Play SHALL no longer ship uncaptioned screenshots in the hero set.

#### Scenario: Both stores get captioned slides
- **WHEN** the pipeline completes for both stores
- **THEN** the App Store and Google Play each have four captioned slides telling the same story
- **AND** neither store ships an uncaptioned screenshot in the hero set

#### Scenario: Compositor selects the base by canvas
- **WHEN** the compositor processes a source directory
- **THEN** it applies the `1320x2868` base for the iPhone output and the `1080x2400` base for the Android output

### Requirement: Static platform device bezels
Captioned store previews SHALL present captured app screens inside static, platform-appropriate device bezel assets.

#### Scenario: App Store previews use iPhone bezel
- **WHEN** the App Store `iphone69` captioned previews are generated
- **THEN** each preview uses the configured iPhone-style static bezel asset
- **AND** the generated image keeps the App Store canvas size at `1320x2868`

#### Scenario: Google Play previews use Android bezel
- **WHEN** the Google Play `android1080x2400` captioned previews are generated
- **THEN** each preview uses the configured Android/Pixel-style static bezel asset
- **AND** the generated image keeps the Google Play canvas size at `1080x2400`

#### Scenario: Google Play does not use iPhone hardware
- **WHEN** Google Play captioned previews are generated
- **THEN** the app is not presented inside an iPhone-style bezel

### Requirement: Bezel assets are local generation inputs
Screenshot generation SHALL use local static bezel assets and SHALL NOT require live Figma access.

#### Scenario: Generation uses committed or local assets
- **WHEN** the caption compositor runs
- **THEN** it loads bezel assets from the repository or documented local asset path
- **AND** it does not call Figma or require an active Figma session

#### Scenario: Figma is only an asset source
- **WHEN** Figma Product Bezels or other design-kit assets are used
- **THEN** they are exported before generation and consumed as static local assets

### Requirement: Explicit bezel screen rectangles
The compositor SHALL fit captured source screenshots into explicit, configured screen rectangles for each bezel target.

#### Scenario: Source screenshot is placed behind bezel
- **WHEN** a captioned preview is composited
- **THEN** the captured app screenshot is scaled and cropped into the configured bezel screen rectangle
- **AND** the transparent bezel asset is composited above the screen content

#### Scenario: Missing bezel configuration fails generation
- **WHEN** a required bezel asset or screen rectangle is missing for a target output
- **THEN** screenshot generation fails with an actionable error
- **AND** it does not silently fall back to a bare rounded screenshot frame or another platform's bezel
