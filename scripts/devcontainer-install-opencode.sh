#!/usr/bin/env sh
set -e

echo "[devcontainer] Checking OpenCode installation"

mkdir -p "$HOME/.local/share/opencode"

export PATH="$HOME/.opencode/bin:$HOME/.npm-global/bin:$PATH"

if command -v opencode >/dev/null 2>&1; then
  opencode --version || true
  exit 0
fi

INSTALL_URL="https://opencode.ai/install"
CA_CERT_DEFAULT="$HOME/.config/opencode/ca-certificates.crt"
CA_CERT_SYSTEM="/etc/ssl/certs/ca-certificates.crt"
CA_CERT="${OPENCODE_CA_CERT:-$CA_CERT_DEFAULT}"
INSECURE="${OPENCODE_INSTALL_INSECURE:-0}"

export NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-$HOME/.npm-global}"
mkdir -p "$NPM_CONFIG_PREFIX"

if [ -f "$CA_CERT" ]; then
  export NODE_EXTRA_CA_CERTS="$CA_CERT"
  export SSL_CERT_FILE="$CA_CERT"
  export CURL_CA_BUNDLE="$CA_CERT"
elif [ -f "$CA_CERT_SYSTEM" ]; then
  export NODE_EXTRA_CA_CERTS="$CA_CERT_SYSTEM"
  export SSL_CERT_FILE="$CA_CERT_SYSTEM"
  export CURL_CA_BUNDLE="$CA_CERT_SYSTEM"
fi

install_with_curl() {
  if [ "$INSECURE" = "1" ]; then
    curl -k -fsSL "$INSTALL_URL" | bash
    return
  fi

  if [ -n "${CURL_CA_BUNDLE:-}" ] && [ -f "${CURL_CA_BUNDLE}" ]; then
    curl --cacert "$CURL_CA_BUNDLE" -fsSL "$INSTALL_URL" | bash
    return
  fi

  curl -fsSL "$INSTALL_URL" | bash
}

if install_with_curl; then
  if command -v opencode >/dev/null 2>&1; then
    opencode --version || true
    exit 0
  fi
fi

echo "[devcontainer] OpenCode install via curl failed; trying npm fallback"

if [ "$INSECURE" = "1" ]; then
  npm config set strict-ssl false
fi

if npm install -g opencode-ai >/dev/null 2>&1; then
  if command -v opencode >/dev/null 2>&1; then
    opencode --version || true
    exit 0
  fi
fi

if [ -x "$HOME/.opencode/bin/opencode" ]; then
  echo "[devcontainer] OpenCode available at $HOME/.opencode/bin/opencode"
  exit 0
fi

echo "[devcontainer] Warning: OpenCode install not verified. Continuing startup."
echo "[devcontainer] If behind proxy, set OPENCODE_CA_CERT or OPENCODE_INSTALL_INSECURE=1."
exit 0
