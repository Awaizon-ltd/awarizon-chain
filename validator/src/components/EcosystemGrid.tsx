import { ECOSYSTEM_APPS } from '../lib/constants'

// Real, live sibling apps in the same Awarizon workspace — the visual
// slot a metrics site would give third-party partner logos.
export default function EcosystemGrid() {
  return (
    <div className="bg-[#161029] border border-gray-800 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-1">Awarizon Ecosystem</h2>
      <p className="text-sm text-gray-500 mb-6">
        Other apps running on the same testnet.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {ECOSYSTEM_APPS.map(app => (
          <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer"
            className="bg-[#0d0a1f] border border-gray-800 rounded-xl p-4
              hover:border-yellow-400/40 transition-colors">
            <p className="font-bold text-sm mb-1">{app.name}</p>
            <p className="text-xs text-gray-500">{app.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
