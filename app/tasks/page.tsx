'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Task, Category, Tag } from '@/lib/types'
import Link from 'next/link'
import { format } from 'date-fns'
import { calculateDistance, geocodePostcode } from '@/lib/geocoding'
import { isProfileComplete } from '@/lib/profile-utils'
import UserProfileModal from '@/components/UserProfileModal'

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'my_tasks' | 'new'>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all')
  const [minBudget, setMinBudget] = useState<string>('')
  const [maxBudget, setMaxBudget] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [searchPostcode, setSearchPostcode] = useState('')
  const [searchRadius, setSearchRadius] = useState<string>('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [geocodingLocation, setGeocodingLocation] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [lastViewTime, setLastViewTime] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name')
        .limit(100)

      if (error) throw error
      setAvailableTags(data || [])
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const loadSubCategories = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', categoryId)
        .order('name')

      if (error) throw error
      setSubCategories(data || [])
    } catch (error) {
      console.error('Error loading sub-categories:', error)
      setSubCategories([])
    }
  }

  const loadUserLocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUserLocation(null)
        return
      }

      // Get user's profile with postcode
      const { data: profile } = await supabase
        .from('profiles')
        .select('postcode, country, latitude, longitude')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setUserLocation(null)
        return
      }

      // If profile already has lat/lng, use that
      if (profile.latitude && profile.longitude) {
        setUserLocation({ lat: profile.latitude, lng: profile.longitude })
        return
      }

      // Otherwise, geocode the postcode
      if (profile.postcode) {
        const geocodeResult = await geocodePostcode(profile.postcode, profile.country || undefined)
        if (geocodeResult) {
          setUserLocation({ lat: geocodeResult.latitude, lng: geocodeResult.longitude })
        } else {
          setUserLocation(null)
        }
      } else {
        setUserLocation(null)
      }
    } catch (error) {
      console.error('Error loading user location:', error)
      setUserLocation(null)
    }
  }

  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter out archived tasks by default
      if (!showArchived) {
        query = query.eq('archived', false)
      }

      if (filter === 'open') {
        query = query.eq('status', 'open')
      } else if (filter === 'my_tasks' && user) {
        query = query.eq('created_by', user.id)
      } else if (filter === 'new') {
        // Show tasks created in the last 2 weeks
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        query = query.gte('created_at', twoWeeksAgo.toISOString())
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }

      if (selectedSubCategory !== 'all' && selectedSubCategory) {
        query = query.eq('sub_category_id', selectedSubCategory)
      }

      if (minBudget) {
        query = query.gte('budget', Number(minBudget))
      }

      if (maxBudget) {
        query = query.lte('budget', Number(maxBudget))
      }

      if (searchTerm.trim()) {
        const value = searchTerm.trim()
        query = query.or(`title.ilike.%${value}%,description.ilike.%${value}%`)
      }

      let tasksData
      let error

      const result = await query
      tasksData = result.data
      error = result.error

      if (error) throw error

      // Fetch profiles, ratings, categories, and tags for task creators
      if (tasksData && tasksData.length > 0) {
        const creatorIds = Array.from(new Set(tasksData.map(t => t.created_by)))
        const categoryIds = Array.from(new Set(tasksData.flatMap(t => [t.category_id, t.sub_category_id]).filter(Boolean)))
        const taskIds = tasksData.map(t => t.id)

        const [profilesResult, reviewsResult, categoriesResult, tagsResult, bidsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .in('id', creatorIds),
          supabase
            .from('reviews')
            .select('reviewee_id, rating')
            .in('reviewee_id', creatorIds),
          categoryIds.length > 0 ? supabase
            .from('categories')
            .select('*')
            .in('id', categoryIds) : Promise.resolve({ data: [] }),
          supabase
            .from('task_tags')
            .select('task_id, tag_id, tags(*)')
            .in('task_id', taskIds),
          // Fetch bids - RLS policy should allow viewing all bids on open tasks
          supabase
            .from('bids')
            .select('task_id, id')
            .in('task_id', taskIds)
        ])

        const profilesData = profilesResult.data || []
        const reviewsData = reviewsResult.data || []
        const categoriesData = categoriesResult.data || []
        const taskTagsData = tagsResult.data || []
        const bidsData = bidsResult.data || []

        // Count bids per task
        const bidsByTaskId: Record<string, number> = {}
        bidsData.forEach((bid: any) => {
          bidsByTaskId[bid.task_id] = (bidsByTaskId[bid.task_id] || 0) + 1
        })

        // Group tags by task_id
        const tagsByTaskId: Record<string, any[]> = {}
        taskTagsData.forEach((tt: any) => {
          if (!tagsByTaskId[tt.task_id]) {
            tagsByTaskId[tt.task_id] = []
          }
          if (tt.tags) {
            tagsByTaskId[tt.task_id].push(tt.tags)
          }
        })

        // Calculate average ratings for each user
        const ratingsByUser: Record<string, { avg: number; count: number }> = {}
        reviewsData.forEach(review => {
          if (!ratingsByUser[review.reviewee_id]) {
            ratingsByUser[review.reviewee_id] = { avg: 0, count: 0 }
          }
          ratingsByUser[review.reviewee_id].count++
          ratingsByUser[review.reviewee_id].avg += review.rating
        })

        Object.keys(ratingsByUser).forEach(userId => {
          const data = ratingsByUser[userId]
          data.avg = data.avg / data.count
        })

        // Map profiles, ratings, categories, and tags to tasks
        const tasksWithProfiles = tasksData.map(task => {
          const user = profilesData.find(p => p.id === task.created_by)
          const rating = ratingsByUser[task.created_by]
          const categoryObj = task.category_id ? categoriesData.find(c => c.id === task.category_id) : null
          const subCategoryObj = task.sub_category_id ? categoriesData.find(c => c.id === task.sub_category_id) : null
          const tags = tagsByTaskId[task.id] || []

          // Calculate distance if user location and task location are available
          let distance: number | undefined = undefined
          if (userLocation && task.latitude && task.longitude) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              task.latitude,
              task.longitude
            )
          }

          return {
            ...task,
            user: user ? { ...user, rating: rating ? rating.avg : null, reviewCount: rating?.count || 0 } : undefined,
            category_obj: categoryObj || undefined,
            sub_category_obj: subCategoryObj || undefined,
            tags: tags,
            bidCount: bidsByTaskId[task.id] || 0,
            distance: distance
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

  const checkProfileAndLoad = async () => {
    // Check if profile is complete
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      setCurrentUserId(authUser.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, country, phone_country_code, phone_number')
        .eq('id', authUser.id)
        .single()

      if (!isProfileComplete(profile)) {
        router.push('/profile?setup=required')
        return
      }
      
      // Load user location for distance calculations
      await loadUserLocation()
    } else {
      // Clear currentUserId if user is not logged in
      // Allow non-logged in users to view tasks
      setCurrentUserId(null)
      setUserLocation(null)
    }

    setLoading(false)
    loadCategories()
    loadTags()
    loadTasks()
  }

  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') return

    // Load last view time from localStorage (this is when they last viewed the page)
    const storedLastView = localStorage.getItem('tasks_last_view_time')
    setLastViewTime(storedLastView)

    checkProfileAndLoad()

    // Listen for auth state changes to update currentUserId
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id)
        // Load user location when user logs in
        await loadUserLocation()
        // On login, if no stored time exists, set it to now (so no tasks are marked as new on first visit)
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('tasks_last_view_time')
          if (!stored) {
            const now = new Date().toISOString()
            localStorage.setItem('tasks_last_view_time', now)
            setLastViewTime(now)
          }
        }
      } else {
        setCurrentUserId(null)
        setUserLocation(null)
        // Clear last view time on logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tasks_last_view_time')
        }
        setLastViewTime(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      loadSubCategories(selectedCategory)
    } else {
      setSubCategories([])
      setSelectedSubCategory('all')
    }
  }, [selectedCategory])

  useEffect(() => {
    if (!loading) {
      loadTasks()
    }
  }, [filter, selectedCategory, selectedSubCategory, selectedTagIds, minBudget, maxBudget, searchTerm, showArchived])

  useEffect(() => {
    if (!loading && userLocation !== null) {
      // Reload tasks to calculate distances when user location is available
      loadTasks()
    }
  }, [userLocation])

  // Track task views for NEW banner logic
  useEffect(() => {
    if (!currentUserId || !tasks.length || typeof window === 'undefined') return
    
    // Track which tasks are visible (in viewport)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const taskId = entry.target.getAttribute('data-task-id')
          if (taskId) {
            const viewKey = `task_viewed_${taskId}`
            const currentCount = parseInt(localStorage.getItem(viewKey) || '0', 10)
            if (currentCount < 3) {
              localStorage.setItem(viewKey, String(currentCount + 1))
            }
          }
        }
      })
    }, { threshold: 0.5 })
    
    // Observe all task cards
    const taskCards = document.querySelectorAll('[data-task-id]')
    taskCards.forEach(card => observer.observe(card))
    
    return () => {
      taskCards.forEach(card => observer.unobserve(card))
      observer.disconnect()
    }
  }, [tasks, currentUserId])

  // Update last view time after tasks are loaded and displayed
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!loading && tasks.length > 0 && lastViewTime !== null) {
      // Update last view time to now (for next visit) after a short delay
      // This ensures the NEW badges are shown before we update the timestamp
      const timer = setTimeout(() => {
        const now = new Date().toISOString()
        localStorage.setItem('tasks_last_view_time', now)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (!loading && lastViewTime === null) {
      // First visit - set the timestamp so next visit can compare
      const now = new Date().toISOString()
      localStorage.setItem('tasks_last_view_time', now)
    }
  }, [loading, tasks, lastViewTime])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <div className="flex gap-3">
          <Link
            href="/tasks/map"
            className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
          >
            Map View
          </Link>
          <Link
            href="/tasks/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            Post New Task
          </Link>
        </div>
      </div>

      <div className="mb-6 flex space-x-4 items-center">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Tasks
        </button>
        <div className="relative group">
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'open'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Open Tasks
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Still Taking Bids
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
        {currentUserId && (
          <div className="relative group">
            <button
              onClick={() => setFilter('my_tasks')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'my_tasks'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Tasks
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Your Open Tasks
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        )}
        <div className="relative group">
          <button
            onClick={() => {
              if (!currentUserId) {
                setShowLoginModal(true)
              } else {
                setFilter('new')
              }
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'new'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            New Tasks
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Last Two Weeks
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
        {currentUserId && (
          <label className="ml-4 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Show archived tasks</span>
          </label>
        )}
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadTasks()
          }}
          className="grid gap-4 md:grid-cols-4"
        >
          <input
            type="text"
            placeholder="Search title or description"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Min budget"
            value={minBudget}
            min="0"
            onChange={(e) => setMinBudget(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />

          <input
            type="number"
            placeholder="Max budget"
            value={maxBudget}
            min="0"
            onChange={(e) => setMaxBudget(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No tasks found. Be the first to post a task!
          </div>
        ) : (
          tasks.map((task) => {
            // Check if task is new (created after last view time)
            // Show NEW banner for first 3 views if task is less than 2 weeks old
            const isNew = (() => {
              try {
                if (!currentUserId) return false // Only show for logged-in users
                
                const taskAge = new Date().getTime() - new Date(task.created_at).getTime()
                const twoWeeks = 14 * 24 * 60 * 60 * 1000
                
                // Task must be less than 2 weeks old
                if (taskAge >= twoWeeks) return false
                
                // Check how many times user has seen this task
                const viewKey = `task_viewed_${task.id}`
                const viewCount = parseInt(localStorage.getItem(viewKey) || '0', 10)
                
                // Show NEW banner for first 3 views
                return viewCount < 3
              } catch (e) {
                return false
              }
            })()

            return (
              <Link
                key={task.id}
                href={currentUserId ? `/tasks/${task.id}` : '#'}
                onClick={(e) => {
                  if (!currentUserId) {
                    e.preventDefault()
                    setShowLoginModal(true)
                  }
                }}
                data-task-id={task.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col relative"
              >
                {/* NEW Badge/Sash */}
                {isNew && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg rounded-tr-lg shadow-lg z-10 transform rotate-12 origin-top-right">
                    NEW
                  </div>
                )}
              {/* Header: Image, Title, Status, Price */}
              <div className="flex gap-4 mb-4">
                {task.image_url && (
                  <div className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={task.image_url}
                      alt={task.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-3">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
                      <p className="text-3xl font-bold text-primary-600">${task.budget}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {currentUserId && task.created_by === currentUserId && (
                        <span className="px-2.5 py-1 text-xs font-bold rounded uppercase bg-red-100 text-red-700 whitespace-nowrap">
                          My Task
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                          task.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : task.status === 'completed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>

                  {/* Poster Info */}
                  {task.user && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setSelectedUserId(task.user?.id || null)
                          setIsProfileModalOpen(true)
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2"
                      >
                        {task.user.avatar_url && (
                          <img
                            src={task.user.avatar_url}
                            alt={task.user.full_name || task.user.email}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">by {task.user.full_name || task.user.email}</span>
                      </button>
                      {task.user.rating !== null && task.user.rating !== undefined && typeof task.user.rating === 'number' && (
                        <span className="text-sm text-amber-600 font-semibold flex items-center whitespace-nowrap">
                          <span className="mr-1">★</span>
                          <span>{task.user.rating.toFixed(1)}</span>
                          {task.user.reviewCount && typeof task.user.reviewCount === 'number' && task.user.reviewCount > 0 && (
                            <span className="text-gray-500 ml-1">({task.user.reviewCount})</span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mb-4 pb-4 border-b border-gray-200"></div>

              {/* Metadata: Category, Bids, Distance, Due Date */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {(task.sub_category_obj || task.category_obj || task.category) && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Category:</span>
                    <span className="text-gray-700 font-medium bg-gray-100 px-2.5 py-1 rounded">
                      {task.sub_category_obj?.name || task.category_obj?.name || task.category}
                    </span>
                  </div>
                )}

                {typeof (task as any).bidCount === 'number' && (task as any).bidCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">💰</span>
                    <span className="text-gray-700 font-medium">
                      {(task as any).bidCount} bid{(task as any).bidCount === 1 ? '' : 's'}
                    </span>
                  </div>
                )}

                {task.distance !== undefined && task.distance !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">📍</span>
                    <span className="text-gray-700 font-medium">
                      {task.distance} km
                    </span>
                  </div>
                )}

                {task.due_date && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">📅</span>
                    <span className="text-gray-700">
                      Due: {(() => {
                        try {
                          return format(new Date(task.due_date!), 'MMM d, yyyy')
                        } catch (e) {
                          return 'Invalid date'
                        }
                      })()}
                    </span>
                  </div>
                )}

                {task.willing_to_help && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">🤝</span>
                    <span className="text-primary-600 font-medium">
                      Task poster will help
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-200">
                  {task.tags.map((tag) =>
                    tag && tag.id && tag.name ? (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag.name}
                      </span>
                    ) : null
                  )}
                </div>
              )}
              </Link>
            )
          })
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        userId={selectedUserId}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false)
          setSelectedUserId(null)
        }}
      />

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">
              You must be logged in to view task details, post tasks, or access messages.
            </p>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md text-center hover:bg-primary-700"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-center hover:bg-gray-300"
              >
                Sign Up
              </Link>
              <button
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}