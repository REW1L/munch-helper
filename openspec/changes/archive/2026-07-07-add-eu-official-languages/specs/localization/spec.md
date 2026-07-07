## MODIFIED Requirements

### Requirement: Supported languages
The app SHALL support the 24 official languages of the European Union plus the additional non-EU languages already shipped, with English (`en`) as the default and fallback. The supported set SHALL be: English (`en`), Polish (`pl`), German (`de`), French (`fr`), Lithuanian (`lt`), Latvian (`lv`), Estonian (`et`), Russian (`ru`), Belarusian (`be`), Ukrainian (`uk`), Spanish (`es`), Italian (`it`), Portuguese (`pt`), Dutch (`nl`), Greek (`el`), Czech (`cs`), Slovak (`sk`), Hungarian (`hu`), Romanian (`ro`), Bulgarian (`bg`), Croatian (`hr`), Slovenian (`sl`), Danish (`da`), Swedish (`sv`), Finnish (`fi`), Irish (`ga`), and Maltese (`mt`). English SHALL be the source-of-truth catalog against which all other catalogs are measured. Each supported language SHALL be listed by its endonym (native display name) in the selector.

#### Scenario: All UI strings render in a supported language
- **WHEN** a user selects any supported language
- **THEN** all user-facing UI strings render translated in that language with no untranslated English text leaking through, except where a key is missing (see fallback requirement)

#### Scenario: Newly added EU language is selectable and detectable
- **WHEN** a user's device locale matches one of the newly added EU languages (by primary subtag, e.g. `es-ES` → `es`, `pt-BR` → `pt`) and no preference is saved, or the user picks it from the selector
- **THEN** the app SHALL activate that language and render the UI in it

#### Scenario: Unsupported language requested
- **WHEN** the app is asked to activate a language code that is not in the supported set
- **THEN** the app SHALL activate English (`en`) instead

#### Scenario: Catalog parity across the expanded set
- **WHEN** the translation catalogs are validated
- **THEN** every newly added catalog (`es`, `it`, `pt`, `nl`, `el`, `cs`, `sk`, `hu`, `ro`, `bg`, `hr`, `sl`, `da`, `sv`, `fi`, `ga`, `mt`) SHALL contain exactly the same key set as the English catalog with no missing, extra, or empty values
