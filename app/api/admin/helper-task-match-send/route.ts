import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  EmailPreference,
  EligibleHelper,
  MatchingHelper,
  MatchingTask,
  matchHelpersForTask,
} from '@/lib/helper-matching'
import { scoreHelpersForTask } from '@/lib/ai-matching'
import { sendTemplateEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { sendHelperAlert } from '@/lib/sms'
import { shortenUrl } from '@/lib/url-shortener'
import { logSms } from '@/lib/sms-logger'
import { buildTaskTypeKey } from '@/lib/helper-match-feedback'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const body = await request.json().catch(() => null)
    const taskId = body?.taskId as string | undefined
    const helperIds: string[] | undefined = Array.isArray(body?.helperIds) ? body.helperIds : undefined
    const overrideExcludedHelperIds: string[] | undefined = Array.isArray(body?.overrideExcludedHelperIds)
      ? body.overrideExcludedHelperIds
      : undefined
    const channels: string[] = Array.isArray(body?.channels) ? body.channels : ['email']
    const sendEmail = channels.includes('email')
    const sendSms = channels.includes('sms')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    // Require admin or superadmin
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

    // Check feature flag
    const { data: flagRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'helper_task_match_enabled')
      .maybeSingle()

    if (!flagRow || flagRow.value !== 'true') {
      return NextResponse.json(
        { error: 'Helper task match emails are disabled. Enable the feature flag first.' },
        { status: 400 }
      )
    }

    // Load task with safety filters (same rules as preview)
    const { data: taskRow, error: taskError } = await supabase
      .from('tasks')
      .select(
        'id, title, description, budget, required_skills, required_professions, latitude, longitude, created_by, location, is_sample_task, status, hidden_by_admin, hidden_reason, hidden_at'
      )
      .eq('id', taskId)
      .single()

    if (taskError || !taskRow) {
      return NextResponse.json({ error: 'Task not found', details: taskError?.message }, { status: 404 })
    }

    // Enforce business rules: don't send for sample / hidden / non-open tasks
    if (taskRow.is_sample_task === true) {
      return NextResponse.json({
        error: 'Task is marked as sample and will never be used for helper matches.',
      }, { status: 400 })
    }

    if (taskRow.status !== 'open') {
      return NextResponse.json({
        error: 'Only open tasks are considered for helper matches.',
      }, { status: 400 })
    }

    if (taskRow.hidden_by_admin) {
      return NextResponse.json({
        error: 'Task is hidden by admin and will not be used for helper matches.',
      }, { status: 400 })
    }

    // Load tags via the same join used on the test page
    const { data: tagJoinData } = await supabase
      .from('tasks')
      .select('id, task_tags(task_id, tag_id, tags(id, name))')
      .eq('id', taskId)
      .single()

    const directTags: string[] = []
    const tt = (tagJoinData as any)?.task_tags || []
    tt.forEach((ttItem: any) => {
      const t = ttItem?.tags
      if (Array.isArray(t)) {
        t.forEach((x: any) => x?.name && directTags.push(x.name))
      } else if (t && t.name) {
        directTags.push(t.name)
      }
    })

    const skillTags = Array.isArray(taskRow.required_skills) ? taskRow.required_skills : []
    const allTags = Array.from(new Set([...directTags, ...skillTags]))

    const amount =
      typeof taskRow.budget === 'number' && !Number.isNaN(taskRow.budget)
        ? taskRow.budget
        : undefined

    const reqProfessions = Array.isArray(taskRow.required_professions) ? taskRow.required_professions : []
    const taskTypeKey = buildTaskTypeKey(taskRow, allTags)

    const matchingTask: MatchingTask = {
      id: taskRow.id,
      title: taskRow.title ?? '(no title)',
      tags: allTags,
      lat: typeof taskRow.latitude === 'number' ? taskRow.latitude : undefined,
      lon: typeof taskRow.longitude === 'number' ? taskRow.longitude : undefined,
      amount,
      createdBy: taskRow.created_by ?? undefined,
      description: (taskRow.description ?? '') as string,
      requiredProfessions: reqProfessions,
    }

    // Load all helpers eligible for matching
    const { data: helpersData, error: helpersError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, role, bio, phone_number, phone_country_code, sms_opt_out, skills, services_offered, professions, preferred_max_distance_km, email_preference, latitude, longitude, is_helper'
      )
      .eq('is_helper', true)
      .neq('is_paused', true)
      .is('archived_at', null)
      .limit(500)

    if (helpersError) {
      return NextResponse.json({ error: 'Failed to load helpers', details: helpersError.message }, { status: 500 })
    }

    const helpers: MatchingHelper[] =
      (helpersData as any[] | null)?.filter(row => {
        const role = (row.role ?? '').toString().toLowerCase()
        return role !== 'admin' && role !== 'superadmin'
      }).map(row => {
        const helperLat =
          row.latitude !== null && row.latitude !== undefined
            ? Number(row.latitude)
            : NaN
        const helperLon =
          row.longitude !== null && row.longitude !== undefined
            ? Number(row.longitude)
            : NaN

        const email = (row.email ?? '').trim()

        const baseSkills = Array.isArray(row.skills) ? row.skills : []
        const serviceSkills = Array.isArray(row.services_offered) ? row.services_offered : []
        const professionSkills = Array.isArray(row.professions) ? row.professions : []
        const skills = Array.from(new Set([...baseSkills, ...serviceSkills, ...professionSkills]))

        const prefDistanceRaw = row.preferred_max_distance_km
        const preferredMaxDistanceKm =
          prefDistanceRaw === null || prefDistanceRaw === undefined
            ? null
            : Number(prefDistanceRaw)

        const emailPrefRaw = (row.email_preference ?? '').toLowerCase()
        const emailPreference: EmailPreference =
          emailPrefRaw === 'daily' || emailPrefRaw === 'weekly'
            ? emailPrefRaw
            : 'instant'

        return {
          id: row.id,
          name: row.full_name ?? '(no name)',
          skills,
          lat: helperLat,
          lon: helperLon,
          available:
            !!row.is_helper &&
            Number.isFinite(helperLat) &&
            Number.isFinite(helperLon),
          email,
          emailPreference,
          preferredMaxDistanceKm,
          bio: (row.bio ?? '') as string,
          professions: Array.isArray(row.professions) ? row.professions : [],
          phoneNumber: row.phone_number ?? null,
          phoneCountryCode: row.phone_country_code ?? null,
          smsOptOut: row.sms_opt_out ?? false,
        } as MatchingHelper
      }) ?? []

    let matches: EligibleHelper[]
    try {
      const scoreResult = await scoreHelpersForTask(matchingTask, helpers)
      matches = scoreResult.helpers
    } catch (aiError: any) {
      console.error('[helper-task-match-send] AI scoring failed, falling back to lexical:', aiError.message)
      matches = matchHelpersForTask(matchingTask, helpers)
    }

    // If admin specified a subset of helpers, restrict to only those
    if (helperIds && helperIds.length > 0) {
      const allowedIds = new Set(helperIds)
      matches = matches.filter(m => allowedIds.has(m.id))
    }

    const overrideExcludedSet = new Set(overrideExcludedHelperIds || [])
    const { data: exclusionRowsByType } = await supabase
      .from('helper_match_feedback')
      .select('helper_id')
      .eq('task_type_key', taskTypeKey)
      .eq('feedback', 'exclude')

    const { data: exclusionRowsByTask } = await supabase
      .from('helper_match_feedback')
      .select('helper_id')
      .eq('task_id', matchingTask.id)
      .eq('feedback', 'exclude')

    const excludedHelperIds = new Set(
      [...(exclusionRowsByType || []), ...(exclusionRowsByTask || [])].map((row: any) => row.helper_id as string)
    )

    const totalBeforeExcludedFilter = matches.length
    matches = matches.filter(m => !excludedHelperIds.has(m.id) || overrideExcludedSet.has(m.id))
    const skippedExcluded = totalBeforeExcludedFilter - matches.length
    const overriddenExcludedSentIds = matches
      .filter(m => excludedHelperIds.has(m.id) && overrideExcludedSet.has(m.id))
      .map(m => m.id)

    // Primary dedupe source: helpers already allocated to this task.
    const { data: existingAllocations } = await supabase
      .from('helper_task_allocations')
      .select('helper_id')
      .eq('task_id', matchingTask.id)

    const alreadyAllocatedHelperIds = new Set(
      (existingAllocations || []).map((row: any) => row.helper_id as string)
    )
    const totalCandidatesBeforeAllocationFilter = matches.length
    matches = matches.filter(m => !alreadyAllocatedHelperIds.has(m.id))
    const skippedAllocated = totalCandidatesBeforeAllocationFilter - matches.length

    if (!matches.length) {
      return NextResponse.json({
        task: matchingTask,
        sent: 0,
        smsSent: 0,
        skipped: 0,
        skippedAllocated,
        skippedExcluded,
        overriddenExcludedSent: overriddenExcludedSentIds.length,
        overriddenExcludedSentIds,
        alreadyAllocatedIds: Array.from(alreadyAllocatedHelperIds),
        details: 'No eligible helpers found for this task.',
      })
    }

    // Load helper_task_match template (only needed for email channel)
    let template: { subject: string; html_content: string } | null = null
    if (sendEmail) {
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('template_type', 'helper_task_match')
        .single()

      if (templateError || !templateData) {
        return NextResponse.json(
          { error: 'helper_task_match template not found', details: templateError?.message },
          { status: 500 }
        )
      }
      template = templateData
    }

    // Build base URL for task links
    const baseUrlEnv =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, '')}`
        : null)

    const baseUrl = (baseUrlEnv || 'http://localhost:3000').replace(/\/$/, '')
    const taskUrl = `${baseUrl}/tasks/${matchingTask.id}`

    let sentCount = 0
    let skippedCount = 0
    let smsSentCount = 0

    const profileUrl = `${baseUrl}/profile`

    // Shorten URLs once for all SMS using internal /go/[code] shortener
    const [shortTaskUrl, shortProfileUrl] = sendSms
      ? await Promise.all([shortenUrl(taskUrl, supabase), shortenUrl(profileUrl, supabase)])
      : [taskUrl, profileUrl]

    for (const helper of matches) {
      const helperAny = helper as any
      let didSomething = false
      let helperEmailSent = false
      let helperSmsSent = false

      // ── Email ──────────────────────────────────────────────────────────────
      if (sendEmail) {
        const recipientEmail = (helper.email || '').trim()
        if (!recipientEmail || !recipientEmail.includes('@')) {
          skippedCount++
        } else {
          // De-dupe: skip if already sent for this task+helper
          const { data: existing } = await supabase
            .from('email_logs')
            .select('id')
            .eq('email_type', 'helper_task_match')
            .eq('related_task_id', matchingTask.id)
            .eq('related_user_id', helper.id)
            .maybeSingle()

          if (existing) {
            skippedCount++
          } else {
            const distanceLabel =
              typeof helper.distanceKm === 'number'
                ? `${helper.distanceKm.toFixed(1)} km`
                : 'N/A'
            const hasAmount = typeof matchingTask.amount === 'number' && matchingTask.amount > 0
            const amountLabel = hasAmount ? `€${matchingTask.amount!.toFixed(2)}` : 'Quote needed'
            const locationLabel = taskRow.location || 'Unknown'
            const renderedSubject = template!.subject.replace(/\{\{task_title\}\}/g, matchingTask.title)

            await sendTemplateEmail(
              recipientEmail,
              helper.name || 'Helper',
              renderedSubject,
              template!.html_content,
              {
                task_title: matchingTask.title,
                amount_label: amountLabel,
                location_label: locationLabel,
                distance_label: distanceLabel,
                task_url: taskUrl,
              }
            )

            await logEmail({
              recipient_email: recipientEmail,
              recipient_name: helper.name || undefined,
              subject: renderedSubject,
              email_type: 'helper_task_match',
              status: 'sent',
              related_task_id: matchingTask.id,
              related_user_id: helper.id,
              metadata: {
                template_type: 'helper_task_match',
                task_url: taskUrl,
                distance_km: helper.distanceKm ?? null,
                amount: matchingTask.amount ?? null,
              },
            }, supabase)

            didSomething = true
            helperEmailSent = true
          }
        }
      }

      // ── SMS ────────────────────────────────────────────────────────────────
      if (sendSms) {
        const phone = (helperAny.phoneNumber || '').trim()
        const optedOut = helperAny.smsOptOut === true

        if (!phone || optedOut) {
          // silently skip — no phone or helper opted out
        } else {
          const countryCode = (helperAny.phoneCountryCode || '').trim()
          const fullPhone = countryCode && !phone.startsWith('+')
            ? `${countryCode}${phone}`
            : phone

          const smsText =
            `New task near you on Taskorilla: ${matchingTask.title} – View it: ${shortTaskUrl} | To opt out visit your profile: ${shortProfileUrl}`

          const smsResult = await sendHelperAlert(fullPhone, smsText)
          if (smsResult.success) {
            smsSentCount++
            didSomething = true
            helperSmsSent = true
            await logSms({
              recipient_phone: fullPhone,
              recipient_name: helper.name || undefined,
              message: smsText,
              status: 'sent',
              related_task_id: matchingTask.id,
              related_user_id: helper.id,
              metadata: { channel: 'helper_task_match' },
            }, supabase)
          }
        }
      }

      if (didSomething) {
        sentCount++
        const channelsSent: string[] = [
          ...(helperEmailSent ? ['email'] : []),
          ...(helperSmsSent ? ['sms'] : []),
        ]

        await supabase
          .from('helper_task_allocations')
          .upsert(
            {
              task_id: matchingTask.id,
              helper_id: helper.id,
              allocated_via: 'admin_match_send',
              channels: channelsSent,
              first_allocated_at: new Date().toISOString(),
              last_notified_at: new Date().toISOString(),
              last_notified_channels: channelsSent,
              created_by: user.id,
              metadata: {
                source: 'helper-task-match-send',
                channels_requested: channels,
                ai_match: true,
              },
            },
            { onConflict: 'task_id,helper_id' }
          )
      }
    }

    return NextResponse.json({
      task: matchingTask,
      sent: sentCount,
      smsSent: smsSentCount,
      skipped: skippedCount,
      skippedAllocated,
      skippedExcluded,
      overriddenExcludedSent: overriddenExcludedSentIds.length,
      overriddenExcludedSentIds,
      alreadyAllocatedIds: Array.from(alreadyAllocatedHelperIds),
    })
  } catch (error: any) {
    console.error('Error in helper-task-match-send API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

