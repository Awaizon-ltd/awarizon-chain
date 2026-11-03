import { parseEther } from 'ethers'
import { cooldownRemaining, hashIp, isIpOverLimit, reserveClaim, finalizeClaim, releaseClaim } from '@/lib/db'
import { isValidAddress } from '@/lib/format'
import { getFaucetWallet, withNonceLock } from '@/lib/serverChain'

const CLAIM_AMOUNT = process.env.NEXT_PUBLIC_CLAIM_AMOUNT ?? '1'

function clientIp(request: Request): string {
	const forwarded = request.headers.get('x-forwarded-for')
	if (forwarded) return forwarded.split(',')[0].trim()
	return request.headers.get('x-real-ip') ?? 'unknown'
}

function formatCooldown(ms: number): string {
	// Round to whole minutes first, then derive hours/minutes from that —
	// rounding each independently can carry a stray "60m" into the wrong bucket
	// (e.g. 23h 59.99m -> "23h" floor + "60m" ceil instead of rolling to 24h).
	const totalMinutes = Math.max(1, Math.ceil(ms / (60 * 1000)))
	const hours = Math.floor(totalMinutes / 60)
	const minutes = totalMinutes % 60
	if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
	return `${minutes}m`
}

export async function POST(request: Request) {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: 'Invalid request body' }, { status: 400 })
	}

	const bodyObj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
	const address = typeof bodyObj.address === 'string' ? bodyObj.address : ''
	const xHandle = typeof bodyObj.xHandle === 'string' && bodyObj.xHandle.trim() ? bodyObj.xHandle.trim().replace(/^@/, '') : null

	if (!isValidAddress(address)) {
		return Response.json({ error: 'Enter a valid address (0x followed by 40 hex characters).' }, { status: 400 })
	}

	// Cheap pre-check — the real, race-proof guard is reserveClaim() below.
	const remaining = cooldownRemaining(address)
	if (remaining > 0) {
		return Response.json({ error: `This address already claimed recently. Try again in ${formatCooldown(remaining)}.` }, { status: 429 })
	}

	const ipHash = hashIp(clientIp(request))
	if (isIpOverLimit(ipHash)) {
		return Response.json({ error: 'Too many claims from your network today. Try again tomorrow.' }, { status: 429 })
	}

	if (!reserveClaim(address)) {
		return Response.json({ error: 'A claim for this address is already in progress or on cooldown.' }, { status: 429 })
	}

	try {
		const txHash = await withNonceLock(async (nonce) => {
			const tx = await getFaucetWallet().sendTransaction({
				to: address,
				value: parseEther(CLAIM_AMOUNT),
				nonce,
			})
			return tx.hash
		})

		finalizeClaim(address, ipHash, xHandle, txHash)
		return Response.json({ txHash, amount: CLAIM_AMOUNT })
	} catch (err) {
		releaseClaim(address)
		console.error('[faucet claim failed]', err)
		return Response.json({ error: 'Failed to send transaction. Please try again in a moment.' }, { status: 502 })
	}
}
