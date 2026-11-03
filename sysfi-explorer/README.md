# SysFi Explorer

A basic EVM-style block explorer for SysFi (chain ID 76081 testnet). Vite +
React + TypeScript + Tailwind, talking directly to the chain's own JSON-RPC
via `ethers` — no backend, no indexer yet.

## What it does

- Home: live stat strip (block height, block time, gas price, chain ID),
  latest blocks, latest transactions
- Block / transaction / address detail pages
- Search bar (block number, tx hash, address — disambiguates hash vs block
  hash automatically)
- Light/dark theme (green accent), persisted, no flash on load
- "Add to MetaMask" button, fixed to the bottom of the viewport

## Known limitation (by design, for v1)

Per-address transaction history isn't implemented — there's no way to ask a
plain JSON-RPC node "give me every tx for this address," only "give me this
block" or "give me this specific tx/hash." A real history view needs an
indexer (`eth_getLogs`-based scanning at minimum, ideally a proper indexer
service). The address page says so explicitly rather than faking it.

## Setup

```bash
npm install
cp .env.example .env   # already pointed at rpc-endpoint.sysfi.network
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally to sanity-check it
```

## Deploying

`dist/` is a static site — no server-side code. Drop it behind the same
Caddy instance already fronting the RPC (a second site block), or any static
host (Vercel/Netlify/Cloudflare Pages/S3+CDN/nginx). If you add it to the
existing VPS's Caddy, something like:

```
explorer.sysfi.network {
	root * /var/www/sysfi-explorer/dist
	try_files {path} /index.html   # client-side routing
	file_server
}
```

The RPC URL is baked in at build time from `.env` (`VITE_*` vars) — rebuild
if it ever changes.
