import { useEffect, useState } from 'react'
import type { PostingGroup, PostingPlatform } from '@/lib/postingManagerTypes'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (payload: Partial<PostingGroup> & { platform: PostingPlatform }) => Promise<void>
  initialGroup?: PostingGroup | null
}

const PLATFORMS: PostingPlatform[] = ['Facebook', 'Instagram', 'LinkedIn', 'X', 'Threads', 'WhatsApp']

export default function GroupFormModal({ open, onClose, onSave, initialGroup }: Props) {
  const [platform, setPlatform] = useState<PostingPlatform>('Facebook')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [daysBetween, setDaysBetween] = useState(3)
  const [notes, setNotes] = useState('')
  const [facebookMode, setFacebookMode] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (initialGroup) {
      setPlatform(initialGroup.platform)
      setName(initialGroup.name)
      setUrl(initialGroup.url || '')
      setDaysBetween(initialGroup.days_between_posts || 0)
      setNotes(initialGroup.notes || '')
      setFacebookMode(initialGroup.facebook_post_mode || '')
    } else {
      setPlatform('Facebook')
      setName('')
      setUrl('')
      setDaysBetween(3)
      setNotes('')
      setFacebookMode('')
    }
  }, [initialGroup, open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setErrorMsg(null)
    try {
      await onSave({
        id: initialGroup?.id,
        platform,
        name: name.trim(),
        url: url.trim() || null,
        days_between_posts: Number.isFinite(daysBetween) ? Math.max(0, daysBetween) : 0,
        notes: notes.trim() || null,
        facebook_post_mode:
          platform === 'Facebook' && facebookMode
            ? facebookMode
            : null,
      } as any)
      onClose()
    } catch (err: any) {
      console.error('Error saving posting group', err)
      setErrorMsg(err?.message || 'Failed to save group. Please check the console for details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialGroup ? 'Edit Group / Page' : 'Add Group / Page'}
          </h2>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Days between posts
              </label>
              <input
                type="number"
                min={0}
                value={daysBetween}
                onChange={(e) => setDaysBetween(Number(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Group or page name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
          </div>
          {platform === 'Facebook' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Facebook group type
              </label>
              <select
                value={facebookMode}
                onChange={(e) => setFacebookMode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select option</option>
                <option value="Ads accepted">Ads accepted</option>
                <option value="Comments accepted">Comments accepted</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Internal notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          {errorMsg && (
            <div className="text-xs text-red-600">
              {errorMsg}
            </div>
          )}
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
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : initialGroup ? 'Save changes' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

