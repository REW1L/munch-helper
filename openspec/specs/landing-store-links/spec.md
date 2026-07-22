## Purpose

Define the public store links presented on the web landing screen.

## Requirements

### Requirement: Public Google Play landing link
The web landing screen SHALL present the Google Play badge without closed-beta messaging, and activating it SHALL open the public listing for `click.helpamunch.mobileapp`.

#### Scenario: User opens Google Play from the web landing screen
- **WHEN** a user activates the Google Play badge on the web landing screen
- **THEN** the app checks and opens `https://play.google.com/store/apps/details?id=click.helpamunch.mobileapp`
- **AND** the landing screen does not display “Join Closed Beta”

#### Scenario: Store links remain web-only
- **WHEN** the landing screen renders on a native platform
- **THEN** the Google Play and App Store badges are not rendered
