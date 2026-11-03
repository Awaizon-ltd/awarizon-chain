#!/usr/bin/env bash
# Run this from a machine that has SSH access to the VPS
# (this build environment does not — publickey/password auth
# both failed when tested here).
#
# Usage: bash deploy/deploy.sh
set -euo pipefail

VPS_HOST="root@31.97.58.198"
REMOTE_DIR="/home/faucet/awarizon-faucet"

cd "$(dirname "$0")/.."

echo "==> Building locally"
npm run build

echo "==> Creating remote directory"
ssh "$VPS_HOST" "mkdir -p $REMOTE_DIR"

echo "==> Copying build output + config"
scp -r \
  .next \
  public \
  package.json \
  package-lock.json \
  next.config.js \
  ecosystem.config.js \
  scripts/init-db.js \
  "$VPS_HOST:$REMOTE_DIR/"

echo "==> Copying Traefik dynamic config"
scp deploy/awarizon-faucet.yaml \
  "$VPS_HOST:/data/coolify/proxy/dynamic/awarizon-faucet.yaml"

echo "==> Installing prod deps, writing env, running DB init, starting PM2"
# NOTE: replace REPLACE_WITH_YOUR_SITE_KEY / REPLACE_WITH_YOUR_SECRET_KEY
# with real reCAPTCHA keys before running this.
ssh "$VPS_HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /home/faucet/awarizon-faucet

npm install --production

cat > .env.production.local << 'ENVEOF'
FAUCET_MNEMONIC=bottom drive obey lake curtain smoke basket hold race lonely fit walk//Bob
NEXT_PUBLIC_RPC_ENDPOINT=wss://rpc.awarizon.com
DATABASE_URL=postgresql://postgres:kBMvZvVIJz10xACkyU0Teqix8t1eUhBq2V90kOlYoWytguqyRyVwnJrPf5OhUZ11@31.97.58.198:5441/postgres
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=REPLACE_WITH_YOUR_SITE_KEY
RECAPTCHA_SECRET_KEY=REPLACE_WITH_YOUR_SECRET_KEY
NEXT_PUBLIC_FAUCET_AMOUNT=10
NEXT_PUBLIC_LIFETIME_CAP=100
PORT=3035
NODE_ENV=production
ENVEOF

cp .env.production.local .env.local
node scripts/init-db.js
rm .env.local

pm2 start ecosystem.config.js
pm2 save
pm2 status
REMOTE

echo "==> Opening firewall port 3035"
ssh "$VPS_HOST" 'ufw allow 3035/tcp && ufw status'

echo "==> Verifying"
ssh "$VPS_HOST" 'curl -s http://localhost:3035/api/status'

echo "==> Done. Add DNS A record: faucet -> 31.97.58.198 (not automated by this script)."
