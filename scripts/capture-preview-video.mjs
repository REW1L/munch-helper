import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = new URL('..', import.meta.url);
const rootDir = path.resolve(repoRoot.pathname);
const frontendDir = path.join(rootDir, 'frontend');
const videosDir = path.join(rootDir, 'videos');

// Record on a single high-quality device
const deviceProfile = {
  directory: 'iphone69',
  candidates: ['iPhone 17 Pro Max'],
  profileName: 'Captain Rowan',
  profileAvatar: '1',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(command, args, options = {}) {
  const { cwd = rootDir, env = {}, allowFailure = false } = options;

  try {
    const result = await execFileAsync(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      maxBuffer: 1024 * 1024 * 20,
    });

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    return result;
  } catch (error) {
    if (error.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error.stderr) {
      process.stderr.write(error.stderr);
    }

    if (allowFailure) {
      return error;
    }

    throw error;
  }
}

function getLatestRuntimeRank(runtime) {
  const match = runtime.match(/iOS-(\d+)-(\d+)/);
  if (!match) {
    return 0;
  }

  return Number(match[1]) * 100 + Number(match[2]);
}

async function resolveDevice() {
  const { stdout } = await run('xcrun', ['simctl', 'list', 'devices', 'available', '-j']);
  const parsed = JSON.parse(stdout);
  const availableDevices = Object.entries(parsed.devices)
    .flatMap(([runtime, devices]) =>
      devices
        .filter((device) => device.isAvailable)
        .map((device) => ({
          ...device,
          runtime,
          runtimeRank: getLatestRuntimeRank(runtime),
        }))
    )
    .sort((left, right) => right.runtimeRank - left.runtimeRank);

  const matchedDevice = deviceProfile.candidates
    .map((candidate) => availableDevices.find((device) => device.name === candidate))
    .find(Boolean);

  if (!matchedDevice) {
    throw new Error(
      `Unable to find an available simulator for ${deviceProfile.directory}: ${deviceProfile.candidates.join(', ')}`
    );
  }

  if (!matchedDevice.runtime.startsWith('com.apple.CoreSimulator.SimRuntime.iOS-26-')) {
    throw new Error(
      `Expected an iOS 26 simulator for ${deviceProfile.directory}, found ${matchedDevice.name} on ${matchedDevice.runtime}`
    );
  }

  return {
    ...deviceProfile,
    udid: matchedDevice.udid,
    name: matchedDevice.name,
    runtime: matchedDevice.runtime,
  };
}

async function applyStatusBar(udid) {
  await run(
    'xcrun',
    [
      'simctl',
      'status_bar',
      udid,
      'override',
      '--time',
      '9:41',
      '--dataNetwork',
      'wifi',
      '--wifiBars',
      '3',
      '--cellularMode',
      'active',
      '--cellularBars',
      '4',
      '--batteryState',
      'charged',
      '--batteryLevel',
      '100',
    ],
    { allowFailure: true }
  );
}

async function clearStatusBar(udid) {
  await run('xcrun', ['simctl', 'status_bar', udid, 'clear'], { allowFailure: true });
}

/**
 * expo run:ios in Release mode does not exit after launching — it keeps streaming
 * logs. We spawn it in the background, poll until the app bundle appears on the
 * simulator, then kill the process before moving on.
 */
async function buildAndLaunchApp(device) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['expo', 'run:ios', '--configuration', 'Release', '-d', device.udid],
      {
        cwd: frontendDir,
        env: {
          ...process.env,
          EXPO_PUBLIC_API_URL: 'http://localhost:8080',
          EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME: device.profileName,
          EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR: device.profileAvatar,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let output = '';
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stderr.write(chunk);
    });

    const launchMarkers = [
      'Logs for your project',
      'Logs for your app',
      'Press ? to show all commands',
      'Starting app',
      'Opened on',
      'opened on',
      'Installed on',
    ];

    // Fallback: if expo is still running after 3 min the build finished and the
    // app is live (the log-stream child process proves it), so we proceed anyway.
    const fallbackTimer = setTimeout(() => {
      clearInterval(checkInterval);
      process.stdout.write('\n==> Timeout reached — assuming app is launched.\n');
      child.kill('SIGTERM');
      resolve();
    }, 3 * 60 * 1000);

    const checkInterval = setInterval(async () => {
      const textMatch = launchMarkers.some((marker) => output.includes(marker));

      // Also detect launch by checking whether the simctl log-stream child
      // process (spawned by expo after app launch) is running.
      let simctlMatch = false;
      try {
        const { stdout: pgrepOut } = await execFileAsync('pgrep', [
          '-f',
          `simctl spawn ${device.udid}`,
        ]);
        simctlMatch = pgrepOut.trim().length > 0;
      } catch {
        // pgrep exits non-zero when no match — that's fine
      }

      if (textMatch || simctlMatch) {
        clearInterval(checkInterval);
        clearTimeout(fallbackTimer);
        process.stdout.write(
          `\n==> App launched (${textMatch ? 'text marker' : 'simctl detected'}). Stopping expo log stream.\n`
        );
        child.kill('SIGTERM');
        resolve();
      }
    }, 2000);

    child.on('exit', (code, signal) => {
      clearInterval(checkInterval);
      clearTimeout(fallbackTimer);
      if (signal === 'SIGTERM' || signal === 'SIGINT') {
        resolve();
        return;
      }
      if (code !== 0) {
        reject(new Error(`expo run:ios exited with code ${code}\n${output}`));
        return;
      }
      resolve();
    });

    child.on('error', (err) => {
      clearInterval(checkInterval);
      reject(err);
    });
  });
}

