interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit'
}

export default function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  type = 'button',
}: ButtonProps) {
  const v = {
    primary: `bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-yellow`,
    secondary: `bg-rz-s2 hover:bg-rz-s3 text-white border border-rz-border`,
    ghost: `bg-transparent border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10`,
    danger: `bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20`,
  }
  const s = {
    sm: 'text-xs px-3 py-1.5 rounded-lg',
    md: 'text-sm px-4 py-2.5 rounded-xl',
    lg: 'text-base px-6 py-3.5 rounded-xl',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        gap-2 font-semibold transition-all
        disabled:opacity-40 disabled:cursor-not-allowed
        ${v[variant]} ${s[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
