#!/usr/bin/env bash
# Minimal firewall for a SysFi testnet VPS: SSH, P2P (30333) open to the
# world; RPC (9944) and Prometheus (9615) stay local-only (Caddy fronts RPC
# on 443 instead — see Caddyfile). Run as root.
set -euo pipefail

ufw default deny incoming
ufw default allow outgoing

ufw allow OpenSSH
ufw allow 30333/tcp comment 'SysFi P2P'
ufw allow 80/tcp comment 'Caddy ACME HTTP-01 challenge'
ufw allow 443/tcp comment 'Caddy HTTPS (fronts RPC)'
ufw allow 443/udp comment 'Caddy HTTP/3'

# Explicitly NOT opened: 9944 (RPC), 9615 (Prometheus) — reachable only from
# localhost, which is all Caddy/your own monitoring needs.

ufw --force enable
ufw status verbose
