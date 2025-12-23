import nodemailer from 'nodemailer'

// Get SMTP password - support both SMTP_PASSWORD and SMTP_PASS for compatibility
const getSMTPPassword = () => {
  return process.env.SMTP_PASSWORD || process.env.SMTP_PASS
}

// Validate SMTP configuration
const validateSMTPConfig = () => {
  const required = ['SMTP_HOST', 'SMTP_USER']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error(`❌ Missing required SMTP environment variables: ${missing.join(', ')}`)
    console.error('Email sending will fail until these are configured in your .env file')
    return false
  }
  
  if (!getSMTPPassword()) {
    console.error('❌ Missing SMTP password. Please set SMTP_PASSWORD or SMTP_PASS in your .env file')
    return false
  }
  
  return true
}

// Validate on module load (non-blocking)
const isSMTPConfigured = validateSMTPConfig()

// Create SMTP transporter with full configuration from environment variables
// Only create if SMTP is properly configured
let transporter: nodemailer.Transporter | null = null

if (isSMTPConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER!,
      pass: getSMTPPassword()!,
    },
    // Additional SMTP options for better compatibility
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates if needed
    },
  })

  // Verify transporter connection on startup (non-blocking, don't await)
  transporter.verify((error) => {
    if (error) {
      console.error('❌ SMTP connection verification failed:', error.message)
      console.error('Please check your SMTP configuration in .env file')
    } else {
      console.log('✅ SMTP transporter configured and ready')
    }
  })
} else {
  console.warn('⚠️ SMTP transporter not created - missing required environment variables')
}

const getFromAddress = () => {
  if (!process.env.SMTP_FROM) {
    console.warn('⚠️ SMTP_FROM not set, using default address')
  }
  return process.env.SMTP_FROM || 'tee@taskorilla.com'
}

// Helper function to check transporter availability
const ensureTransporter = () => {
  if (!transporter) {
    throw new Error('SMTP transporter not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD (or SMTP_PASS) in your .env file')
  }
  return transporter
}

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
    const mailTransporter = ensureTransporter()
    await mailTransporter.sendMail({
      from: getFromAddress(),
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
  } catch (error: any) {
    console.error('Error sending new bid notification:', error)
    throw new Error(`Failed to send new bid notification: ${error.message || 'Unknown error'}`)
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
    const mailTransporter = ensureTransporter()
    await mailTransporter.sendMail({
      from: getFromAddress(),
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
  } catch (error: any) {
    console.error('Error sending bid accepted notification:', error)
    throw new Error(`Failed to send bid accepted notification: ${error.message || 'Unknown error'}`)
  }
}

export async function sendBidRejectedNotification(
  bidderEmail: string,
  bidderName: string,
  taskTitle: string,
  taskId: string
) {
  try {
    const mailTransporter = ensureTransporter()
    await mailTransporter.sendMail({
      from: getFromAddress(),
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
  } catch (error: any) {
    console.error('Error sending bid rejected notification:', error)
    throw new Error(`Failed to send bid rejected notification: ${error.message || 'Unknown error'}`)
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
    const mailTransporter = ensureTransporter()
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
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
    const mailTransporter = ensureTransporter()
    await mailTransporter.sendMail({
      from: getFromAddress(),
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

export async function sendPayoutInitiatedNotification(
  recipientEmail: string,
  recipientName: string,
  taskTitle: string,
  payoutAmount: string,
  platformFee: string,
  taskId: string
) {
  try {
    const mailTransporter = ensureTransporter()
    await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: `💰 Payout initiated for "${taskTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">💰 Payout Initiated!</h2>
          <p>Hi ${recipientName},</p>
          <p>Great news! The task owner has confirmed completion of your work, and your payout has been initiated.</p>
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
            <h3 style="margin-top: 0; color: #166534;">${taskTitle}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Payout Amount:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #166534; font-size: 18px;">€${payoutAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; border-top: 1px solid #d1fae5;">Platform Fee:</td>
                <td style="padding: 8px 0; text-align: right; color: #666; border-top: 1px solid #d1fae5;">€${platformFee}</td>
              </tr>
            </table>
          </div>
          <p style="color: #666; font-size: 14px;">The payout will be transferred to your registered bank account within 1-3 business days.</p>
          <p>Don't forget to leave a review for the task owner!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
             style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View Task & Leave Review
          </a>
        </div>
      `,
    })
    console.log('✅ Payout notification email sent to:', recipientEmail)
  } catch (error) {
    console.error('Error sending payout notification:', error)
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
    const mailTransporter = ensureTransporter()
    await mailTransporter.sendMail({
      from: getFromAddress(),
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

export async function sendAdminEmail(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  message: string,
  attachment?: File
) {
  try {
    const mailTransporter = ensureTransporter()
    
    // Prepare attachments array if file is provided
    const attachments: any[] = []
    if (attachment) {
      // Convert File to buffer
      const arrayBuffer = await attachment.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      attachments.push({
        filename: attachment.name,
        content: buffer,
        contentType: attachment.type || undefined,
      })
    }

    await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${subject}</h2>
          <p>Hi ${recipientName},</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            This is an administrative message from Taskorilla.
          </p>
        </div>
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
  } catch (error: any) {
    console.error('Error sending admin email:', error)
    throw new Error(`Failed to send admin email: ${error.message || 'Unknown error'}`)
  }
}

export async function sendProfileCompletionEmail(
  recipientEmail: string,
  recipientName: string
) {
  try {
    const mailTransporter = ensureTransporter()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // Use login redirect to preserve setup=required through login flow
    const profileLink = `${appUrl}/login?redirect=${encodeURIComponent('/profile?setup=required')}`
    
    await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: 'Complete Your Taskorilla Profile',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Complete Your Profile</h2>
          <p>Hi ${recipientName || 'there'},</p>
          <p>Your Taskorilla profile is incomplete. To use all features of the platform, please complete your profile with the following required information:</p>
          <ul style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <li style="margin-bottom: 8px;"><strong>Full Name</strong></li>
            <li style="margin-bottom: 8px;"><strong>Country</strong></li>
            <li style="margin-bottom: 8px;"><strong>Phone Number</strong> (with country code)</li>
          </ul>
          <p>Once you complete your profile, you'll be able to:</p>
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Browse and post tasks</li>
            <li>Submit bids on tasks</li>
            <li>Message other users</li>
            <li>Access all platform features</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileLink}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Complete Your Profile
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            Or copy and paste this link into your browser:<br>
            <a href="${profileLink}" style="color: #2563eb; word-break: break-all;">${profileLink}</a>
          </p>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            This is an administrative message from Taskorilla.
          </p>
        </div>
      `,
    })
  } catch (error: any) {
    console.error('Error sending profile completion email:', error)
    throw new Error(`Failed to send profile completion email: ${error.message || 'Unknown error'}`)
  }
}

