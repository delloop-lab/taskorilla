import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface HelpCategoryCardProps {
  title: string
  icon: string
  description: string
  itemCount: number
  href: string
}

export default function HelpCategoryCard({
  title,
  icon,
  description,
  itemCount,
  href
}: HelpCategoryCardProps) {
  return (
    <Link href={href}>
      <div className="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all duration-300 h-full">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              {description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {itemCount} {itemCount === 1 ? 'article' : 'articles'}
              </span>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}




