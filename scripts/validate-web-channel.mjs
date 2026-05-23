#!/usr/bin/env node
import process from "node:process";

import { requestUrl as defaultRequestUrl } from "./web-channel-http.mjs";

const DEFAULT_BASE_URL = "https://helpamunch.click";
const REQUIRED_PATHS = ["/", "/privacy", "/support"];

function usage() {
  return "Usage: node scripts/validate-web-channel.mjs --version <semver> [--base-url https://helpamunch.click]";
}

export function parseArgs(argv) {
  const parsed = {
    baseUrl: DEFAULT_BASE_URL,
    errors: [],
    version: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--version") {
      parsed.version = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--base-url") {
      parsed.baseUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    parsed.errors.push(`Unknown argument: ${arg}`);
  }

  if (!parsed.version) {
    parsed.errors.push("--version is required");
  }

  try {
    new URL(parsed.baseUrl);
  } catch {
    parsed.errors.push("--base-url must be a valid absolute URL");
  }

  return parsed;
}

function isHtml(headers) {
  const raw = headers["content-type"] ?? headers["Content-Type"] ?? "";
  return String(raw).toLowerCase().includes("text/html");
}

function buildUrl(baseUrl, path) {
  const url = new URL(baseUrl);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function checkPath(path, { baseUrl, requestUrl }) {
  const url = buildUrl(baseUrl, path);
  const head = await requestUrl(url, { method: "HEAD" });
  const failures = [];

  if (head.statusCode !== 200) {
    failures.push(`HEAD ${path} returned ${head.statusCode}`);
  }

  if (!isHtml(head.headers)) {
    failures.push(`HEAD ${path} did not return HTML content-type`);
  }

  const get = await requestUrl(url, { method: "GET" });

  if (get.statusCode !== 200) {
    failures.push(`GET ${path} returned ${get.statusCode}`);
  }

  if (!isHtml(get.headers)) {
    failures.push(`GET ${path} did not return HTML content-type`);
  }

  return {
    contentType: String(head.headers["content-type"] ?? head.headers["Content-Type"] ?? ""),
    failures,
    path,
    status: failures.length === 0 ? "PASS" : "FAIL",
    statusCode: head.statusCode,
    url,
    body: get.body,
  };
}

export async function runValidation({
  argv = process.argv.slice(2),
  now = () => new Date(),
  requestUrl = defaultRequestUrl,
} = {}) {
  const args = parseArgs(argv);

  if (args.errors.length > 0) {
    return {
      exitCode: 2,
      output: {
        checkedAt: now().toISOString(),
        errors: args.errors,
        usage: usage(),
        verdict: "USAGE",
      },
    };
  }

  const checks = [];
  const warnings = [];

  for (const path of REQUIRED_PATHS) {
    try {
      checks.push(await checkPath(path, { baseUrl: args.baseUrl, requestUrl }));
    } catch (error) {
      checks.push({
        contentType: "",
        failures: [`${path} request failed: ${error.message}`],
        path,
        status: "FAIL",
        statusCode: 0,
        url: buildUrl(args.baseUrl, path),
        body: "",
      });
    }
  }

  const home = checks.find((check) => check.path === "/");
  const versionFound = Boolean(home?.body?.includes(args.version));

  if (!versionFound) {
    warnings.push(`Version ${args.version} was not found in the deployed / HTML body`);
  }

  const failedChecks = checks.filter((check) => check.status === "FAIL");
  const output = {
    baseUrl: args.baseUrl,
    checkedAt: now().toISOString(),
    checks: checks.map(({ body, ...check }) => check),
    failedPaths: failedChecks.map((check) => check.path),
    version: args.version,
    versionFound,
    verdict: failedChecks.length === 0 ? "PASS" : "FAIL",
    warnings,
  };

  return {
    exitCode: failedChecks.length === 0 ? 0 : 1,
    output,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runValidation();
  console.log(JSON.stringify(result.output, null, 2));
  process.exitCode = result.exitCode;
}
