import { create } from 'zustand'
import type { DexPool } from 'awarizon.js'
import { Asset } from 'awarizon.js'

interface DexState {
  pools: DexPool[]
  poolsLoading: boolean
  totalBurned: string
  feeDestination: 'burn' | 'treasury'

  // Selected tokens for swap
  tokenIn: Asset
  tokenOut: Asset
  amountIn: string
  amountOut: string
  slippageBps: number

  // Actions
  setPools: (pools: DexPool[]) => void
  setPoolsLoading: (loading: boolean) => void
  setTotalBurned: (amount: string) => void
  setFeeDestination: (dest: 'burn' | 'treasury') => void
  setTokenIn: (asset: Asset) => void
  setTokenOut: (asset: Asset) => void
  setAmountIn: (amount: string) => void
  setAmountOut: (amount: string) => void
  setSlippage: (bps: number) => void
  swapTokens: () => void
}

export const useDexStore = create<DexState>(
  (set, get) => ({
    pools: [],
    poolsLoading: false,
    totalBurned: '0',
    feeDestination: 'burn',
    tokenIn: Asset.native(),
    tokenOut: Asset.token(1),
    amountIn: '',
    amountOut: '',
    slippageBps: 50,

    setPools: (pools) => set({ pools }),
    setPoolsLoading: (poolsLoading) =>
      set({ poolsLoading }),
    setTotalBurned: (totalBurned) =>
      set({ totalBurned }),
    setFeeDestination: (feeDestination) =>
      set({ feeDestination }),
    setTokenIn: (tokenIn) => set({ tokenIn }),
    setTokenOut: (tokenOut) => set({ tokenOut }),
    setAmountIn: (amountIn) => set({ amountIn }),
    setAmountOut: (amountOut) => set({ amountOut }),
    setSlippage: (slippageBps) => set({ slippageBps }),
    swapTokens: () => {
      const { tokenIn, tokenOut,
               amountIn, amountOut } = get()
      set({
        tokenIn: tokenOut,
        tokenOut: tokenIn,
        amountIn: amountOut,
        amountOut: amountIn,
      })
    },
  })
)
