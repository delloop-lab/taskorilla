'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import Map component to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function TasksMapPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .eq('archived', false) // Don't show archived tasks on map
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (tasksData) {
        // Fetch profiles for task creators
        const creatorIds = Array.from(new Set(tasksData.map(t => t.created_by)))
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', creatorIds)

        const tasksWithProfiles = tasksData.map(task => {
          const user = profilesData?.find(p => p.id === task.created_by)
          return {
            ...task,
            user: user || undefined
          }
        })

        setTasks(tasksWithProfiles)
      } else {
        setTasks([])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks Map</h1>
          <p className="text-sm text-gray-500">{tasks.length} open tasks</p>
        </div>
        <Link
          href="/tasks"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          ← Back to List
        </Link>
      </div>

      <div className="flex-1 relative">
        <Map tasks={tasks} onTaskClick={setSelectedTask} />
      </div>

      {selectedTask && (
        <div className="bg-white border-t p-4 max-h-48 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedTask.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-lg font-bold text-primary-600">${selectedTask.budget}</span>
                {selectedTask.postcode && (
                  <span className="text-sm text-gray-500">{selectedTask.postcode}</span>
                )}
              </div>
            </div>
            <Link
              href={`/tasks/${selectedTask.id}`}
              className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
            >
              View Details
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

