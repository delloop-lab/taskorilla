'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getPendingReviews } from '@/lib/review-utils'
import { useLanguage } from '@/lib/i18n'

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [pendingBidsCount, setPendingBidsCount] = useState<number>(0)
  const [hasPendingBids, setHasPendingBids] = useState<boolean>(false) // Track if user has ANY pending bids
  const [bidsViewed, setBidsViewed] = useState<boolean>(false) // Track if user has viewed bids this session
  const [acceptedBidsCount, setAcceptedBidsCount] = useState<number>(0)
  const [firstAcceptedTaskId, setFirstAcceptedTaskId] = useState<string | null>(null)
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0)
  const [firstPendingReviewTaskId, setFirstPendingReviewTaskId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tasksMenuOpen, setTasksMenuOpen] = useState(false)
  const [helpersMenuOpen, setHelpersMenuOpen] = useState(false)
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [tasksMenuTimeout, setTasksMenuTimeout] = useState<NodeJS.Timeout | null>(null)
  const [helpersMenuTimeout, setHelpersMenuTimeout] = useState<NodeJS.Timeout | null>(null)
  const [helpMenuTimeout, setHelpMenuTimeout] = useState<NodeJS.Timeout | null>(null)
  const router = useRouter()

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
          .select('full_name, avatar_url, role')
          .eq('id', user.id)
          .single()

        setProfileName(data?.full_name || null)
        setProfileAvatar(data?.avatar_url || null)
        setUserRole(data?.role || 'user')
      } else {
        setProfileName(null)
        setProfileAvatar(null)
        setUserRole(null)
        setUnreadCount(0)
      }
    }

    loadProfile()
  }, [user])

  useEffect(() => {
    if (!user?.id) return

    const loadUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false)

        if (error) {
          console.error('Error loading unread count:', error)
          // If is_read column doesn't exist, set count to 0
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

    const loadPendingBids = async () => {
      try {
        console.log('🔔 Loading pending bids for user:', user.id)
        
        // Get user's open tasks (excluding archived and hidden)
        // Use or filter to handle cases where columns might be NULL (not explicitly false)
        const { data: userTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, title, status, archived, hidden_by_admin')
          .eq('created_by', user.id)
          .eq('status', 'open')
          .or('archived.eq.false,archived.is.null')
          .or('hidden_by_admin.eq.false,hidden_by_admin.is.null')

        if (tasksError) {
          console.error('Error loading user tasks:', tasksError)
          return
        }

        console.log('🔔 User open tasks (non-archived, non-hidden):', userTasks?.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          archived: t.archived,
          hidden_by_admin: t.hidden_by_admin
        })))

        // Debug: Also fetch ALL tasks by user to see what's being filtered out
        const { data: allUserTasks } = await supabase
          .from('tasks')
          .select('id, title, status, archived, hidden_by_admin')
          .eq('created_by', user.id)
        
        console.log('🔔 ALL user tasks (for debugging):', allUserTasks?.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          archived: t.archived,
          hidden_by_admin: t.hidden_by_admin,
          shouldCount: t.status === 'open' && !t.archived && !t.hidden_by_admin
        })))

        if (!userTasks || userTasks.length === 0) {
          console.log('🔔 No open tasks found for user')
          setPendingBidsCount(0)
          setHasPendingBids(false)
          return
        }

        const taskIds = userTasks.map(t => t.id)

        // Get pending bids on those tasks from OTHER users (not the task creator)
        // Count unique tasks with pending bids (not total bid count)
        const { data: bidsOnMyTasks, error: bidsError } = await supabase
          .from('bids')
          .select('task_id, user_id')
          .in('task_id', taskIds)
          .eq('status', 'pending')
          .neq('user_id', user.id) // Only bids from other users, not the task creator

        if (bidsError) {
          console.error('Error counting pending bids:', bidsError)
          return
        }

        // Count unique tasks that have pending bids (not total bid count)
        // This matches the filter logic which shows unique tasks
        const uniqueTaskIdsWithBids = bidsOnMyTasks 
          ? [...new Set(bidsOnMyTasks.map(bid => bid.task_id))] 
          : []
        
        const bidCount = uniqueTaskIdsWithBids.length
        console.log('🔔 Pending bids - Total bids:', bidsOnMyTasks?.length || 0, 'Unique tasks with bids:', bidCount, 'Task IDs:', uniqueTaskIdsWithBids)
        setPendingBidsCount(bidCount)
        setHasPendingBids(bidCount > 0)
        
        // If there are new bids and user had previously viewed, show badge again
        if (bidCount > 0) {
          setBidsViewed(false)
        }
      } catch (error) {
        console.error('Error loading pending bids:', error)
      }
    }

    loadPendingBids()

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
      window.removeEventListener('bids-viewed', handleBidsViewed)
      supabase.removeChannel(channel)
    }
  }, [user])

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
        const pendingReviews = await getPendingReviews(user.id)
        setPendingReviewsCount(pendingReviews.length)
        // Store the first pending review's task ID for direct navigation
        setFirstPendingReviewTaskId(pendingReviews.length > 0 ? pendingReviews[0].task_id : null)
      } catch (error) {
        console.error('Error loading pending reviews:', error)
      }
    }

    loadPendingReviews()

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
      if (helpMenuTimeout) clearTimeout(helpMenuTimeout)
    }
  }, [tasksMenuTimeout, helpersMenuTimeout, helpMenuTimeout])

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

  if (loading) {
    return (
      <nav className="bg-white shadow-sm relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center text-xl font-bold" style={{ color: '#8B4513' }}>
              <img 
                src="/images/taskorilla_header_logo.png" 
                alt="Taskorilla" 
                className="h-[40px] object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
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
              className="relative"
              onMouseEnter={() => {
                // Clear any pending timeout
                if (tasksMenuTimeout) {
                  clearTimeout(tasksMenuTimeout)
                  setTasksMenuTimeout(null)
                }
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
              <button
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {t('navbar.tasks')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {tasksMenuOpen && (
                <>
                  {/* Invisible bridge area to make it easier to move mouse to submenu */}
                  <div className="absolute top-full left-0 w-full h-4" />
                  <div
                    className="absolute top-full left-0 mt-4 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
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
                      href="/tasks/new"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.postTask')}
                    </Link>
                    <Link
                      href="/tasks"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseTasks')}
                    </Link>
                  </div>
                </>
              )}
            </div>
            {/* HELPERS Dropdown Menu */}
            <div 
              className="relative"
              onMouseEnter={() => {
                // Clear any pending timeout
                if (helpersMenuTimeout) {
                  clearTimeout(helpersMenuTimeout)
                  setHelpersMenuTimeout(null)
                }
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
              <button
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {t('navbar.helpers')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {helpersMenuOpen && (
                <>
                  {/* Invisible bridge area to make it easier to move mouse to submenu */}
                  <div className="absolute top-full left-0 w-full h-4" />
                  <div
                    className="absolute top-full left-0 mt-4 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
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
                    <Link
                      href="/helpers"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseAllHelpers')}
                    </Link>
                    <Link
                      href="/professionals"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.browseProfessionals')}
                    </Link>
                  </div>
                </>
              )}
            </div>
            {/* HELP Dropdown Menu */}
            <div 
              className="relative"
              onMouseEnter={() => {
                // Clear any pending timeout
                if (helpMenuTimeout) {
                  clearTimeout(helpMenuTimeout)
                  setHelpMenuTimeout(null)
                }
                setHelpMenuOpen(true)
              }}
              onMouseLeave={() => {
                // Add longer delay before closing
                const timeout = setTimeout(() => {
                  setHelpMenuOpen(false)
                }, 400) // 400ms delay - gives more time to move mouse
                setHelpMenuTimeout(timeout)
              }}
            >
              <button
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {t('navbar.help')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {helpMenuOpen && (
                <>
                  {/* Invisible bridge area to make it easier to move mouse to submenu */}
                  <div className="absolute top-full left-0 w-full h-4" />
                  <div
                    className="absolute top-full left-0 mt-4 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                    onMouseEnter={() => {
                      // Keep menu open when hovering over submenu
                      if (helpMenuTimeout) {
                        clearTimeout(helpMenuTimeout)
                        setHelpMenuTimeout(null)
                      }
                    }}
                    onMouseLeave={() => {
                      // Delay closing when leaving submenu
                      const timeout = setTimeout(() => {
                        setHelpMenuOpen(false)
                      }, 400)
                      setHelpMenuTimeout(timeout)
                    }}
                  >
                    <Link
                      href="/help"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.helpCenter')}
                    </Link>
                    <Link
                      href="/help/faq"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.faqs')}
                    </Link>
                    <Link
                      href="/help/guides"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.guides')}
                    </Link>
                    <a
                      href="mailto:tee@taskorilla.com"
                      className="block px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border-l-2 border-transparent hover:border-primary-600 transition-all duration-200 font-medium"
                    >
                      {t('navbar.contactSupport')}
                    </a>
                  </div>
                </>
              )}
            </div>
            {/* Language Switcher */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Language switch clicked: EN')
                  setLanguage('en')
                }}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-[#FD9212] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={t('language.switchToEnglish')}
              >
                EN
              </button>
              <div className="w-px h-6 bg-gray-300" />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Language switch clicked: PT')
                  setLanguage('pt')
                }}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  language === 'pt'
                    ? 'bg-[#FD9212] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={t('language.switchToPortuguese')}
              >
                PT
              </button>
            </div>
            {user ? (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
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
                {unreadCount > 0 && (
                  <Link
                    href="/messages"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium relative"
                  >
                    Messages
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 transform translate-x-1/2 -translate-y-1/2">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </Link>
                )}
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
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                {user && (
                  <div className="flex items-center">
                    <div 
                      className="h-8 w-8 aspect-square rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 min-w-[32px] min-h-[32px]"
                      style={{ aspectRatio: '1 / 1' }}
                    >
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="avatar" className="w-full h-full object-cover object-center" />
                      ) : (
                        <span className="text-sm font-semibold text-gray-600">
                          {(profileName?.[0] || user.email?.[0] || '?').toUpperCase()}
                        </span>
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
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Language Switcher - Mobile (visible outside menu) */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden mr-2">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setLanguage('en')
                }}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-[#FD9212] text-white'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
                title={t('language.switchToEnglish')}
              >
                EN
              </button>
              <div className="w-px h-5 bg-gray-300" />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setLanguage('pt')
                }}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  language === 'pt'
                    ? 'bg-[#FD9212] text-white'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
                title={t('language.switchToPortuguese')}
              >
                PT
              </button>
            </div>
            {user && unreadCount > 0 && (
              <Link
                href="/messages"
                className="text-gray-700 hover:text-primary-600 p-2 rounded-md relative"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 transform translate-x-1/2 -translate-y-1/2">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-primary-600 p-2 rounded-md"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            {user && (
              <div className="flex items-center space-x-2 px-4 py-2">
                <div 
                  className="h-10 w-10 aspect-square rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 min-w-[40px] min-h-[40px]"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="avatar" className="w-full h-full object-cover object-center" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">
                      {(profileName?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {profileName || user.email}
                </span>
              </div>
            )}
            {/* TASKS Section */}
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('navbar.tasks')}</h3>
              <Link
                href="/tasks/new"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.postTask')}
              </Link>
              <Link
                href="/tasks"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.browseTasks')}
              </Link>
            </div>

            {/* HELPERS Section */}
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('navbar.helpers')}</h3>
              <Link
                href="/helpers"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.browseAllHelpers')}
              </Link>
              <Link
                href="/professionals"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.browseProfessionals')}
              </Link>
            </div>

            {/* HELP Section */}
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('navbar.help')}</h3>
              <Link
                href="/help"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.helpCenter')}
              </Link>
              <Link
                href="/help/faq"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.faqs')}
              </Link>
              <Link
                href="/help/guides"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.guides')}
              </Link>
              <a
                href="mailto:tee@taskorilla.com"
                className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('navbar.contactSupport')}
              </a>
            </div>

            {user ? (
              <>
                <Link
                  href="/tasks?filter=my_bids"
                  className={`block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium ${hasPendingBids && pendingBidsCount > 0 && !bidsViewed ? 'bg-orange-50' : ''}`}
                  onClick={(e) => {
                    console.log('🔍 Mobile Bids link clicked, navigating to /tasks?filter=my_bids')
                    window.dispatchEvent(new Event('bids-viewed'))
                    setMobileMenuOpen(false)
                  }}
                >
                  <span className="flex items-center gap-2">
                    Bids
                    {hasPendingBids && pendingBidsCount > 0 && !bidsViewed && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                      </span>
                    )}
                  </span>
                </Link>
                {acceptedBidsCount > 0 && firstAcceptedTaskId && (
                  <Link
                    href={`/tasks/${firstAcceptedTaskId}`}
                    className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium bg-purple-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Bid WON ({acceptedBidsCount > 99 ? '99+' : acceptedBidsCount}) - View your task!
                  </Link>
                )}
                {unreadCount > 0 && (
                  <Link
                    href="/messages"
                    className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium bg-red-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📩 Messages ({unreadCount > 99 ? '99+' : unreadCount})
                  </Link>
                )}
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
                <Link
                  href="/profile"
                  className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('navbar.profile')}
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  {t('navbar.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('navbar.login')}
                </Link>
                <Link
                  href="/register"
                  className="block bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('navbar.signup')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
    </>
  )
}


