import { Provider } from '/home/user/awarizon-chain/awarizon.js/src/index'

async function main() {
  const provider = await Provider.connect(
    'wss://rpc.awarizon.com'
  )
  const api = provider.getApi()

  const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

  const tx = api.tx.balances.transferKeepAlive(
    bob,
    1_000_000_000_000n
  )

  const info = await api.call.transactionPaymentApi
    .queryInfo(tx.toHex(), tx.encodedLength) as any

  const fee = BigInt(info.partialFee.toString())
  const feeRiz = Number(fee) / 1e12

  console.log('─────────────────────────────')
  console.log('Transfer fee:', feeRiz.toFixed(8), 'RIZ')
  console.log('Fee in planck:', fee.toString())
  console.log('Previous fee:  0.00770000 RIZ')
  console.log('Target fee:    0.00010000 RIZ')
  console.log('─────────────────────────────')
  console.log(
    feeRiz <= 0.0002
      ? '✓ PASS — fee reduced successfully'
      : feeRiz < 0.0077
      ? '~ PARTIAL — fee reduced but not enough'
      : '✗ FAIL — fee unchanged, binary may not have deployed'
  )

  await provider.disconnect()
}

main().catch(console.error)
