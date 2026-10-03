## Context

The frontend currently targets Expo SDK 55, React Native 0.83, and React 19.2. Expo's SDK reference identifies SDK 57 as stable, with SDK 58 still in beta. The project uses Expo Router, Expo UI, multiple Expo modules, and a development client; those packages need to move together with the SDK.

## Goals / Non-Goals

**Goals:**
- Move the app to the latest stable Expo SDK and its supported React Native and React versions.
- Align Expo modules and Expo lint tooling to SDK 57 and preserve reproducible npm installs.
- Resolve compatibility issues surfaced by Expo's dependency checker and app validation.

**Non-Goals:**
- Adopt Expo SDK 58 beta or canary packages.
- Change product behavior or undertake unrelated dependency upgrades.
- Regenerate or commit native projects unless the repository's native workflow requires it.

## Decisions

- Use the latest **stable** SDK at implementation time. SDK 57 is the current stable target; SDK 58 beta is excluded. This keeps the app on a supported release while avoiding pre-release dependencies.
- Use Expo's SDK-aware package tooling (`npx expo install expo@latest --fix`) to select compatible Expo modules and core React Native dependencies rather than manually guessing versions.
- Keep unrelated third-party libraries at their existing versions unless the upgrade demonstrates a concrete incompatibility. This limits migration scope and makes regressions easier to diagnose.
- Validate the resulting manifest with Expo dependency checks, app config validation, TypeScript, lint, and the existing frontend tests where the environment supports them.

## Risks / Trade-offs

- SDK 57 may introduce native build or API changes → Review its official upgrade notes and fix migration issues in this change.
- Expo's package fixer may change more packages than expected → Review the manifest and lockfile diff and revert unrelated changes.
- Native development builds become incompatible with the upgraded JS packages → Document and perform a clean dev-client rebuild as part of the migration guidance.
- Local native builds may be unavailable in the current environment → Run all available static and frontend checks and report any unverified native build.
- iOS and Android native builds were not run for this change; developers must rebuild their development clients and validate native binaries before release.

## Migration Plan

1. Update the Expo SDK and use Expo tooling to align SDK packages and React Native dependencies.
2. Refresh the frontend npm lockfile, apply any SDK migration fixes, and run project validation.
3. Rebuild the development client and native binaries from the upgraded dependency set. Roll back by reverting the dependency manifest, lockfile, and migration fixes together if a release blocker is found.

## Open Questions

- None. The target is the latest stable SDK at implementation time; SDK 57 is the current target based on Expo's published release information.
