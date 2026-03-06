import { useEffect, useState } from 'react'
import type { PostingPlatform, PostingTemplate } from '@/lib/postingManagerTypes'
import { supabase } from '@/lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  templates: PostingTemplate[]
  onAddTemplate: (payload: Partial<PostingTemplate>) => Promise<void>
  onUpdateTemplate: (id: string, updates: Partial<PostingTemplate>) => Promise<void>
  onDeleteTemplate: (id: string) => Promise<void>
}

const PLATFORMS: PostingPlatform[] = ['Facebook', 'Instagram', 'LinkedIn', 'X', 'Threads', 'WhatsApp']

export default function TemplateManagementModal({
  open,
  onClose,
  templates,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: Props) {
  const [editing, setEditing] = useState<PostingTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [platform, setPlatform] = useState<PostingPlatform>('Facebook')
  const [postText, setPostText] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  useEffect(() => {
    if (!open) {
      setEditing(null)
      setTemplateName('')
      setPlatform('Facebook')
      setPostText('')
      setMediaUrl('')
      setNotes('')
    }
  }, [open])

  if (!open) return null

  const startEdit = (tpl: PostingTemplate) => {
    setEditing(tpl)
    setTemplateName(tpl.template_name)
    setPlatform((tpl.platform as PostingPlatform) || 'Facebook')
    setPostText(tpl.post_text)
    setMediaUrl(tpl.post_media_url || '')
    setNotes(tpl.notes || '')
  }

  const resetForm = () => {
    setEditing(null)
    setTemplateName('')
    setPlatform('Facebook')
    setPostText('')
    setMediaUrl('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateName.trim() || !postText.trim()) return
    setSaving(true)
    try {
      const payload: Partial<PostingTemplate> = {
        template_name: templateName.trim(),
        platform,
        post_text: postText.trim(),
        post_media_url: mediaUrl.trim() || null,
        notes: notes.trim() || null,
      }
      if (editing) {
        await onUpdateTemplate(editing.id, payload)
      } else {
        await onAddTemplate(payload)
      }
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const handleMediaFileChange = async (file: File | null) => {
    if (!file) return
    setUploadingMedia(true)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        // Silent failure in UI; log for debugging
        console.error('You must be logged in to upload media for templates', authError)
        return
      }

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `template-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
        })

      if (uploadError) {
        console.error('Error uploading template media', uploadError)
        return
      }

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      if (data.publicUrl) {
        setMediaUrl(data.publicUrl)
      }
    } catch (err) {
      console.error('Unexpected error uploading template media', err)
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleDelete = async (tpl: PostingTemplate) => {
    if (!window.confirm(`Delete template "${tpl.template_name}"?`)) return
    await onDeleteTemplate(tpl.id)
    if (editing?.id === tpl.id) {
      resetForm()
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Template Management</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              {editing ? 'Edit Template' : 'Add Template'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Template name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. FB Job Request"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as PostingPlatform)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Post text</label>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                  placeholder="Template content with [placeholders] if needed"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">
                    Media URL (image / video)
                  </label>
                  {mediaUrl && (
                    <button
                      type="button"
                      onClick={() => setMediaUrl('')}
                      className="text-[11px] px-2 py-0.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    >
                      Remove image
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Or upload image / video
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    void handleMediaFileChange(file)
                    // allow selecting same file again later
                    e.target.value = ''
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingMedia && (
                  <p className="mt-1 text-[11px] text-gray-500">Uploading media...</p>
                )}
              </div>
              {mediaUrl && (
                <div>
                  <div className="text-[11px] text-gray-500 mb-1">Preview</div>
                  <div className="border border-gray-200 rounded-md bg-gray-50 p-2 flex items-center justify-center max-h-40 overflow-hidden">
                    <img
                      src={mediaUrl}
                      alt="Template media preview"
                      className="max-h-36 w-auto object-contain"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                />
              </div>
              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  New template
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : editing ? 'Save changes' : 'Add template'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Existing templates</h3>
            <div className="border border-gray-200 rounded-md max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {templates.length === 0 && (
                <div className="p-3 text-sm text-gray-500">No templates yet.</div>
              )}
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3 flex flex-col gap-1 hover:bg-gray-50 cursor-pointer"
                  onClick={() => startEdit(tpl)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900">
                        {tpl.template_name}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                        {tpl.platform}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDelete(tpl)
                      }}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-xs text-gray-700 line-clamp-2">{tpl.post_text}</div>
                  {tpl.notes && (
                    <div className="text-[11px] text-gray-500 line-clamp-1">Notes: {tpl.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

