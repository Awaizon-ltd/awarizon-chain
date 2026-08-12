import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/db'
import type { ValidatorApplication } from '../../../types'

// Persistence only — the operator-facing notification for a new
// application is sent client-side via EmailJS (see managed/apply/page.tsx),
// same pattern as developer/src/components/marketing/GrantForm.tsx. This
// route's job is just to keep a durable record in Mongo regardless of
// whether that email send succeeds.
export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<ValidatorApplication>

  if (!body.name || !body.email || !body.wallet) {
    return NextResponse.json(
      { error: 'name, email, and wallet are required' },
      { status: 400 }
    )
  }

  try {
    const db = await getDb()
    await db.collection('applications').insertOne({
      name: body.name,
      email: body.email,
      wallet: body.wallet,
      country: body.country ?? '',
      experience: body.experience ?? '',
      reason: body.reason ?? '',
      status: 'pending',
      createdAt: new Date(),
    })
  } catch (err: any) {
    // Don't fail the applicant's submission over a missing MONGODB_URI in
    // local dev — log it so the operator notices, but still confirm.
    console.error('Failed to persist validator application:', err.message)
  }

  return NextResponse.json({ success: true })
}
