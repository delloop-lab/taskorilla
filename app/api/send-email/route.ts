import { NextRequest, NextResponse } from 'next/server'
import {
  sendNewBidNotification,
  sendBidAcceptedNotification,
  sendBidRejectedNotification,
  sendNewMessageNotification,
  sendTaskCompletedNotification,
  sendPayoutInitiatedNotification,
  sendTaskCancelledNotification,
  sendAdminEmail,
  sendProfileCompletionEmail,
} from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  let emailLogData: any = null
  
  try {
    const body = await request.json()
    const { type, ...params } = body

    // Get current user for logging
    const { data: { user } } = await supabase.auth.getUser()

    switch (type) {
      case 'new_bid':
        emailLogData = {
          recipient_email: params.taskOwnerEmail,
          recipient_name: params.taskOwnerName,
          subject: `New bid on "${params.taskTitle}"`,
          email_type: 'new_bid',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            bidderName: params.bidderName,
            bidAmount: params.bidAmount,
          },
        }
        await sendNewBidNotification(
          params.taskOwnerEmail,
          params.taskOwnerName,
          params.taskTitle,
          params.bidderName,
          params.bidAmount,
          params.taskId
        )
        break

      case 'bid_accepted':
        emailLogData = {
          recipient_email: params.bidderEmail,
          recipient_name: params.bidderName,
          subject: `Your bid was accepted for "${params.taskTitle}"`,
          email_type: 'bid_accepted',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskOwnerName: params.taskOwnerName,
            bidAmount: params.bidAmount,
          },
        }
        await sendBidAcceptedNotification(
          params.bidderEmail,
          params.bidderName,
          params.taskTitle,
          params.taskOwnerName,
          params.bidAmount,
          params.taskId
        )
        break

      case 'bid_rejected':
        emailLogData = {
          recipient_email: params.bidderEmail,
          recipient_name: params.bidderName,
          subject: `Update on your bid for "${params.taskTitle}"`,
          email_type: 'bid_rejected',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
          },
        }
        await sendBidRejectedNotification(
          params.bidderEmail,
          params.bidderName,
          params.taskTitle,
          params.taskId
        )
        break

      case 'new_message':
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: `New message from ${params.senderName}`,
          email_type: 'new_message',
          metadata: {
            senderName: params.senderName,
            messagePreview: params.messagePreview,
            conversationId: params.conversationId,
          },
        }
        await sendNewMessageNotification(
          params.recipientEmail,
          params.recipientName,
          params.senderName,
          params.messagePreview,
          params.conversationId
        )
        break

      case 'task_completed':
        emailLogData = {
          recipient_email: params.taskOwnerEmail,
          recipient_name: params.taskOwnerName,
          subject: `Task "${params.taskTitle}" has been completed`,
          email_type: 'task_completed',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskerName: params.taskerName,
          },
        }
        await sendTaskCompletedNotification(
          params.taskOwnerEmail,
          params.taskOwnerName,
          params.taskerName,
          params.taskTitle,
          params.taskId
        )
        break

      case 'payout_initiated':
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: `💰 Payout initiated for "${params.taskTitle}"`,
          email_type: 'payout_initiated',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            payoutAmount: params.payoutAmount,
            platformFee: params.platformFee,
          },
        }
        await sendPayoutInitiatedNotification(
          params.recipientEmail,
          params.recipientName,
          params.taskTitle,
          params.payoutAmount,
          params.platformFee,
          params.taskId
        )
        break

      case 'task_cancelled':
        emailLogData = {
          recipient_email: params.taskOwnerEmail,
          recipient_name: params.taskOwnerName,
          subject: `Task "${params.taskTitle}" has been cancelled`,
          email_type: 'task_cancelled',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskerName: params.taskerName,
          },
        }
        await sendTaskCancelledNotification(
          params.taskOwnerEmail,
          params.taskOwnerName,
          params.taskerName,
          params.taskTitle,
          params.taskId
        )
        break

      case 'admin_email':
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: params.subject,
          email_type: 'admin_email',
          sent_by: user?.id,
          related_user_id: params.relatedUserId,
          metadata: {
            message: params.message,
          },
        }
        await sendAdminEmail(
          params.recipientEmail,
          params.recipientName,
          params.subject,
          params.message
        )
        break

      case 'profile_completion':
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: 'Complete Your Taskorilla Profile',
          email_type: 'profile_completion',
          sent_by: user?.id,
          related_user_id: params.relatedUserId,
        }
        await sendProfileCompletionEmail(
          params.recipientEmail,
          params.recipientName
        )
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    // Log successful email send
    if (emailLogData) {
      await logEmail({
        ...emailLogData,
        status: 'sent',
      })
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error: any) {
    // Log failed email send
    if (emailLogData) {
      await logEmail({
        ...emailLogData,
        status: 'failed',
        error_message: error.message || 'Unknown error',
      })
    }

    console.error('❌ Error in send-email API route:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
