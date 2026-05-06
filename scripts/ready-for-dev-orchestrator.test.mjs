import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveSpecFilePath,
  extractMarkerPayload,
  parseSpecStatus,
  QUOTA_SIGNAL_REGEX,
  runCascade,
} from "./ready-for-dev-orchestrator.mjs";

// ---------------------------------------------------------------------------
// deriveSpecFilePath — issue title → spec file path
// ---------------------------------------------------------------------------

test("deriveSpecFilePath maps story title to numbered slug path", () => {
  assert.equal(
    deriveSpecFilePath("Story 3.1: AppTheme Token Migration"),
    "_bmad-output/implementation-artifacts/3-1-apptheme-token-migration.md"
  );
});

test("deriveSpecFilePath maps another story title to numbered slug path", () => {
  assert.equal(
    deriveSpecFilePath("Story 3.8: Realtime Update Signal on Character Cards"),
    "_bmad-output/implementation-artifacts/3-8-realtime-update-signal-on-character-cards.md"
  );
});

test("deriveSpecFilePath maps a plain spec title to spec-<slug> path", () => {
  assert.equal(
    deriveSpecFilePath("Story Project Status Sync"),
    "_bmad-output/implementation-artifacts/spec-story-project-status-sync.md"
  );
});

test("deriveSpecFilePath maps Ready For Dev Orchestrator spec title", () => {
  assert.equal(
    deriveSpecFilePath("Ready For Dev Orchestrator"),
    "_bmad-output/implementation-artifacts/spec-ready-for-dev-orchestrator.md"
  );
});

// ---------------------------------------------------------------------------
// parseSpecStatus — both story-style and frontmatter-style
// ---------------------------------------------------------------------------

test("parseSpecStatus reads story-style Status line", () => {
  const content = `# Story 3.8: Realtime Update Signal on Character Cards\n\nStatus: review\n`;
  assert.equal(parseSpecStatus(content), "review");
});

test("parseSpecStatus reads YAML frontmatter status field", () => {
  const content = `---\ntitle: 'Ready For Dev Orchestrator'\nstatus: 'review'\n---\n\n## Intent\n`;
  assert.equal(parseSpecStatus(content), "review");
});

test("parseSpecStatus reads in-review YAML frontmatter status field", () => {
  const content = `---\ntitle: 'Ready For Dev Orchestrator'\nstatus: 'in-review'\n---\n\n## Intent\n`;
  assert.equal(parseSpecStatus(content), "in-review");
});

test("parseSpecStatus normalises status to kebab-case", () => {
  const content = `# Story 3.1: Foo\n\nStatus: Ready for Dev\n`;
  assert.equal(parseSpecStatus(content), "ready-for-dev");
});

test("parseSpecStatus returns null when no status can be found", () => {
  assert.equal(parseSpecStatus("# No status here\n"), null);
});

// ---------------------------------------------------------------------------
// QUOTA_SIGNAL_REGEX — canned stderr fixtures
// ---------------------------------------------------------------------------

test("QUOTA_SIGNAL_REGEX matches Claude rate_limit_error", () => {
  assert.ok(QUOTA_SIGNAL_REGEX.test("Error: rate_limit_error: API rate limit reached"));
});

test("QUOTA_SIGNAL_REGEX matches Codex usage limit message", () => {
  assert.ok(QUOTA_SIGNAL_REGEX.test("You have reached your usage limit for this period."));
});

test("QUOTA_SIGNAL_REGEX matches Copilot premium request allowance message", () => {
  assert.ok(QUOTA_SIGNAL_REGEX.test("You've used your premium request allowance for this month."));
});

test("QUOTA_SIGNAL_REGEX matches Kiro limit reached message", () => {
  assert.ok(QUOTA_SIGNAL_REGEX.test("limit reached: please upgrade your plan"));
});

test("QUOTA_SIGNAL_REGEX matches 429 HTTP status in output", () => {
  assert.ok(QUOTA_SIGNAL_REGEX.test("HTTP 429 Too Many Requests"));
});

test("QUOTA_SIGNAL_REGEX does not match unrelated output", () => {
  assert.ok(!QUOTA_SIGNAL_REGEX.test("Implementation complete. All tests pass."));
});

