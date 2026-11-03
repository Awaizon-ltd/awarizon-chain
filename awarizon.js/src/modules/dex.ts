import type { ApiPromise } from '@polkadot/api'
import {
  getDexPool, getDexQuote, getDexTwap, getAllDexPools,
  getDexFeeDestination, getDexTotalBurned,
  type DexAssetWire, type DexPoolResponse, type DexQuoteResponse, type DexTwapResponse,
} from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import { formatAmount, submitAndWait, type SigningSource, type TxResult } from '../utils'

// ── Types ────────────────────────────────────────

/// Asset — matches pallet-awarizon-dex Asset enum.
/// Use Asset.native() for RIZ, Asset.token(id) for pallet-assets tokens.
export type Asset =
  | { type: 'native' }
  | { type: 'token'; id: number }

export const Asset = {
  native: (): Asset => ({ type: 'native' }),
  token: (id: number): Asset => ({ type: 'token', id }),
  isNative: (a: Asset): boolean => a.type === 'native',
  isToken: (a: Asset): boolean => a.type === 'token',
  eq: (a: Asset, b: Asset): boolean =>
    a.type === b.type &&
    (a.type === 'native' || (a.type === 'token' && b.type === 'token' && a.id === b.id)),
}

export interface DexPool {
  assetA: Asset
  assetB: Asset
  reserveA: string
  reserveB: string
  lpTotalSupply: string
  lpAssetId: number
  totalVolume: string
  totalFees: string
  totalBurned: string
  feeBps: number
  isRizPair: boolean
  createdAt: number
  lastUpdatedBlock: number
}

export interface DexQuote {
  assetIn: Asset
  assetOut: Asset
  amountIn: string
  amountOut: string
  fee: string
  protocolFee: string
  priceImpactBps: number
  path: Asset[]
  viaRiz: boolean
}

export interface DexTwap {
  priceACumulative: string
  priceBCumulative: string
  lastBlock: number
  spotPriceAPerB: string
  spotPriceBPerA: string
}

export interface DexTxResult extends TxResult {
  poolId?: string
}

// ── Wire <-> SDK Asset conversion ────────────────

function assetToWire(asset: Asset): DexAssetWire {
  return asset.type === 'native' ? 'native' : { token: asset.id }
}

function assetFromWire(wire: DexAssetWire): Asset {
  return wire === 'native' ? Asset.native() : Asset.token(wire.token)
}

function assetToEnum(asset: Asset): unknown {
  return asset.type === 'native' ? { Native: null } : { Token: asset.id }
}

function poolFromResponse(pool: DexPoolResponse): DexPool {
  return {
    assetA: assetFromWire(pool.asset_a),
    assetB: assetFromWire(pool.asset_b),
    reserveA: pool.reserve_a,
    reserveB: pool.reserve_b,
    lpTotalSupply: pool.lp_total_supply,
    lpAssetId: pool.lp_asset_id,
    totalVolume: pool.total_volume,
    totalFees: pool.total_fees,
    totalBurned: pool.total_burned,
    feeBps: pool.fee_bps,
    isRizPair: pool.is_riz_pair,
    createdAt: pool.created_at,
    lastUpdatedBlock: pool.last_updated_block,
  }
}

function quoteFromResponse(quote: DexQuoteResponse): DexQuote {
  return {
    assetIn: assetFromWire(quote.asset_in),
    assetOut: assetFromWire(quote.asset_out),
    amountIn: quote.amount_in,
    amountOut: quote.amount_out,
    fee: quote.fee,
    protocolFee: quote.protocol_fee,
    priceImpactBps: quote.price_impact_bps,
    path: quote.path.map(assetFromWire),
    viaRiz: quote.via_riz,
  }
}

function twapFromResponse(twap: DexTwapResponse): DexTwap {
  return {
    priceACumulative: twap.price_a_cumulative,
    priceBCumulative: twap.price_b_cumulative,
    lastBlock: twap.last_block,
    spotPriceAPerB: twap.spot_price_a_per_b,
    spotPriceBPerA: twap.spot_price_b_per_a,
  }
}

