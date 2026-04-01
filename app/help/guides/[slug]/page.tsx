'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useParams } from 'next/navigation'
import FAQAccordion from '@/components/FAQAccordion'
import GuideFeedbackButtons from '@/components/GuideFeedbackButtons'
import GuideStillNeedHelp from '@/components/GuideStillNeedHelp'
import { getGuideBySlug, getFAQsByCategory, getAllGuides, type Language } from '@/lib/help-utils'
import { useLanguage } from '@/lib/i18n'

export default function GuidePage() {
  const params = useParams()
  const slug = params.slug as string
  const { t, language } = useLanguage()
  const lang = language as Language
  
  // Try to find the guide in the current language first
  let guide = getGuideBySlug(slug, lang)
  
  // If not found, try the other language (for shared slugs from English titles)
  if (!guide) {
    guide = getGuideBySlug(slug, 'en')
    if (!guide) {
      guide = getGuideBySlug(slug, 'pt')
    }
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'pt' ? 'Guia não encontrado' : 'Guide not found'}
          </h1>
          <Link href="/help/guides" className="text-primary hover:underline">
            {language === 'pt' ? 'Voltar aos Guias' : 'Back to Guides'}
          </Link>
        </div>
      </div>
    )
  }

  // Get the translated version of the guide if we found it in a different language
  const translatedGuide = getGuideBySlug(slug, lang) || 
    getAllGuides(lang).find(g => g.id === guide!.id) || 
    guide

  useEffect(() => {
    if (translatedGuide?.title) {
      document.title = `${translatedGuide.title} | Taskorilla`
    }
  }, [translatedGuide?.title])

  // Get related FAQs from the same category in the current language
  const relatedFAQs = getFAQsByCategory(translatedGuide.category, lang).slice(0, 5)

  // Format content for better display
  const renderInlineMarkdown = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/)
    return parts.map((part, i) => {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
      if (linkMatch) {
        return (
          <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
            {linkMatch[1]}
          </a>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const parseMarkdownTable = (section: string) => {
    const lines = section.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return null
    const first = lines[0]
    const second = lines[1]
    if (!first.includes('|') || !second.includes('-')) return null
    const sep = second.replace(/\s/g, '')
    if (!/^\|?-+\|(-+\|)*\-*\|?$/.test(sep)) return null
    const headerCells = first.split('|').map((c) => c.trim()).filter(Boolean)
    const rows = lines.slice(2).map((line) => line.split('|').map((c) => c.trim()).filter(Boolean))
    return { headerCells, rows }
  }

  const renderTable = (table: { headerCells: string[]; rows: string[][] }, key: string) => (
    <div key={key} className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg text-sm">
        <thead>
          <tr className="bg-gray-50">
            {table.headerCells.map((cell, i) => (
              <th key={i} className="px-4 py-2 text-left font-semibold text-gray-900 border-b border-gray-200">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const isAccordionHeading = (section: string) => /^\*\*\d+\.\s+.+\*\*$/.test(section.trim())

  const isCtaParagraph = (text: string) => {
    const t = text.trim()
    return /post your task now at taskorilla\.com and let helpers come to you/i.test(t) ||
      /publique a sua tarefa em taskorilla\.com e deixe os ajudantes virem até si/i.test(t)
  }
  const ctaButtonLabel = language === 'pt'
    ? 'Publique a sua tarefa em taskorilla.com e deixe os ajudantes virem até si'
    : 'Post your task now at taskorilla.com and let helpers come to you'
  const renderCtaButton = (key: string) => (
    <div key={key} className="mt-8 mb-4 flex justify-center">
      <Link
        href="/tasks/new"
        className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg font-semibold text-white bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all text-center"
      >
        {ctaButtonLabel}
      </Link>
    </div>
  )

  const [openAccordionIndex, setOpenAccordionIndex] = useState<number | null>(0)

  const parseContent = (content: string) => {
    const sections = content.split('\n\n')
    const blocks: { type: 'heading' | 'table' | 'paragraph'; value: string; tableData?: { headerCells: string[]; rows: string[][] } }[] = []
    for (const section of sections) {
      const table = parseMarkdownTable(section)
      if (table) {
        blocks.push({ type: 'table', value: section, tableData: table })
      } else if (section.startsWith('**') && section.includes('**')) {
        blocks.push({ type: 'heading', value: section })
      } else {
        blocks.push({ type: 'paragraph', value: section })
      }
    }

    const accordionSections: { title: string; table: { headerCells: string[]; rows: string[][] } }[] = []
    const introNodes: React.ReactNode[] = []
    const outroNodes: React.ReactNode[] = []
    let i = 0
    let phase: 'intro' | 'accordion' | 'outro' = 'intro'

    while (i < blocks.length) {
      const b = blocks[i]
      if (b.type === 'heading' && isAccordionHeading(b.value)) {
        const title = b.value.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()
        const next = blocks[i + 1]
        if (next?.type === 'table' && next.tableData) {
          accordionSections.push({ title, table: next.tableData })
          phase = 'accordion'
          i += 2
          continue
        }
      }

      if (phase === 'accordion' && (b.type !== 'heading' || !isAccordionHeading(b.value))) {
        phase = 'outro'
      }

      if (phase === 'intro') {
        if (b.type === 'table' && b.tableData) {
          introNodes.push(<div key={`t-${i}`} className="mb-6">{renderTable(b.tableData, `t-${i}`)}</div>)
        } else if (b.type === 'heading') {
          const headingText = b.value.match(/\*\*(.*?)\*\*/)?.[1] || b.value
          const remainingText = b.value.replace(/\*\*(.*?)\*\*/, '').trim()
          introNodes.push(
            <div key={`h-${i}`} className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{headingText}</h3>
              {remainingText && <p className="text-gray-700 leading-relaxed">{renderInlineMarkdown(remainingText)}</p>}
            </div>
          )
        } else if (b.type === 'paragraph' && b.value.trim()) {
          if (isCtaParagraph(b.value)) {
            introNodes.push(renderCtaButton(`cta-${i}`))
          } else {
            introNodes.push(
              <p key={`p-${i}`} className="text-gray-700 leading-relaxed mb-4">
                {renderInlineMarkdown(b.value)}
              </p>
            )
          }
        }
      } else if (phase === 'outro') {
        if (b.type === 'table' && b.tableData) {
          outroNodes.push(<div key={`t-${i}`} className="mb-6">{renderTable(b.tableData, `t-${i}`)}</div>)
        } else if (b.type === 'heading') {
          const headingText = b.value.match(/\*\*(.*?)\*\*/)?.[1] || b.value
          const remainingText = b.value.replace(/\*\*(.*?)\*\*/, '').trim()
          outroNodes.push(
            <div key={`h-${i}`} className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{headingText}</h3>
              {remainingText && <p className="text-gray-700 leading-relaxed">{renderInlineMarkdown(remainingText)}</p>}
            </div>
          )
        } else if (b.type === 'paragraph' && b.value.trim()) {
          if (isCtaParagraph(b.value)) {
            outroNodes.push(renderCtaButton(`cta-${i}`))
          } else {
            outroNodes.push(
              <p key={`p-${i}`} className="text-gray-700 leading-relaxed mb-4">
                {renderInlineMarkdown(b.value)}
              </p>
            )
          }
        }
      }
      i++
    }

    return { accordionSections, introNodes, outroNodes }
  }

  const { accordionSections, introNodes, outroNodes } = parseContent(translatedGuide.content)

  const formatContent = () => (
    <>
      {introNodes}
      {accordionSections.length > 0 && (
        <div className="mb-8 space-y-3">
          {accordionSections.map((item, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenAccordionIndex(openAccordionIndex === idx ? null : idx)}
                className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-gray-50 text-left font-semibold text-gray-900"
              >
                <span>{item.title}</span>
                {openAccordionIndex === idx ? (
                  <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openAccordionIndex === idx && (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                  {renderTable(item.table, `acc-${idx}`)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {outroNodes}
    </>
  )

  const backToGuidesText = language === 'pt' ? 'Voltar aos Guias' : 'Back to Guides'
  const minReadText = language === 'pt' ? '📖 5 min de leitura' : '📖 5 min read'
  const wasHelpfulText = language === 'pt' ? 'Este guia foi útil?' : 'Was this guide helpful?'
  const relatedFaqsText = language === 'pt' ? 'Perguntas Frequentes Relacionadas' : 'Related FAQs'
  const viewAllFaqsText = language === 'pt' ? 'Ver todas as perguntas frequentes →' : 'View all FAQs →'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/help/guides" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {backToGuidesText}
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {translatedGuide.category}
            </span>
            <span className="text-sm opacity-75">{minReadText}</span>
          </div>
          <h1 className="text-4xl font-bold">{translatedGuide.title}</h1>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="prose prose-lg max-w-none">
              {formatContent()}
            </div>

            {/* Was this helpful? */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                {wasHelpfulText}
              </h3>
              <GuideFeedbackButtons
                guideId={translatedGuide.id}
                guideTitle={translatedGuide.title}
                guideSlug={slug}
                language={lang}
              />
            </div>
          </div>

          {/* Related FAQs */}
          {relatedFAQs.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {relatedFaqsText}
              </h2>
              <FAQAccordion items={relatedFAQs} />
              <div className="mt-6 text-center">
                <Link 
                  href="/help/faq"
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  {viewAllFaqsText}
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



