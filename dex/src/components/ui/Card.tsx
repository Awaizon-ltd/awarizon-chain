import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export default function Card({
  children,
  className = '',
  glow = false,
}: CardProps) {
  return (
    <div className={`
      glass rounded-2xl
      ${glow ? 'glow-purple' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}
