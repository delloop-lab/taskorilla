import Script from 'next/script'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { PublicTaskSummary, generateSeoTitle, generateSeoDescription, generateJsonLd } from '@/lib/public-task-seo'
import { buildTaskSlug, parseTaskIdFromSlug, deriveLocationCity } from '@/lib/task-slug'
import PublicTaskDetail from '@/components/PublicTaskDetail'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const BASE_URL = 'https://www.taskorilla.com'

// This page depends on request-time data and cookies,
// so keep it dynamic rather than statically prerendered.
export const dynamic = 'force-dynamic'

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

async function fetchPublicTaskSummary(taskId: string): Promise<PublicTaskSummary | null> {
  if (!supabase) {
    console.error('[public-task-page] Supabase env vars are not configured.')
    return null
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(
      [
        'id',
        'title',
        'description',
        'budget',
        'status',
        'required_skills',
        'required_professions',
        'image_url',
        'location',
        'country',
        'created_at',
        'archived',
        'hidden_by_admin',
      ].join(','),
    )
    .eq('id', taskId)
    .single()

  if (error || !data) {
    console.warn('[public-task-page] Task not found or error loading task', { taskId, error })
    return null
  }

  // Cast to any to avoid tight coupling to generated Supabase types.
  const row: any = data

  // Never show archived / admin-hidden tasks publicly
  if (row.archived || row.hidden_by_admin) {
    return null
  }

  // Only expose clearly public-friendly statuses
  const allowedStatuses = new Set(['open', 'in_progress', 'completed'])
  if (!allowedStatuses.has(row.status)) {
    return null
  }

  const rawLocation: string | null = typeof row.location === 'string' ? row.location : null
  const locationCity = deriveLocationCity(rawLocation)

  const budgetValue =
    typeof row.budget === 'number'
      ? row.budget
      : row.budget != null && !Number.isNaN(Number(row.budget))
        ? Number(row.budget)
        : null

  // Load task images (safe, public asset URLs)
  const { data: imagesData } = await supabase
    .from('task_images')
    .select('id, image_url, display_order')
    .eq('task_id', taskId)
    .order('display_order', { ascending: true })

  const images =
    imagesData && imagesData.length > 0
      ? imagesData.map((img: any) => ({ id: img.id, image_url: img.image_url }))
      : null

  const summary: PublicTaskSummary = {
    id: String(row.id),
    title: row.title || 'Task',
    description: row.description ?? null,
    status: row.status || 'open',
    locationCity,
    country: row.country ?? null,
    budget: budgetValue,
    createdAt: row.created_at,
    required_skills: row.required_skills ?? null,
    images,
    image_url: row.image_url ?? null,
    required_professions: row.required_professions ?? null,
  }

  return summary
}

type PageParams = {
  slug: string
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const taskId = parseTaskIdFromSlug(params.slug)
  if (!taskId) {
    return {
      title: 'Task not found - Taskorilla',
      description: 'The task you are looking for could not be found.',
    }
  }

  const task = await fetchPublicTaskSummary(taskId)
  if (!task) {
    return {
      title: 'Task not found - Taskorilla',
      description: 'This task is no longer publicly available.',
    }
  }

  const [title, description] = await Promise.all([
    generateSeoTitle(task),
    generateSeoDescription(task),
  ])

  const canonicalSlug = buildTaskSlug(task)
  const url = `${BASE_URL}/public-tasks/${canonicalSlug}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

function formatBudget(budget: number | null): string {
  if (budget == null || Number.isNaN(budget)) {
    return 'Quote'
  }
  return `€${Math.round(budget)}`
}

function formatStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    default:
      return status
  }
}

export default async function PublicTaskPage({ params }: { params: PageParams }) {
  const taskId = parseTaskIdFromSlug(params.slug)
  if (!taskId) {
    notFound()
  }

  const task = await fetchPublicTaskSummary(taskId)
  if (!task) {
    notFound()
  }

  // Generate AI SEO title once here so it can be reused
  // for JSON-LD and, in development, for the debug panel.
  const seoTitleForJsonLd = await generateSeoTitle(task)

  const canonicalSlug = buildTaskSlug(task)
  const isCanonical = params.slug === canonicalSlug

  const jsonLd = generateJsonLd(task, seoTitleForJsonLd)

  const budgetLabel = formatBudget(task.budget)
  const locationLabel =
    task.locationCity || task.country ? [task.locationCity, task.country].filter(Boolean).join(', ') : 'Portugal'

  const privateTaskUrl = `/tasks/${task.id}`
  const loginUrl = `/login?redirect=${encodeURIComponent(privateTaskUrl)}`
  const registerUrl = `/register?redirect=${encodeURIComponent(privateTaskUrl)}`

  // Development-only SEO debug bundle
  let seoDebug: {
    taskId: string
    taskTitle: string
    seoTitle: string
    seoDescription: string
    canonicalUrl: string
    slug: string
    jsonLd: any
  } | null = null

  if (process.env.NODE_ENV === 'development') {
    try {
      const seoDescription = await generateSeoDescription(task)
      const canonicalUrl = `${BASE_URL}/public-tasks/${canonicalSlug}`

      seoDebug = {
        taskId: task.id,
        taskTitle: task.title,
        seoTitle: seoTitleForJsonLd,
        seoDescription,
        canonicalUrl,
        slug: canonicalSlug,
        jsonLd,
      }

      console.log('[public-task-seo-debug]', seoDebug)
    } catch (err) {
      console.error('[public-task-seo-debug] error generating SEO bundle', err)
    }
  }

  return (
    <>
      {/* JSON-LD structured data for SEO */}
      {jsonLd && (
        <Script
          id="public-task-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <PublicTaskDetail
        task={task}
        isCanonical={isCanonical}
        budgetLabel={budgetLabel}
        locationLabel={locationLabel}
        loginUrl={loginUrl}
        registerUrl={registerUrl}
        seoDebug={seoDebug}
      />
    </>
  )
}

