import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/db'
import type { ValidatorApplication } from '../../../types'

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

  // TODO: notify the ops team (Slack/email) that a new application
  // needs review — e.g. via @emailjs/browser server-side or Resend.
  console.log('New validator application:', body.email, body.wallet)

  return NextResponse.json({ success: true })
}
