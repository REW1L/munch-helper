---
title: 'Story Project Status Sync'
type: 'feature'
created: '2026-04-10'
status: 'done'
baseline_commit: '6826790'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/epics/index.md'
  - 'README.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** BMAD story state currently lives only in markdown artifacts and pull-request flow, so the GitHub Project at `users/REW1L/projects/1` and the repository issue tracker drift from the real implementation lifecycle. That forces manual issue creation and manual status movement for stories.

**Approach:** Add repository automation that watches merged `main` changes and pull-request lifecycle events, derives a canonical story identity from BMAD artifact files, creates or reuses a matching repository issue for each story, adds that issue to the GitHub Project when needed, and uses `gh project` commands from GitHub Actions to keep the project `Status` field aligned with the story lifecycle (`Ready for Dev`, `Review`, `Done`).

## Boundaries & Constraints

**Always:** Use BMAD story headings and implementation artifact filenames as the source of truth for story identity; create a repository issue as the canonical ticket record before managing its project item; keep automation idempotent so reruns do not create duplicate issues or duplicate project items or regress completed states; use a repository secret-backed token for project writes because the target is a user-owned GitHub Project; target project number `1`, project title `Munch Helper project`, and the existing `Status` field options `Ready for Dev`, `Review`, and `Done`; handle only the explicit lifecycle transitions requested by the user.

**Ask First:** If the target GitHub Project no longer exposes a `Status` single-select field with the expected option labels, or if repository issue creation needs additional metadata beyond the story title and a minimal BMAD reference body, stop and ask before inventing a fallback.

**Never:** Do not infer story identity from PR titles alone when the artifact file is absent or ambiguous; do not create draft project items when a repository issue can be used; do not mutate unrelated project fields; do not replace `gh project` or `gh issue` with bespoke GraphQL or REST mutation code unless the CLI proves insufficient for a required transition.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| STORY_DISCOVERED | A push to `main` adds or updates a planning artifact that now mentions `Story X.Y: Name`, and no matching repository issue exists yet | A repository issue titled `Story X.Y: Name` is created and added to the project | Log and fail the run if issue/project access or story parsing fails |
| ARTIFACT_CREATED | A push to `main` adds `_bmad-output/implementation-artifacts/<story-slug>.md` for a story | The workflow ensures the matching repository issue exists, adds it to the project if needed, then sets project status to `Ready for Dev` | Skip status mutation when the story item cannot be resolved uniquely |
| PR_OPENED_FOR_STORY | A pull request touches exactly one story implementation artifact whose markdown `Status:` is not `ready-for-dev` | Matching project item status becomes `Review` | Ignore PRs that do not map cleanly to one story artifact |
| STORY_DONE_ON_MAIN | A push to `main` changes a story implementation artifact status to `done` | Matching project item status becomes `Done` | Preserve current project item when the artifact status is not parseable |
| PR_CLOSED_UNMERGED | A pull request closes with `merged = false` and still maps to a story currently in `Review` | Matching project item status returns to `Ready for Dev` | Ignore the event when the project item or review status cannot be confirmed |

</frozen-after-approval>

## Code Map

