#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${WORKER_PID:-}" ]]; then
    kill "$WORKER_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

pnpm dev:worker > /tmp/investment-helper-worker.log 2>&1 &
WORKER_PID=$!

pnpm dev:web > /tmp/investment-helper-web.log 2>&1 &
WEB_PID=$!

for _ in {1..60}; do
  if curl -sS "http://127.0.0.1:8787/health" >/dev/null 2>&1 && curl -sS "http://127.0.0.1:3000/companies" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

pnpm e2e:local
