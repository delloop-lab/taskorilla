import Link from 'next/link'
import versionData from '@/version.json'

interface FooterProps {
  variant?: 'default' | 'centered'
}

export default function Footer({ variant = 'default' }: FooterProps) {
  const version = `Betar V${versionData.version}`

  if (variant === 'centered') {
    return (
      <footer className="py-8 px-4 bg-muted/50 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <p>© 2025 Taskorilla. All rights reserved. Swing responsibly.</p>
          <p className="mt-2 text-xs opacity-75">{version}</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="py-8 px-4 bg-muted/50 border-t border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
          <div className="flex flex-col gap-1">
            <p>© 2025 Taskorilla. All rights reserved. Swing responsibly.</p>
            <p className="text-xs opacity-75">{version}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/help" className="hover:text-foreground transition-colors">
              Help Center
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:tee@taskorilla.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

