import Link from 'next/link'

interface ServiceCardProps {
  emoji: string
  title: string
  subtitle: string
  href: string
}

export function ServiceCard({ emoji, title, subtitle, href }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-[#f5f5f5] px-4 py-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
    >
      <span className="text-4xl flex-shrink-0 w-11 text-center" role="img" aria-hidden="true">
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-gray-900 leading-snug">{title}</p>
        <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </Link>
  )
}
