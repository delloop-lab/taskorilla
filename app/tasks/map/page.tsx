'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { geocodePostcode, geocodeAddress } from '@/lib/geocoding'

// Debug logging - only in development
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => isDev && console.log(...args)

// Dynamically import Map component to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function TasksMapPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [placeMarkers, setPlaceMarkers] = useState<any[]>([])
  const loadStartedRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate loads (React StrictMode causes double renders in dev)
    if (loadStartedRef.current) return
    loadStartedRef.current = true
    loadTasks()
    loadPlaceMarkers()
  }, [])

  const loadTasks = async () => {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      let isAdmin = false
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .in('status', ['open', 'in_progress']) // Show both open and in-progress tasks
        .eq('archived', false) // Don't show archived tasks on map
        // Include tasks with postcodes even if they don't have coordinates yet
        // We'll geocode them on-the-fly
      
      // Filter out hidden tasks for non-admins
      if (!isAdmin) {
        query = query.eq('hidden_by_admin', false)
      }

      // Hide "request helper" tasks from general view
      // Only show them to the assigned helper
      if (user) {
        // Show tasks that are either:
        // 1. Not assigned to anyone (assigned_to is null), OR
        // 2. Assigned to the current user (they requested this helper)
        query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`)
      } else {
        // For non-logged-in users, only show unassigned tasks
        query = query.is('assigned_to', null)
      }

      const { data: tasksData, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching tasks:', error)
        throw error
      }

      debugLog(`📊 Found ${tasksData?.length || 0} tasks matching filters`)

      if (tasksData) {
        // Fetch profiles for task creators
        const creatorIds = Array.from(new Set(tasksData.map(t => t.created_by)))
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', creatorIds)

        debugLog(`📋 Processing ${tasksData.length} tasks...`)
        
        // Separate tasks into those that need geocoding and those that don't
        const tasksNeedingGeocode: typeof tasksData = []
        const tasksWithValidCoords: typeof tasksData = []
        
        // First pass: quickly identify which tasks need geocoding
        tasksData.forEach((task) => {
          const latitude = typeof task.latitude === 'string' ? parseFloat(task.latitude) : (task.latitude ?? null)
          const longitude = typeof task.longitude === 'string' ? parseFloat(task.longitude) : (task.longitude ?? null)
          const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0
          
          if (hasValidCoords && task.country?.toLowerCase() === 'portugal') {
            // Quick validation for Portugal bounds
            const isInPortugalBounds = latitude >= 36 && latitude <= 43 && longitude >= -10 && longitude <= -5
            if (isInPortugalBounds) {
              tasksWithValidCoords.push(task)
              return
            }
          } else if (hasValidCoords) {
            tasksWithValidCoords.push(task)
            return
          }
          
          // Task needs geocoding
          if (task.postcode || task.location) {
            tasksNeedingGeocode.push(task)
          }
        })
        
        debugLog(`✅ ${tasksWithValidCoords.length} tasks already have valid coordinates`)
        debugLog(`🔄 ${tasksNeedingGeocode.length} tasks need geocoding`)
        
        // Process tasks that need geocoding (in parallel, but limit concurrency)
        const geocodeBatchSize = 3 // Process 3 at a time to avoid rate limits
        const geocodedTasks: typeof tasksData = []
        
        for (let i = 0; i < tasksNeedingGeocode.length; i += geocodeBatchSize) {
          const batch = tasksNeedingGeocode.slice(i, i + geocodeBatchSize)
          const batchResults = await Promise.all(
            batch.map(async (task, index) => {
              const user = profilesData?.find(p => p.id === task.created_by)
              
              debugLog(`\n[${i + index + 1}/${tasksNeedingGeocode.length}] Processing task "${task.title}"`)
              
              // Ensure coordinates are numbers
              let latitude = typeof task.latitude === 'string' ? parseFloat(task.latitude) : (task.latitude ?? null)
              let longitude = typeof task.longitude === 'string' ? parseFloat(task.longitude) : (task.longitude ?? null)
              
              // Check if coordinates are valid
              const hasValidCoords = latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0
            
            // Validate coordinates are reasonable for Portugal (if country is Portugal)
            let coordsSeemIncorrect = false
            if (hasValidCoords && task.country?.toLowerCase() === 'portugal') {
              // Portugal latitude range: ~36.8 to ~42.2
              // Portugal longitude range: ~-9.5 to ~-6.2
              const isInPortugalBounds = latitude >= 36 && latitude <= 43 && longitude >= -10 && longitude <= -5
              
              if (!isInPortugalBounds) {
                console.warn(`  ⚠️ Coordinates outside Portugal bounds: lat=${latitude}, lon=${longitude}`)
                coordsSeemIncorrect = true
              } else {
                // Additional check: if postcode suggests Algarve (8xxx) but coordinates are near Lisbon (38.7, -9.1)
                // Algarve postcodes start with 8xxx and should be around lat 37, lon -8
                const postcodeArea = task.postcode?.split('-')[0]?.substring(0, 1)
                if (postcodeArea === '8' && latitude > 38 && longitude < -9) {
                  console.warn(`  ⚠️ Postcode ${task.postcode} suggests Algarve but coordinates are near Lisbon: lat=${latitude}, lon=${longitude}`)
                  coordsSeemIncorrect = true
                }
                // Check if coordinates are suspiciously close to Lisbon center (common wrong geocoding result)
                const distanceFromLisbon = Math.sqrt(Math.pow(latitude - 38.7223, 2) + Math.pow(longitude - (-9.1393), 2))
                if (distanceFromLisbon < 0.1 && task.postcode && !task.postcode.startsWith('1')) {
                  console.warn(`  ⚠️ Coordinates suspiciously close to Lisbon center for postcode ${task.postcode}: lat=${latitude}, lon=${longitude}`)
                  coordsSeemIncorrect = true
                }
              }
            }
            
            // If task has postcode but no valid coordinates OR coordinates seem incorrect, try to geocode it
            if (!hasValidCoords || coordsSeemIncorrect) {
              let geocodeResult = null
              
              // Try postcode first if available
              if (task.postcode && task.country) {
                try {
                  geocodeResult = await geocodePostcode(task.postcode, task.country)
                  if (geocodeResult) {
                    // Validate that coordinates are reasonable for the postcode region
                    const postcodeArea = task.postcode.split('-')[0]?.substring(0, 1)
                    const isAlgarve = postcodeArea === '8'
                    
                    if (isAlgarve) {
                      // Algarve should be around lat 37, lon -8
                      const latDiff = Math.abs(geocodeResult.latitude - 37.1)
                      const lonDiff = Math.abs(geocodeResult.longitude - (-8.67))
                      
                      // If coordinates are more than 1 degree away from expected Algarve location, reject them
                      if (latDiff > 1 || lonDiff > 1) {
                        debugLog(`  ⚠️ Rejecting geocoded coordinates - too far from Algarve`)
                        geocodeResult = null
                      }
                    }
                  }
                } catch (error) {
                  console.error(`  ❌ Error geocoding postcode:`, error)
                }
              }
              
              // If postcode geocoding failed or returned wrong coordinates, try using address/location field
              if (!geocodeResult && task.location && task.country) {
                try {
                  geocodeResult = await geocodeAddress(task.location, task.postcode || undefined, task.country)
                  if (geocodeResult) {
                    // Validate coordinates for Algarve postcodes
                    const postcodeArea = task.postcode?.split('-')[0]?.substring(0, 1)
                    const isAlgarve = postcodeArea === '8'
                    
                    if (isAlgarve && geocodeResult.latitude && geocodeResult.longitude) {
                      const latDiff = Math.abs(geocodeResult.latitude - 37.1)
                      const lonDiff = Math.abs(geocodeResult.longitude - (-8.67))
                      
                      if (latDiff > 1 || lonDiff > 1) {
                        debugLog(`  ⚠️ Rejecting address geocoded coordinates - too far from Algarve`)
                        geocodeResult = null
                      }
                    }
                  }
                } catch (error) {
                  console.error(`  ❌ Error geocoding address:`, error)
                }
              }
              
              
              if (geocodeResult && geocodeResult.latitude && geocodeResult.longitude) {
                latitude = geocodeResult.latitude
                longitude = geocodeResult.longitude
                debugLog(`  ✅ Geocoded task: ${task.title}`)
                
                // Defer database update to background (don't block map loading)
                setTimeout(async () => {
                  const { error: updateError } = await supabase
                    .from('tasks')
                    .update({
                      latitude: geocodeResult.latitude,
                      longitude: geocodeResult.longitude,
                      location: geocodeResult.closest_address || geocodeResult.display_name || task.location || task.postcode
                    })
                    .eq('id', task.id)
                  
                  if (updateError) {
                    console.error(`  ❌ Error updating task ${task.id} in database:`, updateError)
                  }
                }, 0)
              } else {
                console.warn(`  ⚠️ Failed to geocode task - will be excluded from map`)
              }
            }
            
            // Return task with coordinates (or null if invalid)
            if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0) {
              return {
                ...task,
                latitude,
                longitude,
                user: user || undefined
              }
            }
            return null
            })
          )
          
          // Filter out null results
          geocodedTasks.push(...batchResults.filter(t => t !== null))
        }
        
        // Combine tasks with valid coords and newly geocoded tasks
        const tasksWithProfiles = [
          ...tasksWithValidCoords.map(task => ({
            ...task,
            latitude: typeof task.latitude === 'string' ? parseFloat(task.latitude) : (task.latitude ?? null),
            longitude: typeof task.longitude === 'string' ? parseFloat(task.longitude) : (task.longitude ?? null),
            user: profilesData?.find(p => p.id === task.created_by) || undefined
          })),
          ...geocodedTasks
        ]

        // Filter out tasks that still don't have valid coordinates
        const tasksWithValidCoordinates = tasksWithProfiles.filter(
          task => {
            const hasValid = task.latitude && task.longitude && !isNaN(task.latitude) && !isNaN(task.longitude) && task.latitude !== 0 && task.longitude !== 0
            if (!hasValid) {
              debugLog(`  ❌ Excluding task "${task.title}" - invalid coordinates`)
            }
            return hasValid
          }
        )

        debugLog(`✅ Final result: ${tasksWithValidCoordinates.length} tasks with valid coordinates out of ${tasksData.length} total`)

        setTasks(tasksWithValidCoordinates)
      } else {
        setTasks([])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPlaceMarkers = async () => {
    try {
      const { data, error } = await supabase
        .from('map_markers')
        .select('id, title, address, tooltip, logo_url, business_url, latitude, longitude, visible')
        .eq('visible', true)

      if (error) {
        console.error('❌ Error fetching map markers:', error)
        return
      }

      if (!data || data.length === 0) {
        setPlaceMarkers([])
        return
      }

      const markersWithCoords = await Promise.all(
        data.map(async (marker) => {
          let lat = typeof marker.latitude === 'string' ? parseFloat(marker.latitude) : marker.latitude
          let lon = typeof marker.longitude === 'string' ? parseFloat(marker.longitude) : marker.longitude

          const hasValid =
            lat != null &&
            lon != null &&
            !isNaN(lat) &&
            !isNaN(lon) &&
            lat !== 0 &&
            lon !== 0

          if (!hasValid && marker.address) {
            try {
              const result = await geocodeAddress(marker.address)
              if (result && result.latitude && result.longitude) {
                lat = result.latitude
                lon = result.longitude
              }
            } catch (err) {
              console.error('Error geocoding map marker address:', err)
            }
          }

          if (
            lat == null ||
            lon == null ||
            isNaN(lat) ||
            isNaN(lon) ||
            lat < -90 ||
            lat > 90 ||
            lon < -180 ||
            lon > 180
          ) {
            return null
          }

          return {
            id: marker.id,
            title: marker.title,
            address: marker.address,
            tooltip: marker.tooltip,
            logo_url: marker.logo_url,
            business_url: marker.business_url,
            latitude: lat,
            longitude: lon,
          }
        })
      )

      setPlaceMarkers(markersWithCoords.filter((m) => m !== null))
    } catch (err) {
      console.error('Error loading map markers:', err)
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
          <p className="text-sm text-gray-500">
            {tasks.length} tasks on map{placeMarkers.length ? ` • ${placeMarkers.length} places` : ''}
          </p>
          <p className="text-xs text-gray-400">Check browser console for debugging info</p>
        </div>
        <Link
          href="/tasks"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          ← Back to List
        </Link>
      </div>

      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <Map tasks={tasks} markers={placeMarkers} onTaskClick={setSelectedTask} />
      </div>

      {selectedTask && (
        <div className="bg-white border-t shadow-lg">
          <div className="p-4 max-h-64 overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-2">{selectedTask.title}</h3>
                <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">{selectedTask.description || 'No description provided.'}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-lg font-bold text-primary-600">{selectedTask.budget ? `€${selectedTask.budget}` : 'Quote'}</span>
                  {selectedTask.postcode && (
                    <span className="text-sm text-gray-500">📍 {selectedTask.postcode}</span>
                  )}
                </div>
              </div>
              <Link
                href={`/tasks/${selectedTask.id}`}
                className="flex-shrink-0 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 whitespace-nowrap"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

