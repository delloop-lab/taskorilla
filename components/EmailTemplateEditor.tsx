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

  // Normalize HTML - preserve line breaks and paragraph structure for email rendering
  const normalizeHTML = (html: string): string => {
    if (!html || !html.trim()) return ''
    
    // Create a temporary div to parse and normalize
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Convert all divs to paragraphs (better email client support)
    // This preserves the line break structure that contentEditable creates
    const allDivs = Array.from(temp.querySelectorAll('div'))
    allDivs.forEach(div => {
      // If div is empty or only contains whitespace, replace with <br> for blank lines
      if (!div.innerHTML.trim() && !div.textContent?.trim()) {
        const br = document.createElement('br')
        div.parentNode?.replaceChild(br, div)
      } else {
        // Convert div to paragraph to preserve structure and line breaks
        const p = document.createElement('p')
        p.innerHTML = div.innerHTML
        div.parentNode?.replaceChild(p, div)
      }
    })
    
    // Process paragraphs - preserve them as they represent line breaks
    const allParagraphs = Array.from(temp.querySelectorAll('p'))
    allParagraphs.forEach(p => {
      // If paragraph is completely empty, replace with <br> for blank line
      if (!p.innerHTML.trim() && !p.textContent?.trim()) {
        const br = document.createElement('br')
        p.parentNode?.replaceChild(br, p)
      }
      // Otherwise keep the paragraph - it represents a line break
    })
    
    // Get normalized HTML
    let normalized = temp.innerHTML
    
    // Clean up completely empty tags (shouldn't happen after processing, but just in case)
    normalized = normalized.replace(/<p>\s*<\/p>/gi, '<br>')
    normalized = normalized.replace(/<div>\s*<\/div>/gi, '<br>')
    
    // Preserve <br> tags - don't collapse them excessively
    // Allow up to 3 consecutive <br> tags (for intentional blank lines)
    // Collapse only if there are more than 3
    normalized = normalized.replace(/(<br\s*\/?>){4,}/gi, '<br><br><br>')
    
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
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() || ''
    
    // Get the URL from user
    let url = prompt('Enter URL:', selectedText || 'https://')
    if (!url) return
    
    // Validate and normalize URL
    url = url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
      url = 'https://' + url
    }
    
    // Get link text - use selected text if available, otherwise ask or use URL
    let linkText = selectedText
    if (!linkText) {
      const textInput = prompt('Enter link text (or leave empty to use URL):', url)
      linkText = textInput?.trim() || url
    }
    
    // Escape HTML in link text to prevent XSS (but not the URL)
    const escapeHTML = (text: string) => {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }
    
    // Escape URL attributes (but preserve the URL structure)
    const escapeURL = (url: string) => {
      return url.replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
    }
    
    // Create the link HTML
    const linkHTML = `<a href="${escapeURL(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(linkText)}</a>`
    
    try {
      // If text is selected, replace it with the link
      if (selection && selection.rangeCount > 0 && selectedText) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = linkHTML
        const linkNode = tempDiv.firstChild
        
        if (linkNode) {
          range.insertNode(linkNode)
          // Move cursor after the link
          range.setStartAfter(linkNode)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      } else {
        // Insert at cursor position or at end
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const container = range.commonAncestorContainer
          
          // Check if cursor is in editor
          if (editorRef.current.contains(container) || container === editorRef.current) {
            range.deleteContents()
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = linkHTML
            const linkNode = tempDiv.firstChild
            
            if (linkNode) {
              range.insertNode(linkNode)
              // Move cursor after the link
              range.setStartAfter(linkNode)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
            }
          } else {
            // Fallback: insert at end
            editorRef.current.innerHTML += linkHTML
          }
        } else {
          // No selection, insert at end
          editorRef.current.innerHTML += linkHTML
        }
      }
      
      editorRef.current.focus()
      handleInput()
    } catch (error) {
      console.error('Error inserting link:', error)
      // Fallback: just append the link HTML
      editorRef.current.innerHTML += linkHTML
      handleInput()
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
