'use client'

import Navigation from '@/components/layout/Navigation'
import HeroSection from '@/components/marketing/HeroSection'
import HowItWorksSection from '@/components/marketing/HowItWorksSection'
import FeaturesSection from '@/components/marketing/FeaturesSection'
import ModernFooter from '@/components/layout/ModernFooter'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ModernFooter />
    </main>
  )
}