- `.github/workflows/story-project-sync.yml` -- Event wiring for `push` and `pull_request` story lifecycle sync.
- `scripts/story-project-sync.mjs` -- Shared Node-based sync engine for event parsing, story resolution, change detection, repository issue lookup/creation, and `gh project` command orchestration.
- `scripts/story-project-sync.test.mjs` -- Regression coverage for story parsing, transition decisions, issue deduplication, and duplicate-protection logic around the CLI command plan.
- `README.md` -- Operator setup for required project secret and workflow behavior.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/story-project-sync.mjs` -- Implement reusable sync logic that loads event context, reads changed BMAD files from the checked-out repo, resolves story number/title/status, finds or creates the matching repository issue via `gh issue`, adds that issue to project `1` when needed, and emits deterministic `gh project item-edit` commands for the requested transition path -- keeps story logic centralized while delegating issue/project mutations to the GitHub CLI.
- [x] `.github/workflows/story-project-sync.yml` -- Add a workflow that runs on pushes to `main` and PR opened/reopened/closed events, checks out enough history for change detection, ensures `gh` is authenticated with the required token secret, resolves the project and field metadata through `gh project list`, `gh project field-list`, and `gh project item-list`, and invokes the sync script -- wires the automation into GitHub without duplicating logic.
- [x] `scripts/story-project-sync.test.mjs` -- Add targeted tests for story heading parsing, artifact-status parsing, transition selection, repository issue deduplication, and duplicate project-item avoidance, including the generated `gh issue` and `gh project` command plan -- protects the non-trivial lifecycle mapping rules.
- [x] `README.md` -- Document the required PAT secret, the dependency on repository issues as the created ticket type, project number `1`, expected `Status` field labels, and the five supported lifecycle transitions -- makes the automation operable by humans after merge.

**Acceptance Criteria:**
- Given a story appears in merged BMAD planning artifacts on `main`, when no matching repository issue exists yet, then the workflow creates exactly one issue titled with the full story number and name and adds it to the project.
- Given a merged `main` change adds a story implementation artifact, when the workflow processes the story, then it creates the matching repository issue and project item if either is missing and sets project `Status` to `Ready for Dev`.
- Given a pull request maps cleanly to a story implementation artifact whose markdown status is no longer `ready-for-dev`, when the PR is opened or reopened, then the matching project item `Status` becomes `Review`.
- Given a merged `main` change updates a story implementation artifact status to `done`, when the workflow processes the push, then the matching project item `Status` becomes `Done`.
- Given a pull request mapped to a story is closed without merge while the project item is in `Review`, when the close event is processed, then the matching project item `Status` returns to `Ready for Dev`.
- Given the same story is encountered again by later workflow runs, when the repository issue or project item already exists, then the automation reuses them and does not create duplicates.

## Spec Change Log

## Design Notes

Use one script for all event types so the story-identification rules, issue lookup, project-item lookup, and status mapping stay consistent across `push` and `pull_request` flows. Prefer deterministic repository-derived data over PR metadata because the BMAD artifacts already encode the canonical story number, title, and current state. The script should compute what `gh issue` and `gh project` operations are needed, then execute only those commands, keeping GitHub-specific behavior thin and observable.

## Verification

**Commands:**
- `node --test scripts/story-project-sync.test.mjs` -- expected: story parsing and transition tests pass
- `node scripts/story-project-sync.mjs --help` -- expected: script prints usage/config summary without throwing
- `GH_TOKEN=dummy node scripts/story-project-sync.mjs --dry-run` -- expected: script prints the planned `gh issue` and `gh project` commands without executing them

**Manual checks (if no CLI):**
- Create a dry-run-friendly workflow invocation or inspect logs from a test branch to confirm the script reports the intended story/item/status mapping before live project mutations are enabled.

## Suggested Review Order

**Workflow Entry**

- Start at the event wiring and checkout strategy for push and PR lifecycle handling.
  [`story-project-sync.yml:1`](../../.github/workflows/story-project-sync.yml#L1)

- Verify the PR head checkout fix so closed and reopened PRs diff correctly.
  [`story-project-sync.yml:42`](../../.github/workflows/story-project-sync.yml#L42)

**Story Detection**

- Review how push events collapse planning mentions and artifact transitions into one action set.
  [`story-project-sync.mjs:278`](../../scripts/story-project-sync.mjs#L278)

- Review the PR rule that only one implementation artifact can drive review transitions.
  [`story-project-sync.mjs:336`](../../scripts/story-project-sync.mjs#L336)

**GitHub CLI Orchestration**

- Check project metadata loading and strict status-option validation against the live board.
  [`story-project-sync.mjs:445`](../../scripts/story-project-sync.mjs#L445)

- Check issue reuse and canonical-title correction to avoid story-number duplicates.
  [`story-project-sync.mjs:593`](../../scripts/story-project-sync.mjs#L593)

- Check project-item creation and status mutation through `gh project`.
  [`story-project-sync.mjs:652`](../../scripts/story-project-sync.mjs#L652)

- Finish at the main execution path that binds event payloads to CLI operations.
  [`story-project-sync.mjs:730`](../../scripts/story-project-sync.mjs#L730)

**Support**

- Confirm the parser and transition tests cover the non-trivial BMAD status cases.
  [`story-project-sync.test.mjs:1`](../../scripts/story-project-sync.test.mjs#L1)

- Review the operator notes for secrets, project assumptions, and supported transitions.
  [`README.md:177`](../../README.md#L177)
