import { MetadataRoute } from 'next'
import { blogs } from '@/lib/blog-data'
import { createClient } from '@supabase/supabase-js'
import { buildTaskSlug, deriveLocationCity } from '@/lib/task-slug'

const BASE_URL = 'https://taskorilla.com'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tasks`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/helpers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/professionals`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = blogs.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Public tasks (/public-tasks/[slug])
  // Only include clearly public-friendly tasks to keep the sitemap clean.
  const taskPages: MetadataRoute.Sitemap = []

  if (supabase) {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, location, country, created_at, archived, hidden_by_admin')
        .in('status', ['open', 'in_progress', 'completed'])
        .eq('archived', false)
        .eq('hidden_by_admin', false)
        .order('created_at', { ascending: false })
        .limit(5000)

      if (tasks && tasks.length > 0) {
        for (const row of tasks as any[]) {
          const locationCity = deriveLocationCity(
            typeof row.location === 'string' ? row.location : null,
          )

          const slug = buildTaskSlug({
            id: row.id,
            title: row.title || 'Task',
            locationCity,
          })

          taskPages.push({
            url: `${BASE_URL}/public-tasks/${slug}`,
            lastModified: row.created_at ? new Date(row.created_at) : new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
          })
        }
      }
    } catch (err) {
      // In case of any Supabase error, just skip task URLs rather than failing the sitemap.
      console.error('[sitemap] error loading tasks for sitemap', err)
    }
  }

  return [...staticPages, ...blogPages, ...taskPages]
}
