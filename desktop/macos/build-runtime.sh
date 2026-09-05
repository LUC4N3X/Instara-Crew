#!/bin/bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="${1:-$PROJECT_ROOT/desktop-dist}"
STAGE_ROOT="${RUNNER_TEMP:-/tmp}/instara-macos-standalone"
APP_BUNDLE="$STAGE_ROOT/Instara Crew.app"
CONTENTS="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
APP_STAGE="$RESOURCES/app"
RUNTIME_STAGE="$RESOURCES/runtime"
NODE_STAGE="$RUNTIME_STAGE/node"
POSTGRES_STAGE="$RUNTIME_STAGE/postgres"
PYTHON_STAGE="$RUNTIME_STAGE/python"
ADB_STAGE="$RUNTIME_STAGE/platform-tools"
VERSION="$(node -p "require('$PROJECT_ROOT/package.json').version")"
ARCH="$(uname -m)"
PYTHON_RELEASE="20260825"
PYTHON_VERSION="3.12.14"

case "$ARCH" in
  arm64)
    POSTGRES_PACKAGE="@embedded-postgres/darwin-arm64@18.4.0-beta.17"
    POSTGRES_FOLDER="darwin-arm64"
    PYTHON_TARGET="aarch64-apple-darwin"
    ARTIFACT_ARCH="Apple-Silicon"
    ;;
  x86_64)
    POSTGRES_PACKAGE="@embedded-postgres/darwin-x64@18.4.0-beta.17"
    POSTGRES_FOLDER="darwin-x64"
    PYTHON_TARGET="x86_64-apple-darwin"
    ARTIFACT_ARCH="Intel"
    ;;
  *)
    echo "Unsupported macOS architecture: $ARCH" >&2
    exit 1
    ;;
esac

rm -rf "$STAGE_ROOT" "$OUTPUT_DIR"
mkdir -p "$MACOS_DIR" "$APP_STAGE" "$NODE_STAGE" "$POSTGRES_STAGE" "$PYTHON_STAGE" "$ADB_STAGE" "$OUTPUT_DIR"

echo "Assembling Instara Crew $VERSION for macOS $ARCH - by LUC4N3X"

for dir in .next node_modules prisma public scripts src; do
  test -e "$PROJECT_ROOT/$dir"
  ditto "$PROJECT_ROOT/$dir" "$APP_STAGE/$dir"
done

for file in package.json next.config.ts .env.example requirements-android.txt; do
  cp "$PROJECT_ROOT/$file" "$APP_STAGE/$file"
done

NODE_SOURCE="$(command -v node)"
cp "$NODE_SOURCE" "$NODE_STAGE/node"
chmod +x "$NODE_STAGE/node"
"$NODE_STAGE/node" --version

echo "Packing embedded PostgreSQL..."
PG_TEMP="${RUNNER_TEMP:-/tmp}/instara-postgres-macos"
rm -rf "$PG_TEMP"
mkdir -p "$PG_TEMP"
npm install --prefix "$PG_TEMP" --no-save --package-lock=false "$POSTGRES_PACKAGE"
PG_PACKAGE_ROOT="$PG_TEMP/node_modules/@embedded-postgres/$POSTGRES_FOLDER"
PG_NATIVE="$PG_PACKAGE_ROOT/native"
test -x "$PG_NATIVE/bin/postgres"
ditto "$PG_NATIVE" "$POSTGRES_STAGE"
cp "$PG_PACKAGE_ROOT/LICENSE.md" "$POSTGRES_STAGE/LICENSE.md" 2>/dev/null || true
"$POSTGRES_STAGE/bin/postgres" --version

echo "Packing Android Platform Tools..."
PLATFORM_ZIP="${RUNNER_TEMP:-/tmp}/platform-tools-macos.zip"
PLATFORM_EXTRACT="${RUNNER_TEMP:-/tmp}/platform-tools-macos"
rm -rf "$PLATFORM_EXTRACT"
/usr/bin/curl -fL --retry 3 "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip" -o "$PLATFORM_ZIP"
/usr/bin/unzip -q "$PLATFORM_ZIP" -d "$PLATFORM_EXTRACT"
ditto "$PLATFORM_EXTRACT/platform-tools" "$ADB_STAGE"
chmod +x "$ADB_STAGE/adb"
"$ADB_STAGE/adb" version

