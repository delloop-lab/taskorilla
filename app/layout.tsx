import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taskorilla - Swing Into Action',
  description: 'A marketplace for posting and bidding on tasks',
  icons: {
    icon: '/images/taskorilla-mascot.png',
    shortcut: '/images/taskorilla-mascot.png',
    apple: '/images/taskorilla-mascot.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}



