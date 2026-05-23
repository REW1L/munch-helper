import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs, runValidation } from "./validate-web-channel.mjs";

function makeRequestUrl(responses) {
  return async (url, { method = "GET" } = {}) => {
    const path = new URL(url).pathname;
    const key = `${method} ${path}`;
    const response = responses[key] ?? responses[path];

    if (!response) {
      throw new Error(`No fake response for ${key}`);
    }

    return {
      body: response.body ?? "",
      headers: response.headers ?? { "content-type": "text/html; charset=utf-8" },
      statusCode: response.statusCode ?? 200,
    };
  };
}

function htmlResponse(body = "<html>1.1.1</html>") {
  return {
    body,
    headers: { "content-type": "text/html; charset=utf-8" },
    statusCode: 200,
  };
}

const fixedNow = () => new Date("2026-05-23T10:00:00.000Z");

test("all three URLs return 200 HTML and exit 0", async () => {
  const result = await runValidation({
    argv: ["--version", "1.1.1"],
    now: fixedNow,
    requestUrl: makeRequestUrl({
      "HEAD /": htmlResponse(),
      "GET /": htmlResponse(),
      "HEAD /privacy": htmlResponse(),
      "GET /privacy": htmlResponse(),
      "HEAD /support": htmlResponse(),
      "GET /support": htmlResponse(),
    }),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.output.verdict, "PASS");
  assert.deepEqual(result.output.failedPaths, []);
});

test("/privacy 404 exits 1 and names the failing path", async () => {
  const result = await runValidation({
    argv: ["--version", "1.1.1"],
    now: fixedNow,
    requestUrl: makeRequestUrl({
      "HEAD /": htmlResponse(),
      "GET /": htmlResponse(),
      "HEAD /privacy": { ...htmlResponse(), statusCode: 404 },
      "GET /privacy": { ...htmlResponse(), statusCode: 404 },
      "HEAD /support": htmlResponse(),
      "GET /support": htmlResponse(),
    }),
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.output.verdict, "FAIL");
  assert.deepEqual(result.output.failedPaths, ["/privacy"]);
  assert.match(result.output.checks[1].failures.join("\n"), /HEAD \/privacy returned 404/);
});

test("missing HTML content-type exits 1", async () => {
  const result = await runValidation({
    argv: ["--version", "1.1.1"],
    now: fixedNow,
    requestUrl: makeRequestUrl({
      "HEAD /": {
        body: "",
        headers: { "content-type": "application/json" },
        statusCode: 200,
      },
      "GET /": {
        body: "{}",
        headers: { "content-type": "application/json" },
        statusCode: 200,
      },
      "HEAD /privacy": htmlResponse(),
      "GET /privacy": htmlResponse(),
      "HEAD /support": htmlResponse(),
      "GET /support": htmlResponse(),
    }),
  });

  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.output.failedPaths, ["/"]);
  assert.match(result.output.checks[0].failures.join("\n"), /did not return HTML/);
});

test("--version missing exits 2", async () => {
  const parsed = parseArgs([]);
  const result = await runValidation({
    argv: [],
    now: fixedNow,
    requestUrl: makeRequestUrl({}),
  });

  assert.equal(parsed.version, null);
  assert.deepEqual(parsed.errors, ["--version is required"]);
  assert.equal(result.exitCode, 2);
  assert.equal(result.output.verdict, "USAGE");
});

test("version found logs no warning and is not a hard fail", async () => {
  const result = await runValidation({
    argv: ["--version", "1.1.1"],
    now: fixedNow,
    requestUrl: makeRequestUrl({
      "HEAD /": htmlResponse(),
      "GET /": htmlResponse("<html><meta name=\"app-version\" content=\"1.1.1\"></html>"),
      "HEAD /privacy": htmlResponse(),
      "GET /privacy": htmlResponse(),
      "HEAD /support": htmlResponse(),
      "GET /support": htmlResponse(),
    }),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.output.versionFound, true);
  assert.deepEqual(result.output.warnings, []);
});

test("version not found logs warning and is not a hard fail", async () => {
  const result = await runValidation({
    argv: ["--version", "1.1.1"],
    now: fixedNow,
    requestUrl: makeRequestUrl({
      "HEAD /": htmlResponse(),
      "GET /": htmlResponse("<html>Munch Helper</html>"),
      "HEAD /privacy": htmlResponse(),
      "GET /privacy": htmlResponse(),
      "HEAD /support": htmlResponse(),
      "GET /support": htmlResponse(),
    }),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.output.versionFound, false);
  assert.match(result.output.warnings[0], /Version 1.1.1 was not found/);
});

test("network error on / exits 1 and names the failing path", async () => {
  const result = await runValidation({
    argv: ["--version", "1.1.1"],
    now: fixedNow,
    requestUrl: async (url, { method } = {}) => {
      const path = new URL(url).pathname;
      if (path === "/") throw new Error("ECONNREFUSED");
      return { body: "", headers: { "content-type": "text/html" }, statusCode: 200 };
    },
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.output.verdict, "FAIL");
  assert.deepEqual(result.output.failedPaths, ["/"]);
  assert.match(result.output.checks[0].failures[0], /request failed: ECONNREFUSED/);
});

test("--base-url overrides default and is used in checks", async () => {
  const result = await runValidation({
    argv: ["--version", "1.0.0", "--base-url", "https://example.com"],
    now: fixedNow,
    requestUrl: makeRequestUrl({
      "HEAD /": htmlResponse(),
      "GET /": htmlResponse("<html>1.0.0</html>"),
      "HEAD /privacy": htmlResponse(),
      "GET /privacy": htmlResponse(),
      "HEAD /support": htmlResponse(),
      "GET /support": htmlResponse(),
    }),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.output.baseUrl, "https://example.com");
});

test("invalid --base-url exits 2", async () => {
  const result = await runValidation({
    argv: ["--version", "1.0.0", "--base-url", "not-a-url"],
    now: fixedNow,
    requestUrl: makeRequestUrl({}),
  });

  assert.equal(result.exitCode, 2);
  assert.equal(result.output.verdict, "USAGE");
});

test("http:// --base-url exits 2", async () => {
  const result = await runValidation({
    argv: ["--version", "1.0.0", "--base-url", "http://example.com"],
    now: fixedNow,
    requestUrl: makeRequestUrl({}),
  });

  assert.equal(result.exitCode, 2);
  assert.equal(result.output.verdict, "USAGE");
  assert.ok(result.output.errors.some((e) => e.includes("https://")));
});
