'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp, Download, MapPin } from 'lucide-react'
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
  const isInstitutionalPricingGuide = guide.id === 'guide-official-pricing-portugal-2026'

  // Format content for better display
  const renderInlineMarkdown = (text: string) => {
    const artigo53Tooltip =
      "Most individual helpers earn less than €15k/year and won't charge you VAT. If they do charge VAT, it's usually because they are a high-volume professional."
    const article151Tooltip =
      "Article 151 (CIRS): This is the official Portuguese classification for \"High-Value Professional Activities.\" It includes regulated trades like Engineers, Certified Electricians, Architects, and Healthcare Providers. Unlike general tasks, these professionals are subject to specific \"Professional Coefficients\" for tax purposes and usually operate under mandatory professional associations (Ordem)."
    const parts = text.split(/(\[.*?\]\(.*?\))/)
    return parts.map((part, i) => {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {linkMatch[1]}
          </a>
        )
      }
      const phraseParts = part.split(/(Artigo 53|Article 53|Article 151 of the PIT Code)/g)
      return (
        <span key={i}>
          {phraseParts.map((chunk, j) =>
            chunk === 'Artigo 53' || chunk === 'Article 53' ? (
              <span
                key={`${i}-${j}`}
                title={artigo53Tooltip}
                className="underline decoration-dotted cursor-help"
              >
                {chunk}
              </span>
            ) : chunk === 'Article 151 of the PIT Code' ? (
              <span
                key={`${i}-${j}`}
                title={article151Tooltip}
                className="underline decoration-dotted cursor-help"
              >
                {chunk}
              </span>
            ) : (
              <span key={`${i}-${j}`}>{chunk}</span>
            )
          )}
        </span>
      )
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
    <div key={key} className="overflow-x-auto print:overflow-visible print:[break-inside:avoid] print:[page-break-inside:avoid]">
      <table
        className={`w-full border border-gray-200 rounded-lg text-sm print:text-xs ${
          isInstitutionalPricingGuide && table.headerCells[0]?.toLowerCase().includes('region')
            ? 'table-fixed '
            : ''
        }${
          isInstitutionalPricingGuide && table.headerCells[0]?.toLowerCase().includes('region')
            ? 'border-t-2 border-b-2 border-slate-500'
            : ''
        }`}
      >
        {table.headerCells.length === 3 &&
          isInstitutionalPricingGuide &&
          table.headerCells[0]?.toLowerCase().includes('region') && (
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/3" />
              <col className="w-1/3" />
            </colgroup>
          )}
        <thead>
          <tr className={`bg-gray-50 ${isInstitutionalPricingGuide ? 'bg-slate-50' : ''}`}>
            {table.headerCells.map((cell, i) => (
              <th
                key={i}
                className={`px-4 py-2 text-left font-semibold text-gray-900 border-b border-gray-200 ${
                  table.headerCells.length === 3
                    ? (isInstitutionalPricingGuide && table.headerCells[0]?.toLowerCase().includes('region')
                      ? 'w-1/3'
                      : i === 0 ? 'w-[50%]' : i === 2 ? 'w-[20%]' : 'w-[30%]')
                    : table.headerCells.length === 2
                      ? (i === 0 ? 'w-[65%]' : 'w-[35%]')
                      : ''
                }`}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
              {row.length === 1 ? (
                <td
                  colSpan={table.headerCells.length}
                  className="px-4 py-2 text-gray-700 align-top italic bg-gray-50"
                >
                  {row[0]}
                </td>
              ) : (
                row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-2 text-gray-700 align-top ${
                      table.headerCells.length === 3
                        ? (isInstitutionalPricingGuide && table.headerCells[0]?.toLowerCase().includes('region')
                          ? 'w-1/3'
                          : j === 0 ? 'w-[50%]' : j === 2 ? 'w-[20%]' : 'w-[30%]')
                        : table.headerCells.length === 2
                          ? (j === 0 ? 'w-[65%]' : 'w-[35%]')
                          : ''
                    }`}
                  >
                    {cell}
                  </td>
                ))
              )}
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
  const isSectionNoteParagraph = (text: string) => /^note:/i.test(text.trim())
  const sectionIdFromTitle = (title: string) =>
    title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim()
  const ctaButtonLabel = language === 'pt'
    ? 'Publique a sua tarefa em taskorilla.com e deixe os ajudantes virem até si'
    : 'Post your task now at taskorilla.com and let helpers come to you'
  const renderCtaButton = (key: string) => (
    <div key={key} className="mt-12 mb-12 flex justify-center">
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

    const accordionSections: { title: string; table: { headerCells: string[]; rows: string[][] }; note?: string }[] = []
    const introNodes: React.ReactNode[] = []
    const outroNodes: React.ReactNode[] = []
    let i = 0
    let phase: 'intro' | 'accordion' | 'outro' = 'intro'
    let lastIntroWasTable = false
    let lastOutroWasTable = false

    while (i < blocks.length) {
      const b = blocks[i]
      if (b.type === 'heading' && isAccordionHeading(b.value)) {
        const title = b.value.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()
        const next = blocks[i + 1]
        if (next?.type === 'table' && next.tableData) {
          const afterTable = blocks[i + 2]
          const note = afterTable?.type === 'paragraph' && isSectionNoteParagraph(afterTable.value)
            ? afterTable.value.trim()
            : undefined
          accordionSections.push({ title, table: next.tableData, note })
          phase = 'accordion'
          i += note ? 3 : 2
          continue
        }
      }

      if (phase === 'accordion' && (b.type !== 'heading' || !isAccordionHeading(b.value))) {
        phase = 'outro'
      }

      if (phase === 'intro') {
        if (b.type === 'table' && b.tableData) {
          introNodes.push(<div key={`t-${i}`} className="mb-6">{renderTable(b.tableData, `t-${i}`)}</div>)
          lastIntroWasTable = true
        } else if (b.type === 'heading') {
          const headingText = b.value.match(/\*\*(.*?)\*\*/)?.[1] || b.value
          const remainingText = b.value.replace(/\*\*(.*?)\*\*/, '').trim()
          const isDocumentTitleHeading =
            isInstitutionalPricingGuide &&
            /taskorilla service price index - portugal 2nd quarter 2026/i.test(headingText)
          introNodes.push(
            <div key={`h-${i}`} className="mb-6">
              <h3 className={`${isDocumentTitleHeading ? 'text-4xl md:text-5xl leading-tight' : 'text-xl'} font-bold text-gray-900 mb-3 ${isInstitutionalPricingGuide ? 'font-serif' : ''}`}>
                {isInstitutionalPricingGuide && /regional pricing adjustments/i.test(headingText) ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-700" />
                    {headingText}
                  </span>
                ) : (
                  headingText
                )}
              </h3>
              {remainingText && <p className="text-gray-700 leading-relaxed">{renderInlineMarkdown(remainingText)}</p>}
            </div>
          )
          lastIntroWasTable = false
        } else if (b.type === 'paragraph' && b.value.trim()) {
          if (isCtaParagraph(b.value)) {
            introNodes.push(renderCtaButton(`cta-${i}`))
            lastIntroWasTable = false
          } else if (lastIntroWasTable && isSectionNoteParagraph(b.value)) {
            const noteText = b.value.replace(/^note:\s*/i, '').trim()
            introNodes.push(
              <div
                key={`note-${i}`}
                className="-mt-6 mb-6 px-4 py-3 text-slate-950"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-950 font-semibold mb-1">Note</p>
                <p className="font-medium">{renderInlineMarkdown(noteText)}</p>
              </div>
            )
            lastIntroWasTable = false
          } else {
            introNodes.push(
              <p key={`p-${i}`} className="text-gray-700 leading-relaxed mb-4">
                {renderInlineMarkdown(b.value)}
              </p>
            )
            lastIntroWasTable = false
          }
        }
      } else if (phase === 'outro') {
        if (b.type === 'table' && b.tableData) {
          outroNodes.push(<div key={`t-${i}`} className="mb-6">{renderTable(b.tableData, `t-${i}`)}</div>)
          lastOutroWasTable = true
        } else if (b.type === 'heading') {
          const headingText = b.value.match(/\*\*(.*?)\*\*/)?.[1] || b.value
          const remainingText = b.value.replace(/\*\*(.*?)\*\*/, '').trim()
          const isDocumentTitleHeading =
            isInstitutionalPricingGuide &&
            /taskorilla service price index - portugal 2nd quarter 2026/i.test(headingText)
          outroNodes.push(
            <div key={`h-${i}`} className="mb-6">
              <h3 className={`${isDocumentTitleHeading ? 'text-4xl md:text-5xl leading-tight' : 'text-xl'} font-bold text-gray-900 mb-3 ${isInstitutionalPricingGuide ? 'font-serif' : ''}`}>
                {isInstitutionalPricingGuide && /regional pricing adjustments/i.test(headingText) ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-700" />
                    {headingText}
                  </span>
                ) : (
                  headingText
                )}
              </h3>
              {remainingText && <p className="text-gray-700 leading-relaxed">{renderInlineMarkdown(remainingText)}</p>}
            </div>
          )
          lastOutroWasTable = false
        } else if (b.type === 'paragraph' && b.value.trim()) {
          if (isCtaParagraph(b.value)) {
            outroNodes.push(renderCtaButton(`cta-${i}`))
            lastOutroWasTable = false
          } else if (lastOutroWasTable && isSectionNoteParagraph(b.value)) {
            const noteText = b.value.replace(/^note:\s*/i, '').trim()
            outroNodes.push(
              <div
                key={`note-${i}`}
                className="-mt-6 mb-6 px-4 py-3 text-slate-950"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-950 font-semibold mb-1">Note</p>
                <p className="font-medium">{renderInlineMarkdown(noteText)}</p>
              </div>
            )
            lastOutroWasTable = false
          } else {
            outroNodes.push(
              <p key={`p-${i}`} className="text-gray-700 leading-relaxed mb-4">
                {renderInlineMarkdown(b.value)}
              </p>
            )
            lastOutroWasTable = false
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
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-primary/30 transition-colors print:border-gray-300 print:[break-inside:avoid] print:[page-break-inside:avoid]"
            >
              <h3 className="hidden print:block text-base font-bold text-gray-900 px-0 py-2">
                {item.title}
              </h3>
              <button
                type="button"
                onClick={() => setOpenAccordionIndex(openAccordionIndex === idx ? null : idx)}
                className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-gray-50 text-left font-semibold text-gray-900 print:hidden"
              >
                <span>{item.title}</span>
                {openAccordionIndex === idx ? (
                  <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              <div className={`${openAccordionIndex === idx ? 'block' : 'hidden'} print:block px-5 py-4 bg-gray-50 border-t border-gray-200 print:bg-white`}>
                {renderTable(item.table, `acc-${idx}`)}
                {item.note && (
                  <div
                    className="mt-0 px-4 py-3 text-slate-950"
                    style={{ backgroundColor: '#F8FAFC' }}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-slate-600 font-semibold mb-1">Note</p>
                    <p className="font-medium">{renderInlineMarkdown(item.note.replace(/^note:\s*/i, '').trim())}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {outroNodes}
    </>
  )

  const formatInstitutionalContent = () => (
    <>
      {introNodes}
      {accordionSections.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <aside className="hidden lg:block lg:col-span-3 print:hidden">
            <div className="sticky top-24 border border-slate-200 rounded-lg bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-600 font-semibold mb-3">Table of Contents</p>
              <nav className="space-y-2">
                {accordionSections.map((item) => (
                  <a
                    key={item.title}
                    href={`#${sectionIdFromTitle(item.title)}`}
                    className="block text-sm text-slate-700 hover:text-slate-900"
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
          <div className="lg:col-span-9 space-y-6">
            {accordionSections.map((item, idx) => (
              <section
                id={sectionIdFromTitle(item.title)}
                key={idx}
                className="border border-slate-200 rounded-lg overflow-hidden print:border-gray-300 print:[break-inside:avoid] print:[page-break-inside:avoid]"
              >
                <div className="px-5 py-4 bg-white border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 font-serif">{item.title}</h3>
                </div>
                <div className="px-5 py-4 bg-slate-50 print:bg-white">
                  {renderTable(item.table, `inst-${idx}`)}
                  {item.note && (
                    <div
                      className="mt-0 px-4 py-3 text-slate-950"
                      style={{ backgroundColor: '#F8FAFC' }}
                    >
                      <p className="text-[11px] uppercase tracking-wide text-slate-950 font-semibold mb-1">Note</p>
                      <p className="font-medium">{renderInlineMarkdown(item.note.replace(/^note:\s*/i, '').trim())}</p>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
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
  const downloadPdfText = language === 'pt' ? 'Descarregar como PDF' : 'Download as PDF'

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <section className={`${isInstitutionalPricingGuide ? 'bg-[#1B365D]' : 'bg-gradient-to-br from-primary to-accent'} text-white py-8 px-4 print:hidden`}>
        <div className="container mx-auto max-w-6xl">
          <Link href="/help/guides" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {backToGuidesText}
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {translatedGuide.category}
            </span>
            {!isInstitutionalPricingGuide && <span className="text-sm opacity-75">{minReadText}</span>}
          </div>
          <h1 className="text-4xl font-bold">{translatedGuide.title}</h1>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-12 px-4 print:py-0 print:px-0">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-lg shadow-md p-8 mb-8 print:shadow-none print:rounded-none print:p-0 print:mb-0">
            <div className={`mb-8 flex print:hidden ${isInstitutionalPricingGuide ? 'justify-between items-center gap-4' : 'justify-end'}`}>
              <button
                type="button"
                onClick={() => {
                  if (isInstitutionalPricingGuide) {
                    window.open('/taskorilla-service-price-index-portugal-2026.html', '_blank')
                    return
                  }
                  window.print()
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                {downloadPdfText}
              </button>
            </div>
            {isInstitutionalPricingGuide && (
              <div className="mb-10 text-center border-b border-slate-200 pb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-serif">
                  Taskorilla Service Price Index
                </h2>
                <p className="mt-2 inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                  Ref: PT-2026-V2 | Issued: 2nd Quarter 2026
                </p>
              </div>
            )}
            <div className="prose prose-lg max-w-none">
              {isInstitutionalPricingGuide ? formatInstitutionalContent() : formatContent()}
            </div>

            {/* Was this helpful? */}
            <div className="mt-12 pt-8 border-t border-gray-200 print:hidden">
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
            <div className="bg-white rounded-lg shadow-md p-8 print:hidden">
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
      <div className="print:hidden">
        <GuideStillNeedHelp />
      </div>
    </div>
  )
}



