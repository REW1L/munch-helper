## Context

The web landing screen renders App Store and Google Play badges from `frontend/app/index.tsx`. The Android badge currently uses the closed testers Google Group URL and displays the localized `landing.joinBeta` text above it. The public listing URL is already known and requires only a frontend constant, presentation, and test update.

## Goals / Non-Goals

**Goals:**

- Make the Google Play badge open `https://play.google.com/store/apps/details?id=click.helpamunch.mobileapp`.
- Remove the closed-beta label from the landing-screen presentation.
- Preserve the existing web-only rendering and App Store behavior.

**Non-Goals:**

- Changing native-platform landing behavior.
- Removing the unused `joinBeta` translation key from every locale in this small link update.
- Changing store badge assets, layout, or routing behavior.

## Decisions

- Update the existing `STORE_LINKS.android` constant rather than adding a second URL, so all Play navigation continues through the existing guarded `canOpenURL`/`openURL` flow.
- Remove the `playSoonNote` element from the Google Play badge wrapper instead of replacing its text, because the requested state is a public store link with no beta messaging.
- Update the focused landing-screen test to assert the public URL and absence of the old label, retaining coverage that store links remain hidden on native platforms.

## Risks / Trade-offs

- [Risk] Some locale files retain an unused `joinBeta` translation. → Mitigation: the UI no longer references it; broader translation cleanup can be handled separately without expanding this change.
- [Risk] The public listing may not be available in every browser context. → Mitigation: retain the existing `Linking.canOpenURL` guard and error handling.

## Migration Plan

Deploy the frontend change normally. Rollback is a one-line URL/UI revert if the public listing needs to be withdrawn.

## Open Questions

None.
