'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Message, Conversation } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Send, User as UserIcon } from 'lucide-react'
import StandardModal from '@/components/StandardModal'
import { checkForContactInfo } from '@/lib/content-filter'
import { compressTaskImage } from '@/lib/image-utils'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [messageImage, setMessageImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [otherParticipant, setOtherParticipant] = useState<any>(null)
  const [task, setTask] = useState<any>(null)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  })

  useEffect(() => {
    checkUser()
    loadConversation()
    loadMessages()
  }, [conversationId])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark messages as read when viewing
  useEffect(() => {
    if (user && messages.length > 0) {
      markMessagesAsRead()
    }
  }, [user, messages])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
  }

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (error) throw error

      setConversation(data)

      // Load other participant and task
      if (data) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const otherId = data.participant1_id === user.id 
            ? data.participant2_id 
            : data.participant1_id

          const [participantResult, taskResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, email, full_name, avatar_url')
              .eq('id', otherId)
              .single(),
            data.task_id
              ? supabase
                  .from('tasks')
                  .select('id, title, status, payment_status, created_by, assigned_to')
                  .eq('id', data.task_id)
                  .single()
              : Promise.resolve({ data: null })
          ])

          setOtherParticipant(participantResult.data)
          setTask(taskResult.data)
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Load sender and receiver profiles
      if (data && data.length > 0) {
        const userIds = Array.from(new Set([
          ...data.map(m => m.sender_id),
          ...data.map(m => m.receiver_id)
        ]))

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds)

        const messagesWithProfiles = data.map(message => ({
          ...message,
          sender: profiles?.find(p => p.id === message.sender_id),
          receiver: profiles?.find(p => p.id === message.receiver_id),
        }))

        setMessages(messagesWithProfiles as Message[])
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    if (!user) return

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      // Dispatch event to update unread count in navbar
      window.dispatchEvent(new Event('messages-read'))
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploadingImage(true)
    try {
      // Compress image before upload (1200x1200 max, ~100-200KB instead of 3-5MB)
      const compressedImage = await compressTaskImage(file)
      
      // Use appropriate extension based on whether compression succeeded
      const isCompressed = compressedImage.type === 'image/jpeg'
      const ext = isCompressed ? 'jpg' : (file.name.split('.').pop() || 'jpg')
      const fileName = `message-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedImage, { 
          upsert: true,
          contentType: compressedImage.type || 'image/jpeg'
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setMessageImage(data.publicUrl)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error uploading image',
      })
    } finally {
      setUploadingImage(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  // Once payment is complete for the related task and the participants are the tasker + helper,
  // we allow sharing contact info in this conversation.
  const canShareContact =
    !!task &&
    !!user &&
    task.payment_status === 'paid' &&
    (task.status === 'assigned' || task.status === 'in_progress' || task.status === 'completed') &&
    (user.id === task.created_by || user.id === task.assigned_to)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !messageImage) || !user || !conversation || sending) return

    // Before payment (or when task is missing), keep current safety behaviour.
    if (!canShareContact) {
      const contentCheck = checkForContactInfo(newMessage)
      if (!contentCheck.isClean) {
        setModalState({
          isOpen: true,
          type: 'warning',
          title: 'Contact Information Detected',
          message: contentCheck.message,
        })
        return
      }
    }

    setSending(true)
    try {
      const receiverId = conversation.participant1_id === user.id
        ? conversation.participant2_id
        : conversation.participant1_id

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id: receiverId,
          content: newMessage.trim() || '',
          image_url: messageImage || null,
        })

      if (error) throw error

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      // Send email notification
      if (otherParticipant) {
        try {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_message',
              recipientEmail: otherParticipant.email,
              recipientName: otherParticipant.full_name || otherParticipant.email,
              senderName: senderProfile?.full_name || senderProfile?.email || 'Someone',
              messagePreview: newMessage.trim().substring(0, 100),
              conversationId: conversationId,
            }),
          })
        } catch (emailError) {
          console.error('Error sending email notification:', emailError)
        }
      }

      setNewMessage('')
      setMessageImage(null)
      loadMessages()
    } catch (error: any) {
      console.error('Error sending message:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error sending message: ' + (error.message || 'Unknown error'),
      })
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
        <div className="text-center">
          <p className="text-gray-500 mb-4">Conversation not found.</p>
          <Link href="/messages" className="text-primary-600 hover:text-primary-700">
            ← Back to Messages
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/messages"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Messages
        </Link>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {otherParticipant?.avatar_url ? (
                <img
                  src={otherParticipant.avatar_url}
                  alt={otherParticipant.full_name || otherParticipant.email}
                  className="w-10 h-10 aspect-square rounded-full object-cover object-center flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 aspect-square rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {otherParticipant?.full_name || otherParticipant?.email || 'Unknown User'}
                </h1>
                {task && (
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {task.title}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {canShareContact && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Payment for this task is confirmed. You can now share contact details.
        </div>
      )}

      {/* Messages */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} min-w-0 w-full`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${
                      isOwnMessage
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                    style={{ 
                      wordBreak: 'break-word', 
                      overflowWrap: 'break-word', 
                      minWidth: 0,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      flexShrink: 1,
                      boxSizing: 'border-box'
                    }}
                  >
                    {!isOwnMessage && message.sender && (
                      <p className="text-xs font-semibold mb-1 opacity-75 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {message.sender.full_name || message.sender.email}
                      </p>
                    )}
                    {message.image_url && (
                      <div className="mb-2">
                        <img
                          src={message.image_url}
                          alt="Message attachment"
                          className="max-w-full max-h-48 rounded-lg object-contain"
                        />
                      </div>
                    )}
                    {message.content && (() => {
                      // Better URL regex that captures URLs more reliably
                      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
                      const parts = []
                      let lastIndex = 0
                      let match
                      
                      // Find all URLs in the content
                      while ((match = urlRegex.exec(message.content)) !== null) {
                        // Add text before URL
                        if (match.index > lastIndex) {
                          const textBefore = message.content.substring(lastIndex, match.index)
                          if (textBefore) {
                            parts.push({
                              type: 'text',
                              content: textBefore
                            })
                          }
                        }
                        // Add URL
                        parts.push({
                          type: 'url',
                          content: match[0]
                        })
                        lastIndex = urlRegex.lastIndex
                      }
                      
                      // Add remaining text
                      if (lastIndex < message.content.length) {
                        const remainingText = message.content.substring(lastIndex)
                        if (remainingText) {
                          parts.push({
                            type: 'text',
                            content: remainingText
                          })
                        }
                      }
                      
                      // If no URLs found, just show the content
                      if (parts.length === 0) {
                        parts.push({
                          type: 'text',
                          content: message.content
                        })
                      }
                      
                      return (
                        <>
                          {parts.map((part, idx) => {
                            if (part.type === 'url') {
                              const isTaskUrl = part.content.includes('/tasks/')
                              const buttonText = isTaskUrl ? 'View Task' : 'Open Link'
                              
                              return (
                                <a
                                  key={idx}
                                  href={part.content}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-block mt-2 mb-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isOwnMessage
                                      ? 'bg-white text-primary-600 hover:bg-gray-100'
                                      : 'bg-primary-600 text-white hover:bg-primary-700'
                                  }`}
                                >
                                  {buttonText}
                                </a>
                              )
                            }
                            return (
                              <span 
                                key={idx} 
                                style={{ 
                                  wordBreak: 'break-word', 
                                  overflowWrap: 'break-word',
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                {part.content}
                              </span>
                            )
                          })}
                        </>
                      )
                    })()}
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-primary-100' : 'text-gray-500'
                      }`}
                    >
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

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="bg-white rounded-lg shadow-md p-4">
        {messageImage && (
          <div className="mb-3 relative inline-block max-w-full">
            <img
              src={messageImage}
              alt="Preview"
              className="max-w-xs max-h-32 rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setMessageImage(null)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex space-x-2">
          <div className="flex-1 flex flex-col">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            <label className="mt-2 cursor-pointer inline-flex items-center text-sm text-gray-600 hover:text-primary-600">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="sr-only"
              />
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {uploadingImage ? 'Uploading...' : 'Attach photo'}
            </label>
          </div>
          <button
            type="submit"
            disabled={(!newMessage.trim() && !messageImage) || sending || uploadingImage}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </form>
    </div>

    {/* Standard Modal */}
    <StandardModal
      isOpen={modalState.isOpen}
      onClose={() => setModalState({ ...modalState, isOpen: false })}
      type={modalState.type}
      title={modalState.title}
      message={modalState.message}
    />
    </>
  )
}
