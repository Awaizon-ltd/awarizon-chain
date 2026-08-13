import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'

const DB_CONN = 'postgresql://postgres:OBbATrmPu8QF2xoSHl7XQcdIGL2FLVFD64Z59V0ffrd1KlQyHWPegzGyNmUBGtbk@31.97.58.198:5441/postgres'

async function main() {
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })

  const entries = await (api.query as any)
    .awarizonState.walletIndexed.entries()

  console.log(`Found ${entries.length} indexed wallets`)

  const wallets: any[] = []

  for (const [key] of entries) {
    const address = key.args[0].toString()

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

    const walletAgeDays =
      age.isSome ? age.unwrap().toNumber()
      : age.toNumber?.() ?? 0

    const activityCount =
      activity.isSome ? activity.unwrap().toNumber()
      : activity.toNumber?.() ?? 0

    const categoryHistory =
      (category.toJSON?.() ?? []) as number[]

    const regionCode =
      region.isSome ? region.unwrap().toNumber()
      : region.toNumber?.() ?? 0

    wallets.push({
      address,
      walletAgeDays,
      activityCount,
      categoryHistory,
      regionCode,
    })

    process.stdout.write('.')
  }

  console.log('\n\nSample data:')
  wallets.slice(0, 3).forEach(w => {
    console.log(JSON.stringify(w, null, 2))
  })

  console.log(`\nTotal wallets to backfill: ${wallets.length}`)

  await api.disconnect()
}

main().catch(console.error)
