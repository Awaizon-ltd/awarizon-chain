import { ApiPromise, WsProvider } from '@polkadot/api';
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk';

const ADDR = '5EbnHPa3qMEuWC82guj47QnsMWkLxpXTxqnGhPtPguq2CuCK';
const ENDPOINT = process.env.AWARIZON_ENDPOINT ?? 'wss://rpc.awarizon.com';

async function main() {
  const provider = new WsProvider(ENDPOINT);
  const api = await ApiPromise.create({ provider, types: awarizonTypes, rpc: awarizonRpc });
  await api.isReady;

  const [chain, header, account] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.chain.getHeader(),
    api.query.system.account(ADDR),
  ]);

  console.log('Chain:', chain.toString());
  console.log('Current block:', header.number.toNumber());
  console.log('Address:', ADDR);
  console.log('Nonce:', account.nonce.toString());
  console.log('Free balance (planck):', account.data.free.toString());
  console.log('Reserved (planck):', account.data.reserved.toString());
  console.log('Frozen (planck):', account.data.frozen ? account.data.frozen.toString() : '0');

  await api.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error('ERROR:', e.message || e); process.exit(1); });
