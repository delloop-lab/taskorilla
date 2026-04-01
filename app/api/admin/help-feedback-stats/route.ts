import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type FeedbackRow = {
  guide_slug: string
  guide_title: string
  feedback: 'yes' | 'no'
  created_at: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function getRangeDays(range: string | null): number {
  if (range === '7d') return 7
  if (range === '90d') return 90
  return 30
}

export async function GET(request: NextRequest) {
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

    const range = new URL(request.url).searchParams.get('range')
    const days = getRangeDays(range)
    const sinceDate = new Date(Date.now() - (days - 1) * DAY_MS)
    sinceDate.setHours(0, 0, 0, 0)
    const sinceIso = sinceDate.toISOString()

    const { data, error } = await supabase
      .from('guide_feedback')
      .select('guide_slug, guide_title, feedback, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to load stats', details: error.message }, { status: 500 })
    }

    const rows = (data || []) as FeedbackRow[]
    const totalVotes = rows.length
    const yesVotes = rows.filter((r) => r.feedback === 'yes').length
    const noVotes = rows.filter((r) => r.feedback === 'no').length
    const helpfulRate = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 1000) / 10 : 0

    const seriesMap = new Map<string, { date: string; yes: number; no: number; total: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(sinceDate.getTime() + i * DAY_MS)
      const key = d.toISOString().split('T')[0]
      seriesMap.set(key, { date: key, yes: 0, no: 0, total: 0 })
    }

    const guideMap = new Map<string, {
      guideSlug: string
      guideTitle: string
      yes: number
      no: number
      total: number
      helpfulRate: number
      lastFeedbackAt: string
    }>()

    rows.forEach((row) => {
      const day = row.created_at.split('T')[0]
      const bucket = seriesMap.get(day)
      if (bucket) {
        if (row.feedback === 'yes') bucket.yes += 1
        else bucket.no += 1
        bucket.total += 1
      }

      const key = row.guide_slug
      const existing = guideMap.get(key) || {
        guideSlug: row.guide_slug,
        guideTitle: row.guide_title,
        yes: 0,
        no: 0,
        total: 0,
        helpfulRate: 0,
        lastFeedbackAt: row.created_at,
      }
      if (row.feedback === 'yes') existing.yes += 1
      else existing.no += 1
      existing.total += 1
      if (row.created_at > existing.lastFeedbackAt) existing.lastFeedbackAt = row.created_at
      existing.helpfulRate = existing.total > 0 ? Math.round((existing.yes / existing.total) * 1000) / 10 : 0
      guideMap.set(key, existing)
    })

    const series = Array.from(seriesMap.values())
    const guides = Array.from(guideMap.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      return a.helpfulRate - b.helpfulRate
    })

    return NextResponse.json({
      range: `${days}d`,
      totals: { totalVotes, yesVotes, noVotes, helpfulRate },
      series,
      guides,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 })
  }
}

