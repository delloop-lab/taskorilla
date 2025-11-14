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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>

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
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className={`text-lg font-semibold ${hasUnread ? 'text-blue-900' : 'text-gray-900'}`}>
                        {otherParticipant?.full_name || otherParticipant?.email}
                      </h3>
                      {hasUnread && (
                        <span className="bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1">
                          {(conv as any).unread_count > 99 ? '99+' : (conv as any).unread_count}
                        </span>
                      )}
                      {conv.task && (
                        <span className={`text-sm ${hasUnread ? 'text-blue-700' : 'text-gray-500'}`}>
                          • {conv.task.title}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className={`truncate mb-2 ${hasUnread ? 'text-blue-800 font-medium' : 'text-gray-600'}`}>
                        {conv.last_message.content}
                      </p>
                    )}
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


