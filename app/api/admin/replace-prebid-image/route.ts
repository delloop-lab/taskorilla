import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const VIOLATION_IMAGE_URL = '/images/image_replaced_violation.png'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const messageId = typeof body?.messageId === 'string' ? body.messageId : null
    const emailLogId = typeof body?.emailLogId === 'string' ? body.emailLogId : null
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : null
    const replaceAllConversationImages = body?.replaceAllConversationImages !== false

    if (!messageId || !emailLogId) {
      return NextResponse.json({ error: 'messageId and emailLogId are required' }, { status: 400 })
    }

    const { data: messageRow, error: messageError } = await supabase
      .from('messages')
      .select('id, conversation_id, image_url')
      .eq('id', messageId)
      .single()

    if (messageError || !messageRow) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const currentImageUrl = messageRow.image_url
    if (!currentImageUrl) {
      return NextResponse.json({ error: 'Selected message has no image' }, { status: 400 })
    }
    if (currentImageUrl === VIOLATION_IMAGE_URL) {
      return NextResponse.json({ error: 'Selected image is already replaced' }, { status: 409 })
    }

    const { data: emailLog, error: emailLogError } = await supabase
      .from('email_logs')
      .select('id, metadata')
      .eq('id', emailLogId)
      .single()

    if (emailLogError || !emailLog) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 })
    }

    const logConversationId = emailLog.metadata?.conversationId || null
    if (logConversationId && logConversationId !== messageRow.conversation_id) {
      return NextResponse.json(
        { error: 'Selected message does not match the email log conversation' },
        { status: 400 }
      )
    }

    const { data: candidateRows, error: candidateRowsError } = await supabase
      .from('messages')
      .select('id, image_url')
      .eq('conversation_id', messageRow.conversation_id)
      .not('image_url', 'is', null)

    if (candidateRowsError) {
      return NextResponse.json(
        { error: 'Failed to load conversation images', details: candidateRowsError.message },
        { status: 500 }
      )
    }

    const targetRowsRaw = (candidateRows || []).filter((row: any) => {
      if (!replaceAllConversationImages) return row.id === messageId
      return row.image_url && row.image_url !== VIOLATION_IMAGE_URL
    })

    const targetRows = targetRowsRaw.map((row: any) => ({
      id: row.id as string,
      image_url: row.image_url as string,
    }))

    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'No eligible conversation images found to replace' }, { status: 400 })
    }

    const targetMessageIds = targetRows.map((row) => row.id)

    const auditInsertPayload = targetRows.map((row) => ({
      message_id: row.id,
      conversation_id: messageRow.conversation_id,
      email_log_id: emailLogId,
      original_image_url: row.image_url,
      replacement_image_url: VIOLATION_IMAGE_URL,
      reason,
      replaced_by: user.id,
    }))

    const { data: auditRows, error: auditError } = await supabase
      .from('message_image_replacements')
      .insert(auditInsertPayload)
      .select('id, created_at, message_id, original_image_url, replacement_image_url')

    if (auditError) {
      return NextResponse.json(
        {
          error: 'Failed to write audit log. Image was not replaced.',
          details: `${auditError.message}. Ensure migration supabase/add_message_image_replacements.sql has been executed.`,
        },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ image_url: VIOLATION_IMAGE_URL })
      .in('id', targetMessageIds)

    if (updateError) {
      const createdAuditIds = (auditRows || []).map((row: any) => row.id).filter(Boolean)
      if (createdAuditIds.length > 0) {
        await supabase
          .from('message_image_replacements')
          .delete()
          .in('id', createdAuditIds)
      }

      return NextResponse.json(
        { error: 'Failed to replace message image', details: updateError.message },
        { status: 500 }
      )
    }

    const urlsToReplace = Array.from(new Set(targetRows.map((row) => row.image_url)))

    const { data: relatedEmailLogs, error: relatedEmailLogsError } = await supabase
      .from('email_logs')
      .select('id, metadata')
      .eq('metadata->>conversationId', messageRow.conversation_id)

    if (relatedEmailLogsError) {
      await supabase
        .from('message_image_replacements')
        .delete()
        .in('message_id', targetMessageIds)

      return NextResponse.json(
        { error: 'Failed to load related email logs for metadata patch', details: relatedEmailLogsError.message },
        { status: 500 }
      )
    }

    for (const row of relatedEmailLogs || []) {
      const existingMetadata = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {}
      const existingHtml = typeof existingMetadata?.html_content === 'string' ? existingMetadata.html_content : null

      let patchedHtml = existingHtml
      for (const oldUrl of urlsToReplace) {
        if (patchedHtml) {
          patchedHtml = patchedHtml.split(oldUrl).join(VIOLATION_IMAGE_URL)
        }
      }

      const updatedMetadata = {
        ...existingMetadata,
        html_content: patchedHtml,
        imageReplacement: {
          mode: replaceAllConversationImages ? 'all_conversation_images' : 'single_image',
          sourceMessageId: messageId,
          replacedMessageIds: targetMessageIds,
          replacementImageUrl: VIOLATION_IMAGE_URL,
          replacedAt: (auditRows && auditRows[0]?.created_at) || new Date().toISOString(),
          replacedBy: user.id,
          reason,
        },
      }

      const { error: updateEmailLogError } = await supabase
        .from('email_logs')
        .update({ metadata: updatedMetadata })
        .eq('id', row.id)

      if (updateEmailLogError) {
        console.error('Failed to patch email log metadata for replacement', { emailLogId: row.id, error: updateEmailLogError.message })
      }
    }

    return NextResponse.json({
      ok: true,
      replacement: auditRows || [],
      replacedCount: targetMessageIds.length,
      message: replaceAllConversationImages
        ? 'Pre-bid conversation images replaced and logged'
        : 'Pre-bid image replaced and logged',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

