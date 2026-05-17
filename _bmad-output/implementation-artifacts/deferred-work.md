## Deferred from: code review of 4-4-reconnecting-banner.md (2026-05-17)

- Stale manual reconnect can update the wrong room/state: `reconnect()` awaits the current client and then only checks `isMountedRef.current` before mutating state. If the room/user changes or the hook disables while a manual reconnect is pending, the stale promise can update the new/disabled connection state. This race existed before Story 4.4 because the reconnect implementation was already present.
