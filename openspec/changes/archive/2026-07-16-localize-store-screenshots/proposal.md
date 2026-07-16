## Why

The store screenshot pipeline currently renders only English marketing captions and captures an English-language app UI, despite the App Store listing copy being maintained in 11 locales under `docs/store-assets/app-store`. Localized listings need matching localized screenshots so the visual story and the app language are consistent for every supported store market.

## What Changes

- Add localized caption copy for the existing four-slide store story in every locale represented by `docs/store-assets/app-store`: `en`, `pl`, `de`, `fr`, `lt`, `lv`, `et`, `ru`, `be`, `uk`, and `es`.
- Make the screenshot automation run each capture in its corresponding app language, rather than relying on an English simulator/device locale.
- Make Maestro navigation and readiness checks resilient to localized UI text.
- Produce locale-scoped, captioned App Store and Google Play preview outputs for each locale without changing the existing slide order, source fixtures, canvas sizes, or device-bezel treatment.
- Document the supported store-screenshot locale set and the localized generation workflow.

## Capabilities

### New Capabilities

- `localized-store-screenshots`: Generates and verifies localized four-slide screenshot sets for every locale with an App Store listing asset.

### Modified Capabilities

- `store-screenshots`: Extends caption and capture requirements from English-only rendering to all locales represented by the store listing assets.

## Impact

- `scripts/generate-app-store-preview-redesign.py` caption data, font handling, locale validation, and output behavior.
- App Store and Google Play screenshot capture runners plus their Maestro flows.
- Screenshot automation configuration for selecting the app language deterministically.
- `scripts/README-screenshots.md` and `docs/store-assets/app-store/README.md`.
- Local, gitignored screenshot output under `screenshots/`; no backend API, production app behavior, or store upload is changed.
