import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'

// ---- CONFIG ----
const RPC_URL = 'wss://rpc.awarizon.com'
const MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk//Bob"
const AMOUNT_PER_WALLET = 2_000n * 1_000_000_000_000n // 2000 RIZ, 12 decimals
const SS58_FORMAT = 42

// Raw input list — duplicates are fine here, they get deduped below.
// Entries ending in .riz are name-service handles and get resolved to
// addresses before anything is sent.
const RAW_RECIPIENTS = `
5FbTf9pr6LMnsgzEad28fa9dPoEWXpKvCLHXgBJsgdGoTkbu
5Djr9WcE1C6YKzjX173tno2LX8QF9NWFcrE89ud7gC55sUXp
5Ef1ZjoG565TZRcqx68gGfBG16rsAVxoBU3jzLiFxyyUdQaX
siryorik.riz
5E7MjzpFrZRFsHfpgF7mHjYGi2H6SWSZPEBuEvdJR8a8QAmb
pipi.riz
5D9quJmjNJkVY4QEp862VcaUYFANHuSFVzr4X7kKidhwKYEY
5CAUbQAQxH4fjByoY3bxZdiLNHdRMRXtgUr6iM8QUrrTE1Vx
5GHTmYieSwgGKTq7YEqpRDkes4LVdXk4BAmVcEDUUPyTBymu
5ESEHkJrdgwhh4q8hzUoZvBGzNw6rTUphvbxZkrZ7EbKVy21
5GrtUqdvdw5dav3BXS8r4MsCUfCkgCunMqhvSov55cZjNajq
biossz.riz
5H3BLTQvKt1Q8toCKXeQjBqiN2SePozbvmRLEi98DptDk9wT
5CLrXWepg2tXwyZGBgxEHtbwc3TksMzh29qtKUsgHJcDiHBS
5GTmMEnuGjgavxX6zVBmh7bhMNwK4xYUV2FeFWCZQkiPC9pL
5FTU2dZ76zis5U5Qx5oZr2YJXABL6J33AZE8skcM4EmqV6XJ
5Cg4uB7otT5RhPyoKAoh7727DVHPDcAxbwSuD9vMVRhjeJZS
5D1yF5kth4ca1hRot97TWYJUSrjGoAuVT7hQ9Vv4DtRP9Esf
5FFUATJTvt4ywGUXt982jrBMGsnVWV5GWz8TUv4ivVvgdDkH
5F4E67svxspZjB2xZqSLKkoJUGbHv5Hbz6kAutHwwuYSEZjL
5DvajWUKF3BqTdEQy1HUkojWHck6BGbngjtsFUwbjABx9AnK
5GgfpbLUizAHrHmd4DVnSHS6Z7W1DJfqNyL5SqsgmjpSGJnN
5FEVfK3q6ikFoepNFGsEzUyfSsYibmND1q9ngvuXYaFhAo9Y
5CGPtyPwFgnTEeLtm8gC96oStAYaaUHRnZFMpqrk3d99RNUX
5HazTyBKsfc4Sbbq8Lf19q8vMbbq2PBrLNRgayeRMkE6cYx5
5DUr3Je9ZrZ7wRBaMAREvau6ziqTtkpqQCDxweS2FLyQ9aEi
5DRtqT9GCmMTyoj9RQ2bGufhf1cGfzqQUSeTQZs6FR7BXK7K
5GGvcaToL3zUcCnv7HggstQR3n5gLUmkBh5Xkkbbh1bW8Cnw
5EqKsAe29ngCEMNEaqQWkD3kVnsK32Enrtvh45JGdyAZ1EEE
5EChudHfygHNWbik3Le2aRMJ18foaV7iUsShY48f9yuNf8kU
5Cg4uB7otT5RhPyoKAoh7727DVHPDcAxbwSuD9vMVRhjeJZS
5HYa38hXsmf4o76U2nDd411hgmyTBG5NFxZPyVQzn7NAKN3e
5F6YUQZvRhhREAB8bzUoWfLXYM5CtsCGHiwnpXpat3WXFcWa
5GEVtvDd3HgbqskhTjnarDq6VkF2xGW1pLAQbPdJJmMycMD8
siryorik.riz
5E5PeD2VkLdpan5YidwcKWPUJuK6uZthMJyBCC838x8UMQMC
5CAT1jsWfmVrrDf3cDENvCHn2NRBNHbS75nt3ru4yQMTwdGW
5HdbhJE4DAWL9ZqEhqrDh4otRgfsrEYKCP11HpSHpoMzm1S8
5GHokqhKq5QpjPsVRJuYSfDcJ1dQ36P87fZob49CHdYjmCSE
5DnQbavFZJSnCKRQSkaSBu8aJTZwxfEaJcGx2q8pEHm5Pxgp
Wira.riz
5GgfpbLUizAHrHmd4DVnSHS6Z7W1DJfqNyL5SqsgmjpSGJnN
5E7MjzpFrZRFsHfpgF7mHjYGi2H6SWSZPEBuEvdJR8a8QAmb
5H3PDMADoq8Y3Cu5kWmzMnAAugSMUugsgmsgubVUJsZ5KPo9
5FKhRYR5VVqc1qkH3qbgMKW38q5kx6u2BgQ9tzByodR3UwHh
5DkGfL7k3cafKH17phzeL2xCbz6QyfaZY3cX4Cwyvg4JgksW
5FXHMjGoLxsxtFTrdtrtuwgBjUsG4YHHnh91fM73XxZBRAJ7
5CzRPdx24oVqRHZCwSK8fhfkbJT6caGzJa67LJM1UBTypCnt
5CzRPdx24oVqRHZCwSK8fhfkbJT6caGzJa67LJM1UBTypCnt
5E6pBioYAUpDBmPkBF1ztJpPNj4GWHxzY6wWa5wfDnxyujBQ
5E6pBioYAUpDBmPkBF1ztJpPNj4GWHxzY6wWa5wfDnxyujBQ
5F1M9YMkTzgBhiuRH2DaZAzbDQUaYLedv3uNFDB2Rrkvdhqc
5HB6SGt2zc46fF3RzRrkv9W2R42v3FoBK4YmiVq3WPFAsNXH
5CWwaoKY2qtXa6g54iLgNyMZUiSn1h73wGr11Mr5a8bLDeWZ
5CPzQsgCZEaiJdD9F7aQpkowv9dLcRQV5dKcMEZx2i5bJFP4
5ECbmtjjG3uMj3kwFKeioKRFKsnsUT4kzSuKkYjrLednhtn2
5FFC4uZqBvk22g6eLMddBKTL6oe8wFY6TyGTVvUhiFv4rVxe
5CAiNwy6bi1bNuuUhSYnNfAZ2TLyoamngV4yLK8kT8QuS6iJ
5D1p1gZLtJEkGZS11hNmVdgSoZYn4qFw7trSNjDxHaJifC24
5Exs9m2dtABxfAdmPGMcZWqngmFHif3bbA3Zww2zFjySoxsA
5ERQzozx2ffRynKPcqX7pqXsit9EzVcbg8mjSgmfrb3FFcBJ
Mbumar.riz
jodians.riz
5GWVeRYpoEcWCo7U7hFxZWzfZ83HcPEpkf6aiWaC996zgcZL
amulet.riz
5FTU2dZ76zis5U5Qx5oZr2YJXABL6J33AZE8skcM4EmqV6XJ
5HQyRZFEqf9v9Dw3dvfqaPSQFkYYvkeQtdz5P4NmTSB2xSBv
5GKV1RadWaLnf1m5TpSzbNx3Nt2hqVCATMLhhmug85kbgg5q
5F4E67svxspZjB2xZqSLKkoJUGbHv5Hbz6kAutHwwuYSEZjL
5DJVsAkKE4kn24cEPf2hvfAg3NDddvtHBTnjeYEmWDAwyqPr
5CFexzWwNNQgdPjBUSAK92t6zukwA9BnkieUijPPJRmNuWZu
iloebube.riz
`.trim().split('\n').map(s => s.trim()).filter(Boolean)

