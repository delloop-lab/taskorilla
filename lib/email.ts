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

const looksLikeEmail = (value?: string) => Boolean(value && /@/.test(value))
const safeName = (value: string | undefined | null, fallback: string) => {
  const trimmed = (value || '').trim()
  if (!trimmed || looksLikeEmail(trimmed)) return fallback
  return trimmed
}

// Email templates
export async function sendNewBidNotification(
  taskOwnerEmail: string,
  taskOwnerName: string,
  taskTitle: string,
  bidderName: string,
  bidAmount: number,
  taskId: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeTaskOwnerName = safeName(taskOwnerName, 'Task Owner')
    const safeBidderName = safeName(bidderName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Bid Received!</h2>
        <p>Hi ${safeTaskOwnerName},</p>
        <p><strong>${safeBidderName}</strong> has placed a bid of <strong>$${bidAmount}</strong> on your task:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Task & Bids
        </a>
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: taskOwnerEmail,
      subject: `New bid on "${taskTitle}"`,
      html: htmlContent,
    })
    
    return { result, htmlContent }
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
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeBidderName = safeName(bidderName, 'Helper')
    const safeTaskOwnerName = safeName(taskOwnerName, 'Task Owner')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Congratulations!</h2>
        <p>Hi ${safeBidderName},</p>
        <p><strong>${safeTaskOwnerName}</strong> has accepted your bid of <strong>$${bidAmount}</strong> for:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
        </div>
        <p>The task is now assigned to you. You can start working on it!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Task
        </a>
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: bidderEmail,
      subject: `Your bid was accepted for "${taskTitle}"`,
      html: htmlContent,
    })
    
    return { result, htmlContent }
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
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeBidderName = safeName(bidderName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b7280;">Bid Update</h2>
        <p>Hi ${safeBidderName},</p>
        <p>Unfortunately, your bid for <strong>"${taskTitle}"</strong> was not selected.</p>
        <p>Don't worry - there are plenty of other tasks available!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Browse More Tasks
        </a>
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: bidderEmail,
      subject: `Update on your bid for "${taskTitle}"`,
      html: htmlContent,
    })
    
    return { result, htmlContent }
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
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeRecipientName = safeName(recipientName, 'there')
    const safeSenderName = safeName(senderName, 'User')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Message</h2>
        <p>Hi ${safeRecipientName},</p>
        <p>You have a new message from <strong>${safeSenderName}</strong>:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-style: italic;">"${messagePreview}"</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/messages/${conversationId}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Message
        </a>
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: `New message from ${safeSenderName}`,
      html: htmlContent,
    })

    return { result, htmlContent }
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
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeTaskOwnerName = safeName(taskOwnerName, 'Task Owner')
    const safeTaskerName = safeName(taskerName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Task Completed!</h2>
        <p>Hi ${safeTaskOwnerName},</p>
        <p><strong>${safeTaskerName}</strong> has marked the following task as completed:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
        </div>
        <p>Please review the work and leave a review if you're satisfied!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Task
        </a>
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: taskOwnerEmail,
      subject: `Task "${taskTitle}" has been completed`,
      html: htmlContent,
    })
    
    return { result, htmlContent }
  } catch (error) {
    console.error('Error sending task completed notification:', error)
    throw error
  }
}

