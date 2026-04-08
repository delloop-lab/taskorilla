'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getPendingReviews } from '@/lib/review-utils'
import { useLanguage } from '@/lib/i18n'
import { User as UserIcon } from 'lucide-react'
import { getDisplayName } from '@/lib/name-privacy'

// Debug logging - only in development
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => isDev && console.log(...args)

function BottomNavIcon({
  active,
  pathD,
}: {
  active: boolean
  pathD: string
}) {
  return (
    <span
      className={`mb-0.5 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
        active
          ? 'bg-gradient-to-b from-orange-100 to-orange-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_6px_rgba(249,115,22,0.25)]'
          : 'bg-gradient-to-b from-slate-50 to-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(15,23,42,0.12)]'
      }`}
    >
      <svg
        className={`h-[18px] w-[18px] ${active ? 'text-primary-600' : 'text-slate-600'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={pathD} />
      </svg>
    </span>
  )
}

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPaused, setUserPaused] = useState(false)
  const [showPausedModal, setShowPausedModal] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [pendingBidsCount, setPendingBidsCount] = useState<number>(0)
  const [hasPendingBids, setHasPendingBids] = useState<boolean>(false) // Track if user has ANY pending bids
  const [bidsViewed, setBidsViewed] = useState<boolean>(false) // Track if user has viewed bids this session
  const [acceptedBidsCount, setAcceptedBidsCount] = useState<number>(0)
  const [firstAcceptedTaskId, setFirstAcceptedTaskId] = useState<string | null>(null)
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0)
  const [firstPendingReviewTaskId, setFirstPendingReviewTaskId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileExpandedSection, setMobileExpandedSection] = useState<'helpers' | 'tasks' | 'more' | null>(null)
  const [tasksMenuOpen, setTasksMenuOpen] = useState(false)
  const [helpersMenuOpen, setHelpersMenuOpen] = useState(false)
  const [tasksMenuTimeout, setTasksMenuTimeout] = useState<NodeJS.Timeout | null>(null)
  const [helpersMenuTimeout, setHelpersMenuTimeout] = useState<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const taskFilter = searchParams.get('filter')

  useEffect(() => {
    if (!mobileMenuOpen) {
      setMobileExpandedSection(null)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    // Check current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role, is_paused')
          .eq('id', user.id)
          .single()

        setProfileName(data?.full_name || null)
        setProfileAvatar(data?.avatar_url || null)
        setUserRole(data?.role || 'user')
        setUserPaused(data?.is_paused === true)
      } else {
        setProfileName(null)
        setProfileAvatar(null)
        setUserRole(null)
        setUserPaused(false)
        setUnreadCount(0)
      }
    }

    loadProfile()
  }, [user])

  useEffect(() => {
    if (!user?.id) return

    const loadUnreadCount = async () => {
      try {
        // Load hidden conversation IDs to exclude from count
        const { data: hiddenRows } = await supabase
          .from('user_hidden_conversations')
          .select('conversation_id')
          .eq('user_id', user.id)
        const hiddenConvIds = hiddenRows?.map((r) => r.conversation_id) || []

        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false)

        if (hiddenConvIds.length > 0) {
          query = query.not('conversation_id', 'in', `(${hiddenConvIds.join(',')})`)
        }

        const { count, error } = await query

        if (error) {
          console.error('Error loading unread count:', error)
          if (error.message?.includes('column') && error.message?.includes('does not exist')) {
            console.error('⚠️ The is_read column does not exist. Please run the SQL script: supabase/add_message_read_status.sql')
            setUnreadCount(0)
            return
          }
          throw error
        }
        
        setUnreadCount(count || 0)
      } catch (error) {
        console.error('Error loading unread count:', error)
      }
    }

    loadUnreadCount()

    // Listen for custom event when messages are marked as read
    const handleMessagesRead = () => {
      // Small delay to ensure database update is complete
      setTimeout(() => {
        loadUnreadCount()
      }, 200)
    }

    window.addEventListener('messages-read', handleMessagesRead)

    // Set up real-time subscription for message changes (INSERT and UPDATE)
    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('messages-read', handleMessagesRead)
      supabase.removeChannel(channel)
    }
  }, [user])

  // Load pending bids count (bids on user's tasks that are still pending)
  useEffect(() => {
    if (!user?.id) {
      setPendingBidsCount(0)
      setHasPendingBids(false)
      setBidsViewed(false)
      return
    }

    let isActive = true // Prevent state updates after unmount
    
    const loadPendingBids = async () => {
      try {
        // Get user's open tasks (excluding archived and hidden)
        const { data: userTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('created_by', user.id)
          .eq('status', 'open')
          .or('archived.eq.false,archived.is.null')
          .or('hidden_by_admin.eq.false,hidden_by_admin.is.null')

        if (tasksError || !isActive) {
          if (tasksError) console.error('Error loading user tasks:', tasksError)
          return
        }

        if (!userTasks || userTasks.length === 0) {
          if (isActive) {
            setPendingBidsCount(0)
            setHasPendingBids(false)
          }
          return
        }

        const taskIds = userTasks.map(t => t.id)

        // Get pending bids on those tasks from OTHER users
        const { data: bidsOnMyTasks, error: bidsError } = await supabase
          .from('bids')
          .select('task_id')
          .in('task_id', taskIds)
          .eq('status', 'pending')
          .neq('user_id', user.id)

        if (bidsError || !isActive) {
          if (bidsError) console.error('Error counting pending bids:', bidsError)
          return
        }

        // Count unique tasks that have pending bids
        const uniqueTaskIdsWithBids = bidsOnMyTasks 
          ? [...new Set(bidsOnMyTasks.map(bid => bid.task_id))] 
          : []
        
        const bidCount = uniqueTaskIdsWithBids.length
        // Only log if there are pending bids (more useful information)
        if (bidCount > 0) {
          debugLog('🔔 Pending bids:', bidCount)
        }
        
        if (isActive) {
          setPendingBidsCount(bidCount)
          setHasPendingBids(bidCount > 0)
          if (bidCount > 0) {
            setBidsViewed(false)
          }
        }
      } catch (error) {
        console.error('Error loading pending bids:', error)
      }
    }

    // Debounce the initial load slightly to prevent rapid re-calls
    const timeoutId = setTimeout(loadPendingBids, 100)

    // Listen for custom event when bids are viewed (to hide the badge but keep the word)
    const handleBidsViewed = () => {
      setBidsViewed(true)
    }

    window.addEventListener('bids-viewed', handleBidsViewed)

    // Set up real-time subscription for new bids
    const channel = supabase
      .channel(`pending-bids-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
        },
        () => {
          loadPendingBids()
        }
      )
      .subscribe()

    return () => {
      isActive = false
      clearTimeout(timeoutId)
      window.removeEventListener('bids-viewed', handleBidsViewed)
      supabase.removeChannel(channel)
    }
  }, [user?.id]) // Only re-run when user.id changes, not the whole user object

  // Load accepted bids count (for helpers - when their bids are accepted)
  useEffect(() => {
    if (!user?.id) {
      setAcceptedBidsCount(0)
      setFirstAcceptedTaskId(null)
      return
    }

    const loadAcceptedBids = async () => {
      try {
        // Count bids by this user that have been accepted and task is in_progress
        // (not completed yet, so they need to see the notification)
        const { data: acceptedBids, error } = await supabase
          .from('bids')
          .select(`
            id,
            task_id,
            tasks!inner(status)
          `)
          .eq('user_id', user.id)
          .eq('status', 'accepted')

        if (error) {
          console.error('Error loading accepted bids:', error)
          return
        }

        // Filter to only tasks that are in_progress (not completed)
        const inProgressBids = acceptedBids?.filter(
          (bid: any) => bid.tasks?.status === 'in_progress'
        ) || []

        if (inProgressBids.length === 0) {
          setAcceptedBidsCount(0)
          setFirstAcceptedTaskId(null)
          return
        }

        // Check which tasks the helper has already added progress updates to
        // If they've started work (added updates), don't show WON notification
        const taskIds = inProgressBids.map((b: any) => b.task_id)
        const { data: progressUpdates } = await supabase
          .from('task_progress_updates')
          .select('task_id')
          .eq('user_id', user.id)
          .in('task_id', taskIds)

        // Get unique task IDs where helper has added progress updates
        const tasksWithProgress = new Set(progressUpdates?.map((p: any) => p.task_id) || [])

        // Filter out tasks where helper has already commenced work
        const newWonBids = inProgressBids.filter(
          (bid: any) => !tasksWithProgress.has(bid.task_id)
        )

        console.log('🎉 New WON bids (no progress yet):', newWonBids.length)
        setAcceptedBidsCount(newWonBids.length)
        // Store the first accepted task ID for direct navigation
        setFirstAcceptedTaskId(newWonBids.length > 0 ? newWonBids[0].task_id : null)
      } catch (error) {
        console.error('Error loading accepted bids:', error)
      }
    }

    loadAcceptedBids()

    // Set up real-time subscription for bid status changes
    const channel = supabase
      .channel(`accepted-bids-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bids',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadAcceptedBids()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Load pending reviews count
  useEffect(() => {
    if (!user?.id) {
      setPendingReviewsCount(0)
      setFirstPendingReviewTaskId(null)
      return
    }

    const loadPendingReviews = async () => {
      try {
        // Don't block - run in background
        const pendingReviews = await getPendingReviews(user.id)
        setPendingReviewsCount(pendingReviews.length)
        // Store the first pending review's task ID for direct navigation
        setFirstPendingReviewTaskId(pendingReviews.length > 0 ? pendingReviews[0].task_id : null)
      } catch (error) {
        // Silently fail - don't spam console with errors
        console.warn('Error loading pending reviews:', error)
        setPendingReviewsCount(0)
        setFirstPendingReviewTaskId(null)
      }
    }

    // Load in background without blocking - use setTimeout to defer
    setTimeout(() => {
      loadPendingReviews()
    }, 100)

    // Refresh every 30 seconds
    const interval = setInterval(loadPendingReviews, 30000)

    // Listen for review submission events
    const handleReviewSubmitted = () => {
      setTimeout(() => {
        loadPendingReviews()
      }, 500)
    }

    window.addEventListener('review-submitted', handleReviewSubmitted)

    return () => {
      clearInterval(interval)
      window.removeEventListener('review-submitted', handleReviewSubmitted)
    }
  }, [user])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (tasksMenuTimeout) clearTimeout(tasksMenuTimeout)
      if (helpersMenuTimeout) clearTimeout(helpersMenuTimeout)
    }
  }, [tasksMenuTimeout, helpersMenuTimeout])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfileName(null)
    setProfileAvatar(null)
    setUserRole(null)
    router.push('/')
    router.refresh()
  }

  // Check if user has admin access
  const isAdmin = userRole === 'admin' || userRole === 'superadmin'
  const isHomeActive = pathname === '/'
  const isBrowseActive = pathname === '/tasks' && taskFilter !== 'my_bids'
  const isPostActive = pathname === '/tasks/new'
  const isMyBidsActive = pathname === '/tasks' && taskFilter === 'my_bids'
  const isAccountActive = pathname === '/profile' || pathname.startsWith('/profile/')

  if (loading) {
    return (
      <nav className="bg-white shadow-sm relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center text-xl font-bold" style={{ color: '#8B4513' }}>
              <img 
                src="/images/taskorilla_header_logo.png" 
                alt="Taskorilla" 
                className="h-[40px] object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </Link>
            {/* Show Login/Register while loading */}
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                LOGIN
              </Link>
              <Link
                href="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <>
      <nav className="bg-white shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center text-xl font-bold" style={{ color: '#8B4513' }}>
              <img 
                src="/images/taskorilla_header_logo.png" 
                alt="Taskorilla" 
                className="h-[40px] object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
            {/* TASKS Dropdown Menu */}
            <div 
              className="relative z-50"
              style={{ order: -1 }}
              onMouseEnter={() => {
                // Clear any pending timeout
                if (tasksMenuTimeout) {
                  clearTimeout(tasksMenuTimeout)
                  setTasksMenuTimeout(null)
                }
                // Close other menus
                setHelpersMenuOpen(false)
                setTasksMenuOpen(true)
              }}
              onMouseLeave={() => {
                // Add longer delay before closing
                const timeout = setTimeout(() => {
                  setTasksMenuOpen(false)
                }, 400) // 400ms delay - gives more time to move mouse
                setTasksMenuTimeout(timeout)
              }}
            >
              <Link
                href="/tasks"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {t('navbar.tasks')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              {tasksMenuOpen && (
                <>
                  {/* Invisible bridge area to make it easier to move mouse to submenu */}
                  <div className="absolute top-full left-0 w-full h-4" />
                  <div
                    className="absolute top-full left-0 mt-4 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                    onMouseEnter={() => {
                      // Keep menu open when hovering over submenu
                      if (tasksMenuTimeout) {
                        clearTimeout(tasksMenuTimeout)
                        setTasksMenuTimeout(null)
                      }
                    }}
                    onMouseLeave={() => {
                      // Delay closing when leaving submenu
                      const timeout = setTimeout(() => {
                        setTasksMenuOpen(false)
                      }, 400)
                      setTasksMenuTimeout(timeout)
                    }}
                  >
                    <Link
                      href="/tasks"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseTasks')}
                    </Link>
                    <Link
                      href="/become-a-helper"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.howToEarn')}
                    </Link>
                    <Link
                      href="/help"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.taskerGuidelines')}
                    </Link>
                  </div>
                </>
              )}
            </div>
            {/* HELPERS Dropdown Menu */}
            <div 
              className="relative z-50"
              style={{ order: -2 }}
              onMouseEnter={() => {
                // Clear any pending timeout
                if (helpersMenuTimeout) {
                  clearTimeout(helpersMenuTimeout)
                  setHelpersMenuTimeout(null)
                }
                // Close other menus
                setTasksMenuOpen(false)
                setHelpersMenuOpen(true)
              }}
              onMouseLeave={() => {
                // Add longer delay before closing
                const timeout = setTimeout(() => {
                  setHelpersMenuOpen(false)
                }, 400) // 400ms delay - gives more time to move mouse
                setHelpersMenuTimeout(timeout)
              }}
            >
              <Link
                href="/#service-cards-grid"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {t('navbar.helpers')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              {helpersMenuOpen && (
                <>
                  {/* Invisible bridge area to make it easier to move mouse to submenu */}
                  <div className="absolute top-full left-0 w-full h-4 z-50" />
                  <div
                    className="absolute top-full left-0 mt-4 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[60]"
                    onMouseEnter={() => {
                      // Keep menu open when hovering over submenu
                      if (helpersMenuTimeout) {
                        clearTimeout(helpersMenuTimeout)
                        setHelpersMenuTimeout(null)
                      }
                    }}
                    onMouseLeave={() => {
                      // Delay closing when leaving submenu
                      const timeout = setTimeout(() => {
                        setHelpersMenuOpen(false)
                      }, 400)
                      setHelpersMenuTimeout(timeout)
                    }}
                  >
                    {userPaused ? (
                    <button
                      onClick={() => { setHelpersMenuOpen(false); setShowPausedModal(true) }}
                      className="block w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      <span className="block">{t('navbar.postTask')}</span>
                      <span className="block text-xs text-gray-500">{t('navbar.workRequired')}</span>
                    </button>
                    ) : (
                    <Link
                      href="/tasks/new"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      <span className="block">{t('navbar.postTask')}</span>
                      <span className="block text-xs text-gray-500">{t('navbar.workRequired')}</span>
                    </Link>
                    )}
                    {userPaused ? (
                    <button
                      onClick={() => { setHelpersMenuOpen(false); setShowPausedModal(true) }}
                      className="block w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseAllHelpers')}
                    </button>
                    ) : (
                    <Link
                      href="/helpers"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseAllHelpers')}
                    </Link>
                    )}
                    {userPaused ? (
                    <button
                      onClick={() => { setHelpersMenuOpen(false); setShowPausedModal(true) }}
                      className="block w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseProfessionals')}
                    </button>
                    ) : (
                    <Link
                      href="/professionals"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseProfessionals')}
                    </Link>
                    )}
                    <Link
                      href="/help"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.howItWorks')}
                    </Link>
                  </div>
                </>
              )}
            </div>
            <Link
              href="/help"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              {t('navbar.help')}
            </Link>
            {/* Pricing Link */}
            <Link
              href="/pricing"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              {t('navbar.price')}
            </Link>
            {/* Language Switcher */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Language switch clicked: EN')
                  setLanguage('en')
                }}
                className={`px-1.5 py-1.5 text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-orange-200 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={t('language.switchToEnglish')}
              >
                <svg className="w-8 h-6" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                  {/* United Kingdom flag - Union Jack */}
                  <rect width="60" height="40" fill="#012169" />
                  <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
                  <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="5" />
                  <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
                  <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
                </svg>
              </button>
              <div className="w-px h-6 bg-gray-300" />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Language switch clicked: PT')
                  setLanguage('pt')
                }}
                className={`px-1.5 py-1.5 text-sm font-medium transition-colors ${
                  language === 'pt'
                    ? 'bg-orange-200 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={t('language.switchToPortuguese')}
              >
                <svg className="w-8 h-6" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="40" fill="#006600"/>
                  <rect x="24" width="36" height="40" fill="#FF0000"/>
                  <circle cx="24" cy="20" r="7" fill="none" stroke="#FFCC00" strokeWidth="0.8"/>
                  <circle cx="24" cy="20" r="5.5" fill="none" stroke="#FFCC00" strokeWidth="0.6"/>
                  <circle cx="24" cy="20" r="4" fill="#FFCC00"/>
                  <circle cx="24" cy="20" r="2.5" fill="#FF0000"/>
                </svg>
              </button>
            </div>
            {user ? (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (userPaused) { setShowPausedModal(true); return }
                    console.log('🔍 Bids button clicked, navigating to /tasks?filter=my_bids')
                    window.dispatchEvent(new Event('bids-viewed'))
                    router.push('/tasks?filter=my_bids')
                  }}
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium relative cursor-pointer"
                  title="Bids on your tasks"
                >
                  Bids
                  {hasPendingBids && pendingBidsCount > 0 && !bidsViewed && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                  )}
                </button>
                {acceptedBidsCount > 0 && firstAcceptedTaskId && (
                  <button
                    onClick={() => router.push(`/tasks/${firstAcceptedTaskId}`)}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium relative cursor-pointer"
                    title="Your bid has been accepted! Click to view the task."
                  >
                    WON
                    <span className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 transform translate-x-1/2 -translate-y-1/2">
                      {acceptedBidsCount > 99 ? '99+' : acceptedBidsCount}
                    </span>
                  </button>
                )}
                <Link
                  href="/messages"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium relative"
                >
                  {t('navbar.inbox')}
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 transform translate-x-1/2 -translate-y-1/2">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                {pendingReviewsCount > 0 && (
                  <Link
                    href={firstPendingReviewTaskId ? `/tasks/${firstPendingReviewTaskId}` : '/tasks?filter=my_tasks&pending_reviews=true'}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium relative"
                    title="Pending Reviews"
                  >
                    Actions
                    <span className="absolute top-0 right-0 bg-amber-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 transform translate-x-1/2 -translate-y-1/2">
                      {pendingReviewsCount > 99 ? '99+' : pendingReviewsCount}
                    </span>
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium font-semibold"
                    style={{ color: '#8B4513' }}
                  >
                    Admin
                  </Link>
                )}
                {userPaused ? (
                <button
                  onClick={() => setShowPausedModal(true)}
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </button>
                ) : (
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                )}
                {user && (
                  <div className="flex items-center">
                    <div 
                      className="h-8 w-8 aspect-square rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 min-w-[32px] min-h-[32px]"
                      style={{ aspectRatio: '1 / 1' }}
                    >
                      {profileAvatar ? (
                        <img 
                          src={profileAvatar} 
                          alt="avatar" 
                          className="w-full h-full object-cover object-center" 
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <UserIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  LOGIN
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Language Switcher - Mobile (visible outside menu) */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden mr-2 bg-white">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setLanguage('en')
                }}
                className={`px-2 py-1 text-xs font-semibold transition-colors ${
                  language === 'en'
                    ? 'bg-orange-200 text-gray-900'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
                title={t('language.switchToEnglish')}
              >
                EN
              </button>
              <div className="px-1 text-xs text-gray-400 select-none">|</div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setLanguage('pt')
                }}
                className={`px-2 py-1 text-xs font-semibold transition-colors ${
                  language === 'pt'
                    ? 'bg-orange-200 text-gray-900'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
                title={t('language.switchToPortuguese')}
              >
                PT
              </button>
            </div>
            {user && (
              <Link
                href="/messages"
                className="text-gray-700 hover:text-primary-600 p-2 rounded-md relative"
                aria-label={t('navbar.inbox')}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 transform translate-x-1/2 -translate-y-1/2">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <div
          className={`md:hidden fixed inset-0 z-[70] transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div
            className={`absolute top-0 left-0 h-full w-[88%] max-w-sm bg-white border-r border-gray-200 shadow-2xl transform transition-transform duration-300 ease-out ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}
          >
            <div className={`h-full overflow-y-auto py-4 pb-24 flex flex-col gap-2 bg-gradient-to-b from-white/80 to-slate-50/60 ${mobileMenuOpen ? 'mobile-drawer-open' : ''}`}>
            {!user && (
              <div className="px-4 py-2">
                <Link
                  href="/register"
                  className="mobile-drawer-link block bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up Free
                </Link>
              </div>
            )}
            {user && (
              <div className="flex items-center space-x-2 px-4 py-2">
                <div 
                  className="h-10 w-10 aspect-square rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 min-w-[40px] min-h-[40px]"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  {profileAvatar ? (
                    <img 
                      src={profileAvatar} 
                      alt="avatar" 
                      className="w-full h-full object-cover object-center" 
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <UserIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {getDisplayName({ fullName: profileName, email: user?.email, revealFull: false })}
                </span>
              </div>
            )}
            {/* FIND HELP Section (collapsed by default; matches desktop dropdown) */}
            <div className="px-4 py-2">
              <button
                type="button"
                onClick={() => setMobileExpandedSection((prev) => (prev === 'helpers' ? null : 'helpers'))}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 rounded-xl px-3 py-2 bg-white border border-slate-200 shadow-sm"
              >
                <span>{t('navbar.helpers')}</span>
                <svg className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'helpers' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileExpandedSection === 'helpers' && (
                <>
                  {userPaused ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowPausedModal(true) }}
                    className="mobile-drawer-link block w-full text-left text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="block">{t('navbar.postTask')}</span>
                    <span className="block text-sm font-medium text-gray-600">{t('navbar.workRequired')}</span>
                  </button>
                  ) : (
                  <Link
                    href="/tasks/new"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="block">{t('navbar.postTask')}</span>
                    <span className="block text-sm font-medium text-gray-600">{t('navbar.workRequired')}</span>
                  </Link>
                  )}
                  {userPaused ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowPausedModal(true) }}
                    className="mobile-drawer-link block w-full text-left text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('navbar.browseAllHelpers')}
                  </button>
                  ) : (
                  <Link
                    href="/helpers"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('navbar.browseAllHelpers')}
                  </Link>
                  )}
                  {userPaused ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowPausedModal(true) }}
                    className="mobile-drawer-link block w-full text-left text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('navbar.browseProfessionals')}
                  </button>
                  ) : (
                  <Link
                    href="/professionals"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('navbar.browseProfessionals')}
                  </Link>
                  )}
                  <Link
                    href="/help"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('navbar.howItWorks')}
                  </Link>
                </>
              )}
            </div>

            {/* FIND WORK Section (collapsed by default; matches desktop dropdown) */}
            <div className="px-4 py-2">
              <button
                type="button"
                onClick={() => setMobileExpandedSection((prev) => (prev === 'tasks' ? null : 'tasks'))}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 rounded-xl px-3 py-2 bg-white border border-slate-200 shadow-sm"
              >
                <span>{t('navbar.tasks')}</span>
                <svg className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'tasks' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileExpandedSection === 'tasks' && (
                <>
                  <Link
                    href="/tasks"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('navbar.browseTasks')}
                  </Link>
                  <Link
                    href="/become-a-helper"
                    className="block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('navbar.howToEarn')}
                  </Link>
                  <Link
                    href="/help"
                    className="block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('navbar.taskerGuidelines')}
                  </Link>
                </>
              )}
            </div>

            {/* Support + Pricing links (match desktop top-level links) */}
            <div className="px-4 py-2">
              <Link
                href="/help"
                className="mobile-drawer-link block text-slate-800 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white shadow-sm transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.help')}
              </Link>
              <Link
                href="/pricing"
                className="mobile-drawer-link mt-2 block text-slate-800 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white shadow-sm transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.price')}
              </Link>
            </div>

            {/* Footer links mirrored in mobile pullout (kept in footer too) */}
            <div className="px-4 py-2">
              <button
                type="button"
                onClick={() => setMobileExpandedSection((prev) => (prev === 'more' ? null : 'more'))}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 rounded-xl px-3 py-2 bg-white border border-slate-200 shadow-sm"
              >
                <span>MORE</span>
                <svg className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'more' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileExpandedSection === 'more' && (
                <>
                  <Link
                    href="/about"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('footer.aboutUs')}
                  </Link>
                  <Link
                    href="/privacy"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('footer.privacyPolicy')}
                  </Link>
                  <Link
                    href="/terms"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('footer.termsOfService')}
                  </Link>
                  <Link
                    href="/advertising-opportunities"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('footer.advertising')}
                  </Link>
                  <Link
                    href="/partnerships"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('footer.partner')}
                  </Link>
                  <Link
                    href="/blog"
                    className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('footer.blog')}
                  </Link>
                  <Link
                    href="/contact"
                    className="block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('footer.contact')}
                  </Link>
                  <div className="mt-2">
                    <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">SOCIALS</p>
                    <a
                      href="https://www.facebook.com/groups/taskorilla/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Facebook
                    </a>
                    <a
                      href="https://www.instagram.com/taskorilla"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Instagram
                    </a>
                    <a
                      href="https://www.tiktok.com/@taskorilla"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      TikTok
                    </a>
                    <a
                      href="https://www.youtube.com/@gettaskorilla"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mobile-drawer-link block text-slate-700 hover:text-primary-700 hover:bg-primary-50/70 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      YouTube
                    </a>
                  </div>
                </>
              )}
            </div>

            {user ? (
              <>
                {acceptedBidsCount > 0 && firstAcceptedTaskId && (
                  <Link
                    href={`/tasks/${firstAcceptedTaskId}`}
                    className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium bg-purple-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Bid WON ({acceptedBidsCount > 99 ? '99+' : acceptedBidsCount}) - View your task!
                  </Link>
                )}
                <Link
                  href="/messages"
                  className={`mobile-drawer-link block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium ${unreadCount > 0 ? 'bg-red-50' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {unreadCount > 0
                    ? `📩 ${t('navbar.inbox')} (${unreadCount > 99 ? '99+' : unreadCount})`
                    : `📩 ${t('navbar.inbox')}`}
                </Link>
                {pendingReviewsCount > 0 && (
                  <Link
                    href={firstPendingReviewTaskId ? `/tasks/${firstPendingReviewTaskId}` : '/tasks?filter=my_tasks&pending_reviews=true'}
                    className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Actions ({pendingReviewsCount > 99 ? '99+' : pendingReviewsCount})
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#8B4513' }}
                  >
                    Admin
                  </Link>
                )}
                {userPaused ? (
                <button
                  onClick={() => { setMobileMenuOpen(false); setShowPausedModal(true) }}
                  className="block w-full text-left text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                >
                  {t('navbar.profile')}
                </button>
                ) : (
                <Link
                  href="/profile"
                  className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('navbar.profile')}
                </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="mobile-drawer-link inline-flex items-center justify-center self-start bg-primary-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-primary-700"
                >
                  {t('navbar.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="mobile-drawer-link block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  LOGIN
                </Link>
              </>
            )}
            </div>
          </div>
        </div>
        </div>
    </nav>

    {/* Mobile persistent bottom nav */}
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-16">
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className={`flex flex-col items-center justify-center text-[11px] font-medium ${
            isHomeActive ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <BottomNavIcon active={isHomeActive} pathD="M3 11.5L12 4l9 7.5M6.5 10v9h11v-9" />
          <span>Home</span>
        </Link>

        <Link
          href="/tasks"
          onClick={() => setMobileMenuOpen(false)}
          className={`flex flex-col items-center justify-center text-[11px] font-medium ${
            isBrowseActive ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <BottomNavIcon active={isBrowseActive} pathD="M11 19a8 8 0 1 1 5.3-14l.2.2A8 8 0 0 1 11 19zm10 2-4.3-4.3" />
          <span>See Tasks</span>
        </Link>

        {userPaused ? (
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              setShowPausedModal(true)
            }}
            className={`flex flex-col items-center justify-center text-[11px] font-medium ${
              isPostActive ? 'text-primary-600' : 'text-gray-600'
            }`}
          >
            <BottomNavIcon active={isPostActive} pathD="M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18zm0 4v10M7 12h10" />
            <span>Post Tasks</span>
          </button>
        ) : (
          <Link
            href="/tasks/new"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex flex-col items-center justify-center text-[11px] font-medium ${
              isPostActive ? 'text-primary-600' : 'text-gray-600'
            }`}
          >
            <BottomNavIcon active={isPostActive} pathD="M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18zm0 4v10M7 12h10" />
            <span>Post Tasks</span>
          </Link>
        )}

        {user ? (
          userPaused ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setShowPausedModal(true)
              }}
              className={`relative flex flex-col items-center justify-center text-[11px] font-medium ${
                isMyBidsActive ? 'text-primary-600' : 'text-gray-600'
              }`}
            >
              <BottomNavIcon active={isMyBidsActive} pathD="M4 8h16v10H4zM9 8V6h6v2M4 12h16" />
              <span>My Bids</span>
              {hasPendingBids && pendingBidsCount > 0 && !bidsViewed && (
                <span className="absolute top-2 right-6 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>
          ) : (
            <Link
              href="/tasks?filter=my_bids"
              onClick={() => {
                setMobileMenuOpen(false)
                window.dispatchEvent(new Event('bids-viewed'))
              }}
              className={`relative flex flex-col items-center justify-center text-[11px] font-medium ${
                isMyBidsActive ? 'text-primary-600' : 'text-gray-600'
              }`}
            >
              <BottomNavIcon active={isMyBidsActive} pathD="M4 8h16v10H4zM9 8V6h6v2M4 12h16" />
              <span>My Bids</span>
              {hasPendingBids && pendingBidsCount > 0 && !bidsViewed && (
                <span className="absolute top-2 right-6 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </Link>
          )
        ) : (
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex flex-col items-center justify-center text-[11px] font-medium text-gray-600"
          >
            <BottomNavIcon active={false} pathD="M4 8h16v10H4zM9 8V6h6v2M4 12h16" />
            <span>My Bids</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center text-[11px] font-medium ${
            mobileMenuOpen ? 'text-primary-600' : 'text-gray-600'
          }`}
        >
          <BottomNavIcon active={mobileMenuOpen} pathD="M4 7h16M4 12h16M4 17h16" />
          <span>Menu</span>
        </button>
      </div>
    </div>

    <style jsx global>{`
      @keyframes drawerLinkSlideIn {
        0% { opacity: 0; transform: translateX(-10px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      .mobile-drawer-open .mobile-drawer-link {
        opacity: 0;
        animation: drawerLinkSlideIn 280ms ease-out forwards;
      }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(1) { animation-delay: 20ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(2) { animation-delay: 40ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(3) { animation-delay: 60ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(4) { animation-delay: 80ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(5) { animation-delay: 100ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(6) { animation-delay: 120ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(7) { animation-delay: 140ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(8) { animation-delay: 160ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(9) { animation-delay: 180ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(10) { animation-delay: 200ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(11) { animation-delay: 220ms; }
      .mobile-drawer-open .mobile-drawer-link:nth-of-type(12) { animation-delay: 240ms; }
    `}</style>

    {showPausedModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]" onClick={() => setShowPausedModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-4xl block mb-3">⏸</span>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Account Paused</h2>
          <p className="text-sm text-gray-600 mb-4">
            Your account has been paused. You cannot access this feature right now.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/contact"
              onClick={() => setShowPausedModal(false)}
              className="inline-block px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
            >
              Contact support
            </Link>
            <button
              onClick={() => setShowPausedModal(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}


