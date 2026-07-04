## Context

The localization change (#125) added 10 launch languages and an in-app `LanguageSelector`. The pre-i18n UI was sized around short, fixed English strings, so two latent layout bugs surfaced:

1. **`ChangeUserModal` cannot scroll.** It already wraps content in a `ScrollView`, but `contentContainerStyle` sets `height: '100%'`. In React Native, a fixed height on the content container pins the scrollable content to the viewport, so max scroll offset is 0 and off-screen content is clipped. Adding the `LanguageSelector` (10 wrapping chips) pushed content past the viewport on short screens (iPhone SE), making the bottom languages unreachable.
2. **Buttons wrap localized text.** Button `Text` has no overflow policy anywhere in the app (only two non-button texts use `numberOfLines`). Longer German/Ukrainian labels wrap to a second line, worst on `flex: 1` half-width modal action rows at `fontSize: 22`.

Buttons are implemented two ways: the shared `VioletButton` and many inline `TouchableOpacity` + `Text` sites, each with its own bespoke `buttonText` style. There is no single place that governs how a button renders its label.

Constraints: no catalog, API, or dependency changes; accessibility labels and behavior unchanged; validate on iPhone SE, iPhone 16, Pixel 6a with `de`/`uk` as stress locales.

## Goals / Non-Goals

**Goals:**
- Make the profile modal scroll so every language is reachable on the smallest supported screen.
- Guarantee button labels stay on one line in every supported language by shrinking to fit, with a readability floor.
- Centralize the button-label overflow policy in one component so future languages/labels can't silently re-break buttons.

**Non-Goals:**
- No redesign of button visuals, colors, sizing, or layout beyond text overflow behavior.
- No change to translation catalogs, wording, or truncation of source strings.
- No generalized scroll-container audit beyond the confirmed `ChangeUserModal` regression (other modals already size correctly today; they inherit the button fix but are not re-architected).
- No change to accessibility labels/roles.

## Decisions

### Decision 1: Fix the modal scroll by removing the fixed content height

Remove `height: '100%'` from `contentContainer` in `modal-change-user.tsx`. The `ScrollView` keeps `style={{ flex: 1 }}` so it fills the space above the button row (bounded by the container's `maxHeight: '80%'`), while the content container is free to grow taller than the viewport and scroll.

- **Why not `flex: 1` on the content container?** Same failure mode — it constrains content to the viewport and disables scrolling.
- **Why not a fixed pixel height?** Brittle across device sizes and font scales; the whole point is to let content size itself.
- If a visual "fill to bottom when short" is desired later, `flexGrow: 1` on the content container is safe (grows but does not cap). Not needed for the fix, so left out to keep the change minimal.

### Decision 2: A shared `ButtonLabel` primitive owns the shrink-to-fit policy

Create `frontend/components/ButtonLabel.tsx`: a thin wrapper over RN `Text` that applies `numberOfLines={1}`, `adjustsFontSizeToFit`, and `minimumFontScale={0.75}`, and forwards `style`/`children`/`testID` plus any text props. Every button renders its label through this component.

- **Why a shared component over per-site props?** ~25 button text sites; sprinkling three props on each is repetitive and drifts over time. One component = one definition of "how buttons handle long text," matching the preference for the cleaner refactor over minimal diffs.
- **Why `adjustsFontSizeToFit` (shrink) over ellipsis-only?** Product decision: the app has few multi-word buttons and two-line labels look broken; shrinking preserves the whole word. Ellipsis remains the backstop below the floor.
- **Why `minimumFontScale={0.75}`?** Keeps `fontSize: 22` action buttons readable down to ~16.5 and `fontSize: 16` buttons to ~12, which absorbs the longest observed `de`/`uk` labels while staying legible. Below the floor RN truncates instead of wrapping.
- **Fold `VioletButton` in.** `VioletButton` renders its label via `ButtonLabel` so the shared and inline paths share one policy.

### Decision 3: `adjustsFontSizeToFit` needs a bounded width to act on

`adjustsFontSizeToFit` only shrinks when the text's container has a width constraint. The high-risk buttons already provide this (`flex: 1` rows, fixed-width buttons). `ButtonLabel` does not itself impose a max width; where a button lets its label size intrinsically, the shrink is a no-op and the label simply renders full-size (correct). The "reasonable maximum width per button" from the product decision is satisfied by the existing button layout box, not a new global cap.

## Risks / Trade-offs

- **`adjustsFontSizeToFit` measurement quirks on Android** → RN sometimes needs a bounded height/`numberOfLines` for reliable shrink; we set `numberOfLines={1}`, which is the supported configuration. Validate specifically on Pixel 6a.
- **A label with no width constraint won't shrink** → acceptable: those buttons hug their content and have room; the fix targets bounded buttons where wrapping actually occurred. Note per-site during adoption if any bounded button is missed.
- **Very long single labels (e.g. `landing.joinBeta` "Der geschlossenen Beta beitreten") could hit the floor and truncate** → acceptable per the single-line policy; flag any such case during device validation so wording or button width can be revisited separately.
- **Snapshot/unit tests referencing button `Text` structure may need updating** → adopt `ButtonLabel` so it renders a `Text` (keeps role/testID), minimizing test churn; update any that assert on structure.

## Migration Plan

1. Add `ButtonLabel`; refactor `VioletButton` onto it.
2. Replace inline button `Text` with `ButtonLabel` site-by-site (labels/styles/testIDs unchanged).
3. Remove `height: '100%'` from the modal content container.
4. Run `tsc`, lint, and the test suite; update any structure-dependent tests.
5. Manual device validation (iPhone SE / iPhone 16 / Pixel 6a) in `de` and `uk`.

Rollback: revert the change; it is self-contained UI, no data or API surface.

## Open Questions

- None blocking. If device validation reveals a label that truncates at the 0.75 floor, decide per-label whether to shorten the translation or widen the button — out of scope for this change.
