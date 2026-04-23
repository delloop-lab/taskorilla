'use client'

import { useMemo, useState } from 'react'
import { usePostingGroups } from '@/lib/usePostingGroups'
import { usePostingPosts } from '@/lib/usePostingPosts'
import { usePostingTemplates } from '@/lib/usePostingTemplates'
import { usePostingComments } from '@/lib/usePostingComments'
import type { CommentStats, GroupPostingMeta, PostingGroup } from '@/lib/postingManagerTypes'
import {
  calculateGroupPostingMeta,
  calculateCommentStatsForGroup,
  exportToCsv,
  getCommentStatusColor,
  parseCsv,
  formatDate,
} from '@/lib/postingManagerHelpers'
import DashboardTable from './DashboardTable'
import GroupFormModal from './GroupFormModal'
import NewPostModal from './NewPostModal'
import PostHistoryModal from './PostHistoryModal'
import TemplateManagementModal from './TemplateManagementModal'
import NewCommentModal from './NewCommentModal'

export default function AdminPostingManager() {
  const { groups, loading: groupsLoading, addGroup, updateGroup, deleteGroup, refresh: refreshGroups } =
    usePostingGroups()
  const { posts, loading: postsLoading, addPost, deletePost, updatePost, refresh: refreshPosts } =
    usePostingPosts()
  const {
    templates,
    loading: templatesLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    refresh: refreshTemplates,
  } = usePostingTemplates()
  const {
    comments,
    loading: commentsLoading,
    addComment,
    refresh: refreshComments,
  } = usePostingComments()

  const [filterPlatform, setFilterPlatform] = useState<string>('All')
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PostingGroup | null>(null)
  const [highlightedDuplicateGroupIds, setHighlightedDuplicateGroupIds] = useState<string[]>([])
  const [newPostModalOpen, setNewPostModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<PostingGroup | null>(null)
  const [commentSortDir, setCommentSortDir] = useState<'asc' | 'desc'>('asc')
  const truncateGroupName = (name: string) => (name.length > 25 ? `${name.slice(0, 25)}...` : name)

  const loading = groupsLoading || postsLoading || templatesLoading || commentsLoading
  const isTruthyFlag = (value: unknown): boolean => {
    if (value === true) return true
    if (value === 1) return true
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      return normalized === 'true' || normalized === 't' || normalized === '1' || normalized === 'yes'
    }
    return false
  }
  const isGroupUnusable = (group: PostingGroup) => isTruthyFlag(group.is_unusable)

  const metaByGroupId: Record<string, GroupPostingMeta> = useMemo(() => {
    const result: Record<string, GroupPostingMeta> = {}
    for (const g of groups) {
      result[g.id] = calculateGroupPostingMeta(g, posts)
    }
    return result
  }, [groups, posts])

  const commentOnlyGroups = useMemo(
    () => groups.filter((g) => g.facebook_post_mode === 'Comments accepted' && !isGroupUnusable(g)),
    [groups]
  )

  const regularGroups = useMemo(
    () => groups.filter((g) => g.facebook_post_mode !== 'Comments accepted' && !isGroupUnusable(g)),
    [groups]
  )

  const unusableGroups = useMemo(
    () => groups.filter((g) => isGroupUnusable(g)),
    [groups]
  )

  const commentStatsByGroupId: Record<string, CommentStats> = useMemo(() => {
    const result: Record<string, CommentStats> = {}
    for (const g of commentOnlyGroups) {
      result[g.id] = calculateCommentStatsForGroup(g, comments)
    }
    return result
  }, [commentOnlyGroups, comments])

  const sortedCommentOnlyGroups = useMemo(() => {
    const rank = (group: PostingGroup): number => {
      const stats = commentStatsByGroupId[group.id]
      const total = stats?.totalThisWeek ?? 0
      const canComment = stats?.canComment ?? true
      const statusColor = getCommentStatusColor(total, canComment)
      // waiting (worst) -> high volume -> ok this week
      if (!canComment) return 0
      if (statusColor === 'orange') return 1
      return 2
    }

    return [...commentOnlyGroups].sort((a, b) => {
      const aRank = rank(a)
      const bRank = rank(b)
      if (aRank !== bRank) {
        return commentSortDir === 'asc' ? aRank - bRank : bRank - aRank
      }
      return a.name.localeCompare(b.name)
    })
  }, [commentOnlyGroups, commentStatsByGroupId, commentSortDir])

  const handleSaveGroup = async (payload: any) => {
    if (payload.id) {
      await updateGroup(payload.id, payload)
    } else {
      await addGroup(payload)
    }
    await refreshGroups()
  }

  const handleCreatePost = async (payload: {
    groupId: string
    post_text: string
    post_media_url: string | null
    notes: string | null
    template_id: string | null
    pending_approval?: boolean
  }) => {
    const group = groups.find((g) => g.id === payload.groupId)
    const days = group ? Math.max(0, group.days_between_posts) : 0
    const datePosted = new Date()
    const nextAllowed = new Date(datePosted)
    if (days > 0) {
      nextAllowed.setDate(nextAllowed.getDate() + days)
    }

    await addPost({
      id: undefined as any,
      group_id: payload.groupId,
      post_text: payload.post_text,
      post_media_url: payload.post_media_url,
      notes: payload.notes,
      date_posted: datePosted.toISOString(),
      next_allowed_date: nextAllowed.toISOString(),
      template_id: payload.template_id,
      pending_approval: payload.pending_approval ?? false,
    })
    await Promise.all([refreshPosts(), refreshGroups(), refreshTemplates()])
  }

  const handleCreateComment = async (payload: {
    groupId: string
    number_of_comments: number
    notes: string | null
  }) => {
    await addComment({
      group_id: payload.groupId,
      number_of_comments: payload.number_of_comments,
      notes: payload.notes,
      date_commented: new Date().toISOString(),
    } as any)
    await refreshComments()
  }

  const handleExportGroups = () => {
    exportToCsv(
      'posting-groups.csv',
      groups.map((g) => ({
        id: g.id,
        platform: g.platform,
        name: g.name,
        url: g.url,
        group_image: g.group_image,
        days_between_posts: g.days_between_posts,
        description: g.description,
        notes: g.notes,
        is_unusable: !!g.is_unusable,
        created_at: g.created_at,
      }))
    )
  }

  const handleExportPosts = () => {
    exportToCsv(
      'posting-posts.csv',
      posts.map((p) => ({
        id: p.id,
        group_id: p.group_id,
        post_text: p.post_text,
        post_media_url: p.post_media_url,
        date_posted: p.date_posted,
        next_allowed_date: p.next_allowed_date,
        notes: p.notes,
        created_at: p.created_at,
        template_id: p.template_id,
      }))
    )
  }

  const handleExportTemplates = () => {
    exportToCsv(
      'posting-templates.csv',
      templates.map((t) => ({
        id: t.id,
        template_name: t.template_name,
        post_text: t.post_text,
        post_media_url: t.post_media_url,
        platform: t.platform,
        notes: t.notes,
        created_at: t.created_at,
      }))
    )
  }

  const handleImport = async (
    file: File,
    type: 'groups' | 'posts' | 'templates'
  ): Promise<void> => {
    const text = await file.text()
    const { rows } = parseCsv(text)
    if (!rows.length) return

    if (type === 'groups') {
      for (const row of rows) {
        await addGroup({
          platform: row.platform as any,
          name: row.name,
          url: row.url || null,
          group_image: row.group_image || null,
          days_between_posts: Number(row.days_between_posts) || 0,
          description: row.description || null,
          notes: row.notes || null,
          is_unusable: row.is_unusable === 'true',
          created_at: row.created_at || new Date().toISOString(),
          id: row.id || undefined,
        } as any)
      }
      await refreshGroups()
    } else if (type === 'posts') {
      for (const row of rows) {
        await addPost({
          id: row.id || (undefined as any),
          group_id: row.group_id,
          post_text: row.post_text,
          post_media_url: row.post_media_url || null,
          date_posted: row.date_posted || new Date().toISOString(),
          next_allowed_date: row.next_allowed_date || null,
          notes: row.notes || null,
          created_at: row.created_at || new Date().toISOString(),
          template_id: row.template_id || null,
        } as any)
      }
      await refreshPosts()
    } else if (type === 'templates') {
      for (const row of rows) {
        await addTemplate({
          template_name: row.template_name,
          platform: row.platform,
          post_text: row.post_text,
          post_media_url: row.post_media_url || null,
          notes: row.notes || null,
          created_at: row.created_at || new Date().toISOString(),
          id: row.id || undefined,
        } as any)
      }
      await refreshTemplates()
    }
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Sticky page header for Posting Manager (title, buttons, CSV controls) */}
      <div className="sticky top-0 z-30 bg-gray-50 pt-1 pb-6 space-y-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Taskorilla Posting Manager</h1>
            <p className="text-sm text-gray-500">
              Plan and track social posts across platforms with frequency control and templates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => {
                setEditingGroup(null)
                setGroupModalOpen(true)
              }}
              className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              Add group / page
            </button>
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              Manage templates
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
            <span>
              Status colours: <span className="font-medium text-green-700">Ready</span> /{' '}
              <span className="font-medium text-red-700">Waiting</span> /{' '}
              <span className="font-medium text-amber-700">Never posted</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <label className="font-medium text-gray-600">CSV:</label>
            <button
              type="button"
              onClick={handleExportGroups}
              className="px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              Export groups
            </button>
            <button
              type="button"
              onClick={handleExportPosts}
              className="px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              Export posts
            </button>
            <button
              type="button"
              onClick={handleExportTemplates}
              className="px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              Export templates
            </button>
            <label className="ml-2 inline-flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
              Import CSV
              <select
                className="border border-gray-300 rounded-md px-1.5 py-0.5 text-xs bg-white"
                onChange={() => {
                  // no-op, handled by file input below
                }}
              >
                <option value="groups">Groups</option>
                <option value="posts">Posts</option>
                <option value="templates">Templates</option>
              </select>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const selectEl = (e.target.previousSibling as HTMLSelectElement) || null
                  const type =
                    (selectEl?.value as 'groups' | 'posts' | 'templates') || 'groups'
                  void handleImport(file, type)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-4 space-y-6 pr-1">
        {loading && (
          <div className="text-sm text-gray-500">Loading groups, posts and templates...</div>
        )}

        <DashboardTable
          groups={regularGroups}
          metaByGroupId={metaByGroupId}
          filterPlatform={filterPlatform}
          setFilterPlatform={setFilterPlatform}
          highlightedGroupIds={highlightedDuplicateGroupIds}
          onNewPost={(group) => {
            setSelectedGroup(group)
            setNewPostModalOpen(true)
          }}
          onViewHistory={(group) => {
            setSelectedGroup(group)
            setHistoryModalOpen(true)
          }}
          onEditGroup={(group) => {
            setEditingGroup(group)
            setGroupModalOpen(true)
          }}
          onDeleteGroup={async (group) => {
            if (
              window.confirm(
                `Delete group "${group.name}" and all its posts?\n\nThis cannot be undone.`
              )
            ) {
              await deleteGroup(group.id)
              await refreshGroups()
            }
          }}
          onMarkUnusable={async (group) => {
            if (
              !window.confirm(
                `Mark "${group.name}" as unusable?\n\nIt will be moved out of active posting and can be restored later.`
              )
            ) {
              return
            }
            try {
              const updatedGroup = await updateGroup(group.id, { is_unusable: true })
              await refreshGroups()
              if (!isGroupUnusable(updatedGroup)) {
                window.alert(
                  'The group did not persist as unusable in the database. Please run the SQL migration for is_unusable and verify DB permissions.'
                )
              }
            } catch (err: any) {
              console.error('Failed to mark group as unusable', err)
              window.alert(
                err?.message?.includes('is_unusable')
                  ? 'Could not mark as unusable. Please run the SQL migration to add the is_unusable column, then try again.'
                  : err?.message || 'Could not mark group as unusable.'
              )
            }
          }}
        />

        {commentOnlyGroups.length > 0 && (
          <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Comment Posting</h2>
            <button
              type="button"
              onClick={() => setCommentModalOpen(true)}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
            >
              New comment entry
            </button>
          </div>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 w-10">#</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Platform</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">
                      Group / Page
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">
                      Last commented
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">
                      Total comments (last 7 days)
                    </th>
                    <th
                      className="px-4 py-2 text-left font-semibold text-gray-700 cursor-pointer select-none"
                      onClick={() =>
                        setCommentSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                      }
                    >
                      Status
                      <span className="ml-1 text-[11px] text-gray-400">
                        {commentSortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {sortedCommentOnlyGroups.map((group, index) => {
                    const stats = commentStatsByGroupId[group.id]
                    const total = stats?.totalThisWeek ?? 0
                    const canComment = stats?.canComment ?? true
                    const statusColor = getCommentStatusColor(total, canComment)
                    const statusClasses =
                      statusColor === 'green'
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : statusColor === 'orange'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-red-50 text-red-800 border-red-200'

                    return (
                      <tr key={group.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500 text-right tabular-nums w-10">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                            {group.platform}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap max-w-[220px]">
                          <div className="flex flex-col">
                            {group.url ? (
                              <a
                                href={group.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-medium truncate block"
                                title={group.name}
                              >
                                {truncateGroupName(group.name)}
                              </a>
                            ) : (
                              <span className="font-medium text-gray-900 truncate block" title={group.name}>
                                {truncateGroupName(group.name)}
                              </span>
                            )}
                            {stats?.lastCommentNotes && (
                              <span
                                className="text-xs text-gray-500 line-clamp-1"
                                title={stats.lastCommentNotes}
                              >
                                Notes: {stats.lastCommentNotes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className="text-gray-700"
                            title={
                              stats?.lastCommentDate
                                ? new Date(stats.lastCommentDate).toString()
                                : ''
                            }
                          >
                            {stats?.lastCommentDate ? formatDate(stats.lastCommentDate) : 'Never'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-gray-700">{total}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClasses}`}
                            title={
                              !canComment && stats?.nextAllowedDate
                                ? `Next allowed ${formatDate(stats.nextAllowedDate)}`
                                : undefined
                            }
                          >
                            {!canComment
                              ? 'Waiting'
                              : statusColor === 'green'
                              ? 'OK this week'
                              : 'High volume'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGroup(group)
                                setCommentModalOpen(true)
                              }}
                              disabled={!canComment}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                                canComment
                                  ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                                  : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              New Comment
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroup(group)
                                setGroupModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Mark "${group.name}" as unusable?\n\nIt will be moved to Unusable Groups and can be restored later.`
                                  )
                                ) {
                                  return
                                }
                                try {
                                  const updatedGroup = await updateGroup(group.id, { is_unusable: true })
                                  await refreshGroups()
                                  if (!isGroupUnusable(updatedGroup)) {
                                    window.alert(
                                      'The group did not persist as unusable in the database. Please run the SQL migration for is_unusable and verify DB permissions.'
                                    )
                                  }
                                } catch (err: any) {
                                  console.error('Failed to mark group as unusable', err)
                                  window.alert(
                                    err?.message?.includes('is_unusable')
                                      ? 'Could not mark as unusable. Please run the SQL migration to add the is_unusable column, then try again.'
                                      : err?.message || 'Could not mark group as unusable.'
                                  )
                                }
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              Unusable
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Delete group "${group.name}" and all its comments?\n\nThis cannot be undone.`
                                  )
                                ) {
                                  await deleteGroup(group.id)
                                  await Promise.all([refreshGroups(), refreshComments()])
                                }
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Unusable Groups</h2>
            <span className="text-xs text-gray-500">
              {unusableGroups.length} group{unusableGroups.length === 1 ? '' : 's'} marked as unusable
            </span>
          </div>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 w-10">#</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Platform</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Group / Page</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {unusableGroups.map((group, index) => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 whitespace-nowrap text-gray-500 text-right tabular-nums w-10">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                          {group.platform}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          {group.url ? (
                            <a
                              href={group.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium truncate max-w-xs"
                            >
                              {group.name}
                            </a>
                          ) : (
                            <span className="font-medium text-gray-900 truncate max-w-xs">
                              {group.name}
                            </span>
                          )}
                          {group.notes && (
                            <span className="text-xs text-gray-500 line-clamp-1">{group.notes}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const updatedGroup = await updateGroup(group.id, { is_unusable: false })
                                await refreshGroups()
                                if (isGroupUnusable(updatedGroup)) {
                                  window.alert(
                                    'The group did not persist as active in the database. Please verify DB permissions and column availability.'
                                  )
                                }
                              } catch (err: any) {
                                console.error('Failed to restore group to active', err)
                                window.alert(err?.message || 'Could not restore group to active.')
                              }
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            Restore to Active
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(group)
                              setGroupModalOpen(true)
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {unusableGroups.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                      No unusable groups yet. Use "Unusable" in the active lists to move a group/page here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <GroupFormModal
        open={groupModalOpen}
        onClose={() => {
          setGroupModalOpen(false)
          setHighlightedDuplicateGroupIds([])
        }}
        initialGroup={editingGroup}
        existingGroups={groups}
        onDuplicateDetected={(ids) => setHighlightedDuplicateGroupIds(ids)}
        onSave={async (payload) => {
          await handleSaveGroup(payload)
        }}
      />

      <NewPostModal
        open={newPostModalOpen}
        onClose={() => setNewPostModalOpen(false)}
        group={selectedGroup}
        posts={posts}
        templates={templates}
        onCreatePost={handleCreatePost}
      />

      <PostHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        group={selectedGroup}
        posts={posts}
        templates={templates}
        onReusePost={(post) => {
          const group = groups.find((g) => g.id === post.group_id) || null
          setSelectedGroup(group)
          setNewPostModalOpen(true)
        }}
        onDeletePost={async (post) => {
          if (!window.confirm('Delete this post?')) return
          await deletePost(post.id)
          await refreshPosts()
        }}
        onClearPending={async (post) => {
          if (!post.pending_approval) return
          await updatePost(post.id, { pending_approval: false } as any)
          await refreshPosts()
        }}
        onSetPending={async (post) => {
          if (post.pending_approval) return
          await updatePost(post.id, { pending_approval: true } as any)
          await refreshPosts()
        }}
      />

      <TemplateManagementModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        templates={templates}
        onAddTemplate={async (payload) => {
          await addTemplate(payload as any)
        }}
        onUpdateTemplate={async (id, updates) => {
          await updateTemplate(id, updates as any)
        }}
        onDeleteTemplate={async (id) => {
          await deleteTemplate(id)
        }}
      />

      <NewCommentModal
        open={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        groups={commentOnlyGroups.filter((g) => commentStatsByGroupId[g.id]?.canComment ?? true)}
        onCreateComment={handleCreateComment}
      />
    </div>
  )
}

