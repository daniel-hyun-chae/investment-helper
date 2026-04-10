#!/usr/bin/env sh
set -e

echo "[devcontainer] Checking OpenCode installation"

if command -v opencode >/dev/null 2>&1; then
  echo "[devcontainer] OpenCode already available on PATH"
  exit 0
fi

mkdir -p "$HOME/.local/share/opencode"

if [ -n "${OPENCODE_CA_CERT:-}" ] && [ -f "${OPENCODE_CA_CERT}" ]; then
  export SSL_CERT_FILE="${OPENCODE_CA_CERT}"
  export CURL_CA_BUNDLE="${OPENCODE_CA_CERT}"
  export NODE_EXTRA_CA_CERTS="${OPENCODE_CA_CERT}"
fi

if [ -f "$HOME/.config/opencode/ca-certificates.crt" ]; then
  export SSL_CERT_FILE="$HOME/.config/opencode/ca-certificates.crt"
  export CURL_CA_BUNDLE="$HOME/.config/opencode/ca-certificates.crt"
  export NODE_EXTRA_CA_CERTS="$HOME/.config/opencode/ca-certificates.crt"
fi

if curl -fsSL https://opencode.ai/install | sh; then
  :
else
  echo "[devcontainer] curl install failed, trying npm fallback"
  export NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-$HOME/.npm-global}"
  mkdir -p "$NPM_CONFIG_PREFIX"
  if npm install -g opencode-ai >/dev/null 2>&1; then
    export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
  fi
fi

if command -v opencode >/dev/null 2>&1; then
  echo "[devcontainer] OpenCode installed successfully"
  exit 0
fi

if [ -x "$HOME/.opencode/bin/opencode" ]; then
  echo "[devcontainer] OpenCode available at $HOME/.opencode/bin/opencode"
  exit 0
fi

echo "[devcontainer] Warning: OpenCode install not verified. Continuing startup."
exit 0
