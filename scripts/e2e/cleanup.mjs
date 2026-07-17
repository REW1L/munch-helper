#!/usr/bin/env node

import { readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const serverPidFile = process.env.E2E_WEB_SERVER_PID_FILE ?? '/tmp/munch-e2e-web-server.pid';
const processOutput = spawnSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' });
const processes = (processOutput.stdout ?? '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const match = line.match(/^(\d+)\s+(\d+)\s+(.*)$/);
    return match ? { pid: Number(match[1]), ppid: Number(match[2]), command: match[3] } : null;
  })
  .filter(Boolean);

const targets = new Set();
const addProcessTree = (pid) => {
  if (targets.has(pid)) return;
  targets.add(pid);
  for (const process of processes) {
    if (process.ppid === pid) addProcessTree(process.pid);
  }
};

for (const process of processes) {
  const shellProcess = /(?:^|\/)(?:bash|sh|zsh)(?:\s|$)/.test(process.command);
  const maestroTest = !shellProcess && /maestro(?:-cli)?/.test(process.command) && /\btest\b/.test(process.command);
  const headlessChromium = /(?:Google Chrome|Chromium)/i.test(process.command) && /--headless/.test(process.command) && /org\.chromium\.Chromium\.scoped_dir/.test(process.command);
  if (maestroTest || headlessChromium) addProcessTree(process.pid);
}

try {
  const serverPid = Number.parseInt(await readFile(serverPidFile, 'utf8'), 10);
  if (Number.isInteger(serverPid)) addProcessTree(serverPid);
} catch {
  // No web server was started for this platform.
}

for (const pid of targets) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // The process may have exited between ps and kill.
  }
}

await new Promise((resolve) => setTimeout(resolve, 300));
for (const pid of targets) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // The process already stopped.
  }
}

await rm(serverPidFile, { force: true });
console.log(`Cleaned ${targets.size} E2E processes.`);
