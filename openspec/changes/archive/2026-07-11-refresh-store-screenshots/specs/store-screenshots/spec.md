## ADDED Requirements

### Requirement: Four-beat game story

The store screenshot set SHALL consist of exactly four slides, in order, each mapping to one game-story beat and one app screen:

1. `rooms-home` — gather the whole table in one room
2. `room-view` — everyone gains power and changes class in real time
3. `battle` — team up to fight the monster
4. `log` — replay every twist in the game history

The set SHALL NOT include the previous onboarding-funnel slides (`join-room`, `character-details`) in the published hero set.

#### Scenario: Slides are produced in story order

- **WHEN** the screenshot pipeline runs to completion for a store
- **THEN** exactly four captioned slides are produced
- **AND** they appear in the order rooms-home, room-view, battle, log

#### Scenario: Battle and log screens are captured

- **WHEN** the capture flows run
- **THEN** the battle screen and the history log screen are each captured as source screenshots

### Requirement: Seeded data renders every story screen

The seed step SHALL create data such that every captured screen shows meaningful, non-empty content, using only existing backend endpoints and log side effects.

#### Scenario: Battle screen has an active battle

- **WHEN** the battle screen is captured
- **THEN** an active battle (created via `POST /battles`) is visible with at least one monster and player participation

#### Scenario: History log is populated

- **WHEN** the history log screen is captured
- **THEN** it shows log events produced as side effects of seeded actions, including at least one concluded battle (via `POST /battles/:id/conclude`)

#### Scenario: No direct log writes

- **WHEN** the seed populates history
- **THEN** it does so by performing battle/character actions, not by writing log rows directly

### Requirement: Caption band above a clean device shot

Each slide SHALL render the caption text on a solid contrast band positioned above the device screenshot. The band SHALL occupy approximately the top 20–30% of the canvas height. The device screenshot SHALL be shown at full brightness (undimmed), with rounded corners and a soft shadow, and SHALL NOT be covered by a dimming overlay, scrim gradient, or top-chrome retouch. To keep both the caption and the screenshot recognizable, the device screenshot MAY be cropped from the bottom to fit the remaining region rather than scaled down to fit.

#### Scenario: Text sits on a solid band, not over the screenshot

- **WHEN** a slide is composited
- **THEN** the eyebrow, headline, and sub text render on a solid brand-colored band above the device screenshot
- **AND** the band occupies roughly the top 20–30% of the canvas height
- **AND** the device screenshot region contains no dimming overlay or text

#### Scenario: Device shot styling

- **WHEN** the device screenshot is placed
- **THEN** it has rounded corners and a soft shadow
- **AND** it is not wrapped in a hardware device bezel

#### Scenario: Bottom-crop to preserve legibility

- **WHEN** the device screenshot is taller than the region left below the band
- **THEN** it is cropped from the bottom rather than shrunk to fit
- **AND** the top of the screenshot (the content the caption refers to) remains visible

### Requirement: On-brand palette

Caption band and accent colors SHALL be drawn from the app theme defined in `frontend/constants/theme.ts`. The compositor SHALL NOT introduce marketing-only colors that do not exist in that theme.

#### Scenario: Colors match the app theme

- **WHEN** a slide is composited
- **THEN** the band background, text, and accent colors are values present in `frontend/constants/theme.ts` (e.g. `background`, `accent`, `actionSecondary`, `danger`, `parchmentText`, `textPrimary`)

#### Scenario: Per-slide accent

- **WHEN** each of the four slides is composited
- **THEN** its accent color matches the mapping: rooms-home→`accent`, room-view→`actionSecondary`, battle→`danger`, log→`parchmentText`

### Requirement: Localizable caption copy

Caption copy SHALL be stored as data keyed by locale, with `en` populated. The compositor SHALL render a single configurable locale (default `en`) and SHALL allow additional locales to be added as data without code changes.

#### Scenario: English renders by default

- **WHEN** the compositor runs with no locale override
- **THEN** it renders English caption copy

#### Scenario: Adding a locale requires only data

- **WHEN** a new locale's caption strings are added to the caption data
- **THEN** that locale can be rendered without modifying compositor logic

### Requirement: Fixed per-store canvas dimensions

The App Store output SHALL be produced only at the 6.9″ iPhone size of 1320×2868. The Google Play output SHALL be produced only at 1080×2400. The App Store pipeline SHALL NOT produce 6.3″, 6.1″, or iPad sets.

#### Scenario: App Store canvas

- **WHEN** App Store slides are produced
- **THEN** each output image is exactly 1320×2868
- **AND** no 6.3″, 6.1″, or iPad images are produced

#### Scenario: Google Play canvas

- **WHEN** Google Play slides are produced
- **THEN** each output image is exactly 1080×2400

### Requirement: Cross-store parity

The caption-band compositor SHALL apply to both the App Store and Google Play outputs using two fixed base canvases (1320×2868 and 1080×2400). Both stores SHALL receive the same four-beat captioned story; Google Play SHALL no longer ship uncaptioned screenshots.

#### Scenario: Both stores get captioned slides

- **WHEN** the pipeline completes for both stores
- **THEN** the App Store and Google Play each have four captioned slides telling the same story
- **AND** neither store ships an uncaptioned screenshot in the hero set

#### Scenario: Compositor selects the base by canvas

- **WHEN** the compositor processes a source directory
- **THEN** it applies the 1320×2868 base for the iPhone output and the 1080×2400 base for the Android output
