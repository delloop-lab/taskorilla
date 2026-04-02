'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Message, Conversation } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Send, Trash2, User as UserIcon } from 'lucide-react'
import StandardModal from '@/components/StandardModal'
import { checkForContactInfo, getRestrictionHint } from '@/lib/content-filter'
import { compressTaskImage } from '@/lib/image-utils'
import { canRevealFullNameForTask, getDisplayName } from '@/lib/name-privacy'
import { isBidUpdateSystemMessage, isBidWithdrawnSystemMessage } from '@/lib/bid-chat-message'
import { useLanguage } from '@/lib/i18n'

export default function ConversationPage() {
  const { t } = useLanguage()
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
  const [allowCurrencyInChat, setAllowCurrencyInChat] = useState(false)
  const [currentUserPaused, setCurrentUserPaused] = useState(false)
  const [otherUserPaused, setOtherUserPaused] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_paused')
        .eq('id', user.id)
        .single()
      setCurrentUserPaused(profile?.is_paused === true)
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
              .select('id, email, full_name, avatar_url, is_paused')
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
          setOtherUserPaused(participantResult.data?.is_paused === true)
          setTask(taskResult.data)

          const taskData = taskResult.data
          if (!taskData) {
            setAllowCurrencyInChat(false)
          } else {
            // Allow currency terms once the helper in this conversation has placed a bid on this task.
            const helperId = taskData.created_by === user.id ? participantResult.data?.id : user.id
            if (!helperId) {
              setAllowCurrencyInChat(false)
            } else {
              const { count: helperBidCount, error: bidError } = await supabase
                .from('bids')
                .select('id', { count: 'exact', head: true })
                .eq('task_id', taskData.id)
                .eq('user_id', helperId)

              if (bidError) {
                setAllowCurrencyInChat(false)
              } else {
                setAllowCurrencyInChat((helperBidCount || 0) > 0)
              }
            }
          }
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

  const removeThisChatFromInbox = async () => {
    if (!user) return
    if (!confirm(t('messages.removeInboxConfirmDetail'))) {
      return
    }
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', user.id)

    const { error } = await supabase.from('user_hidden_conversations').insert({
      user_id: user.id,
      conversation_id: conversationId,
    })
    if (error) {
      if (error.code === '23505') {
        window.dispatchEvent(new Event('messages-read'))
        router.push('/messages')
        return
      }
      setModalState({
        isOpen: true,
        type: 'error',
        title: t('messages.error'),
        message: error.message || t('messages.couldNotRemoveChat'),
      })
      return
    }
    window.dispatchEvent(new Event('messages-read'))
    router.push('/messages')
  }

  const softDeleteMessage = async (messageId: string) => {
    if (!confirm(t('messages.removeMessageEveryone'))) return
    setDeletingId(messageId)
    try {
      const { data, error } = await supabase.rpc('soft_delete_own_message', {
        p_message_id: messageId,
      })
      if (error) throw error
      if (data && typeof data === 'object' && 'success' in data && !(data as { success: boolean }).success) {
        throw new Error((data as { error?: string }).error || t('messages.couldNotDeleteMessage'))
      }
      await loadMessages()
    } catch (err: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: t('messages.error'),
        message: err?.message || t('messages.couldNotDeleteMessage'),
      })
    } finally {
      setDeletingId(null)
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
        title: t('messages.error'),
        message: error.message || t('messages.errorUploadingImage'),
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
  const revealFullNameForTask = canRevealFullNameForTask({
    viewerId: user?.id,
    taskCreatorId: task?.created_by,
    acceptedBidUserIds:
      task?.assigned_to && ['pending_payment', 'assigned', 'in_progress', 'completed'].includes(task?.status)
        ? [task.assigned_to]
        : [],
  })
  const isLockedTaskConversation = task?.status === 'locked'

  const getBlockReasonLabel = (detectedReason: string | null): string => {
    if (!detectedReason) return 'This message cannot be shared yet.'
    if (detectedReason.includes('address')) return 'Looks like an exact address.'
    if (detectedReason.includes('phone') || detectedReason.includes('email') || detectedReason.includes('social')) {
      return 'Looks like contact details.'
    }
    if (detectedReason.includes('messaging app') || detectedReason.includes('off-platform')) {
      return 'Looks like off-platform contact details.'
    }
    if (detectedReason.includes('payment') || detectedReason.includes('currency')) {
      return 'Looks like payment details.'
    }
    return 'This message cannot be shared yet.'
  }

  const tryConsumeOneTimeOverride = async (detectedReason: string | null): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      const res = await fetch('/api/messages/consume-filter-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId,
          detectedReason,
        }),
      })

      if (!res.ok) return false
      const payload = await res.json()
      return payload?.allowed === true
    } catch {
      return false
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !messageImage) || !user || !conversation || sending) return

    // Block paused users from sending
    if (currentUserPaused) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: t('messages.accountPausedTitle'),
        message: t('messages.accountPausedMessage'),
      })
      return
    }

    if (isLockedTaskConversation) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Chat is currently closed',
        message: "This task has been finalized or closed, so new messages can't be sent. Check your Task Dashboard for active jobs!",
      })
      return
    }

    // Before payment (or when task is missing), keep current safety behaviour.
    if (!canShareContact) {
      const contentCheck = checkForContactInfo(newMessage, { allowPaymentTerms: allowCurrencyInChat })
      if (!contentCheck.isClean) {
        const overrideConsumed = await tryConsumeOneTimeOverride(contentCheck.detectedReason)
        if (overrideConsumed) {
          // Admin granted a one-time bypass for this conversation.
        } else {
          // Log blocked pre-bid message attempt for admin visibility
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'message_blocked_pre_bid',
              recipientEmail: otherParticipant?.email || null,
              recipientName: otherParticipant?.full_name || otherParticipant?.email || 'User',
              senderName: user?.email || 'Someone',
              messagePreview: newMessage.trim().substring(0, 160),
              messageContent: newMessage.trim(),
              conversationId: conversationId,
              taskId: task?.id || null,
              blockedReason: contentCheck.detectedReason || 'policy_violation',
              hasImage: !!messageImage,
            }),
          }).catch(() => {})

          setModalState({
            isOpen: true,
            type: 'warning',
            title: t('messages.contactInfoDetectedTitle'),
            message: `${getBlockReasonLabel(contentCheck.detectedReason)} ${contentCheck.message} ${getRestrictionHint(contentCheck.detectedReason)}`,
          })
          return
        }
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

      // Un-hide conversation for the receiver so the message appears in their inbox
      await supabase
        .from('user_hidden_conversations')
        .delete()
        .eq('user_id', receiverId)
        .eq('conversation_id', conversationId)

      if (messageImage && !canShareContact) {
        supabase.auth.getSession().then(({ data }) => {
          const token = data?.session?.access_token
          fetch('/api/alert-admin-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              conversationId,
              taskTitle: task?.title,
              messagePreview: newMessage.trim().substring(0, 180),
            }),
          }).catch(() => {})
        })
      }

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
              hasImage: !!messageImage,
              bidAccepted: canShareContact,
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
        title: t('messages.error'),
        message: t('messages.errorSendingMessagePrefix') + (error.message || t('messages.unknownError')),
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">{t('messages.loadingConversation')}</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('messages.conversationNotFound')}</p>
          <Link href="/messages" className="text-primary-600 hover:text-primary-700">
            ← {t('messages.backToMessages')}
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
          {t('messages.backToMessages')}
        </Link>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center space-x-3 min-w-0">
              {otherParticipant?.avatar_url ? (
                <img
                  src={otherParticipant.avatar_url}
                  alt={getDisplayName({
                    fullName: otherParticipant.full_name,
                    email: otherParticipant.email,
                    revealFull: revealFullNameForTask,
                  })}
                  className="w-10 h-10 aspect-square rounded-full object-cover object-center flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 aspect-square rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {getDisplayName({
                    fullName: otherParticipant?.full_name,
                    email: otherParticipant?.email,
                    revealFull: revealFullNameForTask,
                  }) || t('messages.unknownUser')}
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
            <button
              type="button"
              onClick={removeThisChatFromInbox}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('messages.removeFromInboxButton')}
            </button>
          </div>
        </div>
      </div>

      {canShareContact && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {t('messages.paymentConfirmedShareContact')}
        </div>
      )}

      {/* Messages */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>{t('messages.noMessagesYet')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              if (message.deleted_at) {
                return (
                  <div key={message.id} className="flex justify-center w-full min-w-0">
                    <p className="text-sm text-gray-400 italic px-3 py-1">{t('messages.messageRemoved')}</p>
                  </div>
                )
              }

              if (message.content && isBidUpdateSystemMessage(message.content)) {
                return (
                  <div key={message.id} className="flex justify-center w-full min-w-0">
                    <div
                      className="max-w-[95%] rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-center text-sm text-primary-900"
                      style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    >
                      {message.content}
                    </div>
                  </div>
                )
              }

              if (message.content && isBidWithdrawnSystemMessage(message.content)) {
                return (
                  <div key={message.id} className="flex justify-center w-full min-w-0">
                    <div
                      className="max-w-[95%] rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900"
                      style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    >
                      {message.content}
                    </div>
                  </div>
                )
              }

              const isOwnMessage = message.sender_id === user?.id
              const canDeleteThisMessage =
                isOwnMessage &&
                !!(message.content || message.image_url) &&
                !isBidUpdateSystemMessage(message.content || '') &&
                !isBidWithdrawnSystemMessage(message.content || '')

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} min-w-0 w-full group/msg`}
                >
                  <div
                    className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${canDeleteThisMessage ? 'pr-9 pt-8 sm:pt-3' : ''} ${
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
                    {canDeleteThisMessage && (
                      <button
                        type="button"
                        onClick={() => softDeleteMessage(message.id)}
                        disabled={deletingId === message.id}
                        className="absolute top-1 right-1 p-1 rounded opacity-70 hover:opacity-100 hover:bg-black/10 text-current disabled:opacity-40"
                        title={t('messages.removeMessageTitle')}
                        aria-label={t('messages.removeMessageAria')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isOwnMessage && message.sender && (
                      <p className="text-xs font-semibold mb-1 opacity-75 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {getDisplayName({
                          fullName: message.sender.full_name,
                          email: message.sender.email,
                          revealFull: revealFullNameForTask,
                        })}
                      </p>
                    )}
                    {message.image_url && (
                      <div className="mb-2">
                        <img
                          src={message.image_url}
                          alt={t('messages.messageAttachmentAlt')}
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
      {currentUserPaused && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 font-medium">
          {t('messages.pausedBanner')}{' '}
          <Link href="/contact" className="underline">{t('messages.contactSupportLink')}</Link>.
        </div>
      )}
      {!currentUserPaused && otherUserPaused && (
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
          {t('messages.otherUserUnavailable')}
        </div>
      )}
      {!currentUserPaused && !otherUserPaused && isLockedTaskConversation && (
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
          This task is locked. Messaging is disabled for this conversation.
        </div>
      )}
      <form onSubmit={handleSendMessage} className={`bg-white rounded-lg shadow-md p-4 ${currentUserPaused || otherUserPaused || isLockedTaskConversation ? 'opacity-50 pointer-events-none' : ''}`}>
        {messageImage && (
          <div className="mb-3 relative inline-block max-w-full">
            <img
              src={messageImage}
              alt={t('messages.previewAlt')}
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
              placeholder={t('messages.typeMessagePlaceholder')}
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
              {uploadingImage ? t('messages.uploading') : t('messages.attachPhoto')}
            </label>
          </div>
          <button
            type="submit"
            disabled={(!newMessage.trim() && !messageImage) || sending || uploadingImage}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? t('messages.sending') : t('messages.send')}</span>
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