echo "Packing standalone Python + uiautomator2..."
PYTHON_ARCHIVE="${RUNNER_TEMP:-/tmp}/python-standalone.tar.gz"
PYTHON_EXTRACT="${RUNNER_TEMP:-/tmp}/python-standalone"
PYTHON_ASSET="cpython-${PYTHON_VERSION}+${PYTHON_RELEASE}-${PYTHON_TARGET}-install_only_stripped.tar.gz"
PYTHON_URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PYTHON_RELEASE}/${PYTHON_ASSET}"
rm -rf "$PYTHON_EXTRACT"
mkdir -p "$PYTHON_EXTRACT"
/usr/bin/curl -fL --retry 3 "$PYTHON_URL" -o "$PYTHON_ARCHIVE"
/usr/bin/tar -xzf "$PYTHON_ARCHIVE" -C "$PYTHON_EXTRACT"
test -x "$PYTHON_EXTRACT/python/bin/python3"
ditto "$PYTHON_EXTRACT/python" "$PYTHON_STAGE"
"$PYTHON_STAGE/bin/python3" -m ensurepip --upgrade >/dev/null 2>&1 || true
"$PYTHON_STAGE/bin/python3" -m pip install --disable-pip-version-check --no-warn-script-location -r "$PROJECT_ROOT/requirements-android.txt"
"$PYTHON_STAGE/bin/python3" -c 'import uiautomator2; print("uiautomator2 ready")'

echo "Building native macOS shell..."
/usr/bin/swiftc -O -framework Cocoa -framework WebKit "$PROJECT_ROOT/desktop/macos/Launcher.swift" -o "$MACOS_DIR/Instara-Crew"
chmod +x "$MACOS_DIR/Instara-Crew"
cp "$PROJECT_ROOT/desktop/macos/runtime.sh" "$RESOURCES/runtime.sh"
chmod +x "$RESOURCES/runtime.sh"

echo "Creating application icon..."
ICONSET="$STAGE_ROOT/InstaraCrew.iconset"
mkdir -p "$ICONSET"
SOURCE_ICON="$PROJECT_ROOT/public/logo.png"
/usr/bin/sips -z 16 16 "$SOURCE_ICON" --out "$ICONSET/icon_16x16.png" >/dev/null
/usr/bin/sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
/usr/bin/sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET/icon_32x32.png" >/dev/null
/usr/bin/sips -z 64 64 "$SOURCE_ICON" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
/usr/bin/sips -z 128 128 "$SOURCE_ICON" --out "$ICONSET/icon_128x128.png" >/dev/null
/usr/bin/sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
/usr/bin/sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET/icon_256x256.png" >/dev/null
/usr/bin/sips -z 512 512 "$SOURCE_ICON" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
/usr/bin/sips -z 512 512 "$SOURCE_ICON" --out "$ICONSET/icon_512x512.png" >/dev/null
/usr/bin/sips -z 1024 1024 "$SOURCE_ICON" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
/usr/bin/iconutil -c icns "$ICONSET" -o "$RESOURCES/InstaraCrew.icns"

cat > "$CONTENTS/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>it</string>
  <key>CFBundleDisplayName</key><string>Instara Crew</string>
  <key>CFBundleExecutable</key><string>Instara-Crew</string>
  <key>CFBundleIconFile</key><string>InstaraCrew</string>
  <key>CFBundleIdentifier</key><string>com.luc4n3x.instara-crew</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Instara Crew</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.utilities</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSMultipleInstancesProhibited</key><true/>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key><true/>
  </dict>
  <key>NSHumanReadableCopyright</key><string>Copyright © LUC4N3X</string>
</dict>
</plist>
EOF

/usr/bin/plutil -lint "$CONTENTS/Info.plist"

echo "Applying ad-hoc code signature..."
/usr/bin/codesign --force --deep --sign - --identifier com.luc4n3x.instara-crew "$APP_BUNDLE"
/usr/bin/codesign --verify --deep --strict "$APP_BUNDLE"

ZIP_PATH="$OUTPUT_DIR/Instara-Crew-macOS-$ARTIFACT_ARCH-$VERSION-by-LUC4N3X.zip"
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$APP_BUNDLE" "$ZIP_PATH"

DMG_ROOT="$STAGE_ROOT/dmg"
mkdir -p "$DMG_ROOT"
ditto "$APP_BUNDLE" "$DMG_ROOT/Instara Crew.app"
ln -s /Applications "$DMG_ROOT/Applications"
DMG_PATH="$OUTPUT_DIR/Instara-Crew-macOS-$ARTIFACT_ARCH-$VERSION-by-LUC4N3X.dmg"
/usr/bin/hdiutil create -volname "Instara Crew - by LUC4N3X" -srcfolder "$DMG_ROOT" -ov -format UDZO "$DMG_PATH"

shasum -a 256 "$ZIP_PATH" "$DMG_PATH" > "$OUTPUT_DIR/SHA256-$ARTIFACT_ARCH.txt"

echo "macOS standalone artifacts ready in $OUTPUT_DIR"
