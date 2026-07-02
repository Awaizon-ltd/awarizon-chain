interface StatusDotProps {
  status: 'online' | 'offline' | 'pending'
}

const colors = {
  online: 'bg-awz-green',
  offline: 'bg-awz-red',
  pending: 'bg-awz-yellow',
}

export function StatusDot({ status }: StatusDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status]} ${status === 'online' ? 'animate-pulse' : ''}`}
    />
  )
}
