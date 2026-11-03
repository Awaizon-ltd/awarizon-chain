import 'server-only'
import { JsonRpcProvider, Wallet } from 'ethers'

// `server-only` above makes Next.js throw a build error if anything client-side
// ever imports this file — the private key must never reach a browser bundle.

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 76081)

function requireEnv(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`${name} is not set — see .env.example`)
	return value
}

// Provider/wallet are built lazily, on first actual use, rather than at
// module-evaluation time. `next build` statically imports every route module
// (including this one, transitively) to collect page data — it never calls
// the handlers — and deployment platforms (Coolify, etc.) typically only
// inject real secrets into the running container, not the build step. Eager
// construction here made every build fail before a single request ever came
// in; env vars are only actually needed once a claim is served.
let _serverProvider: JsonRpcProvider | null = null
export function getServerProvider(): JsonRpcProvider {
	if (!_serverProvider) {
		_serverProvider = new JsonRpcProvider(requireEnv('RPC_URL'), {
			chainId: CHAIN_ID,
			name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'SysFi Testnet',
		})
	}
	return _serverProvider
}

let _faucetWallet: Wallet | null = null
export function getFaucetWallet(): Wallet {
	if (!_faucetWallet) {
		_faucetWallet = new Wallet(requireEnv('FAUCET_PRIVATE_KEY'), getServerProvider())
	}
	return _faucetWallet
}

/**
 * Local nonce tracking rather than trusting the node's "pending" count on
 * every send: initialized once from the chain, then incremented in-process
 * after each successful broadcast. Combined with `withNonceLock` below, this
 * is what keeps two concurrent claims from racing for the same nonce.
 */
let nextNoncePromise: Promise<number> | null = null
async function getNextNonce(): Promise<number> {
	if (nextNoncePromise === null) {
		nextNoncePromise = getServerProvider().getTransactionCount(getFaucetWallet().address, 'pending')
	}
	return nextNoncePromise
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Serializes every send through the faucet wallet. Each call waits for the
 * previous one to finish determining (and locally advancing) the nonce
 * before it starts — the actual broadcast/confirmation can still happen
 * concurrently, only the nonce bookkeeping is serialized.
 */
export function withNonceLock<T>(fn: (nonce: number) => Promise<T>): Promise<T> {
	const run = queue.then(async () => {
		const nonce = await getNextNonce()
		try {
			const result = await fn(nonce)
			nextNoncePromise = Promise.resolve(nonce + 1)
			return result
		} catch (err) {
			// Nonce wasn't consumed (send failed before broadcast) — don't advance it.
			nextNoncePromise = Promise.resolve(nonce)
			throw err
		}
	})
	// Keep the queue alive even if this particular call rejects.
	queue = run.catch(() => undefined)
	return run
}
