#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/tmp/investment-helper-e2e"
WORKER_LOG="$LOG_DIR/worker.log"
WEB_LOG="$LOG_DIR/web.log"
SUPABASE_STATUS_LOG="$LOG_DIR/supabase-status.log"

pick_free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

mkdir -p "$LOG_DIR"

STACK_READY=0
STARTED_SUPABASE=0
WORKER_PORT="${E2E_WORKER_PORT:-$(pick_free_port)}"
WEB_PORT="${E2E_WEB_PORT:-$(pick_free_port)}"

if [[ "$WEB_PORT" == "$WORKER_PORT" ]]; then
  WEB_PORT="$(pick_free_port)"
fi

WORKER_BASE_URL="http://127.0.0.1:${WORKER_PORT}"
WEB_BASE_URL="http://127.0.0.1:${WEB_PORT}"

ensure_port_free() {
  local port="$1"
  local name="$2"
  local pids

  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  echo "[e2e] Port $port for $name is already in use. Stopping existing process(es): $pids"
  kill $pids >/dev/null 2>&1 || true
  sleep 1

  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[e2e] Forcing process stop on port $port: $pids"
    kill -9 $pids >/dev/null 2>&1 || true
    sleep 1
  fi

  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[e2e] Unable to free port $port for $name. Remaining PID(s): $pids"
    return 1
  fi
}

wait_for_url() {
  local url="$1"
  local attempts="$2"
  local name="$3"

  for ((i=1; i<=attempts; i+=1)); do
    if curl -sS --max-time 2 "$url" >/dev/null 2>&1; then
      echo "[e2e] $name is ready ($url)"
      return 0
    fi
    sleep 1
  done

  echo "[e2e] Timed out waiting for $name at $url"
  return 1
}

cleanup() {
  echo "[e2e] Cleaning up local processes"

  if [[ -n "${WEB_PID:-}" ]]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${WORKER_PID:-}" ]]; then
    kill "$WORKER_PID" >/dev/null 2>&1 || true
  fi

  pkill -f "wrangler dev --local --port ${WORKER_PORT}" >/dev/null 2>&1 || true
  pkill -f "vite dev --host 127.0.0.1 --port ${WEB_PORT}" >/dev/null 2>&1 || true

  if [[ "$STARTED_SUPABASE" -eq 1 ]]; then
    pnpm supabase:stop >/dev/null 2>&1 || true
  fi

  if [[ "$STACK_READY" -ne 1 ]]; then
    echo "[e2e] stack failed to become ready. worker log: $WORKER_LOG"
    echo "[e2e] stack failed to become ready. web log: $WEB_LOG"
    [[ -f "$WORKER_LOG" ]] && sed -n '1,220p' "$WORKER_LOG" || true
    [[ -f "$WEB_LOG" ]] && sed -n '1,220p' "$WEB_LOG" || true
  fi
}

trap cleanup EXIT

echo "[e2e] Checking local Supabase status"
if ! pnpm supabase:status >"$SUPABASE_STATUS_LOG" 2>&1; then
  echo "[e2e] Local Supabase not running; starting it"
  pnpm supabase:start >/dev/null
  STARTED_SUPABASE=1
fi

echo "[e2e] Generating local env files"
pnpm dev:configure-local-env

echo "[e2e] Ensuring Playwright browser is installed"
pnpm e2e:install-browsers >/dev/null

ensure_port_free "$WORKER_PORT" "worker"
ensure_port_free "$WEB_PORT" "web"

echo "[e2e] Worker base URL: $WORKER_BASE_URL"
echo "[e2e] Web base URL: $WEB_BASE_URL"

echo "[e2e] Starting worker"
pnpm -C apps/bot-worker exec wrangler dev --local --port "$WORKER_PORT" >"$WORKER_LOG" 2>&1 &
WORKER_PID=$!

echo "[e2e] Starting web"
VITE_API_BASE_URL="$WORKER_BASE_URL" pnpm -C apps/admin-web exec vite dev --host 127.0.0.1 --port "$WEB_PORT" --strictPort >"$WEB_LOG" 2>&1 &
WEB_PID=$!

wait_for_url "$WORKER_BASE_URL/health" 120 "worker"
wait_for_url "$WEB_BASE_URL/companies" 120 "web"

STACK_READY=1

echo "[e2e] Running Playwright tests"
E2E_BASE_URL="$WEB_BASE_URL" E2E_WORKER_BASE_URL="$WORKER_BASE_URL" pnpm e2e:local
