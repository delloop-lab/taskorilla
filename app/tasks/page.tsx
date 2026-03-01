'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Task, Category, Tag } from '@/lib/types'
import Link from 'next/link'
import { format } from 'date-fns'
import { calculateDistance, geocodePostcode } from '@/lib/geocoding'
import { isProfileComplete } from '@/lib/profile-utils'
import UserProfileModal from '@/components/UserProfileModal'
import TrafficTracker from '@/components/TrafficTracker'
import { getPendingReviews } from '@/lib/review-utils'
import { STANDARD_PROFESSIONS } from '@/lib/profession-constants'
import ReportModal from '@/components/ReportModal'
import { useLanguage } from '@/lib/i18n'
import { User as UserIcon } from 'lucide-react'
import { useUserRatings, getUserRatingsById } from '@/lib/useUserRatings'
import CompactUserRatingsDisplay from '@/components/CompactUserRatingsDisplay'
import { getCachedTasks, setCachedTasks, clearTasksCache } from '@/lib/tasks-cache'

// Debug logging - only in development
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => isDev && console.log(...args)
const debugWarn = (...args: any[]) => isDev && console.warn(...args)

type FilterType = 'all' | 'open' | 'my_tasks' | 'new' | 'my_bids'

// Skeleton card component for loading state — mirrors full view card layout
function TaskSkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="p-4 sm:p-5 flex flex-col">
        {/* Thumbnail + title/price row */}
        <div className="grid grid-cols-[48px_1fr] sm:grid-cols-[96px_1fr] gap-3 sm:gap-4">
          <div className="row-span-2 self-start w-12 h-12 sm:w-24 sm:h-24 rounded-lg bg-gray-200" />
          <div className="min-w-0">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="flex items-center justify-between gap-2">
              <div className="h-7 bg-gray-200 rounded w-20" />
              <div className="h-5 bg-gray-200 rounded w-14" />
            </div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-full" />
        </div>

        {/* Poster row */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-full" />
          <div className="h-3 bg-gray-200 rounded w-28" />
          <div className="h-3 bg-gray-200 rounded w-24 ml-2" />
        </div>

        {/* Metadata grid */}
        <div className="mt-auto pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
            <div>
              <div className="h-2.5 bg-gray-200 rounded w-16 mb-1.5" />
              <div className="h-3.5 bg-gray-200 rounded w-24" />
            </div>
            <div>
              <div className="h-2.5 bg-gray-200 rounded w-16 mb-1.5" />
              <div className="h-3.5 bg-gray-200 rounded w-20" />
            </div>
            <div>
              <div className="h-2.5 bg-gray-200 rounded w-10 mb-1.5" />
              <div className="h-3.5 bg-gray-200 rounded w-12" />
            </div>
            <div>
              <div className="h-2.5 bg-gray-200 rounded w-16 mb-1.5" />
              <div className="h-3.5 bg-gray-200 rounded w-14" />
            </div>
            <div>
              <div className="h-2.5 bg-gray-200 rounded w-8 mb-1.5" />
              <div className="h-3.5 bg-gray-200 rounded w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense - show immediately with realistic skeleton
function TasksPageLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </div>
      
      {/* Filter tabs skeleton */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        ))}
      </div>
      
      {/* Task cards skeleton */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <TaskSkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

// Main page wrapper with Suspense boundary
export default function TasksPage() {
  return (
    <Suspense fallback={<TasksPageLoading />}>
      <TasksPageContent />
    </Suspense>
  )
}

function TasksPageContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Load ratings in background - don't block page rendering
  const { users: userRatings, loading: ratingsLoading } = useUserRatings()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('open') // Default to Open Tasks
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all')
  const [selectedProfession, setSelectedProfession] = useState<string>('all')
  const [professions, setProfessions] = useState<string[]>([])
  const [minBudget, setMinBudget] = useState<string>('')
  const [maxBudget, setMaxBudget] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedSkill, setSelectedSkill] = useState<string>('all')
  const [maxDistance, setMaxDistance] = useState<string>('')
  const [minimumRating, setMinimumRating] = useState<string>('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
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
  const [showSearchField, setShowSearchField] = useState(false)
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  const [reportTargetName, setReportTargetName] = useState<string | null>(null)
  const [reportType, setReportType] = useState<'task' | 'user'>('task')
  const [sessionReady, setSessionReady] = useState(false)
  const [viewMode, setViewMode] = useState<'compact' | 'full' | 'accordion'>('full')
  
  // Simple version counter to track which load is current
  const loadVersionRef = useRef(0)
  const initialLoadDoneRef = useRef(false)
  const initialLoadStartedRef = useRef(false) // Prevent duplicate initial loads
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(false)

  // Refs to escape stale closures — loadTasks may run from a setTimeout
  // that captured an old render's closure where userRatings/userLocation were empty.
  const userRatingsRef = useRef(userRatings)
  const userLocationRef = useRef(userLocation)
  const tasksLoadedVersionRef = useRef(0)

  useEffect(() => { userRatingsRef.current = userRatings }, [userRatings])
  useEffect(() => { userLocationRef.current = userLocation }, [userLocation])

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

  const loadProfessions = async () => {
    try {
      const allProfessions = new Set<string>(STANDARD_PROFESSIONS)
      
      const { data: helpersData, error } = await supabase
        .from('profiles')
        .select('professions')
        .eq('is_helper', true)
        .not('professions', 'is', null)

      if (!error && helpersData) {
        helpersData.forEach((helper: any) => {
          if (helper.professions && Array.isArray(helper.professions)) {
            helper.professions.forEach((profession: string) => {
              if (profession && profession.trim()) {
                allProfessions.add(profession.trim())
              }
            })
          }
        })
      }
      
      setProfessions(Array.from(allProfessions).sort())
    } catch (error) {
      console.error('Error loading professions:', error)
      setProfessions(STANDARD_PROFESSIONS)
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('postcode, country, latitude, longitude')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setUserLocation(null)
        return
      }

      if (profile.latitude && profile.longitude) {
        setUserLocation({ lat: profile.latitude, lng: profile.longitude })
        return
      }

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

  /**
   * Load tasks based on the provided filter
   * Uses version counter to ignore stale results
   * Uses caching for faster repeat visits
   */
  const loadTasks = async (activeFilter: FilterType, skipCache: boolean = false) => {
    const startTime = performance.now()
    
    // Check cache first for instant display (only for simple 'open' filter with no extra filters)
    const hasNoExtraFilters = 
      selectedCategory === 'all' &&
      selectedSubCategory === 'all' &&
      !minBudget &&
      !maxBudget &&
      !searchTerm.trim() &&
      !showArchived &&
      !isAdmin
    
    if (!skipCache && activeFilter === 'open' && hasNoExtraFilters) {
      const cachedTasks = getCachedTasks('open')
      if (cachedTasks && cachedTasks.length > 0) {
        debugLog(`⏱️ Using cached tasks - instant display`)
        setTasks(cachedTasks)
        setLoading(false)
        initialLoadDoneRef.current = true
        // Still fetch fresh data in background
        setTimeout(() => loadTasks(activeFilter, true), 100)
        return
      }
    }
    
    // Increment version to invalidate any in-progress loads
    loadVersionRef.current += 1
    const thisVersion = loadVersionRef.current
    isLoadingRef.current = true
    
    debugLog(`⏱️ [${thisVersion}] loadTasks START - Filter: ${activeFilter} @ ${startTime.toFixed(2)}ms`)
    
    // Show loading state immediately (don't wait for anything)
    // Only show loading if we don't have tasks yet (to avoid flicker)
    if (tasks.length === 0) {
      setLoading(true)
    }
    
    try {
      // Check if this load is still current
      if (loadVersionRef.current !== thisVersion) {
        debugLog(`⏱️ [${thisVersion}] CANCELLED early @ ${(performance.now() - startTime).toFixed(2)}ms`)
        isLoadingRef.current = false
        return
      }
      
      // For 'open' filter, skip user check entirely - not needed for query
      // For other filters, get user as needed
      let user: any = null
      if (activeFilter !== 'open') {
        const userCheckStart = performance.now()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        user = authUser
        debugLog(`⏱️ [${thisVersion}] User check: ${(performance.now() - userCheckStart).toFixed(2)}ms`)
      }
      
      const queryBuildStart = performance.now()
      
      // For 'my_bids' filter, get task IDs related to user's bidding activity
      // This includes (ONLY OPEN TASKS):
      // 1. Tasks where user placed bids (as a bidder)
      // 2. Tasks user created that have bids on them (as a task owner)
      let taskIdsWithBids: string[] = []
      let tasksUserBidOn: Set<string> = new Set() // Track which tasks user bid on
      let myTasksWithBidCounts: Map<string, number> = new Map() // Track bid counts on user's tasks
      
      if (activeFilter === 'my_bids') {
        const myBidsStart = performance.now()
        if (!user) {
          if (loadVersionRef.current === thisVersion) {
            setTasks([])
            setLoading(false)
          }
          return
        }
        
        // Query 1: Get OPEN tasks where user placed active bids (with task status join)
        let placedBidsQuery = supabase
          .from('bids')
          .select('task_id, tasks!inner(id, status, archived)')
          .eq('user_id', user.id)
          .neq('status', 'rejected')
          .eq('tasks.status', 'open')
        
        // Filter archived if showArchived is false
        if (!showArchived) {
          placedBidsQuery = placedBidsQuery.eq('tasks.archived', false)
        }
        
        const { data: myPlacedBids, error: placedBidsError } = await placedBidsQuery
        
        if (placedBidsError) {
          console.error('Error fetching placed bids:', placedBidsError)
        }
        
        const tasksIBidOn = [...new Set((myPlacedBids || []).map(b => b.task_id).filter(Boolean))]
        tasksIBidOn.forEach(id => tasksUserBidOn.add(id))
        
        // Query 2: Get user's OPEN tasks that have bids on them
        let myTasksQuery = supabase
          .from('tasks')
          .select('id')
          .eq('created_by', user.id)
          .eq('status', 'open') // Only open tasks
        
        // Filter archived if showArchived is false
        if (!showArchived) {
          myTasksQuery = myTasksQuery.eq('archived', false)
        }
        
        const { data: myOpenTasks, error: myTasksError } = await myTasksQuery
        
        if (myTasksError) {
          console.error('Error fetching my tasks:', myTasksError)
        }
        
        let tasksWithBidsOnThem: string[] = []
        if (myOpenTasks && myOpenTasks.length > 0) {
          const myTaskIds = myOpenTasks.map(t => t.id)
          
          // Get active bids on my open tasks (from others, excluding rejected)
          const { data: bidsOnMyTasks, error: bidsOnMyTasksError } = await supabase
            .from('bids')
            .select('task_id')
            .in('task_id', myTaskIds)
            .neq('user_id', user.id)
            .neq('status', 'rejected')
          
          if (bidsOnMyTasksError) {
            console.error('Error fetching bids on my tasks:', bidsOnMyTasksError)
          }
          
          // Count bids per task
          (bidsOnMyTasks || []).forEach(bid => {
            const count = myTasksWithBidCounts.get(bid.task_id) || 0
            myTasksWithBidCounts.set(bid.task_id, count + 1)
          })
          
          tasksWithBidsOnThem = [...new Set((bidsOnMyTasks || []).map(b => b.task_id).filter(Boolean))]
        }
        
        // Check if cancelled
        if (loadVersionRef.current !== thisVersion) {
          isLoadingRef.current = false
          return
        }
        
        // Combine both: tasks I bid on + my tasks that have bids
        taskIdsWithBids = [...new Set([...tasksIBidOn, ...tasksWithBidsOnThem])]
        debugLog(`⏱️ [${thisVersion}] my_bids queries: ${(performance.now() - myBidsStart).toFixed(2)}ms, Found ${taskIdsWithBids.length} tasks`)
        
        if (taskIdsWithBids.length === 0) {
          if (loadVersionRef.current === thisVersion) {
            setTasks([])
            setLoading(false)
            isLoadingRef.current = false
          }
          return
        }
      }
      
      // hasNoExtraFilters is defined at the top of the function
      
      const queryBuildTime = performance.now() - queryBuildStart
      const queryStartTime = performance.now()
      debugLog(`⏱️ [${thisVersion}] Query build: ${queryBuildTime.toFixed(2)}ms`)
      
      let tasksData: any[] | null = null
      let error: any = null
      
      // Use fast RPC function for simple 'open' filter (bypasses RLS for speed)
      if (activeFilter === 'open' && hasNoExtraFilters) {
        debugLog(`⏱️ [${thisVersion}] Using fast RPC function for open tasks`)
        const result = await supabase.rpc('get_open_tasks', { task_limit: 50 })
        tasksData = result.data
        error = result.error
        
        // Fallback to regular query if RPC fails (function might not exist yet)
        if (error && error.code === 'PGRST202') {
          debugLog(`⏱️ [${thisVersion}] RPC function not found, falling back to regular query`)
          error = null
          const fallbackResult = await supabase
            .from('tasks')
            .select('*')
            .eq('status', 'open')
            .eq('hidden_by_admin', false)
            .eq('archived', false)
            .order('created_at', { ascending: false })
            .limit(50)
          tasksData = fallbackResult.data
          error = fallbackResult.error
        }
      } else {
        // Build regular query for other filters
        let query = supabase.from('tasks').select('*')
        
        // Apply essential filters first (most selective)
        if (!isAdmin) {
          query = query.eq('hidden_by_admin', false)
        }
        if (!showArchived) {
          query = query.eq('archived', false)
        }
        
        // Apply filter-specific conditions (most selective first)
        switch (activeFilter) {
          case 'open':
            query = query.eq('status', 'open')
            break
          case 'my_tasks':
            if (user) {
              query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
            } else {
              query = query.eq('created_by', '00000000-0000-0000-0000-000000000000')
            }
            break
          case 'new':
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            query = query.eq('status', 'open').gte('created_at', sevenDaysAgo.toISOString())
            break
          case 'my_bids':
            if (taskIdsWithBids.length > 0) {
              query = query.in('id', taskIdsWithBids).eq('status', 'open')
            }
            break
        }
        
        // Apply additional filters (less selective, but still important)
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
          const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0)
          if (words.length > 0) {
            const searchConditions = words.map(word => {
              const escapedWord = word.replace(/[%_\\]/g, '\\$&')
              return `title.ilike.%${escapedWord}%,description.ilike.%${escapedWord}%`
            }).join(',')
            query = query.or(searchConditions)
          }
        }
        
        // Execute query immediately - this is the critical path
        query = query.order('created_at', { ascending: false }).limit(50)
        
        const result = await query
        tasksData = result.data
        error = result.error
      }
      
      const queryEndTime = performance.now()
      const queryTime = queryEndTime - queryStartTime
      debugLog(`⏱️ [${thisVersion}] Main query: ${queryTime.toFixed(2)}ms, Got ${tasksData?.length || 0} tasks`)
      if (queryTime > 2000) {
        debugWarn(`⚠️ Slow query detected (${(queryTime/1000).toFixed(1)}s). Run database indexes: supabase/optimize_tasks_query_performance.sql`)
      }
      
      // Check if cancelled
      if (loadVersionRef.current !== thisVersion) {
        debugLog(`⏱️ [${thisVersion}] CANCELLED after query @ ${(performance.now() - startTime).toFixed(2)}ms`)
        isLoadingRef.current = false
        return
      }
      
      if (error) {
        console.error(`⏱️ [${thisVersion}] Query error @ ${(performance.now() - startTime).toFixed(2)}ms:`, error)
        setLoading(false)
        isLoadingRef.current = false
        return
      }
      
      if (!tasksData || tasksData.length === 0) {
        if (loadVersionRef.current === thisVersion) {
          setTasks([])
          setLoading(false)
          isLoadingRef.current = false
        }
        return
      }
      
      // Fetch related data in parallel
      const relatedDataStart = performance.now()
      const creatorIds = Array.from(new Set(tasksData.map(t => t.created_by)))
      const categoryIds = Array.from(new Set(tasksData.flatMap(t => [t.category_id, t.sub_category_id]).filter(Boolean)))
      const taskIds = tasksData.map(t => t.id)
      
      const [profilesResult, categoriesResult, tagsResult, bidsResult] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, avatar_url').in('id', creatorIds),
        categoryIds.length > 0 
          ? supabase.from('categories').select('*').in('id', categoryIds)
          : Promise.resolve({ data: [] }),
        supabase.from('task_tags').select('task_id, tag_id, tags(*)').in('task_id', taskIds),
        supabase.from('bids').select('task_id, id, status').in('task_id', taskIds)
      ])
      
      const relatedDataEnd = performance.now()
      debugLog(`⏱️ [${thisVersion}] Related data queries: ${(relatedDataEnd - relatedDataStart).toFixed(2)}ms`)
      
      // Check if cancelled
      if (loadVersionRef.current !== thisVersion) {
        debugLog(`⏱️ [${thisVersion}] CANCELLED after related data @ ${(performance.now() - startTime).toFixed(2)}ms`)
        isLoadingRef.current = false
        return
      }
      
      const profilesData = profilesResult.data || []
      const categoriesData = categoriesResult.data || []
      const taskTagsData = tagsResult.data || []
      const bidsData = bidsResult.data || []
      
      // Process data — only count active bids (not rejected)
      const bidsByTaskId: Record<string, number> = {}
      bidsData.forEach((bid: any) => {
        if (bid.status === 'rejected') return
        bidsByTaskId[bid.task_id] = (bidsByTaskId[bid.task_id] || 0) + 1
      })
      
      const tagsByTaskId: Record<string, any[]> = {}
      taskTagsData.forEach((tt: any) => {
        if (!tagsByTaskId[tt.task_id]) tagsByTaskId[tt.task_id] = []
        if (tt.tags) tagsByTaskId[tt.task_id].push(tt.tags)
      })
      
      // Read from refs so background/setTimeout calls always get the latest data
      const processStart = performance.now()
      const currentRatings = userRatingsRef.current
      const currentLocation = userLocationRef.current
      const ratingsMap = new Map(
        currentRatings.map((r: any) => [String(r.reviewee_id), r])
      )
      
      let tasksWithProfiles = tasksData.map(task => {
        const creator = profilesData.find(p => p.id === task.created_by)
        const userRating = getUserRatingsById(task.created_by, ratingsMap)
        const categoryObj = task.category_id ? categoriesData.find(c => c.id === task.category_id) : null
        const subCategoryObj = task.sub_category_id ? categoriesData.find(c => c.id === task.sub_category_id) : null
        const tags = tagsByTaskId[task.id] || []
        
        let distance: number | undefined = undefined
        if (currentLocation && task.latitude && task.longitude) {
          try {
            distance = calculateDistance(currentLocation.lat, currentLocation.lng, task.latitude, task.longitude)
          } catch (err) {
            // Distance calculation failed, continue without it
            debugWarn('Distance calculation failed:', err)
          }
        }
        
        let matchesSkills = false
        if (filterBySkills && userSkills.length > 0 && task.required_skills && Array.isArray(task.required_skills)) {
          matchesSkills = task.required_skills.some((skill: string) => userSkills.includes(skill))
        }
        
        return {
          ...task,
          user: creator ? { ...creator, userRatings: userRating || null } : undefined,
          category_obj: categoryObj || undefined,
          sub_category_obj: subCategoryObj || undefined,
          tags: tags,
          bidCount: bidsByTaskId[task.id] || 0,
          distance: distance,
          matchesSkills: matchesSkills,
          // Bid relationship flags (for Bids filter display)
          userPlacedBid: tasksUserBidOn.has(task.id),
          bidsReceivedCount: myTasksWithBidCounts.get(task.id) || 0
        }
      })
      
      // Apply client-side filters
      if (filterBySkills && userSkills.length > 0) {
        tasksWithProfiles = tasksWithProfiles.filter(task => 
          !task.required_skills || task.required_skills.length === 0 || (task as any).matchesSkills
        )
      }
      
      if (maxDistance && userLocation) {
        const maxDist = Number(maxDistance)
        tasksWithProfiles = tasksWithProfiles.filter(task => {
          if (task.distance === undefined || task.distance === null) return false
          return task.distance <= maxDist
        })
      }
      
      if (minimumRating) {
        const minRating = Number(minimumRating)
        tasksWithProfiles = tasksWithProfiles.filter(task => {
          const userRating = (task as any).user?.rating
          if (!userRating) return false
          return userRating >= minRating
        })
      }
      
      if (selectedTagIds.length > 0) {
        tasksWithProfiles = tasksWithProfiles.filter(task => {
          const taskTagIds = (task as any).tags?.map((tag: any) => tag.id) || []
          return selectedTagIds.some(tagId => taskTagIds.includes(tagId))
        })
      }
      
      if (selectedProfession && selectedProfession !== 'all') {
        tasksWithProfiles = tasksWithProfiles.filter(task => {
          if (task.required_professions && Array.isArray(task.required_professions) && task.required_professions.length > 0) {
            const lowerSelected = selectedProfession.toLowerCase()
            return task.required_professions.some((prof: string) => {
              const lowerProf = prof.toLowerCase()
              return lowerProf === lowerSelected || lowerProf.includes(lowerSelected) || lowerSelected.includes(lowerProf)
            })
          }
          return false
        })
      }
      
      // Skill filter
      if (selectedSkill && selectedSkill !== 'all' && selectedSkill.startsWith('skill-')) {
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
        const matchingSkill = skillMap[selectedSkill]
        if (matchingSkill) {
          tasksWithProfiles = tasksWithProfiles.filter(task => {
            if (task.required_skills && Array.isArray(task.required_skills) && task.required_skills.length > 0) {
              return task.required_skills.some((skill: string) => 
                skill.toLowerCase().includes(matchingSkill.toLowerCase()) ||
                matchingSkill.toLowerCase().includes(skill.toLowerCase())
              )
            }
            const categoryName = (task as any).category_obj?.name || ''
            const subCategoryName = (task as any).sub_category_obj?.name || ''
            return categoryName.toLowerCase().includes(matchingSkill.toLowerCase()) ||
                   subCategoryName.toLowerCase().includes(matchingSkill.toLowerCase())
          })
        }
      }
      
      // Service/category filter
      if (selectedCategory !== 'all' && selectedCategory.startsWith('service-')) {
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
            if (task.required_skills && Array.isArray(task.required_skills) && task.required_skills.length > 0) {
              return task.required_skills.some((skill: string) => 
                skill.toLowerCase().includes(matchingService.toLowerCase()) ||
                matchingService.toLowerCase().includes(skill.toLowerCase())
              )
            }
            const categoryName = (task as any).category_obj?.name || ''
            const subCategoryName = (task as any).sub_category_obj?.name || ''
            return categoryName.toLowerCase().includes(matchingService.toLowerCase()) ||
                   subCategoryName.toLowerCase().includes(matchingService.toLowerCase())
          })
        }
      } else if (selectedCategory !== 'all' && selectedCategory.startsWith('prof-')) {
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
      
      // Apply filter-specific client-side filtering
      if (activeFilter === 'all' && user) {
        tasksWithProfiles = tasksWithProfiles.filter(task => {
          const isOpen = task.status === 'open'
          const isCompleted = task.status === 'completed'
          const isPendingOrActive = task.status === 'pending_payment' || task.status === 'in_progress'
          const isPostedByMe = task.created_by === user.id
          const isHelpedByMe = task.assigned_to === user.id
          return isOpen || (isPendingOrActive && (isPostedByMe || isHelpedByMe)) || (isCompleted && (isPostedByMe || isHelpedByMe))
        })
      } else if (activeFilter === 'all' && !user) {
        tasksWithProfiles = tasksWithProfiles.filter(task => task.status === 'open')
      } else if (activeFilter === 'open') {
        tasksWithProfiles = tasksWithProfiles.filter(task => task.status === 'open')
      } else if (activeFilter === 'my_tasks' && user) {
        tasksWithProfiles = tasksWithProfiles.filter(task => 
          task.created_by === user.id || task.assigned_to === user.id
        )
      } else if (activeFilter === 'new') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        tasksWithProfiles = tasksWithProfiles.filter(task => {
          const isOpen = task.status === 'open'
          const createdAt = new Date(task.created_at)
          return isOpen && createdAt >= sevenDaysAgo
        })
      } else if (activeFilter === 'my_bids') {
        // Only show open tasks in Bids filter (safety check)
        // Also respect the showArchived setting
        tasksWithProfiles = tasksWithProfiles.filter(task => {
          const isOpen = task.status === 'open'
          const isArchived = task.archived === true
          if (!showArchived && isArchived) return false
          return isOpen
        })
      }
      
      // Sort
      tasksWithProfiles.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      // Final check before updating state
      const processEnd = performance.now()
      debugLog(`⏱️ [${thisVersion}] Processing tasks: ${(processEnd - processStart).toFixed(2)}ms`)
      
      if (loadVersionRef.current === thisVersion) {
        setTasks(tasksWithProfiles)
        tasksLoadedVersionRef.current += 1
        setLoading(false)
        initialLoadDoneRef.current = true
        isLoadingRef.current = false
        const totalTime = performance.now() - startTime
        debugLog(`⏱️ [${thisVersion}] ✅ COMPLETE - ${tasksWithProfiles.length} tasks, Total: ${totalTime.toFixed(2)}ms`)
        
        // Cache the results for faster subsequent loads (only for 'open' filter with no extra filters)
        if (activeFilter === 'open' && hasNoExtraFilters) {
          setCachedTasks(tasksWithProfiles, 'open')
        }
      } else {
        debugLog(`⏱️ [${thisVersion}] DISCARDED (newer load exists) @ ${(performance.now() - startTime).toFixed(2)}ms`)
        isLoadingRef.current = false
      }
      
    } catch (error) {
      console.error('Error loading tasks:', error)
      if (loadVersionRef.current === thisVersion) {
        setLoading(false)
        isLoadingRef.current = false
      }
    }
  }

  // Get active filter from URL or state (defaults to 'open')
  const getActiveFilter = (): FilterType => {
    const urlFilter = searchParams.get('filter') as FilterType | null
    if (urlFilter && ['all', 'open', 'my_tasks', 'new', 'my_bids'].includes(urlFilter)) {
      return urlFilter
    }
    return 'open' // Default to Open Tasks
  }

  // Initialize page - CRITICAL: Run immediately, don't wait for anything
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Prevent duplicate initial loads (check BEFORE starting)
    if (initialLoadStartedRef.current) return
    initialLoadStartedRef.current = true

    // Start loading tasks IMMEDIATELY - before anything else
    const activeFilter = getActiveFilter()
    setFilter(activeFilter)
    setSessionReady(true)
    loadTasks(activeFilter) // Load tasks FIRST, don't wait

    const storedLastView = localStorage.getItem('tasks_last_view_time')
    setLastViewTime(storedLastView)

    const initPage = async () => {
      // Load other data in parallel (non-blocking) - tasks already loading
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        setCurrentUserId(authUser.id)
        
        // Check profile completeness and admin status in one query
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, country, phone_country_code, phone_number, skills, role')
          .eq('id', authUser.id)
          .single()

        // Check admin status once and cache it
        const userIsAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
        setIsAdmin(userIsAdmin)

        if (!isProfileComplete(profile)) {
          router.push('/profile?setup=required')
          return
        }
        
        if (profile?.skills && Array.isArray(profile.skills)) {
          setUserSkills(profile.skills)
        }
        
        // Load user location in background (non-blocking)
        loadUserLocation().catch(err => console.error('Error loading location:', err))
      } else {
        setCurrentUserId(null)
        setUserLocation(null)
        setIsAdmin(false)
      }

      // Load categories, tags, professions in parallel (non-blocking)
      Promise.all([
        loadCategories(),
        loadTags(),
        loadProfessions()
      ]).catch(err => console.error('Error loading filter data:', err))
    }

    initPage()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id)
        await loadUserLocation()
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tasks_last_view_time')
        }
        setLastViewTime(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sync filter from URL when URL changes (but not on initial mount - that's handled by initPage)
  useEffect(() => {
    if (!sessionReady || !initialLoadDoneRef.current) return // Don't run on initial mount
    
    const urlFilter = searchParams.get('filter') as FilterType | null
    // Only react to explicit URL filter changes - don't default here (getActiveFilter handles defaults)
    if (urlFilter && ['all', 'open', 'my_tasks', 'new', 'my_bids'].includes(urlFilter)) {
      if (filter !== urlFilter) {
        // Clear any pending reload
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
        }
        
        if (process.env.NODE_ENV === 'development') {
          debugLog(`🔄 URL filter changed to: ${urlFilter}`)
        }
        setFilter(urlFilter)
        // Load immediately for filter changes (no debounce needed)
        loadTasks(urlFilter)
      }
    }
    // Removed: else clause that was defaulting to 'open' - this was causing duplicate loads
    // The initial load already handles defaults via getActiveFilter()
  }, [searchParams, sessionReady, filter])

  // Patch ratings and distance onto existing tasks when data becomes available.
  // Uses functional updater (prev =>) so it always operates on the latest task state,
  // avoiding stale-closure overwrites that caused intermittent disappearing data.
  useEffect(() => {
    if (tasks.length === 0) return
    const currentRatings = userRatingsRef.current
    const currentLocation = userLocationRef.current

    const ratingsMap = !ratingsLoading && currentRatings.length > 0
      ? new Map(currentRatings.map((r: any) => [String(r.reviewee_id), r]))
      : null

    setTasks(prev => {
      if (prev.length === 0) return prev
      let changed = false
      const updated = prev.map(task => {
        let newUser = task.user
        let newDistance = task.distance

        if (ratingsMap && task.user && task.created_by) {
          const rating = getUserRatingsById(task.created_by, ratingsMap)
          if (rating !== (task.user as any)?.userRatings) {
            newUser = { ...task.user, userRatings: rating || null }
            changed = true
          }
        }

        if (currentLocation && task.latitude && task.longitude && (newDistance === undefined || newDistance === null)) {
          try {
            newDistance = calculateDistance(currentLocation.lat, currentLocation.lng, task.latitude, task.longitude)
            changed = true
          } catch {}
        }

        if (newUser !== task.user || newDistance !== task.distance) {
          return { ...task, user: newUser, distance: newDistance }
        }
        return task
      })
      return changed ? updated : prev
    })
  }, [userRatings, ratingsLoading, userLocation])

  // Reload when other filters change (but not on initial load)
  // Use debouncing to prevent rapid reloads when user is typing/selecting
  useEffect(() => {
    if (!sessionReady || !initialLoadDoneRef.current) return
    
    // Clear any pending reload
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
    }
    
    // Debounce the reload - wait 500ms after last filter change
    loadTimeoutRef.current = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        debugLog(`🔄 Filter parameters changed, reloading with filter: ${filter}`)
      }
      loadTasks(filter)
    }, 500) // 500ms debounce for filter changes

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [
    selectedCategory,
    selectedSubCategory,
    selectedProfession,
    selectedSkill,
    selectedTagIds,
    minBudget,
    maxBudget,
    searchTerm,
    showArchived,
    filterBySkills,
    maxDistance,
    minimumRating,
    filter,
    sessionReady
  ])

  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      loadSubCategories(selectedCategory)
    } else {
      setSubCategories([])
      setSelectedSubCategory('all')
    }
  }, [selectedCategory])

  // Auto-show filters if any filter is active
  useEffect(() => {
    if (searchTerm || selectedCategory !== 'all' || selectedSubCategory !== 'all' || selectedProfession !== 'all' || selectedSkill !== 'all' || minBudget || maxBudget || maxDistance || minimumRating || selectedTagIds.length > 0) {
      setShowAllFilters(true)
    }
  }, [searchTerm, selectedCategory, selectedSubCategory, selectedProfession, selectedSkill, minBudget, maxBudget, maxDistance, minimumRating, selectedTagIds])

  // (Ratings and distance are patched directly onto tasks by the useEffect above)

  // Load pending reviews in background (non-blocking)
  useEffect(() => {
    if (!currentUserId) {
      setPendingReviews([])
      return
    }

    // Load reviews after a delay to not block initial page load
    const timeoutId = setTimeout(() => {
      const loadPendingReviewsData = async () => {
        try {
          const reviews = await getPendingReviews(currentUserId)
          setPendingReviews(reviews)
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            setShowPendingReviews(params.get('pending_reviews') === 'true')
          }
        } catch (error) {
          console.error('Error loading pending reviews:', error)
          // Don't block page - just log error
        }
      }
      loadPendingReviewsData()
    }, 2000) // Load after 2 seconds, after main page content loads

    return () => clearTimeout(timeoutId)
  }, [currentUserId])

  // Track task views for NEW banner
  useEffect(() => {
    if (!currentUserId || !tasks.length || typeof window === 'undefined') return
    
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
    
    const taskCards = document.querySelectorAll('[data-task-id]')
    taskCards.forEach(card => observer.observe(card))
    
    return () => {
      taskCards.forEach(card => observer.unobserve(card))
      observer.disconnect()
    }
  }, [tasks, currentUserId])

  // Update last view time
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!loading && tasks.length > 0 && lastViewTime !== null) {
      const timer = setTimeout(() => {
        const now = new Date().toISOString()
        localStorage.setItem('tasks_last_view_time', now)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (!loading && lastViewTime === null) {
      const now = new Date().toISOString()
      localStorage.setItem('tasks_last_view_time', now)
    }
  }, [loading, tasks, lastViewTime])

  // Handle filter button click
  const handleFilterClick = (newFilter: FilterType) => {
    debugLog(`🖱️ Filter button clicked: ${newFilter}`)
    setFilter(newFilter)
    router.push(`/tasks?filter=${newFilter}`)
    loadTasks(newFilter)
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        
        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          ))}
        </div>
        
        {/* Task cards skeleton */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TaskSkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TrafficTracker pageName="tasks" />
      
      {/* Pending Reviews Banner */}
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
                  {t('tasks.pendingReviewsMessage')}
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
                              className="h-8 w-8 rounded-full object-cover object-center"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-gray-500" />
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('tasks.title')}</h1>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <Link
            href="/tasks/map"
            className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
          >
            {t('tasks.mapView')}
          </Link>
          <Link
            href="/tasks/new"
            className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            {t('tasks.postNewTask')}
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 sm:gap-4 items-center">
        <button
          onClick={() => handleFilterClick('all')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('tasks.allTasks')}
        </button>
        <button
          onClick={() => handleFilterClick('open')}
          title={t('tasks.stillTakingBids')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
            filter === 'open'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('tasks.openTasks')}
        </button>
        {currentUserId && (
          <button
            onClick={() => handleFilterClick('my_tasks')}
            title={t('tasks.yourTasks')}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
              filter === 'my_tasks'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('tasks.myTasks')}
          </button>
        )}
        <button
          onClick={() => {
            if (!currentUserId) {
              setShowLoginModal(true)
            } else {
              handleFilterClick('new')
            }
          }}
          title={t('tasks.lastTwoWeeks')}
          className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
            filter === 'new'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('tasks.newTasks')}
        </button>
        {currentUserId && (
          <button
            onClick={() => handleFilterClick('my_bids')}
            title={t('tasks.allBids')}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
              filter === 'my_bids'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('tasks.bids')}
          </button>
        )}
        {currentUserId && (
          <label className="ml-4 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">{t('tasks.showArchivedTasks')}</span>
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
            <span className="text-sm text-gray-700">{t('tasks.filterByMySkills')}</span>
          </label>
        )}
      </div>

      {/* Mobile Search Toggle */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowSearchMobile(!showSearchMobile)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
        >
          <span className="text-sm font-medium text-gray-700">{t('tasks.searchTasks')}</span>
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

      {/* Search Form */}
      <div className={`bg-white rounded-lg shadow mb-6 ${showSearchMobile ? 'block' : 'hidden'} md:block`}>
        {!showAllFilters ? (
          <button
            type="button"
            onClick={() => setShowAllFilters(true)}
            className="w-full p-4 flex items-center justify-between bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium">{t('tasks.showFilters')}</span>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">{t('tasks.searchAndFilters')}</h3>
              <button
                type="button"
                onClick={() => setShowAllFilters(false)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <span>{t('tasks.hide')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                loadTasks(filter)
                if (window.innerWidth < 768) {
                  setShowSearchMobile(false)
                }
              }}
              className="space-y-3"
            >
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {showSearchField ? (
                  <input
                    type="text"
                    placeholder={t('tasks.searchKeywordPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => {
                      if (!searchTerm) {
                        setShowSearchField(false)
                      }
                    }}
                    autoFocus
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSearchField(true)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {t('tasks.searchKeyword')}
                  </button>
                )}

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">{t('tasks.allServices')}</option>
                  <optgroup label={t('tasks.services')}>
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
                </select>

                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">{t('tasks.allSkills')}</option>
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
                </select>

                <select
                  value={selectedProfession}
                  onChange={(e) => setSelectedProfession(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">{t('tasks.allProfessions')}</option>
                  {professions.map((profession) => (
                    <option key={profession} value={profession}>
                      {profession}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder={t('tasks.minBudget')}
                  value={minBudget}
                  min="0"
                  onChange={(e) => setMinBudget(e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />

                <input
                  type="number"
                  placeholder={t('tasks.maxBudget')}
                  value={maxBudget}
                  min="0"
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                  <span>{t('tasks.moreFilters')}</span>
                  <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-3 pt-3 border-t border-gray-200 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <label htmlFor="distance" className="block text-xs font-medium text-gray-700 mb-1">
                      {t('tasks.maximumDistance')}
                    </label>
                    <select
                      id="distance"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      <option value="">{t('tasks.anyDistance')}</option>
                      <option value="5">{t('tasks.within5km')}</option>
                      <option value="10">{t('tasks.within10km')}</option>
                      <option value="25">{t('tasks.within25km')}</option>
                      <option value="50">{t('tasks.within50km')}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="rating" className="block text-xs font-medium text-gray-700 mb-1">
                      {t('tasks.minimumRating')}
                    </label>
                    <select
                      id="rating"
                      value={minimumRating}
                      onChange={(e) => setMinimumRating(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      <option value="">{t('tasks.anyRating')}</option>
                      <option value="4">{t('tasks.stars4Plus')}</option>
                      <option value="4.5">{t('tasks.stars45Plus')}</option>
                      <option value="5">{t('tasks.stars5Only')}</option>
                    </select>
                  </div>
                </div>
              </details>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                    setSelectedSubCategory('all')
                    setSelectedProfession('all')
                    setSelectedSkill('all')
                    setMinBudget('')
                    setMaxBudget('')
                    setMaxDistance('')
                    setMinimumRating('')
                    setSelectedTagIds([])
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
        )}
      </div>

      {/* Loading indicator */}
      {loading && tasks.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Loading...
        </div>
      )}

      {/* View toggle and results count */}
      {!loading && tasks.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {tasks.length} {tasks.length !== 1 ? t('tasks.tasksFound') : t('tasks.taskFound')}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:inline">{t('tasks.view')}:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title={t('tasks.compactView')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('full')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'full' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title={t('tasks.fullView')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('accordion')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'accordion' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title="Accordion view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l3 3m0 0l3-3m-3 3V12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-4 sm:gap-6 ${viewMode === 'compact' ? 'md:grid-cols-2 lg:grid-cols-3' : viewMode === 'accordion' ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-2'}`}>
        {tasks.length === 0 && !loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            {t('tasks.noTasksFound')}
          </div>
        ) : (
          tasks.map((task) => {
            const isNew = (() => {
              try {
                if (!currentUserId) return false
                const taskAge = new Date().getTime() - new Date(task.created_at).getTime()
                const twoWeeks = 14 * 24 * 60 * 60 * 1000
                if (taskAge >= twoWeeks) return false
                const viewKey = `task_viewed_${task.id}`
                const viewCount = parseInt(localStorage.getItem(viewKey) || '0', 10)
                return viewCount < 3
              } catch (e) {
                return false
              }
            })()

            const sampleTasks = [
              'My Computer keeps crashing',
              'Paint the fence',
              'Move my piano upstairs',
              'Move my piaon upstairs'
            ]
            const isSample = sampleTasks.some(sampleTitle => 
              task.title.toLowerCase().trim() === sampleTitle.toLowerCase().trim()
            )
            const showSampleSash = task.status === 'open' && isSample

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
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col relative ${
                  isAdmin && task.hidden_by_admin ? 'border-2 border-red-300 bg-red-50' : ''
                }`}
              >
                {/* COMPACT VIEW */}
                {viewMode === 'compact' ? (
                  <div className="p-4">
                    {/* Title - first line */}
                    <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">{task.title}</h3>
                    
                    {/* Short description */}
                    {task.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                        {task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description}
                      </p>
                    )}
                    
                    {/* Price and badges row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-2xl font-bold text-primary-600">{task.budget ? `€${task.budget}` : t('tasks.quote')}</p>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {showSampleSash && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-gradient-to-r from-yellow-400 to-orange-500 text-white uppercase">
                            {t('tasks.sample')}
                          </span>
                        )}
                        {isNew && !isSample && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-gradient-to-r from-red-500 to-orange-500 text-white uppercase">
                            {t('tasks.new')}
                          </span>
                        )}
                        {isAdmin && task.hidden_by_admin && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white">
                            🔒 {t('tasks.hidden')}
                          </span>
                        )}
                        {currentUserId && task.created_by === currentUserId && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700">
                            {t('tasks.myTaskBadge')}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            task.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : task.status === 'pending_payment'
                              ? 'bg-amber-100 text-amber-800'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : task.status === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {task.status === 'open' ? t('tasks.statusOpen') : task.status === 'pending_payment' ? t('tasks.statusPendingPayment') : task.status === 'in_progress' ? t('tasks.statusInProgress') : task.status === 'completed' ? t('tasks.statusCompleted') : task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Location + distance row */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {task.location && (
                        <span className="text-xs text-gray-500 truncate">
                          📍 {task.location.split(',')[0]}
                        </span>
                      )}
                      {task.distance != null ? (
                        <span className="text-xs text-gray-400 flex-shrink-0">{task.distance} km</span>
                      ) : !currentUserId ? (
                        <span className="text-xs text-gray-400 italic flex-shrink-0">{t('tasks.loginToSeeDistance')}</span>
                      ) : null}
                    </div>
                    {(task as any).assigned_helper && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span className="text-gray-400">For:</span>
                        {(task as any).assigned_helper.avatar_url && (
                          <img src={(task as any).assigned_helper.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                        )}
                        <span className="truncate font-medium text-gray-600">{(task as any).assigned_helper.full_name || (task as any).assigned_helper.email}</span>
                      </div>
                    )}
                  </div>
                ) : viewMode === 'accordion' ? (
                  /* ACCORDION VIEW */
                  <div className="p-4 sm:p-5">
                    {showSampleSash && (
                      <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[0.7875rem] font-bold px-[5.4] py-[1.8] rounded-br-lg shadow-lg z-10 transform -rotate-12 origin-top-left uppercase tracking-wider">
                        {t('tasks.sample')}
                      </div>
                    )}
                    {isNew && !isSample && (
                      <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                        {t('tasks.new')}
                      </div>
                    )}
                    {/* Top row: larger thumbnail + title/price/badges */}
                    <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[128px_1fr] gap-3 sm:gap-4">
                      <div
                        className="row-span-2 self-start w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                      >
                        <img src={task.image_url || (task.required_professions && task.required_professions.length > 0 ? '/default_task_image_pro.png' : '/default_task_image.png')} alt={task.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 break-words line-clamp-2">{task.title}</h3>
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <p className="text-xl sm:text-2xl font-bold text-primary-600">{task.budget ? `€${task.budget}` : t('tasks.quote')}</p>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {isAdmin && task.hidden_by_admin && <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-600 text-white whitespace-nowrap">🔒 {t('tasks.hidden')}</span>}
                            {currentUserId && task.created_by === currentUserId && filter !== 'my_bids' && <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 whitespace-nowrap">{t('tasks.myTaskBadge')}</span>}
                            <span className={`px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${task.status === 'open' ? 'bg-green-100 text-green-800' : task.status === 'pending_payment' ? 'bg-amber-100 text-amber-800' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : task.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>
                              {task.status === 'open' ? t('tasks.statusOpen') : task.status === 'pending_payment' ? t('tasks.statusPendingPayment') : task.status === 'in_progress' ? t('tasks.statusInProgress') : task.status === 'completed' ? t('tasks.statusCompleted') : task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Description — second column */}
                      <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 break-words">{task.description || ' '}</p>
                    </div>
                    {/* Collapsible details */}
                    <details className="mt-3 group" onClick={(e) => e.stopPropagation()}>
                      <summary className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 cursor-pointer list-none select-none w-fit">
                        <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        <span className="group-open:hidden">More details</span>
                        <span className="hidden group-open:inline">Less</span>
                      </summary>
                      {task.user && (
                        <>
                          <div className="flex items-center gap-2 flex-wrap mt-3 pt-2 border-t border-gray-100">
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedUserId(task.user?.id || null); setIsProfileModalOpen(true) }}
                              className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1.5 min-w-0"
                            >
                              {task.user.avatar_url ? (
                                <img src={task.user.avatar_url} alt={task.user.full_name || task.user.email} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><UserIcon className="w-3 h-3 text-gray-500" /></div>
                              )}
                              <span className="font-medium truncate">by {task.user.full_name || task.user.email}</span>
                            </button>
                            <CompactUserRatingsDisplay ratings={task.user?.userRatings || null} size="sm" className="ml-1" loading={ratingsLoading} />
                          </div>
                          {(task as any).assigned_helper && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              <span className="text-gray-400">Assigned to:</span>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedUserId((task as any).assigned_helper.id); setIsProfileModalOpen(true) }}
                                className="text-primary-600 hover:underline font-medium flex items-center gap-1"
                              >
                                {(task as any).assigned_helper.avatar_url && (
                                  <img src={(task as any).assigned_helper.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                )}
                                {(task as any).assigned_helper.full_name || (task as any).assigned_helper.email}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      <div className="mt-auto pt-3 border-t border-gray-200">
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 text-sm">
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Location</dt>
                            <dd className="text-gray-800 font-medium line-clamp-2 break-words">{task.location ? (() => { const p = task.location.split(',').map((x: string) => x.trim()); return p[0] ? `${p[0]}${p[1] ? `, ${p[1]}` : ''}` : '—' })() : '—'}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Category</dt>
                            <dd className="text-gray-800 font-medium line-clamp-2 break-words">{task.sub_category_obj?.name || task.category_obj?.name || task.category || '—'}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Bids</dt>
                            <dd className="text-gray-800 font-medium">{(typeof (task as any).bidCount === 'number' ? (task as any).bidCount : 0)} {(task as any).bidCount === 1 ? t('tasks.bid') : t('tasks.bidPlural')}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Distance</dt>
                            <dd className="text-gray-800 font-medium">{task.distance != null ? `${task.distance} km` : !currentUserId ? <span className="text-xs text-gray-400 italic">{t('tasks.loginToSeeDistance')}</span> : '—'}</dd>
                          </div>
                          <div className="min-w-0 sm:col-span-2">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">{t('tasks.due')}</dt>
                            <dd className="text-gray-800 font-medium">{task.due_date ? (() => { try { return format(new Date(task.due_date), 'MMM d, yyyy') } catch { return t('tasks.invalidDate') } })() : '—'}</dd>
                          </div>
                        </dl>
                        {currentUserId && task.created_by !== currentUserId && (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReportTargetId(task.id); setReportTargetName(task.title); setReportType('task'); setReportModalOpen(true) }} className="mt-2 flex items-center gap-1.5 text-red-600 hover:text-red-700 font-medium text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Report
                          </button>
                        )}
                      </div>
                    </details>
                  </div>
                ) : (
                  /* FULL VIEW - compact thumbnail layout */
                  <>
                    {showSampleSash && (
                      <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[0.7875rem] font-bold px-[5.4] py-[1.8] rounded-br-lg shadow-lg z-10 transform -rotate-12 origin-top-left uppercase tracking-wider">
                        {t('tasks.sample')}
                      </div>
                    )}
                    {isNew && !isSample && (
                      <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                        {t('tasks.new')}
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0">
                      {/* Thumbnail left, title/price/badges right */}
                      <div className="grid grid-cols-[48px_1fr] sm:grid-cols-[96px_1fr] gap-3 sm:gap-4">
                        {/* Square thumbnail — fixed size, pinned to top */}
                        <div
                          className="row-span-2 self-start w-12 h-12 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                        >
                          <img src={task.image_url || (task.required_professions && task.required_professions.length > 0 ? '/default_task_image_pro.png' : '/default_task_image.png')} alt={task.title} className="w-full h-full object-cover" />
                        </div>
                        {/* Title, price, badges */}
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 break-words line-clamp-2">{task.title}</h3>
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <p className="text-xl sm:text-2xl font-bold text-primary-600">{task.budget ? `€${task.budget}` : t('tasks.quote')}</p>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {isAdmin && task.hidden_by_admin && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-600 text-white whitespace-nowrap">🔒 {t('tasks.hidden')}</span>
                              )}
                              {filter === 'my_bids' && (task as any).userPlacedBid && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 whitespace-nowrap">✋ {t('tasks.youBid')}</span>
                              )}
                              {filter === 'my_bids' && (task as any).bidsReceivedCount > 0 && task.created_by === currentUserId && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 whitespace-nowrap">📥 {(task as any).bidsReceivedCount} {(task as any).bidsReceivedCount !== 1 ? t('tasks.bidsReceived') : t('tasks.bidReceived')}</span>
                              )}
                              {currentUserId && task.created_by === currentUserId && filter !== 'my_bids' && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 whitespace-nowrap">{t('tasks.myTaskBadge')}</span>
                              )}
                              <span className={`px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${task.status === 'open' ? 'bg-green-100 text-green-800' : task.status === 'pending_payment' ? 'bg-amber-100 text-amber-800' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : task.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>
                                {task.status === 'open' ? t('tasks.statusOpen') : task.status === 'pending_payment' ? t('tasks.statusPendingPayment') : task.status === 'in_progress' ? t('tasks.statusInProgress') : task.status === 'completed' ? t('tasks.statusCompleted') : task.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Description — second column, below title */}
                        <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 break-words">{task.description || ' '}</p>
                      </div>

                      {/* Poster row */}
                      {task.user && (
                        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedUserId(task.user?.id || null)
                                setIsProfileModalOpen(true)
                              }}
                              className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1.5 sm:gap-2 min-w-0"
                            >
                              {task.user.avatar_url ? (
                                <img src={task.user.avatar_url} alt={task.user.full_name || task.user.email} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                </div>
                              )}
                              <span className="font-medium truncate">by {task.user.full_name || task.user.email}</span>
                            </button>
                            <CompactUserRatingsDisplay ratings={task.user?.userRatings || null} size="sm" className="ml-1" loading={ratingsLoading} />
                          </div>
                          {(task as any).assigned_helper && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              <span className="text-gray-400">Assigned to:</span>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedUserId((task as any).assigned_helper.id); setIsProfileModalOpen(true) }}
                                className="text-primary-600 hover:underline font-medium flex items-center gap-1"
                              >
                                {(task as any).assigned_helper.avatar_url && (
                                  <img src={(task as any).assigned_helper.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                )}
                                {(task as any).assigned_helper.full_name || (task as any).assigned_helper.email}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom metadata */}
                      <div className="mt-auto pt-3 border-t border-gray-200">
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 text-sm">
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Location</dt>
                            <dd className="text-gray-800 font-medium line-clamp-2 break-words">
                              {task.location ? (() => {
                                const parts = task.location.split(',').map((p: string) => p.trim())
                                let city = ''; let county = ''
                                const hasPT = parts.some((p: string) => /^\d{4}-\d{3}$/.test(p))
                                if (hasPT && parts.length >= 3) {
                                  const first = parts[0].toLowerCase()
                                  if (/\d|street|avenue|road|rua|avenida/i.test(first) && parts.length >= 4) { city = parts[2] || parts[0]; county = parts[3] || '' }
                                  else { city = parts[0]; if (parts.length >= 4 && !/^\d{4}-\d{3}$/.test(parts[1])) county = parts[1] }
                                } else { city = parts[0] || ''; county = parts[1] || '' }
                                return city ? `${city}${county ? `, ${county}` : ''}` : '—'
                              })() : '—'}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Category</dt>
                            <dd className="text-gray-800 font-medium line-clamp-2 break-words">{task.sub_category_obj?.name || task.category_obj?.name || task.category || '—'}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Bids</dt>
                            <dd className="text-gray-800 font-medium">{(typeof (task as any).bidCount === 'number' ? (task as any).bidCount : 0)} {(task as any).bidCount === 1 ? t('tasks.bid') : t('tasks.bidPlural')}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Distance</dt>
                            <dd className="text-gray-800 font-medium">{task.distance != null ? `${task.distance} km` : !currentUserId ? <span className="text-xs text-gray-400 italic">{t('tasks.loginToSeeDistance')}</span> : '—'}</dd>
                          </div>
                          <div className="min-w-0 sm:col-span-2 flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">{t('tasks.due')}</dt>
                              <dd className="text-gray-800 font-medium">{task.due_date ? (() => { try { return format(new Date(task.due_date), 'MMM d, yyyy') } catch (e) { return t('tasks.invalidDate') } })() : '—'}</dd>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {task.willing_to_help && (
                                <div className="flex items-center gap-1 text-primary-600">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                  <span className="text-xs font-medium">Poster will help</span>
                                </div>
                              )}
                              {currentUserId && task.created_by !== currentUserId && (
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReportTargetId(task.id); setReportTargetName(task.title); setReportType('task'); setReportModalOpen(true) }}
                                  className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium"
                                  title="Report this task"
                                  aria-label="Report this task"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  <span>Report</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </>
                )}
              </Link>
            )
          })
        )}
      </div>

      <UserProfileModal
        userId={selectedUserId}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false)
          setSelectedUserId(null)
        }}
      />

      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">{t('modal.loginRequired')}</h2>
            <p className="text-gray-600 mb-6">
              {t('modal.loginRequiredMessage')}
            </p>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md text-center hover:bg-primary-700"
              >
                {t('modal.login')}
              </Link>
              <Link
                href="/register"
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-center hover:bg-gray-300"
              >
                {t('modal.signUp')}
              </Link>
              <button
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportTargetId && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false)
            setReportTargetId(null)
            setReportTargetName(null)
          }}
          reportType={reportType}
          targetId={reportTargetId}
          targetName={reportTargetName || undefined}
          onReportSubmitted={() => {}}
        />
      )}
    </div>
  )
}
