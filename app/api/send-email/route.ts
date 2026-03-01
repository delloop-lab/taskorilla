import { NextRequest, NextResponse } from 'next/server'
import {
  sendNewBidNotification,
  sendBidSelectedPendingPayment,
  sendBidAcceptedNotification,
  sendBidRejectedNotification,
  sendNewMessageNotification,
  sendTaskCompletedNotification,
  sendHelperFinishedNotification,
  sendPayoutInitiatedNotification,
  sendTaskCancelledNotification,
  sendTaskProgressUpdateNotification,
  sendRevisionRequestedNotification,
  sendRevisionCompletedNotification,
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
        const newBidResult = await sendNewBidNotification(
          params.taskOwnerEmail,
          params.taskOwnerName,
          params.taskTitle,
          params.bidderName,
          params.bidAmount,
          params.taskId
        )
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
            html_content: newBidResult.htmlContent,
          },
        }
        break

      case 'bid_selected_pending_payment': {
        const bidSelectedResult = await sendBidSelectedPendingPayment(
          params.bidderEmail,
          params.bidderName,
          params.taskTitle,
          params.taskOwnerName,
          params.bidAmount,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.bidderEmail,
          recipient_name: params.bidderName,
          subject: `Your bid was selected for "${params.taskTitle}" — awaiting payment`,
          email_type: 'bid_selected_pending_payment',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskOwnerName: params.taskOwnerName,
            bidAmount: params.bidAmount,
            html_content: bidSelectedResult.htmlContent,
          },
        }
        break
      }

      case 'bid_accepted': {
        const bidAcceptedResult = await sendBidAcceptedNotification(
          params.bidderEmail,
          params.bidderName,
          params.taskTitle,
          params.taskOwnerName,
          params.bidAmount,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.bidderEmail,
          recipient_name: params.bidderName,
          subject: `Payment confirmed — start work on "${params.taskTitle}"`,
          email_type: 'bid_accepted',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskOwnerName: params.taskOwnerName,
            bidAmount: params.bidAmount,
            html_content: bidAcceptedResult.htmlContent,
          },
        }
        break
      }

      case 'bid_rejected':
        const bidRejectedResult = await sendBidRejectedNotification(
          params.bidderEmail,
          params.bidderName,
          params.taskTitle,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.bidderEmail,
          recipient_name: params.bidderName,
          subject: `Update on your bid for "${params.taskTitle}"`,
          email_type: 'bid_rejected',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            html_content: bidRejectedResult.htmlContent,
          },
        }
        break

      case 'new_message':
        const newMessageResult = await sendNewMessageNotification(
          params.recipientEmail,
          params.recipientName,
          params.senderName,
          params.messagePreview,
          params.conversationId
        )
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: `New message from ${params.senderName}`,
          email_type: 'new_message',
          metadata: {
            senderName: params.senderName,
            messagePreview: params.messagePreview,
            conversationId: params.conversationId,
            html_content: newMessageResult.htmlContent,
          },
        }
        break

      case 'task_completed':
        const taskCompletedResult = await sendTaskCompletedNotification(
          params.taskOwnerEmail,
          params.taskOwnerName,
          params.taskerName,
          params.taskTitle,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.taskOwnerEmail,
          recipient_name: params.taskOwnerName,
          subject: `Task "${params.taskTitle}" has been completed`,
          email_type: 'task_completed',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskerName: params.taskerName,
            html_content: taskCompletedResult.htmlContent,
          },
        }
        break

      case 'payout_initiated':
        const payoutInitiatedResult = await sendPayoutInitiatedNotification(
          params.recipientEmail,
          params.recipientName,
          params.taskTitle,
          params.payoutAmount,
          params.platformFee,
          params.taskId
        )
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
            html_content: payoutInitiatedResult.htmlContent,
          },
        }
        break

      case 'task_cancelled':
        const taskCancelledResult = await sendTaskCancelledNotification(
          params.taskOwnerEmail,
          params.taskOwnerName,
          params.taskerName,
          params.taskTitle,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.taskOwnerEmail,
          recipient_name: params.taskOwnerName,
          subject: `Task "${params.taskTitle}" has been cancelled`,
          email_type: 'task_cancelled',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskerName: params.taskerName,
            html_content: taskCancelledResult.htmlContent,
          },
        }
        break

      case 'task_progress_update':
        const taskProgressUpdateResult = await sendTaskProgressUpdateNotification(
          params.taskOwnerEmail,
          params.taskOwnerName,
          params.helperName,
          params.taskTitle,
          params.progressPreview,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.taskOwnerEmail,
          recipient_name: params.taskOwnerName,
          subject: `New update on "${params.taskTitle}"`,
          email_type: 'task_progress_update',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            helperName: params.helperName,
            progressPreview: params.progressPreview,
            html_content: taskProgressUpdateResult.htmlContent,
          },
        }
        break

      case 'helper_finished':
        const helperFinishedResult = await sendHelperFinishedNotification(
          params.recipientEmail,
          params.recipientName,
          params.helperName,
          params.taskTitle,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: `Task Completed: "${params.taskTitle}"`,
          email_type: 'helper_finished',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            helperName: params.helperName,
            html_content: helperFinishedResult.htmlContent,
          },
        }
        break

      case 'revision_requested':
        const revisionRequestedResult = await sendRevisionRequestedNotification(
          params.recipientEmail,
          params.recipientName,
          params.taskOwnerName,
          params.taskTitle,
          params.requestPreview,
          params.taskId
        )
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: `Revision Requested: "${params.taskTitle}"`,
          email_type: 'revision_requested',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            taskOwnerName: params.taskOwnerName,
            requestPreview: params.requestPreview,
            html_content: revisionRequestedResult.htmlContent,
          },
        }
        break

      case 'revision_completed':
        const revisionCompletedResult = await sendRevisionCompletedNotification(
          params.recipientEmail,
          params.recipientName,
          params.helperName,
          params.taskTitle,
          params.completionSummary || '',
          params.taskId
        )
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: `Revision Completed: "${params.taskTitle}"`,
          email_type: 'revision_completed',
          related_task_id: params.taskId,
          metadata: {
            taskTitle: params.taskTitle,
            helperName: params.helperName,
            completionSummary: params.completionSummary || '',
            html_content: revisionCompletedResult.htmlContent,
          },
        }
        break

      case 'admin_email':
        const adminEmailResult = await sendAdminEmail(
          params.recipientEmail,
          params.recipientName,
          params.subject,
          params.message,
          attachmentFile || undefined
        )
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: params.subject,
          email_type: 'admin_email',
          sent_by: user?.id,
          related_user_id: params.relatedUserId,
          metadata: {
            message: params.message,
            html_content: adminEmailResult.htmlContent,
            hasAttachment: !!attachmentFile,
            attachmentName: attachmentFile?.name || null,
          },
        }
        break

      case 'profile_completion':
        const profileCompletionResult = await sendProfileCompletionEmail(
          params.recipientEmail,
          params.recipientName
        )
        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: 'Complete Your Taskorilla Profile',
          email_type: 'profile_completion',
          sent_by: user?.id,
          related_user_id: params.relatedUserId,
          metadata: {
            html_content: profileCompletionResult.htmlContent,
          },
        }
        break

      case 'template_email':
        // Check if this is a test email (has htmlContent provided directly)
        let emailSubject: string
        let emailHtmlContent: string
        
        if (params.htmlContent && params.subject) {
          // Test email - use provided content directly
          emailSubject = params.subject
          emailHtmlContent = params.htmlContent
        } else {
          // Regular template email - get template from database
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

          emailSubject = template.subject
          emailHtmlContent = template.html_content
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
          emailSubject,
          emailHtmlContent,
          {
            registration_date: registrationDate,
            ...params.variables,
          }
        )

        emailLogData = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: emailSubject,
          email_type: params.htmlContent ? 'test_email' : (params.templateType || 'template_email'),
          sent_by: user?.id,
          related_user_id: params.relatedUserId,
          metadata: {
            is_test_email: !!params.htmlContent,
            template_type: params.templateType || 'test_email',
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
