import { useState, useCallback, useRef } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { TxResult } from '@awarizon/core'

export type TxStatus = 'idle' | 'pending' | 'success' | 'error'

export interface TxRecord extends TxResult {
  timestamp: number
  label?: string
}

export interface UseTransactionReturn {
  // State
  status: TxStatus
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  result: TxResult | null
  error: string | null
  history: TxRecord[]

  // Actions
  execute: (fn: () => Promise<TxResult>, label?: string) => Promise<TxResult>
  sign: (message: string) => Promise<string>
  reset: () => void
}

export function useTransaction(): UseTransactionReturn {
  const { pair } = useAwarizonContext()

  const [status, setStatus] = useState<TxStatus>('idle')
  const [result, setResult] = useState<TxResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<TxRecord[]>([])

  // Abort signal for in-flight transactions if component unmounts
  const mountedRef = useRef(true)

  const execute = useCallback(
    async (fn: () => Promise<TxResult>, label?: string): Promise<TxResult> => {
      setStatus('pending')
      setError(null)
      setResult(null)

      try {
        const txResult = await fn()

        if (mountedRef.current) {
          setResult(txResult)
          setStatus('success')
          setHistory(prev => [
            { ...txResult, timestamp: Date.now(), label },
            ...prev.slice(0, 49), // keep last 50
          ])
        }

        return txResult
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transaction failed'

        if (mountedRef.current) {
          setError(message)
          setStatus('error')
        }

        throw err
      }
    },
    []
  )

  const sign = useCallback(
    async (message: string): Promise<string> => {
      if (!pair) {
        throw new Error('Wallet is locked. Unlock your wallet before signing.')
      }

      const msgBytes =
        typeof message === 'string'
          ? new TextEncoder().encode(message)
          : message

      const signature = pair.sign(msgBytes)

      // Return 0x-prefixed hex
      return '0x' + Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')
    },
    [pair]
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return {
    status,
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    result,
    error,
    history,
    execute,
    sign,
    reset,
  }
}
