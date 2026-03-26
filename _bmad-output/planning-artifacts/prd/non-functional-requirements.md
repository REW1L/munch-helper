# Non-Functional Requirements

## Performance

- NFR1: Core room-entry actions, including create and join, shall complete within 3 seconds under normal supported conditions.
- NFR2: Character updates, battle interactions, and room-log access shall complete within 2 seconds under normal supported conditions.
- NFR3: Recovery from reconnect or delayed refresh shall restore usable room context within 5 seconds under normal supported conditions.

## Reliability

- NFR4: The product shall preserve the integrity of active room, character, battle, and log state during normal connected use.
- NFR5: Temporary disconnections or refresh interruptions shall not commonly result in duplicate participation state, lost battle continuity, or unusable room history.
- NFR6: Core session flows shall remain dependable across iOS, Android, and web for the supported release scope.

## Cross-Platform Consistency

- NFR7: The core session workflow shall be release-validated on iOS, Android, and web.
- NFR8: No supported platform shall ship with a materially incomplete version of the documented core session workflow.
- NFR9: Release approval for this increment shall require parity of the core room, character, battle, and log experience across all supported platforms.

## Supportability

- NFR10: Core session failures shall be diagnosable through clear product behaviors and observable failure boundaries.
- NFR11: Release readiness shall be assessed through an explicit checklist covering the completed cross-platform session experience.
- NFR12: Newly completed battle, log, and recovery flows shall be covered by regression-oriented validation before release.

## Security & Privacy

- NFR13: User and session data shall be protected in transit and at rest using standard security practices appropriate to a consumer companion application.
- NFR14: The product shall avoid exposing one player's room or session data outside the intended room context.
- NFR15: The next phase shall not introduce unnecessary data collection or permission requests beyond what is required for the supported core experience.

## Accessibility

- NFR16: Core user flows shall remain operable and understandable for a broad public audience across supported platforms.
- NFR17: Users shall be able to enter rooms, manage characters, run battles, and review logs without avoidable accessibility barriers in the supported release scope.
