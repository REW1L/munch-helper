import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMarkerCommentBody,
  buildPullRequestOperations,
  buildPushOperations,
  deriveSpecFileSlug,
  extractStoryRefsFromMarkdown,
  getImplementationArtifactSkipReason,
  parseImplementationArtifact,
  parseTrackedImplementationArtifact,
  parseNameStatus,
  parseStoryTitle,
  shouldSkipMarkerPost,
} from "./story-project-sync.mjs";

test("parseStoryTitle extracts the story number and title", () => {
  assert.deepEqual(parseStoryTitle("Story 3.8: Realtime Update Signal on Character Cards"), {
    storyNumber: "3.8",
    title: "Realtime Update Signal on Character Cards",
    fullTitle: "Story 3.8: Realtime Update Signal on Character Cards",
  });
});

test("extractStoryRefsFromMarkdown strips BMAD status tags from planning headings", () => {
  const markdown = `
## Story 3.1: AppTheme Token Migration (technical prerequisite) \`[TODO]\` ⛔ Gate for Epics 5–6
## Story 3.8: Realtime Update Signal on Character Cards \`[TODO]\`
`;

  assert.deepEqual(extractStoryRefsFromMarkdown(markdown), [
    {
      storyNumber: "3.1",
      title: "AppTheme Token Migration (technical prerequisite)",
      fullTitle: "Story 3.1: AppTheme Token Migration (technical prerequisite)",
    },
    {
      storyNumber: "3.8",
      title: "Realtime Update Signal on Character Cards",
      fullTitle: "Story 3.8: Realtime Update Signal on Character Cards",
    },
  ]);
});

test("parseImplementationArtifact extracts title and normalized status", () => {
  const markdown = `
# Story 3.10: Character Removal

Status: Ready for Dev
`;

  assert.deepEqual(parseImplementationArtifact(markdown), {
    storyNumber: "3.10",
    title: "Character Removal",
    fullTitle: "Story 3.10: Character Removal",
    status: "ready-for-dev",
  });
});

test("parseNameStatus handles rename records", () => {
  assert.deepEqual(parseNameStatus("R100\told.md\tnew.md\n"), [
    {
      status: "R",
      previousPath: "old.md",
      path: "new.md",
    },
  ]);
});

test("getImplementationArtifactSkipReason still excludes only control files", () => {
  assert.equal(
    getImplementationArtifactSkipReason("_bmad-output/implementation-artifacts/spec-wip.md"),
    "the BMAD work-in-progress spec file"
  );
});

test("parseTrackedImplementationArtifact extracts title and status from spec frontmatter", () => {
  const markdown = `---
title: 'Story Project Status Sync'
status: 'done'
---

## Intent
`;

  assert.deepEqual(parseTrackedImplementationArtifact(markdown), {
    kind: "spec",
    identityKey: "spec:story project status sync",
    storyNumber: null,
    title: "Story Project Status Sync",
    fullTitle: "Story Project Status Sync",
    queryTitle: "Story Project Status Sync",
    status: "done",
    filePath: "",
  });
});

test("buildPushOperations plans issue creation and ready-for-dev on artifact add", () => {
  const changedFiles = [
    {
      status: "A",
      previousPath: null,
      path: "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
    },
  ];

  const currentFiles = new Map([
    [
      "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
      `
# Story 3.8: Realtime Update Signal on Character Cards

Status: ready-for-dev
`,
    ],
  ]);

  const operations = buildPushOperations({
    changedFiles,
    payload: { before: "abc123" },
    loadCurrent: (filePath) => currentFiles.get(filePath) ?? null,
    loadPrevious: () => null,
  });

  assert.deepEqual(operations, [
    {
      kind: "story",
      identityKey: "story:3.8",
      storyNumber: "3.8",
      title: "Realtime Update Signal on Character Cards",
      fullTitle: "Story 3.8: Realtime Update Signal on Character Cards",
      queryTitle: "Story 3.8*",
      sourcePaths: [
        "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
      ],
      ensureIssue: true,
      ensureProjectItem: true,
      targetStatus: "ready-for-dev",
      onlyIfCurrentStatus: null,
    },
  ]);
});

