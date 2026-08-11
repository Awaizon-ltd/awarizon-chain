// Color mapping for the plain-English labels produced by classifyExtrinsic()
// in src/api/queries.ts — keep the two in sync when adding a new category.
const TYPE_COLORS: Record<string, string> = {
  Transfer:                 'bg-awz-gold/10 text-awz-gold border-awz-gold/20',
  'Force Transfer':         'bg-awz-gold/10 text-awz-gold border-awz-gold/20',
  Balances:                 'bg-awz-gold/10 text-awz-gold border-awz-gold/20',
  System:                   'bg-awz-border/60 text-awz-muted border-awz-border',
  Admin:                    'bg-awz-red/10 text-awz-red border-awz-red/20',
  Batch:                    'bg-slate-500/10 text-slate-400 border-slate-500/20',
  Vesting:                  'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Contract Call':          'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Contract Deployment':    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Identity Registration':  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Identity Update':        'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Reputation Update':      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Name Transfer':          'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Linked Account':         'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Campaign:                 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Developer Registration': 'bg-green-500/10 text-green-400 border-green-500/20',
  'App Manifest':           'bg-green-500/10 text-green-400 border-green-500/20',
  'Ad Delivery':            'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Engagement:               'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Validator:                'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Delegation:               'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Reward Claim':           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Staking:                  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Slashing:                 'bg-awz-red/10 text-awz-red border-awz-red/20',
  Consensus:                'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Platform Activity':      'bg-awz-surface text-awz-muted border-awz-border',
}

interface TxTypeBadgeProps {
  type: string
  size?: 'sm' | 'xs'
}

export function TxTypeBadge({ type, size = 'sm' }: TxTypeBadgeProps) {
  const cls = TYPE_COLORS[type] ?? 'bg-awz-surface text-awz-muted border-awz-border'
  const sizeCls = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center ${sizeCls} rounded-full font-mono font-semibold uppercase tracking-wider border ${cls}`}>
      {type}
    </span>
  )
}
