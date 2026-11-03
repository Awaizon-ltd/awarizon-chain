export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendRiz } from '@/lib/chain'
import {
  isValidSubstrateAddress,
  isRizName,
  sanitizeInput,
} from '@/lib/validate'

// One-time claim: each address may claim exactly once, ever — no captcha,
// no daily cooldown. See faucet_requests.status='success' as the sole
// record of whether an address has already claimed.
const AMOUNT_PLANCK = 10_000_000_000_000n // 10 RIZ

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address: raw } = body

    if (!raw) {
      return NextResponse.json(
        { error: 'Address required' },
        { status: 400 }
      )
    }

    const address = sanitizeInput(raw)

    if (
      !isValidSubstrateAddress(address) &&
      !isRizName(address)
    ) {
      return NextResponse.json(
        { error: 'Invalid Awarizon address or .riz name' },
        { status: 400 }
      )
    }

    const ip =
      req.headers.get('x-forwarded-for')
      ?? req.headers.get('x-real-ip')
      ?? undefined

    // Has this address already claimed? One successful claim, ever.
    const capCheck = await pool.query(
      `SELECT 1
       FROM faucet_requests
       WHERE address = $1
         AND status = 'success'
       LIMIT 1`,
      [address]
    )

    if (capCheck.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            'This address has already claimed its ' +
            'one-time RIZ allocation.',
        },
        { status: 429 }
      )
    }

    const sendAmount = AMOUNT_PLANCK

    // Record pending
    const insert = await pool.query(
      `INSERT INTO faucet_requests
         (address, amount_planck, ip_address, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [address, sendAmount.toString(), ip]
    )
    const requestId = insert.rows[0].id

    // Send RIZ
    try {
      const { txHash } = await sendRiz(
        address,
        sendAmount
      )

      await pool.query(
        `UPDATE faucet_requests
         SET status = 'success', tx_hash = $1
         WHERE id = $2`,
        [txHash, requestId]
      )

      await pool.query(
        `UPDATE faucet_stats
         SET
           total_requests = total_requests + 1,
           total_riz_sent = total_riz_sent + $1,
           updated_at = NOW()
         WHERE id = 1`,
        [sendAmount.toString()]
      )

      const amountRiz = Number(sendAmount) / 1e12

      return NextResponse.json({
        success: true,
        txHash,
        amount: amountRiz.toFixed(2),
        address,
        // One-time claim — this address has none left, always.
        remaining: '0.00',
        message: `${amountRiz} RIZ sent successfully`,
      })
    } catch (chainErr) {
      const errMsg =
        chainErr instanceof Error
          ? chainErr.message
          : 'Chain error'

      await pool.query(
        `UPDATE faucet_requests
         SET status = 'failed', error_message = $1
         WHERE id = $2`,
        [errMsg, requestId]
      )

      return NextResponse.json(
        { error: 'Failed to send RIZ: ' + errMsg },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('Faucet error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
