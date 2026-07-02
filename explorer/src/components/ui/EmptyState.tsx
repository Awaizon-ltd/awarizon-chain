interface EmptyStateProps {
  message: string
  code?: string
}

export function EmptyState({ message, code = 'NO_DATA' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-awz-muted">
      <div className="text-xs uppercase tracking-widest mb-2">{code}</div>
      <div className="text-sm">{message}</div>
    </div>
  )
}
