'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FAQItem {
  id: string
  title: string
  content: string
}

interface FAQAccordionProps {
  items: FAQItem[]
  defaultOpen?: string | null
}

export default function FAQAccordion({ items, defaultOpen = null }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen)

  useEffect(() => {
    // Check if there's a hash in the URL and open that item
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1) // Remove the #
      if (hash && items.some(item => item.id === hash)) {
        setOpenId(hash)
        // Scroll to the element after a short delay to ensure it's rendered
        setTimeout(() => {
          const element = document.getElementById(hash)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }
  }, [items])

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div 
          key={item.id}
          id={item.id}
          className="border border-gray-200 rounded-lg overflow-hidden hover:border-primary/30 transition-colors scroll-mt-20"
        >
          <button
            onClick={() => toggleItem(item.id)}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors text-left"
          >
            <span className="font-semibold text-gray-900 pr-4">{item.title}</span>
            {openId === item.id ? (
              <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
          </button>
          {openId === item.id && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {item.content}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}




