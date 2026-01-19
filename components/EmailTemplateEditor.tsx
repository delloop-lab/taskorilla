'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useEffect, useState } from 'react'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Undo,
  Redo
} from 'lucide-react'

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
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component only renders on client side
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure paragraph to have minimal margins for email
        paragraph: {
          HTMLAttributes: {
            style: 'margin: 0.5em 0; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; max-width: 100%;',
          },
        },
        // Configure list items to have minimal spacing
        bulletList: {
          HTMLAttributes: {
            style: 'margin: 0.5em 0; padding-left: 1.5em;',
          },
        },
        orderedList: {
          HTMLAttributes: {
            style: 'margin: 0.5em 0; padding-left: 1.5em;',
          },
        },
        // Enable hard break for Shift+Enter line breaks
        hardBreak: {
          HTMLAttributes: {
            style: 'line-height: 1.6;',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: value || '',
    immediatelyRender: false, // Fix SSR hydration issue
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-4',
        style: `min-height: ${height}px;`,
      },
      handleKeyDown: (view, event) => {
        // Allow Shift+Enter or Ctrl+Enter for line breaks
        if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey)) {
          editor?.chain().focus().setHardBreak().run()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Get HTML from Tiptap (already clean)
      const html = editor.getHTML()
      onChange(html)
    },
  }, [isMounted]) // Only create editor after mount

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (!editor || !isMounted) return
    
    const currentHTML = editor.getHTML()
    // Only update if the content is actually different to avoid loops
    if (value !== undefined && currentHTML !== value && value !== '') {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor, isMounted])

  // Show loading state until mounted and editor is ready
  if (!isMounted || !editor) {
    return (
      <div className="border border-gray-300 rounded-lg p-4" style={{ minHeight: `${height}px` }}>
        <div className="animate-pulse text-gray-400">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          }`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          }`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive('underline') ? 'bg-gray-300' : ''
          }`}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          }`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''
          }`}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''
          }`}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''
          }`}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={`p-2 hover:bg-gray-200 rounded transition-colors ${
            editor.isActive('link') ? 'bg-gray-300' : ''
          }`}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-2 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-2 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* Editor */}
      <div className="focus-within:ring-2 focus-within:ring-blue-500">
        <EditorContent 
          editor={editor}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            .ProseMirror {
              outline: none;
              padding: 1rem;
              min-height: ${height}px;
            }
            .ProseMirror p {
              margin: 0.5em 0;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
              max-width: 100%;
            }
            .ProseMirror p:first-child {
              margin-top: 0;
            }
            .ProseMirror p:last-child {
              margin-bottom: 0;
            }
            .ProseMirror ul {
              margin: 0.5em 0;
              padding-left: 1.5em;
              list-style-type: disc !important;
              display: block !important;
            }
            .ProseMirror ol {
              margin: 0.5em 0;
              padding-left: 1.5em;
              list-style-type: decimal !important;
              display: block !important;
            }
            .ProseMirror li {
              margin: 0.1em 0;
              padding: 0;
              display: list-item !important;
              list-style-position: outside !important;
            }
            .ProseMirror li p {
              margin: 0.2em 0;
              display: inline;
            }
            .ProseMirror ul ul {
              list-style-type: circle !important;
            }
            .ProseMirror ul ul ul {
              list-style-type: square !important;
            }
            .ProseMirror a {
              color: #2563eb;
              text-decoration: underline;
            }
            .ProseMirror strong {
              font-weight: 600;
            }
            .ProseMirror em {
              font-style: italic;
            }
            .ProseMirror u {
              text-decoration: underline;
            }
          `
        }} />
      </div>

      {/* Footer with variable hints */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <strong>Available variables:</strong>{' '}
        {['{{user_name}}', '{{user_first_name}}', '{{user_email}}', '{{registration_date}}', '{{tee_image}}'].map((variable, index, array) => (
          <span key={variable}>
            <button
              type="button"
              onClick={() => {
                if (editor) {
                  editor.chain().focus().insertContent(variable).run()
                }
              }}
              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono mx-0.5"
              title={`Click to insert ${variable} at cursor position`}
            >
              {variable}
            </button>
            {index < array.length - 1 && ', '}
          </span>
        ))}
        {' '}({'{{tee_image}}'} is mascot)
      </div>
    </div>
  )
}
