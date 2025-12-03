'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { geocodePostcode, geocodeAddress } from '@/lib/geocoding'

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

      console.log(`📊 Found ${tasksData?.length || 0} tasks matching filters`)

      if (tasksData) {
        // Fetch profiles for task creators
        const creatorIds = Array.from(new Set(tasksData.map(t => t.created_by)))
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', creatorIds)

        console.log(`📋 Processing ${tasksData.length} tasks...`)
        
        // Process tasks: geocode those with postcodes but no coordinates
        const tasksWithProfiles = await Promise.all(
          tasksData.map(async (task, index) => {
            const user = profilesData?.find(p => p.id === task.created_by)
            
            console.log(`\n[${index + 1}/${tasksData.length}] Processing task "${task.title}":`, {
              id: task.id,
              postcode: task.postcode,
              country: task.country,
              location: task.location,
              hasLat: !!task.latitude,
              hasLon: !!task.longitude,
              lat: task.latitude,
              lon: task.longitude
            })
            
            // Ensure coordinates are numbers (Supabase DECIMAL can return as strings)
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
              if (coordsSeemIncorrect) {
                console.log(`  🔄 Re-geocoding task with incorrect coordinates`)
              }
              let geocodeResult = null
              
              // Try postcode first if available
              if (task.postcode && task.country) {
                console.log(`  🔍 Attempting to geocode with postcode: ${task.postcode}, country: ${task.country}`)
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
                        console.warn(`  ⚠️ Rejecting geocoded coordinates - too far from Algarve: lat=${geocodeResult.latitude}, lon=${geocodeResult.longitude}`)
                        geocodeResult = null
                      } else {
                        console.log(`  ✅ Postcode geocoding successful:`, geocodeResult)
                      }
                    } else {
                      console.log(`  ✅ Postcode geocoding successful:`, geocodeResult)
                    }
                  } else {
                    console.log(`  ⚠️ Postcode geocoding returned null`)
                  }
                } catch (error) {
                  console.error(`  ❌ Error geocoding postcode:`, error)
                }
              } else {
                console.log(`  ⚠️ Task missing postcode or country (postcode: ${task.postcode}, country: ${task.country})`)
              }
              
              // If postcode geocoding failed or returned wrong coordinates, try using address/location field
              if (!geocodeResult && task.location && task.country) {
                console.log(`  🔍 Attempting to geocode with address: "${task.location}"`)
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
                        console.warn(`  ⚠️ Rejecting address geocoded coordinates - too far from Algarve: lat=${geocodeResult.latitude}, lon=${geocodeResult.longitude}`)
                        geocodeResult = null
                      } else {
                        console.log(`  ✅ Address geocoding successful:`, geocodeResult)
                      }
                    } else {
                      console.log(`  ✅ Address geocoding successful:`, geocodeResult)
                    }
                  } else {
                    console.log(`  ⚠️ Address geocoding returned null`)
                  }
                } catch (error) {
                  console.error(`  ❌ Error geocoding address:`, error)
                }
              }
              
              
              if (geocodeResult && geocodeResult.latitude && geocodeResult.longitude) {
                const oldLat = latitude
                const oldLon = longitude
                latitude = geocodeResult.latitude
                longitude = geocodeResult.longitude
                
                console.log(`  📍 Coordinate update:`, {
                  old: { lat: oldLat, lon: oldLon },
                  new: { lat: latitude, lon: longitude },
                  postcode: task.postcode,
                  location: task.location
                })
                
                // Update the task in the database with the geocoded coordinates
                const { error: updateError } = await supabase
                  .from('tasks')
                  .update({
                    latitude: geocodeResult.latitude,
                    longitude: geocodeResult.longitude,
                    location: geocodeResult.closest_address || geocodeResult.display_name || task.location || task.postcode
                  })
                  .eq('id', task.id)
                
                if (updateError) {
                  console.error(`  ❌ Error updating task in database:`, updateError)
                } else {
                  console.log(`  ✅ Updated task in database with corrected coordinates`)
                }
              } else {
                console.warn(`  ⚠️ Failed to geocode task - will be excluded from map`)
              }
            } else {
              // Validate coordinates one more time before accepting them
              if (task.country?.toLowerCase() === 'portugal') {
                const isInPortugalBounds = latitude >= 36 && latitude <= 43 && longitude >= -10 && longitude <= -5
                if (!isInPortugalBounds) {
                  console.warn(`  ⚠️ Task has coordinates outside Portugal bounds but geocoding was skipped: lat=${latitude}, lon=${longitude}`)
                } else {
                  console.log(`  ✅ Task already has valid coordinates: lat=${latitude}, lon=${longitude}`)
                }
              } else {
                console.log(`  ✅ Task already has valid coordinates: lat=${latitude}, lon=${longitude}`)
              }
            }
            
            // Validate coordinates are valid numbers and within reasonable ranges
            if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
              // Log coordinates for debugging (especially for Portuguese tasks)
              if (task.country?.toLowerCase() === 'portugal') {
                console.log(`📍 Portuguese Task "${task.title}" (${task.postcode}): lat=${latitude}, lon=${longitude}`)
                // Warn if coordinates seem wrong for Portugal (lat should be 36-43, lon should be -10 to -5)
                if (latitude < 36 || latitude > 43 || longitude < -10 || longitude > -5) {
                  console.warn(`⚠️ Task "${task.title}" coordinates seem incorrect for Portugal: lat=${latitude}, lon=${longitude}`)
                }
              }
            } else {
              console.warn(`⚠️ Task "${task.title}" has invalid coordinates:`, { latitude, longitude, rawLat: task.latitude, rawLon: task.longitude, postcode: task.postcode, country: task.country })
            }
            
            return {
              ...task,
              latitude: latitude || null,
              longitude: longitude || null,
              user: user || undefined
            }
          })
        )

        // Filter out tasks that still don't have valid coordinates
        const tasksWithValidCoordinates = tasksWithProfiles.filter(
          task => {
            const hasValid = task.latitude && task.longitude && !isNaN(task.latitude) && !isNaN(task.longitude) && task.latitude !== 0 && task.longitude !== 0
            if (!hasValid) {
              console.log(`  ❌ Excluding task "${task.title}" - invalid coordinates:`, { lat: task.latitude, lon: task.longitude })
            }
            return hasValid
          }
        )

        console.log(`\n✅ Final result: ${tasksWithValidCoordinates.length} tasks with valid coordinates out of ${tasksData.length} total`)
        console.log(`📍 Tasks to display on map:`, tasksWithValidCoordinates.map(t => ({ title: t.title, lat: t.latitude, lon: t.longitude })))

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
          <p className="text-sm text-gray-500">{tasks.length} tasks on map</p>
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
        <Map tasks={tasks} onTaskClick={setSelectedTask} />
      </div>

      {selectedTask && (
        <div className="bg-white border-t p-4 max-h-48 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedTask.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-lg font-bold text-primary-600">{selectedTask.budget ? `€${selectedTask.budget}` : 'Quote'}</span>
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

