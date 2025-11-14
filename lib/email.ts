import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email templates
export async function sendNewBidNotification(
  taskOwnerEmail: string,
  taskOwnerName: string,
  taskTitle: string,
  bidderName: string,
  bidAmount: number,
  taskId: string
) {
  try {
    await resend.emails.send({
      from: 'tee@taskorilla.com',
      to: taskOwnerEmail,
      subject: `New bid on "${taskTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Bid Received!</h2>
          <p>Hi ${taskOwnerName},</p>
          <p><strong>${bidderName}</strong> has placed a bid of <strong>$${bidAmount}</strong> on your task:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${taskTitle}</h3>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Task & Bids
          </a>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending new bid notification:', error)
  }
}

export async function sendBidAcceptedNotification(
  bidderEmail: string,
  bidderName: string,
  taskTitle: string,
  taskOwnerName: string,
  bidAmount: number,
  taskId: string
) {
  try {
    await resend.emails.send({
      from: 'tee@taskorilla.com',
      to: bidderEmail,
      subject: `Your bid was accepted for "${taskTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Congratulations!</h2>
          <p>Hi ${bidderName},</p>
          <p><strong>${taskOwnerName}</strong> has accepted your bid of <strong>$${bidAmount}</strong> for:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${taskTitle}</h3>
          </div>
          <p>The task is now assigned to you. You can start working on it!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
             style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Task
          </a>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending bid accepted notification:', error)
  }
}

export async function sendBidRejectedNotification(
  bidderEmail: string,
  bidderName: string,
  taskTitle: string,
  taskId: string
) {
  try {
    await resend.emails.send({
      from: 'tee@taskorilla.com',
      to: bidderEmail,
      subject: `Update on your bid for "${taskTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6b7280;">Bid Update</h2>
          <p>Hi ${bidderName},</p>
          <p>Unfortunately, your bid for <strong>"${taskTitle}"</strong> was not selected.</p>
          <p>Don't worry - there are plenty of other tasks available!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            Browse More Tasks
          </a>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending bid rejected notification:', error)
  }
}

export async function sendNewMessageNotification(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
) {
  try {
    console.log('📧 sendNewMessageNotification called:', {
      recipientEmail,
      recipientName,
      senderName,
      messagePreview: messagePreview.substring(0, 50) + '...',
      conversationId
    })

    const result = await resend.emails.send({
      from: 'tee@taskorilla.com',
      to: recipientEmail,
      subject: `New message from ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Message</h2>
          <p>Hi ${recipientName},</p>
          <p>You have a new message from <strong>${senderName}</strong>:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${messagePreview}"</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/messages/${conversationId}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Message
          </a>
        </div>
      `,
    })

    console.log('✅ Email sent via Resend:', result)
    return result
  } catch (error) {
    console.error('❌ Error sending new message notification:', error)
    throw error
  }
}

export async function sendTaskCompletedNotification(
  taskOwnerEmail: string,
  taskOwnerName: string,
  taskerName: string,
  taskTitle: string,
  taskId: string
) {
  try {
    await resend.emails.send({
      from: 'tee@taskorilla.com',
      to: taskOwnerEmail,
      subject: `Task "${taskTitle}" has been completed`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Task Completed!</h2>
          <p>Hi ${taskOwnerName},</p>
          <p><strong>${taskerName}</strong> has marked the following task as completed:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${taskTitle}</h3>
          </div>
          <p>Please review the work and leave a review if you're satisfied!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
             style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Task
          </a>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending task completed notification:', error)
  }
}

export async function sendTaskCancelledNotification(
  taskOwnerEmail: string,
  taskOwnerName: string,
  taskerName: string,
  taskTitle: string,
  taskId: string
) {
  try {
    await resend.emails.send({
      from: 'tee@taskorilla.com',
      to: taskOwnerEmail,
      subject: `Task "${taskTitle}" has been cancelled`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Task Cancelled</h2>
          <p>Hi ${taskOwnerName},</p>
          <p><strong>${taskerName}</strong> has cancelled the following task:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${taskTitle}</h3>
          </div>
          <p>The task is now open for new bids.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Task
          </a>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending task cancelled notification:', error)
  }
}

