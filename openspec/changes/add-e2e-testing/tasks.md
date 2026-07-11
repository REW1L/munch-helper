## 1. Local backend harness

- [ ] 1.1 Add a script to boot `backend/docker-compose.local.yml` and wait for readiness (poll `GET :8080/health` and required service health) before returning
- [ ] 1.2 Add a matching teardown that stops the stack and, in CI, uses fresh volumes so each run starts clean
- [ ] 1.3 Add a `roomId`/`userId` generator that produces unique ids per test run
- [ ] 1.4 Add the actor-B HTTP helper (create/update/delete a character as a given `userId` in a given `roomId` against `:8080`), reusable from Maestro `runScript`

## 2. testID audit for first-cut screens

- [ ] 2.1 Walk the room lifecycle (Rooms → create/join → character list) and confirm every element a flow must select has a stable `testID`; add `testID` props where missing (prop-only, no behavior change)
- [ ] 2.2 Walk the character lifecycle (create, edit/quick-edit, change name/avatar, delete + confirm) and do the same audit/additions
- [ ] 2.3 Verify `testID`s render as `data-testid` in the web export for the audited screens

## 3. Room + character lifecycle flows

- [ ] 3.1 Author the room lifecycle flow(s): create a room and land in its character list; join a room by id and land in its list — parameterized by `${ROOM_ID}`/`${USER_ID}`, launched with `clearState`
- [ ] 3.2 Author the character create flow and assert the character appears in the list
- [ ] 3.3 Author the character edit/quick-edit flow and assert updated values
- [ ] 3.4 Author the character change (name/avatar) flow and assert the change
- [ ] 3.5 Author the character delete flow (with confirm) and assert removal

## 4. Cross-user character update flows

- [ ] 4.1 Actor B creates a character (via helper) while actor A views the room → assert it appears in A's list (use `extendedWaitUntil`, no fixed sleep)
- [ ] 4.2 Actor B updates a character → assert A's view reflects the new values
- [ ] 4.3 Actor B deletes a character → assert it disappears from A's list
- [ ] 4.4 Actor A edits its own character and the event echoes back → assert the edit is applied exactly once (local-echo suppression)
- [ ] 4.5 Ensure flows wait for actor A's WebSocket connection to be established before actor B writes

## 5. Per-platform runtime wiring

- [ ] 5.1 iOS: build/run the dev client on a simulator with `EXPO_PUBLIC_API_URL=http://localhost:8080`; confirm flows pass locally
- [ ] 5.2 Android: run on an emulator with `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` (host gotcha); confirm flows pass locally
- [ ] 5.3 Web: `expo export --platform web`, serve the static output, run `maestro test --url …`; confirm flows pass locally

## 6. CI workflow

- [ ] 6.1 Add `.github/workflows/e2e.yml` with a reusable "boot backend stack" step
- [ ] 6.2 Web job on a Linux runner (export + serve + Chromium)
- [ ] 6.3 Android job on a Linux runner (KVM emulator, warm snapshot, boot retry)
- [ ] 6.4 iOS job on a macOS runner (simulator + dev-client build, with build/Maestro caching)
- [ ] 6.5 Make all three jobs required checks on pull requests
- [ ] 6.6 Stabilize: run the workflow until green on all three platforms without retry-on-assertion flakiness

## 7. Documentation

- [ ] 7.1 Add an E2E testing guide (how to boot the stack and run flows per platform, the Android `10.0.2.2` gotcha, the web export/serve steps, and how to add a new flow)
- [ ] 7.2 Link the guide from `docs/index.md`