// ---------------------------------------------------------------------------
// extractMarkerPayload — marker comment parsing
// ---------------------------------------------------------------------------

test("extractMarkerPayload parses a well-formed v1 marker", () => {
  const body = [
    "🚀 **Status moved to Ready for Dev** — auto-implementation orchestrator queued.",
    "",
    "<!-- auto-dev:trigger v1 -->",
    "```json",
    JSON.stringify({
      version: 1,
      issue_number: 42,
      spec_file: "_bmad-output/implementation-artifacts/3-1-apptheme-token-migration.md",
    }),
    "```",
  ].join("\n");

  assert.deepEqual(extractMarkerPayload(body), {
    version: 1,
    issue_number: 42,
    spec_file: "_bmad-output/implementation-artifacts/3-1-apptheme-token-migration.md",
  });
});

test("extractMarkerPayload returns null when the trigger marker is absent", () => {
  assert.equal(
    extractMarkerPayload("Just a regular comment with no trigger marker."),
    null
  );
});

test("extractMarkerPayload returns null for malformed JSON in payload", () => {
  const body = [
    "<!-- auto-dev:trigger v1 -->",
    "```json",
    "{not valid json}",
    "```",
  ].join("\n");
  assert.equal(extractMarkerPayload(body), null);
});

test("extractMarkerPayload returns null when required fields are missing", () => {
  const body = [
    "<!-- auto-dev:trigger v1 -->",
    "```json",
    JSON.stringify({ version: 1, spec_file: "spec.md" }),
    "```",
  ].join("\n");
  assert.equal(extractMarkerPayload(body), null);
});

test("extractMarkerPayload returns null when version is not 1", () => {
  const body = [
    "<!-- auto-dev:trigger v1 -->",
    "```json",
    JSON.stringify({ version: 2, issue_number: 1, spec_file: "spec.md" }),
    "```",
  ].join("\n");
  assert.equal(extractMarkerPayload(body), null);
});

// ---------------------------------------------------------------------------
// runCascade — cascade decision logic
// ---------------------------------------------------------------------------

function makeMockCLI(outcomeMap) {
  return (name) => ({
    stdout: outcomeMap[name]?.stdout ?? "",
    stderr: outcomeMap[name]?.stderr ?? "",
    exitStatus: outcomeMap[name]?.exitStatus ?? 0,
    logFile: `agent-${name}.log`,
  });
}

function makeStatusReader(statusByCall) {
  let callIndex = 0;
  return () => statusByCall[callIndex++] ?? null;
}

test("cascade succeeds at position 1 when first CLI flips to review", async () => {
  const calls = [];
  const result = await runCascade({
    cliNames: ["claude", "codex", "copilot", "kiro-cli"],
    prompt: "bmad-dev-story implement 'Test'",
    specFilePath: "spec.md",
    onRunCLI: (name) => {
      calls.push(name);
      return { stdout: "", stderr: "", exitStatus: 0, logFile: `agent-${name}.log` };
    },
    onReadStatus: makeStatusReader(["review"]),
    onLogInfo: () => { },
  });

  assert.equal(result.success, true);
  assert.equal(result.winnerCli, "claude");
  assert.equal(calls.length, 1);
  assert.equal(result.agentLogs.length, 1);
});

test("cascade succeeds when a CLI flips to in-review", async () => {
  const calls = [];
  const result = await runCascade({
    cliNames: ["claude", "codex"],
    prompt: "bmad-dev-story implement 'Test'",
    specFilePath: "spec.md",
    onRunCLI: (name) => {
      calls.push(name);
      return { stdout: "", stderr: "", exitStatus: 0, logFile: `agent-${name}.log` };
    },
    onReadStatus: makeStatusReader(["in-review"]),
    onLogInfo: () => { },
  });

  assert.equal(result.success, true);
  assert.equal(result.winnerCli, "claude");
  assert.equal(calls.length, 1);
});

