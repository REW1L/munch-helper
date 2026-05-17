import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STORY_HEADING_REGEX = /^#{1,6}\s+Story\s+(\d+\.\d+):\s*(.+?)\s*$/gim;
const STORY_TITLE_REGEX = /^Story\s+(\d+\.\d+):\s*(.+)$/i;
const STATUS_LINE_REGEX = /^Status:\s*(.+?)\s*$/im;
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*/;
const IMPLEMENTATION_DIR = "_bmad-output/implementation-artifacts/";
const PLANNING_DIR = "_bmad-output/planning-artifacts/";
const ZERO_SHA = "0000000000000000000000000000000000000000";

const STATUS_PRIORITY = {
  null: 0,
  "ready-for-dev": 1,
  review: 2,
  done: 3,
};

const DEFAULT_CONFIG = {
  repo: process.env.GITHUB_REPOSITORY ?? "REW1L/munch-helper",
  projectOwner: process.env.PROJECT_OWNER ?? "REW1L",
  projectNumber: Number(process.env.PROJECT_NUMBER ?? "1"),
  projectTitle: process.env.PROJECT_TITLE ?? "Munch Helper project",
  issueLabel: process.env.STORY_ISSUE_LABEL ?? "",
};

function logInfo(message) {
  console.log(`[story-project-sync] ${message}`);
}

