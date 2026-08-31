# Android App Runtime

Instara Crew can run comment jobs through the real Instagram Android app in addition to the existing persistent Playwright browser runtime.

The Android path is intentionally narrow: it opens authorized Instagram targets, finds the comment UI, supports Dry Run, submits only when explicitly run live, verifies the result when possible, and stops on login/action-block states. It does **not** add follow/unfollow, scraping, password login, DM automation, or arbitrary ADB shell execution.

## Why this runtime exists

Instagram's mobile UI and web UI fail in different ways. Keeping Android as a separate execution engine gives each account an explicit runtime instead of silently falling back between unrelated automation paths.

The architecture is inspired by the device-facade approach used by the open-source InstaAddict / GramAddict ecosystem, while the Instara Crew bridge and dispatcher are implemented specifically for this project and its comment-only guardrails.

## Requirements

- Android Platform Tools (`adb`)
- Python 3
- `uiautomator2`
- an Android phone/tablet or emulator with Instagram installed
- USB debugging or ADB-over-TCP enabled

After pulling this version, update Prisma first:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Install the optional Python dependency:

```bash
pip install -r requirements-android.txt
```

Verify ADB:

```bash
adb devices -l
```

The target device must appear with state `device`. `unauthorized` means you still need to approve the debugging prompt on the device.

## Configure Instara Crew

1. Start Instara Crew normally.
2. Open `http://localhost:3000/android`.
3. Click **Rileva device**.
4. Add an Android account and bind it to one ADB serial.
5. Keep `com.instagram.android` unless you deliberately use another compatible package.
6. Click **Apri app**, then log into Instagram manually on the device.
7. Click **Test** and confirm the package/device check succeeds.
8. Run the first job with **Dry Run** enabled.

The login remains inside the Android app. Instara Crew does not need the Instagram password for this runtime.

## Environment variables

```env
ADB_PATH=adb
ANDROID_PYTHON=
```

`ADB_PATH` can point to a specific `adb` executable when Platform Tools is not on `PATH`. `ANDROID_PYTHON` is optional; when empty, Instara Crew tries the normal platform commands (`py -3`, `python`, or `python3`).

## Runtime behavior

For an Android-bound account the worker:

1. applies the same per-account rate limits used by the browser runtime;
2. opens the Instagram post via Android intent;
3. checks for login/action-block states;
4. opens the comment composer;
5. inserts and verifies the prepared text;
6. clears the field without submitting in Dry Run;
7. in Live mode, taps the explicit comment submit control and verifies the result when possible;
8. updates item/account state and stops the account on login/action-block signals.

The operator pause/cancel controls remain in the worker path, so Android jobs do not bypass the existing kill switch.

## Troubleshooting

### `ADB non disponibile`

Install Android Platform Tools and either add them to `PATH` or set `ADB_PATH` to the full executable path.

### Device is `unauthorized`

Unlock the Android device and approve the USB debugging authorization prompt, then run `adb devices -l` again.

### `uiautomator2 non installato`

Run `pip install -r requirements-android.txt`.

### Package not installed

Install Instagram on that phone/emulator or correct the package name in the Android account configuration.

### Comment field / submit button not found

Instagram changes its Android UI frequently. Stop the run rather than repeatedly retrying. Capture the exact app version and failing screen/state so selectors can be updated safely.

## Security boundaries

The runtime validates ADB serials, package names, and Instagram HTTPS targets before execution. The Python bridge exposes a fixed action set (`health`, `open_home`, `open_target`, `stop`, `publish`) and does not accept arbitrary shell commands from the dashboard.
