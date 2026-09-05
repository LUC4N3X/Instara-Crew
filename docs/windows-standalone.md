# Instara Crew for Windows

## Standalone distribution

The Windows package is designed for people who want to run Instara Crew without installing Docker, Git, Node.js, PostgreSQL, Redis, ADB or Python manually.

The installer and portable package are branded **Instara Crew - by LUC4N3X**.

The standalone package keeps the existing application, API routes, Prisma models, worker logic, Playwright browser runtime, Android bridge, Meta integration and Gemini integration. It does not replace the existing Docker/server deployment.

### Included runtime

The Windows artifact contains:

- Node.js runtime;
- the production Next.js build and the existing worker source;
- Chromium for Playwright;
- embedded PostgreSQL;
- BullMQ configured to use its PostgreSQL backend in standalone mode;
- Android Platform Tools / ADB;
- Python with the Android `uiautomator2` dependency;
- the Instara Crew launcher and local configuration manager.

The normal Docker/server path still defaults to Redis and keeps the existing `docker-compose.yml` workflow.

## Running it

Download `Instara-Crew-Setup-<version>-by-LUC4N3X.exe` from a GitHub Release and run the installer. The application installs per-user and does not require Docker Desktop.

At startup the launcher:

1. creates the local data directory under `%LOCALAPPDATA%\Instara Crew`;
2. starts the bundled PostgreSQL instance on a free loopback port;
3. prepares the Prisma schema;
4. applies BullMQ PostgreSQL migrations;
5. starts the Next.js dashboard and background worker;
6. opens Instara Crew in Microsoft Edge app mode when Edge is available;
7. stays available in the Windows notification area so the stack can be reopened or shut down cleanly.

Application data is kept outside the install directory so upgrades do not erase accounts, jobs, logs or browser profiles.

## Configuration

The first run creates:

`%LOCALAPPDATA%\Instara Crew\settings.env`

The launcher automatically manages the local database URL, queue backend, Playwright browser path, ADB path, Python path and browser profile storage. The remaining settings follow `.env.example`.

Meta and Google Cloud credentials are intentionally not embedded in a public release. Configure the values you actually use in `settings.env`. Vertex AI still requires valid Google Application Default Credentials or another supported Google authentication configuration on the machine. Meta OAuth still requires the matching app credentials and redirect URI.

Android execution is bundled with ADB and Python dependencies, but the Android device itself must still have USB debugging / ADB access enabled and must authorize the Windows machine.

## Building from GitHub

The `Windows Standalone` workflow runs on relevant pull requests and can also be started manually. Tag pushes matching `v*` build the artifacts and attach them to the GitHub Release.

Artifacts:

- `Instara-Crew-Setup-<version>-by-LUC4N3X.exe`
- `Instara-Crew-Portable-<version>-by-LUC4N3X.zip`

The installer contains the same application code as the repository build. Standalone mode changes infrastructure selection, not product behavior: PostgreSQL replaces the external PostgreSQL container and BullMQ uses its supported PostgreSQL backend instead of requiring Redis.
