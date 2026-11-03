import { Keyring } from '@polkadot/keyring'
import { mnemonicGenerate, cryptoWaitReady }
  from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc }
  from '@awarizon/sdk'
import { CONFIG } from './config'
import { NonceTracker } from './nonce'
import type { TestWallet } from './types'
import fs from 'fs/promises'
import path from 'path'

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function generateWallets(
  count: number
): Promise<TestWallet[]> {
  await cryptoWaitReady()
  console.log(`Generating ${count.toLocaleString()} wallets...`)

  const wallets: TestWallet[] = []
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })
  const logEvery = 1000

  for (let i = 0; i < count; i++) {
    const mnemonic = mnemonicGenerate(12)
    const pair = keyring.addFromMnemonic(mnemonic)

    wallets.push({
      address: pair.address,
      mnemonic,
      funded: false,
    })

    if ((i + 1) % logEvery === 0) {
      process.stdout.write(
        `\r  Generated ${(i + 1).toLocaleString()} / `
        + `${count.toLocaleString()}`
      )
    }
  }

  console.log('\n  Done.')
  return wallets
}

export async function saveWallets(
  wallets: TestWallet[]
): Promise<void> {
  await ensureDir(path.dirname(CONFIG.walletsFile))
  await fs.writeFile(
    CONFIG.walletsFile,
    JSON.stringify(wallets, null, 2)
  )
  console.log(`Saved ${wallets.length.toLocaleString()} wallets to ${CONFIG.walletsFile}`)
}

export async function loadWallets(): Promise<TestWallet[]> {
  try {
    const data = await fs.readFile(CONFIG.walletsFile, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function fundWallets(
  wallets: TestWallet[],
  targetCount: number
): Promise<void> {
  await cryptoWaitReady()

  const toFund = wallets
    .filter(w => !w.funded)
    .slice(0, targetCount)

  if (toFund.length === 0) {
    console.log('All wallets already funded.')
    return
  }

  console.log(
    `Funding ${toFund.length.toLocaleString()} wallets...`
  )

  const provider = new WsProvider(CONFIG.endpoint)
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })
  await api.isReady

  // Funder keypair. Default '//Alice' resolves to the genesis-endowed
  // dev account; addFromUri also accepts a plain mnemonic or a full
  // "mnemonic//junction" SURI for a custom VPS funder.
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })
  const funder = keyring.addFromUri(CONFIG.funderUri)

  const fundPlanck = BigInt(
    Math.floor(parseFloat(CONFIG.fundAmount) * 1e12)
  )

  console.log(`  Funder: ${funder.address}`)
  const funderAccount: any = await api.query.system.account(funder.address)
  const funderBalance = BigInt(funderAccount.data.free.toString())
  console.log(`  Funder balance: ${Number(funderBalance) / 1e12} RIZ`)

  const required = fundPlanck * BigInt(toFund.length)
  if (funderBalance < required) {
    console.warn(
      `  WARNING: funder balance (${Number(funderBalance) / 1e12} RIZ) is ` +
      `less than the ${Number(required) / 1e12} RIZ required to fund ` +
      `${toFund.length.toLocaleString()} wallets at ${CONFIG.fundAmount} RIZ each. ` +
      `Some transfers will fail.`
    )
  }

  const nonces = new NonceTracker(api)
  let funded = 0
  let failed = 0

  for (let i = 0; i < toFund.length; i += CONFIG.batchSize) {
    const batch = toFund.slice(i, i + CONFIG.batchSize)

    await Promise.allSettled(batch.map(async (w) => {
      const nonce = await nonces.next(funder.address)

      try {
        await new Promise<void>((resolve, reject) => {
          api.tx.balances.transferKeepAlive(w.address, fundPlanck)
            .signAndSend(
              funder,
              { nonce },
              ({ status, dispatchError }) => {
                if (dispatchError) {
                  reject(new Error(dispatchError.toString()))
                  return
                }
                if (status.isInBlock) {
                  w.funded = true
                  w.fundTxHash = status.asInBlock.toHex()
                  resolve()
                }
              }
            )
            .catch(reject)
        })
        funded++
      } catch (err) {
        failed++
        console.error(
          `\n  Failed to fund ${w.address}: ${(err as Error).message}`
        )
      }

      process.stdout.write(
        `\r  Funded ${funded.toLocaleString()} / ` +
        `${toFund.length.toLocaleString()}` +
        (failed > 0 ? ` (${failed.toLocaleString()} failed)` : '')
      )
    }))

    if (
      CONFIG.batchDelay > 0 &&
      i + CONFIG.batchSize < toFund.length
    ) {
      await new Promise(r => setTimeout(r, CONFIG.batchDelay))
    }
  }

  console.log('\n  Funding complete.')
  await api.disconnect()

  await saveWallets(wallets)
}

// CLI entry point
const command = process.argv[2]
const count = parseInt(process.argv[3] ?? '1000')

if (command === 'generate') {
  const wallets = await generateWallets(count)
  await saveWallets(wallets)
} else if (command === 'fund') {
  const wallets = await loadWallets()
  if (wallets.length === 0) {
    console.log('No wallets found. Run: npm run wallet:generate')
    process.exit(1)
  }
  await fundWallets(wallets, count)
} else {
  console.log('Usage: tsx src/wallets.ts <generate|fund> [count]')
  process.exit(1)
}
