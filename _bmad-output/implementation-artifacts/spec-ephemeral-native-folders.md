---
title: 'Move Fastlane out of ephemeral native folders'
type: 'refactor'
created: '2026-05-01'
status: 'ready-for-dev'
baseline_commit: 'ef68ada20872116e0a62d35ea78f7074279acf8a'
context:
  - 'frontend/.gitignore'
  - '.github/workflows/ios-app-store-cd.yml'
  - '.github/workflows/android-play-store-cd.yml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `frontend/ios/` and `frontend/android/` are committed but are produced by `expo prebuild` and should be regenerated on every build. The Fastlane configurations and their Ruby `Gemfile`s are the only files inside those trees that genuinely need to persist. Running `expo prebuild --clean` today destroys the Fastlane setup, blocking a clean ephemeral workflow.

**Approach:** Consolidate Fastlane to live at `frontend/fastlane/` (with the `Gemfile` at `frontend/Gemfile`) and run it from `frontend/` for both platforms. Gitignore `frontend/ios/` and `frontend/android/` wholesale. Add a `prebuild:clean` npm script that runs `expo prebuild --clean` for the chosen platform. Both CD workflows change their working directory to `frontend/` and invoke `bundle exec fastlane <platform> <lane>`. No file copying: the persistent Fastlane tree is the only Fastlane tree. Local debug keystore is intentionally regenerated each run.

## Boundaries & Constraints

**Always:**
- Single fastlane setup at `frontend/fastlane/{Fastfile,Appfile,Matchfile,Pluginfile}` with `frontend/Gemfile` and `frontend/Gemfile.lock`. Both platforms share this setup; no per-platform fastlane subtrees.
- `Fastfile` declares both `platform :ios` and `platform :android` blocks. Each lane that touches a regenerated native project wraps its work in `Dir.chdir("./ios") do … end` or `Dir.chdir("./android") do … end` so existing relative paths inside the lane (e.g. `munchhelper.xcworkspace`, `./gradlew`, `app/build/outputs/...`) keep resolving.
- `Appfile` uses `for_platform :ios do … end` and `for_platform :android do … end` blocks to scope `app_identifier` / `team_id` / `package_name` / `json_key_file` to the right platform.
- Lane behavior is preserved: same actions, same parameters, same env-var contracts (`MATCH_*`, `APP_STORE_CONNECT_*`, `ANDROID_SIGNING_*`, `GOOGLE_GHA_CREDS_PATH`, etc.). The iOS `beta` lane gains one new line — `cocoapods(repo_update: true)` immediately before `build_app` — replacing the workflow's separate `pod install --repo-update` step. Otherwise only the surrounding `Dir.chdir` block and the platform/Appfile structure change.
- Both CD workflows run `bundle install` and `bundle exec fastlane <platform> <lane>` from `frontend/`. The iOS workflow has no `pod install` step — the lane handles it.
- `npm run prebuild:clean -- --platform ios|android|all` is the single entrypoint shared by devs and CI for regenerating native dirs.

**Ask First:**
- Renaming the npm script or its `--platform` interface.
- Splitting `frontend/fastlane/` back into per-platform subtrees.
- Reintroducing a workflow-level `pod install` step.

**Never:**
- Do not create or copy any fastlane config under `frontend/ios/` or `frontend/android/` at runtime. The persistent tree is the only tree.
- Do not keep `frontend/android/app/debug.keystore` persistent — let prebuild regenerate it.
- Do not introduce gitignore negation patterns for `frontend/ios/**` or `frontend/android/**`. The trees are ignored without exceptions.
- Do not change lane logic, secret names, or the `Validate Required Inputs` step contents.
- Do not rely on `expo prebuild` (without `--clean`) to make the workflow work; the script must always run `--clean`.

</frozen-after-approval>

## Code Map

