'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ValidatorInfo, ValidatorPerformance } from 'awarizon.js'
import { useChain } from './useChain'

interface UseValidatorResult {
  validator: ValidatorInfo | null
  performance: ValidatorPerformance | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Looks up a single validator's info + performance by address. list()
// only returns *active* validators (see awarizon.js ValidatorsModule),
// which is fine here — register_validator flips is_active true
// immediately, so a freshly-registered validator shows up right away.
export function useValidator(address: string | null): UseValidatorResult {
  const { provider } = useChain()
  const [validator, setValidator] = useState<ValidatorInfo | null>(null)
  const [performance, setPerformance] = useState<ValidatorPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!provider || !address) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      provider.validators.list(),
      provider.validators.performance(address),
    ])
      .then(([list, perf]) => {
        if (cancelled) return
        setValidator(list.find(v => v.address === address) ?? null)
        setPerformance(perf)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [provider, address, tick])

  return { validator, performance, loading, error, refetch }
}
