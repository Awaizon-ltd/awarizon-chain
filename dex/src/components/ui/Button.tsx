import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
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
}: ButtonProps) {
  const base = `
    inline-flex items-center justify-center
    font-semibold rounded-xl transition-all
    duration-150 cursor-pointer
    disabled:opacity-40 disabled:cursor-not-allowed
  `

  const variants = {
    primary: `
      bg-purple-500 hover:bg-purple-600
      text-white shadow-purple
      hover:shadow-purple-lg
    `,
    secondary: `
      bg-dex-surface2 hover:bg-dex-border
      text-white border border-dex-border
    `,
    ghost: `
      bg-transparent hover:bg-dex-surface2
      text-purple-400 hover:text-purple-300
    `,
  }

  const sizes = {
    sm: 'text-sm px-3 py-2',
    md: 'text-sm px-4 py-3',
    lg: 'text-base px-6 py-4',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${base}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin w-4 h-4"
            fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25" cx="12" cy="12"
              r="10" stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  )
}