test("cascade succeeds at position 2 when second CLI flips to review", async () => {
  const calls = [];
  const result = await runCascade({
    cliNames: ["claude", "codex", "copilot", "kiro-cli"],
    prompt: "bmad-dev-story implement 'Test'",
    specFilePath: "spec.md",
    onRunCLI: (name) => {
      calls.push(name);
      return { stdout: "", stderr: "", exitStatus: 0, logFile: `agent-${name}.log` };
    },
    onReadStatus: makeStatusReader(["ready-for-dev", "review"]),
    onLogInfo: () => { },
  });

  assert.equal(result.success, true);
  assert.equal(result.winnerCli, "codex");
  assert.equal(calls.length, 2);
});

test("cascade succeeds at position 3 when third CLI flips to review", async () => {
  const calls = [];
  const result = await runCascade({
    cliNames: ["claude", "codex", "copilot", "kiro-cli"],
    prompt: "bmad-dev-story implement 'Test'",
    specFilePath: "spec.md",
    onRunCLI: (name) => {
      calls.push(name);
      return { stdout: "", stderr: "", exitStatus: 0, logFile: `agent-${name}.log` };
    },
    onReadStatus: makeStatusReader(["ready-for-dev", "ready-for-dev", "review"]),
    onLogInfo: () => { },
  });

  assert.equal(result.success, true);
  assert.equal(result.winnerCli, "copilot");
  assert.equal(calls.length, 3);
});

test("cascade succeeds at position 4 when fourth CLI flips to review", async () => {
  const calls = [];
  const result = await runCascade({
    cliNames: ["claude", "codex", "copilot", "kiro-cli"],
    prompt: "bmad-dev-story implement 'Test'",
    specFilePath: "spec.md",
    onRunCLI: (name) => {
      calls.push(name);
      return { stdout: "", stderr: "", exitStatus: 0, logFile: `agent-${name}.log` };
    },
    onReadStatus: makeStatusReader(["ready-for-dev", "ready-for-dev", "ready-for-dev", "review"]),
    onLogInfo: () => { },
  });

  assert.equal(result.success, true);
  assert.equal(result.winnerCli, "kiro-cli");
  assert.equal(calls.length, 4);
});

test("cascade fails when all four CLIs run and none reaches review", async () => {
  const calls = [];
  const result = await runCascade({
    cliNames: ["claude", "codex", "copilot", "kiro-cli"],
    prompt: "bmad-dev-story implement 'Test'",
    specFilePath: "spec.md",
    onRunCLI: (name) => {
      calls.push(name);
      return { stdout: "", stderr: "", exitStatus: 1, logFile: `agent-${name}.log` };
    },
    onReadStatus: makeStatusReader(["ready-for-dev", "ready-for-dev", "ready-for-dev", "ready-for-dev"]),
    onLogInfo: () => { },
  });

  assert.equal(result.success, false);
  assert.equal(result.winnerCli, null);
  assert.equal(calls.length, 4);
  assert.equal(result.agentLogs.length, 4);
});

test("cascade detects quota signal and logs it but continues", async () => {
  const logMessages = [];
  const result = await runCascade({
    cliNames: ["claude", "codex"],
    prompt: "bmad-dev-story implement 'Test'",
    specFilePath: "spec.md",
    onRunCLI: (name) => ({
      stdout: "",
      stderr: name === "claude" ? "Error: rate_limit_error reached" : "",
      exitStatus: name === "claude" ? 1 : 0,
      logFile: `agent-${name}.log`,
    }),
    onReadStatus: makeStatusReader(["ready-for-dev", "review"]),
    onLogInfo: (msg) => logMessages.push(msg),
  });

  assert.equal(result.success, true);
  assert.equal(result.winnerCli, "codex");
  assert.ok(
    logMessages.some((m) => m.includes("Quota signal")),
    "Quota signal should be logged"
  );
});

// ---------------------------------------------------------------------------
// Dry-run command plan
// ---------------------------------------------------------------------------

test("deriveSpecFilePath is deterministic and produces a valid path string", () => {
  const result = deriveSpecFilePath("Story 3.1: AppTheme Token Migration");
  assert.ok(result.startsWith("_bmad-output/implementation-artifacts/"));
  assert.ok(result.endsWith(".md"));
  assert.ok(!result.includes(" "), "Path should not contain spaces");
});
