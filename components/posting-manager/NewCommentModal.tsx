import { useEffect, useState } from 'react'
import type { PostingGroup } from '@/lib/postingManagerTypes'

interface Props {
  open: boolean
  onClose: () => void
  groups: PostingGroup[]
  onCreateComment: (payload: {
    groupId: string
    number_of_comments: number
    notes: string | null
  }) => Promise<void>
}

export default function NewCommentModal({
  open,
  onClose,
  groups,
  onCreateComment,
}: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [count, setCount] = useState<number>(1)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedGroupId('')
      setCount(1)
      setNotes('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroupId || !Number.isFinite(count) || count <= 0) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await onCreateComment({
        groupId: selectedGroupId,
        number_of_comments: Math.max(1, Math.round(count)),
        notes: notes.trim() || null,
      })
      onClose()
    } catch (err: any) {
      console.error('Error logging comments', err)
      setErrorMsg(err?.message || 'Failed to save entry. Please check console for details.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Log comments</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Group / page (comment-only)
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.platform})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Number of comments (today)
            </label>
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Date is automatically set to today; log multiple times per day if needed.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder="e.g. commented on furniture posts"
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
              disabled={submitting || !selectedGroupId}
              className="px-4 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

