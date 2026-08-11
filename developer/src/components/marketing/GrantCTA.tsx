import Link from 'next/link'
import { Award } from 'lucide-react'
import Button from '../ui/Button'

export default function GrantCTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
      <div className="glass rounded-2xl px-8 py-12 sm:px-14 sm:py-16
        flex flex-col sm:flex-row items-center gap-10 sm:gap-16">
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-black
            tracking-tight">
            Building something for the ecosystem?
          </h2>
          <p className="mt-4 text-[#999] leading-relaxed
            max-w-xl mx-auto sm:mx-0">
            The Awarizon Ecosystem Grant funds teams building apps,
            tooling, and infrastructure on top of the chain — from
            campaign integrations to entirely new categories of
            engagement. Tell us what you&apos;re building.
          </p>
          <Link href="/grant" className="inline-block mt-8">
            <Button size="lg">Apply for Ecosystem Grant</Button>
          </Link>
        </div>

        <div className="flex-shrink-0">
          <div className="animate-float-slow w-28 h-28 sm:w-36 sm:h-36
            rounded-3xl bg-yellow-400/10 ring-1 ring-yellow-400/30
            flex items-center justify-center">
            <Award className="w-14 h-14 sm:w-16 sm:h-16
              text-yellow-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </section>
  )
}