export async function sendHelperFinishedNotification(
  recipientEmail: string,
  recipientName: string,
  helperName: string,
  taskTitle: string,
  taskId: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeRecipientName = safeName(recipientName, 'Task Owner')
    const safeHelperName = safeName(helperName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Work Ready for Review</h2>
        <p>Hi ${safeRecipientName},</p>
        <p><strong>${safeHelperName}</strong> has marked this task as complete and ready for your review:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
        </div>
        <p>Please review the work and confirm completion to release payment.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Review Task
        </a>
      </div>
    `

    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: `Task Completed: "${taskTitle}"`,
      html: htmlContent,
    })

    return { result, htmlContent }
  } catch (error: any) {
    console.error('Error sending helper finished notification:', error)
    throw new Error(`Failed to send helper finished notification: ${error.message || 'Unknown error'}`)
  }
}

export async function sendPayoutInitiatedNotification(
  recipientEmail: string,
  recipientName: string,
  taskTitle: string,
  payoutAmount: string,
  platformFee: string,
  taskId: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeRecipientName = safeName(recipientName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">💰 Payout Initiated!</h2>
        <p>Hi ${safeRecipientName},</p>
        <p>Great news! The task owner has confirmed completion of your work, and your payout has been initiated for the task: <strong>${taskTitle}</strong></p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
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
        <p style="color: #666; font-size: 14px;">The payout will be made to your PayPal email address within 1-3 business days, usually sooner.</p>
        <p>Don't forget to leave a review for the task owner!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Task & Leave Review
        </a>
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: `💰 Payout initiated for "${taskTitle}"`,
      html: htmlContent,
    })
    
    console.log('✅ Payout notification email sent to:', recipientEmail)
    return { result, htmlContent }
  } catch (error) {
    console.error('Error sending payout notification:', error)
    throw error
  }
}

export async function sendTaskCancelledNotification(
  taskOwnerEmail: string,
  taskOwnerName: string,
  taskerName: string,
  taskTitle: string,
  taskId: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeTaskOwnerName = safeName(taskOwnerName, 'Task Owner')
    const safeTaskerName = safeName(taskerName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Task Cancelled</h2>
        <p>Hi ${safeTaskOwnerName},</p>
        <p><strong>${safeTaskerName}</strong> has cancelled the following task:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
        </div>
        <p>The task is now open for new bids.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Task
        </a>
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: taskOwnerEmail,
      subject: `Task "${taskTitle}" has been cancelled`,
      html: htmlContent,
    })
    
    return { result, htmlContent }
  } catch (error) {
    console.error('Error sending task cancelled notification:', error)
    throw error
  }
}

export async function sendTaskProgressUpdateNotification(
  taskOwnerEmail: string,
  taskOwnerName: string,
  helperName: string,
  taskTitle: string,
  progressPreview: string,
  taskId: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeTaskOwnerName = safeName(taskOwnerName, 'Task Owner')
    const safeHelperName = safeName(helperName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Task Progress Update</h2>
        <p>Hi ${safeTaskOwnerName},</p>
        <p><strong>${safeHelperName}</strong> has posted a new update on your task:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
          <p style="margin: 12px 0 0 0; color: #374151;">${progressPreview}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Task Update
        </a>
      </div>
    `

    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: taskOwnerEmail,
      subject: `New update on "${taskTitle}"`,
      html: htmlContent,
    })

    return { result, htmlContent }
  } catch (error: any) {
    console.error('Error sending task progress update notification:', error)
    throw new Error(`Failed to send task progress update notification: ${error.message || 'Unknown error'}`)
  }
}

export async function sendRevisionRequestedNotification(
  recipientEmail: string,
  recipientName: string,
  taskOwnerName: string,
  taskTitle: string,
  requestPreview: string,
  taskId: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeRecipientName = safeName(recipientName, 'Helper')
    const safeTaskOwnerName = safeName(taskOwnerName, 'Task Owner')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #b45309;">Revision Requested</h2>
        <p>Hi ${safeRecipientName},</p>
        <p><strong>${safeTaskOwnerName}</strong> has requested a revision on this task:</p>
        <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
          <p style="margin: 12px 0 0 0; color: #374151;">${requestPreview}</p>
        </div>
        <p>Please review the request and post an updated progress update when complete.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #b45309; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Revision Request
        </a>
      </div>
    `

    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: `Revision Requested: "${taskTitle}"`,
      html: htmlContent,
    })

    return { result, htmlContent }
  } catch (error: any) {
    console.error('Error sending revision request notification:', error)
    throw new Error(`Failed to send revision request notification: ${error.message || 'Unknown error'}`)
  }
}

export async function sendRevisionCompletedNotification(
  recipientEmail: string,
  recipientName: string,
  helperName: string,
  taskTitle: string,
  completionSummary: string,
  taskId: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const safeRecipientName = safeName(recipientName, 'Task Owner')
    const safeHelperName = safeName(helperName, 'Helper')
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #047857;">Revision Completed</h2>
        <p>Hi ${safeRecipientName},</p>
        <p><strong>${safeHelperName}</strong> has completed the requested revision and marked the task ready for your final review:</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
          <h3 style="margin-top: 0;">${taskTitle}</h3>
          ${completionSummary ? `<p style="margin: 12px 0 0 0; color: #374151;">${completionSummary}</p>` : ''}
        </div>
        <p>Please review the latest update and confirm completion when satisfied.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${taskId}" 
           style="display: inline-block; background-color: #047857; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Review Task
        </a>
      </div>
    `

    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: `Revision Completed: "${taskTitle}"`,
      html: htmlContent,
    })

    return { result, htmlContent }
  } catch (error: any) {
    console.error('Error sending revision completed notification:', error)
    throw new Error(`Failed to send revision completed notification: ${error.message || 'Unknown error'}`)
  }
}

