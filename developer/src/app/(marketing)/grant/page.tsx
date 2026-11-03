import type { Metadata } from 'next'
import GrantForm from '../../../components/marketing/GrantForm'

export const metadata: Metadata = {
  title: 'Ecosystem Grant',
  description:
    'Apply for an Awarizon Ecosystem Grant — funding for apps, ' +
    'tooling, and infrastructure built on the Awarizon chain.',
}

export default function GrantPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Apply for an Ecosystem Grant
        </h1>
        <p className="mt-4 text-[#999] max-w-xl mx-auto leading-relaxed">
          Tell us what you&apos;re building. Applications are reviewed
          on a rolling basis by the Awarizon ecosystem team.
        </p>
      </div>

      <GrantForm />
    </div>
  )
}
