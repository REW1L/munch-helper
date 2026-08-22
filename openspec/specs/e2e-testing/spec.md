# e2e-testing

## Purpose

Cross-platform end-to-end coverage of crucial user paths (room and character lifecycle, cross-user real-time updates) using a single Maestro flow definition per path, run against the local full-stack backend on iOS, Android, and web, with test isolation and CI/commit-gate enforcement.

## Requirements

### Requirement: Single cross-platform E2E tool

The E2E suite SHALL use Maestro as the single test-authoring tool, with each crucial-path flow defined once and executable on iOS, Android, and web. Flows SHALL select elements by the app's `testID`s (mapped to `data-testid` on web) rather than translated text where a stable `testID` exists, and SHALL be parameterized by `roomId` and `userId`.

#### Scenario: One flow runs on all three platforms

- **WHEN** a crucial-path flow file is executed on the iOS simulator, the Android emulator, and the exported web build
- **THEN** the same flow definition SHALL drive the app on each platform without a platform-specific copy of the flow

#### Scenario: Stable selectors over translated text

- **WHEN** a flow interacts with an element that has a `testID`
- **THEN** the flow SHALL select it by that id so the flow is resilient to the app's localization

### Requirement: E2E runs against the local full-stack backend

The E2E suite SHALL run against the local backend stack defined by `backend/docker-compose.local.yml` (all services, Redis, Mongo, and the nginx gateway on port 8080), including the real WebSocket endpoint at `/ws`. A harness SHALL start the stack, wait until it is healthy, and tear it down after the run. The suite SHALL NOT depend on any deployed or cloud environment.

#### Scenario: Stack is ready before flows run

- **WHEN** the harness starts the local stack
- **THEN** it SHALL wait until the gateway and required services report healthy before executing any flow

#### Scenario: Real WebSocket path is exercised

- **WHEN** a character write occurs against the running stack
- **THEN** the resulting notification SHALL be delivered to the app over the real `/ws` WebSocket fanout (Redis → room-notifications-service → WebSocket), not a mock

### Requirement: Test isolation via unique room and user identifiers

Each E2E test SHALL derive a unique `roomId` and use distinct `userId`s for the app-under-test and any injected actor, so that concurrent or repeated runs do not interfere with one another. The app-under-test SHALL be launched with cleared state.

#### Scenario: Repeated runs do not collide

- **WHEN** the same test runs twice against the same stack instance
- **THEN** each run SHALL operate on a distinct room and SHALL NOT observe state produced by the other run

### Requirement: Room lifecycle coverage

The suite SHALL cover creating a room, joining a room by its identifier, and arriving at that room's character list.

#### Scenario: Create a room

- **WHEN** the user creates a new room from the Rooms screen
- **THEN** the app SHALL navigate into the room and present the character list for that room

#### Scenario: Join a room by id

- **WHEN** the user joins an existing room using its identifier
- **THEN** the app SHALL navigate into that room and present its character list

### Requirement: Character lifecycle coverage

The suite SHALL cover creating, editing, changing (name and/or avatar), and deleting a character within a room, asserting the resulting list state after each operation.

#### Scenario: Create a character

- **WHEN** the user creates a character in a room
- **THEN** the new character SHALL appear in that room's character list

#### Scenario: Edit a character

- **WHEN** the user edits a character's editable attributes
- **THEN** the character's displayed values SHALL reflect the edit

#### Scenario: Delete a character

- **WHEN** the user deletes a character and confirms the deletion
- **THEN** the character SHALL no longer appear in the room's character list

### Requirement: Cross-user character update coverage

The suite SHALL cover an external actor ("actor B"), injected via direct HTTP calls to the backend as a different user in the same room, whose character writes cause the app-under-test's ("actor A") screen to update over the WebSocket path. Assertions SHALL wait for the update rather than asserting on a fixed delay.

#### Scenario: Actor B creates a character

- **WHEN** actor A is viewing a room's character list and actor B creates a character in that room via the backend
- **THEN** actor A's list SHALL show actor B's new character without a manual refresh

#### Scenario: Actor B updates a character

- **WHEN** actor A is viewing the room and actor B updates a character in that room via the backend
- **THEN** actor A's view SHALL reflect the updated character values without a manual refresh

#### Scenario: Actor B deletes a character

- **WHEN** actor A is viewing the room and actor B deletes a character in that room via the backend
- **THEN** the deleted character SHALL disappear from actor A's list without a manual refresh

#### Scenario: Actor A's own edit is applied exactly once

- **WHEN** actor A edits its own character and the backend echoes the corresponding update event back over the WebSocket
- **THEN** actor A's list SHALL reflect the edit exactly once, with no duplicated or reverted state from the echoed event

### Requirement: Web CI gating and native frontend commit gate

The E2E suite SHALL run the exported web app in CI as the required `e2e-web` check on affected pull requests. iOS and Android E2E SHALL run locally, in that order and without concurrent Maestro commands, before a commit that stages one or more paths under `frontend/`. The native gate SHALL start and stop the local backend stack and use `http://localhost:8080` for the iOS build and `http://10.0.2.2:8080` for the Android build. The suite SHALL remain runnable locally on each platform, with documented setup including the Android emulator host address and the web export/serve steps.

#### Scenario: PR is gated by web E2E

- **WHEN** a pull request is opened or updated
- **THEN** the exported web E2E suite SHALL run as the required `e2e-web` check

#### Scenario: Frontend commit runs native E2E

- **WHEN** a developer attempts a commit with staged changes under `frontend/`
- **THEN** the Husky pre-commit gate SHALL run iOS E2E followed by Android E2E against the local backend stack, and the commit SHALL fail if either platform fails

#### Scenario: Non-frontend commit skips native E2E

- **WHEN** a developer attempts a commit with no staged paths under `frontend/`
- **THEN** the pre-commit gate SHALL skip the native E2E suite

#### Scenario: Suite is runnable locally

- **WHEN** a developer follows the testing guide for a given platform
- **THEN** they SHALL be able to boot the stack and run the same flows locally on that platform