export async function sendAdminEmail(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  message: string,
  attachment?: File
): Promise<{ result: any; htmlContent: string }> {
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

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${message}
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
    
    return { result, htmlContent }
  } catch (error: any) {
    console.error('Error sending admin email:', error)
    throw new Error(`Failed to send admin email: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get the base URL for the application
 * For emails, we need an absolute URL that's publicly accessible
 */
function getBaseUrl(): string {
  // Server-side: use environment variable or default
  // Priority: NEXT_PUBLIC_SITE_URL > NEXT_PUBLIC_VERCEL_URL > NEXT_PUBLIC_APP_URL > default
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') // Remove trailing slash
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, '')}` // Ensure https
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  // Default fallback - use localhost for development, production domain for production
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return 'https://www.taskorilla.com'
}

/**
 * Normalize HTML content by removing extra whitespace and line breaks
 * This fixes issues where templates stored in the database have extra linefeeds
 * Preserves intentional spacing while removing unwanted whitespace
 */
function normalizeTemplateHTML(html: string): string {
  if (!html) return ''
  
  let normalized = html
  
  // First, remove newlines and carriage returns from the HTML string itself
  // Tiptap outputs clean HTML, but we normalize whitespace for email compatibility
  normalized = normalized.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ')
  
  // Remove whitespace between HTML tags (this is what causes extra linefeeds)
  // But preserve single spaces that might be intentional
  // Pattern: > followed by whitespace (including tabs) followed by <
  normalized = normalized.replace(/>[\s\t]+</g, '><')
  
  // Remove empty paragraphs and divs that might cause extra spacing
  // This includes elements with only whitespace or &nbsp;
  normalized = normalized
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    .replace(/<div[^>]*>\s*<\/div>/gi, '')
    .replace(/<p[^>]*>\s*&nbsp;\s*<\/p>/gi, '')
    .replace(/<div[^>]*>\s*&nbsp;\s*<\/div>/gi, '')
    .replace(/<p[^>]*>\s*<br\s*\/?>\s*<\/p>/gi, '')
    .replace(/<div[^>]*>\s*<br\s*\/?>\s*<\/div>/gi, '')
  
  // Fix list items that might have extra spacing - be more aggressive
  // Remove ALL whitespace between list elements
  normalized = normalized.replace(/<\/li>[\s\t]*<li/gi, '</li><li')
  normalized = normalized.replace(/<\/ul>[\s\t]*<ul/gi, '</ul><ul')
  normalized = normalized.replace(/<\/ol>[\s\t]*<ol/gi, '</ol><ol')
  normalized = normalized.replace(/<\/ul>[\s\t]*<li/gi, '</ul><li')
  normalized = normalized.replace(/<\/ol>[\s\t]*<li/gi, '</ol><li')
  normalized = normalized.replace(/<li[^>]*>[\s\t]*<\/li>/gi, '') // Remove empty list items
  
  // Remove extra spacing inside list items - convert nested divs/paragraphs to inline
  // This handles cases where list items have nested paragraphs that add extra spacing
  normalized = normalized.replace(/<li[^>]*>[\s\t]*<p[^>]*>/gi, '<li>')
  normalized = normalized.replace(/<\/p>[\s\t]*<\/li>/gi, '</li>')
  normalized = normalized.replace(/<li[^>]*>[\s\t]*<div[^>]*>/gi, '<li>')
  normalized = normalized.replace(/<\/div>[\s\t]*<\/li>/gi, '</li>')
  
  // Remove whitespace between closing tags and opening tags for paragraphs/divs
  normalized = normalized.replace(/<\/p>[\s\t]*<p/gi, '</p><p')
  normalized = normalized.replace(/<\/div>[\s\t]*<div/gi, '</div><div')
  normalized = normalized.replace(/<\/p>[\s\t]*<div/gi, '</p><div')
  normalized = normalized.replace(/<\/div>[\s\t]*<p/gi, '</div><p')
  
  // Remove whitespace between closing tags and list elements
  normalized = normalized.replace(/<\/p>[\s\t]*<ul/gi, '</p><ul')
  normalized = normalized.replace(/<\/p>[\s\t]*<ol/gi, '</p><ol')
  normalized = normalized.replace(/<\/div>[\s\t]*<ul/gi, '</div><ul')
  normalized = normalized.replace(/<\/div>[\s\t]*<ol/gi, '</div><ol')
  normalized = normalized.replace(/<\/ul>[\s\t]*<p/gi, '</ul><p')
  normalized = normalized.replace(/<\/ol>[\s\t]*<p/gi, '</ol><p')
  
  // Remove excessive <br> tags (more than 2 consecutive)
  normalized = normalized.replace(/(<br\s*\/?>){3,}/gi, '<br><br>')
  
  // Collapse multiple consecutive spaces within text content to single space
  // But be careful not to break HTML attributes
  // This regex only matches spaces that are NOT inside HTML tags
  normalized = normalized.replace(/(?![^<]*>)\s{2,}/g, ' ')
  
  // Clean up any remaining whitespace at the start/end
  normalized = normalized.trim()
  
  return normalized
}

/**
 * Render email template with variables
 * Replaces {{variable_name}} placeholders with actual values
 * Also handles special shortcodes like {{tee_image}}
 */
export function renderEmailTemplate(
  htmlContent: string,
  variables: Record<string, string>
): string {
  // Handle special shortcodes FIRST (before normalization)
  // This ensures placeholders aren't affected by HTML normalization
  const baseUrl = getBaseUrl()
  
  // Construct absolute image URL - ensure no double slashes
  const imageUrl = `${baseUrl}/images/gorilla-mascot-new-email.png`.replace(/([^:]\/)\/+/g, '$1')
  
  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Email] TEE Image URL:', imageUrl)
    console.log('[Email] Base URL:', baseUrl)
  }
  
  // Replace {{tee_image}} or {{mascot}} with the mascot image BEFORE normalization
  // Use absolute URL and add display:block to prevent spacing issues
  // Maintain aspect ratio - don't constrain width, let it scale naturally
  const mascotImageHtml = `<img src="${imageUrl}" alt="Tee - Taskorilla Mascot" style="max-width: 100%; height: auto; display: block; margin: 0 auto; padding: 0;" />`
  let rendered = htmlContent.replace(/\{\{tee_image\}\}/gi, mascotImageHtml)
  rendered = rendered.replace(/\{\{mascot\}\}/gi, mascotImageHtml)
  
  // Replace regular variables BEFORE normalization
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    rendered = rendered.replace(regex, value || '')
  }
  
  // Normalize the HTML AFTER variable replacement to clean up whitespace/linefeeds
  rendered = normalizeTemplateHTML(rendered)
  
  return rendered
}

