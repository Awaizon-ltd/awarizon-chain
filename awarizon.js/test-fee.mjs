import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

async function main() {
  await cryptoWaitReady();
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });

  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  const tx = api.tx.balances.transferKeepAlive(bob, 1000000000000n);
  await tx.signAsync(alice);
  const u8a = tx.toU8a();
  const info = await api.call.transactionPaymentApi.queryInfo(u8a, u8a.length);

  const fee = BigInt(info.partialFee.toString());
  const feeRiz = Number(fee) / 1e12;

  console.log('Extrinsic length (bytes):', u8a.length);
  console.log('Weight refTime:', info.weight.refTime.toString());
  console.log('Weight proofSize:', info.weight.proofSize.toString());
  console.log('Transfer fee (planck):', fee.toString());
  console.log('Transfer fee (RIZ):', feeRiz.toFixed(10));
  console.log('Target: 0.0001 RIZ');
  console.log('Result:', feeRiz <= 0.0002 ? 'PASS - fee is low enough' : 'FAIL - fee still too high');

  await api.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