// ---- helpers ----
function fmt(n: bigint | number): string {
  return (Number(n) / 1e12).toLocaleString()
}

async function resolveName(provider: WsProvider, name: string): Promise<string | null> {
  try {
    // Raw RPC call since awarizon_lookupName isn't decorated by metadata.
    // Logging the raw result the first time you run this so you can confirm
    // the shape (string address? { Ok: address }? hex-encoded AccountId?).
    const result = await provider.send<any>('awarizon_lookupName', [name])
    if (result === null || result === undefined) return null
    if (typeof result === 'string') return result
    if (typeof result === 'object' && result.Ok) return result.Ok
    console.log(`  ⚠ unrecognized response shape for ${name}:`, JSON.stringify(result))
    return null
  } catch (err) {
    console.error(`  ⚠ failed to resolve ${name}:`, (err as Error).message)
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const DRY_RUN = !args.includes('--send')

  await cryptoWaitReady()

  const provider = new WsProvider(RPC_URL)
  const api = await ApiPromise.create({ provider })

  const keyring = new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT })
  const bob = keyring.addFromUri(MNEMONIC)

  console.log(`\nSender (Bob): ${bob.address}`)
  const bobInfo = await api.query.system.account(bob.address)
  console.log(`Sender balance: ${fmt((bobInfo as any).data.free.toString())} RIZ`)

  // 1. Dedupe raw input (case-sensitive exact match; addresses/names are case-sensitive)
  const uniqueInputs = [...new Set(RAW_RECIPIENTS)]
  const dupeCount = RAW_RECIPIENTS.length - uniqueInputs.length
  console.log(`\nInput list: ${RAW_RECIPIENTS.length} entries, ${uniqueInputs.length} unique (${dupeCount} duplicates removed)`)

  // 2. Resolve .riz names -> addresses via raw RPC call (the extrinsic
  // encoder needs an actual AccountId, it can't accept a name string).
  const resolved: { input: string; address: string }[] = []
  const failedNames: string[] = []

  for (const entry of uniqueInputs) {
    if (entry.toLowerCase().endsWith('.riz')) {
      const addr = await resolveName(provider, entry)
      if (addr) {
        console.log(`  resolved ${entry} -> ${addr}`)
        resolved.push({ input: entry, address: addr })
      } else {
        console.log(`  ✗ could not resolve ${entry} — SKIPPING`)
        failedNames.push(entry)
      }
    } else {
      resolved.push({ input: entry, address: entry })
    }
  }

  // 3. Dedupe again by resolved address, in case a .riz name resolves to
  // an address that also appears separately as a raw address in the list.
  const seen = new Set<string>()
  const finalRecipients: { input: string; address: string }[] = []
  for (const r of resolved) {
    if (seen.has(r.address)) {
      console.log(`  (skipping ${r.input} — resolves to address already in list: ${r.address})`)
      continue
    }
    seen.add(r.address)
    finalRecipients.push(r)
  }

  const total = AMOUNT_PER_WALLET * BigInt(finalRecipients.length)

  console.log(`\n---- SUMMARY ----`)
  console.log(`Unique recipients: ${finalRecipients.length}`)
  if (failedNames.length) console.log(`Unresolved names (skipped): ${failedNames.join(', ')}`)
  console.log(`Amount per wallet: ${fmt(AMOUNT_PER_WALLET)} RIZ`)
  console.log(`Total to send: ${fmt(total)} RIZ`)
  console.log(`Sender has: ${fmt((bobInfo as any).data.free.toString())} RIZ`)

  if (BigInt((bobInfo as any).data.free.toString()) < total) {
    console.log(`\n✗ Sender balance is insufficient for this batch. Aborting.`)
    await api.disconnect()
    return
  }

  if (DRY_RUN) {
    console.log(`\nDRY RUN — no transactions sent.`)
    console.log(`Recipients that WOULD receive ${fmt(AMOUNT_PER_WALLET)} RIZ each (sent one at a time):`)
    finalRecipients.forEach((r, i) => console.log(`  ${i + 1}. ${r.address}${r.input !== r.address ? `  (${r.input})` : ''}`))
    console.log(`\nRe-run with --send to actually broadcast these transfers.`)
    await api.disconnect()
    return
  }

  // 4. Send one transfer at a time — each is fully finalized before the
  // next one is submitted. Slower than batching, but each transfer is its
  // own extrinsic, so a failure on one doesn't block the rest and you get
  // a clean per-recipient success/failure log.
  console.log(`\nSending ${finalRecipients.length} transfers one at a time...\n`)

  const succeeded: string[] = []
  const failed: { address: string; error: string }[] = []

  for (let i = 0; i < finalRecipients.length; i++) {
    const r = finalRecipients[i]
    const label = r.input !== r.address ? `${r.address} (${r.input})` : r.address
    console.log(`[${i + 1}/${finalRecipients.length}] Sending ${fmt(AMOUNT_PER_WALLET)} RIZ to ${label}...`)

    try {
      await new Promise<void>((resolve, reject) => {
        api.tx.balances.transferKeepAlive(r.address, AMOUNT_PER_WALLET)
          .signAndSend(bob, ({ status, dispatchError }: any) => {
            if (dispatchError) {
              reject(new Error(dispatchError.toString()))
              return
            }
            if (status.isInBlock) {
              console.log(`  ✓ Included in block: ${status.asInBlock.toHex()}`)
            }
            if (status.isFinalized) {
              console.log(`  ✓ Finalized: ${status.asFinalized.toHex()}`)
              resolve()
            }
          })
          .catch(reject)
      })
      succeeded.push(r.address)
    } catch (err) {
      console.log(`  ✗ FAILED: ${(err as Error).message}`)
      failed.push({ address: label, error: (err as Error).message })
    }
  }

  console.log(`\n---- RESULT ----`)
  console.log(`Succeeded: ${succeeded.length}/${finalRecipients.length}`)
  if (failed.length) {
    console.log(`Failed: ${failed.length}`)
    failed.forEach(f => console.log(`  ✗ ${f.address} — ${f.error}`))
  }

  const bobFinal = await api.query.system.account(bob.address)
  console.log(`\nSender final balance: ${fmt((bobFinal as any).data.free.toString())} RIZ`)

  await api.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})