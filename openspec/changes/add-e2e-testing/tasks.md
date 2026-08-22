## 1. Local backend harness

- [x] 1.1 Add a script to boot `backend/docker-compose.local.yml` and wait for readiness (poll `GET :8080/health` and required service health) before returning
- [x] 1.2 Add a matching teardown that stops the stack and, in CI, uses fresh volumes so each run starts clean
- [x] 1.3 Add a `roomId`/`userId` generator that produces unique ids per test run
- [x] 1.4 Add the actor-B HTTP helper (create/update/delete a character as a given `userId` in a given `roomId` against `:8080`), reusable from Maestro `runScript`

## 2. testID audit for first-cut screens

- [x] 2.1 Walk the room lifecycle (Rooms → create/join → character list) and confirm every element a flow must select has a stable `testID`; add `testID` props where missing (prop-only, no behavior change)
- [x] 2.2 Walk the character lifecycle (create, edit/quick-edit, change name/avatar, delete + confirm) and do the same audit/additions
- [x] 2.3 Verify `testID`s render as `data-testid` in the web export for the audited screens

## 3. Room + character lifecycle flows

- [x] 3.1 Author the room lifecycle flow(s): create a room and land in its character list; join a room by id and land in its list — parameterized by `${ROOM_ID}`/`${USER_ID}`, launched with `clearState`
- [x] 3.2 Author the character create flow and assert the character appears in the list
- [x] 3.3 Author the character edit/quick-edit flow and assert updated values
- [x] 3.4 Author the character change (name/avatar) flow and assert the change
- [x] 3.5 Author the character delete flow (with confirm) and assert removal

## 4. Cross-user character update flows

- [x] 4.1 Actor B creates a character (via helper) while actor A views the room → assert it appears in A's list (use `extendedWaitUntil`, no fixed sleep)
- [x] 4.2 Actor B updates a character → assert A's view reflects the new values
- [x] 4.3 Actor B deletes a character → assert it disappears from A's list
- [x] 4.4 Actor A edits its own character and the event echoes back → assert the edit is applied exactly once (local-echo suppression)
- [x] 4.5 Ensure flows wait for actor A's WebSocket connection to be established before actor B writes

## 5. Per-platform runtime wiring

- [x] 5.1 iOS: build/run the dev client on a simulator with `EXPO_PUBLIC_API_URL=http://localhost:8080`; confirm flows pass locally
- [x] 5.2 Android: run on an emulator with `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` (host gotcha); confirm flows pass locally
- [x] 5.3 Web: `expo export --platform web`, serve the static output, generate URL-configured flows, and run Maestro against the static output; confirm flows pass locally

## 6. CI workflow

- [x] 6.1 Add `.github/workflows/e2e.yml` with a reusable "boot backend stack" step
- [x] 6.2 Web job on a Linux runner (export + serve + Chromium)
- [x] 6.3 Remove the Android GitHub Actions job and run Android E2E in the staged-frontend commit gate
- [x] 6.4 Remove the iOS GitHub Actions job and run iOS E2E in the staged-frontend commit gate
- [x] 6.5 Keep `e2e-web` as the required pull-request E2E check
- [x] 6.6 Keep the web suite serialized and ensure it closes browser and server processes after every run

## 7. Documentation

- [x] 7.1 Add an E2E testing guide (how to boot the stack and run flows per platform, the Android `10.0.2.2` gotcha, the web export/serve steps, and how to add a new flow)
- [x] 7.2 Link the guide from `docs/index.md`

## 8. Web CI and native commit gate

- [x] 8.1 Reduce the GitHub Actions E2E workflow to the web `e2e-web` job, retaining its 60-minute timeout and teardown
- [x] 8.2 Add an installable, version-controlled pre-commit hook that runs only when staged paths include `frontend/`
- [x] 8.3 Add a serial iOS-then-Android local runner that starts the backend stack, uses the platform-specific release URLs, and cleans up Maestro and the stack on exit
- [x] 8.4 Update the proposal, design, specification, and E2E guide to describe web CI and the native commit quality gate
- [x] 8.5 Validate the hook filtering, runner syntax, workflow shape, and OpenSpec change
