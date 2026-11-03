export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getFaucetBalance } from '@/lib/chain'

export async function GET() {
  try {
    const [statsRes, recentRes, balance] =
      await Promise.all([
        pool.query(
          `SELECT total_requests, total_riz_sent
           FROM faucet_stats WHERE id = 1`
        ),
        pool.query(
          `SELECT address, amount_planck,
                  tx_hash, created_at
           FROM faucet_requests
           WHERE status = 'success'
           ORDER BY created_at DESC
           LIMIT 10`
        ),
        getFaucetBalance(),
      ])

    const stats = statsRes.rows[0]

    return NextResponse.json({
      totalRequests: stats?.total_requests ?? 0,
      totalRizSent: (
        Number(stats?.total_riz_sent ?? 0) / 1e12
      ).toFixed(2),
      faucetBalance: balance,
      recentRequests: recentRes.rows.map(r => ({
        address: r.address,
        amount: (
          Number(r.amount_planck) / 1e12
        ).toFixed(2),
        txHash: r.tx_hash,
        createdAt: r.created_at,
      })),
      online: true,
    })
  } catch (err) {
    console.error('Status error:', err)
    return NextResponse.json(
      { online: false, error: 'Failed' },
      { status: 500 }
    )
  }
}

export const revalidate = 30
