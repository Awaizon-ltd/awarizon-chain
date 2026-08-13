import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })
  const developer = keyring.addFromMnemonic('drastic nurse truck shell hard vapor battle wild soccer solve awful dutch')
  const TARGET = '5EbnHPa3qMEuWC82guj47QnsMWkLxpXTxqnGhPtPguq2CuCK'
  const CAMPAIGN_ID = '0x210bdfc96bfffbb0a8703399c49a777e4114b9db1b27ec970000019f4e42022e'
  const recordId = new Uint8Array(32)
  crypto.getRandomValues(recordId)
  console.log('Delivering to:', TARGET)
  await new Promise<void>((resolve, reject) => {
    api.tx.awarizonState.deliverToInbox(
      TARGET,
      Array.from(Buffer.from(CAMPAIGN_ID.slice(2), 'hex')),
      Array.from(recordId),
    ).signAndSend(developer, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.isModule
          ? api.registry.findMetaError(dispatchError.asModule).name
          : dispatchError.toString()))
        return
      }
      if (status.isInBlock) console.log('✓ In block:', status.asInBlock.toHex())
      if (status.isFinalized) { console.log('✓ Delivered!'); resolve() }
    })
  })
  const inbox = await (api.query as any).awarizonState.inboxRecords.entries(TARGET)
  console.log('Inbox records:', inbox.length)
  inbox.forEach(([key, record]: any) => {
    const r = record.toHuman()
    console.log('  Status:', r.status, '| Category:', r.category)
  })
  await api.disconnect()
}
main().catch(console.error)
