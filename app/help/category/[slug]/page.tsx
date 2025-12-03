import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { notFound } from 'next/navigation'
import FAQAccordion from '@/components/FAQAccordion'
import { getCategories, getFAQsByCategory, getGuidesByCategory, getCategoryIcon, getCategoryDescription, slugify } from '@/lib/help-utils'

export function generateStaticParams() {
  const categories = getCategories()
  return categories.map((category) => ({
    slug: slugify(category)
  }))
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const categories = getCategories()
  const category = categories.find(cat => slugify(cat) === params.slug)

  if (!category) {
    notFound()
  }

  const faqs = getFAQsByCategory(category)
  const guides = getGuidesByCategory(category)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Help Center
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{getCategoryIcon(category)}</span>
            <div>
              <h1 className="text-4xl font-bold">{category}</h1>
              <p className="text-xl opacity-90 mt-2">
                {getCategoryDescription(category)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Guides Section */}
          {guides.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Guides</h2>
              <div className="grid gap-6 mb-8">
                {guides.map((guide) => (
                  <Link 
                    key={guide.id}
                    href={`/help/guides/${slugify(guide.title)}`}
                    className="block bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-2">
                          {guide.title}
                        </h3>
                        <p className="text-gray-600 line-clamp-2">
                          {guide.content.substring(0, 150)}...
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQs Section */}
          {faqs.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Frequently Asked Questions</h2>
              <FAQAccordion items={faqs} />
            </div>
          )}

          {/* Empty State */}
          {faqs.length === 0 && guides.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-6">
                No content available for this category yet.
              </p>
              <Link 
                href="/help"
                className="text-primary hover:text-primary/80 font-medium"
              >
                ← Back to Help Center
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}




