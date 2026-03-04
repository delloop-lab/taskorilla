'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  EmailPreference,
  EligibleHelper,
  MatchingHelper,
  MatchingTask,
  matchHelpersForTask,
} from '@/lib/helper-matching'

// --- Types matching our standalone matcher function ---

type Task = MatchingTask & {
  location?: string | null // human-readable location derived from postcode
  taskerAddress?: string | null // derived from tasker's profile (postcode + country)
  taskerName?: string | null
  taskerEmail?: string | null
}

type Helper = MatchingHelper

type NotifiableHelper = MatchingHelper

interface TaskForNotify extends Task {
  amount: number
}

interface NotifySummary {
  instantSent: number
  queuedDaily: number
  queuedWeekly: number
}

interface TestEmailPayload {
  to: string
  intendedTo: string
  subject: string
  html: string
}

const getTestEmailAddress = () =>
  process.env.TEST_EMAIL_ADDRESS || 'lou@schillaci.me'

const getAppBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL

  if (fromEnv) {
    return fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`
  }

  return 'http://localhost:3000'
}

const cleanLocationForEmail = (raw?: string | null): string | null => {
  if (!raw) return null

  let cleaned = raw
  // Remove Portuguese-style postcodes like "1234" or "1234-567"
  cleaned = cleaned.replace(/\b\d{4}(?:-\d{3})?\b/g, '')
  // Remove "Portugal" (with or without leading comma)
  cleaned = cleaned.replace(/,\s*Portugal\b/gi, '').replace(/\bPortugal\b/gi, '')
  // Collapse duplicate commas and extra whitespace
  cleaned = cleaned.replace(/,\s*,/g, ', ')
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  // Trim stray leading/trailing commas and whitespace
  cleaned = cleaned.replace(/^\s*,\s*/, '').replace(/,\s*$/, '')
  cleaned = cleaned.trim()

  return cleaned || null
}

const notifyEligibleHelpers = (
  task: TaskForNotify,
  helpers: NotifiableHelper[]
): { summary: NotifySummary; emails: TestEmailPayload[] } => {
  const distanceFiltered: EligibleHelper[] = matchHelpersForTask(task, helpers)

  const instant: EligibleHelper[] = []
  const daily: EligibleHelper[] = []
  const weekly: EligibleHelper[] = []

  distanceFiltered.forEach(helper => {
    const pref = helper.emailPreference || 'instant'
    if (pref === 'daily') {
      daily.push(helper)
    } else if (pref === 'weekly') {
      weekly.push(helper)
    } else {
      instant.push(helper)
    }
  })

  const baseUrl = getAppBaseUrl()
  const taskUrl = `${baseUrl}/tasks/${task.id}`
  const mascotUrl = `${baseUrl}/images/gorilla-mascot-new-email.png`.replace(/([^:]\/)\/+/g, '$1')
  const testAddress = getTestEmailAddress()

  const emails: TestEmailPayload[] = instant
    .filter(helper => helper.email && helper.email.includes('@'))
    .map(helper => {
      const distanceLabel =
        typeof helper.distanceKm === 'number'
          ? `${helper.distanceKm.toFixed(1)} km`
          : 'N/A'

      const hasAmount = typeof task.amount === 'number' && task.amount > 0
      const amountLabel = hasAmount ? `€${task.amount.toFixed(2)}` : 'Quote needed'
      const rawLocation = task.location || task.taskerAddress || null
      const cleanedLocation = cleanLocationForEmail(rawLocation)
      const addressLabel = cleanedLocation || 'Unknown'

      const subject = `New task near you: "${task.title}"`

      const html = `
<div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:16px; border:1px solid #e5e7eb; border-radius:8px; background-color:#ffffff;">
  <h2 style="color:#2563eb; margin-top:0;">You have a new task match!</h2>
  <p style="font-size:16px; margin:8px 0;">A task near you on <strong>Taskorilla</strong> might be a perfect match:</p>
  
  <div style="background-color:#f3f4f6; padding:12px 16px; border-radius:8px; margin:16px 0;">
    <p style="margin:4px 0;"><strong>Task:</strong> ${task.title}</p>
    <p style="margin:4px 0;"><strong>Amount:</strong> ${amountLabel}</p>
    <p style="margin:4px 0;"><strong>Location:</strong> ${addressLabel}</p>
    <p style="margin:4px 0;"><strong>Distance:</strong> ${distanceLabel}</p>
  </div>

  <a href="${taskUrl}"
     style="display:inline-block; background-color:#2563eb; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
    View Task
  </a>

  <div style="margin-top:16px;">
    <img src="${mascotUrl}" alt="Tee - Taskorilla Mascot" style="max-width:64px; height:auto; display:block;" />
  </div>

  <p style="margin-top:16px; font-size:12px; color:#6b7280;">
    You received this email because you are registered on Taskorilla. If you want to stop receiving these emails, you can change your
    <a href="https://www.taskorilla.com/profile" style="color:#2563eb; text-decoration:underline;">email preferences in your profile</a>.
  </p>
</div>`

      return {
        // Never send test emails to the actual helper; always use test address.
        to: testAddress,
        intendedTo: helper.email,
        subject,
        html,
      }
    })

  const summary: NotifySummary = {
    instantSent: emails.length,
    queuedDaily: daily.length,
    queuedWeekly: weekly.length,
  }

  return { summary, emails }
}

// --- Supabase row shapes (read-only) ---

type TaskRow = {
  id: string
  title: string | null
  required_skills: string[] | null
  budget: number | null
  latitude: number | null
  longitude: number | null
  created_by: string | null
  location: string | null
  is_sample_task: boolean | null
  task_tags?: any[] | null
}

type TaskerProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  postcode: string | null
  country: string | null
}

type HelperRow = {
  id: string
  full_name: string | null
  email: string | null
  skills: string[] | null
  services_offered: string[] | null
  professions: string[] | null
  preferred_max_distance_km: number | null
  email_preference: string | null
  latitude: number | null
  longitude: number | null
  is_helper: boolean | null
}

export default function HelperMatchRealTestPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [helpers, setHelpers] = useState<NotifiableHelper[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifySummary, setNotifySummary] = useState<NotifySummary | null>(null)
  const [testEmails, setTestEmails] = useState<TestEmailPayload[]>([])
  const [sendingEmailIndex, setSendingEmailIndex] = useState<number | null>(null)
  const [sendEmailError, setSendEmailError] = useState<string | null>(null)
  const [eligibleHelpers, setEligibleHelpers] = useState<EligibleHelper[]>([])
  const [aiHelpers, setAiHelpers] = useState<EligibleHelper[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [tasksRes, helpersRes] = await Promise.all([
          supabase
            .from('tasks')
            .select(
              'id, title, budget, required_skills, latitude, longitude, created_by, location, is_sample_task, task_tags(task_id, tag_id, tags(id, name))'
            )
            .limit(50),
          supabase
            .from('profiles')
            .select(
              'id, full_name, email, skills, services_offered, professions, preferred_max_distance_km, email_preference, latitude, longitude, is_helper'
            )
            .eq('is_helper', true)
            .limit(200),
        ])

        if (tasksRes.error) {
          throw tasksRes.error
        }
        if (helpersRes.error) {
          throw helpersRes.error
        }

        const rawTaskRows: TaskRow[] = (tasksRes.data as TaskRow[] | null) ?? []

        // Load tasker profile data (name, email, address) for task creators
        const creatorIds = Array.from(
          new Set(
            rawTaskRows
              .map(row => row.created_by)
              .filter((id): id is string => Boolean(id))
          )
        )

        let taskerProfilesMap = new Map<
          string,
          { full_name: string | null; email: string | null; postcode: string | null; country: string | null }
        >()

        if (creatorIds.length > 0) {
          const { data: taskerProfiles, error: taskerProfilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, postcode, country')
            .in('id', creatorIds)

          if (taskerProfilesError) {
            throw taskerProfilesError
          }

          ;(taskerProfiles as TaskerProfileRow[] | null)?.forEach(profile => {
            taskerProfilesMap.set(profile.id, {
              full_name: profile.full_name,
              email: profile.email,
              postcode: profile.postcode,
              country: profile.country,
            })
          })
        }

        const mappedTasks: Task[] =
          rawTaskRows.map(row => {
            // Tags from the many-to-many tags system
            const directTags: string[] = []
            const tt = row.task_tags || []
            tt.forEach((ttItem: any) => {
              const t = ttItem?.tags
              if (Array.isArray(t)) {
                t.forEach((x: any) => x?.name && directTags.push(x.name))
              } else if (t && t.name) {
                directTags.push(t.name)
              }
            })

            // Also include required_skills as tags for matching
            const skillTags = Array.isArray(row.required_skills) ? row.required_skills : []
            const allTags = Array.from(new Set([...directTags, ...skillTags]))

            const amount =
              typeof row.budget === 'number' && !Number.isNaN(row.budget)
                ? row.budget
                : undefined

            const createdBy = row.created_by ?? undefined
            const location = row.location ?? null
            const profileForTasker = createdBy ? taskerProfilesMap.get(createdBy) : undefined
            const taskerAddress =
              profileForTasker
                ? [profileForTasker.postcode, profileForTasker.country].filter(Boolean).join(', ')
                : null
            const taskerName = profileForTasker?.full_name ?? null
            const taskerEmail = profileForTasker?.email ?? null

            return {
              id: row.id,
              title: row.title ?? '(no title)',
              tags: allTags,
              lat: typeof row.latitude === 'number' ? row.latitude : undefined,
              lon: typeof row.longitude === 'number' ? row.longitude : undefined,
              amount,
              createdBy,
              location,
              taskerAddress,
              taskerName,
              taskerEmail,
            }
          }) ?? []

        const mappedHelpers: NotifiableHelper[] =
          (helpersRes.data as HelperRow[] | null)?.map(row => {
            // Supabase may return latitude/longitude as strings; coerce to numbers safely
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
                ? (emailPrefRaw as EmailPreference)
                : 'instant'

            return {
              id: row.id,
              name: row.full_name ?? '(no name)',
              skills,
              lat: helperLat,
              lon: helperLon,
              // For testing, treat helpers with valid coords as "available"
              available:
                !!row.is_helper &&
                Number.isFinite(helperLat) &&
                Number.isFinite(helperLon),
              email,
              emailPreference,
              preferredMaxDistanceKm,
            }
          }) ?? []

        setTasks(mappedTasks)
        setHelpers(mappedHelpers)

        if (mappedTasks.length > 0) {
          setSelectedTaskId(mappedTasks[0].id)
        }
      } catch (err: any) {
        console.error('Error loading test data:', err)
        setError(err.message ?? 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  )

  useEffect(() => {
    if (!selectedTask) {
      setEligibleHelpers([])
      setAiHelpers([])
      return
    }

    const fetchSemanticMatches = async () => {
      try {
        const res = await fetch(`/api/helper-match-semantic-preview?taskId=${selectedTask.id}`)

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(
            data.error || `Failed to load semantic matches (${res.status})`
          )
        }

        const data = await res.json()
        const rawAi = Array.isArray(data.aiMatches) ? data.aiMatches : []
        const rawLexical = Array.isArray(data.lexicalMatches) ? data.lexicalMatches : []

        const mapToEligible = (input: any[]): EligibleHelper[] =>
          input
          .filter((m: any) => m)
          .map((m: any, index: number) => {
            const id = typeof m.id === 'string' && m.id.length > 0 ? m.id : `semantic-${index}`
            const name = typeof m.name === 'string' && m.name.trim().length > 0 ? m.name : '(no name)'
            const skills = Array.isArray(m.skills) ? m.skills : []

            const lat =
              typeof m.lat === 'number' && Number.isFinite(m.lat)
                ? m.lat
                : 0
            const lon =
              typeof m.lon === 'number' && Number.isFinite(m.lon)
                ? m.lon
                : 0

            const email = typeof m.email === 'string' ? m.email : ''

            const emailPrefRaw =
              typeof m.emailPreference === 'string' ? m.emailPreference.toLowerCase() : ''
            const emailPreference: EmailPreference =
              emailPrefRaw === 'daily' || emailPrefRaw === 'weekly'
                ? (emailPrefRaw as EmailPreference)
                : 'instant'

            const preferredMaxDistanceKm =
              typeof m.preferredMaxDistanceKm === 'number' && Number.isFinite(m.preferredMaxDistanceKm)
                ? m.preferredMaxDistanceKm
                : null

            const distanceKm =
              typeof m.distanceKm === 'number' && Number.isFinite(m.distanceKm)
                ? m.distanceKm
                : undefined

            return {
              id,
              name,
              skills,
              lat,
              lon,
              available: true,
              email,
              emailPreference,
              preferredMaxDistanceKm,
              distanceKm,
            }
          })

        const mappedAi = mapToEligible(rawAi)
        const mappedLexical = mapToEligible(rawLexical)

        // Prefer AI matches; if none, fall back to lexical (old) matches.
        const primary = mappedAi.length > 0 ? mappedAi : mappedLexical

        setEligibleHelpers(primary)
        setAiHelpers(mappedAi)
        console.log('Eligible helpers (primary set):', primary)
        console.log('AI helper matches:', mappedAi)
      } catch (err) {
        console.error('Error fetching semantic helper matches:', err)
        setEligibleHelpers([])
        setAiHelpers([])
      }
    }

    fetchSemanticMatches()
  }, [selectedTask])

  const handleRunNotify = () => {
    if (!selectedTask) return

    const amount = typeof selectedTask.amount === 'number' ? selectedTask.amount : 0

    const notifyTask: TaskForNotify = {
      id: selectedTask.id,
      title: selectedTask.title,
      tags: selectedTask.tags,
      lat: selectedTask.lat,
      lon: selectedTask.lon,
      amount,
      // Preserve human-readable location information for the email preview
      location: selectedTask.location ?? null,
      taskerAddress: selectedTask.taskerAddress ?? null,
    }

    const { summary, emails } = notifyEligibleHelpers(notifyTask, helpers)
    setNotifySummary(summary)
    setTestEmails(emails)
  }

  const handleSendEmailToMe = async (email: TestEmailPayload, index: number) => {
    try {
      setSendEmailError(null)
      setSendingEmailIndex(index)

      // Try to get Supabase session, but do not require it for this test helper.
      // If there's no session, we still call the API without auth headers.
      let accessToken: string | null = null
      try {
        const { data: { session } } = await supabase.auth.getSession()
        accessToken = session?.access_token ?? null
      } catch (e) {
        console.warn('Unable to read Supabase session for helper-match test email, proceeding without auth.', e)
      }

      const testAddress = getTestEmailAddress()

      // IMPORTANT: For real emails, do NOT embed localhost/baseUrl image URLs.
      // Replace the inline mascot <img> tag with the {{tee_image}} placeholder
      // so the server-side email renderer can inject the correct absolute URL.
      const htmlForEmail = email.html.replace(
        /<img[^>]*gorilla-mascot-new-email[^>]*>/i,
        '{{tee_image}}'
      )

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          type: 'template_email',
          templateType: 'test_helper_match_email',
          recipientEmail: testAddress,
          recipientName: 'Test Helper Match Recipient',
          subject: `[TEST] ${email.subject}`,
          htmlContent: htmlForEmail,
          variables: {
            user_email: testAddress,
            intended_helper_email: email.intendedTo,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to send test email: ${response.statusText}`)
      }
    } catch (err: any) {
      console.error('Error sending helper match test email:', err)
      setSendEmailError(err.message || 'Failed to send test email')
    } finally {
      setSendingEmailIndex(null)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">
        Helper Matching Test (read-only, real data)
      </h1>

      <p className="text-sm text-gray-600">
        This page only performs <span className="font-semibold">read-only</span> Supabase
        queries. It does not write to the database or affect live behaviour. It is
        purely for testing the matching logic against real tasks and helpers.
      </p>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-3 rounded border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">1. Select a task</h2>

        {loading && <p className="text-sm text-gray-600">Loading tasks and helpers…</p>}

        {!loading && tasks.length === 0 && (
          <p className="text-sm text-gray-600">No tasks found (limited to 50).</p>
        )}

        {!loading && tasks.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Task</span>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>
                    [{task.id.substring(0, 8)}] {task.title} — tags:{' '}
                    {task.tags.join(', ') || 'none'}
                  </option>
                ))}
              </select>
            </label>

            {selectedTask && (
              <div className="text-xs text-gray-700">
                <div>
                  <span className="font-semibold">Tags:</span>{' '}
                  {selectedTask.tags.join(', ') || 'none'}
                </div>
                <div>
                  <span className="font-semibold">Tasker:</span>{' '}
                  {selectedTask.taskerName ||
                    selectedTask.taskerEmail ||
                    'unknown'}
                </div>
                <div>
                  <span className="font-semibold">Location:</span>{' '}
                  {typeof selectedTask.lat === 'number' &&
                  typeof selectedTask.lon === 'number'
                    ? `${selectedTask.lat.toFixed(5)}, ${selectedTask.lon.toFixed(5)}`
                    : 'no coordinates stored'}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">2. Eligible helpers for this task</h2>

        {!selectedTask && (
          <p className="text-sm text-gray-600">
            Select a task above to see matching helpers.
          </p>
        )}

        {selectedTask && eligibleHelpers.length === 0 && (
          <p className="text-sm text-gray-600">
            No eligible helpers found based on current matching rules (distance still shown for reference).
          </p>
        )}

        {selectedTask && eligibleHelpers.length > 0 && (
          <div className="overflow-x-auto">
            <p className="mb-2 text-xs text-gray-600">
              Matching helper <span className="font-semibold">skills + services_offered + professions</span>{' '}
              against task tags: <span className="font-semibold">{selectedTask.tags.join(', ') || 'none'}</span>.{' '}
              Distance (km) is calculated but not globally capped here; per-helper distance limits are applied only in
              the notification test below.
            </p>
            <table className="min-w-full border text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">ID</th>
                  <th className="border px-2 py-1 text-left">Name</th>
                  <th className="border px-2 py-1 text-left">
                    Match terms (skills + services + professions)
                  </th>
                  <th className="border px-2 py-1 text-left">Coords</th>
                  <th className="border px-2 py-1 text-left">Distance (km)</th>
                </tr>
              </thead>
              <tbody>
                {eligibleHelpers.map(helper => (
                  <tr key={helper.id}>
                    <td className="border px-2 py-1">{helper.id.substring(0, 8)}</td>
                    <td className="border px-2 py-1">{helper.name}</td>
                    <td className="border px-2 py-1">
                      {helper.skills.join(', ') || 'none'}
                    </td>
                    <td className="border px-2 py-1">
                      {`${helper.lat.toFixed(5)}, ${helper.lon.toFixed(5)}`}
                    </td>
                    <td className="border px-2 py-1">
                      {typeof helper.distanceKm === 'number'
                        ? helper.distanceKm.toFixed(2)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">
          3. Test notifyEligibleHelpers (no real emails sent)
        </h2>

        {!selectedTask && (
          <p className="text-sm text-gray-600">Select a task above to test notifications.</p>
        )}

        {selectedTask && (
          <div className="space-y-3 text-sm">
            <button
              type="button"
              onClick={handleRunNotify}
              className="inline-flex items-center rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Run notifyEligibleHelpers for selected task
            </button>

            {notifySummary && (
              <div className="space-y-1 text-xs text-gray-800">
                <div>
                  <span className="font-semibold">Instant emails (simulated):</span>{' '}
                  {notifySummary.instantSent}
                </div>
                <div>
                  <span className="font-semibold">Queued for daily digest:</span>{' '}
                  {notifySummary.queuedDaily}
                </div>
                <div>
                  <span className="font-semibold">Queued for weekly digest:</span>{' '}
                  {notifySummary.queuedWeekly}
                </div>
              </div>
            )}

            {testEmails.length > 0 && (
              <div className="mt-2 space-y-2 text-xs">
                <h3 className="font-semibold">Simulated instant email payloads</h3>
                {sendEmailError && (
                  <p className="text-xs text-red-600">{sendEmailError}</p>
                )}
                <div className="max-h-64 space-y-2 overflow-auto rounded border bg-gray-50 p-2">
                  {testEmails.map((email, idx) => (
                    <div key={idx} className="rounded border bg-white p-2 shadow-sm">
                      <div>
                        <span className="font-semibold">To (actual):</span> {email.intendedTo}
                      </div>
                      <div>
                        <span className="font-semibold">To (sent to in this env):</span> {email.to}
                      </div>
                      <div>
                        <span className="font-semibold">Subject:</span> {email.subject}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-700">
                        <span className="font-semibold">HTML preview (rendered):</span>
                        <div
                          className="mt-1 rounded border bg-gray-50 p-2 text-[11px] text-gray-900"
                          dangerouslySetInnerHTML={{ __html: email.html }}
                        />
                      </div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleSendEmailToMe(email, idx)}
                          disabled={sendingEmailIndex === idx}
                          className="inline-flex items-center rounded bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {sendingEmailIndex === idx ? 'Sending to me…' : 'Send this email to me'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2 rounded border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">4. Raw data snapshot (for debugging)</h2>
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-700">Tasks (limited to 50)</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-900 p-3 text-[11px] text-gray-100">
            {JSON.stringify(tasks, null, 2)}
          </pre>
        </details>
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-700">
            Helpers (helpers with coords, limited to 200)
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-900 p-3 text-[11px] text-gray-100">
            {JSON.stringify(helpers, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  )
}