async function seedRoom() {
  const { stdout } = await run('node', ['scripts/seed-preview-video-room.mjs']);
  return JSON.parse(stdout);
}

const apiBase = (process.env.API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

async function requestJson(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${init.method || 'GET'} ${path} → ${response.status}: ${body}`);
  }
  return response.json();
}

/**
 * Runs background API updates while Maestro is executing so the viewer sees
 * live character changes during the recording:
 *   T+27s  Thorn Vale joins the room (5th player)
 *   T+38s  Hexley Fox stats updated to level 7 / power 15 (during the 10 s hold)
 */
async function runBackgroundUpdates(roomData) {
  const { roomId, characters } = roomData;

  // ── T+27s: 5th player joins ───────────────────────────────────────────────
  await sleep(27000);
  process.stdout.write('\n==> [background] Thorn Vale joining the room\n');
  const thornUser = await requestJson('/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Thorn Vale', avatarId: 5 }),
  });
  const thornJoined = await requestJson('/rooms/associations', {
    method: 'POST',
    body: JSON.stringify({ roomId, userId: thornUser.id, userName: 'Thorn Vale', avatarId: 5 }),
  });
  await requestJson(`/characters/${encodeURIComponent(thornJoined.characterId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: 'Thorn Vale',
      avatarId: 5,
      color: '#A56CC1',
      level: 7,
      power: 16,
      class: JSON.stringify(['Ranger']),
      race: JSON.stringify(['Halfling']),
      gender: JSON.stringify(['female']),
    }),
  });

  // ── T+38s: Hexley Fox stats update (during the 10 s hold after Save) ─────
  await sleep(11000);
  const hexleyFox = characters.find((c) => c.name === 'Hexley Fox');
  if (hexleyFox) {
    process.stdout.write('\n==> [background] Hexley Fox stats updated\n');
    await requestJson(`/characters/${encodeURIComponent(hexleyFox.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ level: 7, power: 15 }),
    });
  }

  // ── T+40s: Bardic Bryn stats update ──────────────────────────────────────
  await sleep(2000);
  const bardicBryn = characters.find((c) => c.name === 'Bardic Bryn');
  if (bardicBryn) {
    process.stdout.write('\n==> [background] Bardic Bryn stats updated\n');
    await requestJson(`/characters/${encodeURIComponent(bardicBryn.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ level: bardicBryn.level + 2, power: bardicBryn.power + 3 }),
    });
  }

  // ── T+42s: Rune Rider stats update ───────────────────────────────────────
  await sleep(2000);
  const runeRider = characters.find((c) => c.name === 'Rune Rider');
  if (runeRider) {
    process.stdout.write('\n==> [background] Rune Rider stats updated\n');
    await requestJson(`/characters/${encodeURIComponent(runeRider.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ level: runeRider.level + 2, power: runeRider.power + 3 }),
    });
  }
}

/**
 * Wraps a callback with native simulator screen recording via `xcrun simctl io recordVideo`.
 * Recording is stopped cleanly with SIGINT once the callback resolves or rejects.
 * The output is a .mp4 encoded with h264 for maximum compatibility.
 */
async function recordWithSimulator(udid, outputFile, callback) {
  return new Promise((resolve, reject) => {
    const recorder = spawn(
      'xcrun',
      ['simctl', 'io', udid, 'recordVideo', '--codec=h264', '--force', outputFile],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    recorder.stdout.on('data', (d) => process.stdout.write(d));
    recorder.stderr.on('data', (d) => process.stderr.write(d));

    let callbackError = null;

    callback()
      .catch((err) => { callbackError = err; })
      .finally(() => {
        // Give the simulator a moment to flush the final frames before stopping
        setTimeout(() => {
          recorder.kill('SIGINT');
        }, 500);
      });

    recorder.on('exit', () => {
      if (callbackError) {
        reject(callbackError);
      } else {
        resolve();
      }
    });

    recorder.on('error', reject);
  });
}

async function captureVideo(device, roomData) {
  const outputFile = path.join(videosDir, 'preview.mp4');

  process.stdout.write(`\n==> Recording preview video on ${device.name} (${device.runtime})\n`);
  await run('xcrun', ['simctl', 'shutdown', 'all'], { allowFailure: true });
  await run('xcrun', ['simctl', 'boot', device.udid], { allowFailure: true });
  await run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  await applyStatusBar(device.udid);

  try {
    await buildAndLaunchApp(device);

    // Give the app a moment to settle before recording starts
    await sleep(1000);

    process.stdout.write(`   -> Recording to ${outputFile}\n`);
    await recordWithSimulator(device.udid, outputFile, async () => {
      // Fire background updates in parallel — errors are non-fatal
      runBackgroundUpdates(roomData).catch((err) =>
        process.stderr.write(`\n==> [background] Update error: ${err.message}\n`)
      );
      await run('maestro', ['test', '-e', `ROOM_ID=${roomData.roomId}`, 'maestro/preview_video.yaml'], {
        cwd: rootDir,
      });
    });
  } finally {
    await clearStatusBar(device.udid);
    await run('xcrun', ['simctl', 'shutdown', device.udid], { allowFailure: true });
  }

  return outputFile;
}

async function main() {
  await fs.mkdir(videosDir, { recursive: true });
  const roomData = await seedRoom();
  const device = await resolveDevice();

  process.stdout.write(`Seeded room ${roomData.roomId} with ${roomData.characters.length} players.\n`);

  const outputFile = await captureVideo(device, roomData);

  process.stdout.write(`\nPreview video saved to ${outputFile}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
