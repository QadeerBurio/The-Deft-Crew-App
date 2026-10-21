# Native Android patches

`android/` is git-ignored but EAS uploads it as-is (see `.easignore`): the app is built from
the hand-maintained native project on disk, not from `expo prebuild`. These files keep the
manual native work in git, so nothing depends on one machine.

| File | What it is |
|---|---|
| `meta-app-events.patch` | Only the Meta App Events edits (2 files). Applies to `android/` without them (the release-hygiene state of 2026-10-21). |
| `prebuild-to-current.patch` | Everything that differs from a fresh `expo prebuild --clean`: the Meta edits **and** every other manual change (see `MANUAL-NATIVE-CHANGES.md`). |
| `notification-icons/` | The 5 notification icons the app ships (prebuild generates different ones). |

Both patches were checked: applied to their base they give a byte-identical `android/`
(branch `fix/native-release-hygiene`, Expo SDK 54.0.37, 2026-10-21). The Meta IDs are not in any of these
files: Gradle reads `META_APP_ID` / `META_CLIENT_TOKEN` from the build environment.

## Re-apply only the Meta edits

From the repo root, on a native project that doesn't have them yet:

```bash
git -c core.autocrlf=false apply --check docs/native-patches/meta-app-events.patch
git -c core.autocrlf=false apply docs/native-patches/meta-app-events.patch
```

`core.autocrlf=false` keeps the native files' LF line endings on Windows.

## Rebuild `android/` from scratch (lost disk, new machine)

1. Back up whatever `android/` exists.
2. Generate it without the Meta variables set (so the plugin doesn't add its own copy).
   In bash, `unset META_APP_ID META_CLIENT_TOKEN` first:
   ```bash
   npx expo prebuild -p android --clean --no-install
   ```
3. Apply all manual changes and restore the icons:
   ```bash
   git -c core.autocrlf=false apply docs/native-patches/prebuild-to-current.patch
   for d in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
     cp docs/native-patches/notification-icons/drawable-$d/notification_icon.png android/app/src/main/res/drawable-$d/
   done
   ```
4. If `git apply` refuses a hunk, `app.json` or the Expo SDK changed since 2026-10-21: apply the
   changes in `MANUAL-NATIVE-CHANGES.md` by hand instead.

## When `app.json` or plugins change

`expo prebuild` (without `--clean`) on the existing `android/` would also undo the manual
changes listed in `MANUAL-NATIVE-CHANGES.md`. Run it on a copy, compare, and carry over only
what you want. After changing native files on purpose, regenerate the patches here so git
stays the source of truth.