function logSkip(diagnostics, message) {
  diagnostics.push(message);
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }

  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function formatCommand(argv) {
  return argv.map(shellQuote).join(" ");
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ghCommand(args, { dryRun = false, stdin = null } = {}) {
  if (dryRun) {
    return "";
  }

  return execFileSync("gh", args, {
    encoding: "utf8",
    input: stdin ?? undefined,
    stdio: stdin === null ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  }).trim();
}

function gitCommand(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function parseJsonOutput(text, fallback) {
  if (!text) {
    return fallback;
  }

  return JSON.parse(text);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanupPlanningTitle(rawTitle) {
  return normalizeWhitespace(
    rawTitle
      .replace(/`[^`]*`/g, "")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/⛔.*$/u, "")
  );
}

function normalizeStoryStatus(rawStatus) {
  return rawStatus
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

export function deriveSpecFileSlug(storyNumber, title) {
  const numSlug = storyNumber.replace(".", "-");
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${numSlug}-${titleSlug}`;
}

export function buildMarkerCommentBody(issueNumber, specFile) {
  return [
    "🚀 **Status moved to Ready for Dev** — auto-implementation orchestrator queued.",
    "",
    "<!-- auto-dev:trigger v1 -->",
    "```json",
    JSON.stringify({ version: 1, issue_number: issueNumber, spec_file: specFile }),
    "```",
  ].join("\n");
}

export function shouldSkipMarkerPost(recentComments, specFile) {
  if (!recentComments.length) {
    return false;
  }

  const mostRecent = recentComments[recentComments.length - 1];
  if (!mostRecent?.body?.includes("<!-- auto-dev:trigger v1 -->")) {
    return false;
  }

  const jsonMatch = mostRecent.body.match(/```json\r?\n(\{[\s\S]*?\})\r?\n```/);
  if (!jsonMatch) {
    return false;
  }

  try {
    const payload = JSON.parse(jsonMatch[1]);
    return payload.version === 1 && payload.spec_file === specFile;
  } catch {
    return false;
  }
}

export function parseStoryTitle(title) {
  const match = title.match(STORY_TITLE_REGEX);
  if (!match) {
    return null;
  }

  const storyNumber = match[1];
  const storyName = normalizeWhitespace(match[2]);
  return {
    storyNumber,
    title: storyName,
    fullTitle: `Story ${storyNumber}: ${storyName}`,
  };
}

export function extractStoryRefsFromMarkdown(markdown) {
  const stories = [];
  let match;

  while ((match = STORY_HEADING_REGEX.exec(markdown)) !== null) {
    const storyNumber = match[1];
    const title = cleanupPlanningTitle(match[2]);

    if (!title) {
      continue;
    }

    stories.push({
      storyNumber,
      title,
      fullTitle: `Story ${storyNumber}: ${title}`,
    });
  }

  return stories;
}

export function parseImplementationArtifact(markdown) {
  const headingMatch = markdown.match(/^#\s+(Story\s+\d+\.\d+:\s*.+)$/im);
  const statusMatch = markdown.match(STATUS_LINE_REGEX);
  const story = headingMatch ? parseStoryTitle(normalizeWhitespace(headingMatch[1])) : null;

  if (!story) {
    return null;
  }

  return {
    ...story,
    status: statusMatch ? normalizeStoryStatus(statusMatch[1]) : null,
  };
}

function parseFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, "im"));
  return match ? normalizeWhitespace(match[1]) : null;
}

export function parseTrackedImplementationArtifact(markdown, filePath = "") {
  const storyArtifact = parseImplementationArtifact(markdown);
  if (storyArtifact) {
    return {
      kind: "story",
      identityKey: `story:${storyArtifact.storyNumber}`,
      queryTitle: `Story ${storyArtifact.storyNumber}*`,
      ...storyArtifact,
    };
  }

  const frontmatterMatch = markdown.match(FRONTMATTER_REGEX);
  if (!frontmatterMatch) {
    return null;
  }

  const title = parseFrontmatterValue(frontmatterMatch[1], "title");
  const status = parseFrontmatterValue(frontmatterMatch[1], "status");

  if (!title) {
    return null;
  }

  return {
    kind: "spec",
    identityKey: `spec:${title.toLowerCase()}`,
    storyNumber: null,
    title,
    fullTitle: title,
    queryTitle: title,
    status: status ? normalizeStoryStatus(status) : null,
    filePath,
  };
}

export function isPlanningArtifact(filePath) {
  return filePath.startsWith(PLANNING_DIR) && filePath.endsWith(".md");
}

export function getImplementationArtifactSkipReason(filePath) {
  if (!filePath.startsWith(IMPLEMENTATION_DIR)) {
    return "outside the implementation-artifacts directory";
  }

  if (!filePath.endsWith(".md")) {
    return "not a markdown artifact";
  }

  const basename = path.basename(filePath);
  if (basename === "spec-wip.md") {
    return "the BMAD work-in-progress spec file";
  }

  if (basename === "deferred-work.md") {
    return "the BMAD deferred-work control file";
  }

  return null;
}

export function isImplementationArtifact(filePath) {
  return getImplementationArtifactSkipReason(filePath) === null;
}

export function parseNameStatusLine(line) {
  const parts = line.split("\t");
  const statusToken = parts[0] ?? "";
  const status = statusToken[0] ?? "";

  if (!status) {
    return null;
  }

  if ((status === "R" || status === "C") && parts.length >= 3) {
    return {
      status,
      previousPath: parts[1],
      path: parts[2],
    };
  }

  return {
    status,
    previousPath: null,
    path: parts[1] ?? "",
  };
}

export function parseNameStatus(output) {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parseNameStatusLine)
    .filter(Boolean);
}

function choosePreferredTitle(currentTitle, nextTitle) {
  if (!currentTitle) {
    return nextTitle;
  }

  if (!nextTitle) {
    return currentTitle;
  }

  return nextTitle.length >= currentTitle.length ? nextTitle : currentTitle;
}

function mergeTrackedAction(store, artifact, partialAction) {
  if (!artifact) {
    return;
  }

  const existing = store.get(artifact.identityKey) ?? {
    kind: artifact.kind,
    identityKey: artifact.identityKey,
    storyNumber: artifact.storyNumber,
    title: artifact.title,
    fullTitle: artifact.fullTitle,
    queryTitle: artifact.queryTitle,
    sourcePaths: new Set(),
    ensureIssue: false,
    ensureProjectItem: false,
    targetStatus: null,
    onlyIfCurrentStatus: null,
  };

  existing.title = choosePreferredTitle(existing.title, artifact.title);
  existing.fullTitle = artifact.storyNumber
    ? `Story ${artifact.storyNumber}: ${existing.title}`
    : existing.title;
  existing.queryTitle = artifact.queryTitle ?? existing.fullTitle;
  existing.ensureIssue ||= Boolean(partialAction.ensureIssue);
  existing.ensureProjectItem ||= Boolean(partialAction.ensureProjectItem);

  if (
    STATUS_PRIORITY[partialAction.targetStatus ?? null] >
    STATUS_PRIORITY[existing.targetStatus ?? null]
  ) {
    existing.targetStatus = partialAction.targetStatus ?? null;
  }

  if (partialAction.onlyIfCurrentStatus) {
    existing.onlyIfCurrentStatus = partialAction.onlyIfCurrentStatus;
  }

  for (const sourcePath of partialAction.sourcePaths ?? []) {
    existing.sourcePaths.add(sourcePath);
  }

  store.set(artifact.identityKey, existing);
}

function loadFileAtRevision(revision, filePath) {
  if (!revision || revision === ZERO_SHA) {
    return null;
  }

  try {
    return gitCommand(["show", `${revision}:${filePath}`]);
  } catch {
    return null;
  }
}

function loadCurrentFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function getChangedFilesForPush(payload) {
  const before = payload.before ?? ZERO_SHA;
  const after = payload.after ?? "HEAD";

  if (!before || before === ZERO_SHA) {
    return parseNameStatus(gitCommand(["diff-tree", "--root", "--name-status", "-r", after]));
  }

  return parseNameStatus(gitCommand(["diff", "--name-status", before, after]));
}

function getChangedFilesForPullRequest(payload) {
  const baseSha = payload.pull_request?.base?.sha;
  const headSha = payload.pull_request?.head?.sha;

  if (!baseSha || !headSha) {
    throw new Error("Pull request payload is missing base/head SHAs.");
  }

  return parseNameStatus(gitCommand(["diff", "--name-status", baseSha, headSha]));
}

export function buildPushOperations({
  changedFiles,
  payload,
  loadCurrent,
  loadPrevious,
  diagnostics = [],
}) {
  const operations = new Map();
  const beforeSha = payload.before ?? ZERO_SHA;

  for (const changedFile of changedFiles) {
    if (isPlanningArtifact(changedFile.path) && changedFile.status !== "D") {
      const markdown = loadCurrent(changedFile.path);
      const stories = markdown ? extractStoryRefsFromMarkdown(markdown) : [];

      if (!markdown) {
        logSkip(diagnostics, `Planning artifact ${changedFile.path} could not be read from the checkout.`);
      } else if (stories.length === 0) {
        logSkip(diagnostics, `Planning artifact ${changedFile.path} changed but no story headings were found.`);
      }

      for (const story of stories) {
        mergeTrackedAction(operations, {
          kind: "story",
          identityKey: `story:${story.storyNumber}`,
          queryTitle: `Story ${story.storyNumber}*`,
          ...story,
        }, {
          ensureIssue: true,
          ensureProjectItem: true,
          sourcePaths: [changedFile.path],
        });
      }
    }

    if (!isImplementationArtifact(changedFile.path) || changedFile.status === "D") {
      if (changedFile.status !== "D") {
        const skipReason = getImplementationArtifactSkipReason(changedFile.path);
        logSkip(
          diagnostics,
          `Changed file ${changedFile.path} does not qualify as a tracked implementation artifact${skipReason ? `: ${skipReason}.` : "."}`
        );
      }
      continue;
    }

    const currentMarkdown = loadCurrent(changedFile.path);
    const currentArtifact = currentMarkdown
      ? parseTrackedImplementationArtifact(currentMarkdown, changedFile.path)
      : null;
    if (!currentArtifact) {
      logSkip(
        diagnostics,
        `Implementation artifact ${changedFile.path} changed but its title or status could not be parsed.`
      );
      continue;
    }

    if (changedFile.status === "A") {
      mergeTrackedAction(operations, currentArtifact, {
        ensureIssue: true,
        ensureProjectItem: true,
        targetStatus: "ready-for-dev",
        sourcePaths: [changedFile.path],
      });
    }

    const previousPath = changedFile.previousPath ?? changedFile.path;
    const previousMarkdown = loadPrevious(beforeSha, previousPath);
    const previousArtifact = previousMarkdown
      ? parseTrackedImplementationArtifact(previousMarkdown, previousPath)
      : null;
    const previousStatus = previousArtifact?.status ?? null;

    if (currentArtifact.status === "done" && previousStatus !== "done") {
      mergeTrackedAction(operations, currentArtifact, {
        ensureIssue: true,
        ensureProjectItem: true,
        targetStatus: "done",
        sourcePaths: [changedFile.path],
      });
    } else if (changedFile.status !== "A") {
      logSkip(
        diagnostics,
        `Implementation artifact ${changedFile.path} did not trigger a lifecycle change (status ${previousStatus ?? "unknown"} -> ${currentArtifact.status ?? "unknown"}).`
      );
    }
  }

  return Array.from(operations.values()).map((operation) => ({
    ...operation,
    sourcePaths: Array.from(operation.sourcePaths).sort(),
  }));
}

export function buildPullRequestOperations({ changedFiles, payload, loadCurrent, diagnostics = [] }) {
  const actionableFiles = [];

  for (const changedFile of changedFiles) {
    if (changedFile.status === "D") {
      continue;
    }

    if (!isImplementationArtifact(changedFile.path)) {
      const skipReason = getImplementationArtifactSkipReason(changedFile.path);
      logSkip(
        diagnostics,
        `Pull request file ${changedFile.path} is excluded from implementation-artifact review transitions${skipReason ? `: ${skipReason}.` : "."}`
      );
      continue;
    }

    actionableFiles.push(changedFile);
  }

  if (actionableFiles.length !== 1) {
    logSkip(
      diagnostics,
      `Pull request event requires exactly one changed tracked implementation artifact, found ${actionableFiles.length}.`
    );
    return [];
  }

  const changedFile = actionableFiles[0];
  const markdown = loadCurrent(changedFile.path);
  const artifact = markdown ? parseTrackedImplementationArtifact(markdown, changedFile.path) : null;

  if (!artifact) {
    logSkip(
      diagnostics,
      `Pull request artifact ${changedFile.path} could not be parsed into a title and status.`
    );
    return [];
  }

  const action = payload.action;
  if (action === "opened" || action === "reopened") {
    if (artifact.status === "ready-for-dev") {
      logSkip(
        diagnostics,
        `Pull request action ${action} ignored because ${changedFile.path} is still ready-for-dev.`
      );
      return [];
    }

    return [
      {
        kind: artifact.kind,
        identityKey: artifact.identityKey,
        storyNumber: artifact.storyNumber,
        title: artifact.title,
        fullTitle: artifact.fullTitle,
        queryTitle: artifact.queryTitle,
        sourcePaths: [changedFile.path],
        ensureIssue: true,
        ensureProjectItem: true,
        targetStatus: "review",
        onlyIfCurrentStatus: null,
      },
    ];
  }

  if (action === "closed" && payload.pull_request?.merged === false) {
    return [
      {
        kind: artifact.kind,
        identityKey: artifact.identityKey,
        storyNumber: artifact.storyNumber,
        title: artifact.title,
        fullTitle: artifact.fullTitle,
        queryTitle: artifact.queryTitle,
        sourcePaths: [changedFile.path],
        ensureIssue: true,
        ensureProjectItem: true,
        targetStatus: "ready-for-dev",
        onlyIfCurrentStatus: "review",
      },
    ];
  }

  logSkip(
    diagnostics,
    `Pull request action ${action} with merged=${String(payload.pull_request?.merged)} does not trigger a lifecycle update.`
  );

  return [];
}

export function buildOperations({
  eventName,
  payload,
  changedFiles,
  loadCurrent,
  loadPrevious,
  diagnostics = [],
}) {
  if (eventName === "push") {
    return buildPushOperations({ changedFiles, payload, loadCurrent, loadPrevious, diagnostics });
  }

  if (eventName === "pull_request") {
    return buildPullRequestOperations({ changedFiles, payload, loadCurrent, diagnostics });
  }

  logSkip(diagnostics, `Event ${eventName} is not supported by this script.`);
  return [];
}

function issueBodyForStory(operation) {
  const sources = operation.sourcePaths
    .map((sourcePath) => `- \`${sourcePath}\``)
    .join("\n");

  return [
    "Tracked automatically from BMAD story artifacts.",
    "",
    `Story: ${operation.fullTitle}`,
    "",
    "Source artifacts:",
    sources || "- (not recorded)",
  ].join("\n");
}

function findIssueByStoryNumber(issues, storyNumber) {
  return issues.find((issue) => {
    const parsed = parseStoryTitle(issue.title);
    return parsed?.storyNumber === storyNumber;
  }) ?? null;
}

export function findIssueForArtifact(issues, operation) {
  if (operation.storyNumber) {
    return findIssueByStoryNumber(issues, operation.storyNumber);
  }

  return issues.find((issue) => issue.title === operation.fullTitle) ?? null;
}

function chooseProjectItem(items, storyNumber, fullTitle) {
  const exactTitle = items.find((item) => item.title === fullTitle);
  if (exactTitle) {
    return exactTitle;
  }

  return (
    items.find((item) => parseStoryTitle(item.title ?? "")?.storyNumber === storyNumber) ?? null
  );
}

function getProjectItemQuery(operation, currentStatus = null) {
  const query = [`is:issue`, `title:"${operation.queryTitle}"`];
  if (currentStatus) {
    query.push(`status:"${projectStatusLabel(currentStatus)}"`);
  }

  return query.join(" ");
}

export function loadProjectMetadata(config, dryRun) {
  if (dryRun) {
    return {
      projectId: `project-${config.projectNumber}`,
      statusFieldId: "status-field",
      statusOptionIds: new Map([
        ["ready-for-dev", "ready-option"],
        ["review", "review-option"],
        ["done", "done-option"],
      ]),
    };
  }

  const projectListOutput = ghCommand(
    [
      "project",
      "list",
      "--owner",
      config.projectOwner,
      "--limit",
      "50",
      "--format",
      "json",
    ],
    { dryRun }
  );
  const projectList = parseJsonOutput(projectListOutput, { projects: [] });
  const project = (projectList.projects ?? []).find(
    (entry) => Number(entry.number) === config.projectNumber
  );

  if (!project) {
    throw new Error(
      `Unable to find project ${config.projectOwner}/${config.projectNumber}.`
    );
  }

  if (config.projectTitle && project.title !== config.projectTitle) {
    throw new Error(
      `Project ${config.projectNumber} title mismatch. Expected "${config.projectTitle}", got "${project.title}".`
    );
  }

  const fieldListOutput = ghCommand(
    [
      "project",
      "field-list",
      String(config.projectNumber),
      "--owner",
      config.projectOwner,
      "--format",
      "json",
    ],
    { dryRun }
  );
  const fieldList = parseJsonOutput(fieldListOutput, { fields: [] });
  const statusField = (fieldList.fields ?? []).find((field) => field.name === "Status");

  if (!statusField) {
    throw new Error("Project is missing the Status field.");
  }

  const optionIds = new Map();
  for (const option of statusField.options ?? []) {
    optionIds.set(normalizeStoryStatus(option.name), option.id);
  }

  for (const status of ["ready-for-dev", "review", "done"]) {
    if (!optionIds.has(status)) {
      throw new Error(`Project Status field is missing the "${projectStatusLabel(status)}" option.`);
    }
  }

  return {
    projectId: project.id,
    statusFieldId: statusField.id,
    statusOptionIds: optionIds,
  };
}

function loadExistingIssues(config, dryRun) {
  if (dryRun) {
    return [];
  }

  const output = ghCommand(
    [
      "issue",
      "list",
      "--repo",
      config.repo,
      "--state",
      "all",
      "--limit",
      "200",
      "--json",
      "number,title,url,state",
    ],
    { dryRun }
  );

  if (dryRun && !output) {
    return [];
  }

  return parseJsonOutput(output, []);
}

function loadProjectItemsForStory(config, operation, dryRun, onlyIfCurrentStatus = null, ghExec = ghCommand) {
  if (dryRun) {
    return [];
  }

  const args = [
    "project",
    "item-list",
    String(config.projectNumber),
    "--owner",
    config.projectOwner,
    "--limit",
    "200",
    "--query",
    getProjectItemQuery(operation, onlyIfCurrentStatus),
    "--format",
    "json",
  ];
  const output = ghExec(args, { dryRun });
  const parsed = parseJsonOutput(output, { items: [] });
  return parsed.items ?? [];
}

function projectStatusLabel(normalizedStatus) {
  switch (normalizedStatus) {
    case "ready-for-dev":
      return "Ready for Dev";
    case "review":
      return "Review";
    case "done":
      return "Done";
    default:
      return normalizedStatus;
  }
}

function recordCommand(plan, argv) {
  plan.push(formatCommand(argv));
}

function dryRunIssueSlug(operation) {
  if (operation.storyNumber) {
    return `STORY-${operation.storyNumber.replace(/\./g, "-")}`;
  }

  return encodeURIComponent(operation.fullTitle.toLowerCase().replace(/\s+/g, "-"));
}

function ensureIssue(config, issues, operation, dryRun, commandPlan) {
  let issue = findIssueForArtifact(issues, operation);

  if (issue && issue.title !== operation.fullTitle) {
    const editArgs = [
      "issue",
      "edit",
      String(issue.number),
      "--repo",
      config.repo,
      "--title",
      operation.fullTitle,
    ];
    recordCommand(commandPlan, ["gh", ...editArgs]);
    ghCommand(editArgs, { dryRun });
    issue = {
      ...issue,
      title: operation.fullTitle,
    };
  }

  if (!issue) {
    const createArgs = [
      "issue",
      "create",
      "--repo",
      config.repo,
      "--title",
      operation.fullTitle,
      "--body-file",
      "-",
    ];
    if (config.issueLabel) {
      createArgs.push("--label", config.issueLabel);
    }

    recordCommand(commandPlan, ["gh", ...createArgs]);
    const issueUrl = ghCommand(createArgs, {
      dryRun,
      stdin: issueBodyForStory(operation),
    });

    issue = {
      number: Number.NaN,
      title: operation.fullTitle,
      url: issueUrl || `https://github.com/${config.repo}/issues/${dryRunIssueSlug(operation)}`,
      state: "OPEN",
    };
  }

  if (!issues.some((entry) => entry.url === issue.url || entry.title === issue.title)) {
    issues.push(issue);
  }

  return issue;
}

export function ensureProjectItem(
  config,
  issue,
  operation,
  dryRun,
  commandPlan,
  { ghExec = ghCommand, sleepFn = sleepMs } = {}
) {
  let projectItems = loadProjectItemsForStory(config, operation, dryRun, null, ghExec);
  let projectItem = chooseProjectItem(projectItems, operation.storyNumber, operation.fullTitle);

  if (!projectItem) {
    const addArgs = [
      "project",
      "item-add",
      String(config.projectNumber),
      "--owner",
      config.projectOwner,
      "--url",
      issue.url,
    ];
    recordCommand(commandPlan, ["gh", ...addArgs]);
    ghExec(addArgs, { dryRun });

    const maxRetries = 5;
    const baseDelayMs = 2000;
    for (let attempt = 1; attempt <= maxRetries && !projectItem; attempt++) {
      sleepFn(baseDelayMs * attempt);
      projectItems = loadProjectItemsForStory(config, operation, dryRun, null, ghExec);
      projectItem = chooseProjectItem(projectItems, operation.storyNumber, operation.fullTitle);
      if (!projectItem) {
        logInfo(
          `Attempt ${attempt}/${maxRetries}: project item not yet visible for ${operation.fullTitle}, retrying…`
        );
      }
    }
  }

  if (dryRun && !projectItem) {
    projectItem = {
      id: `item-${dryRunIssueSlug(operation)}`,
      title: operation.fullTitle,
    };
  }

  if (!projectItem) {
    throw new Error(`Unable to resolve project item for ${operation.fullTitle}.`);
  }

  return projectItem;
}

function updateProjectStatus(config, metadata, projectItem, normalizedStatus, dryRun, commandPlan) {
  const optionId = metadata.statusOptionIds.get(normalizedStatus);
  if (!optionId) {
    throw new Error(`Missing project option id for status ${normalizedStatus}.`);
  }

  const editArgs = [
    "project",
    "item-edit",
    "--project-id",
    metadata.projectId,
    "--id",
    projectItem.id,
    "--field-id",
    metadata.statusFieldId,
    "--single-select-option-id",
    optionId,
  ];
  recordCommand(commandPlan, ["gh", ...editArgs]);
  ghCommand(editArgs, { dryRun });
}

export function postReadyForDevMarker(config, issue, specFile, dryRun, commandPlan, { ghExec = ghCommand } = {}) {
  const issueNumber = issue.number;

  if (dryRun) {
    const numStr = Number.isFinite(issueNumber) ? String(issueNumber) : "<n>";
    const postArgs = ["issue", "comment", numStr, "--repo", config.repo, "--body-file", "-"];
    recordCommand(commandPlan, ["gh", ...postArgs]);
    return;
  }

  if (!Number.isFinite(issueNumber)) {
    logInfo("Warning: skipping marker post — issue number is not a valid finite number.");
    return;
  }

  try {
    const commentsOutput = ghExec([
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      config.repo,
      "--json",
      "comments",
    ]);
    const { comments: allComments } = parseJsonOutput(commentsOutput, { comments: [] });
    const recentComments = (Array.isArray(allComments) ? allComments : []).slice(-5);

    if (shouldSkipMarkerPost(recentComments, specFile)) {
      logInfo(`Skipping marker comment on issue #${issueNumber}: identical v1 marker already present.`);
      return;
    }

    const postArgs = ["issue", "comment", String(issueNumber), "--repo", config.repo, "--body-file", "-"];
    const body = buildMarkerCommentBody(issueNumber, specFile);
    recordCommand(commandPlan, ["gh", ...postArgs]);
    ghExec(postArgs, { stdin: body });
    logInfo(`Posted ready-for-dev marker comment on issue #${issueNumber}.`);
  } catch (error) {
    logInfo(
      `Warning: failed to post ready-for-dev marker on issue #${issueNumber}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printUsage() {
  console.log(`Usage: node scripts/story-project-sync.mjs [--dry-run] [--help]

Environment:
  GITHUB_EVENT_NAME   GitHub event name (push or pull_request)
  GITHUB_EVENT_PATH   Path to the GitHub event payload JSON
  GITHUB_REPOSITORY   Repository in owner/name form (default: REW1L/munch-helper)
  PROJECT_OWNER       GitHub Projects owner login (default: REW1L)
  PROJECT_NUMBER      GitHub Project number (default: 1)
  PROJECT_TITLE       Expected project title (default: Munch Helper project)
  GH_TOKEN            Token used by gh for issue/project commands
  STORY_ISSUE_LABEL   Optional label to add to newly created story issues
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventName || !eventPath) {
    throw new Error("GITHUB_EVENT_NAME and GITHUB_EVENT_PATH are required.");
  }

  const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const changedFiles =
    eventName === "push"
      ? getChangedFilesForPush(payload)
      : eventName === "pull_request"
        ? getChangedFilesForPullRequest(payload)
        : [];
  const diagnostics = [];

  logInfo(`Processing ${eventName} event with ${changedFiles.length} changed file(s).`);
  for (const changedFile of changedFiles) {
    logInfo(`Changed file: ${changedFile.status} ${changedFile.path}`);
  }

  const operations = buildOperations({
    eventName,
    payload,
    changedFiles,
    loadCurrent: loadCurrentFile,
    loadPrevious: loadFileAtRevision,
    diagnostics,
  });

  if (operations.length === 0) {
    logInfo("No story lifecycle operations detected.");
    for (const diagnostic of diagnostics) {
      logInfo(`Reason: ${diagnostic}`);
    }
    return;
  }

  for (const operation of operations) {
    logInfo(
      `Planned tracked-artifact operation for ${operation.fullTitle}: issue=${operation.ensureIssue}, projectItem=${operation.ensureProjectItem}, targetStatus=${operation.targetStatus ?? "none"}`
    );
  }

  const commandPlan = [];
  const config = { ...DEFAULT_CONFIG };
  const metadata = loadProjectMetadata(config, args.dryRun);
  const issues = loadExistingIssues(config, args.dryRun);

  for (const operation of operations) {
    const issue = ensureIssue(config, issues, operation, args.dryRun, commandPlan);
    let projectItem;

    if (operation.onlyIfCurrentStatus && !args.dryRun) {
      const matchingItems = loadProjectItemsForStory(
        config,
        operation,
        args.dryRun,
        operation.onlyIfCurrentStatus
      );
      projectItem = chooseProjectItem(matchingItems, operation.storyNumber, operation.fullTitle);
      if (!projectItem) {
        continue;
      }
    }

    projectItem ??= ensureProjectItem(config, issue, operation, args.dryRun, commandPlan);

    if (operation.targetStatus) {
      updateProjectStatus(
        config,
        metadata,
        projectItem,
        operation.targetStatus,
        args.dryRun,
        commandPlan
      );

      if (operation.targetStatus === "ready-for-dev" && operation.sourcePaths.length > 0) {
        postReadyForDevMarker(config, issue, operation.sourcePaths[0], args.dryRun, commandPlan);
      }
    }
  }

  if (args.dryRun) {
    console.log(commandPlan.join("\n"));
  } else {
    console.log(`Applied ${operations.length} story sync operation(s).`);
  }
}

const isEntryPoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
