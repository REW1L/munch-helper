import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = new URL('..', import.meta.url);
const rootDir = path.resolve(repoRoot.pathname);
const frontendDir = path.join(rootDir, 'frontend');
const screenshotsDir = path.join(rootDir, 'screenshots');

const deviceProfiles = [
  {
    directory: 'iphone69',
    candidates: ['iPhone 17 Pro Max'],
    profileName: 'Captain Rowan',
    profileAvatar: '1',
  },
];

const flows = [
  {
    file: 'rooms-home.png',
    flow: 'maestro/app_store_rooms_home.yaml',
  },
  {
    file: 'room-view.png',
    flow: 'maestro/app_store_room_view.yaml',
  },
  {
    file: 'battle.png',
    flow: 'maestro/app_store_battle.yaml',
  },
  {
    file: 'log.png',
    flow: 'maestro/app_store_log.yaml',
  },
];

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
      // expo run halts after installation to show logs
      // and give debug info
      // we don't need it here, so just interrupting
      killSignal: 'SIGINT',
      timeout: 120000
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

async function resolveDevices() {
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

  return deviceProfiles.map((profile) => {
    const matchedDevice = profile.candidates
      .map((candidate) => availableDevices.find((device) => device.name === candidate))
      .find(Boolean);

    if (!matchedDevice) {
      throw new Error(`Unable to find an available simulator for ${profile.directory}: ${profile.candidates.join(', ')}`);
    }

    if (!matchedDevice.runtime.startsWith('com.apple.CoreSimulator.SimRuntime.iOS-26-')) {
      throw new Error(
        `Expected an iOS 26 simulator for ${profile.directory}, found ${matchedDevice.name} on ${matchedDevice.runtime}`
      );
    }

    return {
      ...profile,
      udid: matchedDevice.udid,
      name: matchedDevice.name,
      runtime: matchedDevice.runtime,
    };
  });
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

async function seedRoom() {
  const { stdout } = await run('node', ['scripts/seed-app-store-room.mjs']);
  return JSON.parse(stdout);
}

async function seedRoomForFlow(flow) {
  const seededRoom = await seedRoom();
  process.stdout.write(
    `   seeded ${flow.file}: ${seededRoom.roomId} (${seededRoom.characters.length} named characters)\n`
  );
  return seededRoom;
}

async function captureForDevice(device) {
  const targetDir = path.join(screenshotsDir, device.directory);
  await fs.mkdir(targetDir, { recursive: true });
  const roomBySlide = [];

  process.stdout.write(`\n==> Capturing ${device.directory} on ${device.name} (${device.runtime})\n`);
  await run('xcrun', ['simctl', 'shutdown', 'all'], { allowFailure: true });
  await run('xcrun', ['simctl', 'boot', device.udid], { allowFailure: true });
  await run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  await applyStatusBar(device.udid);

  try {
    await run(
      'npx',
      ['expo', 'run:ios', '--configuration', 'Release', '-d', device.udid],
      {
        cwd: frontendDir,
        env: {
          EXPO_PUBLIC_API_URL: 'http://localhost:8080',
          EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME: device.profileName,
          EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR: device.profileAvatar,
        },
      }
    );

    for (const flow of flows) {
      process.stdout.write(`   -> ${flow.file}\n`);
      const seededRoom = await seedRoomForFlow(flow);
      roomBySlide.push({ file: flow.file, roomId: seededRoom.roomId });
      await run('maestro', ['test', '--device', device.udid, '-p', 'ios', '-e', `ROOM_ID=${seededRoom.roomId}`, flow.flow], {
        cwd: rootDir,
      });
      await sleep(1200);
      await run('xcrun', ['simctl', 'io', device.udid, 'screenshot', path.join(targetDir, flow.file)]);
    }
  } finally {
    if (roomBySlide.length > 0) {
      process.stdout.write('\nSlide room map:\n');
      for (const mapping of roomBySlide) {
        process.stdout.write(`   ${mapping.file}: ${mapping.roomId}\n`);
      }
    }
    await clearStatusBar(device.udid);
    await run('xcrun', ['simctl', 'shutdown', device.udid], { allowFailure: true });
  }
}

async function main() {
  await fs.mkdir(screenshotsDir, { recursive: true });
  const devices = await resolveDevices();

  for (const device of devices) {
    await captureForDevice(device);
  }

  process.stdout.write(`\nScreenshots saved under ${screenshotsDir}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
