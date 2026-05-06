import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deriveSpecFileSlug, parseStoryTitle, parseTrackedImplementationArtifact } from "./story-project-sync.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMPLEMENTATION_DIR = "_bmad-output/implementation-artifacts/";
const BRANCH_PREFIX = "auto-dev/issue-";
const DEFAULT_AGENT_ORDER = ["claude", "codex", "copilot", "kiro-cli"];
const DEFAULT_TIMEOUT_MINUTES = 30;

export const QUOTA_SIGNAL_REGEX =
  /(?:usage\s+limit|quota|rate.?limit|429|premium\s+request|hit\s+your.*limit|credit\s+balance|limit\s+reached)/i;

const MARKER_TRIGGER = "<!-- auto-dev:trigger v1 -->";
const MARKER_JSON_REGEX = /```json\r?\n(\{[\s\S]*?\})\r?\n```/;
const SUCCESS_SPEC_STATUSES = new Set(["review", "in-review"]);

/** Per-CLI invocation configuration. */
const CLI_CONFIGS = {
  claude: {
    cmd: "claude",
    args: ["-p", "--verbose"],
    env: { CLAUDE_CODE_MAX_RETRIES: "2" },
    authEnv: ["ANTHROPIC_API_KEYS"],
  },
  codex: {
    cmd: "codex",
    args: [
      "exec",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
    ],
    env: {},
    authEnv: ["OPENAI_API_KEY", "CODEX_API_KEY"],
  },
  copilot: {
    cmd: "copilot",
    // --prompt/-p must be last: it consumes the next arg as prompt text
    args: ["--no-ask-user", "--allow-all-tools", "-p"],
    env: {},
    authEnv: ["COPILOT_GITHUB_TOKEN"],
  },
  "kiro-cli": {
    cmd: "kiro-cli",
    args: ["chat", "--no-interactive", "--trust-all-tools"],
    env: {},
    authEnv: ["KIRO_API_KEY"],
  },
};

// ---------------------------------------------------------------------------
// Exported pure helpers (testable without I/O)
// ---------------------------------------------------------------------------

/**
 * Map an issue title to the expected spec file path under implementation-artifacts.
 * For story-style titles ("Story N.N: Title") it derives the numeric slug.
 * For plain spec titles it uses the "spec-<slug>" convention.
 */
export function deriveSpecFilePath(issueTitle) {
  const parsed = parseStoryTitle(issueTitle);
  if (parsed) {
    return IMPLEMENTATION_DIR + deriveSpecFileSlug(parsed.storyNumber, parsed.title) + ".md";
  }

  const slug =
    "spec-" +
    issueTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return IMPLEMENTATION_DIR + slug + ".md";
}

/**
 * Parse the `status:` value from a spec file's content.
 * Handles YAML frontmatter (`status: 'review'`) and story-style status lines
 * (`Status: review`), normalizing values through story-project-sync parsing.
 */
export function parseSpecStatus(content) {
  const artifact = parseTrackedImplementationArtifact(content, "");
  return artifact?.status ?? null;
}

/**
 * Extract the structured payload from a marker comment body.
 * Returns null if the comment is not a well-formed v1 marker.
 */
