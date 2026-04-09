import type { Metadata } from 'next'
import HomePageV4 from '@/components/HomePageV4'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://taskorilla.com/',
  },
}

export default function LandingV4Page() {
  return <HomePageV4 />
}

