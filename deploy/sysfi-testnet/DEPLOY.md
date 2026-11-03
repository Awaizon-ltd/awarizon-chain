# SysFi Testnet — VPS Deployment

Everything in this directory was generated from this repo (chain ID 76081,
`sysfi_testnet` spec). Files:

- `sysfi-testnet.raw.json` — the frozen genesis. Hand this to every node that
  joins this network; never regenerate it from source once real value/state
  exists on the chain (the WASM hash + genesis state root must stay fixed).
- `node-key.p2p` — this validator's stable libp2p identity
  (`12D3KooWKsRGuBkQua52McF8TtGhW9vCqGoBFCbz8fB15QydUn4j`). Treat like a
  secret; if it leaks someone can impersonate this node's peer ID (not a
  fund-custody risk, but still not public).
- `sysfi-node.service` — systemd unit.
- `Caddyfile` — reverse proxy + auto TLS for RPC.
- `setup-firewall.sh` — ufw rules.

## 1. Get the binary onto the VPS

Build once here, ship the binary — no Rust toolchain needed on the VPS:

```bash
# on this dev machine, from the repo root (already done — binary is at:)
#   target/release/sysfi-node
scp target/release/sysfi-node        user@your-vps:/tmp/
scp deploy/sysfi-testnet/*           user@your-vps:/tmp/sysfi-deploy/
```

Match glibc: build on the same OS/version as the VPS (or close to it) or the
binary won't run. If in doubt, build inside a container matching the VPS's
distro instead of copying straight from this dev environment.

## 2. On the VPS — user, directories, binary

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin sysfi
sudo mkdir -p /opt/sysfi /var/lib/sysfi-node
sudo mv /tmp/sysfi-node /opt/sysfi/sysfi-node
sudo mv /tmp/sysfi-deploy/sysfi-testnet.raw.json /opt/sysfi/
sudo mv /tmp/sysfi-deploy/node-key.p2p /opt/sysfi/
sudo chmod +x /opt/sysfi/sysfi-node
sudo chown -R sysfi:sysfi /opt/sysfi /var/lib/sysfi-node
sudo chmod 600 /opt/sysfi/node-key.p2p
```

## 3. Insert the validator's session keys — offline, no RPC involved

Do this as the `sysfi` user, straight into the keystore file, **not** via
`author_insertKey` — that needs unsafe RPC methods exposed, which the service
file below deliberately doesn't allow.

```bash
sudo -u sysfi /opt/sysfi/sysfi-node key insert \
	--base-path /var/lib/sysfi-node \
	--chain /opt/sysfi/sysfi-testnet.raw.json \
	--scheme sr25519 \
	--key-type aura \
	--suri "<the Aura secret phrase>"

sudo -u sysfi /opt/sysfi/sysfi-node key insert \
	--base-path /var/lib/sysfi-node \
	--chain /opt/sysfi/sysfi-testnet.raw.json \
	--scheme ed25519 \
	--key-type gran \
	--suri "<the Grandpa secret phrase>"
```

The two secret phrases are the ones generated earlier in this session (Aura:
public key `0x4e23295c...942d60e`, SS58 `5DqA37rT9...Q5Byyu4`; Grandpa: public
key `0x6115c0ea...78fdcfc9`, SS58 `5EFzxscrM...MQwPP66wD`) — pull them from
this conversation, don't leave them in shell history on the VPS
(`history -d` the two lines afterward, or run this from a script file you
delete immediately after).

## 4. systemd

```bash
sudo cp /tmp/sysfi-deploy/sysfi-node.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sysfi-node
sudo journalctl -u sysfi-node -f    # watch it boot / start producing blocks
```

You should see block production start (`🙌 Starting consensus session...`,
`🏆 Imported #1 ...`) since this node holds the sole genesis Aura/Grandpa
authority.

## 5. Reverse proxy (Caddy) for public RPC

```bash
sudo apt install -y caddy   # or see caddyserver.com/docs/install
sudo cp /tmp/sysfi-deploy/Caddyfile /etc/caddy/Caddyfile
# edit /etc/caddy/Caddyfile: replace rpc.sysfi-testnet.example.com with your
# real domain, pointed at this VPS's IP via an A record, before starting Caddy
sudo systemctl restart caddy
```

## 6. Firewall

```bash
sudo bash /tmp/sysfi-deploy/setup-firewall.sh
```

## 6b. Once you know the VPS's public IP

`sysfi-testnet.raw.json` ships with an empty `bootNodes` list (a stray
`127.0.0.1` entry from spec generation was stripped — meaningless for anyone
joining over the internet). Once this node is up and you know its public IP,
either:

- add `"/ip4/<VPS_IP>/tcp/30333/p2p/12D3KooWKsRGuBkQua52McF8TtGhW9vCqGoBFCbz8fB15QydUn4j"`
  to `bootNodes` in the JSON and redistribute it to anyone else running a node, or
- just have them pass `--bootnodes /ip4/<VPS_IP>/tcp/30333/p2p/12D3KooW...` on
  their own command line instead.

## 7. Verify from your own machine

```bash
curl -s -H 'content-type: application/json' \
	-d '{"id":1,"jsonrpc":"2.0","method":"eth_chainId","params":[]}' \
	https://rpc.sysfi-testnet.example.com
# expect {"jsonrpc":"2.0","id":1,"result":"0x12931"}   (76081)

curl -s -H 'content-type: application/json' \
	-d '{"id":1,"jsonrpc":"2.0","method":"eth_blockNumber","params":[]}' \
	https://rpc.sysfi-testnet.example.com
# should be climbing over repeated calls
```

Add the network to MetaMask: RPC URL `https://rpc.sysfi-testnet.example.com`,
chain ID `76081`, currency symbol `SYN`.

## Known-good state at genesis (already verified on a local test run)

- Faucet `0x307CD508739673128fBf25a2ECB350cEff2d9b4D`: 10,000,000 tSYN
- Sudo `0x1CB4bF15ae435C447391a023fD1a375959166e6A`: 10,000 tSYN
- 5 vesting contracts (code + storage + balance) — see the main conversation
  for the full address/beneficiary/schedule table.

## Not done yet / explicitly deferred

- A second node (this is a single-validator testnet for now — fine to start,
  but there's no fault tolerance until a second Aura/Grandpa authority joins).
- Telemetry, Grafana dashboards, a block explorer.
- Backups of `/var/lib/sysfi-node` — plan for this once there's real testnet
  activity worth not losing.
