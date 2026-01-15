'use client'

import { supabase } from './supabase'

// Debug logging - only in development
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => isDev && console.log(...args)

// Track if connection has been pre-warmed
let connectionWarmed = false
let warmingInProgress = false

/**
 * Pre-warm the Supabase connection by making a small, fast query
 * This helps reduce latency for the first real query
 */
export async function prewarmSupabaseConnection(): Promise<void> {
  if (connectionWarmed || warmingInProgress) return
  
  warmingInProgress = true
  const startTime = performance.now()
  
  try {
    // Make a tiny query that returns minimal data
    // This establishes the connection and warms up the connection pool
    const { error } = await supabase
      .from('tasks')
      .select('id')
      .limit(1)
      .single()
    
    // Even if no data, connection is now warm
    connectionWarmed = true
    const elapsed = performance.now() - startTime
    debugLog(`🔥 Supabase connection pre-warmed in ${elapsed.toFixed(0)}ms`)
  } catch (err) {
    // Connection warming failed, but that's okay - silent in production
    debugLog('Connection pre-warm failed:', err)
  } finally {
    warmingInProgress = false
  }
}

/**
 * Check if connection is already warmed
 */
export function isConnectionWarmed(): boolean {
  return connectionWarmed
}
