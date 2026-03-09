import type { Metadata } from 'next'
import HomePage from '@/components/HomePage'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.taskorilla.com/',
  },
}

export default function Home() {
  return <HomePage />
}
