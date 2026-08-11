const SECTIONS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'provider-signer', label: 'Provider & Signer' },
  { id: 'react-hooks', label: 'React Hooks' },
  { id: 'app-sdk', label: '@awarizon/app' },
  { id: 'app-sdk-config', label: 'App Config' },
  { id: 'app-sdk-methods', label: 'App Methods' },
  { id: 'errors', label: 'Error Handling' },
  { id: 'kendra', label: 'Kendra CLI' },
  { id: 'kendra-commands', label: 'Kendra Commands' },
  { id: 'kendra-config', label: 'Kendra Config & API' },
  { id: 'token-list', label: 'Token List' },
  { id: 'related-packages', label: 'Related Packages' },
]

export default function DocsToc() {
  return (
    <nav className="hidden lg:block sticky top-24 self-start
      w-52 flex-shrink-0 pr-4">
      <p className="text-[11px] uppercase tracking-wider
        text-[#555] mb-3 font-semibold">
        On this page
      </p>
      <ul className="space-y-1 border-l border-dev-border">
        {SECTIONS.map(s => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block pl-4 -ml-px py-1.5 text-sm
                text-[#888] hover:text-yellow-400
                border-l border-transparent hover:border-yellow-400
                transition-colors"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
