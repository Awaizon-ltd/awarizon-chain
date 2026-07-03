export function isValidAddress(address: string): boolean {
  // SS58 addresses are 47–48 chars, base58 charset
  return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address)
}

export function isValidMnemonic(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/)
  return words.length === 12 || words.length === 24
}

export function isValidAmount(input: string): boolean {
  const clean = input.replace(/\s*RIZ\s*/gi, '').trim()
  const n = Number(clean)
  return clean.length > 0 && !isNaN(n) && n > 0
}

export function isValidRizName(name: string): boolean {
  return /^[a-z0-9_]{3,32}$/.test(name)
}
