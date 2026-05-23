# Channel Availability Evidence

## Release version

`<release-version>`

## Validated on

`<YYYY-MM-DD HH:mm timezone>`

## Validator

`<name / handle>`

## Readiness checklist reference

`<link to completed Story 7.6 release-readiness checklist artifact>`

## Web channel

- Version under test: `<release-version>`
- Automated check command: `node scripts/validate-web-channel.mjs --version <release-version>`
- Automated check result: `<PASS/FAIL>`
- JSON output:

```json
{}
```

- Browser render check: `<PASS/FAIL>`
- Production API base check from deployed bundle: `<PASS/FAIL>`
- Notes: `<notes>`

## iOS channel

- Bundle identifier: `click.helpamunch.mobileapp`
- TestFlight build version matches release: `<PASS/FAIL>`
- TestFlight status is Ready to Test: `<PASS/FAIL>`
- Real-device smoke path: `<PASS/FAIL>`
- Notes: `<notes>`

## Android channel

- Package: `click.helpamunch.mobileapp`
- Internal testing release version matches release: `<PASS/FAIL>`
- Rollout status is Available: `<PASS/FAIL>`
- Internal-testing install smoke path: `<PASS/FAIL>`
- Notes: `<notes>`

## Metadata audit

| Channel | Field | Overstates current scope? | Result | Evidence |
|---|---|---|---|---|
| Web | `<title>` | `<Yes/No>` | `<PASS/FAIL>` | |
| Web | Landing primary CTA | `<Yes/No>` | `<PASS/FAIL>` | |
| Web | Privacy URL | `<Yes/No>` | `<PASS/FAIL>` | |
| Web | Support URL | `<Yes/No>` | `<PASS/FAIL>` | |
| Web | Landing capability copy | `<Yes/No>` | `<PASS/FAIL>` | |
| iOS | App Name | `<Yes/No>` | `<PASS/FAIL>` | |
| iOS | Subtitle | `<Yes/No>` | `<PASS/FAIL>` | |
| iOS | Promotional Text | `<Yes/No>` | `<PASS/FAIL>` | |
| iOS | Description | `<Yes/No>` | `<PASS/FAIL>` | |
| iOS | Support URL and Privacy Policy URL | `<Yes/No>` | `<PASS/FAIL>` | |
| Android | App name | `<Yes/No>` | `<PASS/FAIL>` | |
| Android | Short description | `<Yes/No>` | `<PASS/FAIL>` | |
| Android | Full description | `<Yes/No>` | `<PASS/FAIL>` | |
| Android | Privacy Policy URL | `<Yes/No>` | `<PASS/FAIL>` | |
| Android | Contact email/website | `<Yes/No>` | `<PASS/FAIL>` | |

## Per-channel verdict

| Channel | Verdict | Validator | Timestamp | Blocked items |
|---|---|---|---|---|
| Web | `<PASS/FAIL/NOT-RELEASE-READY>` | `<name>` | `<timestamp>` | |
| iOS | `<PASS/FAIL/NOT-RELEASE-READY>` | `<name>` | `<timestamp>` | |
| Android | `<PASS/FAIL/NOT-RELEASE-READY>` | `<name>` | `<timestamp>` | |

## Blockers / waivers

- `<blocker or waiver reference>`

## Final go / no-go

`<GO/NO-GO>` because `<reason>`.
