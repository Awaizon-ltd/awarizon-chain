import type { Metadata } from 'next'
import Hero from '../../components/marketing/Hero'
import FeatureGrid from '../../components/marketing/FeatureGrid'
import GrantCTA from '../../components/marketing/GrantCTA'

export const metadata: Metadata = {
  title: 'Awarizon Developer — Build and distribute apps on Awarizon',
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <GrantCTA />
    </>
  )
}
