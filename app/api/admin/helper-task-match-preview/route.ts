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

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')

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

    // Load single task with tags and safety filters
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

    // Enforce business rules: don't match sample / hidden / non-open tasks
    if (taskRow.is_sample_task === true) {
      return NextResponse.json({
        task: taskRow,
        matches: [],
        reason: 'Task is marked as sample and will never be used for helper matches.',
      })
    }

    if (taskRow.status !== 'open') {
      return NextResponse.json({
        task: taskRow,
        matches: [],
        reason: 'Only open tasks are considered for helper matches.',
      })
    }

    if (taskRow.hidden_by_admin) {
      return NextResponse.json({
        task: taskRow,
        matches: [],
        reason: 'Task is hidden by admin and will not be used for helper matches.',
      })
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

    // Try AI-powered scoring; fall back to lexical matching if it fails
    try {
      const scoreResult = await scoreHelpersForTask(matchingTask, helpers)
      return NextResponse.json({
        task: matchingTask,
        matches: scoreResult.helpers,
        aiClassification: scoreResult.aiClassification,
        matchMode: 'ai',
      })
    } catch (aiError: any) {
      console.error('[helper-task-match-preview] AI scoring failed, falling back to lexical:', aiError.message)
      const matches: EligibleHelper[] = matchHelpersForTask(matchingTask, helpers)
      return NextResponse.json({
        task: matchingTask,
        matches,
        matchMode: 'lexical',
      })
    }
  } catch (error: any) {
    console.error('Error in helper-task-match-preview API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

