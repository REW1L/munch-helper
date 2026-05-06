---
title: 'Ready For Dev Orchestrator'
type: 'feature'
created: '2026-05-02'
status: 'in-review'
baseline_commit: '1909673d0a6ab50cf57c9b4f3569123c7c92d759'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/spec-story-project-status-sync.md'
  - 'scripts/story-project-sync.mjs'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Issues that reach `Ready for Dev` on the user-owned project `users/REW1L/projects/1` still need a developer to pick them up by hand. We want the available coding-assistant CLIs to attempt the implementation automatically — falling forward across CLIs if one runs out of quota — and to open a pull request when the implementation is complete.

**Approach:** Extend the existing `story-project-sync` to post a deterministic marker comment on the issue whenever it transitions a project item to `Ready for Dev`. Add a new GitHub Actions workflow that triggers on `issue_comment.created` with author + marker filters (and `workflow_dispatch` for manual operator runs). On trigger, the workflow resolves the issue to its BMAD implementation-artifact spec file, verifies which CLIs are installed and authenticated, invokes them in a configured order with the prompt `bmad-dev-story implement '<issue title>'`, and detects success purely by reading the spec file's `status:` frontmatter. When `status: review`, `status: in-review`, or `status: done` is observed, the workflow commits, pushes a branch, and opens a PR; the existing `story-project-sync` then advances the project board on PR open.

## Boundaries & Constraints

**Always:** Treat one workflow run as one issue. Detect cascade success only by reading `status:` in the spec file frontmatter (`review`, `in-review`, or `done` = done); use quota-signal regex purely for log clarity, never as the sole stop condition. Reuse helpers from `scripts/story-project-sync.mjs` (story slug parsing, project metadata loading, issue lookup) — export them if they aren't already. Preserve workspace state between CLI invocations within a single run so a later agent inherits the prior agent's edits. Run agents in this default order: `claude`, `codex`, `copilot`, `kiro-cli`, but expose the order as a workflow input. Use a per-CLI timeout (default 30 min). Open the PR only after a real `review`, `in-review`, or `done` flip. Branch name pattern: `auto-dev/issue-<number>`. Use a stable trigger contract: marker comment must contain the literal HTML comment `<!-- auto-dev:trigger v1 -->` plus a JSON code block payload with `issue_number` and `spec_file`; the orchestrator reads the issue number from `github.event.issue.number` and verifies the marker shape before doing anything else.

**Ask First:** Whether to switch the cascade order to `claude → codex → kiro-cli → copilot` based on detection-reliability research (Copilot has the weakest non-interactive quota signal and the most opaque PAT requirement). Whether to additionally accept a human-typed slash-comment (e.g. `/auto-dev`) as a manual trigger path alongside `workflow_dispatch` — useful when a card is dragged manually in the UI and `story-project-sync` doesn't run.

**Never:** Do not mutate the project board's `Status` field directly — `story-project-sync` owns that on PR open. Do not reset, stash, or clean the workspace between agent invocations within a run. Do not open a PR if `status` never reached `review`, `in-review`, or `done`. Do not pass `secrets.GITHUB_TOKEN` to the Copilot CLI — it lacks the Copilot Requests scope; require a dedicated `COPILOT_GITHUB_TOKEN` PAT. Do not subscribe to `projects_v2_item` events — they do not fire for user-owned projects. Do not chain workflows via `workflow_run` — keep the trigger contract textual (the marker comment) so any path that posts the marker works identically. Do not trigger the orchestrator from comments authored by anyone other than the project owner or `github-actions[bot]`. Do not implement bespoke quota-detection HTTP calls when the regex + outcome check already covers the cascade decision.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| DISPATCH_WITH_ISSUE | `workflow_dispatch` with `issue_number` input | Resolve issue title → spec file → run cascade on a new or existing `auto-dev/issue-<n>` branch | Fail before invoking any CLI if title does not map to a spec file |
| MARKER_COMMENT_RECEIVED | `issue_comment.created`, body contains `<!-- auto-dev:trigger v1 -->`, author is owner or `github-actions[bot]`, `issue.pull_request == null` | Parse JSON payload from comment body, run cascade against `github.event.issue.number` | Exit 0 silently if any filter check fails (wrong author, missing marker, comment on a PR, malformed JSON) |
| SYNC_POSTS_MARKER | `story-project-sync` transitions a project item to `Ready for Dev` | Sync workflow posts a marker comment on the issue idempotently — once per transition, skipped if the most recent comment is already a v1 marker for the same status | Sync run logs the post failure but does not fail the sync; orchestrator path is best-effort, not blocking |
| AGENT_HITS_LIMIT_MID_TASK | A CLI exits non-zero or matches the quota regex; spec status still not `review`, `in-review`, or `done` | Fall through to next CLI in the same run, against the same workspace | Log the matched signal and the CLI; preserve partial edits |
| SPEC_FLIPS_TO_REVIEW | Spec file `status:` reads `review`, `in-review`, or `done` after a CLI run | Commit pending changes, push the branch, open a PR with `Closes #<issue>` body, exit 0 | If `gh pr create` fails (e.g. branch already has a PR), update the existing PR's branch and exit 0 |
| ALL_AGENTS_EXHAUSTED | After the last CLI, spec status still not `review`, `in-review`, or `done` | Push the branch (if any commits) for resumption, exit non-zero, upload run logs as artifact | Operator re-runs the workflow to resume the same branch |
| ISSUE_NOT_MAPPABLE | Issue title does not match any `_bmad-output/implementation-artifacts/<file>.md` | Fail fast with a clear error before invoking any CLI | N/A |
| NO_CLIS_AVAILABLE | Pre-flight finds zero installed-and-authenticated CLIs | Fail fast with a list of which checks failed | N/A |

