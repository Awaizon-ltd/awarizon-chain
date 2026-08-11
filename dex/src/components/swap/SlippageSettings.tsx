import { useState } from 'react'
import { useDexStore } from '../../store/dexStore'
import { SLIPPAGE_PRESETS } from '../../constants'

export default function SlippageSettings() {
  const { slippageBps, setSlippage } = useDexStore()
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5
          bg-dex-surface border border-dex-border
          hover:border-purple-500 rounded-xl
          px-3 py-2 text-sm transition-all"
      >
        <span className="text-[#9999BB]">⚙</span>
        <span className="text-white font-medium">
          {slippageBps / 100}%
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-12
          glass rounded-xl p-4 w-64 z-50">
          <p className="text-sm font-semibold mb-3">
            Slippage Tolerance
          </p>
          <div className="flex gap-2 mb-3">
            {SLIPPAGE_PRESETS.map(preset => (
              <button
                key={preset.bps}
                onClick={() => {
                  setSlippage(preset.bps)
                  setCustom('')
                }}
                className={`
                  flex-1 py-2 rounded-lg text-sm
                  font-semibold transition-all
                  ${slippageBps === preset.bps
                    ? 'bg-purple-500 text-white'
                    : 'bg-dex-surface2 text-[#9999BB] hover:text-white'
                  }
                `}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={custom}
            onChange={e => {
              setCustom(e.target.value)
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v > 0 && v <= 50) {
                setSlippage(Math.round(v * 100))
              }
            }}
            placeholder="Custom %"
            className="w-full bg-dex-surface2
              border border-dex-border rounded-xl
              px-3 py-2 text-sm text-white
              placeholder-[#555577]
              focus:outline-none
              focus:border-purple-500"
          />
          {slippageBps > 100 && (
            <p className="text-yellow-400 text-xs mt-2">
              ⚠️ High slippage — transaction may be
              frontrun
            </p>
          )}
        </div>
      )}
    </div>
  )
}
