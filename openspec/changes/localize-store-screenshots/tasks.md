## 1. Locale contract and caption data

- [x] 1.1 Define and validate the canonical 11-locale store-screenshot set against `docs/store-assets/app-store`.
- [x] 1.2 Refactor the compositor's shared slide metadata and add translated caption copy for every supported listing locale.
- [x] 1.3 Add dynamic caption wrapping and a verified Latin/Cyrillic-capable font selection path.
- [x] 1.4 Add compositor tests or validation checks for locale completeness, unsupported locales, output paths, glyph coverage, and native canvas dimensions.

## 2. Deterministic localized capture

- [x] 2.1 Add a screenshot-only explicit language override to frontend language resolution, preserving normal persisted-preference and device-locale behavior.
- [x] 2.2 Add locale-neutral accessibility or test selectors at the existing screenshot-flow navigation and readiness points.
- [x] 2.3 Update shared Maestro flows to use the stable selectors and deterministic fixture data rather than translated visible UI strings.
- [x] 2.4 Update iOS and Android capture runners to build/capture each canonical locale and invoke matching localized compositing.

## 3. Documentation and verification

- [x] 3.1 Document the canonical store locale set, per-locale generation commands, expected output directories, and font/layout review in the screenshot guide and store-assets README.
- [x] 3.2 Run focused frontend and screenshot-tooling tests, then generate and mechanically validate all locale/store/slide outputs.
- [x] 3.3 Visually inspect all generated native-size previews, including Cyrillic and long-caption locales, and record any needed copy/layout adjustments.
