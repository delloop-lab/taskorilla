'use client'

import { useRef, useEffect } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link, AlignLeft, AlignCenter, AlignRight, Undo, Redo } from 'lucide-react'

interface EmailTemplateEditorProps {
  value: string
  onChange: (content: string) => void
  height?: number
}

export default function EmailTemplateEditor({
  value,
  onChange,
  height = 400,
}: EmailTemplateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isUpdatingRef = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML
      const newContent = value || ''
      if (currentContent !== newContent) {
        editorRef.current.innerHTML = newContent
      }
    }
  }, [value])

  // Normalize HTML - convert divs to <br> tags to preserve exact spacing
  const normalizeHTML = (html: string): string => {
    if (!html || !html.trim()) return ''
    
    // Create a temporary div to parse and normalize
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Convert all divs to <br> tags (preserves line breaks without extra spacing)
    const allDivs = Array.from(temp.querySelectorAll('div'))
    allDivs.forEach(div => {
      // If div is empty, replace with <br>
      if (!div.innerHTML.trim()) {
        const br = document.createElement('br')
        div.parentNode?.replaceChild(br, div)
      } else {
        // If div has content, insert content + <br> before it, then remove div
        const br = document.createElement('br')
        div.parentNode?.insertBefore(br, div)
        // Move children out of div
        while (div.firstChild) {
          div.parentNode?.insertBefore(div.firstChild, div)
        }
        div.parentNode?.removeChild(div)
      }
    })
    
    // Convert paragraphs to <br> tags as well (no spacing)
    const allParagraphs = Array.from(temp.querySelectorAll('p'))
    allParagraphs.forEach(p => {
      if (!p.innerHTML.trim()) {
        const br = document.createElement('br')
        p.parentNode?.replaceChild(br, p)
      } else {
        const br = document.createElement('br')
        p.parentNode?.insertBefore(br, p)
        // Move children out of paragraph
        while (p.firstChild) {
          p.parentNode?.insertBefore(p.firstChild, p)
        }
        p.parentNode?.removeChild(p)
      }
    })
    
    // Get normalized HTML
    let normalized = temp.innerHTML
    
    // Clean up empty tags
    normalized = normalized.replace(/<p>\s*<\/p>/gi, '')
    normalized = normalized.replace(/<div>\s*<\/div>/gi, '')
    
    // Replace multiple consecutive <br> tags (more than 2) with just 2
    normalized = normalized.replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
    
    return normalized
  }

  const handleInput = () => {
    if (editorRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true
      const rawHTML = editorRef.current.innerHTML
      
      // Normalize the HTML to ensure line breaks are preserved
      const normalizedHTML = normalizeHTML(rawHTML)
      
      onChange(normalizedHTML)
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    }
  }

  // Handle Enter key to insert proper line breaks
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Prevent default to control the behavior
      e.preventDefault()
      
      // Insert a paragraph break
      document.execCommand('insertParagraph', false)
      
      // Normalize after insertion
      setTimeout(() => {
        handleInput()
      }, 0)
    }
  }

  const execCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value || undefined)
    editorRef.current?.focus()
    handleInput()
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={insertLink}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Link"
        >
          <Link className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('undo')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('redo')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onKeyDown={handleKeyDown}
        style={{ 
          minHeight: `${height}px`,
          whiteSpace: 'pre-wrap', // Preserve whitespace and line breaks
        }}
        className="p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-sm max-w-none"
        suppressContentEditableWarning
      />

      {/* Footer with variable hints */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <strong>Available variables:</strong> {'{{user_name}}'}, {'{{user_email}}'}, {'{{registration_date}}'}, {'{{tee_image}}'} (mascot)
      </div>
    </div>
  )
}
