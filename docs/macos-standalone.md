# Instara Crew for macOS

## Standalone app

The macOS distribution packages Instara Crew as a native `.app` inside a `.dmg` and does not require Docker, Git, Node.js, PostgreSQL, Redis, Python or Android Platform Tools to be installed manually.

The application is branded **Instara Crew — by LUC4N3X**.

Two builds are produced:

- Apple Silicon (`arm64`) for M1/M2/M3/M4/M5 and later Apple Silicon Macs;
- Intel (`x86_64`) for Intel Macs.

The app uses a native Swift/AppKit shell with `WKWebView`, so the dashboard is displayed inside the Instara Crew application window instead of opening the normal browser.

## Included runtime

Each build bundles the architecture-matching versions of:

- Node.js;
- the production Next.js application and existing worker;
- Playwright Chromium;
- embedded PostgreSQL;
- BullMQ PostgreSQL queue backend for standalone mode;
- Android Platform Tools / ADB;
- standalone Python with `uiautomator2`;
- Prisma and the existing Instara Crew application code.

The existing Docker/server deployment remains available and continues to default to Redis.

## First run

Open the `.dmg`, drag `Instara Crew.app` into Applications and launch it.

Because public CI builds are not signed with an Apple Developer ID certificate, Gatekeeper may identify the first public build as coming from an unidentified developer. If that happens, Control-click / right-click the app, choose **Open**, then confirm **Open**. A future Developer ID + notarization step can remove this extra first-run action.

Application data is stored under:

`~/Library/Application Support/Instara Crew`

The app keeps database data, browser profiles, logs and configuration outside the application bundle so upgrades do not erase them.

## Configuration

The first launch creates:

`~/Library/Application Support/Instara Crew/settings.env`

The app automatically configures its local PostgreSQL connection, queue backend, Playwright runtime, ADB path, Python runtime and session encryption key.

Meta and Google Cloud secrets are deliberately not embedded in GitHub release binaries. Add the credentials you actually use to `settings.env`. Vertex AI still requires a supported Google authentication setup on the Mac. Android execution still requires the physical/emulated Android device to have ADB access enabled and to authorize the Mac.

## GitHub artifacts

The `macOS Standalone` workflow builds and smoke-tests both architectures. Tag pushes matching `v*` attach the generated files to the GitHub Release:

- `Instara-Crew-macOS-Apple-Silicon-<version>-by-LUC4N3X.dmg`
- `Instara-Crew-macOS-Apple-Silicon-<version>-by-LUC4N3X.zip`
- `Instara-Crew-macOS-Intel-<version>-by-LUC4N3X.dmg`
- `Instara-Crew-macOS-Intel-<version>-by-LUC4N3X.zip`

The smoke test boots the bundled PostgreSQL database, applies Prisma and BullMQ schemas, starts the real Next.js dashboard and worker, then verifies the local dashboard and accounts API before the artifact is accepted.
