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

// Component to auto-center map on tasks
function MapCenter({ tasks }: { tasks: Task[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (tasks.length > 0 && tasks[0].latitude && tasks[0].longitude) {
      const avgLat = tasks.reduce((sum, t) => sum + (t.latitude || 0), 0) / tasks.length
      const avgLng = tasks.reduce((sum, t) => sum + (t.longitude || 0), 0) / tasks.length
      // Use appropriate zoom based on number of tasks
      const zoom = tasks.length === 1 ? 11 : tasks.length < 5 ? 8 : 6
      map.setView([avgLat, avgLng], zoom)
    }
  }, [tasks, map])
  
  return null
}

export default function TaskMap({ tasks, onTaskClick }: MapProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Default to Portugal (Lisbon) if no tasks
  const defaultCenter: [number, number] = [38.7223, -9.1393]
  const defaultZoom = 6

  const handleMarkerClick = (task: Task) => {
    setSelectedTask(task)
    if (onTaskClick) {
      onTaskClick(task)
    }
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapCenter tasks={tasks} />
      
      {tasks.map((task) => {
        if (!task.latitude || !task.longitude) return null

            const customIcon = L.divIcon({
              className: 'custom-marker',
              html: `<div style="background-color: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; letter-spacing: 0.3px;">$${task.budget}</div>`,
              iconSize: [60, 30],
              iconAnchor: [30, 30],
            })

        return (
          <Marker
            key={task.id}
            position={[task.latitude, task.longitude]}
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
                  }}>${task.budget}</span>
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
      })}
    </MapContainer>
  )
}
