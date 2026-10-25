# Android emulator recovery on an Intel Mac

Use this guide when Android Studio times out starting an emulator or Expo cannot
open an Android development device. These steps repair the **local SDK and AVD**;
they do not change the app's Android target, dependencies, or release build.

## What failed on this machine

On 2026-10-25, the Intel Core i7-1068NG7 Mac had emulator 37.2.12 and SDK
platform-tools 37.0.1. The existing `Medium_Phone_API_37.2` and `Pixel_10` AVDs
used Google Play 16 KB images (API 37.2 and 36.1) with automatic graphics.
Android Studio reported `Timed out after 300 seconds waiting for emulator to
come online`; ADB reported `offline`.

Disk space and Hypervisor.framework checks passed. Cold boot reproduced the
failure. The guest kernel logged `get_xsave_addr_user` warnings; disabling PKU
or XSAVE experimentally did not produce a completed boot. Do not treat that
warning alone as proof of the root cause or retain those CPU workarounds.

Automatic graphics selected ANGLE/SwiftShader software rendering. A separate
standard API 36.1 image also stalled during startup. The working development
setup is **API 35 Google APIs x86_64, host graphics, Vulkan disabled**, named
`Munch_Dev_API_35`, with 4 GB RAM and a 720 × 1600 display at 30 Hz. With host graphics, it progressed through package setup and
first-boot optimization and returned `sys.boot_completed=1`. Multiple settings
changed during recovery, so this establishes a working combination rather than
isolating a single upstream defect. The original AVDs and their data were kept.

There was also an older MacPorts ADB (36.0.2) ahead of the SDK ADB in `PATH`.
The shell now prefers the SDK tools. This removes tool ambiguity; restarting
ADB alone did not fix the boot failure.

## 1. Inspect the SDK and devices

On macOS, the default SDK location is:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
uname -m
command -v adb
adb version
emulator -version
emulator -accel-check
emulator -list-avds
adb devices -l
df -h /
```

Put those two exports in `~/.zshrc`, replacing any lines that append these tools
after another ADB installation. Open a new terminal afterward. Select the same
SDK location in Android Studio's SDK Manager. This machine is `x86_64`; use
`arm64-v8a` images on Apple Silicon instead, and diagnose graphics there separately.

Use explicit serials for ADB commands: a connected physical phone can otherwise
be mistaken for a working emulator. `device` is necessary but does not prove
Android has completed booting.

## 2. Create a development AVD without deleting existing devices

In Android Studio's Device Manager, stop the stuck emulator. If it will not stop,
inspect `ps ax -o pid,command` and send `kill -TERM <pid>` only to its identified
`qemu-system-x86_64` process. Wait for it to exit before restarting that AVD.
Do not run two writable instances of the same AVD or remove locks while it runs.

Install the standard Google APIs image and create a new device (skip creation
when `Munch_Dev_API_35` already exists):

```sh
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" \
  'system-images;android-35;google_apis;x86_64'
"$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
  -n Munch_Dev_API_35 \
  -k 'system-images;android-35;google_apis;x86_64' \
  -d medium_phone
