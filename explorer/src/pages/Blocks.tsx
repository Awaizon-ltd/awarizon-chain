import { useEffect, useState } from 'react'
import { useLatestBlock, LatestBlock } from '../api/queries'
import { BlockRow } from '../components/blocks/BlockRow'

const MAX_BLOCKS = 15

export function Blocks() {
  const { data: block } = useLatestBlock()
  const [blocks, setBlocks] = useState<LatestBlock[]>([])

  useEffect(() => {
    if (block) {
      setBlocks((prev) => {
        if (prev[0]?.number === block.number) return prev
        return [block, ...prev].slice(0, MAX_BLOCKS)
      })
    }
  }, [block])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          Latest Blocks
        </span>
        <div className="flex-1 h-px bg-awz-border" />
        <span className="text-awz-gold text-xs font-mono">{blocks.length} / {MAX_BLOCKS}</span>
      </div>

      <div className="border border-awz-border rounded-lg overflow-hidden">
        {/* Column headers — hidden on mobile */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2.5 bg-awz-surface border-b border-awz-border">
          <span className="text-awz-muted text-xs font-mono uppercase tracking-wider">Height</span>
          <span className="text-awz-muted text-xs font-mono uppercase tracking-wider">Hash</span>
          <span className="text-awz-muted text-xs font-mono uppercase tracking-wider text-right">Time</span>
        </div>

        {blocks.length === 0 ? (
          <div className="py-16 text-center text-awz-muted text-xs font-mono">
            Awaiting blocks…
          </div>
        ) : (
          blocks.map((b) => (
            <BlockRow key={b.number} number={b.number} hash={b.hash} timestamp={b.timestamp} />
          ))
        )}
      </div>
    </div>
  )
}