test("buildPushOperations upgrades to done when the artifact status changes to done", () => {
  const changedFiles = [
    {
      status: "M",
      previousPath: null,
      path: "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
    },
  ];

  const currentFiles = new Map([
    [
      "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
      `
# Story 3.8: Realtime Update Signal on Character Cards

Status: done
`,
    ],
  ]);

  const previousFiles = new Map([
    [
      "abc123:_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
      `
# Story 3.8: Realtime Update Signal on Character Cards

Status: in-review
`,
    ],
  ]);

  const operations = buildPushOperations({
    changedFiles,
    payload: { before: "abc123" },
    loadCurrent: (filePath) => currentFiles.get(filePath) ?? null,
    loadPrevious: (revision, filePath) => previousFiles.get(`${revision}:${filePath}`) ?? null,
  });

  assert.equal(operations[0].targetStatus, "done");
});

test("buildPullRequestOperations plans review when one implementation artifact is active", () => {
  const changedFiles = [
    {
      status: "M",
      previousPath: null,
      path: "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
    },
  ];

  const currentFiles = new Map([
    [
      "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
      `
# Story 3.8: Realtime Update Signal on Character Cards

Status: in-progress
`,
    ],
  ]);

  const operations = buildPullRequestOperations({
    changedFiles,
    payload: { action: "opened", pull_request: { merged: false } },
    loadCurrent: (filePath) => currentFiles.get(filePath) ?? null,
  });

  assert.equal(operations[0].targetStatus, "review");
});

test("buildPullRequestOperations plans ready-for-dev only for unmerged closes", () => {
  const changedFiles = [
    {
      status: "M",
      previousPath: null,
      path: "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
    },
  ];

  const currentFiles = new Map([
    [
      "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
      `
# Story 3.8: Realtime Update Signal on Character Cards

Status: in-progress
`,
    ],
  ]);

  const operations = buildPullRequestOperations({
    changedFiles,
    payload: { action: "closed", pull_request: { merged: false } },
    loadCurrent: (filePath) => currentFiles.get(filePath) ?? null,
  });

  assert.deepEqual(operations[0], {
    kind: "story",
    identityKey: "story:3.8",
    storyNumber: "3.8",
    title: "Realtime Update Signal on Character Cards",
    fullTitle: "Story 3.8: Realtime Update Signal on Character Cards",
    queryTitle: "Story 3.8*",
    sourcePaths: [
      "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
    ],
    ensureIssue: true,
    ensureProjectItem: true,
    targetStatus: "ready-for-dev",
    onlyIfCurrentStatus: "review",
  });
});

test("buildPullRequestOperations tracks spec artifacts in implementation-artifacts", () => {
  const changedFiles = [
    {
      status: "A",
      previousPath: null,
      path: "_bmad-output/implementation-artifacts/spec-story-project-status-sync.md",
    },
  ];

  const currentFiles = new Map([
    [
      "_bmad-output/implementation-artifacts/spec-story-project-status-sync.md",
      `---
title: 'Story Project Status Sync'
status: 'in-progress'
---
`,
    ],
  ]);

  const operations = buildPullRequestOperations({
    changedFiles,
    payload: { action: "opened", pull_request: { merged: false } },
    loadCurrent: (filePath) => currentFiles.get(filePath) ?? null,
  });

  assert.deepEqual(operations[0], {
    kind: "spec",
    identityKey: "spec:story project status sync",
    storyNumber: null,
    title: "Story Project Status Sync",
    fullTitle: "Story Project Status Sync",
    queryTitle: "Story Project Status Sync",
    sourcePaths: ["_bmad-output/implementation-artifacts/spec-story-project-status-sync.md"],
    ensureIssue: true,
    ensureProjectItem: true,
    targetStatus: "review",
    onlyIfCurrentStatus: null,
  });
});

