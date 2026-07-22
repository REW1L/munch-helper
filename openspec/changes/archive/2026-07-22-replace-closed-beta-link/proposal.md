## Why

The landing screen still directs users to a closed Google testing group even though the Android app is available through Google Play. Replacing that destination makes the primary Android store badge useful and removes outdated beta messaging.

## What Changes

- Remove the “Join Closed Beta” label from the Google Play badge on the web landing screen.
- Point the Google Play badge to the public Google Play listing for `click.helpamunch.mobileapp`.
- Update landing-screen test coverage to assert the public listing URL and absence of closed-beta copy.

## Capabilities

### New Capabilities

- `landing-store-links`: Public store badges on the landing screen open the current platform store listings.

### Modified Capabilities

None.

## Impact

Affected frontend landing-screen UI, its localized beta label usage, and the associated Jest/React Native Testing Library tests. No backend, API, or dependency changes are required.
