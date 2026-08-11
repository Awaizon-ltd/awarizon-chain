import type { ApiPromise } from '@polkadot/api'
import type { SigningSource } from '../utils'
import { buildCreateAsset, buildMintAsset, buildTransferAsset } from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import {
  parseAmount, resolveAddress, submitAndWait,
  type AmountInput, type TxResult,
} from '../utils'

export interface AssetBalance {
  assetId: number
  balance: string
}

export interface AssetMetadata {
  assetId: number
  name: string
  symbol: string
  decimals: number
  totalSupply: string
}

function formatAssetAmount(planck: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = planck / base
  const rem = planck % base
  const dec = rem.toString().padStart(decimals, '0')
  return decimals > 0 ? `${whole}.${dec}` : `${whole}`
}

export class AssetsModule {
  constructor(
    private api: ApiPromise,
    private pair: SigningSource | null
  ) {}

  // READ — works without keypair (pair can be null)
  async balance(assetId: number, address?: string): Promise<AssetBalance> {
    const addr = address
      ? await resolveAddress(address, this.api)
      : this._ownAddress()
    const [account, meta] = await Promise.all([
      (this.api.query as any).assets.account(assetId, addr),
      this.metadata(assetId),
    ])
    const json = account.toJSON() as any
    const raw = json?.balance ? BigInt(json.balance) : 0n
    return { assetId, balance: formatAssetAmount(raw, meta.decimals) }
  }

  async metadata(assetId: number): Promise<AssetMetadata> {
    const [meta, asset] = await Promise.all([
      (this.api.query as any).assets.metadata(assetId),
      (this.api.query as any).assets.asset(assetId),
    ])
    const decimals = Number(meta.decimals?.toNumber?.() ?? meta.decimals ?? 0)
    const assetJson = asset.toJSON() as any
    const supply = assetJson?.supply ? BigInt(assetJson.supply) : 0n
    return {
      assetId,
      name: meta.name.toUtf8(),
      symbol: meta.symbol.toUtf8(),
      decimals,
      totalSupply: formatAssetAmount(supply, decimals),
    }
  }

  // WRITE (pair required)
  async create(params: {
    assetId: number
    admin: string
    minBalance: AmountInput
  }): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const admin = await resolveAddress(params.admin, this.api)
    const extrinsic = buildCreateAsset(
      this.api, params.assetId, admin, parseAmount(params.minBalance)
    )
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async mint(assetId: number, to: string, amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const dest = await resolveAddress(to, this.api)
    const extrinsic = buildMintAsset(this.api, assetId, dest, parseAmount(amount))
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async transfer(assetId: number, to: string, amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const dest = await resolveAddress(to, this.api)
    const extrinsic = buildTransferAsset(this.api, assetId, dest, parseAmount(amount))
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async burn(assetId: number, who: string, amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(who, this.api)
    const extrinsic = (this.api.tx as any).assets.burn(assetId, target, parseAmount(amount))
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  private _ownAddress(): string {
    if (!this.pair) throw AwarizonError.notSigned()
    return this.pair.address
  }
}