test("buildPullRequestOperations handles the current mixed PR shape with one tracked spec artifact", () => {
  const changedFiles = [
    {
      status: "A",
      previousPath: null,
      path: ".github/workflows/story-project-sync.yml",
    },
    {
      status: "M",
      previousPath: null,
      path: "README.md",
    },
    {
      status: "A",
      previousPath: null,
      path: "_bmad-output/implementation-artifacts/spec-story-project-status-sync.md",
    },
    {
      status: "A",
      previousPath: null,
      path: "scripts/story-project-sync.mjs",
    },
    {
      status: "A",
      previousPath: null,
      path: "scripts/story-project-sync.test.mjs",
    },
  ];

  const diagnostics = [];
  const currentFiles = new Map([
    [
      "_bmad-output/implementation-artifacts/spec-story-project-status-sync.md",
      `---
title: 'Story Project Status Sync'
status: 'in-review'
---
`,
    ],
  ]);

  const operations = buildPullRequestOperations({
    changedFiles,
    payload: { action: "opened", pull_request: { merged: false } },
    loadCurrent: (filePath) => currentFiles.get(filePath) ?? null,
    diagnostics,
  });

  assert.deepEqual(operations, [
    {
      kind: "spec",
      identityKey: "spec:story project status sync",
      storyNumber: null,
      title: "Story Project Status Sync",
      fullTitle: "Story Project Status Sync",
      queryTitle: "Story Project Status Sync",
      sourcePaths: ["_bmad-output/implementation-artifacts/spec-story-project-status-sync.md"],
      ensureIssue: true,
      ensureProjectItem: true,
      targetStatus: "review",
      onlyIfCurrentStatus: null,
    },
  ]);

  assert.ok(
    diagnostics.some((entry) =>
      entry.includes("Pull request file .github/workflows/story-project-sync.yml is excluded")
    )
  );
  assert.ok(
    diagnostics.some((entry) => entry.includes("Pull request file README.md is excluded"))
  );
  assert.ok(
    diagnostics.every(
      (entry) =>
        !entry.includes(
          "Pull request file _bmad-output/implementation-artifacts/spec-story-project-status-sync.md is excluded"
        )
    )
  );
});

test("deriveSpecFileSlug converts story number and title to a spec file slug", () => {
  assert.equal(deriveSpecFileSlug("3.1", "AppTheme Token Migration"), "3-1-apptheme-token-migration");
  assert.equal(
    deriveSpecFileSlug("3.8", "Realtime Update Signal on Character Cards"),
    "3-8-realtime-update-signal-on-character-cards"
  );
});

test("buildMarkerCommentBody produces the expected HTML comment and JSON payload", () => {
  const body = buildMarkerCommentBody(
    42,
    "_bmad-output/implementation-artifacts/spec-foo.md"
  );

  assert.ok(body.includes("<!-- auto-dev:trigger v1 -->"));
  assert.ok(body.includes("🚀 **Status moved to Ready for Dev**"));

  const jsonMatch = body.match(/```json\r?\n(\{[\s\S]*?\})\r?\n```/);
  assert.ok(jsonMatch, "JSON fenced block should be present");

  const payload = JSON.parse(jsonMatch[1]);
  assert.deepEqual(payload, {
    version: 1,
    issue_number: 42,
    spec_file: "_bmad-output/implementation-artifacts/spec-foo.md",
  });
});

test("shouldSkipMarkerPost returns false when there are no recent comments", () => {
  assert.equal(shouldSkipMarkerPost([], "spec.md"), false);
});

test("shouldSkipMarkerPost returns true when the most recent comment is an identical v1 marker", () => {
  const body = buildMarkerCommentBody(42, "_bmad-output/implementation-artifacts/spec-foo.md");
  assert.equal(
    shouldSkipMarkerPost([{ body }], "_bmad-output/implementation-artifacts/spec-foo.md"),
    true
  );
});

