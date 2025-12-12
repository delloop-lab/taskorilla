'use client'

import { LanguageProvider } from '@/lib/i18n'

export default function LanguageProviderWrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}








