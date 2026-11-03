import { useState } from 'react'
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import { useActiveValidators, useValidatorPerformance } from '../api/queries'
import { Address } from '../components/ui/Address'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel, SectionLabel } from '../components/ui/Panel'
import type { ValidatorPerformanceResponse } from '@awarizon/sdk'

const PAGE_SIZE = 15

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(1) + '%'
}

function ValidatorRow({ address }: { address: string }) {
  const { data: perf } = useValidatorPerformance(address)
  const p = perf as ValidatorPerformanceResponse | undefined

  const uptime = p ? p.uptime_bps / 100 : null
  const uptimeVariant =
    uptime === null ? 'muted' : uptime >= 95 ? 'green' : uptime >= 80 ? 'yellow' : 'red'

  return (
    <tr className="border-b border-awz-border last:border-0 hover:bg-awz-gold/5 transition-colors">
      <td className="px-5 py-3">
        <Address value={address} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-mono text-xs text-awz-text">
        {p ? p.performance_score.toLocaleString() : '—'}
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-mono text-xs text-awz-text">
        {p ? bpsToPercent(p.blocks_bps) : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        {uptime !== null ? (
          <Badge label={`${uptime.toFixed(1)}%`} variant={uptimeVariant} />
        ) : (
          <span className="text-awz-muted text-xs font-mono">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-right tabular-nums font-mono text-xs">
        {p ? (
          <span className={p.slash_count > 0 ? 'text-awz-red' : 'text-awz-muted'}>
            {p.slash_count}
          </span>
        ) : (
          <span className="text-awz-muted">—</span>
        )}
      </td>
    </tr>
  )
}

export function Validators() {
  const { data: validators, isLoading } = useActiveValidators()
  const [page, setPage] = useState(0)

  const allAddrs = (validators as string[] | undefined) ?? []
  const totalPages = Math.ceil(allAddrs.length / PAGE_SIZE)
  const pageAddrs  = allAddrs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel action={
        allAddrs.length > 0
          ? <span className="inline-flex items-center gap-1.5 text-awz-gold text-xs font-mono whitespace-nowrap">
              <Shield size={12} /> {allAddrs.length} nodes
            </span>
          : undefined
      }>
        Active Validators
      </SectionLabel>

      {isLoading && (
        <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
      )}

      {!isLoading && allAddrs.length === 0 && (
        <EmptyState message="NO ACTIVE VALIDATORS" code="validator_set_empty" />
      )}

      {pageAddrs.length > 0 && (
        <>
          <Panel>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-awz-bg/40 border-b border-awz-border">
                  <th className="px-5 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Address</th>
                  <th className="px-4 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Score</th>
                  <th className="px-4 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Blocks</th>
                  <th className="px-4 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Uptime</th>
                  <th className="px-5 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Slashes</th>
                </tr>
              </thead>
              <tbody>
                {pageAddrs.map((addr) => (
                  <ValidatorRow key={addr} address={addr} />
                ))}
              </tbody>
            </table>
          </Panel>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-awz-muted text-xs font-mono">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allAddrs.length)} of {allAddrs.length}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