test("shouldSkipMarkerPost returns false when the most recent marker points at a different spec_file", () => {
  const body = buildMarkerCommentBody(42, "_bmad-output/implementation-artifacts/spec-foo.md");
  assert.equal(
    shouldSkipMarkerPost([{ body }], "_bmad-output/implementation-artifacts/spec-bar.md"),
    false
  );
});

test("shouldSkipMarkerPost returns false when the most recent comment is not a v1 marker", () => {
  assert.equal(
    shouldSkipMarkerPost([{ body: "Just a regular comment" }], "spec.md"),
    false
  );
});

test("shouldSkipMarkerPost returns false when the marker JSON is malformed", () => {
  const malformedBody = [
    "<!-- auto-dev:trigger v1 -->",
    "```json",
    "{not valid json}",
    "```",
  ].join("\n");
  assert.equal(shouldSkipMarkerPost([{ body: malformedBody }], "spec.md"), false);
});

test("postReadyForDevMarker is posted on a fresh ready-for-dev transition", async () => {
  const { postReadyForDevMarker: postMarker } = await import("./story-project-sync.mjs");

  const calls = [];
  const mockGhExec = (args, options) => {
    calls.push({ args: [...args], options });
    if (args.includes("view")) {
      return JSON.stringify({ comments: [] });
    }
    return "";
  };

  postMarker(
    { repo: "owner/repo" },
    { number: 42 },
    "_bmad-output/implementation-artifacts/spec-foo.md",
    false,
    [],
    { ghExec: mockGhExec }
  );

  const commentCall = calls.find((c) => c.args.includes("comment"));
  assert.ok(commentCall, "gh issue comment should have been called");
  assert.ok(
    commentCall.options?.stdin?.includes("<!-- auto-dev:trigger v1 -->"),
    "Posted body should contain the trigger marker"
  );
});

test("postReadyForDevMarker is skipped when an identical recent marker already exists", async () => {
  const { postReadyForDevMarker: postMarker } = await import("./story-project-sync.mjs");

  const specFile = "_bmad-output/implementation-artifacts/spec-foo.md";
  const existingBody = buildMarkerCommentBody(42, specFile);
  const calls = [];
  const mockGhExec = (args) => {
    calls.push([...args]);
    if (args.includes("view")) {
      return JSON.stringify({ comments: [{ body: existingBody }] });
    }
    return "";
  };

  postMarker({ repo: "owner/repo" }, { number: 42 }, specFile, false, [], { ghExec: mockGhExec });

  assert.ok(
    !calls.some((c) => c.includes("comment")),
    "gh issue comment should NOT have been called when duplicate marker exists"
  );
});

test("postReadyForDevMarker logs failure and does not throw when gh errors", async () => {
  const { postReadyForDevMarker: postMarker } = await import("./story-project-sync.mjs");

  const throwingGhExec = () => {
    throw new Error("network error");
  };

  // Should not throw
  assert.doesNotThrow(() => {
    postMarker(
      { repo: "owner/repo" },
      { number: 42 },
      "spec.md",
      false,
      [],
      { ghExec: throwingGhExec }
    );
  });
});

test("push operations always include sourcePaths when targeting ready-for-dev, enabling marker post", () => {
  const changedFiles = [
    {
      status: "A",
      previousPath: null,
      path: "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
    },
  ];
  const currentFiles = new Map([
    [
      "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
      "# Story 3.8: Realtime Update Signal on Character Cards\n\nStatus: ready-for-dev\n",
    ],
  ]);
  const operations = buildPushOperations({
    changedFiles,
    payload: { before: "abc123" },
    loadCurrent: (f) => currentFiles.get(f) ?? null,
    loadPrevious: () => null,
  });

  const readyOps = operations.filter((op) => op.targetStatus === "ready-for-dev");
  assert.ok(readyOps.length > 0, "Should have ready-for-dev operations");
  assert.ok(
    readyOps.every((op) => op.sourcePaths.length > 0),
    "All ready-for-dev operations should include sourcePaths for marker posting"
  );
});