export function extractMarkerPayload(commentBody) {
  if (!commentBody?.includes(MARKER_TRIGGER)) {
    return null;
  }

  const jsonMatch = commentBody.match(MARKER_JSON_REGEX);
  if (!jsonMatch) {
    return null;
  }

  try {
    const payload = JSON.parse(jsonMatch[1]);
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.issue_number !== "number" ||
      typeof payload.spec_file !== "string" ||
      payload.version !== 1
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Run the agent cascade.
 *
 * Accepts injectable `onRunCLI(name) => { stdout, stderr, status }` and
 * `onReadStatus(specFilePath) => string|null` so the function is testable
 * without spawning real processes.
 */
export async function runCascade({
  cliNames,
  prompt,
  specFilePath,
  onRunCLI,
  onReadStatus,
  onLogInfo = console.log,
}) {
  const agentLogs = [];

  for (const name of cliNames) {
    const result = await onRunCLI(name);
    agentLogs.push({ cli: name, logFile: result.logFile ?? null });

    const combined = (result.stdout ?? "") + (result.stderr ?? "");
    if (QUOTA_SIGNAL_REGEX.test(combined)) {
      onLogInfo(`[${name}] Quota signal detected in output (informational, not stopping cascade).`);
    }

    if (result.timedOut) {
      onLogInfo(`[${name}] CLI timed out before completing — treating as non-success.`);
    }

    const status = onReadStatus(specFilePath);
    onLogInfo(`[${name}] Spec status after run: ${status ?? "unknown"}.`);

    if (SUCCESS_SPEC_STATUSES.has(status)) {
      return { success: true, agentLogs, winnerCli: name };
    }
  }

  return { success: false, agentLogs, winnerCli: null };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function logInfo(message) {
  console.log(`[ready-for-dev-orchestrator] ${message}`);
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

function recordCommand(plan, argv) {
  plan.push(formatCommand(argv));
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

function gitCommand(args, { dryRun = false } = {}) {
  if (dryRun) {
    return "";
  }
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    help: false,
    issue: null,
    specFile: null,
    order: DEFAULT_AGENT_ORDER,
    timeout: DEFAULT_TIMEOUT_MINUTES,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--issue":
        args.issue = Number(argv[++i]);
        break;
      case "--spec-file":
        args.specFile = argv[++i];
        break;
      case "--order":
        args.order = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "--timeout":
        args.timeout = Number(argv[++i]);
        break;
      default:
        break;
    }
  }

  return args;
}

function printUsage() {
  console.log(`Usage: node scripts/ready-for-dev-orchestrator.mjs [options]

Options:
  --issue <n>          Issue number to implement (required)
  --spec-file <path>   Override spec file path (skips derivation)
  --order <list>       Comma-separated CLI order (default: claude,codex,copilot,kiro-cli)
  --timeout <minutes>  Per-CLI timeout in minutes (default: 30)
  --dry-run            Print planned commands without executing
  --help               Show this help

Environment:
  ANTHROPIC_API_KEY     Required for claude CLI
  OPENAI_API_KEY        Required for codex CLI (also CODEX_API_KEY)
  CODEX_API_KEY         Alternative key for codex CLI
  COPILOT_GITHUB_TOKEN  PAT with Copilot Requests scope (required for copilot CLI)
  KIRO_API_KEY          Required for kiro-cli
  GH_TOKEN / GITHUB_TOKEN  Token for gh commands
`);
}

function resolveIssueNumber(args) {
  if (args.issue && !Number.isNaN(args.issue)) {
    return args.issue;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
      const num = payload.issue?.number ?? payload.inputs?.issue_number;
      if (num) return Number(num);
    } catch {
      // Fall through
    }
  }

  return null;
}

function resolveIssueTitle(issueNumber, dryRun) {
  if (dryRun) {
    return `Issue #${issueNumber}`;
  }

  const output = ghCommand([
    "issue",
    "view",
    String(issueNumber),
    "--json",
    "title",
    "--jq",
    ".title",
  ]);
  return output.trim();
}

function findSpecFileOnDisk(derivedPath) {
  if (fs.existsSync(derivedPath)) {
    return derivedPath;
  }

  // Scan all files in IMPLEMENTATION_DIR and try to match by parsed artifact title/storyNumber
  const dir = IMPLEMENTATION_DIR;
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const derivedBasename = path.basename(derivedPath);
  const match = files.find((f) => f === derivedBasename);
  return match ? path.join(dir, match) : null;
}

function preflightCLI(name, config) {
  const hasAuth = config.authEnv.some((envVar) => Boolean(process.env[envVar]));
  if (!hasAuth) {
    return {
      available: false,
      reason: `missing auth env (${config.authEnv.join(" or ")})`,
    };
  }

  try {
    execFileSync("which", [config.cmd], { stdio: "ignore" });
  } catch {
    return { available: false, reason: `command not found: ${config.cmd}` };
  }

  try {
    execFileSync(config.cmd, ["--version"], { stdio: "ignore", timeout: 5000 });
  } catch {
    return { available: false, reason: `--version check failed for ${config.cmd}` };
  }

  return { available: true, reason: null };
}

function preflightAllCLIs(order) {
  const available = [];
  const skipped = [];

  for (const name of order) {
    const config = CLI_CONFIGS[name];
    if (!config) {
      skipped.push({ name, reason: "unknown CLI name" });
      continue;
    }

    const result = preflightCLI(name, config);
    if (result.available) {
      available.push(name);
    } else {
      skipped.push({ name, reason: result.reason });
      logInfo(`Pre-flight: skipping ${name} — ${result.reason}`);
    }
  }

  return available;
}

function checkoutOrCreateBranch(branchName, dryRun, commandPlan) {
  recordCommand(commandPlan, ["git", "fetch", "origin", "--no-tags", "--quiet"]);

  if (dryRun) {
    recordCommand(commandPlan, ["git", "checkout", branchName]);
    return;
  }

  try {
    gitCommand(["fetch", "origin", "--no-tags", "--quiet"]);
  } catch {
    // Ignore fetch errors (e.g., no remote yet)
  }

  // Try switching to an existing local branch
  try {
    gitCommand(["checkout", branchName]);
    logInfo(`Checked out existing branch ${branchName}.`);
    return;
  } catch {
    // Branch doesn't exist locally
  }

  // Try tracking from origin
  try {
    gitCommand(["checkout", "-b", branchName, `origin/${branchName}`]);
    logInfo(`Checked out existing remote branch ${branchName}.`);
    return;
  } catch {
    // Branch doesn't exist remotely either
  }

  // Create a new branch from HEAD
  gitCommand(["checkout", "-b", branchName]);
  logInfo(`Created new branch ${branchName}.`);
}

function runCLIWithTimeout(name, config, prompt, timeoutMinutes, logDir) {
  const logFile = path.join(logDir, `agent-${name}.log`);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const cliArgs = [...config.args, prompt];
  const env = { ...process.env, ...config.env };

  logInfo(`Running ${name}: timeout ${timeoutMinutes}m ${config.cmd} ${cliArgs.map((arg) => `"${arg}"`).join(" ")}`);

  return new Promise((resolve) => {
    const logStream = fs.createWriteStream(logFile);
    logStream.on("error", () => { });
    let stdoutBuf = "";
    let stderrBuf = "";
    let timedOut = false;
    let settled = false;

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      logStream.end(() => resolve(result));
    }

    const child = spawn(config.cmd, cliArgs, { env, shell: false, detached: true });
    child.stdin.end(); // In case the CLI expects input, send an empty line

    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid != null) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
        setTimeout(() => {
          if (!settled && child.pid != null) {
            try {
              process.kill(-child.pid, "SIGKILL");
            } catch {
              child.kill("SIGKILL");
            }
          }
        }, 10_000);
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      const str = chunk.toString();
      stdoutBuf += str;
      process.stdout.write(str);
      logStream.write(str);
    });

    child.stderr?.on("data", (chunk) => {
      const str = chunk.toString();
      stderrBuf += str;
      process.stderr.write(str);
      logStream.write(str);
    });

    child.on("error", (err) => {
      finish({
        exitStatus: null,
        stdout: stdoutBuf,
        stderr: stderrBuf + "\n" + err.message,
        timedOut,
        logFile,
      });
    });

    child.on("close", (code) => {
      finish({
        exitStatus: code,
        stdout: stdoutBuf,
        stderr: stderrBuf,
        timedOut,
        logFile,
      });
    });
  });
}

