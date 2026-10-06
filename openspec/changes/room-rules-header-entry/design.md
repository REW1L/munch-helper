# Design

## Context

See `proposal.md`. The parent room layout controls the navigation header and the room route currently overrides its title. The room body owns the 2e-only rules button. `useRoomEdition` resolves persisted metadata with an optional route hint.

## Goals / Non-Goals

**Goals:** Share the rules entry across editions, retain edition-specific guidance, and fit the header on narrow screens.

**Non-Goals:** Change guide content, backend contracts, or the Games tile rules actions.

## Decisions

- Add `headerRight` in the parent room layout, conditioned on the active route. Resolve edition through `useRoomEdition`, the same metadata hook used by the room body, and disable navigation until persisted metadata confirms the type. A parent header option avoids duplicating the icon across screens; placing it in the room body would consume vertical space.
- Keep the room route's title override for its edition label. Give the title an explicit width constraint and compress its localized room label before the room code or Copy control. Preserve the existing copy hook and title test coverage.
- Navigate with `router.push` to the static rules route, adding `edition=2e` only for Second Edition. Stack back navigation then returns to the room without new history logic.
- Use a 44-point touch target, a scroll/document icon, a localized accessibility label, and `open-room-rules` test ID. Extend route tests and the 2e Maestro flow; add a Classic room Maestro path.

## Risks / Trade-offs

- [Risk] Persisted edition may arrive after first render. → Keep the icon disabled until confirmation; test the metadata transition.
- [Risk] Native stack title space varies by platform. → Constrain the title and verify an iPhone SE screenshot in the PR.
