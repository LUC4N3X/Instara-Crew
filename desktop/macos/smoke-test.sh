#!/bin/bash
set -Eeuo pipefail

APP_BUNDLE="$1"
RESOURCES="$APP_BUNDLE/Contents/Resources"
SMOKE_HOME="${RUNNER_TEMP:-/tmp}/instara-smoke-home"
OUTPUT="${RUNNER_TEMP:-/tmp}/instara-runtime-output.log"

rm -rf "$SMOKE_HOME" "$OUTPUT"
mkdir -p "$SMOKE_HOME"

RUNTIME_PID=""
cleanup() {
  set +e
  if [ -n "$RUNTIME_PID" ] && kill -0 "$RUNTIME_PID" 2>/dev/null; then
    kill -TERM "$RUNTIME_PID" 2>/dev/null || true
    for ((i=0; i<50; i++)); do
      kill -0 "$RUNTIME_PID" 2>/dev/null || break
      sleep 0.1
    done
    kill -KILL "$RUNTIME_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

HOME="$SMOKE_HOME" /bin/bash "$RESOURCES/runtime.sh" "$RESOURCES" >"$OUTPUT" 2>&1 &
RUNTIME_PID=$!

for ((i=0; i<180; i++)); do
  if grep -q '^INSTARA_READY$' "$OUTPUT" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$RUNTIME_PID" 2>/dev/null; then
    cat "$OUTPUT"
    find "$SMOKE_HOME/Library/Application Support/Instara Crew/logs" -maxdepth 1 -type f -print -exec tail -n 100 {} \; 2>/dev/null || true
    exit 1
  fi
  sleep 0.5
done

grep -q '^INSTARA_READY$' "$OUTPUT"
/usr/bin/curl -fsS --max-time 5 http://127.0.0.1:3000/ >/dev/null
/usr/bin/curl -fsS --max-time 5 http://127.0.0.1:3000/api/accounts >/dev/null

echo "Standalone macOS runtime smoke test passed."
