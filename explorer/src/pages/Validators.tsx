import { useActiveValidators, useValidatorPerformance } from '../api/queries'
import { Address } from '../components/ui/Address'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import type { ValidatorPerformanceResponse } from '@awarizon/sdk'

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
    <tr className="border-b border-awz-border hover:bg-awz-surface/40 transition-colors">
      <td className="px-4 py-3">
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
      <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          ACTIVE_VALIDATORS
        </span>
        <div className="flex-1 h-px bg-awz-border" />
        {validators && (
          <span className="text-awz-green text-xs font-mono">{validators.length} NODES</span>
        )}
      </div>

      {isLoading && (
        <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
      )}

      {!isLoading && (!validators || validators.length === 0) && (
        <EmptyState message="NO ACTIVE VALIDATORS" code="validator_set_empty" />
      )}

      {validators && validators.length > 0 && (
        <div className="border border-awz-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-awz-surface border-b border-awz-border">
                <th className="px-4 py-2 text-left text-awz-muted text-xs font-mono font-normal">
                  ADDRESS
                </th>
                <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">
                  SCORE
                </th>
                <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">
                  BLOCKS
                </th>
                <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">
                  UPTIME
                </th>
                <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">
                  SLASHES
                </th>
              </tr>
            </thead>
            <tbody>
              {validators.map((addr) => (
                <ValidatorRow key={addr as string} address={addr as string} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
