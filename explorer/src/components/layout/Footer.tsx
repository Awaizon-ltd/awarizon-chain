import { getEndpoint } from '../../api/client'

export function Footer() {
  return (
    <footer className="border-t border-awz-border bg-awz-surface mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-awz-muted text-xs font-mono">
            AWARIZON NETWORK EXPLORER
          </span>
          <span className="text-awz-muted text-xs font-mono">
            {getEndpoint()}
          </span>
        </div>
      </div>
    </footer>
  )
}