function hasUncommittedChanges() {
  try {
    const status = gitCommand(["status", "--porcelain"]);
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function commitAndPush(branchName, agentNames, issueNumber, dryRun, commandPlan) {
  const coAuthors = agentNames.map((n) => `Co-authored-by: ${n} <${n}@ai.agent>`);
  const commitMessage = [
    `feat: auto-implement issue #${issueNumber} via coding-assistant cascade`,
    "",
    ...coAuthors,
  ].join("\n");

  const addArgs = ["add", "--all"];
  const commitArgs = ["commit", "-m", commitMessage];
  const pushArgs = ["push", "--set-upstream", "origin", branchName];

  recordCommand(commandPlan, ["git", ...addArgs]);
  recordCommand(commandPlan, ["git", ...commitArgs]);
  recordCommand(commandPlan, ["git", ...pushArgs]);

  if (!dryRun) {
    gitCommand(addArgs);
    gitCommand(commitArgs);
    gitCommand(pushArgs);
  }
}

function pushPartialIfChanged(branchName, agentNames, issueNumber) {
  if (!hasUncommittedChanges()) {
    logInfo("No uncommitted changes to push.");
    return false;
  }

  const coAuthors = agentNames.map((n) => `Co-authored-by: ${n} <${n}@ai.agent>`);
  const commitMessage = [
    `chore: partial auto-dev work for issue #${issueNumber}`,
    "",
    ...coAuthors,
  ].join("\n");

  try {
    gitCommand(["add", "--all"]);
    gitCommand(["commit", "-m", commitMessage]);
    gitCommand(["push", "--set-upstream", "origin", branchName]);
    logInfo(`Partial work pushed to ${branchName}.`);
    return true;
  } catch (error) {
    logInfo(
      `Warning: failed to push partial work: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

function openOrUpdatePR(issueTitle, issueNumber, branchName, dryRun, commandPlan) {
  const prBody = `Closes #${issueNumber}`;
  const createArgs = [
    "pr",
    "create",
    "--title",
    issueTitle,
    "--body",
    prBody,
    "--head",
    branchName,
    "--base",
    "main",
  ];

  recordCommand(commandPlan, ["gh", ...createArgs]);

  if (dryRun) {
    return;
  }

  try {
    const url = ghCommand(createArgs);
    logInfo(`PR opened: ${url}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const prAlreadyExists = /already exists/i.test(errMsg);
    logInfo(
      `PR creation failed (${prAlreadyExists ? "PR already exists" : "unexpected error"}): ${errMsg}. ${prAlreadyExists ? "Attempting branch update." : "Skipping branch update."}`
    );
    if (prAlreadyExists) {
      try {
        gitCommand(["push", "--force-with-lease", "origin", branchName]);
        logInfo(`Branch ${branchName} updated on existing PR.`);
      } catch (pushError) {
        logInfo(
          `Warning: branch update failed: ${pushError instanceof Error ? pushError.message : String(pushError)}`
        );
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const issueNumber = resolveIssueNumber(args);
  if (!issueNumber) {
    throw new Error(
      "No issue number provided. Use --issue <n> or set GITHUB_EVENT_PATH with an issue payload."
    );
  }

  const commandPlan = [];
  const logDir = path.join(process.cwd(), "agent-logs");

  if (!args.dryRun) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Resolve spec file
  let cachedIssueTitle = null;
  let specFile = args.specFile ?? null;
  if (!specFile) {
    const issueTitle = resolveIssueTitle(issueNumber, args.dryRun);
    cachedIssueTitle = issueTitle;
    if (!args.dryRun) {
      const derived = deriveSpecFilePath(issueTitle);
      specFile = findSpecFileOnDisk(derived);
      if (!specFile) {
        throw new Error(
          `No spec file matched for issue #${issueNumber} (derived: ${derived}). ` +
          `Ensure the issue title matches a file in ${IMPLEMENTATION_DIR}.`
        );
      }
      logInfo(`Resolved spec file: ${specFile}`);
    } else {
      specFile = deriveSpecFilePath(issueTitle);
    }
  }

  // Checkout/create branch
  const branchName = `${BRANCH_PREFIX}${issueNumber}`;
  checkoutOrCreateBranch(branchName, args.dryRun, commandPlan);

  // Pre-flight CLIs
  const availableCLIs = args.dryRun ? args.order : preflightAllCLIs(args.order);
  if (!args.dryRun && availableCLIs.length === 0) {
    throw new Error(
      "No CLIs available after pre-flight check. " +
      "Ensure at least one CLI is installed and its auth environment variable is set."
    );
  }

  // Resolve issue title for the prompt (reuse cached value if resolved above)
  const issueTitle = cachedIssueTitle ?? resolveIssueTitle(issueNumber, args.dryRun);
  const prompt = `bmad-dev-story implement '${issueTitle}'`;

  if (args.dryRun) {
    // Emit planned CLI invocations
    for (const name of availableCLIs) {
      const config = CLI_CONFIGS[name];
      if (!config) continue;
      const cliArgs = [...config.args, prompt];
      recordCommand(commandPlan, [config.cmd, ...cliArgs]);
    }

    // Emit planned commit/push/PR for illustration
    const coAuthors = availableCLIs.map((n) => `Co-authored-by: ${n} <${n}@ai.agent>`);
    recordCommand(commandPlan, ["git", "add", "--all"]);
    recordCommand(commandPlan, [
      "git",
      "commit",
      "-m",
      `feat: auto-implement issue #${issueNumber} via coding-assistant cascade\n\n${coAuthors.join("\n")}`,
    ]);
    recordCommand(commandPlan, ["git", "push", "--set-upstream", "origin", branchName]);
    recordCommand(commandPlan, [
      "gh",
      "pr",
      "create",
      "--title",
      issueTitle,
      "--body",
      `Closes #${issueNumber}`,
      "--head",
      branchName,
      "--base",
      "main",
    ]);

    console.log(commandPlan.join("\n"));
    return;
  }

  // Run cascade
  const agentNames = [];
  const cascadeResult = await runCascade({
    cliNames: availableCLIs,
    prompt,
    specFilePath: specFile,
    onRunCLI: (name) => {
      const config = CLI_CONFIGS[name];
      agentNames.push(name);
      return runCLIWithTimeout(name, config, prompt, args.timeout, logDir);
    },
    onReadStatus: (filePath) => {
      try {
        return parseSpecStatus(fs.readFileSync(filePath, "utf8"));
      } catch {
        return null;
      }
    },
    onLogInfo: logInfo,
  });

  if (cascadeResult.success) {
    logInfo(`${cascadeResult.winnerCli} reached a successful review status. Committing and opening PR.`);
    commitAndPush(branchName, agentNames, issueNumber, false, commandPlan);
    openOrUpdatePR(issueTitle, issueNumber, branchName, false, commandPlan);
  } else {
    logInfo("All CLIs exhausted without reaching a successful review status.");
    pushPartialIfChanged(branchName, agentNames, issueNumber);
    process.exit(1);
  }
}

const isEntryPoint =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isEntryPoint) {
  main().catch((error) => {
    console.error(`[ready-for-dev-orchestrator] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
