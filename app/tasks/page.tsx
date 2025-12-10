'use client'

import { useEffect, useState, useRef } from 'react'
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

type FilterType = 'all' | 'open' | 'my_tasks' | 'new' | 'my_bids'

export default function TasksPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  
  // Simple version counter to track which load is current
  const loadVersionRef = useRef(0)

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
   */
  const loadTasks = async (activeFilter: FilterType) => {
    // Increment version to invalidate any in-progress loads
    loadVersionRef.current += 1
    const thisVersion = loadVersionRef.current
    
    console.log(`🔍 loadTasks started - Filter: ${activeFilter}, Version: ${thisVersion}`)
    
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Check if this load is still current
      if (loadVersionRef.current !== thisVersion) {
        console.log(`⏸️ Load ${thisVersion} cancelled - newer load started`)
        return
      }
      
      // For 'my_bids' filter, get task IDs related to user's bidding activity
      // This includes (ONLY OPEN TASKS):
      // 1. Tasks where user placed bids (as a bidder)
      // 2. Tasks user created that have bids on them (as a task owner)
      let taskIdsWithBids: string[] = []
      let tasksUserBidOn: Set<string> = new Set() // Track which tasks user bid on
      let myTasksWithBidCounts: Map<string, number> = new Map() // Track bid counts on user's tasks
      
      if (activeFilter === 'my_bids') {
        if (!user) {
          console.log('🔍 my_bids filter - no user, showing empty')
          if (loadVersionRef.current === thisVersion) {
            setTasks([])
            setLoading(false)
          }
          return
        }
        
        console.log('🔍 my_bids filter - User ID:', user.id)
        
        // Query 1: Get OPEN tasks where user placed bids (with task status join)
        let placedBidsQuery = supabase
          .from('bids')
          .select('task_id, tasks!inner(id, status, archived)')
          .eq('user_id', user.id)
          .eq('tasks.status', 'open') // Only open tasks
        
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
        console.log('🔍 my_bids filter - Open tasks I placed bids on:', tasksIBidOn.length, tasksIBidOn)
        
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
          
          // Get bids on my open tasks (from others)
          const { data: bidsOnMyTasks, error: bidsOnMyTasksError } = await supabase
            .from('bids')
            .select('task_id')
            .in('task_id', myTaskIds)
            .neq('user_id', user.id) // Bids from others, not self
          
          if (bidsOnMyTasksError) {
            console.error('Error fetching bids on my tasks:', bidsOnMyTasksError)
          }
          
          // Count bids per task
          (bidsOnMyTasks || []).forEach(bid => {
            const count = myTasksWithBidCounts.get(bid.task_id) || 0
            myTasksWithBidCounts.set(bid.task_id, count + 1)
          })
          
          tasksWithBidsOnThem = [...new Set((bidsOnMyTasks || []).map(b => b.task_id).filter(Boolean))]
          console.log('🔍 my_bids filter - My open tasks with bids from others:', tasksWithBidsOnThem.length, tasksWithBidsOnThem)
          console.log('🔍 my_bids filter - Bid counts per task:', Object.fromEntries(myTasksWithBidCounts))
        }
        
        // Check if cancelled
        if (loadVersionRef.current !== thisVersion) {
          console.log(`⏸️ Load ${thisVersion} cancelled after bids queries`)
          return
        }
        
        // Combine both: tasks I bid on + my tasks that have bids
        taskIdsWithBids = [...new Set([...tasksIBidOn, ...tasksWithBidsOnThem])]
        
        console.log(`🔍 my_bids filter - Total unique open tasks: ${taskIdsWithBids.length}`)
        console.log(`🔍 my_bids filter - Task IDs:`, taskIdsWithBids)
        
        if (taskIdsWithBids.length === 0) {
          console.log('🔍 my_bids filter - No bid-related open tasks found')
          if (loadVersionRef.current === thisVersion) {
            setTasks([])
            setLoading(false)
          }
          return
        }
      }
      
      // Build query
      let query = supabase.from('tasks').select('*')
      
      // Check admin status
      let userIsAdmin = false
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        userIsAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
        setIsAdmin(userIsAdmin)
      }
      
      // Filter hidden tasks for non-admins
      if (!userIsAdmin) {
        query = query.eq('hidden_by_admin', false)
      }
      
      // Filter archived tasks based on showArchived checkbox
      // This applies to ALL filters now (including my_bids and my_tasks)
      if (!showArchived) {
        query = query.eq('archived', false)
      }
      
      // Apply filter-specific conditions
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
          query = query
            .eq('status', 'open')
            .gte('created_at', sevenDaysAgo.toISOString())
          break
          
        case 'my_bids':
          if (taskIdsWithBids.length > 0) {
            query = query
              .in('id', taskIdsWithBids)
              .eq('status', 'open') // Only show open tasks in Bids filter
          }
          break
          
        case 'all':
        default:
          // No filter - handled client-side
          break
      }
      
      // Apply additional filters
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
      
      // Execute query
      query = query.order('created_at', { ascending: false })
      
      const { data: tasksData, error } = await query
      
      // Check if cancelled
      if (loadVersionRef.current !== thisVersion) {
        console.log(`⏸️ Load ${thisVersion} cancelled after tasks query`)
        return
      }
      
      if (error) {
        console.error('Query error:', error)
        setLoading(false)
        return
      }
      
      console.log(`📦 Query returned ${tasksData?.length || 0} tasks for filter: ${activeFilter}`)
      
      if (!tasksData || tasksData.length === 0) {
        if (loadVersionRef.current === thisVersion) {
          setTasks([])
          setLoading(false)
        }
        return
      }
      
      // Fetch related data
      const creatorIds = Array.from(new Set(tasksData.map(t => t.created_by)))
      const categoryIds = Array.from(new Set(tasksData.flatMap(t => [t.category_id, t.sub_category_id]).filter(Boolean)))
      const taskIds = tasksData.map(t => t.id)
      
      const [profilesResult, reviewsResult, categoriesResult, tagsResult, bidsResult] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, avatar_url').in('id', creatorIds),
        supabase.from('reviews').select('reviewee_id, rating').in('reviewee_id', creatorIds),
        categoryIds.length > 0 
          ? supabase.from('categories').select('*').in('id', categoryIds)
          : Promise.resolve({ data: [] }),
        supabase.from('task_tags').select('task_id, tag_id, tags(*)').in('task_id', taskIds),
        supabase.from('bids').select('task_id, id').in('task_id', taskIds)
      ])
      
      // Check if cancelled
      if (loadVersionRef.current !== thisVersion) {
        console.log(`⏸️ Load ${thisVersion} cancelled after related data query`)
        return
      }
      
      const profilesData = profilesResult.data || []
      const reviewsData = reviewsResult.data || []
      const categoriesData = categoriesResult.data || []
      const taskTagsData = tagsResult.data || []
      const bidsData = bidsResult.data || []
      
      // Process data
      const bidsByTaskId: Record<string, number> = {}
      bidsData.forEach((bid: any) => {
        bidsByTaskId[bid.task_id] = (bidsByTaskId[bid.task_id] || 0) + 1
      })
      
      const tagsByTaskId: Record<string, any[]> = {}
      taskTagsData.forEach((tt: any) => {
        if (!tagsByTaskId[tt.task_id]) tagsByTaskId[tt.task_id] = []
        if (tt.tags) tagsByTaskId[tt.task_id].push(tt.tags)
      })
      
      const ratingsByUser: Record<string, { avg: number; count: number }> = {}
      reviewsData.forEach(review => {
        if (!ratingsByUser[review.reviewee_id]) {
          ratingsByUser[review.reviewee_id] = { avg: 0, count: 0 }
        }
        ratingsByUser[review.reviewee_id].count++
        ratingsByUser[review.reviewee_id].avg += review.rating
      })
      Object.keys(ratingsByUser).forEach(userId => {
        ratingsByUser[userId].avg = ratingsByUser[userId].avg / ratingsByUser[userId].count
      })
      
      // Map tasks with profiles
      let tasksWithProfiles = tasksData.map(task => {
        const creator = profilesData.find(p => p.id === task.created_by)
        const rating = ratingsByUser[task.created_by]
        const categoryObj = task.category_id ? categoriesData.find(c => c.id === task.category_id) : null
        const subCategoryObj = task.sub_category_id ? categoriesData.find(c => c.id === task.sub_category_id) : null
        const tags = tagsByTaskId[task.id] || []
        
        let distance: number | undefined = undefined
        if (userLocation && task.latitude && task.longitude) {
          distance = calculateDistance(userLocation.lat, userLocation.lng, task.latitude, task.longitude)
        }
        
        let matchesSkills = false
        if (filterBySkills && userSkills.length > 0 && task.required_skills && Array.isArray(task.required_skills)) {
          matchesSkills = task.required_skills.some((skill: string) => userSkills.includes(skill))
        }
        
        return {
          ...task,
          user: creator ? { ...creator, rating: rating ? rating.avg : null, reviewCount: rating?.count || 0 } : undefined,
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
          const isPostedByMe = task.created_by === user.id
          const isHelpedByMe = task.assigned_to === user.id
          return isOpen || (isCompleted && isPostedByMe) || (isCompleted && isHelpedByMe)
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
      if (loadVersionRef.current === thisVersion) {
        setTasks(tasksWithProfiles)
        setLoading(false)
        console.log(`✅ Load ${thisVersion} complete - ${tasksWithProfiles.length} tasks for filter: ${activeFilter}`)
      } else {
        console.log(`⏸️ Load ${thisVersion} completed but newer load exists, discarding`)
      }
      
    } catch (error) {
      console.error('Error loading tasks:', error)
      if (loadVersionRef.current === thisVersion) {
        setLoading(false)
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

  // Initialize page
  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedLastView = localStorage.getItem('tasks_last_view_time')
    setLastViewTime(storedLastView)

    const initPage = async () => {
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
        
        if (profile?.skills && Array.isArray(profile.skills)) {
          setUserSkills(profile.skills)
        }
        
        await loadUserLocation()
      } else {
        setCurrentUserId(null)
        setUserLocation(null)
      }

      loadCategories()
      loadTags()
      loadProfessions()
      
      // Mark session ready and load tasks
      setSessionReady(true)
      const activeFilter = getActiveFilter()
      setFilter(activeFilter)
      loadTasks(activeFilter)
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

  // Sync filter from URL when URL changes
  useEffect(() => {
    if (!sessionReady) return
    
    const urlFilter = searchParams.get('filter') as FilterType | null
    if (urlFilter && ['all', 'open', 'my_tasks', 'new', 'my_bids'].includes(urlFilter)) {
      if (filter !== urlFilter) {
        console.log(`🔄 URL filter changed to: ${urlFilter}`)
        setFilter(urlFilter)
        loadTasks(urlFilter)
      }
    } else if (!urlFilter && filter !== 'open') {
      // Default to 'open' when no URL filter
      console.log(`🔄 No URL filter, defaulting to: open`)
      setFilter('open')
      loadTasks('open')
    }
  }, [searchParams])

  // Reload when other filters change
  useEffect(() => {
    if (!sessionReady) return
    
    console.log(`🔄 Filter parameters changed, reloading with filter: ${filter}`)
    loadTasks(filter)
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
    minimumRating
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

  // Reload when user location becomes available
  useEffect(() => {
    if (sessionReady && userLocation) {
      loadTasks(filter)
    }
  }, [userLocation])

  // Load pending reviews
  useEffect(() => {
    const loadPendingReviewsData = async () => {
      if (!currentUserId) {
        setPendingReviews([])
        return
      }

      try {
        const reviews = await getPendingReviews(currentUserId)
        setPendingReviews(reviews)
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          setShowPendingReviews(params.get('pending_reviews') === 'true')
        }
      } catch (error) {
        console.error('Error loading pending reviews:', error)
      }
    }

    loadPendingReviewsData()
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
    console.log(`🖱️ Filter button clicked: ${newFilter}`)
    setFilter(newFilter)
    router.push(`/tasks?filter=${newFilter}`)
    loadTasks(newFilter)
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading tasks...</div>
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
                              className="h-8 w-8 rounded-full object-cover object-center"
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
            title="All Bids"
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium ${
              filter === 'my_bids'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Bids
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

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-2">
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
                {showSampleSash && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[0.7875rem] font-bold px-[5.4] py-[1.8] rounded-br-lg shadow-lg z-10 transform -rotate-12 origin-top-left uppercase tracking-wider">
                    SAMPLE
                  </div>
                )}
                {isNew && !isSample && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 sm:px-4 py-1 rounded-bl-lg rounded-tr-lg shadow-lg z-10 transform rotate-12 origin-top-right">
                    NEW
                  </div>
                )}
                {task.image_url && (
                  <div className="w-full h-48 sm:h-64 bg-gray-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={task.image_url}
                      alt={task.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 sm:p-6 flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 break-words">{task.title}</h3>
                      <p className="text-2xl sm:text-3xl font-bold text-primary-600">{task.budget ? `€${task.budget}` : 'Quote'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                    {isAdmin && task.hidden_by_admin && (
                      <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded uppercase bg-red-600 text-white whitespace-nowrap">
                        🔒 HIDDEN
                      </span>
                    )}
                    {/* Bid relationship badges - show in Bids filter */}
                    {filter === 'my_bids' && (task as any).userPlacedBid && (
                      <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded uppercase bg-blue-100 text-blue-700 whitespace-nowrap">
                        ✋ You Bid
                      </span>
                    )}
                    {filter === 'my_bids' && (task as any).bidsReceivedCount > 0 && task.created_by === currentUserId && (
                      <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded uppercase bg-green-100 text-green-700 whitespace-nowrap">
                        📥 {(task as any).bidsReceivedCount} Bid{(task as any).bidsReceivedCount !== 1 ? 's' : ''} Received
                      </span>
                    )}
                    {currentUserId && task.created_by === currentUserId && filter !== 'my_bids' && (
                      <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded uppercase bg-red-100 text-red-700 whitespace-nowrap">
                        My Task
                      </span>
                    )}
                      <span
                        className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
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

                  <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2 break-words">{task.description}</p>

                  {task.user && (
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
                        {task.user.avatar_url && (
                          <img
                            src={task.user.avatar_url}
                            alt={task.user.full_name || task.user.email}
                            className="w-6 h-6 sm:w-7 sm:h-7 aspect-square rounded-full object-cover object-center flex-shrink-0"
                          />
                        )}
                        <span className="font-medium truncate">by {task.user.full_name || task.user.email}</span>
                      </button>
                      {task.user.rating !== null && task.user.rating !== undefined && typeof task.user.rating === 'number' && (
                        <span className="text-xs sm:text-sm text-amber-600 font-semibold flex items-center whitespace-nowrap">
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

                <div className="px-4 sm:px-6 mb-4 pb-4 border-b border-gray-200"></div>

                <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  {task.location && (() => {
                    const parts = task.location.split(',').map(p => p.trim())
                    let city = ''
                    let county = ''
                    
                    const hasPortuguesePostcode = parts.some(p => /^\d{4}-\d{3}$/.test(p))
                    
                    if (hasPortuguesePostcode) {
                      if (parts.length >= 3) {
                        const firstPart = parts[0].toLowerCase()
                        const looksLikeStreet = /\d|street|avenue|road|rua|avenida|rua da|rua do|rua de/i.test(firstPart)
                        
                        if (looksLikeStreet && parts.length >= 4) {
                          city = parts[2] || parts[0]
                          county = parts[3] || ''
                        } else {
                          city = parts[0]
                          if (parts.length >= 4 && !/^\d{4}-\d{3}$/.test(parts[1])) {
                            county = parts[1]
                          }
                        }
                      } else {
                        city = parts[0] || ''
                      }
                    } else {
                      city = parts[0] || ''
                      county = parts[1] || ''
                    }
                    
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

                  {currentUserId && task.created_by !== currentUserId && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setReportTargetId(task.id)
                        setReportTargetName(task.title)
                        setReportType('task')
                        setReportModalOpen(true)
                      }}
                      className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                      title="Report this task"
                      aria-label="Report this task"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Report</span>
                    </button>
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

                {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
                  <div className="px-4 sm:px-6 pb-4 flex flex-wrap gap-1.5">
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
