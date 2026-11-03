import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  console.log('\n=== CHAIN STATE DEBUG ===\n')

  // Active campaign count
  const activeCampaigns = await (api.query as any)
    .awarizonState.activeCampaignCount()
  console.log('Active campaigns:', activeCampaigns.toString())

  // All campaigns
  const campaigns = await (api.query as any)
    .awarizonState.campaigns.entries()
  console.log('Total campaigns stored:', campaigns.length)

  for (const [key, value] of campaigns) {
    const campaign = value.toHuman() as any
    console.log('\nCampaign:')
    console.log('  ID:', Buffer.from(
      key.args[0]
    ).toString('hex'))
    console.log('  Developer:', campaign?.developer)
    console.log('  Status:', campaign?.status)
    console.log('  Manifest hash:', campaign?.manifestHash)
    console.log('  Max deliveries:', campaign?.maxDeliveries)
    console.log('  Current deliveries:', campaign?.currentDeliveries)
    console.log('  Expires at:', campaign?.expiresAt)
  }

  // Developer profiles
  const profiles = await (api.query as any)
    .awarizonState.developerProfiles.entries()
  console.log('\n\nTotal developer profiles:', profiles.length)

  for (const [key, value] of profiles) {
    const profile = value.toHuman() as any
    console.log('\nDeveloper:', key.args[0].toString())
    console.log('  Status:', profile?.status)
    console.log('  Total campaigns:', profile?.totalCampaigns)
    console.log('  Staked RIZ:', profile?.stakedRiz)
  }

  // Inbox state reserve
  const reserve = await (api.query as any)
    .awarizonState.inboxStateReserveBalance()
  console.log('\n\nInbox reserve balance:',
    (Number(reserve.toString()) / 1e12).toLocaleString(),
    'RIZ'
  )

  await api.disconnect()
}

main().catch(console.error)
