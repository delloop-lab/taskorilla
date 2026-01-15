'use client'

import { Task } from './types'

// Debug logging - only in development
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => isDev && console.log(...args)

interface CachedData<T> {
  data: T
  timestamp: number
  filter: string
}

// Cache duration in milliseconds (60 seconds)
const CACHE_DURATION = 60 * 1000

// In-memory cache for tasks
let tasksCache: CachedData<Task[]> | null = null

/**
 * Get cached tasks if available and not expired
 */
export function getCachedTasks(filter: string): Task[] | null {
  if (!tasksCache) return null
  
  // Check if cache is for the same filter
  if (tasksCache.filter !== filter) return null
  
  // Check if cache is expired
  const now = Date.now()
  if (now - tasksCache.timestamp > CACHE_DURATION) {
    tasksCache = null
    return null
  }
  
  debugLog(`📦 Using cached tasks (${tasksCache.data.length} tasks, ${Math.round((now - tasksCache.timestamp) / 1000)}s old)`)
  return tasksCache.data
}

/**
 * Cache tasks data
 */
export function setCachedTasks(tasks: Task[], filter: string): void {
  tasksCache = {
    data: tasks,
    timestamp: Date.now(),
    filter
  }
  debugLog(`📦 Cached ${tasks.length} tasks for filter: ${filter}`)
}

/**
 * Clear the tasks cache
 */
export function clearTasksCache(): void {
  tasksCache = null
  debugLog('📦 Tasks cache cleared')
}

/**
 * Check if we have valid cached data
 */
export function hasCachedTasks(filter: string): boolean {
  return getCachedTasks(filter) !== null
}
