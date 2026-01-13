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
  sendTemplateEmail,
} from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  let emailLogData: any = null
  
  try {
    // Check if request is FormData (for attachments) or JSON
    const contentType = request.headers.get('content-type') || ''
    let body: any
    let attachmentFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = {
        type: formData.get('type'),
        recipientEmail: formData.get('recipientEmail'),
        recipientName: formData.get('recipientName'),
        subject: formData.get('subject'),
        message: formData.get('message'),
      }
      const attachment = formData.get('attachment')
      if (attachment instanceof File) {
        attachmentFile = attachment
      }
    } else {
      body = await request.json()
    }

    const { type, ...params } = body

    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient(request)
    
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
        // Generate HTML for admin email
        const adminEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${params.message}
          </div>
        `
        
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: params.subject,
          email_type: 'admin_email',
          sent_by: user?.id,
          related_user_id: params.relatedUserId,
          metadata: {
            message: params.message,
            html_content: adminEmailHtml,
            hasAttachment: !!attachmentFile,
            attachmentName: attachmentFile?.name || null,
          },
        }
        await sendAdminEmail(
          params.recipientEmail,
          params.recipientName,
          params.subject,
          params.message,
          attachmentFile || undefined
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

      case 'template_email':
        // Get template from database
        const { data: template, error: templateError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('template_type', params.templateType)
          .single()

        if (templateError) {
          console.error('Error fetching template:', templateError)
          console.error('Template type:', params.templateType)
          console.error('User:', user?.id)
          
          // Check if it's a permission error
          if (templateError.code === 'PGRST301' || templateError.message?.includes('permission') || templateError.message?.includes('policy')) {
            return NextResponse.json(
              { error: 'Permission denied. Admin access required to fetch templates.' },
              { status: 403 }
            )
          }
          
          return NextResponse.json(
            { error: `Template not found: ${params.templateType}. Error: ${templateError.message || templateError.code}` },
            { status: 404 }
          )
        }

        if (!template) {
          return NextResponse.json(
            { error: `Template not found: ${params.templateType}. Please create the template first.` },
            { status: 404 }
          )
        }

        // Get user registration date if available
        let registrationDate = ''
        if (params.relatedUserId) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', params.relatedUserId)
            .single()
          
          if (userProfile?.created_at) {
            registrationDate = new Date(userProfile.created_at).toLocaleDateString()
          }
        }

        // Render and send template email
        const fullEmailHtml = await sendTemplateEmail(
          params.recipientEmail,
          params.recipientName,
          template.subject,
          template.html_content,
          {
            registration_date: registrationDate,
            ...params.variables,
          }
        )

        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: template.subject,
          email_type: params.templateType,
          sent_by: user?.id,
          related_user_id: params.relatedUserId,
          metadata: {
            template_id: template.id,
            template_type: template.template_type,
            html_content: fullEmailHtml, // Full HTML email with DOCTYPE, html, body tags
            variables: params.variables || {},
          },
        }
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
