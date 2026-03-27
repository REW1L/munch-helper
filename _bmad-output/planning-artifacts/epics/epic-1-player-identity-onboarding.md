# Epic 1: Player Identity & Onboarding

Players can enter the app without an account, establish a persistent player identity with a random name and avatar, and optionally update their profile at any time.

## Story 1.1: Landing Screen `[TODO]`

As a new or returning user,
I want to land on a screen that clearly explains what Munch Helper is and gives me a single button to enter the app,
So that I immediately understand the app's purpose and know how to proceed.

**Acceptance Criteria:**

**Given** I open the app
**When** the landing screen loads
**Then** I see the app name, a short description of its purpose, and a prominent "Rooms" button
**And** Privacy and Support links are accessible from the landing screen
**And** an App Store (iOS) link is accessible at the bottom of the landing screen, appears as a standard store link, and opens `https://apps.apple.com/us/app/munch-helper/id6760627502`
**And** a Google Play (Android) link is visible at the bottom of the landing screen as a standard store link style, is disabled for now, and includes a visible `soon` label
**And** tapping "Rooms" navigates me to the rooms view

## Story 1.2: Automatic Player Identity Creation `[DONE]`

As a new player navigating to the rooms view for the first time,
I want a player identity to be silently created for me with a random name and avatar,
So that I can join or create a room immediately without any setup friction.

**Acceptance Criteria:**

**Given** I am a new user with no existing player identity
**When** I navigate to the rooms view
**Then** a random player name and avatar are automatically assigned to me with no visible setup prompt
**And** this identity is persisted locally for future sessions
**And** no account registration or manual input is required

## Story 1.3: Optional Player Profile Update `[DONE]`

As a player,
I want to optionally update my display name and avatar,
So that I can personalise how I appear to others if I choose to.

**Acceptance Criteria:**

**Given** I have an automatically assigned player identity
**When** I choose to open profile settings
**Then** I can update my name and avatar
**And** saving my changes persists the updated profile for future sessions
**And** if I skip or ignore profile settings entirely, the auto-assigned identity continues to work without any prompt or interruption
