import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyCaptcha } from '@/lib/captcha'
import { sendRiz } from '@/lib/chain'
import {
  isValidSubstrateAddress,
  isRizName,
  sanitizeInput,
} from '@/lib/validate'

const AMOUNT_PLANCK = 10_000_000_000_000n
const LIFETIME_CAP = 100_000_000_000_000n

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address: raw, captchaToken } = body

    if (!raw || !captchaToken) {
      return NextResponse.json(
        { error: 'Address and captcha required' },
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

    // Verify captcha server-side
    const ip =
      req.headers.get('x-forwarded-for')
      ?? req.headers.get('x-real-ip')
      ?? undefined

    const valid = await verifyCaptcha(
      captchaToken,
      ip ?? undefined
    )

    if (!valid) {
      return NextResponse.json(
        { error: 'Captcha verification failed' },
        { status: 400 }
      )
    }

    // Check lifetime cap
    const capCheck = await pool.query(
      `SELECT COALESCE(SUM(amount_planck), 0)
         AS total_sent
       FROM faucet_requests
       WHERE address = $1
         AND status = 'success'`,
      [address]
    )

    const totalSent = BigInt(
      capCheck.rows[0].total_sent ?? '0'
    )

    if (totalSent >= LIFETIME_CAP) {
      return NextResponse.json(
        {
          error:
            'Lifetime limit reached. ' +
            'This address has already received ' +
            '100 RIZ.',
          totalReceived: (
            Number(totalSent) / 1e12
          ).toFixed(2),
        },
        { status: 429 }
      )
    }

    // Calculate send amount
    // (may be less than 10 if near cap)
    const remaining = LIFETIME_CAP - totalSent
    const sendAmount =
      remaining < AMOUNT_PLANCK
        ? remaining
        : AMOUNT_PLANCK

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
      const newRemaining =
        LIFETIME_CAP - totalSent - sendAmount

      return NextResponse.json({
        success: true,
        txHash,
        amount: amountRiz.toFixed(2),
        address,
        remaining: (
          Number(newRemaining) / 1e12
        ).toFixed(2),
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
