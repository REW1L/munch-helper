import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = new URL('..', import.meta.url);
const rootDir = path.resolve(repoRoot.pathname);
const frontendDir = path.join(rootDir, 'frontend');
const screenshotsDir = path.join(rootDir, 'screenshots');
const screenshotBuildLocalePath = path.join(frontendDir, 'i18n/screenshotBuildLocale.ts');
const androidManifestPath = path.join(frontendDir, 'android/app/src/main/AndroidManifest.xml');
const androidOutputDirName = 'android1080x2400';
const androidCanvas = { width: 1080, height: 2400 };
const localeConfigPath = path.join(rootDir, 'scripts', 'store-screenshot-locales.json');
const localeConfig = JSON.parse(await fs.readFile(localeConfigPath, 'utf8'));
const storeLocales = localeConfig.locales;
const forceCapture = process.env.STORE_SCREENSHOT_FORCE === '1';

const appApiUrl = process.env.EXPO_PUBLIC_API_URL || resolveAndroidHostApiUrl();
const seedApiUrl = process.env.API_BASE_URL || 'http://localhost:8080';
const pythonCommand = process.env.SCREENSHOT_PYTHON || 'python3';
const requestedDevice = process.env.ANDROID_SERIAL || '';
const requestedAvd = process.env.ANDROID_SCREENSHOT_AVD || '';
const requestedExpoDevice = process.env.ANDROID_EXPO_DEVICE || '';

const androidProfile = {
  profileName: 'Warden Kira',
  profileAvatar: '8',
};

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

async function hasCompletePreviewSet(locale) {
  const directory = path.join(screenshotsDir, `${androidOutputDirName}_store_preview`, locale);
  const expected = flows.map((flow) => path.join(directory, flow.file.replace('.png', '').replace('rooms-home', '01-rooms-home').replace('room-view', '02-room-view').replace('battle', '03-battle').replace('log', '04-log') + '.png'));
  return (await Promise.all(expected.map(async (file) => (await fs.stat(file).catch(() => null))?.isFile()))).every(Boolean);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveAndroidHostApiUrl() {
  const networks = os.networkInterfaces();
  const hostAddress = Object.values(networks)
    .flat()
    .find((address) => address?.family === 'IPv4' && !address.internal && address.address.startsWith('192.168.'));

  return hostAddress ? `http://${hostAddress.address}:8080` : 'http://10.0.2.2:8080';
}

async function run(command, args, options = {}) {
  const {
    cwd = rootDir,
    env = {},
    allowFailure = false,
    encoding = 'utf8',
    timeout,
    killSignal,
  } = options;

  try {
    const result = await execFileAsync(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      encoding,
      timeout,
      killSignal,
      maxBuffer: 1024 * 1024 * 50,
    });

    if (encoding !== 'buffer') {
      if (result.stdout) {
        process.stdout.write(result.stdout);
      }
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    }

    return result;
  } catch (error) {
    if (encoding !== 'buffer') {
      if (error.stdout) {
        process.stdout.write(error.stdout);
      }
      if (error.stderr) {
        process.stderr.write(error.stderr);
      }
    }

    if (allowFailure) {
      return error;
    }

    throw error;
  }
}

async function seedRoom() {
  const { stdout } = await run('node', ['scripts/seed-app-store-room.mjs'], {
    env: {
      API_BASE_URL: seedApiUrl,
    },
  });
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

async function listConnectedAndroidDevices() {
  const { stdout } = await run('adb', ['devices', '-l']);
  return stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes('\tdevice') || /\sdevice\s/.test(line))
    .map((line) => line.split(/\s+/)[0]);
}

