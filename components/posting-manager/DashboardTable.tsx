import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { GroupPostingMeta, PostingGroup } from '@/lib/postingManagerTypes'
import { formatDate } from '@/lib/postingManagerHelpers'
import StatusBadge from './StatusBadge'

interface Props {
  groups: PostingGroup[]
  metaByGroupId: Record<string, GroupPostingMeta>
  onNewPost: (group: PostingGroup) => void
  onViewHistory: (group: PostingGroup) => void
  onEditGroup: (group: PostingGroup) => void
  onDeleteGroup: (group: PostingGroup) => void
  filterPlatform: string
  setFilterPlatform: (platform: string) => void
  highlightedGroupIds?: string[]
  onMarkUnusable?: (group: PostingGroup) => void
}

export default function DashboardTable({
  groups,
  metaByGroupId,
  onNewPost,
  onViewHistory,
  onEditGroup,
  onDeleteGroup,
  filterPlatform,
  setFilterPlatform,
  highlightedGroupIds = [],
  onMarkUnusable,
}: Props) {
  const truncateGroupName = (name: string) => (name.length > 25 ? `${name.slice(0, 25)}...` : name)
  const platforms = ['All', 'Facebook', 'Instagram', 'LinkedIn', 'X', 'Threads', 'WhatsApp']
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'nextAllowed' | 'status'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(
    () =>
      groups.filter((g) =>
        filterPlatform === 'All' ? true : g.platform === filterPlatform
      ),
    [groups, filterPlatform]
  )

  const statusRank = (group: PostingGroup): number => {
    const meta = metaByGroupId[group.id]
    const isCommentOnly = group.facebook_post_mode === 'Comments accepted'
    const hasPending = !!meta?.lastPost?.pending_approval && !isCommentOnly
    if (hasPending) return 3 // Pending
    const status = meta?.status ?? 'never'
    if (status === 'ready') return 2
    if (status === 'waiting') return 1
    return 0 // never
  }

  const sorted = useMemo(() => {
    const arr = [...filtered]
    return arr.sort((a, b) => {
      if (sortBy === 'name') {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        if (aName < bName) return sortDir === 'asc' ? -1 : 1
        if (aName > bName) return sortDir === 'asc' ? 1 : -1
        return 0
      }
      if (sortBy === 'status') {
        const aRank = statusRank(a)
        const bRank = statusRank(b)
        if (aRank !== bRank) {
          return sortDir === 'asc' ? aRank - bRank : bRank - aRank
        }
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        if (aName < bName) return -1
        if (aName > bName) return 1
        return 0
      }
      const aMeta = metaByGroupId[a.id]
      const bMeta = metaByGroupId[b.id]
      if (sortBy === 'date') {
        const aDate = aMeta?.lastPost ? new Date(aMeta.lastPost.date_posted).getTime() : 0
        const bDate = bMeta?.lastPost ? new Date(bMeta.lastPost.date_posted).getTime() : 0
        if (aDate === bDate) {
          const aName = a.name.toLowerCase()
          const bName = b.name.toLowerCase()
          if (aName < bName) return -1
          if (aName > bName) return 1
          return 0
        }
        return sortDir === 'asc' ? aDate - bDate : bDate - aDate
      }

      // sortBy === 'nextAllowed'
      const aNextAllowed = aMeta?.nextAllowedDate ? new Date(aMeta.nextAllowedDate).getTime() : 0
      const bNextAllowed = bMeta?.nextAllowedDate ? new Date(bMeta.nextAllowedDate).getTime() : 0
      if (aNextAllowed === bNextAllowed) {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        if (aName < bName) return -1
        if (aName > bName) return 1
        return 0
      }
      return sortDir === 'asc' ? aNextAllowed - bNextAllowed : bNextAllowed - aNextAllowed
    })
  }, [filtered, sortBy, sortDir, metaByGroupId])

  const toggleSort = (field: 'name' | 'date' | 'nextAllowed' | 'status') => {
    if (sortBy !== field) {
      setSortBy(field)
      setSortDir(field === 'name' || field === 'status' ? 'asc' : 'desc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden relative">
      <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Posting Manager</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Filter platform</label>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {platforms.map((p) => (
              <option key={p} value={p === 'All' ? 'All' : p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="max-h-[58vh] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-[34%]" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-[170px]" />
          </colgroup>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-700 w-10">#</th>
              <th
                className="px-2 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
                onClick={() => toggleSort('name')}
              >
                Group / Page
                {sortBy === 'name' && (
                  <span className="ml-1 text-[11px] text-gray-400">
                    {sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th
                className="px-2 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
                onClick={() => toggleSort('date')}
              >
                Last posted
                {sortBy === 'date' && (
                  <span className="ml-1 text-[11px] text-gray-400">
                    {sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th
                className="px-2 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
                onClick={() => toggleSort('nextAllowed')}
              >
                Next allowed
                {sortBy === 'nextAllowed' && (
                  <span className="ml-1 text-[11px] text-gray-400">
                    {sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th
                className="px-2 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
                onClick={() => toggleSort('status')}
              >
                Status
                {sortBy === 'status' && (
                  <span className="ml-1 text-[11px] text-gray-400">
                    {sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th className="px-2 py-2 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.map((group, index) => {
              const meta = metaByGroupId[group.id]
              const lastPost = meta?.lastPost || null
              const nextAllowed = meta?.nextAllowedDate || null
              const canPost = meta?.canPost ?? true
              const isCommentOnly = group.facebook_post_mode === 'Comments accepted'
              const hasPending = !!lastPost?.pending_approval

              const isHighlighted = highlightedGroupIds.includes(group.id)
              return (
                <tr
                  key={group.id}
                  className={`hover:bg-gray-50 ${isHighlighted ? 'ring-2 ring-amber-400 ring-inset bg-amber-50/80' : ''}`}
                >
                  <td className="px-2 py-2 whitespace-nowrap text-gray-500 text-right tabular-nums w-10">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2 min-w-0 whitespace-nowrap">
                    {group.url ? (
                      <Link
                        href={group.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium block"
                        title={group.name}
                      >
                        {truncateGroupName(group.name)}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-900 block" title={group.name}>
                        {truncateGroupName(group.name)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-gray-700">
                      {lastPost ? formatDate(lastPost.date_posted) : 'Never'}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-gray-700">
                      {nextAllowed ? formatDate(nextAllowed) : 'Now'}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {hasPending && !isCommentOnly ? (
                      <StatusBadge status={meta?.status || 'never'} label="Pending" variant="pending" />
                    ) : (
                      <StatusBadge status={meta?.status || 'never'} />
                    )}
                  </td>
                  <td className="px-1.5 py-2 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 max-w-[170px] ml-auto whitespace-nowrap">
                      {!isCommentOnly && (
                        <button
                          type="button"
                          onClick={() => onNewPost(group)}
                          disabled={!canPost}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            canPost
                              ? 'bg-green-600 text-white hover:bg-green-700 border-green-600'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          }`}
                        >
                          Post
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewHistory(group)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      >
                        Hist
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditGroup(group)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      {onMarkUnusable && (
                        <button
                          type="button"
                          onClick={() => onMarkUnusable(group)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          Unusable
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteGroup(group)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No groups found. Add a group to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