- `frontend/ios/fastlane/{Fastfile,Appfile,Matchfile}` -- current iOS fastlane source; merge into `frontend/fastlane/`.
- `frontend/android/fastlane/{Fastfile,Appfile,Pluginfile}` -- current Android fastlane source; merge into `frontend/fastlane/`.
- `frontend/{ios,android}/{Gemfile,Gemfile.lock}` -- current Ruby deps; merge into `frontend/Gemfile` (+ lock).
- `frontend/.gitignore` -- add `ios/` and `android/`.
- `frontend/scripts/prebuild-clean.mjs` -- new: thin wrapper running `npx expo prebuild --clean --platform <p>` per platform.
- `frontend/package.json` -- add `prebuild:clean` script.
- `.github/workflows/ios-app-store-cd.yml` -- switch default `working-directory` to `frontend`; invoke `npm run prebuild:clean -- --platform ios` and `bundle exec fastlane ios beta`; remove the existing `install pods` step entirely.
- `.github/workflows/android-play-store-cd.yml` -- switch default `working-directory` to `frontend`; invoke `npm run prebuild:clean -- --platform android` and `bundle exec fastlane android build` / `android deploy`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/Gemfile` + `frontend/Gemfile.lock` -- create from the existing iOS+Android Gemfiles. Single `gem "fastlane", "~> 2.232"` plus the existing `eval_gemfile('fastlane/Pluginfile')` line. Run `bundle install` to regenerate `Gemfile.lock`.
- [x] `frontend/fastlane/Fastfile` -- new file with `platform :ios do … end` + `platform :android do … end`. Each existing lane body is preserved verbatim except wrapped in `Dir.chdir("./ios") do … end` (iOS) or `Dir.chdir("./android") do … end` (Android). In the iOS `beta` lane, add `cocoapods(repo_update: true)` immediately before `build_app`.
- [x] `frontend/fastlane/Appfile` -- new file using `for_platform :ios do … end` (preserves `app_identifier`, `apple_id(ENV[…])`, `itc_team_id`, `team_id`) and `for_platform :android do … end` (preserves `package_name` and the `json_key_file` env-guard).
- [x] `frontend/fastlane/Matchfile` -- copy as-is from `frontend/ios/fastlane/Matchfile`.
- [x] `frontend/fastlane/Pluginfile` -- copy as-is from `frontend/android/fastlane/Pluginfile`.
- [x] `frontend/scripts/prebuild-clean.mjs` -- new script. Parse `--platform` (`ios` | `android` | `all`, default `all`); for each platform run `npx expo prebuild --clean --platform <p>` from `frontend/` via `node:child_process` `spawnSync` with `stdio: 'inherit'`. Exit non-zero on first failure with a clear message.
- [x] `frontend/package.json` -- add `"prebuild:clean": "node ./scripts/prebuild-clean.mjs"`.
- [x] `frontend/.gitignore` -- append `ios/` and `android/` entries (with brief comment).
- [x] `git rm -r --cached frontend/ios frontend/android` -- untrack the now-ignored tree.
- [x] `.github/workflows/ios-app-store-cd.yml` -- set `defaults.run.working-directory: frontend`. Replace `npx -y expo prebuild --platform ios` with `npm run prebuild:clean -- --platform ios`. Delete the `install pods` step entirely (the lane handles it via `cocoapods`). Change `bundle exec fastlane beta` → `bundle exec fastlane ios beta`. No other changes.
- [x] `.github/workflows/android-play-store-cd.yml` -- set `defaults.run.working-directory: frontend`. Replace `npx -y expo prebuild --platform android` with `npm run prebuild:clean -- --platform android`. Change `bundle exec fastlane build` → `bundle exec fastlane android build` and `bundle exec fastlane deploy` → `bundle exec fastlane android deploy`.

**Acceptance Criteria:**
- Given a fresh checkout, when a developer runs `cd frontend && npm ci && npm run prebuild:clean -- --platform all && bundle install`, then `bundle exec fastlane lanes` lists the existing iOS lanes (`certs_update`, `beta`) and Android lanes (`build`, `deploy`, `beta`) without error and without referencing any path under `frontend/ios/fastlane/` or `frontend/android/fastlane/`.
- Given the same fresh checkout with all CI secrets present, when the iOS CD workflow runs against `main`, then `Validate Required Inputs`, `Install Frontend Dependencies` (with `prebuild:clean`), `Install Fastlane Dependencies`, and `bundle exec fastlane ios beta` (which now invokes `cocoapods` internally) all succeed and a build is uploaded to TestFlight.
- Given the same fresh checkout, when the Android CD workflow runs against `main`, then `bundle exec fastlane android build` followed by `bundle exec fastlane android deploy` succeed and an AAB is uploaded to the Play Store internal track.
- Given `frontend/ios/` and `frontend/android/` exist locally with prebuild output, when `git status` runs, then no files under those two directories appear as tracked or untracked changes.
- Given the working tree, when `rg -n "ios/fastlane|android/fastlane|frontend/ios/Gemfile|frontend/android/Gemfile" .github frontend` runs, then there are zero matches.

## Design Notes

Persistent layout (single fastlane setup, both platforms):

```
frontend/
  Gemfile              # gem "fastlane"; eval_gemfile('fastlane/Pluginfile')
  Gemfile.lock
  fastlane/
    Fastfile           # platform :ios { … } + platform :android { … }
    Appfile            # for_platform :ios { … } + for_platform :android { … }
    Matchfile          # iOS-only by convention
    Pluginfile         # Android increment_version_code plugin
  scripts/
    prebuild-clean.mjs
