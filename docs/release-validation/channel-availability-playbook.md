# Release Channel Availability Playbook

Use this playbook for each release candidate before approving web, iOS, or Android availability. Save the completed evidence from `docs/release-evidence/TEMPLATE-channel-availability.md` as `docs/release-evidence/<release-version>-<YYYY-MM-DD>-channel-availability.md`.

## Prerequisites

- Release version under validation, from `frontend/app.json` `expo.version`.
- Completed Story 7.6 release-readiness checklist artifact for this release.
- Access to App Store Connect TestFlight for `click.helpamunch.mobileapp`.
- Access to Google Play Console internal testing for `click.helpamunch.mobileapp`.
- A real iOS device with TestFlight and an Android device or emulator enrolled through the internal-testing opt-in link.

If the Story 7.6 checklist is missing, record `TODO: 7.6 dependency` in the evidence artifact and mark affected channels NOT-RELEASE-READY until the checklist outcome exists or is waived through the Story 7.6 sign-off process.

## Web Channel

1. Run the automated reachability check:

   ```bash
   node scripts/validate-web-channel.mjs --version <release-version>
   ```

2. Paste the JSON output into the evidence artifact.
3. Open `https://helpamunch.click/` and confirm the landing screen renders.
4. Confirm `https://helpamunch.click/privacy` and `https://helpamunch.click/support` return the published Story 7.5 content.
5. Inspect the deployed JavaScript bundle or page source and confirm the embedded `EXPO_PUBLIC_API_URL` points at the production API base. Use the deployed bundle, not local environment variables.

PASS requires `/`, `/privacy`, and `/support` to return HTTP 200 HTML and for the deployed app to be able to reach the production backend.

## iOS Channel

1. Open App Store Connect.
2. Navigate to TestFlight for `click.helpamunch.mobileapp`.
3. Confirm the most recent build version matches `frontend/app.json` `expo.version`.
4. Confirm the build status is `Ready to Test`.
5. Install the build through TestFlight on a real device.
6. Complete one smoke path: create room, create character, start and conclude one battle, then open room history.

PASS requires the matching version to be Ready to Test and usable through the full smoke path.

## Android Channel

1. Open Google Play Console.
2. Navigate to Internal testing for `click.helpamunch.mobileapp`.
3. Confirm the most recent active release version matches `frontend/app.json` `expo.version`.
4. Confirm rollout status is `Available`.
5. Install the build through the internal-testing opt-in link.
6. Complete one smoke path: create room, create character, start and conclude one battle, then open room history.

PASS requires the matching version to be available on the internal track and usable through the full smoke path.

## Metadata Audit

Use FR43-FR44 and NFR8-NFR9 as the scope baseline: rooms, characters, battles, and room history are supported; channel-facing copy must not promise capabilities beyond the current release. Privacy and support URLs must be `https://helpamunch.click/privacy` and `https://helpamunch.click/support`.

| Channel | Field | Expected check | Overstates scope? | Evidence |
|---|---|---|---|---|
| Web | `<title>` | Names Munch Helper without unsupported claims | Yes/No | |
| Web | Landing primary CTA | Sends users into the supported room flow | Yes/No | |
| Web | Privacy URL | Uses `https://helpamunch.click/privacy` | Yes/No | |
| Web | Support URL | Uses `https://helpamunch.click/support` | Yes/No | |
| Web | Landing capability copy | Limited to rooms, characters, battles, and room history | Yes/No | |
| iOS | App Name | Names Munch Helper without unsupported claims | Yes/No | |
| iOS | Subtitle | Limited to current supported session scope | Yes/No | |
| iOS | Promotional Text | Does not promise unsupported workflows | Yes/No | |
| iOS | Description | Limited to rooms, characters, battles, and room history | Yes/No | |
| iOS | Support URL and Privacy Policy URL | Uses the stable Story 7.5 URLs | Yes/No | |
| Android | App name | Names Munch Helper without unsupported claims | Yes/No | |
| Android | Short description | Limited to current supported session scope | Yes/No | |
| Android | Full description | Does not promise unsupported workflows | Yes/No | |
| Android | Privacy Policy URL | Uses `https://helpamunch.click/privacy` | Yes/No | |
| Android | Contact email/website | Points to current support contact or support URL | Yes/No | |

## Failure Handling

Any per-channel FAIL marks that channel NOT-RELEASE-READY in the evidence artifact. Name the failing check, paste or link the evidence, and do not grant waivers in this playbook. The Story 7.6 release-readiness review is the only place where a waiver is granted.

The final release verdict is GO only when web, iOS, and Android all pass or when every exception is explicitly waived through the Story 7.6 sign-off process.
