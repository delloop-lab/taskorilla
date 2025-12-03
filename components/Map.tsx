'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Task } from '@/lib/types'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface MapProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

// Component to handle map instance and iOS fixes
function MapInstanceHandler({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()
  
  useEffect(() => {
    onMapReady(map)
    
    // Fix for iOS: invalidate size after a short delay
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [map, onMapReady])
  
  return null
}

// Component to auto-center map on tasks
function MapCenter({ tasks }: { tasks: Task[] }) {
  const map = useMap()
  
  useEffect(() => {
    // Wait a bit for map to initialize, especially on iOS
    const timer = setTimeout(() => {
      if (tasks.length > 0) {
        const validTasks = tasks.filter(t => t.latitude && t.longitude && !isNaN(t.latitude) && !isNaN(t.longitude))
        if (validTasks.length > 0) {
          // Calculate bounds to fit all markers
          const lats = validTasks.map(t => t.latitude!)
          const lngs = validTasks.map(t => t.longitude!)
          const minLat = Math.min(...lats)
          const maxLat = Math.max(...lats)
          const minLng = Math.min(...lngs)
          const maxLng = Math.max(...lngs)
          
          // Add padding
          const latPadding = (maxLat - minLat) * 0.1 || 0.1
          const lngPadding = (maxLng - minLng) * 0.1 || 0.1
          
          const bounds = [
            [minLat - latPadding, minLng - lngPadding],
            [maxLat + latPadding, maxLng + lngPadding]
          ] as [[number, number], [number, number]]
          
          try {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
            console.log(`🗺️ Map centered on bounds:`, bounds)
          } catch (error) {
            // Fallback to center/zoom if fitBounds fails
            const avgLat = validTasks.reduce((sum, t) => sum + (t.latitude || 0), 0) / validTasks.length
            const avgLng = validTasks.reduce((sum, t) => sum + (t.longitude || 0), 0) / validTasks.length
            const zoom = validTasks.length === 1 ? 11 : validTasks.length < 5 ? 8 : 6
            map.setView([avgLat, avgLng], zoom, { animate: false })
            console.log(`🗺️ Map centered on point:`, { lat: avgLat, lng: avgLng, zoom })
          }
          
          // Force map to invalidate size on iOS to fix rendering issues
          setTimeout(() => {
            map.invalidateSize()
          }, 100)
        }
      }
    }, 300) // Increased delay to ensure map is fully initialized
    
    return () => clearTimeout(timer)
  }, [tasks, map])
  
  return null
}

// Helper function to add small offsets to markers at the same location
function addMarkerOffsets(tasks: Task[]): Array<{ task: Task; lat: number; lon: number }> {
  const coordinateMap = new Map<string, number[]>()
  const result: Array<{ task: Task; lat: number; lon: number }> = []
  
  tasks.forEach((task) => {
    if (!task.latitude || !task.longitude) return
    
    const lat = typeof task.latitude === 'number' ? task.latitude : parseFloat(String(task.latitude || 0))
    const lon = typeof task.longitude === 'number' ? task.longitude : parseFloat(String(task.longitude || 0))
    
    if (isNaN(lat) || isNaN(lon)) return
    
    // Round to 4 decimal places to group nearby markers (about 11 meters apart)
    const roundedLat = Math.round(lat * 10000) / 10000
    const roundedLon = Math.round(lon * 10000) / 10000
    const key = `${roundedLat},${roundedLon}`
    
    if (!coordinateMap.has(key)) {
      coordinateMap.set(key, [])
    }
    
    const indices = coordinateMap.get(key)!
    indices.push(result.length)
    
    // Calculate offset based on how many markers are at this location
    const offsetIndex = indices.length - 1
    const offsetRadius = 0.0003 // About 33 meters
    const angle = (offsetIndex * 137.5) % 360 // Golden angle for even distribution
    const angleRad = (angle * Math.PI) / 180
    
    const offsetLat = lat + (offsetRadius * Math.cos(angleRad))
    const offsetLon = lon + (offsetRadius * Math.sin(angleRad))
    
    result.push({
      task,
      lat: offsetIndex === 0 ? lat : offsetLat, // First marker stays at original position
      lon: offsetIndex === 0 ? lon : offsetLon
    })
  })
  
  return result
}

export default function TaskMap({ tasks, onTaskClick }: MapProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  
  // Default to Portugal (Lisbon) if no tasks
  const defaultCenter: [number, number] = [38.7223, -9.1393]
  const defaultZoom = 6

  const handleMarkerClick = (task: Task) => {
    setSelectedTask(task)
    if (onTaskClick) {
      onTaskClick(task)
    }
  }

  // Debug: Log when markers should be rendered
  useEffect(() => {
    console.log(`🗺️ Map component received ${tasks.length} tasks to render`)
    if (tasks.length > 0) {
      console.log(`📍 Task coordinates:`, tasks.map(t => ({ 
        title: t.title, 
        lat: t.latitude, 
        lon: t.longitude 
      })))
    }
  }, [tasks])

  // Fix for iOS Safari viewport height issues
  useEffect(() => {
    const handleResize = () => {
      if (mapInstance) {
        setTimeout(() => {
          mapInstance.invalidateSize()
        }, 100)
      }
    }

    // Handle iOS Safari address bar show/hide
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    // Also trigger on focus (when user returns to tab)
    window.addEventListener('focus', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      window.removeEventListener('focus', handleResize)
    }
  }, [mapInstance])

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
      touchZoom={true}
      doubleClickZoom={true}
      zoomControl={true}
      dragging={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapInstanceHandler onMapReady={setMapInstance} />
      <MapCenter tasks={tasks} />
      
      {(() => {
        // Add offsets to markers at the same location so they're all visible
        const tasksWithOffsets = addMarkerOffsets(tasks)
        
        return tasksWithOffsets.map(({ task, lat, lon }) => {
          // Validate coordinates are within reasonable ranges
          if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            console.error(`Task ${task.id} has invalid coordinates:`, { lat, lon })
            return null
          }

          console.log(`📍 Rendering task ${task.id} at:`, { lat, lon, title: task.title, originalLat: task.latitude, originalLon: task.longitude })

          // Format budget for marker display
          const budgetDisplay = task.budget ? `€${task.budget}` : 'Quote'
          
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #2563eb; color: white; padding: 6px 10px; border-radius: 6px; box-shadow: 0 3px 6px rgba(0,0,0,0.4); font-size: 13px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; letter-spacing: 0.3px; white-space: nowrap; display: inline-block; border: 2px solid white; z-index: 1000; position: relative;">${budgetDisplay}</div>`,
            iconSize: [70, 35],
            iconAnchor: [35, 17], // Center horizontally, bottom vertically
            popupAnchor: [0, -17], // Popup appears above marker
          })
          
          // Verify icon was created
          if (!customIcon) {
            console.error(`❌ Failed to create icon for task ${task.id}`)
            return null
          }

          return (
            <Marker
              key={task.id}
              position={[lat, lon]}
              icon={customIcon}
              eventHandlers={{
                click: () => handleMarkerClick(task),
              }}
            >
            <Popup>
              <div style={{ padding: '8px', minWidth: '200px' }}>
                <h3 style={{ 
                  fontWeight: 700, 
                  marginBottom: '4px', 
                  color: '#111827',
                  fontSize: '16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                  letterSpacing: '0.01em'
                }}>{task.title}</h3>
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 700, 
                    color: '#2563eb',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                    letterSpacing: '0.02em'
                  }}>{task.budget ? `€${task.budget}` : 'Quote'}</span>
                  {onTaskClick && (
                    <a
                      href={`/tasks/${task.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        onTaskClick(task)
                        setSelectedTask(null)
                        window.location.href = `/tasks/${task.id}`
                      }}
                      style={{ 
                        fontSize: '12px', 
                        color: '#2563eb', 
                        fontWeight: 600, 
                        textDecoration: 'none',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#1e40af'}
                      onMouseOut={(e) => e.currentTarget.style.color = '#2563eb'}
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
          )
        })
      })()}
    </MapContainer>
  )
}
