## ADDED Requirements

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

## MODIFIED Requirements

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