async function listAvds() {
  const { stdout } = await run('emulator', ['-list-avds']);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function launchAvd(avdName) {
  const child = spawn('emulator', ['-avd', avdName, '-no-snapshot-load'], {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function waitForDeviceSerial(timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const devices = await listConnectedAndroidDevices();
    const matchedDevice = requestedDevice ? devices.find((device) => device === requestedDevice) : devices[0];
    if (matchedDevice) {
      return matchedDevice;
    }
    await sleep(2000);
  }

  throw new Error('Timed out waiting for an Android emulator or device to appear in adb devices.');
}

async function waitForBoot(serial, timeoutMs = 180000) {
  await run('adb', ['-s', serial, 'wait-for-device']);

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { stdout } = await run('adb', ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'], {
      allowFailure: true,
    });
    if (stdout.trim() === '1') {
      return;
    }
    await sleep(2000);
  }

  throw new Error(`Timed out waiting for ${serial} to finish booting.`);
}

async function resolveDevice() {
  const connectedDevices = await listConnectedAndroidDevices();
  const connectedDevice = requestedDevice
    ? connectedDevices.find((device) => device === requestedDevice)
    : connectedDevices[0];

  if (connectedDevice) {
    await waitForBoot(connectedDevice);
    return {
      serial: connectedDevice,
      expoDevice: await resolveExpoDeviceSelector(connectedDevice),
      launchedByScript: false,
    };
  }

  const avds = await listAvds();
  const avdName = requestedAvd || avds[0];
  if (!avdName) {
    throw new Error(
      'No connected Android device found and no Android Virtual Device is installed. Create an AVD or set ANDROID_SERIAL.'
    );
  }

  process.stdout.write(`Launching Android emulator ${avdName}\n`);
  launchAvd(avdName);

  const serial = await waitForDeviceSerial();
  await waitForBoot(serial);
  return {
    serial,
    expoDevice: await resolveExpoDeviceSelector(serial, avdName),
    launchedByScript: true,
  };
}

async function resolveExpoDeviceSelector(serial, launchedAvdName = '') {
  if (requestedExpoDevice) {
    return requestedExpoDevice;
  }

  if (launchedAvdName) {
    return launchedAvdName;
  }

  const avdNameResult = await run('adb', ['-s', serial, 'emu', 'avd', 'name'], { allowFailure: true });
  if (typeof avdNameResult.stdout === 'string') {
    const avdName = avdNameResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && line !== 'OK');
    if (avdName) {
      return avdName;
    }
  }

  const modelResult = await run('adb', ['-s', serial, 'shell', 'getprop', 'ro.product.model'], { allowFailure: true });
  const modelName = typeof modelResult.stdout === 'string' ? modelResult.stdout.trim() : '';
  return modelName || serial;
}

async function getDeviceSize(serial) {
  const { stdout } = await run('adb', ['-s', serial, 'shell', 'wm', 'size']);
  const sizes = [...stdout.matchAll(/(\d+)x(\d+)/g)];
  const lastSize = sizes.at(-1);
  if (!lastSize) {
    throw new Error(`Unable to parse Android screen size from: ${stdout}`);
  }

  return {
    width: Number(lastSize[1]),
    height: Number(lastSize[2]),
  };
}

async function applyStatusBar(serial) {
  await run('adb', ['-s', serial, 'shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1'], {
    allowFailure: true,
  });
  await run('adb', ['-s', serial, 'shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'enter'], {
    allowFailure: true,
  });
  await run(
    'adb',
    [
      '-s',
      serial,
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'clock',
      '-e',
      'hhmm',
      '0941',
    ],
    { allowFailure: true }
  );
  await run(
    'adb',
    [
      '-s',
      serial,
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'battery',
      '-e',
      'level',
      '100',
      '-e',
      'plugged',
      'true',
    ],
    { allowFailure: true }
  );
}

async function applyReversePorts(serial) {
  await run('adb', ['-s', serial, 'reverse', 'tcp:8080', 'tcp:8080']);
}

async function setAppLocale(serial, locale) {
  // Android 13+ exposes per-app language preferences independently of the
  // device language. Set it explicitly so expo-localization remains a
  // reliable fallback if a release bundle does not inline the public env.
  await run('adb', [
    '-s',
    serial,
    'shell',
    'cmd',
    'locale',
    'set-app-locales',
    'click.helpamunch.mobileapp',
    '--locales',
    locale,
  ], { allowFailure: true });
}

async function ensureAndroidCleartextTraffic() {
  const manifest = await fs.readFile(androidManifestPath, 'utf8');
  if (manifest.includes('android:usesCleartextTraffic=')) {
    return;
  }

  const updatedManifest = manifest.replace(
    /<application\b([^>]*)>/,
    '<application$1 android:usesCleartextTraffic="true">'
  );
  if (updatedManifest === manifest) {
    throw new Error(`Unable to add cleartext traffic setting to ${androidManifestPath}.`);
  }

  await fs.writeFile(androidManifestPath, updatedManifest);
}

async function isAppInstalled(serial) {
  const result = await run('adb', ['-s', serial, 'shell', 'pm', 'path', 'click.helpamunch.mobileapp'], {
    allowFailure: true,
  });
  return typeof result.stdout === 'string' && result.stdout.includes('package:');
}

