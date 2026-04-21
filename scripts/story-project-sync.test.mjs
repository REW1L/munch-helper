import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPullRequestOperations,
  buildPushOperations,
  extractStoryRefsFromMarkdown,
  parseImplementationArtifact,
  parseNameStatus,
  parseStoryTitle,
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
      storyNumber: "3.8",
      title: "Realtime Update Signal on Character Cards",
      fullTitle: "Story 3.8: Realtime Update Signal on Character Cards",
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
    storyNumber: "3.8",
    title: "Realtime Update Signal on Character Cards",
    fullTitle: "Story 3.8: Realtime Update Signal on Character Cards",
    sourcePaths: [
      "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md",
    ],
    ensureIssue: true,
    ensureProjectItem: true,
    targetStatus: "ready-for-dev",
    onlyIfCurrentStatus: "review",
  });
});
