import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { ValidatorInfo, TxResult } from '@awarizon/core'

export function useValidators(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [validators, setValidators] = useState<ValidatorInfo[]>([])
  const [myValidator, setMyValidator] = useState<ValidatorInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !connected) return
    try {
      setLoading(true)
      setError(null)
      const list = await core.validators.list()
      setValidators(list)
      if (effectiveAddress) {
        const mine = list.find(v => v.address === effectiveAddress) ?? null
        setMyValidator(mine)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load validators')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const register = useCallback(
    async (params: { stake: string; regionCode: number; countryCode: number }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to register as validator.')
      setActionLoading(true)
      try {
        const result = await core.validators.register({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const delegate = useCallback(
    async (params: { to: string; amount: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to delegate.')
      setActionLoading(true)
      try {
        const result = await core.validators.delegate({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const undelegate = useCallback(
    async (params: { from: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to undelegate.')
      setActionLoading(true)
      try {
        const result = await core.validators.undelegate({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const performance = useCallback(
    async (validatorAddress: string) => {
      if (!core) return null
      return core.validators.performance(validatorAddress)
    },
    [core]
  )

  const activeValidators = validators.filter(v => v.isActive)

  return {
    validators, activeValidators, myValidator,
    loading, actionLoading, error,
    register, delegate, undelegate, performance, refresh,
  }
}