async function buildAndInstallForLocale(device, locale) {
  // Remove the previous locale build so the install poll cannot mistake a
  // stale APK for the bundle being built for this locale.
  await run('adb', ['-s', device.serial, 'uninstall', 'click.helpamunch.mobileapp'], { allowFailure: true });
  // The screenshot language is an Expo public variable and is inlined into
  // the release JavaScript bundle. Android's incremental Gradle build can
  // otherwise reuse the first locale's bundle, leaving later screenshots in
  // English even though the native install was replaced. Force a clean bundle
  // for every locale so the requested language is captured in the app UI.
  const buildArgs = ['expo', 'run:android', '--variant', 'release', '--no-build-cache', '-d', device.expoDevice];
  const child = spawn(
    'npx',
    buildArgs,
    {
      cwd: frontendDir,
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: appApiUrl,
        EXPO_PUBLIC_SCREENSHOT_PROFILE_NAME: androidProfile.profileName,
        EXPO_PUBLIC_SCREENSHOT_PROFILE_AVATAR: androidProfile.profileAvatar,
        EXPO_PUBLIC_SCREENSHOT_LANGUAGE: locale,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    if (await isAppInstalled(device.serial)) {
      // expo run keeps streaming logs after installation; stop it once the
      // locale-specific app is available so the capture loop can continue.
      child.kill('SIGINT');
      return;
    }
    if (child.exitCode !== null) {
      throw new Error(`Android release build exited before installing the ${locale} screenshot app.`);
    }
    await sleep(1500);
  }

  child.kill('SIGINT');
  throw new Error(`Timed out waiting for the ${locale} screenshot app to install.`);
}

async function clearReversePorts(serial) {
  await run('adb', ['-s', serial, 'reverse', '--remove', 'tcp:8080'], { allowFailure: true });
}

async function clearStatusBar(serial) {
  await run('adb', ['-s', serial, 'shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'exit'], {
    allowFailure: true,
  });
}

async function capturePng(serial, targetPath) {
  const { stdout } = await run('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], {
    encoding: 'buffer',
  });
  await fs.writeFile(targetPath, stdout);
}

async function captureForDevice(device, locale) {
  const size = await getDeviceSize(device.serial);
  if (size.width !== androidCanvas.width || size.height !== androidCanvas.height) {
    throw new Error(
      `Google Play screenshots require a Pixel 6a-sized 1080x2400 device; ${device.serial} is ${size.width}x${size.height}.`
    );
  }

  const targetDir = path.join(screenshotsDir, androidOutputDirName);
  await fs.mkdir(targetDir, { recursive: true });
  const roomBySlide = [];

  process.stdout.write(`\n==> Capturing Android ${size.width}x${size.height} (${locale}) on ${device.serial}\n`);
  await applyReversePorts(device.serial);
  await applyStatusBar(device.serial);

  try {
    await run('adb', ['-s', device.serial, 'uninstall', 'click.helpamunch.mobileapp'], { allowFailure: true });
    await run('npx', ['expo', 'prebuild', '--platform', 'android'], { cwd: frontendDir });
    await ensureAndroidCleartextTraffic();
    await buildAndInstallForLocale(device, locale);
    await setAppLocale(device.serial, locale);
    await applyReversePorts(device.serial);

    for (const flow of flows) {
      process.stdout.write(`   -> ${flow.file}\n`);
      const seededRoom = await seedRoomForFlow(flow);
      roomBySlide.push({ file: flow.file, roomId: seededRoom.roomId });
      await applyReversePorts(device.serial);
      await run('maestro', ['test', '--device', device.serial, '-p', 'android', '-e', `ROOM_ID=${seededRoom.roomId}`, flow.flow], {
        cwd: rootDir,
      });
      await sleep(1200);
      await capturePng(device.serial, path.join(targetDir, flow.file));
    }
  } finally {
    if (roomBySlide.length > 0) {
      process.stdout.write('\nSlide room map:\n');
      for (const mapping of roomBySlide) {
        process.stdout.write(`   ${mapping.file}: ${mapping.roomId}\n`);
      }
    }
    await clearStatusBar(device.serial);
    await clearReversePorts(device.serial);
  }

  return targetDir;
}

async function generateCaptionedScreenshots(locale) {
  await run(pythonCommand, ['scripts/generate-app-store-preview-redesign.py', '--locale', locale, '--target', androidOutputDirName]);
}

async function main() {
  await fs.mkdir(screenshotsDir, { recursive: true });
  const device = await resolveDevice();

  let targetDir = '';
  try {
    for (const locale of storeLocales) {
      if (!forceCapture && await hasCompletePreviewSet(locale)) {
        process.stdout.write(`   -> ${locale}: existing complete preview set, skipping capture\n`);
        continue;
      }
      await setScreenshotBuildLocale(locale);
      targetDir = await captureForDevice(device, locale);
      await generateCaptionedScreenshots(locale);
    }
  } finally {
    await clearScreenshotBuildLocale();
  }

  process.stdout.write(`\nGoogle Play screenshots saved under ${targetDir}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
