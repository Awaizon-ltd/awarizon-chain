interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export default function Button({
  children, onClick, disabled, loading,
  variant = 'primary', size = 'md',
  fullWidth, className = '',
}: ButtonProps) {
  const variants = {
    primary: `bg-yellow-400 hover:bg-yellow-500
      text-black font-bold shadow-yellow`,
    secondary: `bg-dev-surface hover:bg-dev-surface2
      text-white border border-dev-border`,
    danger: `bg-red-500/10 hover:bg-red-500/20
      text-red-400 border border-red-500/30`,
  }
  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-lg',
    md: 'text-sm px-4 py-2.5 rounded-xl',
    lg: 'text-base px-6 py-3 rounded-xl',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        gap-2 font-semibold transition-all
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4"
          fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      )}
      {children}
    </button>
  )
}
