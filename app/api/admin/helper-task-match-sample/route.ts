import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  EmailPreference,
  EligibleHelper,
  MatchingHelper,
  MatchingTask,
  matchHelpersForTask,
} from '@/lib/helper-matching'
import { sendTemplateEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const body = await request.json().catch(() => null)
    const taskId = body?.taskId as string | undefined

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

    // Load task with same safety filters as preview/send
    const { data: taskRow, error: taskError } = await supabase
      .from('tasks')
      .select(
        'id, title, budget, required_skills, latitude, longitude, created_by, location, is_sample_task, status, hidden_by_admin, hidden_reason, hidden_at'
      )
      .eq('id', taskId)
      .single()

    if (taskError || !taskRow) {
      return NextResponse.json({ error: 'Task not found', details: taskError?.message }, { status: 404 })
    }

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

    const matchingTask: MatchingTask = {
      id: taskRow.id,
      title: taskRow.title ?? '(no title)',
      tags: allTags,
      lat: typeof taskRow.latitude === 'number' ? taskRow.latitude : undefined,
      lon: typeof taskRow.longitude === 'number' ? taskRow.longitude : undefined,
      amount,
      createdBy: taskRow.created_by ?? undefined,
    }

    // Load helpers and compute matches (same as preview)
    const { data: helpersData, error: helpersError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, skills, services_offered, professions, preferred_max_distance_km, email_preference, latitude, longitude, is_helper'
      )
      .eq('is_helper', true)
      .neq('is_paused', true)
      .is('archived_at', null)
      .limit(500)

    if (helpersError) {
      return NextResponse.json({ error: 'Failed to load helpers', details: helpersError.message }, { status: 500 })
    }

    const helpers: MatchingHelper[] =
      (helpersData as any[] | null)?.map(row => {
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
        } as MatchingHelper
      }) ?? []

    const matches: EligibleHelper[] = matchHelpersForTask(matchingTask, helpers)

    // Load helper_task_match template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_type', 'helper_task_match')
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'helper_task_match template not found', details: templateError?.message },
        { status: 500 }
      )
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

    // Pick a representative helper (first match) or use generic values
    const sample = matches[0]

    const distanceLabel =
      typeof sample?.distanceKm === 'number'
        ? `${sample.distanceKm.toFixed(1)} km`
        : 'N/A'

    const hasAmount = typeof matchingTask.amount === 'number' && matchingTask.amount > 0
    const amountLabel = hasAmount ? `€${matchingTask.amount!.toFixed(2)}` : 'Quote needed'
    const locationLabel = taskRow.location || 'Unknown'

    const recipientEmail = 'lou@schillaci.me'

    await sendTemplateEmail(
      recipientEmail,
      'Taskorilla Admin',
      `[SAMPLE] ${template.subject}`,
      template.html_content,
      {
        task_title: matchingTask.title,
        amount_label: amountLabel,
        location_label: locationLabel,
        distance_label: distanceLabel,
        task_url: taskUrl,
      }
    )

    return NextResponse.json({
      task: matchingTask,
      matchesCount: matches.length,
      sentTo: recipientEmail,
    })
  } catch (error: any) {
    console.error('Error in helper-task-match-sample API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

