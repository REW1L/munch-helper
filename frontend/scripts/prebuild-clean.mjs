#!/usr/bin/env node

import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";

const options = {
  platform: {
    type: "string",
    short: "p",
    default: "all",
  },
};

const { values } = parseArgs({ options });

const platform = values.platform.toLowerCase();

if (!["ios", "android", "all"].includes(platform)) {
  console.error(`Invalid platform: ${platform}. Use "ios", "android", or "all".`);
  process.exit(1);
}

const platforms = platform === "all" ? ["ios", "android"] : [platform];

for (const p of platforms) {
  console.log(`\n[prebuild:clean] Running expo prebuild --clean for ${p}...`);
  const result = spawnSync("npx", ["expo", "prebuild", "--clean", "--platform", p], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    console.error(`[prebuild:clean] Failed for ${p}.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\n[prebuild:clean] Done.`);
