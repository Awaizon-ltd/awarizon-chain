import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'
import * as fs from 'fs'

async function main() {
  const provider = new WsProvider(
    'wss://rpc.awarizon.com',
    undefined,
    undefined,
    { timeout: 120000 }
  )
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })

  console.log('Connected. Fetching wallets...')

  const entries = await (api.query as any)
    .awarizonState.walletIndexed.entries()

  console.log(`Found ${entries.length} wallets`)

  const addresses = entries.map(([key]: any) =>
    key.args[0].toString()
  )

  const sqls: string[] = []
  const BATCH = 20

  for (let i = 0; i < addresses.length; i += BATCH) {
    const batch = addresses.slice(i, i + BATCH)

    const results = await Promise.all(
      batch.map(async (address: string) => {
        const [age, activity, category, region] =
          await Promise.all([
            (api.query as any).awarizonState
              .walletAgeIndex(address),
            (api.query as any).awarizonState
              .walletActivityIndex(address),
            (api.query as any).awarizonState
              .walletCategoryHistory(address),
            (api.query as any).awarizonState
              .walletRegionCode(address),
          ])
        return { address, age, activity, category, region }
      })
    )

    for (const r of results) {
      const toNum = (v: any): number => {
        if (v?.isSome) return v.unwrap().toNumber()
        if (v?.isNone) return 0
        if (typeof v?.toNumber === 'function')
          return v.toNumber()
        return 0
      }

      const walletAgeDays = toNum(r.age)
      const activityCount = toNum(r.activity)
      const regionCode = toNum(r.region)

      const catHex = r.category.toHex?.() ?? '0x'
      const catBytes = catHex.length > 2
        ? catHex.slice(2).match(/.{2}/g)
            ?.map((b: string) => parseInt(b, 16)) ?? []
        : []
      const catArray = `'{${catBytes.join(',')}}'`

      const addr = r.address.replace(/'/g, "''")
      sqls.push(
        `INSERT INTO wallet_index ` +
        `(address,wallet_age_days,activity_count,` +
        `category_history,region_code,` +
        `first_indexed_block,last_indexed_block) ` +
        `VALUES ('${addr}',${walletAgeDays},` +
        `${activityCount},${catArray},` +
        `${regionCode},0,0) ` +
        `ON CONFLICT (address) DO UPDATE SET ` +
        `wallet_age_days=${walletAgeDays},` +
        `activity_count=${activityCount},` +
        `category_history=${catArray},` +
        `region_code=${regionCode},` +
        `updated_at=NOW();`
      )
    }

    process.stdout.write(
      `\r${i + batch.length}/${addresses.length}`
    )
  }

  fs.writeFileSync('/tmp/backfill.sql', sqls.join('\n'))
  console.log(`\nSQL written: ${sqls.length} statements`)

  await api.disconnect()
}

main().catch(console.error)
