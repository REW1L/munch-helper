import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = new URL('..', import.meta.url);
const rootDir = path.resolve(repoRoot.pathname);
const frontendDir = path.join(rootDir, 'frontend');
const screenshotsDir = path.join(rootDir, 'screenshots');
const screenshotBuildLocalePath = path.join(frontendDir, 'i18n/screenshotBuildLocale.ts');
const localeConfigPath = path.join(rootDir, 'scripts', 'store-screenshot-locales.json');
const localeConfig = JSON.parse(await fs.readFile(localeConfigPath, 'utf8'));
const storeLocales = localeConfig.locales;
const pythonCommand = process.env.SCREENSHOT_PYTHON || 'python3';
let hasCleanBuilt = false;

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

async function isIosAppInstalled(udid) {
  const result = await run('xcrun', ['simctl', 'get_app_container', udid, 'click.helpamunch.mobileapp', 'app'], { allowFailure: true });
  return typeof result.stdout === 'string' && result.stdout.includes('.app');
}

async function buildAndInstallForLocale(device, locale) {
  // Remove the previous locale build so the install poll cannot mistake a
  // stale app container for the bundle being built for this locale.
  await run('xcrun', ['simctl', 'uninstall', device.udid, 'click.helpamunch.mobileapp'], { allowFailure: true });
  const buildArgs = ['expo', 'run:ios', '--configuration', 'Release', ...(hasCleanBuilt ? [] : ['--no-build-cache']), '-d', device.udid];
  const child = spawn('npx', buildArgs, {
    cwd: frontendDir,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: 'http://localhost:8080',
      EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME: device.profileName,
      EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR: device.profileAvatar,
      EXPO_PUBLIC_SCREENSHOT_LANGUAGE: locale,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    if (await isIosAppInstalled(device.udid)) {
      child.kill('SIGINT');
      hasCleanBuilt = true;
      return;
    }
    if (child.exitCode !== null) {
      throw new Error(`iOS release build exited before installing the ${locale} screenshot app.`);
    }
    await sleep(1500);
  }
  child.kill('SIGINT');
  throw new Error(`Timed out waiting for the ${locale} iOS screenshot app to install.`);
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

async function setScreenshotBuildLocale(locale) {
  await fs.writeFile(
    screenshotBuildLocalePath,
    `import type { LanguageCode } from './languages';\n\nexport const SCREENSHOT_BUILD_LANGUAGE: LanguageCode | null = '${locale}';\n`,
  );
}

async function clearScreenshotBuildLocale() {
  await fs.writeFile(
    screenshotBuildLocalePath,
    "import type { LanguageCode } from './languages';\n\nexport const SCREENSHOT_BUILD_LANGUAGE: LanguageCode | null = null;\n",
  );
}

async function captureForDevice(device, locale) {
  const targetDir = path.join(screenshotsDir, device.directory);
  await fs.mkdir(targetDir, { recursive: true });
  const roomBySlide = [];

  process.stdout.write(`\n==> Capturing ${device.directory} (${locale}) on ${device.name} (${device.runtime})\n`);
  await run('xcrun', ['simctl', 'shutdown', 'all'], { allowFailure: true });
  await run('xcrun', ['simctl', 'boot', device.udid], { allowFailure: true });
  await run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  await applyStatusBar(device.udid);

  try {
    await buildAndInstallForLocale(device, locale);

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

async function generateCaptionedScreenshots(locale) {
  await run(pythonCommand, ['scripts/generate-app-store-preview-redesign.py', '--locale', locale, '--target', 'iphone69']);
}

async function main() {
  await fs.mkdir(screenshotsDir, { recursive: true });
  const devices = await resolveDevices();

  try {
    for (const locale of storeLocales) {
      await setScreenshotBuildLocale(locale);
      for (const device of devices) {
        await captureForDevice(device, locale);
      }
      await generateCaptionedScreenshots(locale);
    }
  } finally {
    await clearScreenshotBuildLocale();
  }

  process.stdout.write(`\nScreenshots saved under ${screenshotsDir}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