/**
 * Send email using a template
 */
export async function sendTemplateEmail(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string,
  variables: Record<string, string> = {}
): Promise<string> {
  try {
    const mailTransporter = ensureTransporter()
    
    // Extract first name from recipientName (first word before space)
    const userFirstName = recipientName ? recipientName.split(' ')[0] : ''
    
    // Render template with variables
    const renderedHtml = renderEmailTemplate(htmlContent, {
      user_name: recipientName,
      user_first_name: userFirstName,
      user_email: recipientEmail,
      ...variables,
    })

    // Wrap email content in clean HTML structure with proper line break preservation and width constraints
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    font-family: Arial, sans-serif;
    color: #333;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    background-color: #ffffff;
  }
  .email-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    word-wrap: break-word;
    word-break: normal;
    overflow-wrap: break-word;
  }
  p {
    margin: 0 0 1em 0;
    padding: 0;
    word-wrap: break-word;
    word-break: normal;
    overflow-wrap: break-word;
  }
  p:last-child {
    margin-bottom: 0;
  }
  br {
    line-height: 1.6;
  }
  ul, ol {
    margin: 0.5em 0;
    padding-left: 1.5em;
    word-wrap: break-word;
    word-break: normal;
    overflow-wrap: break-word;
  }
  li {
    margin-bottom: 0.1em;
    margin-top: 0.1em;
    padding-bottom: 0;
    padding-top: 0;
    word-wrap: break-word;
    word-break: normal;
    overflow-wrap: break-word;
  }
  li:last-child {
    margin-bottom: 0;
  }
  li p {
    margin: 0.2em 0 !important;
    padding: 0 !important;
  }
  li p:first-child {
    margin-top: 0 !important;
  }
  li p:last-child {
    margin-bottom: 0 !important;
  }
  li div {
    margin: 0.2em 0 !important;
    padding: 0 !important;
  }
  li div:first-child {
    margin-top: 0 !important;
  }
  li div:last-child {
    margin-bottom: 0 !important;
  }
  a {
    word-break: break-all;
    overflow-wrap: break-word;
  }
  /* Ensure images maintain aspect ratio and aren't constrained */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }
  /* Ensure proper box sizing */
  * {
    box-sizing: border-box;
  }
  /* Preserve whitespace and line breaks */
  [style*="white-space"] {
    white-space: pre-wrap;
  }
  /* Force text wrapping on all text elements - but allow natural word breaks */
  div, span, p, li, td, th {
    word-wrap: break-word;
    word-break: normal;
    overflow-wrap: break-word;
  }
  /* Mobile responsive styles */
  @media only screen and (max-width: 600px) {
    .email-container {
      max-width: 100% !important;
      padding: 15px !important;
    }
    table[role="presentation"] {
      width: 100% !important;
      max-width: 100% !important;
    }
    td {
      padding: 15px !important;
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }
    p, div, span, li {
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      max-width: 100% !important;
    }
    body {
      width: 100% !important;
      min-width: 0 !important;
    }
  }