// ── DexModule ────────────────────────────────────

export class DexModule {
  constructor(
    private api: ApiPromise,
    private pair: SigningSource | null,
  ) {}

  // ── READ methods (no pair needed) ────────────

  /// Get pool info for an asset pair. Returns null if pool does not exist.
  async getPool(assetA: Asset, assetB: Asset): Promise<DexPool | null> {
    const pool = await getDexPool(this.api, assetToWire(assetA), assetToWire(assetB))
    return pool ? poolFromResponse(pool) : null
  }

  /// Get price quote for a swap. amountIn: amount in planck.
  async getQuote(
    assetIn: Asset,
    assetOut: Asset,
    amountIn: bigint | string,
  ): Promise<DexQuote> {
    const quote = await getDexQuote(
      this.api, assetToWire(assetIn), assetToWire(assetOut), String(amountIn)
    )
    return quoteFromResponse(quote)
  }

  /// Get TWAP price accumulator for a pool.
  async getTwap(assetA: Asset, assetB: Asset): Promise<DexTwap | null> {
    const twap = await getDexTwap(this.api, assetToWire(assetA), assetToWire(assetB))
    return twap ? twapFromResponse(twap) : null
  }

  /// Get all pools (up to limit).
  async getAllPools(limit = 50): Promise<DexPool[]> {
    const pools = await getAllDexPools(this.api, limit)
    return pools.map(poolFromResponse)
  }

  /// Get protocol fee destination — 'burn' or 'treasury'.
  async getFeeDestination(): Promise<'burn' | 'treasury'> {
    return getDexFeeDestination(this.api)
  }

  /// Get total protocol fees burned — always RIZ-denominated.
  /// Returns a formatted string e.g. "1,234.5678 RIZ".
  async getTotalBurned(): Promise<string> {
    const planck = await getDexTotalBurned(this.api)
    return formatAmount(BigInt(planck))
  }

  // ── WRITE methods (pair required) ────────────

  private requirePair(): SigningSource {
    if (!this.pair) throw AwarizonError.notSigned()
    return this.pair
  }

  private async deadlineBlock(offset: number): Promise<number> {
    const header = await this.api.rpc.chain.getHeader()
    return header.number.toNumber() + offset
  }

  /// Create a new liquidity pool. Both amounts in planck.
  async createPool(
    assetA: Asset,
    assetB: Asset,
    amountA: bigint,
    amountB: bigint,
    options?: { deadlineBlocks?: number },
  ): Promise<TxResult> {
    const pair = this.requirePair()
    const deadline = await this.deadlineBlock(options?.deadlineBlocks ?? 100)

    const extrinsic = (this.api.tx as any).awarizonDex.createPool(
      assetToEnum(assetA), assetToEnum(assetB), amountA, amountB, deadline,
    )
    return submitAndWait(extrinsic, pair, this.api)
  }

  /// Add liquidity to an existing pool.
  async addLiquidity(
    assetA: Asset,
    assetB: Asset,
    amountADesired: bigint,
    amountBDesired: bigint,
    options?: { slippageBps?: number; deadlineBlocks?: number },
  ): Promise<TxResult> {
    const pair = this.requirePair()

    const slippage = BigInt(options?.slippageBps ?? 50)
    const minA = amountADesired - (amountADesired * slippage / 10_000n)
    const minB = amountBDesired - (amountBDesired * slippage / 10_000n)
    const deadline = await this.deadlineBlock(options?.deadlineBlocks ?? 100)

    const extrinsic = (this.api.tx as any).awarizonDex.addLiquidity(
      assetToEnum(assetA), assetToEnum(assetB),
      amountADesired, amountBDesired, minA, minB, deadline,
    )
    return submitAndWait(extrinsic, pair, this.api)
  }

