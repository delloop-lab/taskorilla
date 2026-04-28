'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

type TickerTask = {
  id: string
  title: string
  budget: number | null
  created_at: string
}

const MAX_TITLE_LENGTH = 58
const DISPLAY_COUNT = 8
const SESSION_STORAGE_KEY = 'home_task_ticker_random_ids_v1'

function truncateTitle(title: string): string {
  const normalized = (title || '').trim()
  if (normalized.length <= MAX_TITLE_LENGTH) return normalized
  return `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}...`
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function HomeTaskTicker() {
  const { language } = useLanguage()
  const [tasks, setTasks] = useState<TickerTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, budget, created_at, status, archived, hidden_by_admin, is_sample_task')
        .eq('status', 'open')
        .or('archived.eq.false,archived.is.null')
        .or('hidden_by_admin.eq.false,hidden_by_admin.is.null')
        .or('is_sample_task.eq.false,is_sample_task.is.null')
        .not('budget', 'is', null)
        .gt('budget', 0)
        .limit(500)

      if (!isActive) return
      if (error || !data) {
        setTasks([])
        setLoading(false)
        return
      }

      const normalizedTasks: TickerTask[] = data.map((task: any) => ({
        id: task.id,
        title: task.title || 'Untitled task',
        budget: typeof task.budget === 'number' ? task.budget : null,
        created_at: task.created_at,
      }))

      let randomized: TickerTask[] = []
      try {
        const existingOrderRaw =
          typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null
        const existingOrder = existingOrderRaw ? (JSON.parse(existingOrderRaw) as string[]) : []

        if (existingOrder.length > 0) {
          const taskById = new Map(normalizedTasks.map((task) => [task.id, task]))
          const fromSession = existingOrder
            .map((id) => taskById.get(id))
            .filter((task): task is TickerTask => Boolean(task))
          if (fromSession.length > 0) {
            randomized = fromSession
          }
        }

        if (randomized.length === 0) {
          randomized = shuffleArray(normalizedTasks)
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify(randomized.map((task) => task.id))
            )
          }
        }
      } catch {
        randomized = shuffleArray(normalizedTasks)
      }

      setTasks(randomized.slice(0, DISPLAY_COUNT))
      setLoading(false)
    }

    loadTasks()
    return () => {
      isActive = false
    }
  }, [])

  const marqueeItems = useMemo(() => {
    if (tasks.length === 0) return []
    return [...tasks, ...tasks]
  }, [tasks])

  if (loading || tasks.length === 0) {
    return null
  }

  return (
    <section aria-label="Latest priced tasks" className="px-4">
      <div className="group mx-auto max-w-6xl rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
            🔥 {language === 'pt' ? 'Ao vivo' : 'Live'}
          </span>
          <div className="h-4 w-px bg-slate-200" aria-hidden="true" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="ticker-track flex w-max min-w-full items-center gap-4 whitespace-nowrap group-hover:[animation-play-state:paused]">
            {marqueeItems.map((task, index) => {
              const amount = typeof task.budget === 'number' ? formatEuro(task.budget) : '€0'
              return (
                <Link
                  key={`${task.id}-${index}`}
                  href={`/tasks/${task.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-sm font-medium text-slate-800 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-100"
                  title={`${task.title} - ${amount}`}
                >
                  <span aria-hidden="true">🔥</span>
                  <span className="max-w-[32rem] truncate">{truncateTitle(task.title)}</span>
                  <span className="text-slate-500">- {amount}</span>
                </Link>
              )
            })}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .ticker-track {
          animation: taskTickerScroll 55s linear infinite;
          will-change: transform;
        }
        @keyframes taskTickerScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  )
}