</style>
</head>
<body style="font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; line-height: 1.6; background-color: #ffffff; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; max-width: 800px; margin: 0 auto; table-layout: fixed;">
  <tr>
    <td style="padding: 20px; word-wrap: break-word; word-break: normal; overflow-wrap: break-word; width: 100%;">
      ${renderedHtml}
    </td>
  </tr>
</table>
</body>
</html>`
    
    // Generate plain text version for email clients that strip HTML
    // Convert HTML to plain text by stripping tags and preserving structure
    const plainText = renderedHtml
      .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1') // Replace images with alt text
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '$1') // Or use src URL if no alt
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)') // Convert links to "text (url)"
      .replace(/<li[^>]*>/gi, '• ') // Convert list items to bullet points
      .replace(/<\/li>/gi, '\n') // Add line break after list items
      .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '') // Remove list tags
      .replace(/<p[^>]*>/gi, '\n') // Convert paragraphs to line breaks
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n') // Convert br to line breaks
      .replace(/<strong[^>]*>|<\/strong>/gi, '**') // Convert bold
      .replace(/<b[^>]*>|<\/b>/gi, '**')
      .replace(/<em[^>]*>|<\/em>/gi, '*') // Convert italic
      .replace(/<i[^>]*>|<\/i>/gi, '*')
      .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
      .replace(/&nbsp;/g, ' ') // Convert HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple line breaks
      .trim()

    await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: subject,
      html: emailHtml,
      text: plainText, // Plain text alternative for email clients that strip HTML
    })

    return emailHtml // Return full HTML email for logging
  } catch (error: any) {
    console.error('Error sending template email:', error)
    throw new Error(`Failed to send template email: ${error.message || 'Unknown error'}`)
  }
}

export async function sendProfileCompletionEmail(
  recipientEmail: string,
  recipientName: string
): Promise<{ result: any; htmlContent: string }> {
  try {
    const mailTransporter = ensureTransporter()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // Use login redirect to preserve setup=required through login flow
    const profileLink = `${appUrl}/login?redirect=${encodeURIComponent('/profile?setup=required')}`
    
    const htmlContent = `
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
      </div>
    `
    
    const result = await mailTransporter.sendMail({
      from: getFromAddress(),
      to: recipientEmail,
      subject: 'Complete Your Taskorilla Profile',
      html: htmlContent,
    })
    
    return { result, htmlContent }
  } catch (error: any) {
    console.error('Error sending profile completion email:', error)
    throw new Error(`Failed to send profile completion email: ${error.message || 'Unknown error'}`)
  }
}

