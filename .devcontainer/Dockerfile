ARG BASE_IMAGE=mcr.microsoft.com/devcontainers/javascript-node:20
FROM ${BASE_IMAGE}

ARG REMOTE_USER=node

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    jq \
    postgresql-client \
    redis-tools \
  && rm -rf /var/lib/apt/lists/*

ARG CA_CERT_FILE=.devcontainer/certs/Koerber_root_CA.crt
COPY ${CA_CERT_FILE} /usr/share/ca-certificates/Koerber_root_CA.crt
RUN echo "Koerber_root_CA.crt" >> /etc/ca-certificates.conf && update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/usr/share/ca-certificates/Koerber_root_CA.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# OpenCode CLI (Layer 1 of 2): baked into image
RUN set -eux; \
  if curl -fsSL https://opencode.ai/install | bash; then \
    echo "[devcontainer] OpenCode bootstrap install succeeded"; \
  else \
    echo "[devcontainer] Warning: OpenCode bootstrap install failed; postCreate installer will retry"; \
  fi; \
  if [ ! -x /usr/local/bin/opencode ]; then \
    if [ -x /root/.opencode/bin/opencode ]; then \
      ln -sf /root/.opencode/bin/opencode /usr/local/bin/opencode; \
    fi; \
  fi; \
  opencode --version || true

RUN mkdir -p /home/${REMOTE_USER}/.cache \
    /home/${REMOTE_USER}/.cache/ms-playwright \
    /home/${REMOTE_USER}/.local/share/opencode \
    /home/${REMOTE_USER}/.local/state/opencode \
    /home/${REMOTE_USER}/.local/share/uv/tools \
  && chown -R ${REMOTE_USER}:${REMOTE_USER} /home/${REMOTE_USER}/.cache /home/${REMOTE_USER}/.local

USER ${REMOTE_USER}
WORKDIR /workspaces/workspace/project
