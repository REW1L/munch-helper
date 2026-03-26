# Epic 6: Room History

Players can review a chronological history of character events and battle outcomes in a dedicated room history view so the group can understand what happened earlier in the session and revisit completed battle details when needed.

## Story 6.1: Character Events Are Published for Room History `[TODO]`

As a player,
I want character creation, update, and removal events to appear in room history,
So that the group can understand how the session state changed over time.

**Acceptance Criteria:**

**Given** a character is created, updated, or deleted
**When** `character-service` processes the event
**Then** it publishes the event to both `NOTIFICATIONS_TOPIC_ARN` and `LOG_TOPIC_ARN` via `Promise.allSettled`
**And** a missing `LOG_TOPIC_ARN` in `character-service` emits a startup warning without crashing the service
**And** the published payload includes enough display context for room history summaries without outbound HTTP calls
**And** a failed publish to one topic does not prevent the other topic publish attempt from completing

## Story 6.2: Published Events Are Stored and Readable in Room History `[TODO]`

As a player,
I want published session events to be stored and returned in room history,
So that history entries are available when I open the room history view.

**Acceptance Criteria:**

**Given** the room history subscriber service is deployed with `logWriter` and `logReader`
**When** `logWriter` starts
**Then** if `LOG_TOPIC_ARN` is absent, the Lambda fails with an error because the subscriber cannot function without the topic configuration

**Given** `logWriter` receives a supported SNS event
**When** the event is processed
**Then** it writes a `LogEvent` document to MongoDB with the correct `roomId`, `type`, `summary`, and `createdAt`
**And** it handles `character_created`, `character_updated`, `character_deleted`, `battle_started`, `battle_concluded`, and `battle_discarded`
**And** unsupported event types are ignored without creating a log entry

## Story 6.3: Battle Lifecycle Events Are Published for Room History `[TODO]`

As a player,
I want battle start, conclusion, and discard events to appear in room history,
So that the group has a durable record of battle outcomes during the session.

**Acceptance Criteria:**

**Given** `log-service` is deployed and `LOG_TOPIC_ARN` is set
**When** a battle is created, concluded, or discarded
**Then** `battle-service` publishes to `LOG_TOPIC_ARN` via `Promise.allSettled` alongside `NOTIFICATIONS_TOPIC_ARN`
**And** the event payload includes sufficient display context such as battle name, result, and character names for room history summaries without outbound HTTP calls
**And** a failed publish to one topic does not prevent the other topic publish attempt from completing
**And** `battle_updated` is not published for room history

## Story 6.4: Room History API Returns Paginated Events `[TODO]`

As a player,
I want room history to load in pages,
So that I can review older session events without waiting for the full history to load.

**Acceptance Criteria:**

**Given** `logReader` receives a `GET /logs?roomId=X&limit=50&before=<_id>` request
**When** the request is processed
**Then** it returns log entries filtered strictly by `roomId` in reverse chronological order using cursor-based pagination via MongoDB `_id`
**And** the compound index `{ roomId: 1, _id: -1 }` is in place
**And** the `before` cursor is exclusive so the next page does not repeat the last item from the previous page
**And** an empty room history returns an empty list with no error
**And** an invalid or missing `roomId` returns a client error response
**And** the response shape is stable enough for the app to render entries and request the next page
**And** test coverage verifies persistence and HTTP reader filtering behavior

## Story 6.5: Room History Loads in the App `[TODO]`

As a player,
I want the app to load room history as I browse it,
So that I can move through recent and older session events without leaving the room flow.

**Acceptance Criteria:**

**Given** I open the Room History View
**When** the screen mounts
**Then** the app requests the first page of log entries for the active room
**And** scrolling to the bottom loads the next page using the server cursor
**And** if the request fails, I see a recoverable error state
**And** while a request is in progress, I see a loading state appropriate to the view

## Story 6.6: Room History View Shows Character Events `[TODO]`

As a player,
I want to review character-related room history entries,
So that I can understand how characters changed over the course of the session.

**Acceptance Criteria:**

**Given** I am in the Room View
**When** I navigate to the Room History View
**Then** I see a scrollable list of `LogEntry` components in reverse chronological order
**And** scrolling to the bottom loads older entries via cursor pagination

**Given** a `character_created` event entry
**When** it is displayed
**Then** it shows the character's avatar, name, and a "created" label

**Given** a `character_updated` event entry
**When** it is displayed
**Then** it shows the character's avatar, name, and all changed fields as individual `prev → new` rows — multiple field changes from a single update are each shown

**Given** a `character_deleted` event entry
**When** it is displayed
**Then** it shows the character's avatar, name, and a "removed" label

**Given** no events have been recorded yet
**When** I open the Room History View
**Then** I see the empty state message "No events recorded yet." with no CTA

**Given** room history cannot be loaded
**When** I open the Room History View
**Then** I see an error state with a retry action

> **Covers:** UX-DR12, UX-DR14
> **Depends on:** Stories 3.1, 3.2, 6.5

## Story 6.7: Room History View Shows Battle Events and Opens Completed Battles `[TODO]`

As a player,
I want to review battle-related room history entries and open completed battle details,
So that I can understand battle outcomes and revisit the full record when needed.

**Acceptance Criteria:**

**Given** a battle lifecycle entry (`battle_started`, `battle_concluded`, or `battle_discarded`)
**When** it is displayed
**Then** it shows the battle name (if set), the event type, and relevant context (result for concluded, "discarded" label for discarded)
**And** I can tap any completed battle entry to inspect the full battle record
**And** if battle record drill-in is unavailable, the entry is shown as non-interactive rather than failing silently

> **Covers:** UX-DR12, UX-DR14
> **Depends on:** Stories 3.1, 3.2, 6.5, Epic 5 completed battle record support