```

Fastfile lane shape (sketch — actual lane bodies are the existing ones, preserved verbatim inside the chdir):

```ruby
platform :ios do
  lane :beta do
    Dir.chdir("./ios") do
      setup_ci if ENV['CI']
      app_store_connect_api_key(...)
      sync_code_signing(type: "appstore", readonly: true)
      # increment_build_number, update_code_signing_settings (unchanged)
      cocoapods(repo_update: true)
      # build_app, upload_to_testflight (unchanged)
    end
  end
end

platform :android do
  lane :build do
    Dir.chdir("./android") do
      # google_play_track_version_codes, increment_version_code, gradle (unchanged)
    end
  end
end
```

`Dir.chdir` is fastlane's documented escape hatch for actions whose paths are relative to a project subdir. Using it preserves every lane body verbatim and avoids prefixing every path with `ios/` or `android/`.

`Appfile` example:

```ruby
for_platform :ios do
  app_identifier("click.helpamunch.mobileapp")
  apple_id(ENV["APPLE_ID"])
  itc_team_id(ENV["APPLE_CONNECT_TEAM_ID"])
  team_id(ENV["APPLE_DEVELOPER_TEAM_ID"])
end

for_platform :android do
  package_name("click.helpamunch.mobileapp")
  json_key_file(ENV["GOOGLE_GHA_CREDS_PATH"]) if ENV["GOOGLE_GHA_CREDS_PATH"]
end
```

## Verification

**Commands:**
- `cd frontend && npm run prebuild:clean -- --platform ios` -- expected: exits 0; `frontend/ios/munchhelper.xcworkspace` exists; no fastlane dir written under `frontend/ios/`.
- `cd frontend && npm run prebuild:clean -- --platform android` -- expected: exits 0; `frontend/android/build.gradle` exists; no fastlane dir written under `frontend/android/`.
- `cd frontend && bundle install && bundle exec fastlane lanes` -- expected: lists all five existing lanes scoped under `ios` and `android` platforms.
- `git status --porcelain frontend/ios frontend/android` -- expected: empty after a clean prebuild on a clean checkout.
- `git ls-files frontend/ios frontend/android | wc -l` -- expected: `0` after the untracking commit lands.

**Manual checks:**
- After this change merges to `main`, watch the iOS and Android CD workflow runs and confirm both reach the upload step successfully.
