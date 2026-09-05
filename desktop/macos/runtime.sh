#!/bin/bash
set -Eeuo pipefail

RESOURCES_DIR="$2"
APP_ROOT="$RESOURCES_DIR/app"
RUNTIME_ROOT="$RESOURCES_DIR/runtime"
DATA_ROOT="$HOME/Library/Application Support/Instara Crew"
LOG_ROOT="$DATA_ROOT/logs"
CONFIG_PATH="$DATA_ROOT/settings.env"
PGDATA="$DATA_ROOT/postgres"
BROWSER_PROFILES="$DATA_ROOT/browser-profiles"
NODE="$RUNTIME_ROOT/node/node"
PG_BIN="$RUNTIME_ROOT/postgres/bin"
PYTHON="$RUNTIME_ROOT/python/bin/python3"
ADB="$RUNTIME_ROOT/platform-tools/adb"
APP_URL="http://127.0.0.1:3000"
RUNTIME_LOG="$LOG_ROOT/runtime.log"

mkdir -p "$DATA_ROOT" "$LOG_ROOT" "$BROWSER_PROFILES"
exec 2>>"$RUNTIME_LOG"

WEB_PID=""
WORKER_PID=""
POSTGRES_PID=""
READY=0

status() {
  printf 'INSTARA_STATUS:%s\n' "$1"
}

cleanup() {
  set +e
  if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then kill -TERM "$WORKER_PID" 2>/dev/null; fi
  if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then kill -TERM "$WEB_PID" 2>/dev/null; fi
  sleep 0.3
  if [ -x "$PG_BIN/pg_ctl" ] && [ -f "$PGDATA/PG_VERSION" ]; then
    "$PG_BIN/pg_ctl" stop -D "$PGDATA" -m fast -w >/dev/null 2>&1 || true
  elif [ -n "$POSTGRES_PID" ] && kill -0 "$POSTGRES_PID" 2>/dev/null; then
    kill -TERM "$POSTGRES_PID" 2>/dev/null || true
  fi
}

on_error() {
  local code=$?
  if [ "$READY" -eq 0 ]; then
    printf 'INSTARA_ERROR:%s\n' "Avvio non riuscito. Controlla $RUNTIME_LOG"
  fi
  exit "$code"
}

trap on_error ERR
trap cleanup EXIT INT TERM

if [ ! -x "$NODE" ]; then
  echo "Bundled Node.js runtime not found at $NODE" >&2
  exit 1
fi
if [ ! -x "$PG_BIN/postgres" ]; then
  echo "Bundled PostgreSQL runtime not found at $PG_BIN" >&2
  exit 1
fi

ensure_settings() {
  if [ ! -f "$CONFIG_PATH" ]; then
    if [ -f "$APP_ROOT/.env.example" ]; then
      cp "$APP_ROOT/.env.example" "$CONFIG_PATH"
    else
      cat > "$CONFIG_PATH" <<'EOF'
SESSION_ENCRYPTION_KEY_BASE64=
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/auth/meta/callback
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-2.5-flash
BROWSER_HEADLESS=false
BROWSER_TIMEZONE=Europe/Rome
BROWSER_CHANNEL=
DRY_RUN=true
BURST_MODE=false
BURST_CONCURRENCY=
RATE_LIMITS=on
POST_ACCOUNT_CONCURRENCY=2
ACCOUNT_MAX_PER_HOUR=4
ACCOUNT_MAX_PER_DAY=15
ACCOUNT_MIN_GAP_SEC=45
ACTIVE_HOUR_FROM=8
ACTIVE_HOUR_TO=23
EOF
    fi
  fi

  if grep -Eq '^SESSION_ENCRYPTION_KEY_BASE64=[[:space:]]*$' "$CONFIG_PATH"; then
    local key tmp
    key=$("$NODE" -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64"))')
    tmp="$CONFIG_PATH.tmp"
    awk -v key="$key" 'BEGIN{done=0} /^SESSION_ENCRYPTION_KEY_BASE64=[[:space:]]*$/ && done==0 {print "SESSION_ENCRYPTION_KEY_BASE64=" key; done=1; next} {print}' "$CONFIG_PATH" > "$tmp"
    mv "$tmp" "$CONFIG_PATH"
  fi
}

import_settings() {
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#${line%%[![:space:]]*}}"
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac
    case "$line" in *=*) ;; *) continue ;; esac
    local name value
    name="${line%%=*}"
    value="${line#*=}"
    name="$(printf '%s' "$name" | tr -d '[:space:]')"
    if ! printf '%s' "$name" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'; then continue; fi
    if [ "${value#\"}" != "$value" ] && [ "${value%\"}" != "$value" ]; then value="${value#\"}"; value="${value%\"}"; fi
    if [ "${value#\'}" != "$value" ] && [ "${value%\'}" != "$value" ]; then value="${value#\'}"; value="${value%\'}"; fi
    export "$name=$value"
  done < "$CONFIG_PATH"
}

