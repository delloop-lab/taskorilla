import { useMemo } from 'react'
import type { PostingGroup, PostingPost, PostingTemplate } from '@/lib/postingManagerTypes'
import { formatDate } from '@/lib/postingManagerHelpers'

interface Props {
  open: boolean
  onClose: () => void
  group: PostingGroup | null
  posts: PostingPost[]
  templates: PostingTemplate[]
  onReusePost: (post: PostingPost) => void
  onDeletePost: (post: PostingPost) => Promise<void>
  onClearPending: (post: PostingPost) => Promise<void>
  onSetPending: (post: PostingPost) => Promise<void>
}

export default function PostHistoryModal({
  open,
  onClose,
  group,
  posts,
  templates,
  onReusePost,
  onDeletePost,
  onClearPending,
  onSetPending,
}: Props) {
  const postsForGroup = useMemo(
    () =>
      group
        ? posts
            .filter((p) => p.group_id === group.id)
            .sort(
              (a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
            )
        : [],
    [group, posts]
  )

  if (!open || !group) return null

  const getTemplateName = (templateId: string | null) => {
    if (!templateId) return ''
    const tpl = templates.find((t) => t.id === templateId)
    return tpl?.template_name || ''
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            History – {group.name} ({group.platform})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          {postsForGroup.length === 0 && (
            <div className="text-sm text-gray-500">No posts yet for this group.</div>
          )}
          {postsForGroup.map((post) => (
            <div
              key={post.id}
              className="border border-gray-200 rounded-md p-3 flex flex-col sm:flex-row sm:items-start gap-3 hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-xs text-gray-500">
                    {formatDate(post.date_posted)}
                    {post.next_allowed_date && (
                      <span className="ml-2 text-gray-400">
                        • Next allowed {formatDate(post.next_allowed_date)}
                      </span>
                    )}
                    {getTemplateName(post.template_id) && (
                      <span className="ml-2 text-blue-600">
                        • Template: {getTemplateName(post.template_id)}
                      </span>
                    )}
                    {post.pending_approval && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                        Pending approval
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{post.post_text}</div>
                {post.post_media_url && (
                  <div className="mt-2">
                    <a
                      href={post.post_media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block focus:outline-none"
                    >
                      <img
                        src={post.post_media_url}
                        alt="Post media"
                        className="max-w-full max-h-48 rounded-md border border-gray-200 object-contain"
                      />
                    </a>
                    <a
                      href={post.post_media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                )}
                {post.notes && (
                  <div className="mt-1 text-xs text-gray-500 whitespace-pre-wrap">
                    Notes: {post.notes}
                  </div>
                )}
              </div>
              <div className="flex flex-row sm:flex-col gap-2 sm:pt-1">
                <button
                  type="button"
                  onClick={() => onReusePost(post)}
                  className="px-3 py-1 rounded-md text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  Reuse
                </button>
                {!post.pending_approval && (
                  <button
                    type="button"
                    onClick={() => onSetPending(post)}
                    className="px-3 py-1 rounded-md text-xs font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  >
                    Mark Pending
                  </button>
                )}
                {post.pending_approval && (
                  <button
                    type="button"
                    onClick={() => onClearPending(post)}
                    className="px-3 py-1 rounded-md text-xs font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  >
                    Clear Pending
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeletePost(post)}
                  className="px-3 py-1 rounded-md text-xs font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

