export function getDefaultEndpoint(): string {
  return (
    (typeof process !== 'undefined' && process.env?.AWARIZON_ENDPOINT) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_AWARIZON_ENDPOINT) ||
    (typeof process !== 'undefined' && process.env?.VITE_AWARIZON_ENDPOINT) ||
    'wss://rpc.awarizon.com'
  )
}

export function getDefaultMnemonic(): string | null {
  if (typeof process === 'undefined') return null
  return process.env?.AWARIZON_MNEMONIC ?? process.env?.AWARIZON_SEED ?? null
}
