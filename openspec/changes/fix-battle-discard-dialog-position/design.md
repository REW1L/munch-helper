# Design

## Context

`ConfirmDialog` currently renders its custom iOS presentation as an absolute-fill `View` at the component's location in the React Native hierarchy. `BattleDiscardAction` is nested in the battle screen content, so the absolute overlay can inherit an offset from that nested position and appear below the visible screen.

## Decision

Keep Android's `Alert.alert` behavior. Render both custom iOS and web presentations through React Native `Modal`, which anchors presentation to the app window rather than the triggering component. Preserve the existing backdrop, actions, and web behavior.

Add a Maestro flow that reaches the battle discard action through the room UI and checks that the confirmation title and both actions are visible before canceling. This covers the previously untested path on native platforms and web. Require scenario-specific E2E coverage for substantial frontend behavior changes and bug fixes in repository guidance.

## Risks

- Native modal presentation behavior differs by platform; targeted component tests should verify the iOS custom path uses `Modal` and that the existing dialog actions continue to work.
- The E2E environment forces the custom dialog path on native platforms, so its existing interaction behavior must remain intact.
