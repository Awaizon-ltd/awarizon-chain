import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'

const DEV_ADDRESS = '5EFMjcpYbbyszjcrx83nd18zrkGeVrpzu4BymBXtTH9E685Z'
const HASHES = [
  '0x210bdfc96bfffbb0a8703399c49a777e4114b9db1b27ec9709b2236e5b885181',
  '0xc47b61285dba5894bebdd1aaf3bea96c536a77ff3ecda44314cea523a493b2d4',
  '0xc4070de1aee68fd261aa8e4562d3b2d308460bf4c80e33c5ac023ba4d4cab68e',
]

async function main() {
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })

  for (const hash of HASHES) {
    const manifest = await (api.query as any)
      .awarizonState.appManifests(hash)
    console.log(`\nHash: ${hash}`)
    console.log('Manifest:', JSON.stringify(
      manifest.toJSON(), null, 2
    ))
  }

  await api.disconnect()
}

main().catch(console.error)
