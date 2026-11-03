import { ApiPromise, WsProvider } from '@polkadot/api'

async function main() {
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const genesisHash = api.genesisHash.toHex()
  const runtimeVersion = api.runtimeVersion
  const props = await api.rpc.system.properties()
  const chainName = await api.rpc.system.chain()

  console.log('chainName:', chainName.toString())
  console.log('genesisHash:', genesisHash)
  console.log('specVersion:', runtimeVersion.specVersion.toString())
  console.log('specName:', runtimeVersion.specName.toString())
  console.log('ss58Format:', props.ss58Format.toString())
  console.log('tokenSymbol:', props.tokenSymbol.toString())
  console.log('tokenDecimals:', props.tokenDecimals.toString())

  await api.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