</frozen-after-approval>

## Code Map

- `.github/workflows/ready-for-dev-orchestrator.yml` -- New workflow with `issue_comment` + `workflow_dispatch` triggers; sets up Node 20, installs available CLIs, configures git identity, exposes secrets as env vars, runs the orchestrator script, uploads run logs.
- `scripts/ready-for-dev-orchestrator.mjs` -- New ESM script: resolves the target issue (from event payload or dispatch input), maps issue title → spec file, pre-flights CLI availability, runs the cascade with per-CLI timeout, reads spec status after each invocation, commits / pushes / opens PR on success.
- `scripts/ready-for-dev-orchestrator.test.mjs` -- Tests: issue→file mapping, spec status parsing, cascade decision (each agent succeeds, all fail, mid-cascade success), quota-signal regex against canned stderr fixtures, marker-comment payload parsing, dry-run command plan.
- `scripts/story-project-sync.mjs` -- Add a marker-comment post step on every `Ready for Dev` transition (idempotent — skip if the issue's latest comment is already a v1 marker for this status). Also export the reusable helpers (`parseStoryTitle`, `loadProjectMetadata`, `findIssueForArtifact`, slug derivation) the orchestrator script needs.
- `scripts/story-project-sync.test.mjs` -- Extend with tests covering the new marker-comment behavior: posted on transition, idempotent, body shape, error path doesn't fail the sync.
- `README.md` -- Add an "Auto-implementation orchestrator" section: required secrets, manual trigger example, marker-comment contract, cascade behavior, observability.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/ready-for-dev-orchestrator.mjs` -- Implement orchestration. Inputs: `--issue <n>` (from dispatch input or parsed from `github.event.issue.number` on comment events), `--order claude,codex,copilot,kiro-cli`, `--timeout 30m`, `--dry-run`. Steps: resolve issue + spec file path (prefer the `spec_file` carried in the marker comment payload when present, fall back to deriving from issue title); checkout-or-create `auto-dev/issue-<n>` branch (resume if it exists); pre-flight each requested CLI (`which` + minimal auth probe — env var present and `--version` succeeds); for each CLI in order, run `timeout <T> <cli> <flags> "bmad-dev-story implement '<title>'"` with stdout/stderr captured to per-agent log files; after each, re-read spec frontmatter; on `status: review`, `status: in-review`, or `status: done` stage all changes, commit (`Co-authored-by` line per CLI that ran), push, `gh pr create --title "<issue title>" --body "Closes #<n>"`, exit 0; otherwise log the quota regex match (informational), continue. If no CLI succeeds, push the branch (if it has commits ahead of base), exit non-zero. Use the existing `ghCommand` helper style and `--dry-run` semantics from `story-project-sync.mjs`.
- [x] `.github/workflows/ready-for-dev-orchestrator.yml` -- Triggers: `workflow_dispatch` with `issue_number` (required) and optional `agent_order` input; `issue_comment: { types: [created] }`. Top-level `if` on the comment-triggered job: `github.event_name == 'workflow_dispatch' || (github.event.issue.pull_request == null && contains(github.event.comment.body, '<!-- auto-dev:trigger v1 -->') && (github.event.comment.user.login == 'REW1L' || github.event.comment.user.login == 'github-actions[bot]'))`. `concurrency: { group: 'auto-dev-${{ github.event.issue.number || inputs.issue_number }}', cancel-in-progress: false }`. Permissions: `contents: write`, `pull-requests: write`, `issues: write` (for posting any progress comments back). Steps: checkout with `fetch-depth: 0` and explicit `ref: main`, setup Node 20, install CLIs that have credentials (skip ones whose secret is missing), `git config user.name/email` for the bot, run `node scripts/ready-for-dev-orchestrator.mjs ...`, `actions/upload-artifact` of the per-agent logs. Env passthrough: `ANTHROPIC_API_KEY`, `CODEX_API_KEY`, `OPENAI_API_KEY`, `COPILOT_GITHUB_TOKEN`, `KIRO_API_KEY`, plus the existing `GH_PROJECT_TOKEN` set as `GH_TOKEN` and `GITHUB_TOKEN`.
- [x] `scripts/ready-for-dev-orchestrator.test.mjs` -- `node:test` suites covering: issue title `Story 3.1: AppTheme Token Migration` → `_bmad-output/implementation-artifacts/3-1-apptheme-token-migration.md`; spec status frontmatter parsing for both story-style (`Status: review`) and spec-style (`status: 'review'` / `status: 'in-review'` / `status: 'done'`); cascade decision when each CLI succeeds at position 1/2/3/4, including success on `review`, `in-review`, or `done`; cascade decision when all four fail; quota-signal regex against captured fixtures (Claude `rate_limit_error`, Codex `usage limit`, Copilot `premium request allowance`, Kiro `limit reached`); marker-comment payload extraction (well-formed, malformed JSON, missing marker); dry-run command plan output.
- [x] `scripts/story-project-sync.mjs` -- Add `postReadyForDevMarker(issue, specFile)` helper invoked whenever the sync emits a status transition to `Ready for Dev`. Body: a brief human-readable line plus `<!-- auto-dev:trigger v1 -->` and a fenced `json` payload `{"issue_number": <n>, "spec_file": "<path>", "version": 1}`. Idempotency: query the last 5 issue comments via `gh issue view <n> --json comments`, skip if the most recent comment is already a v1 marker pointing at the same `spec_file`. Failures are logged but do not fail the sync run. Export the helpers (`parseStoryTitle`, `loadProjectMetadata`, `findIssueForArtifact`, slug derivation) the orchestrator script needs.
- [x] `scripts/story-project-sync.test.mjs` -- Add coverage: marker is posted on a fresh `Ready for Dev` transition; marker is skipped when an identical recent marker already exists; marker body shape (HTML comment + JSON payload); marker post failure is logged and swallowed (sync still reports success).
- [x] `README.md` -- Document required secrets (`ANTHROPIC_API_KEY`, `CODEX_API_KEY` *or* `OPENAI_API_KEY`, `COPILOT_GITHUB_TOKEN` (PAT with Copilot Requests), `KIRO_API_KEY`), how to trigger manually (`gh workflow run ready-for-dev-orchestrator.yml -f issue_number=42`), the marker-comment contract (so other automations can post the marker if needed), the cascade order, and how to read the run-log artifact.

**Acceptance Criteria:**
- Given `story-project-sync` transitions a project item to `Ready for Dev`, when it posts the marker comment on the issue, then the orchestrator workflow fires on `issue_comment.created`, parses the payload, and runs the cascade against that issue.
- Given an arbitrary user comments a body that does not match the marker contract or whose author is neither the project owner nor `github-actions[bot]`, when the orchestrator workflow evaluates its `if` gate, then the job is skipped and no CLI is invoked.
- Given the operator runs `gh workflow run ready-for-dev-orchestrator.yml -f issue_number=42`, when the workflow starts, then it resolves the issue title, maps it to its spec file, and runs the cascade — even if no marker comment exists.
- Given the first CLI exits with a quota signal and the spec status is still none of `review`, `in-review`, or `done`, when the workflow continues, then it invokes the next CLI in the cascade against the same workspace and accumulated edits.
- Given all configured CLIs run and none reaches `review`, `in-review`, or `done`, when the orchestrator finishes, then the workflow exits non-zero, pushes the branch if commits exist, and uploads per-agent log files as a workflow artifact.
- Given the first available CLI completes `bmad-dev-story implement` and updates the spec file to `status: review`, `status: in-review`, or `status: done`, when the orchestrator detects the flip, then it commits, pushes `auto-dev/issue-<n>`, and opens a PR whose body contains `Closes #<n>`.
- Given a previously failed orchestrator branch exists for an issue, when the orchestrator runs again for that issue, then it checks out the existing branch and continues the cascade from the prior workspace state.
- Given the issue title does not map to any spec file in `_bmad-output/implementation-artifacts/`, when the workflow runs, then it fails before invoking any CLI with a clear "no spec file matched" error.
- Given Copilot is in the cascade but `COPILOT_GITHUB_TOKEN` is unset, when pre-flight runs, then Copilot is skipped (logged), not failed, and the cascade proceeds with the remaining CLIs.
- Given `story-project-sync` runs and the issue's most recent comment is already a v1 marker pointing at the same spec file, when the sync evaluates its idempotency check, then it does not post a duplicate marker and the orchestrator is not re-triggered for the same transition.

## Design Notes

The cascade-stop contract is intentionally outcome-based, not signal-based: the spec file's `status:` is the canonical source of truth for "this issue is implemented", and that contract is shared with the existing `story-project-sync` workflow which advances the board on PR open. Quota-signal regex `(?i)(usage limit|quota|rate.?limit|429|premium request|hit your.*limit|credit balance)` over combined stdout+stderr is logged but does not gate the cascade — a CLI that exits 0 without flipping status still falls through; a CLI that exits non-zero with no matched signal still falls through. This avoids brittle CLI-version coupling.

CLI invocation flags (default):
- `claude -p --output-format stream-json --verbose --include-partial-messages` (set `CLAUDE_CODE_MAX_RETRIES=2` to fail fast)
- `codex exec --json --ask-for-approval never --sandbox workspace-write --skip-git-repo-check`
- `copilot -p --no-ask-user --allow-all-tools`
- `kiro-cli chat --no-interactive --trust-all-tools`

User-project trigger gap (researched 2026-05-02): `projects_v2_item` does not fire for `users/<name>/projects/<n>` — still organization-only per current GitHub docs and the unresolved community feedback thread #17405. Pure project Status column moves also fire no `issues` events (the `issues.edited` payload carries no project field changes), so filtering issue events on status is a dead end. The chosen design uses a marker-comment contract instead of workflow chaining: when `story-project-sync` transitions an item to `Ready for Dev`, it posts a deterministic comment on the issue, and the orchestrator triggers on `issue_comment.created`. This decouples the orchestrator from any specific source workflow — anything authorized that posts the marker triggers it identically — and keeps the contract textual and inspectable in the issue thread.

Marker comment shape (the implementation should reproduce this exactly):

```
🚀 **Status moved to Ready for Dev** — auto-implementation orchestrator queued.

<!-- auto-dev:trigger v1 -->
```json
{"version": 1, "issue_number": 42, "spec_file": "_bmad-output/implementation-artifacts/3-1-apptheme-token-migration.md"}
```
```

Authorization: the orchestrator's job-level `if` rejects any comment whose author is not the project owner (`REW1L`) or `github-actions[bot]`. This blocks an external commenter from triggering CLI runs by pasting a marker.

UI-drag gap: when a human drags a card to `Ready for Dev` directly in the project UI, `story-project-sync` does not run, so no marker is posted and the orchestrator does not fire. Operator workaround: `gh workflow run ready-for-dev-orchestrator.yml -f issue_number=<n>`. (See Ask-First about adding a slash-comment manual trigger if this gap matters in practice.)

## Verification

**Commands:**
- `node --test scripts/ready-for-dev-orchestrator.test.mjs` -- expected: all suites pass
- `node --test scripts/story-project-sync.test.mjs` -- expected: existing suites plus new marker-comment cases pass
- `node scripts/ready-for-dev-orchestrator.mjs --dry-run --issue 1` -- expected: prints the planned `gh`, `git`, and CLI commands without executing any
- `gh workflow run ready-for-dev-orchestrator.yml -f issue_number=<n>` (after merge, with secrets configured) -- expected: cascade runs end-to-end and either opens a PR or fails with the run-log artifact attached

**Manual checks:**
- Trigger an end-to-end flow by pushing a new implementation-artifact to `main`; confirm `story-project-sync` posts a marker comment on the resulting issue and the orchestrator workflow fires within seconds.
- After a PR is opened by the orchestrator, confirm `story-project-sync` advances the project item from `Ready for Dev` to `Review` automatically.
- Inspect the uploaded run-log artifact and confirm one log file per agent invocation, plus the final spec `status:` value at the end of the run.
- Post a non-marker comment from a non-owner account on a test issue; confirm the orchestrator workflow either does not run or runs with the gating job skipped.
