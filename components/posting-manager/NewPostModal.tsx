import { useEffect, useMemo, useState } from 'react'
import type { PostingGroup, PostingPost, PostingTemplate } from '@/lib/postingManagerTypes'
import { getNextTemplateForGroup } from '@/lib/postingManagerHelpers'
import { supabase } from '@/lib/supabase'
import { MediaPreview } from './MediaPreview'

interface Props {
  open: boolean
  onClose: () => void
  group: PostingGroup | null
  posts: PostingPost[]
  templates: PostingTemplate[]
  onCreatePost: (payload: {
    groupId: string
    post_text: string
    post_media_url: string | null
    notes: string | null
    template_id: string | null
  }) => Promise<void>
}

export default function NewPostModal({
  open,
  onClose,
  group,
  posts,
  templates,
  onCreatePost,
}: Props) {
  const [postText, setPostText] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | 'custom'>('custom')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copiedField, setCopiedField] = useState<'none' | 'text' | 'media'>('none')

  const postsForGroup = useMemo(
    () => (group ? posts.filter((p) => p.group_id === group.id) : []),
    [group, posts]
  )

  const suggestedTemplate = useMemo(() => {
    if (!group) return null
    return getNextTemplateForGroup({
      groupId: group.id,
      platform: group.platform,
      templates,
      posts,
    })
  }, [group, templates, posts])

  useEffect(() => {
    if (!open || !group) return
    if (suggestedTemplate) {
      setSelectedTemplateId(suggestedTemplate.id)
      setPostText(suggestedTemplate.post_text)
      setMediaUrl(suggestedTemplate.post_media_url || '')
      setNotes(suggestedTemplate.notes || '')
    } else {
      setSelectedTemplateId('custom')
      setPostText('')
      setMediaUrl('')
      setNotes('')
    }
  }, [open, group, suggestedTemplate])

  if (!open || !group) return null

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id)
    if (id === 'custom') {
      setPostText('')
      setMediaUrl('')
      setNotes('')
      return
    }
    const tpl = templates.find((t) => t.id === id)
    if (tpl) {
      setPostText(tpl.post_text)
      setMediaUrl(tpl.post_media_url || '')
      setNotes(tpl.notes || '')
    }
  }

  const handleReuseLast = () => {
    if (!postsForGroup.length) return
    const last = [...postsForGroup].sort(
      (a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
    )[0]
    setPostText(last.post_text)
    setMediaUrl(last.post_media_url || '')
    setNotes(last.notes || '')
    setSelectedTemplateId(last.template_id || 'custom')
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('You must be logged in to upload media')
      }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `posting-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
        })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      if (data.publicUrl) {
        setMediaUrl(data.publicUrl)
      }
    } catch (err) {
      console.error('Error uploading media', err)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postText.trim()) return
    setSubmitting(true)
    try {
      await onCreatePost({
        groupId: group.id,
        post_text: postText.trim(),
        post_media_url: mediaUrl.trim() || null,
        notes: notes.trim() || null,
        template_id: selectedTemplateId === 'custom' ? null : selectedTemplateId,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async (value: string, field: 'text' | 'media') => {
    if (!value?.trim()) return
    try {
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null
      if (!clipboard) return

      if (field === 'text') {
        // Preserve line breaks: write both plain text (with \n) and HTML so paste
        // into rich targets (e.g. Facebook) keeps paragraphs and linefeeds.
        const plain = value
        const escapeHtml = (s: string) =>
          s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
        const html = value
          .split(/\r?\n/)
          .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
          .join('')
        const htmlBlob = new Blob([`<!DOCTYPE html><html><body>${html}</body></html>`], {
          type: 'text/html',
        })
        const plainBlob = new Blob([plain], { type: 'text/plain' })
        if (clipboard.write && typeof clipboard.write === 'function') {
          await clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': plainBlob }),
          ])
        } else {
          await clipboard.writeText(plain)
        }
      } else {
        await clipboard.writeText(value)
      }
      setCopiedField(field)
      setTimeout(() => setCopiedField('none'), 1500)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Post</h2>
            <p className="text-xs text-gray-500">
              {group.platform} – {group.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Template (auto-rotated)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="custom">Custom text</option>
                {templates
                  .filter((t) => t.platform === group.platform)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.template_name}
                    </option>
                  ))}
              </select>
              {suggestedTemplate && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Suggested: <span className="font-medium">{suggestedTemplate.template_name}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Quick actions</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleReuseLast}
                  disabled={!postsForGroup.length}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reuse last post
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">
                Post text
              </label>
              <button
                type="button"
                onClick={() => void handleCopy(postText, 'text')}
                disabled={!postText.trim()}
                className="text-[11px] px-2 py-0.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copiedField === 'text' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder="Write or adapt your post..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600">
                  Media URL (image / video)
                </label>
                <button
                  type="button"
                  onClick={() => void handleCopy(mediaUrl, 'media')}
                  disabled={!mediaUrl.trim()}
                  className="text-[11px] px-2 py-0.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copiedField === 'media' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
              {mediaUrl && (
                <div className="mt-2">
                  <div className="text-[11px] text-gray-500 mb-1">Preview</div>
                  <div className="border border-gray-200 rounded-md bg-gray-50 p-2 flex items-center justify-center max-h-48 overflow-hidden min-h-[120px]">
                    <MediaPreview url={mediaUrl} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Or upload image / video
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    void handleFileUpload(file)
                  }
                }}
                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && (
                <p className="mt-1 text-[11px] text-gray-500">Uploading media...</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Internal notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder="Notes about where/when you posted, performance, etc."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !postText.trim()}
              className="px-4 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

