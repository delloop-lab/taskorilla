'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Conversation, Message } from '@/lib/types'
import { format } from 'date-fns'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (!user) return

    const initialise = async () => {
      setLoading(true)
      const conversationExists = await fetchConversation(user.id)
      if (!conversationExists) {
        setLoading(false)
        return
      }

      await fetchMessages()
      setLoading(false)

      channel = setupRealtime(() => {
        fetchMessages()
      })
    }

    let channel: RealtimeChannel | null = null

    initialise()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [conversationId, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
  }

  const fetchConversation = async (currentUserId: string) => {
    try {
      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (error) throw error

      if (!convData) {
        return false
      }

      const isParticipant =
        convData.participant1_id === currentUserId ||
        convData.participant2_id === currentUserId

      if (!isParticipant) {
        router.push('/messages')
        return false
      }

      const [taskResult, participant1Result, participant2Result] = await Promise.all([
        supabase.from('tasks').select('id, title').eq('id', convData.task_id).single(),
        supabase.from('profiles').select('id, email, full_name, avatar_url').eq('id', convData.participant1_id).single(),
        supabase.from('profiles').select('id, email, full_name, avatar_url').eq('id', convData.participant2_id).single()
      ])

      setConversation({
        ...convData,
        task: taskResult.data || null,
        participant1: participant1Result.data || null,
        participant2: participant2Result.data || null
      })

      return true
    } catch (error) {
      console.error('Error loading conversation:', error)
      return false
    }
  }

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (messagesData && messagesData.length > 0) {
        // Mark messages as read if current user is the receiver
        if (user) {
          // Filter unread messages - handle case where is_read might be null/undefined
          const unreadMessages = messagesData.filter(
            m => m.receiver_id === user.id && (m.is_read === false || m.is_read === null || m.is_read === undefined)
          )

          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map(m => m.id)
            
            const { error: updateError } = await supabase
              .from('messages')
              .update({ is_read: true })
              .in('id', messageIds)
            
            if (updateError) {
              console.error('Error marking messages as read:', updateError)
              // If column doesn't exist, log a helpful message
              if (updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
                console.error('⚠️ The is_read column does not exist. Please run the SQL script: supabase/add_message_read_status.sql')
              }
            } else {
              // Force a refresh of the navbar count by dispatching a custom event
              // This ensures the count updates even if real-time subscription is delayed
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('messages-read'))
              }, 100)
            }
          }
        }

        // Fetch profiles for senders and receivers
        const userIds = Array.from(new Set([
          ...messagesData.map(m => m.sender_id),
          ...messagesData.map(m => m.receiver_id)
        ]))

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds)

        // Map profiles to messages
        const messagesWithProfiles = messagesData.map(message => ({
          ...message,
          sender: profilesData?.find(p => p.id === message.sender_id),
          receiver: profilesData?.find(p => p.id === message.receiver_id)
        }))

        setMessages(messagesWithProfiles)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const setupRealtime = (onNewMessage: () => void) => {
    return supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          onNewMessage()
        }
      )
      .subscribe()
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !conversation) return

    setSending(true)
    try {
      const receiverId =
        conversation.participant1_id === user.id
          ? conversation.participant2_id
          : conversation.participant1_id

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: newMessage,
      })

      if (error) throw error

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      // Send email notification to receiver
      try {
        const receiver = conversation.participant1_id === user.id 
          ? conversation.participant2 
          : conversation.participant1

        console.log('📧 Email notification check:', {
          receiver: receiver,
          receiverEmail: receiver?.email,
          conversationId: conversationId
        })

        if (receiver && receiver.email) {
          // Get sender's full name
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

          console.log('📧 Sending email notification to:', receiver.email)
          
          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_message',
              recipientEmail: receiver.email,
              recipientName: receiver.full_name || receiver.email,
              senderName: senderProfile?.full_name || senderProfile?.email || user.email,
              messagePreview: newMessage.substring(0, 100),
              conversationId: conversationId,
            }),
          })

          const emailResult = await emailResponse.json()
          if (emailResponse.ok) {
            console.log('✅ Email notification sent successfully:', emailResult)
          } else {
            console.error('❌ Email notification failed:', emailResult)
          }
        } else {
          console.warn('⚠️ Cannot send email: receiver email not found', { receiver })
        }
      } catch (emailError) {
        console.error('❌ Error sending email notification:', emailError)
        // Don't fail message sending if email fails
      }

      setNewMessage('')
      fetchMessages()
    } catch (error: any) {
      alert(error.message || 'Error sending message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading conversation...</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Conversation not found</div>
      </div>
    )
  }

  const otherParticipant =
    conversation.participant1_id === user?.id
      ? conversation.participant2
      : conversation.participant1

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.push('/messages')}
        className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
      >
        ← Back to messages
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Conversation with {otherParticipant?.full_name || otherParticipant?.email}
        </h1>
        {conversation.task && (
          <p className="text-gray-600">About: {conversation.task.title}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-4 h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id
              const isUnread = !isOwn && !message.is_read
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                      isOwn
                        ? 'bg-primary-600 text-white'
                        : isUnread
                        ? 'bg-blue-100 border-2 border-blue-400 text-gray-900'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {isUnread && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        !
                      </span>
                    )}
                    {!isOwn && (
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {message.sender?.full_name || message.sender?.email}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                      {format(new Date(message.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="bg-white rounded-lg shadow-md p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-primary-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}