```

Answer `no` if asked to create a custom hardware profile. In the Studio UI, the
equivalent is a Medium Phone with the API 35 **Google APIs x86_64** image.
Creating an API 35 test device does not lower the application's compile/target SDK.

## 3. Persist the working graphics settings

With the new AVD stopped, back up
`~/.android/avd/Munch_Dev_API_35.avd/config.ini`, then set these keys once each:

```ini
hw.gpu.enabled=yes
hw.gpu.mode=host
hw.keyboard=yes
hw.ramSize=4096
hw.lcd.width=720
hw.lcd.height=1600
hw.lcd.density=320
hw.lcd.vsync=30
fastboot.forceColdBoot=yes
fastboot.forceFastBoot=no
```

In Device Manager, host graphics corresponds to the Hardware graphics setting.
Edit `config.ini`, not the generated `hardware-qemu.ini`.
The RAM and smaller display reduce contention during native compilation; the
initial 2 GB, 1080 × 2400 configuration showed a System UI timeout under load.
The emulator warns that host OpenGL on macOS is deprecated and may lack GLES
3.1 features. This setup is for this app's local development; it does not prove
compatibility with every graphics workload or replace device testing.

Quick Boot shutdown also hung during recovery. Keep this AVD on cold boot:
in the emulator's **Extended controls → Snapshots → Settings**, set **Auto-save
current state to Quickboot** to **No**. The corresponding local AVD file is
`quickbootChoice.ini` alongside `config.ini`, containing:

```ini
saveOnExit = false
```

These settings avoid loading/saving VM snapshots while keeping installed apps
and their data. See the [official snapshot guide](https://developer.android.com/studio/run/emulator-snapshots).

Back up `~/.android/advancedFeatures.ini` if it exists, preserve its other
settings, and set this entry once:

```ini
Vulkan = off
```

This is a user-level emulator setting: it also applies when Android Studio or
Expo starts an AVD. It disables guest Vulkan testing for these local emulators;
use a separate environment/device for Vulkan-specific validation. The one-run
equivalent, useful before persisting settings, is:

```sh
emulator -avd Munch_Dev_API_35 -no-snapshot -gpu host -feature -Vulkan
```

The recovery left backups as `~/.zshrc.before-munch-android-fix` and
`config.ini.before-munch-android-fix` beside the AVD configs. There was no prior
user-level `advancedFeatures.ini`. To undo the workaround, stop the emulator,
restore the relevant config/shell backups, and remove only the added Vulkan
setting. Keep or delete the newly created development AVD through Device Manager
as needed; no original device needs to be wiped.

## 4. Match the Android build JDK

The machine initially had only Java 25. The first Expo build failed in
`react-native-worklets:configureCMakeDebug[x86_64]` and
`react-native-screens:configureCMakeDebug[x86_64]` with
`WARNING: A restricted method in java.lang.System has been called`.
The repository's Android workflow uses **JDK 17**. This is a separate build
toolchain issue; changing Java cannot fix emulator guest booting.

Install a macOS x64 JDK 17 from [Adoptium](https://adoptium.net/temurin/releases/?version=17),
then select it in the terminal used for Expo:

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

The recovery installed Temurin 17 under `~/Library/Java/JavaVirtualMachines/`
and added these exports to `~/.zshrc`. Java 25 remains installed. To reverse the
default selection, remove those exports or restore the shell backup. Select JDK
17 as Android Studio's Gradle JDK when building the native project from Studio.

## 5. Verify boot, then run the app

Start `Munch_Dev_API_35` in Device Manager, or run:

```sh
emulator -avd Munch_Dev_API_35 -no-snapshot
```

First boot scans packages and optimizes preinstalled apps; let it finish. In a
second terminal, select the emulator serial printed by `adb devices -l`:

```sh
adb devices -l
adb -s emulator-5554 shell getprop sys.boot_completed
adb -s emulator-5554 shell pm path android
```

Replace `emulator-5554` if a different port was assigned. Boot completion must
return `1`; package-manager readiness should return a `package:...` path.
Then, from the repository:

```sh
cd frontend
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 \
  npm run android -- --device Munch_Dev_API_35
```

Expo's `--device` argument takes the **AVD name**, not the ADB serial.
Use `npm run android` when the desired device is the only available target;
with a physical phone attached, select the AVD explicitly. Android's `10.0.2.2`
reaches the host backend; the backend must be running separately.

If reusing a separate Metro process, use
`EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 npx expo start --dev-client --lan --port 8081`,
then use the same Android command with `--no-bundler`. During recovery, a server
started with `--localhost` listened only on IPv6 loopback and could not accept
the LAN address advertised by `expo run:android`. Match the server listener to
the URL used by the client. If LAN networking is unavailable, an alternative
is `adb -s emulator-5554 reverse tcp:8081 tcp:8081` with
`REACT_NATIVE_PACKAGER_HOSTNAME=localhost` scoped to the Android command.
A successful APK build alone does not verify the Metro connection; confirm the
app's screen appears.

For the repository's mobile E2E gate, select both the AVD and its current serial:

```sh
E2E_ANDROID_AVD=Munch_Dev_API_35 E2E_ANDROID_DEVICE=emulator-5554 \
  npm run test:e2e:mobile
```

Run that command from the repository root. Boot checks and an Expo development
build do not substitute for the full mobile E2E suite.

## If startup fails again

Capture a cold-boot log before changing settings:

```sh
emulator -avd Munch_Dev_API_35 -no-snapshot -verbose -show-kernel \
  > /tmp/munch-android-emulator.log 2>&1
```

Do this with the AVD stopped. `-no-snapshot` bypasses loading and saving Quick
Boot snapshots while preserving installed app data. Prefer it to Wipe Data.
Once ADB is available, inspect `logcat -d -b crash` and
`logcat -d -s SystemServerTiming PackageManager` with the selected serial to
distinguish progressing first-boot work from a repeated failure. Studio logs
are under `~/Library/Logs/Google/AndroidStudio*/idea.log`.

If ADB itself is inconsistent, run the SDK's `adb kill-server` followed by
`adb start-server`, then recheck `adb version` and all connected devices. This
briefly disconnects every device; it cannot repair a stalled Android guest.

Before trying updates, record emulator/image versions and keep the working AVD.
Revalidate a cold boot and app launch after updates. Do not commit machine-local
AVD files, SDK paths, generated native projects, or diagnostic logs to the repo.

References: [Android emulator troubleshooting](https://developer.android.com/studio/run/emulator-troubleshooting),
[hardware acceleration](https://developer.android.com/studio/run/emulator-acceleration),
and [emulator command-line options](https://developer.android.com/studio/run/emulator-commandline).
