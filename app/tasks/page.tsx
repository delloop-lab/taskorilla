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
import TrafficTracker from '@/components/TrafficTracker'
import { getPendingReviews } from '@/lib/review-utils'
import { STANDARD_SKILLS, STANDARD_SERVICES } from '@/lib/helper-constants'
import { STANDARD_PROFESSIONS } from '@/lib/profession-constants'

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
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  const [searchPostcode, setSearchPostcode] = useState('')
  const [searchRadius, setSearchRadius] = useState<string>('')
  const [maxDistance, setMaxDistance] = useState<string>('')
  const [helperType, setHelperType] = useState<string>('')
  const [minimumRating, setMinimumRating] = useState<string>('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [geocodingLocation, setGeocodingLocation] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [filterBySkills, setFilterBySkills] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [lastViewTime, setLastViewTime] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [showPendingReviews, setShowPendingReviews] = useState(false)
  const [showSearchMobile, setShowSearchMobile] = useState(false)

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
    setLoading(true)
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

      // Filter out hidden tasks (admins can see them, but regular users cannot)
      // Check if user is admin
      let userIsAdmin = false
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        userIsAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
        setIsAdmin(userIsAdmin)
      } else {
        setIsAdmin(false)
      }
      
      if (!userIsAdmin) {
        query = query.eq('hidden_by_admin', false)
      }

      if (filter === 'open') {
        query = query.eq('status', 'open')
      } else if (filter === 'my_tasks') {
        if (user) {
          query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
        } else {
          query = query.eq('created_by', '00000000-0000-0000-0000-000000000000')
        }
      } else if (filter === 'new') {
        // Show tasks created in the last 2 weeks
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        query = query.gte('created_at', twoWeeksAgo.toISOString())
      }

      // For filters other than 'my_tasks', hide tasks that are assigned to helpers
      // UNLESS the current user is the assigned helper (they should see their requested tasks)
      if (filter !== 'my_tasks') {
        if (user) {
          // Show tasks that are either:
          // 1. Not assigned to anyone (assigned_to is null), OR
          // 2. Assigned to the current user (they requested this helper)
          query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`)
        } else {
          // For non-logged-in users, only show unassigned tasks
          query = query.is('assigned_to', null)
        }
      }

      // Handle category filtering - the dropdown uses custom values (skill-*, service-*, prof-*)
      // These need to be filtered by required_skills or helper profiles, not category_id
      // For now, we'll filter these client-side after fetching tasks
      
      // Only filter by actual category_id if it's a real UUID (not a custom filter)
      if (selectedCategory !== 'all' && !selectedCategory.startsWith('skill-') && !selectedCategory.startsWith('service-') && !selectedCategory.startsWith('prof-')) {
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
        // Escape special characters and search for whole words or phrases
        const trimmedSearch = searchTerm.trim()
        // Split into words and search for each word
        const words = trimmedSearch.split(/\s+/).filter(w => w.length > 0)
        
        if (words.length > 0) {
          // Build search conditions for each word
          const searchConditions = words.map(word => {
            const escapedWord = word.replace(/[%_\\]/g, '\\$&')
            return `title.ilike.%${escapedWord}%,description.ilike.%${escapedWord}%`
          }).join(',')
          
          // Use or() with proper PostgREST syntax - all words must match
          query = query.or(searchConditions)
        }
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
        let tasksWithProfiles = tasksData.map(task => {
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

          // Check if task matches user skills
          let matchesSkills = false
          if (filterBySkills && userSkills.length > 0 && task.required_skills && Array.isArray(task.required_skills)) {
            matchesSkills = task.required_skills.some((skill: string) => userSkills.includes(skill))
          }

          return {
            ...task,
            user: user ? { ...user, rating: rating ? rating.avg : null, reviewCount: rating?.count || 0 } : undefined,
            category_obj: categoryObj || undefined,
            sub_category_obj: subCategoryObj || undefined,
            tags: tags,
            bidCount: bidsByTaskId[task.id] || 0,
            distance: distance,
            matchesSkills: matchesSkills
          }
        })

        // Filter by skills if enabled
        if (filterBySkills && userSkills.length > 0) {
          tasksWithProfiles = tasksWithProfiles.filter(task => 
            !task.required_skills || task.required_skills.length === 0 || (task as any).matchesSkills
          )
        }

        // Filter by distance if specified
        if (maxDistance && userLocation) {
          const maxDist = Number(maxDistance)
          tasksWithProfiles = tasksWithProfiles.filter(task => {
            if (task.distance === undefined || task.distance === null) return false
            return task.distance <= maxDist
          })
        }

        // Filter by minimum rating if specified
        if (minimumRating) {
          const minRating = Number(minimumRating)
          tasksWithProfiles = tasksWithProfiles.filter(task => {
            const userRating = (task as any).user?.rating
            if (!userRating) return false
            return userRating >= minRating
          })
        }

        // Filter by tags if specified
        if (selectedTagIds.length > 0) {
          tasksWithProfiles = tasksWithProfiles.filter(task => {
            const taskTagIds = (task as any).tags?.map((tag: any) => tag.id) || []
            return selectedTagIds.some(tagId => taskTagIds.includes(tagId))
          })
        }

        // Filter by selected skill if specified
        if (selectedSkill) {
          tasksWithProfiles = tasksWithProfiles.filter(task => {
            if (!task.required_skills || !Array.isArray(task.required_skills) || task.required_skills.length === 0) {
              return false
            }
            // Check if task has the selected skill
            const lowerSelected = selectedSkill.toLowerCase()
            return task.required_skills.some((taskSkill: string) => {
              const lowerTask = taskSkill.toLowerCase()
              return lowerTask.includes(lowerSelected) || lowerSelected.includes(lowerTask)
            })
          })
        }

        // Filter by category (skills/services/professions) if specified
        if (selectedCategory !== 'all') {
          if (selectedCategory.startsWith('skill-')) {
            // Map dropdown values to actual skill names - use exact matches only
            const skillMap: Record<string, string> = {
              'skill-handyman': 'Handyman / Repairs',
              'skill-cleaning': 'Cleaning / Housekeeping',
              'skill-gardening': 'Gardening / Lawn Care',
              'skill-moving': 'Moving / Heavy Lifting',
              'skill-assembly': 'Furniture Assembly',
              'skill-delivery': 'Delivery / Errands',
              'skill-petcare': 'Pet Care / Dog Walking',
              'skill-childcare': 'Babysitting / Childcare',
              'skill-tech': 'Tech Support / Computer Help',
              'skill-tutoring': 'Tutoring / Teaching',
            }
            const matchingSkill = skillMap[selectedCategory]
            if (matchingSkill) {
              tasksWithProfiles = tasksWithProfiles.filter(task => {
                // First priority: Check required_skills array for exact match
                if (task.required_skills && Array.isArray(task.required_skills) && task.required_skills.length > 0) {
                  const hasExactMatch = task.required_skills.some((skill: string) => 
                    skill.toLowerCase() === matchingSkill.toLowerCase() ||
                    skill.toLowerCase().includes(matchingSkill.toLowerCase()) ||
                    matchingSkill.toLowerCase().includes(skill.toLowerCase())
                  )
                  if (hasExactMatch) return true
                }
                
                // Second priority: Check category/subcategory names for exact match
                const categoryName = (task as any).category_obj?.name || ''
                const subCategoryName = (task as any).sub_category_obj?.name || ''
                const categoryMatch = categoryName.toLowerCase() === matchingSkill.toLowerCase() ||
                  categoryName.toLowerCase().includes(matchingSkill.toLowerCase()) ||
                  matchingSkill.toLowerCase().includes(categoryName.toLowerCase())
                const subCategoryMatch = subCategoryName.toLowerCase() === matchingSkill.toLowerCase() ||
                  subCategoryName.toLowerCase().includes(matchingSkill.toLowerCase()) ||
                  matchingSkill.toLowerCase().includes(subCategoryName.toLowerCase())
                
                return categoryMatch || subCategoryMatch
              })
            }
          } else if (selectedCategory.startsWith('service-')) {
            // Map dropdown values to actual service names
            const serviceMap: Record<string, string> = {
              'service-repairs': 'Home Repairs & Maintenance',
              'service-cleaning': 'Cleaning & Organising',
              'service-gardening': 'Yard Work & Gardening',
              'service-assembly': 'Furniture Assembly & Setup',
              'service-moving': 'Moving & Transport Assistance',
              'service-petcare': 'Pet Care & Walking',
              'service-childcare': 'Childcare & Babysitting',
              'service-tech': 'Tech Support & Computer Help',
              'service-tutoring': 'Tutoring & Lessons',
              'service-assistance': 'Personal / Virtual Assistance',
            }
            const matchingService = serviceMap[selectedCategory]
            if (matchingService) {
              tasksWithProfiles = tasksWithProfiles.filter(task => {
                // First priority: Check required_skills array for exact match
                if (task.required_skills && Array.isArray(task.required_skills) && task.required_skills.length > 0) {
                  const hasExactMatch = task.required_skills.some((skill: string) => 
                    skill.toLowerCase() === matchingService.toLowerCase() ||
                    skill.toLowerCase().includes(matchingService.toLowerCase()) ||
                    matchingService.toLowerCase().includes(skill.toLowerCase())
                  )
                  if (hasExactMatch) return true
                }
                
                // Second priority: Check category/subcategory names for exact match
                const categoryName = (task as any).category_obj?.name || ''
                const subCategoryName = (task as any).sub_category_obj?.name || ''
                const categoryMatch = categoryName.toLowerCase() === matchingService.toLowerCase() ||
                  categoryName.toLowerCase().includes(matchingService.toLowerCase()) ||
                  matchingService.toLowerCase().includes(categoryName.toLowerCase())
                const subCategoryMatch = subCategoryName.toLowerCase() === matchingService.toLowerCase() ||
                  subCategoryName.toLowerCase().includes(matchingService.toLowerCase()) ||
                  matchingService.toLowerCase().includes(subCategoryName.toLowerCase())
                
                return categoryMatch || subCategoryMatch
              })
            }
          } else if (selectedCategory.startsWith('prof-')) {
            // Map dropdown values to actual profession names
            const profMap: Record<string, string> = {
              'prof-hairdresser': 'Hairdresser / Barber',
              'prof-nailtech': 'Nail Technician / Manicurist',
              'prof-makeup': 'Makeup Artist / Beauty Consultant',
              'prof-massage': 'Massage Therapist / Physiotherapist',
              'prof-trainer': 'Personal Trainer / Fitness Coach',
              'prof-yoga': 'Yoga / Pilates Instructor',
              'prof-marketing': 'Marketing Consultant / Strategist',
              'prof-social': 'Social Media Manager',
              'prof-designer': 'Graphic Designer / Illustrator',
              'prof-developer': 'Web Developer / Front-End Developer',
              'prof-photographer': 'Photographer / Videographer',
              'prof-accountant': 'Accountant / Bookkeeper',
              'prof-lawyer': 'Lawyer / Legal Consultant',
              'prof-tutor': 'Tutor / Educational Coach',
              'prof-planner': 'Event Planner / Coordinator',
              'prof-chef': 'Chef / Personal Cook',
              'prof-writer': 'Copywriter / Content Writer',
              'prof-interior': 'Interior Designer / Home Stylist',
              'prof-it': 'IT Support / Tech Specialist',
            }
            const matchingProf = profMap[selectedCategory]
            if (matchingProf) {
              tasksWithProfiles = tasksWithProfiles.filter(task => {
                const searchText = `${task.title} ${task.description}`.toLowerCase()
                return searchText.includes(matchingProf.toLowerCase())
              })
            }
          }
        }

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
        .select('full_name, country, phone_country_code, phone_number, skills')
        .eq('id', authUser.id)
        .single()

      if (!isProfileComplete(profile)) {
        router.push('/profile?setup=required')
        return
      }
      
      // Load user skills for filtering
      if (profile?.skills && Array.isArray(profile.skills)) {
        setUserSkills(profile.skills)
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
  }, [filter, selectedCategory, selectedSubCategory, selectedTagIds, selectedSkill, minBudget, maxBudget, searchTerm, showArchived, filterBySkills, maxDistance, minimumRating])

  useEffect(() => {
    if (!loading && userLocation !== null) {
      // Reload tasks to calculate distances when user location is available
      loadTasks()
    }
  }, [userLocation])

  // Load pending reviews for logged-in users
  useEffect(() => {
    const loadPendingReviews = async () => {
      if (!currentUserId) {
        setPendingReviews([])
        return
      }

      try {
        const reviews = await getPendingReviews(currentUserId)
        setPendingReviews(reviews)
        // Check URL params for pending_reviews flag
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          setShowPendingReviews(params.get('pending_reviews') === 'true')
        }
      } catch (error) {
        console.error('Error loading pending reviews:', error)
      }
    }

    loadPendingReviews()
  }, [currentUserId])

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
      <TrafficTracker pageName="tasks" />
      
      {/* Pending Reviews Reminder Banner */}
      {pendingReviews.length > 0 && !showPendingReviews && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  You have {pendingReviews.length} pending review{pendingReviews.length !== 1 ? 's' : ''}!
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Please leave reviews for completed tasks to help build trust in the community.
                </p>
                <div className="space-y-2">
                  {pendingReviews.slice(0, 3).map((review) => (
                    <Link
                      key={review.task_id}
                      href={`/tasks/${review.task_id}`}
                      className="block p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {review.other_user_avatar ? (
                            <img
                              src={review.other_user_avatar}
                              alt={review.other_user_name || 'User'}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                              {(review.other_user_name?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Review {review.is_tasker ? 'helper' : 'tasker'} for "{review.task_title}"
                            </p>
                            <p className="text-xs text-gray-600">
                              {review.other_user_name || 'User'}
                            </p>
                          </div>
                        </div>
                        <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                  {pendingReviews.length > 3 && (
                    <p className="text-sm text-gray-600 text-center pt-2">
                      +{pendingReviews.length - 3} more review{pendingReviews.length - 3 !== 1 ? 's' : ''} pending
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPendingReviews(true)}
              className="flex-shrink-0 text-amber-600 hover:text-amber-800 ml-4"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
        {currentUserId && userSkills.length > 0 && (
          <label className="ml-4 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterBySkills}
              onChange={(e) => setFilterBySkills(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Filter by my skills</span>
          </label>
        )}
      </div>

      {/* Mobile Search Toggle Button */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowSearchMobile(!showSearchMobile)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
        >
          <span className="text-sm font-medium text-gray-700">Search Tasks</span>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform ${showSearchMobile ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Search Form - Hidden on mobile by default, always visible on desktop */}
      <div className={`bg-white rounded-lg shadow mb-6 p-4 ${showSearchMobile ? 'block' : 'hidden'} md:block`}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadTasks()
            // Close search on mobile after submitting
            if (window.innerWidth < 768) {
              setShowSearchMobile(false)
            }
          }}
          className="space-y-3"
        >
          {/* Compact Main Search Fields */}
          <div className="grid gap-3 md:grid-cols-5">
            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search tasks... (e.g., assemble furniture, clean house)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="all">All categories</option>
              <optgroup label="Skills">
                <option value="skill-handyman">Handyman / Repairs</option>
                <option value="skill-cleaning">Cleaning / Housekeeping</option>
                <option value="skill-gardening">Gardening / Lawn Care</option>
                <option value="skill-moving">Moving / Heavy Lifting</option>
                <option value="skill-assembly">Furniture Assembly</option>
                <option value="skill-delivery">Delivery / Errands</option>
                <option value="skill-petcare">Pet Care / Dog Walking</option>
                <option value="skill-childcare">Babysitting / Childcare</option>
                <option value="skill-tech">Tech Support / Computer Help</option>
                <option value="skill-tutoring">Tutoring / Teaching</option>
              </optgroup>
              <optgroup label="Services">
                <option value="service-repairs">Home Repairs & Maintenance</option>
                <option value="service-cleaning">Cleaning & Organising</option>
                <option value="service-gardening">Yard Work & Gardening</option>
                <option value="service-assembly">Furniture Assembly & Setup</option>
                <option value="service-moving">Moving & Transport Assistance</option>
                <option value="service-petcare">Pet Care & Walking</option>
                <option value="service-childcare">Childcare & Babysitting</option>
                <option value="service-tech">Tech Support & Computer Help</option>
                <option value="service-tutoring">Tutoring & Lessons</option>
                <option value="service-assistance">Personal / Virtual Assistance</option>
              </optgroup>
              <optgroup label="Professional Roles">
                <option value="prof-hairdresser">Hairdresser / Barber</option>
                <option value="prof-nailtech">Nail Technician / Manicurist</option>
                <option value="prof-makeup">Makeup Artist / Beauty Consultant</option>
                <option value="prof-massage">Massage Therapist / Physiotherapist</option>
                <option value="prof-trainer">Personal Trainer / Fitness Coach</option>
                <option value="prof-yoga">Yoga / Pilates Instructor</option>
                <option value="prof-marketing">Marketing Consultant / Strategist</option>
                <option value="prof-social">Social Media Manager</option>
                <option value="prof-designer">Graphic Designer / Illustrator</option>
                <option value="prof-developer">Web Developer / Front-End Developer</option>
                <option value="prof-photographer">Photographer / Videographer</option>
                <option value="prof-accountant">Accountant / Bookkeeper</option>
                <option value="prof-lawyer">Lawyer / Legal Consultant</option>
                <option value="prof-tutor">Tutor / Educational Coach</option>
                <option value="prof-planner">Event Planner / Coordinator</option>
                <option value="prof-chef">Chef / Personal Cook</option>
                <option value="prof-writer">Copywriter / Content Writer</option>
                <option value="prof-interior">Interior Designer / Home Stylist</option>
                <option value="prof-it">IT Support / Tech Specialist</option>
              </optgroup>
            </select>

            {/* Skills Dropdown */}
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="">All skills</option>
              {STANDARD_SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>

            {/* Min Budget */}
            <input
              type="number"
              placeholder="Min (€)"
              value={minBudget}
              min="0"
              onChange={(e) => setMinBudget(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />

            {/* Max Budget */}
            <input
              type="number"
              placeholder="Max (€)"
              value={maxBudget}
              min="0"
              onChange={(e) => setMaxBudget(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>

          {/* Optional Filters - Collapsible */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <span>More filters</span>
              <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-3 pt-3 border-t border-gray-200 grid gap-3 md:grid-cols-3">
              {/* Distance Filter */}
              <div>
                <label htmlFor="distance" className="block text-xs font-medium text-gray-700 mb-1">
                  Maximum Distance
                </label>
                <select
                  id="distance"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="">Any distance</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                </select>
              </div>

              {/* Helper Type Filter */}
              <div>
                <label htmlFor="helperType" className="block text-xs font-medium text-gray-700 mb-1">
                  Helper Type
                </label>
                <select
                  id="helperType"
                  value={helperType}
                  onChange={(e) => setHelperType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="">All helpers welcome</option>
                  <option value="professional">Professional experts</option>
                  <option value="casual">Casual helpers</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Professionals and casual helpers both welcome!</p>
              </div>

              {/* Rating Filter */}
              <div>
                <label htmlFor="rating" className="block text-xs font-medium text-gray-700 mb-1">
                  Minimum Rating
                </label>
                <select
                  id="rating"
                  value={minimumRating}
                  onChange={(e) => setMinimumRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="">Any rating</option>
                  <option value="4">4+ stars</option>
                  <option value="4.5">4.5+ stars</option>
                  <option value="5">5 stars only</option>
                </select>
              </div>
            </div>
          </details>

          {/* Search/Filter Button */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSelectedSubCategory('all')
                setMinBudget('')
                setMaxBudget('')
                setMaxDistance('')
                setHelperType('')
                setMinimumRating('')
                setSelectedTagIds([])
                setSelectedSkill('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Clear Filters
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Search / Apply Filters
            </button>
          </div>
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

            // Check if task is a sample task
            const sampleTasks = [
              'My Computer keeps crashing',
              'Paint the fence',
              'Move my piano upstairs',
              'Move my piaon upstairs' // Handle typo variant
            ]
            const isSample = sampleTasks.some(sampleTitle => 
              task.title.toLowerCase().trim() === sampleTitle.toLowerCase().trim()
            )
            const showSampleSash = task.status === 'open'

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
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col relative ${
                  isAdmin && task.hidden_by_admin ? 'border-2 border-red-300 bg-red-50' : ''
                }`}
              >
                {/* SAMPLE Badge/Sash */}
                {showSampleSash && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[0.7875rem] font-bold px-[5.4] py-[1.8] rounded-br-lg shadow-lg z-10 transform -rotate-12 origin-top-left uppercase tracking-wider">
                    SAMPLE
                  </div>
                )}
                {/* NEW Badge/Sash */}
                {isNew && !isSample && (
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
                      <p className="text-3xl font-bold text-primary-600">{task.budget ? `€${task.budget}` : 'Quote'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdmin && task.hidden_by_admin && (
                        <span className="px-2.5 py-1 text-xs font-bold rounded uppercase bg-red-600 text-white whitespace-nowrap">
                          🔒 HIDDEN
                        </span>
                      )}
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
                {/* City and County */}
                {task.location && (() => {
                  // Parse city and county from location string
                  // Format examples: "Lagos, 8600-545, Portugal" or "Lagos, Faro, 8600-545, Portugal"
                  const parts = task.location.split(',').map(p => p.trim())
                  let city = ''
                  let county = ''
                  
                  // Check if it's a Portuguese address (has postcode pattern xxxx-xxx)
                  const hasPortuguesePostcode = parts.some(p => /^\d{4}-\d{3}$/.test(p))
                  
                  if (hasPortuguesePostcode) {
                    // Portuguese format: usually "City, County, Postcode, Portugal" or "City, Postcode, Portugal"
                    // Or full: "Street, Parish, Municipality, District, Postcode, Portugal"
                    if (parts.length >= 3) {
                      // Check if first part looks like a street (has numbers or common street words)
                      const firstPart = parts[0].toLowerCase()
                      const looksLikeStreet = /\d|street|avenue|road|rua|avenida|rua da|rua do|rua de/i.test(firstPart)
                      
                      if (looksLikeStreet && parts.length >= 4) {
                        // Full format: Municipality is usually 3rd part, District is 4th part
                        city = parts[2] || parts[0]
                        county = parts[3] || ''
                      } else {
                        // Simple format: "City, Postcode, Portugal" or "City, County, Postcode, Portugal"
                        city = parts[0]
                        // Check if second part is a county (not a postcode)
                        if (parts.length >= 4 && !/^\d{4}-\d{3}$/.test(parts[1])) {
                          county = parts[1]
                        }
                      }
                    } else {
                      city = parts[0] || ''
                    }
                  } else {
                    // Non-Portuguese format: usually "City, State/County, Country"
                    city = parts[0] || ''
                    county = parts[1] || ''
                  }
                  
                  // Only show if we have city
                  if (city) {
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">📍</span>
                        <span className="text-gray-700 font-medium">
                          {city}{county ? `, ${county}` : ''}
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}

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