import { createContext, useContext, type ReactNode } from 'react'
import { useIndexer } from './useIndexer'
import type { IndexerStatus } from './useIndexer'

const IndexerContext = createContext<IndexerStatus | null>(null)

export function IndexerProvider({ children }: { children: ReactNode }) {
  const status = useIndexer()
  return <IndexerContext.Provider value={status}>{children}</IndexerContext.Provider>
}

export function useIndexerStatus(): IndexerStatus {
  const ctx = useContext(IndexerContext)
  if (!ctx) throw new Error('useIndexerStatus must be inside <IndexerProvider>')
  return ctx
}
