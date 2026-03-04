import OpenAI from 'openai'
import { buildTaskSlug } from './task-slug'

/**
 * Very small, safe subset of task data that can be exposed
 * on public, read-only pages and used for SEO helpers.
 */
export interface PublicTaskSummary {
  id: string
  title: string
  description: string | null
  status: string
  locationCity: string | null
  country: string | null
  budget: number | null
  createdAt: string
  required_skills?: string[] | null
  images?: { id: string; image_url: string }[] | null
  image_url?: string | null
  required_professions?: string[] | null
}

const BASE_URL = 'https://www.taskorilla.com'

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

function buildDefaultSeoTitle(task: PublicTaskSummary): string {
  const city = task.locationCity || task.country || 'Portugal'
  const cleanTitle = task.title.trim() || 'Local task'
  return `${cleanTitle} in ${city} | Taskorilla`
}

function buildDefaultSeoDescription(task: PublicTaskSummary): string {
  const city = task.locationCity || task.country || 'Portugal'
  const budgetPart =
    typeof task.budget === 'number' && task.budget > 0
      ? `Budget around €${Math.round(task.budget)}. `
      : ''

  const raw =
    (task.description || '').replace(/\s+/g, ' ').trim() ||
    `Find a trusted local helper in ${city} on Taskorilla.`

  // Prefer not to cut mid-sentence if we can avoid it.
  let base = raw
  if (raw.length > 220) {
    const snippet = raw.slice(0, 220)
    const lastPeriod = snippet.lastIndexOf('.')
    base = lastPeriod > 80 ? snippet.slice(0, lastPeriod + 1) : snippet
  }

  let text = `${budgetPart}${base}`.trim()
  if (text.length > 260) {
    text = text.slice(0, 257).trimEnd() + '...'
  }
  return text
}

/**
 * AI-assisted SEO title. Falls back to deterministic string if
 * OpenAI is unavailable or errors.
 */
export async function generateSeoTitle(task: PublicTaskSummary): Promise<string> {
  const fallback = buildDefaultSeoTitle(task)
  const client = getOpenAIClient()
  if (!client) return fallback

  try {
    const prompt = [
      'You are helping generate concise, SEO-friendly titles for public task listings.',
      'Rules:',
      '- 60 characters or less, ideally.',
      '- Include the task type and city (if available).',
      '- Append \"| Taskorilla\" at the end.',
      '- Do not invent details, keep it factual and neutral.',
      '',
      `Task title: ${task.title}`,
      `City: ${task.locationCity || 'N/A'}`,
      `Country: ${task.country || 'N/A'}`,
      `Status: ${task.status}`,
    ].join('\n')

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      max_output_tokens: 64,
    })

    // Response typing from the OpenAI SDK is quite broad; treat as any here
    // and defensively extract the first text block.
    const anyResp: any = response
    const text =
      anyResp?.output?.[0]?.content?.[0]?.text && typeof anyResp.output[0].content[0].text === 'string'
        ? anyResp.output[0].content[0].text
        : ''

    const cleaned = (text || '').trim()
    if (!cleaned) return fallback
    // Hard cap
    return cleaned.length > 80 ? cleaned.slice(0, 77).trimEnd() + '...' : cleaned
  } catch {
    return fallback
  }
}

/**
 * AI-assisted meta description. Falls back to a safe, deterministic
 * description if OpenAI is unavailable or errors.
 */
export async function generateSeoDescription(task: PublicTaskSummary): Promise<string> {
  const fallback = buildDefaultSeoDescription(task)
  const client = getOpenAIClient()
  if (!client) return fallback

  try {
    const prompt = [
      'Write a single meta description for a public task listing on Taskorilla.',
      'Rules:',
      '- 120–160 characters.',
      '- Mention the general task type and location (city and country only).',
      '- Do NOT include personal names, addresses, emails, phone numbers, or prices.',
      '- Neutral, trustworthy tone. Do not promise outcomes.',
      '',
      `Task title: ${task.title}`,
      `City: ${task.locationCity || 'N/A'}`,
      `Country: ${task.country || 'N/A'}`,
      `Original description: ${task.description || ''}`,
    ].join('\n')

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      max_output_tokens: 96,
    })

    const anyResp: any = response
    const text =
      anyResp?.output?.[0]?.content?.[0]?.text && typeof anyResp.output[0].content[0].text === 'string'
        ? anyResp.output[0].content[0].text
        : ''

    let meta = (text || '').replace(/\s+/g, ' ').trim()
    if (!meta) return fallback

    if (meta.length > 170) {
      meta = meta.slice(0, 167).trimEnd() + '...'
    }
    return meta
  } catch {
    return fallback
  }
}

function normaliseDatePosted(createdAt: string): string {
  // Try to convert to ISO8601 without microseconds; fall back to original if parsing fails.
  const ts = Date.parse(createdAt)
  if (Number.isNaN(ts)) return createdAt
  const iso = new Date(ts).toISOString() // e.g. 2026-02-24T11:30:35.365Z
  // Strip milliseconds and express as +00:00 offset.
  return iso.replace(/\.\d{3}Z$/, '+00:00')
}

/**
 * Generate JSON-LD structured data for a public task.
 * Uses Schema.org Service to describe a local service request.
 * Optionally accepts the AI SEO title so `name` matches it exactly.
 */
export function generateJsonLd(task: PublicTaskSummary, seoTitle?: string) {
  const slug = buildTaskSlug(task)
  const url = `${BASE_URL}/public-tasks/${slug}`

  const city = task.locationCity || null
  const country = task.country || 'Portugal'

  const description = buildDefaultSeoDescription(task)

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: seoTitle || task.title,
    description,
    areaServed: city
      ? {
          '@type': 'Place',
          name: city,
          address: {
            '@type': 'PostalAddress',
            addressLocality: city,
            addressCountry: country,
          },
        }
      : {
          '@type': 'Place',
          name: country,
          address: {
            '@type': 'PostalAddress',
            addressCountry: country,
          },
        },
    provider: {
      '@type': 'Organization',
      name: 'Taskorilla',
      url: BASE_URL,
    },
    url,
    datePosted: normaliseDatePosted(task.createdAt),
    ...(typeof task.budget === 'number' && task.budget > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: task.budget,
            priceCurrency: 'EUR',
          },
        }
      : {}),
  }
}

