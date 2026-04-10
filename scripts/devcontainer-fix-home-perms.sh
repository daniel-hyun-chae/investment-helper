#!/usr/bin/env bash
set -euo pipefail

REMOTE_USER="${REMOTE_USER:-node}"
HOME_DIR="/home/${REMOTE_USER}"

echo "[devcontainer] Ensuring home runtime directories for ${REMOTE_USER}"

sudo mkdir -p \
  "${HOME_DIR}/.cache" \
  "${HOME_DIR}/.cache/ms-playwright" \
  "${HOME_DIR}/.local/share/opencode" \
  "${HOME_DIR}/.local/state/opencode" \
  "${HOME_DIR}/.local/share/uv/tools"

sudo chown -R "${REMOTE_USER}:${REMOTE_USER}" "${HOME_DIR}/.cache" "${HOME_DIR}/.local"

echo "[devcontainer] Home permissions are consistent"
