interface CardProps {
  children: React.ReactNode
  highlight?: boolean
  className?: string
}

// Generic dark card shell — bg-[#111118] border-gray-800, matching the
// styling every hand-written page in this portal already uses inline.
export default function Card({ children, highlight, className = '' }: CardProps) {
  return (
    <div className={`
      bg-[#111118] border rounded-xl p-6
      ${highlight ? 'border-yellow-400/30' : 'border-gray-800'}
      ${className}
    `}>
      {children}
    </div>
  )
}
