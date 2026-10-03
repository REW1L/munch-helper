## ADDED Requirements

### Requirement: Mobile app uses the latest stable Expo SDK
The mobile app SHALL target the latest stable Expo SDK available when an upgrade is undertaken and SHALL NOT adopt a beta or canary SDK as the production baseline.

#### Scenario: Stable SDK upgrade is applied
- **WHEN** an Expo SDK upgrade is prepared for the mobile app
- **THEN** the Expo dependency and SDK-coupled React Native and React versions match the selected latest stable SDK

### Requirement: Expo modules match the selected SDK
The mobile app SHALL use Expo SDK packages and Expo tooling versions compatible with its selected SDK, with dependency versions recorded in the npm lockfile.

#### Scenario: Dependency alignment is checked
- **WHEN** the Expo dependency set is updated
- **THEN** Expo's dependency validation reports no incompatible installed package versions

#### Scenario: Reproducible dependency installation
- **WHEN** dependencies are installed from the frontend npm lockfile
- **THEN** the resolved Expo SDK dependency set matches the checked-in package manifest and lockfile
