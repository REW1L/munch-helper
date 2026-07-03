## ADDED Requirements

### Requirement: Supported app languages
The system SHALL support English as the default and fallback app language, and SHALL support Polish, German, French, Lithuanian, Latvian, Estonian, Russian, Belarusian, and Ukrainian as selectable app languages.

#### Scenario: Supported language list is available
- **WHEN** the app presents language choices to the user
- **THEN** it lists English, Polish, German, French, Lithuanian, Latvian, Estonian, Russian, Belarusian, and Ukrainian as available choices

#### Scenario: English fallback is available
- **WHEN** a localized string is missing for the active non-English language
- **THEN** the app displays the English string for that key

### Requirement: Initial language selection
The system SHALL choose the initial app language from a previously saved user selection when present; otherwise it SHALL choose the best supported device or browser language; otherwise it SHALL use English.

#### Scenario: Saved language exists
- **WHEN** the app starts and a valid saved language exists locally
- **THEN** the app uses the saved language regardless of the device or browser locale

#### Scenario: Device language is supported
- **WHEN** the app starts without a saved language and the device or browser locale maps to a supported language
- **THEN** the app uses the mapped supported language

#### Scenario: Device language is unsupported
- **WHEN** the app starts without a saved language and the device or browser locale does not map to a supported language
- **THEN** the app uses English

### Requirement: Manual language selection
The system SHALL allow users to manually change the app language from the profile or user preferences UI and SHALL persist that selection locally on the device.

#### Scenario: User changes language
- **WHEN** the user selects a different supported language in the profile or user preferences UI
- **THEN** the app stores the selected language locally
- **AND** visible app UI updates to the selected language without requiring backend synchronization

#### Scenario: User restarts app after language change
- **WHEN** the user has selected a supported language and restarts the app
- **THEN** the app uses the previously selected language

### Requirement: Localized user interface text
The system SHALL render user-visible static app text through localization resources, including navigation titles, buttons, form labels, placeholders, accessibility labels, error fallback messages, support text, privacy text, and game-domain labels.

#### Scenario: UI renders in active language
- **WHEN** the active language is changed to a supported non-English language
- **THEN** localized static UI text displays in that active language where translations exist

#### Scenario: User-generated content remains unchanged
- **WHEN** user-generated names, room codes, typed monster names, or backend identifiers are displayed
- **THEN** the app displays those values exactly as stored or entered

### Requirement: Localized game history rendering
The system SHALL render known room history and battle history events from structured event data in the active app language when enough structured data is available, and SHALL use backend-provided summary text as fallback when structured localization is not possible.

#### Scenario: Structured event can be localized
- **WHEN** a known history event includes enough structured payload data to render a localized message
- **THEN** the app displays the event message in the active app language

#### Scenario: Structured event cannot be localized
- **WHEN** a history event is unknown or lacks required structured payload data
- **THEN** the app displays the backend-provided summary text

### Requirement: Language preference remains local
The system SHALL treat the selected language as a local app preference and SHALL NOT require account creation, profile synchronization, room synchronization, or backend API changes to apply it.

#### Scenario: Language changes do not alter shared state
- **WHEN** a user changes the app language while in a room with other users
- **THEN** only that user's local app UI language changes
- **AND** shared room, character, battle, and log state remains unchanged
