import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import FAQAccordion from '@/components/FAQAccordion'
import GuideFeedbackButtons from '@/components/GuideFeedbackButtons'
import GuideStillNeedHelp from '@/components/GuideStillNeedHelp'
import { getGuideBySlug, getFAQsByCategory, slugify, getAllGuides } from '@/lib/help-utils'

export function generateStaticParams() {
  const guides = getAllGuides()
  return guides.map((guide) => ({
    slug: slugify(guide.title)
  }))
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuideBySlug(params.slug)

  if (!guide) {
    notFound()
  }

  // Get related FAQs from the same category
  const relatedFAQs = getFAQsByCategory(guide.category).slice(0, 5)

  // Format content for better display
  const formatContent = (content: string) => {
    return content.split('\n\n').map((section, index) => {
      // Check if it's a heading (starts with **)
      if (section.startsWith('**') && section.includes('**')) {
        const headingText = section.match(/\*\*(.*?)\*\*/)?.[1] || section
        const remainingText = section.replace(/\*\*(.*?)\*\*/, '').trim()
        
        return (
          <div key={index} className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">{headingText}</h3>
            {remainingText && <p className="text-gray-700 leading-relaxed">{remainingText}</p>}
          </div>
        )
      }
      
      return (
        <p key={index} className="text-gray-700 leading-relaxed mb-4">
          {section}
        </p>
      )
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help/guides" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Guides
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {guide.category}
            </span>
            <span className="text-sm opacity-75">📖 5 min read</span>
          </div>
          <h1 className="text-4xl font-bold">{guide.title}</h1>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="prose prose-lg max-w-none">
              {formatContent(guide.content)}
            </div>

            {/* Was this helpful? */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Was this guide helpful?
              </h3>
              <GuideFeedbackButtons guideTitle={guide.title} />
            </div>
          </div>

          {/* Related FAQs */}
          {relatedFAQs.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Related FAQs
              </h2>
              <FAQAccordion items={relatedFAQs} />
              <div className="mt-6 text-center">
                <Link 
                  href="/help/faq"
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  View all FAQs →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Still Need Help */}
      <GuideStillNeedHelp />
    </div>
  )
}



