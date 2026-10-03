# Design

## Context

See `proposal.md` for motivation and `specs/game-rules/spec.md` for the behavior contract. The Games screen is `frontend/app/rooms.tsx`; its only game card currently places Create and Join actions beside the Munchkin Classic title. Expo Router owns navigation under `frontend/app/`, the root stack supplies the shared header/theme, and all user-facing copy is sourced from 27 parity-checked locale catalogs.

This is a client-only, informational feature. The official six-page PDF is a reference for authors and the external destination for players; the application must neither bundle nor render the rulebook itself. Long localized content must work on web and native, including small screens and assistive technology.

## Goals / Non-Goals

**Goals:**

- Preserve the current room creation/joining behavior while adding an obvious third action.
- Provide a readable, sectioned, original summary that is easy to scan and fully reachable by scrolling.
- Keep source attribution explicit and make the official PDF available through the platform's external-link behavior.
- Fit existing Expo Router, theme, localization, accessibility, and test patterns without new runtime dependencies.
- Keep the code straightforward to extend when a future game receives its own rules view.

**Non-Goals:**

- Reproducing, hosting, downloading, parsing, or displaying the official PDF inside the app.
- Providing card text, rulebook artwork, extended examples, FAQs, errata, expansion rules, or a searchable rules engine.
- Adding backend storage, analytics, offline remote-document caching, or an authoring CMS.
- Changing how rooms are created, joined, or played.

## Decisions

### 1. Add a static `/munchkin/rules` route

Implement `frontend/app/munchkin/rules.tsx` as a static route beneath the existing game namespace. Static routing matches the current app structure, naturally gives the page a stack back action, and takes precedence over the existing dynamic `/munchkin/[roomNumber]` route.

Alternatives considered:

- A generic `/rules/[gameId]` registry would support future games but introduces unsupported-id behavior and indirection before a second guide exists.
- A modal would make long-form reading and linking less predictable and would not provide a stable route.

### 2. Give Rules its own full-width row in the tile action area

Keep Create and Join together and place Rules on a second, bounded row within the action area. This preserves existing test IDs and interaction behavior while giving all three localized labels enough width on small screens. Every label uses `ButtonLabel`, and Rules gets a stable `open-munchkin-rules` test ID for route and Maestro tests.

Alternatives considered:

- Three equal horizontal buttons leave too little width beside the existing title panel, especially in German, Ukrainian, and other longer translations.
- Making the title itself open rules hides the action and weakens accessibility semantics.

### 3. Author a native sectioned summary, not a transformed copy of the PDF

The rules route renders a `ScrollView` containing a description, summary notice, and a fixed list of topic sections. Content will be newly written from the mechanics verified in the official PDF: objective/victory, setup, turn flow, character/card state, combat, items/trading, asking for help, running away/death, curses, and card-specific rule priority.

The implementation will not store the downloaded PDF, images, OCR output, or extracted text. Each section stays concise and omits named worked examples. During review, compare meaning against the official PDF and compare wording to ensure it is clearly paraphrased.

Alternatives considered:

- Embedding the PDF would contradict the copyright constraint, increase bundle/network complexity, and provide a poor small-screen experience.
- Copying selected rulebook paragraphs would be faster but fails the requirement for original descriptive content.

### 4. Store all visible copy in locale catalogs

Add a `gameRules` namespace with identical keys in English and every supported locale. English remains the source catalog. The route builds its section list from stable heading/body key pairs so ordering is explicit while actual copy stays in i18next. Existing catalog-parity tests remain the hard guard against missing, extra, or empty translations.

Alternatives considered:

- Shipping English-only rule text would violate the durable localization contract.
- Keeping translated rule data in a separate bespoke schema would duplicate the established translation system and parity machinery.

### 5. Open a single reviewed HTTPS source URL through `Linking`

Define the official PDF URL once in the rules module or a small game-rules constant and invoke `Linking.openURL` from a pressable control with `accessibilityRole="link"`. A rejected platform open is caught so the page remains usable; tests assert the exact URL and rejection behavior. The visible source label names both the official rulebook and PDF format.

Alternatives considered:

- Fetching or preflighting the remote URL at runtime creates avoidable availability and privacy dependencies.
- An embedded web view adds a dependency and effectively displays the copyrighted document in app.

### 6. Test observable behavior at route and device seams

Follow red-green-refactor during apply:

- Add a Games route test that verifies Rules navigation and that room modals/mutations are untouched.
- Add a rules route test for required sections, scrolling container, heading/link semantics, exact external URL, and graceful `Linking.openURL` rejection.
- Extend catalog parity coverage through the existing structural test.
- Add a focused Maestro flow that opens Rooms, activates `open-munchkin-rules`, verifies the rules screen, scrolls to the official-source control, and returns.

The frontend package gates and repository-required `npm run test:e2e:mobile` remain the pre-PR checks. Documentation updates cover the new route, screen responsibility, and external-source boundary.

## Risks / Trade-offs

- **[Risk] A paraphrase can still drift from the source or become too close to its wording.** → Keep sections concise, validate every mechanic against the reviewed PDF, perform a wording review before merge, and link to the official source as authoritative.
- **[Risk] Twenty-seven translations create review and maintenance overhead.** → Use the typed English catalog plus parity tests, keep each section compact, and review long-language rendering at a small viewport.
- **[Risk] The external PDF URL can change or become unavailable.** → Centralize the HTTPS URL, verify it during implementation/PR review, and fail without crashing when the platform cannot open it.
- **[Risk] Adding a third action can regress the existing Games card or screenshot flows.** → Preserve Create/Join IDs and behavior, use the two-row layout, and run existing route, screenshot-related, and mobile E2E checks.
- **[Trade-off] A static route is less generic than a registry.** → Prefer current simplicity; extract shared rules components or a registry only when a second game makes the common shape concrete.

## Migration Plan

1. Ship the new route, translations, and Games tile action in the same frontend release so there is no dangling navigation target.
2. Run route/unit coverage, lint, typecheck, web export coverage, and the mandatory mobile E2E gate before the PR.
3. Roll back by reverting the frontend commit; no server data, API, or persistent client state needs migration.
