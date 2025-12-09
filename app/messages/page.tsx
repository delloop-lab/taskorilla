'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Conversation } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadConversations()
    checkUser()
  }, [])

  // Set up real-time subscription to update conversations when messages change
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`messages-list-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
    } else {
      setUser(user)
    }
  }

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get conversations where user is participant1 or participant2
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([])
        return
      }

      // Fetch related data
      const taskIds = conversationsData.map(c => c.task_id).filter(Boolean)
      const participantIds = Array.from(new Set([
        ...conversationsData.map(c => c.participant1_id),
        ...conversationsData.map(c => c.participant2_id)
      ]))

      const [tasksResult, profilesResult] = await Promise.all([
        taskIds.length > 0
          ? supabase.from('tasks').select('id, title').in('id', taskIds)
          : Promise.resolve({ data: [] }),
        supabase.from('profiles').select('id, email, full_name, avatar_url').in('id', participantIds)
      ])

      // Load last message and unread count for each conversation
      const conversationsWithMessages = await Promise.all(
        conversationsData.map(async (conv) => {
          const [messagesResult, unreadResult] = await Promise.all([
            supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single(),
            supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('receiver_id', user.id)
              .eq('is_read', false)
          ])

          const task = tasksResult.data?.find(t => t.id === conv.task_id)
          const participant1 = profilesResult.data?.find(p => p.id === conv.participant1_id)
          const participant2 = profilesResult.data?.find(p => p.id === conv.participant2_id)

          return {
            ...conv,
            task: task || null,
            participant1: participant1 || null,
            participant2: participant2 || null,
            last_message: messagesResult.data || null,
            unread_count: unreadResult.count || 0
          }
        })
      )

      setConversations(conversationsWithMessages)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 mb-4">No conversations yet.</p>
          <p className="text-sm text-gray-400">
            Start a conversation by viewing a task and clicking "Message" on a bid.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => {
            const otherParticipant =
              conv.participant1_id === user?.id ? conv.participant2 : conv.participant1

            const hasUnread = (conv as any).unread_count > 0

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={`block rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${
                  hasUnread 
                    ? 'bg-blue-50 border-2 border-blue-200' 
                    : 'bg-white'
                }`}
                style={{ overflow: 'hidden', wordBreak: 'break-word' }}
              >
                <div className="flex items-start justify-between min-w-0">
                  <div className="flex-1 min-w-0" style={{ overflow: 'hidden' }}>
                    <div className="flex items-center space-x-3 mb-2 flex-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <h3 className={`text-lg font-semibold ${hasUnread ? 'text-blue-900' : 'text-gray-900'}`} style={{ wordBreak: 'break-word' }}>
                        {otherParticipant?.full_name || otherParticipant?.email}
                      </h3>
                      {hasUnread && (
                        <span className="bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 flex-shrink-0">
                          {(conv as any).unread_count > 99 ? '99+' : (conv as any).unread_count}
                        </span>
                      )}
                      {conv.task && (
                        <span className={`text-sm ${hasUnread ? 'text-blue-700' : 'text-gray-500'}`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          • {conv.task.title}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (() => {
                      const content = conv.last_message.content
                      // Check if content contains a URL
                      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
                      const urlMatch = urlRegex.exec(content)
                      
                      if (urlMatch) {
                        const url = urlMatch[0]
                        const textBefore = content.substring(0, urlMatch.index).trim()
                        const isTaskUrl = url.includes('/tasks/')
                        const buttonText = isTaskUrl ? 'View Task' : 'Open Link'
                        
                        return (
                          <div className="mb-2 space-y-1">
                            {textBefore && (
                              <p className={`${hasUnread ? 'text-blue-800 font-medium' : 'text-gray-600'}`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                {textBefore}
                              </p>
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-block px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                hasUnread
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-primary-600 text-white hover:bg-primary-700'
                              }`}
                            >
                              {buttonText}
                            </a>
                          </div>
                        )
                      }
                      
                      // No URL, just show text with proper wrapping
                      return (
                        <p className={`mb-2 ${hasUnread ? 'text-blue-800 font-medium' : 'text-gray-600'}`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {content}
                        </p>
                      )
                    })()}
                    {conv.updated_at && (
                      <p className={`text-xs ${hasUnread ? 'text-blue-600' : 'text-gray-400'}`}>
                        {format(new Date(conv.updated_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}


