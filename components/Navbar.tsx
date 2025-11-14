'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()

        setProfileName(data?.full_name || null)
        setProfileAvatar(data?.avatar_url || null)
      } else {
        setProfileName(null)
        setProfileAvatar(null)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfileName(null)
    setProfileAvatar(null)
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2 text-xl font-bold" style={{ color: '#8B4513' }}>
              <img 
                src="/images/taskorilla-mascot.png" 
                alt="Taskorilla" 
                className="h-8 w-8 object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
              <span>Taskorilla</span>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold" style={{ color: '#8B4513' }}>
            <img 
              src="/images/taskorilla-mascot.png" 
              alt="Taskorilla" 
              className="h-8 w-8 object-contain"
              style={{ backgroundColor: 'transparent' }}
            />
            <span className="hidden sm:inline">Taskorilla</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">
                      {(profileName?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-blue-600 hidden lg:inline">
                  {profileName || user.email}
                </span>
              </div>
            )}
            <Link
              href="/tasks"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Browse Tasks
            </Link>
            
            {user ? (
              <>
                <Link
                  href="/tasks/new"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Post Task
                </Link>
                <Link
                  href="/messages"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium relative"
                >
                  Messages
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1 transform translate-x-1/2 -translate-y-1/2">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login?redirect=/tasks/new')}
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Post Task
                </button>
                <button
                  onClick={() => router.push('/login?redirect=/messages')}
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Messages
                </button>
              </>
            )}
            <Link
              href="/profile"
              className={`text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium ${!user ? 'hidden' : ''}`}
            >
              Profile
            </Link>
            {user ? (
              <button
                onClick={handleLogout}
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
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
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="avatar" className="h-full w-full object-cover" />
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
            <Link
              href="/tasks"
              className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Tasks
            </Link>
            {user ? (
              <>
                <Link
                  href="/tasks/new"
                  className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Post Task
                </Link>
                <Link
                  href="/messages"
                  className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Messages {unreadCount > 0 && `(${unreadCount > 99 ? '99+' : unreadCount})`}
                </Link>
                <Link
                  href="/profile"
                  className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    router.push('/login?redirect=/tasks/new')
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Post Task
                </button>
                <button
                  onClick={() => {
                    router.push('/login?redirect=/messages')
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Messages
                </button>
                <Link
                  href="/login"
                  className="block text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}


