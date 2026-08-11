import { NextRequest, NextResponse } from 'next/server'
import { Wallet, isAddress } from 'awarizon.js'
import { getDb } from '../../../lib/db'
import { RPC_ENDPOINT } from '../../../lib/constants'
import type { ManagedSlot } from '../../../types'

export async function POST(req: NextRequest) {
  const { code, rewardWallet } = await req.json() as {
    code?: string
    rewardWallet?: string
  }

  if (!code || !rewardWallet) {
    return NextResponse.json(
      { error: 'code and rewardWallet are required' },
      { status: 400 }
    )
  }
  if (!isAddress(rewardWallet)) {
    return NextResponse.json(
      { error: 'rewardWallet is not a valid Awarizon address' },
      { status: 400 }
    )
  }

  let slot: ManagedSlot | null
  try {
    slot = await verifyCode(code)
  } catch (err: any) {
    return NextResponse.json(
      { error: `Database error: ${err.message}` },
      { status: 500 }
    )
  }
  if (!slot) {
    return NextResponse.json(
      { error: 'Invalid or already-used activation code' },
      { status: 400 }
    )
  }

  try {
    // Load THIS managed slot's own validator key — stored server-side
    // only, never sent to the browser. The customer's wallet never
    // signs anything here; the node's own key sets them as the reward
    // destination on its behalf.
    const mnemonic = process.env[`VALIDATOR_${slot.id}_MNEMONIC`]
    if (!mnemonic) {
      throw new Error(`Validator key not configured for slot ${slot.id}`)
    }

    const wallet = await Wallet.fromMnemonic(mnemonic)
    const signer = await wallet.connect(RPC_ENDPOINT)

    await signer.validators.setRewardDestination(rewardWallet)
    await signer.disconnect()

    await activateSlot(slot.id, rewardWallet)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}

async function verifyCode(code: string): Promise<ManagedSlot | null> {
  const db = await getDb()
  const doc = await db.collection('managedSlots').findOne({
    activationCode: code,
    isActive: false,
  })
  if (!doc) return null
  return {
    id: doc.id,
    activationCode: doc.activationCode,
    customerWallet: doc.customerWallet ?? null,
    isActive: doc.isActive,
    nodeAddress: doc.nodeAddress,
    yearlyFeeEth: doc.yearlyFeeEth,
    expiresAt: doc.expiresAt ?? null,
  }
}

async function activateSlot(slotId: number, wallet: string): Promise<void> {
  const db = await getDb()
  await db.collection('managedSlots').updateOne(
    { id: slotId },
    { $set: { isActive: true, customerWallet: wallet, activatedAt: new Date() } }
  )
}
