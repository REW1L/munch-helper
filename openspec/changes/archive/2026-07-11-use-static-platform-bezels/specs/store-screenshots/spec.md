## ADDED Requirements

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
