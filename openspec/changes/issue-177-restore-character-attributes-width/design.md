# Design

## Context

See proposal.md for the regression. Before tile unification, `attributesBox` had no explicit width or `flexShrink` override; the 88px width belonged only to the Second Edition-specific style. The unified tile moved that width into the shared style.

## Goals / Non-Goals

**Goals:**
- Restore intrinsic attributes-box sizing in both room editions.
- Protect the sizing contract with a component test.

**Non-Goals:**
- Change card height, attribute scrolling, typography, or the Second Edition GP presentation.
- Add a screen-specific layout branch.

## Decisions

- Remove `width: 88` and `flexShrink: 0` from `attributesBox`, preserving its existing padding and decoration. This matches the pre-unification shared style and lets the box size to the rendered attribute content.
- Assert the flattened attributes-box style has no explicit width or flex-shrink override for both editions. This is a deterministic regression check; device screenshots remain part of visual review because React Native unit tests do not calculate real layout widths.

## Risks / Trade-offs

- Very long attributes may request more intrinsic width. Existing scrolling keeps all attribute values reachable, while regression coverage will confirm other flex children still have shrink behavior.
