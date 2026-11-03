import 'server-only'
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DB_PATH = process.env.DATABASE_PATH ?? './data/faucet.db'
const SALT = process.env.IP_HASH_SALT ?? ''

mkdirSync(dirname(DB_PATH), { recursive: true })

// node's built-in SQLite (stable, no flag needed since Node 22.13 — this repo
// targets Node 22.18+) instead of better-sqlite3: some hosts (e.g. Hostinger
// shared hosting) ship a system python3 too old for node-gyp's bundled gyp
// (needs 3.8+ for the walrus operator), which makes better-sqlite3's native
// build fail with no way to fix it from inside the app. node:sqlite ships
// compiled into the node binary itself, so there's nothing to build.
const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')

// `claims` is an append-only history log — one row per successful claim
// event, not one row per address — since an address can claim repeatedly
// (every COOLDOWN_MS). This also makes the per-IP rate limit and the
// `totalClaims()` stat correct: they just count rows in a window instead of
// needing separate bookkeeping.
db.exec(`
	CREATE TABLE IF NOT EXISTS claims (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		address TEXT NOT NULL,
		ip_hash TEXT NOT NULL,
		tx_hash TEXT NOT NULL,
		x_handle TEXT,
		claimed_at INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_claims_address ON claims (address, claimed_at);
	CREATE INDEX IF NOT EXISTS idx_claims_ip_hash ON claims (ip_hash, claimed_at);
`)

// Pure concurrency lock, separate from history — "is a claim currently being
// processed for this address". Deliberately its own table: `claims` only
// ever gets a row once a send actually succeeds, so a failed attempt never
// pollutes claim history or shifts anyone's cooldown.
db.exec(`
	CREATE TABLE IF NOT EXISTS reservations (
		address TEXT PRIMARY KEY,
		reserved_at INTEGER NOT NULL
	);
`)

export function hashIp(ip: string): string {
	return createHash('sha256').update(`${SALT}:${ip}`).digest('hex')
}

export const COOLDOWN_MS = 24 * 60 * 60 * 1000
// A reservation older than this is assumed abandoned (server crashed mid-send,
// etc.) and can be reclaimed rather than permanently blocking the address.
const STALE_RESERVATION_MS = 2 * 60 * 1000

/** ms until this address can claim again, or 0 if it can claim right now. */
export function cooldownRemaining(address: string): number {
	const row = db
		.prepare('SELECT MAX(claimed_at) as last FROM claims WHERE address = ?')
		.get(address.toLowerCase()) as { last: number | null }
	if (!row.last) return 0
	const remaining = row.last + COOLDOWN_MS - Date.now()
	return remaining > 0 ? remaining : 0
}

const IP_WINDOW_MS = 24 * 60 * 60 * 1000
const IP_MAX_CLAIMS_PER_WINDOW = 5

export function ipClaimsInWindow(ipHash: string): number {
	const since = Date.now() - IP_WINDOW_MS
	const row = db
		.prepare('SELECT COUNT(*) as count FROM claims WHERE ip_hash = ? AND claimed_at > ?')
		.get(ipHash, since) as { count: number }
	return row.count
}

export function isIpOverLimit(ipHash: string): boolean {
	return ipClaimsInWindow(ipHash) >= IP_MAX_CLAIMS_PER_WINDOW
}

/**
 * Atomically acquires the per-address claim lock, but only if the address is
 * actually off cooldown right now — closes the same race the cheap
 * `cooldownRemaining` pre-check can't: two requests landing at once could
 * both see "off cooldown", then race here, and only one should win.
 */
export function reserveClaim(address: string): boolean {
	const addr = address.toLowerCase()
	if (cooldownRemaining(addr) > 0) return false

	const now = Date.now()
	const result = db
		.prepare(
			`INSERT INTO reservations (address, reserved_at) VALUES (?, ?)
			 ON CONFLICT(address) DO UPDATE SET reserved_at = excluded.reserved_at
			 WHERE reserved_at <= ?`,
		)
		.run(addr, now, now - STALE_RESERVATION_MS)
	return result.changes > 0
}

export function finalizeClaim(address: string, ipHash: string, xHandle: string | null, txHash: string): void {
	const addr = address.toLowerCase()
	db.prepare('INSERT INTO claims (address, ip_hash, tx_hash, x_handle, claimed_at) VALUES (?, ?, ?, ?, ?)').run(
		addr,
		ipHash,
		txHash,
		xHandle,
		Date.now(),
	)
	db.prepare('DELETE FROM reservations WHERE address = ?').run(addr)
}

/** Send failed after the lock was acquired — release it without touching claim history, so the cooldown is unaffected and they can retry immediately. */
export function releaseClaim(address: string): void {
	db.prepare('DELETE FROM reservations WHERE address = ?').run(address.toLowerCase())
}

export function totalClaims(): number {
	const row = db.prepare('SELECT COUNT(*) as count FROM claims').get() as { count: number }
	return row.count
}