  /// Remove liquidity from a pool.
  async removeLiquidity(
    assetA: Asset,
    assetB: Asset,
    lpAmount: bigint,
    options?: { slippageBps?: number; deadlineBlocks?: number },
  ): Promise<TxResult> {
    const pair = this.requirePair()

    // Estimate minimum amounts from current reserves — best-effort;
    // falls back to 1 planck (no protection) if the pool can't be read.
    let minA = 1n
    let minB = 1n
    const pool = await this.getPool(assetA, assetB)
    if (pool) {
      const slippage = BigInt(options?.slippageBps ?? 50)
      const supply = BigInt(pool.lpTotalSupply)
      if (supply > 0n) {
        const estA = lpAmount * BigInt(pool.reserveA) / supply
        const estB = lpAmount * BigInt(pool.reserveB) / supply
        minA = estA - (estA * slippage / 10_000n)
        minB = estB - (estB * slippage / 10_000n)
      }
    }

    const deadline = await this.deadlineBlock(options?.deadlineBlocks ?? 100)

    const extrinsic = (this.api.tx as any).awarizonDex.removeLiquidity(
      assetToEnum(assetA), assetToEnum(assetB), lpAmount, minA, minB, deadline,
    )
    return submitAndWait(extrinsic, pair, this.api)
  }

  /// Swap exact amount in for a minimum amount out. Gets a quote first to
  /// derive minAmountOut if not provided.
  async swapExactIn(
    assetIn: Asset,
    assetOut: Asset,
    amountIn: bigint,
    options?: { minAmountOut?: bigint; slippageBps?: number; deadlineBlocks?: number },
  ): Promise<TxResult> {
    const pair = this.requirePair()

    let minOut = options?.minAmountOut
    if (minOut === undefined) {
      const quote = await this.getQuote(assetIn, assetOut, amountIn)
      const slippage = BigInt(options?.slippageBps ?? 50)
      const estimated = BigInt(quote.amountOut)
      minOut = estimated - (estimated * slippage / 10_000n)
    }

    const deadline = await this.deadlineBlock(options?.deadlineBlocks ?? 100)

    const extrinsic = (this.api.tx as any).awarizonDex.swapExactIn(
      assetToEnum(assetIn), assetToEnum(assetOut), amountIn, minOut, deadline,
    )
    try {
      return await submitAndWait(extrinsic, pair, this.api)
    } catch (err: any) {
      if (err instanceof AwarizonError && /slippage/i.test(err.message)) {
        throw new AwarizonError(
          err.message + ' Try increasing slippage tolerance to 1% or higher.',
          'SLIPPAGE_EXCEEDED', err.pallet, err.raw,
        )
      }
      throw err
    }
  }

  /// Swap a maximum amount in for an exact amount out.
  async swapExactOut(
    assetIn: Asset,
    assetOut: Asset,
    amountOut: bigint,
    options?: { maxAmountIn?: bigint; slippageBps?: number; deadlineBlocks?: number },
  ): Promise<TxResult> {
    const pair = this.requirePair()

    let maxIn = options?.maxAmountIn
    if (maxIn === undefined) {
      const quote = await this.getQuote(assetIn, assetOut, amountOut)
      const slippage = BigInt(options?.slippageBps ?? 50)
      const estimated = BigInt(quote.amountIn)
      maxIn = estimated + (estimated * slippage / 10_000n)
    }

    const deadline = await this.deadlineBlock(options?.deadlineBlocks ?? 100)

    const extrinsic = (this.api.tx as any).awarizonDex.swapExactOut(
      assetToEnum(assetIn), assetToEnum(assetOut), amountOut, maxIn, deadline,
    )
    return submitAndWait(extrinsic, pair, this.api)
  }

  /// Convenience: swap RIZ for a token.
  async buyToken(
    tokenId: number,
    amountRiz: bigint,
    options?: { slippageBps?: number },
  ): Promise<TxResult> {
    return this.swapExactIn(Asset.native(), Asset.token(tokenId), amountRiz, options)
  }

  /// Convenience: swap a token for RIZ.
  async sellToken(
    tokenId: number,
    amountToken: bigint,
    options?: { slippageBps?: number },
  ): Promise<TxResult> {
    return this.swapExactIn(Asset.token(tokenId), Asset.native(), amountToken, options)
  }
}
