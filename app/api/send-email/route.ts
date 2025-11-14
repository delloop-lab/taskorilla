import { NextRequest, NextResponse } from 'next/server'
import { sendNewBidNotification, sendBidAcceptedNotification, sendBidRejectedNotification, sendNewMessageNotification, sendTaskCompletedNotification, sendTaskCancelledNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    console.log('📧 Email API called:', { type, recipientEmail: data.recipientEmail || data.taskOwnerEmail || data.bidderEmail })

    // Check if Resend API key is set
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not set in environment variables')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    switch (type) {
      case 'new_bid':
        await sendNewBidNotification(
          data.taskOwnerEmail,
          data.taskOwnerName,
          data.taskTitle,
          data.bidderName,
          data.bidAmount,
          data.taskId
        )
        break

      case 'bid_accepted':
        await sendBidAcceptedNotification(
          data.bidderEmail,
          data.bidderName,
          data.taskTitle,
          data.taskOwnerName,
          data.bidAmount,
          data.taskId
        )
        break

      case 'bid_rejected':
        await sendBidRejectedNotification(
          data.bidderEmail,
          data.bidderName,
          data.taskTitle,
          data.taskId
        )
        break

      case 'new_message':
        await sendNewMessageNotification(
          data.recipientEmail,
          data.recipientName,
          data.senderName,
          data.messagePreview,
          data.conversationId
        )
        break

      case 'task_completed':
        await sendTaskCompletedNotification(
          data.taskOwnerEmail,
          data.taskOwnerName,
          data.taskerName,
          data.taskTitle,
          data.taskId
        )
        break

      case 'task_cancelled':
        await sendTaskCancelledNotification(
          data.taskOwnerEmail,
          data.taskOwnerName,
          data.taskerName,
          data.taskTitle,
          data.taskId
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    console.log('✅ Email sent successfully for type:', type)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Error sending email:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}

