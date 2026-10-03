## Why

The app is on Expo SDK 55 while SDK 57 is the latest stable release. Upgrading keeps the mobile app on Expo's supported release line and gives it the current React Native and Expo platform fixes while avoiding the SDK 58 beta.

## What Changes

- **BREAKING** Upgrade the frontend from Expo SDK 55 to the latest stable Expo SDK (57 at proposal time), including compatible React Native and React versions.
- Align Expo SDK packages and related tooling with the target SDK, and update the npm lockfile.
- Resolve migration issues and confirm the app's supported platform configuration remains valid.

## Capabilities

### New Capabilities
- `expo-sdk-maintenance`: Defines the supported Expo SDK baseline and compatible dependency alignment for the mobile app.

### Modified Capabilities

## Impact

- `frontend/package.json`, `frontend/package-lock.json`, and potentially Expo app configuration or native project files.
- Expo Router, Expo modules, React Native, React, and Expo lint/tooling dependencies.
- Mobile development, native builds, and EAS build configuration.