free_port() {
  "$NODE" -e 'const net=require("net");const s=net.createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'
}

status "Preparazione configurazione locale…"
ensure_settings
import_settings

PGPORT=$(free_port)
mkdir -p "$PGDATA"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  status "Prima inizializzazione del database locale…"
  "$PG_BIN/initdb" -D "$PGDATA" -U instara --auth=trust --encoding=UTF8 >>"$RUNTIME_LOG" 2>&1
fi

status "Avvio PostgreSQL embedded…"
"$PG_BIN/postgres" -D "$PGDATA" -h 127.0.0.1 -p "$PGPORT" >>"$LOG_ROOT/postgres.log" 2>&1 &
POSTGRES_PID=$!

for _ in $(seq 1 120); do
  if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PGPORT" -U instara >/dev/null 2>&1; then break; fi
  if ! kill -0 "$POSTGRES_PID" 2>/dev/null; then
    echo "PostgreSQL exited before becoming ready" >&2
    exit 1
  fi
  sleep 0.25
done
"$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PGPORT" -U instara >/dev/null

if [ "$("$PG_BIN/psql" -h 127.0.0.1 -p "$PGPORT" -U instara -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='instara'" | tr -d '[:space:]')" != "1" ]; then
  "$PG_BIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U instara instara
fi

export DATABASE_URL="postgresql://instara@127.0.0.1:$PGPORT/instara?schema=public"
export QUEUE_BACKEND="postgres"
export NODE_ENV="production"
export PORT="3000"
export HOSTNAME="127.0.0.1"
export PLAYWRIGHT_BROWSERS_PATH="0"
export BROWSER_PROFILE_ROOT="$BROWSER_PROFILES"
[ -x "$ADB" ] && export ADB_PATH="$ADB"
if [ -x "$PYTHON" ]; then
  export ANDROID_PYTHON="$PYTHON"
  export PYTHONHOME="$RUNTIME_ROOT/python"
fi

status "Preparazione schema Prisma…"
cd "$APP_ROOT"
"$NODE" node_modules/prisma/build/index.js db push --skip-generate >>"$RUNTIME_LOG" 2>&1

status "Preparazione coda locale…"
"$NODE" scripts/migrate-bullmq-postgres.mjs >>"$RUNTIME_LOG" 2>&1

status "Avvio dashboard e worker…"
"$NODE" node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000 >>"$LOG_ROOT/web.log" 2>&1 &
WEB_PID=$!
"$NODE" node_modules/tsx/dist/cli.mjs src/worker.ts >>"$LOG_ROOT/worker.log" 2>&1 &
WORKER_PID=$!

for _ in $(seq 1 120); do
  if /usr/bin/curl -fsS --max-time 1 "$APP_URL" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo "Next.js exited before becoming ready" >&2
    exit 1
  fi
  sleep 0.5
done
/usr/bin/curl -fsS --max-time 2 "$APP_URL" >/dev/null

READY=1
printf 'INSTARA_READY\n'

while kill -0 "$WEB_PID" 2>/dev/null && kill -0 "$WORKER_PID" 2>/dev/null; do
  sleep 1
done

exit 1
