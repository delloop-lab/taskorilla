'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { getTrafficStats, getDailyTrafficSummary, getDailyTrafficStats } from '@/lib/traffic'
import StandardModal from '@/components/StandardModal'
import { User } from '@/lib/types'
import { STANDARD_SKILLS, STANDARD_SERVICES } from '@/lib/helper-constants'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

// AppUser extends User and includes languages and other custom fields
interface AppUser extends User {
  languages?: string[] | null
  role?: string // Add role field for admin page usage
}

type Task = { 
  id: string
  title: string
  status: string
  assigned_to: string | null
  created_by: string
  created_at: string
  budget?: number
  category?: string
  hidden_by_admin?: boolean
  hidden_reason?: string | null
}

type Bid = {
  id: string
  task_id: string
  user_id: string
  amount: number
  status: string
  created_at: string
}

type Review = {
  id: string
  rating: number
  created_at: string
}

type Traffic = {
  page: string
  visits: number
}

type DailyTraffic = {
  date: string
  visits: number
}

export default function SuperadminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AppUser[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [bids, setBids] = useState<Bid[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [traffic, setTraffic] = useState<Traffic[]>([])
  const [dailyTraffic, setDailyTraffic] = useState<DailyTraffic[]>([])
  const [trafficDays, setTrafficDays] = useState<number>(30)
  const [tab, setTab] = useState<'users' | 'tasks' | 'stats' | 'revenue' | 'email' | 'traffic' | 'email_logs' | 'settings' | 'reports' | 'skills_services'>('users')
  const [reports, setReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string>('')
  
  // Use a ref to track modal state to avoid closure issues
  const showDeleteConfirmModalRef = useRef(false)
  const reportToDeleteRef = useRef<string | null>(null)
  
  // Sync refs with state
  useEffect(() => {
    showDeleteConfirmModalRef.current = showDeleteConfirmModal
    reportToDeleteRef.current = reportToDelete
    console.log('🔴 [STATE SYNC] Updated refs - showDeleteConfirmModal:', showDeleteConfirmModal, 'reportToDelete:', reportToDelete)
  }, [showDeleteConfirmModal, reportToDelete])

  // Debug logging for modal state
  useEffect(() => {
    console.log('🔴 [MODAL STATE] showDeleteConfirmModal changed to:', showDeleteConfirmModal)
    console.log('🔴 [MODAL STATE] reportToDelete:', reportToDelete)
  }, [showDeleteConfirmModal, reportToDelete])
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [emailMessage, setEmailMessage] = useState('')
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<string>('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [sendingProfileEmail, setSendingProfileEmail] = useState<string | null>(null)
  const [confirmingEmail, setConfirmingEmail] = useState<string | null>(null)
  const [managingBadgesFor, setManagingBadgesFor] = useState<User | null>(null)
  const [selectedBadges, setSelectedBadges] = useState<string[]>([])
  const [savingBadges, setSavingBadges] = useState(false)
  const [showBadgeSuccessModal, setShowBadgeSuccessModal] = useState(false)
  const [showEmailSuccessModal, setShowEmailSuccessModal] = useState(false)
  const [emailSuccessRecipient, setEmailSuccessRecipient] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [modalConfirmText, setModalConfirmText] = useState<string>('OK')
  const [taskSearchTerm, setTaskSearchTerm] = useState<string>('')
  const [geocodingTasks, setGeocodingTasks] = useState(false)
  const [geocodingResult, setGeocodingResult] = useState<any>(null)
  const [regeocodingPortuguese, setRegeocodingPortuguese] = useState(false)
  const [regeocodingResult, setRegeocodingResult] = useState<any>(null)
  
  // Skills & Services state
  const [allSkills, setAllSkills] = useState<string[]>([])
  const [allServices, setAllServices] = useState<string[]>([])
  const [loadingSkillsServices, setLoadingSkillsServices] = useState(false)
  
  // Platform fee settings
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(10) // 10% deducted from helper payout
  const [taskerServiceFee, setTaskerServiceFee] = useState<number>(2) // €2 added to tasker's payment
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  
  // Revenue tracking
  const [revenue, setRevenue] = useState<{
    tasks: Array<{
      id: string
      title: string
      budget: number
      service_fee: number
      platform_fee: number
      total_revenue: number
      completed_at: string
      tasker_email: string | null
      helper_email: string | null
    }>
    totalRevenue: number
    totalServiceFees: number
    totalPlatformFees: number
    totalTasks: number
    dailyRevenue: Array<{ date: string; revenue: number; tasks: number }>
  }>({ tasks: [], totalRevenue: 0, totalServiceFees: 0, totalPlatformFees: 0, totalTasks: 0, dailyRevenue: [] })
  
  // Standard modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  })
  
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null)
  const [pendingBulkDelete, setPendingBulkDelete] = useState<boolean>(false)
  const usersChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const tasksChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  
  const availableBadges = ['Fast Responder', 'Top Helper', 'Expert Skills']

  function toggleUserSelection(userId: string) {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  function selectAllUsers() {
    setSelectedUserIds(new Set(users.map(u => u.id)))
  }

  function clearSelection() {
    setSelectedUserIds(new Set())
  }

  function getSelectedUsers() {
    return users.filter(u => selectedUserIds.has(u.id))
  }

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'superadmin') {
        router.push('/')
        return
      }

      setLoading(false)
      fetchUsers()
      fetchTasks()
      fetchBids()
      fetchReviews()
      fetchMessages()
      fetchRevenue()
      fetchTraffic()
      fetchEmailLogs()
      fetchPlatformSettings()
      fetchReports()
      loadSkillsAndServices()
    }
    
    checkRole()
  }, [])

  // Load skills and services when tab is switched to skills_services
  useEffect(() => {
    if (tab === 'skills_services' && allSkills.length === 0 && !loadingSkillsServices) {
      loadSkillsAndServices()
    }
  }, [tab, allSkills.length, loadingSkillsServices])

  // Debug logging for modal state
  useEffect(() => {
    console.log('🔴 [MODAL STATE] showDeleteConfirmModal:', showDeleteConfirmModal)
    console.log('🔴 [MODAL STATE] reportToDelete:', reportToDelete)
    console.log('🔴 [MODAL STATE] showDeleteErrorModal:', showDeleteErrorModal)
  }, [showDeleteConfirmModal, reportToDelete, showDeleteErrorModal])

  useEffect(() => {
    // Setup subscriptions and store channel references
    usersChannelRef.current = supabase
      .channel('admin-users-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchUsers()
      })
      .subscribe()

    tasksChannelRef.current = supabase
      .channel('admin-tasks-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, () => {
        fetchTasks()
      })
      .subscribe()

    return () => {
      // Clean up subscriptions
      if (usersChannelRef.current) {
        supabase.removeChannel(usersChannelRef.current)
        usersChannelRef.current = null
      }
      if (tasksChannelRef.current) {
        supabase.removeChannel(tasksChannelRef.current)
        tasksChannelRef.current = null
      }
    }
  }, [router])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('name')

      if (error) throw error
      // Categories are loaded but not stored in state in admin page
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadSkillsAndServices = async () => {
    try {
      setLoadingSkillsServices(true)
      
      // Query all profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('skills, services_offered')

      if (error) throw error

      // Extract unique skills
      const allSkillsSet = new Set<string>()
      // Add standard skills
      STANDARD_SKILLS.forEach(skill => allSkillsSet.add(skill))
      // Extract from profiles
      if (profiles) {
        profiles.forEach(profile => {
          if (profile.skills && Array.isArray(profile.skills)) {
            profile.skills.forEach((skill: string) => {
              if (skill && skill.trim()) {
                allSkillsSet.add(skill.trim())
              }
            })
          }
        })
      }
      const sortedSkills = Array.from(allSkillsSet).sort()

      // Extract unique services
      const allServicesSet = new Set<string>()
      // Add standard services
      STANDARD_SERVICES.forEach(service => allServicesSet.add(service))
      // Extract from profiles
      if (profiles) {
        profiles.forEach(profile => {
          if (profile.services_offered && Array.isArray(profile.services_offered)) {
            profile.services_offered.forEach((service: string) => {
              if (service && service.trim()) {
                allServicesSet.add(service.trim())
              }
            })
          }
        })
      }
      const sortedServices = Array.from(allServicesSet).sort()

      setAllSkills(sortedSkills)
      setAllServices(sortedServices)
    } catch (error) {
      console.error('Error loading skills and services:', error)
    } finally {
      setLoadingSkillsServices(false)
    }
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at, is_helper, badges, is_featured, languages')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
    } else if (data) {
      setUsers(data)
    }
  }

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, assigned_to, created_by, created_at, budget, category, hidden_by_admin, hidden_reason')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else if (data) {
      setTasks(data)
    }
  }

  async function fetchReports() {
    setLoadingReports(true)
    try {
      // Fetch reports first
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (reportsError) {
        console.error('Error fetching reports:', reportsError)
        setReports([])
        return
      }

      if (!reportsData || reportsData.length === 0) {
        setReports([])
        return
      }

      // Get unique IDs for related data
      const reporterIds = [...new Set(reportsData.map(r => r.reported_by).filter(Boolean))]
      const taskIds = [...new Set(reportsData.filter(r => r.task_id).map(r => r.task_id).filter(Boolean))]
      const userIds = [...new Set(reportsData.filter(r => r.reported_user_id).map(r => r.reported_user_id).filter(Boolean))]
      const reviewerIds = [...new Set(reportsData.filter(r => r.reviewed_by).map(r => r.reviewed_by).filter(Boolean))]

      // Fetch related data in parallel
      const [reportersResult, tasksResult, usersResult, reviewersResult] = await Promise.all([
        reporterIds.length > 0 ? supabase.from('profiles').select('id, email, full_name').in('id', reporterIds) : { data: [], error: null },
        taskIds.length > 0 ? supabase.from('tasks').select('id, title').in('id', taskIds) : { data: [], error: null },
        userIds.length > 0 ? supabase.from('profiles').select('id, email, full_name').in('id', userIds) : { data: [], error: null },
        reviewerIds.length > 0 ? supabase.from('profiles').select('id, email, full_name').in('id', reviewerIds) : { data: [], error: null }
      ])

      // Combine reports with related data
      const reportsWithData = reportsData.map(report => ({
        ...report,
        reporter: reportersResult.data?.find(p => p.id === report.reported_by),
        reported_task: tasksResult.data?.find(t => t.id === report.task_id),
        reported_user: usersResult.data?.find(u => u.id === report.reported_user_id),
        reviewer: reviewersResult.data?.find(r => r.id === report.reviewed_by)
      }))

      setReports(reportsWithData)
    } catch (error) {
      console.error('Error fetching reports:', error)
      setReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const handleDeleteClick = (reportId: string, e?: React.MouseEvent) => {
    console.log('🔴 [DELETE] ========== DELETE BUTTON CLICKED ==========')
    console.log('🔴 [DELETE] Event object:', e)
    console.log('🔴 [DELETE] ReportId:', reportId)
    console.log('🔴 [DELETE] Current showDeleteConfirmModal state:', showDeleteConfirmModal)
    console.log('🔴 [DELETE] Current reportToDelete:', reportToDelete)
    
    // CRITICAL: Prevent any default behavior or event propagation
    if (e) {
      console.log('🔴 [DELETE] Event details - type:', e.type, 'target:', e.target, 'currentTarget:', e.currentTarget)
      e.preventDefault()
      e.stopPropagation()
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation()
        e.nativeEvent.preventDefault()
      }
      console.log('🔴 [DELETE] Event prevented and stopped')
    }
    
    // CRITICAL: Don't proceed if modal is already open
    if (showDeleteConfirmModal) {
      console.log('🔴 [DELETE] Modal already open, ignoring click')
      return
    }
    
    console.log('🔴 [DELETE] Setting reportToDelete to:', reportId)
    // Use functional update to ensure we get the latest state
    setReportToDelete(reportId)
    reportToDeleteRef.current = reportId
    
    console.log('🔴 [DELETE] Setting showDeleteConfirmModal to: true')
    // Use functional update to ensure state is set correctly
    setShowDeleteConfirmModal((prev) => {
      console.log('🔴 [DELETE] setShowDeleteConfirmModal called, prev value:', prev)
      if (prev) {
        console.log('🔴 [DELETE] ⚠️ WARNING: Modal was already true!')
      }
      return true
    })
    showDeleteConfirmModalRef.current = true
    
    console.log('🔴 [DELETE] Refs updated - showDeleteConfirmModalRef:', showDeleteConfirmModalRef.current, 'reportToDeleteRef:', reportToDeleteRef.current)
    
    // CRITICAL: Verify state was actually set after a microtask
    Promise.resolve().then(() => {
      console.log('🔴 [DELETE] ========== STATE VERIFICATION (after microtask) ==========')
      console.log('🔴 [DELETE] showDeleteConfirmModalRef (after microtask):', showDeleteConfirmModalRef.current)
      console.log('🔴 [DELETE] reportToDeleteRef (after microtask):', reportToDeleteRef.current)
    })
    
    // Verify state was set - use refs to avoid closure issues
    const stateCheckInterval = setInterval(() => {
      // Read from refs to get current values, not closure values
      const currentModalState = showDeleteConfirmModalRef.current
      const currentReportId = reportToDeleteRef.current
      const modalInDOM = !!document.querySelector('[data-modal="standard-modal"]')
      
      console.log('🔴 [DELETE] ========== STATE CHECK (using refs) ==========')
      console.log('🔴 [DELETE] showDeleteConfirmModal (ref):', currentModalState)
      console.log('🔴 [DELETE] reportToDelete (ref):', currentReportId)
      console.log('🔴 [DELETE] Modal in DOM:', modalInDOM)
      
      if (!currentModalState && modalInDOM) {
        console.error('🔴 [DELETE] ⚠️ STATE MISMATCH: Ref is false but modal is in DOM!')
        console.error('🔴 [DELETE] This suggests state was reset but portal kept modal visible')
        console.error('🔴 [DELETE] Forcing modal to stay visible by resetting state...')
        // Force the modal to stay open
        setShowDeleteConfirmModal(true)
        setReportToDelete(reportId)
      }
      
      if (!modalInDOM && currentModalState) {
        console.error('🔴 [DELETE] ⚠️ STATE MISMATCH: Ref is true but modal is NOT in DOM!')
      }
    }, 100)
    
    // Clear interval after 3 seconds
    setTimeout(() => clearInterval(stateCheckInterval), 3000)
  }

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) {
      console.error('handleDeleteConfirm called but reportToDelete is null')
      return
    }

    console.log('Delete confirmed for report:', reportToDelete)
    // Don't close the modal immediately - let it stay open during deletion
    // The modal will be closed in the finally block or on error
    setDeletingReportId(reportToDelete)
    
    try {
      // First, verify the report exists and check its status
      const reportToDeleteObj = reports.find(r => r.id === reportToDelete)
      
      if (!reportToDeleteObj) {
        setShowDeleteConfirmModal(false)
        setDeleteErrorMessage('Report not found in the list.')
        setShowDeleteErrorModal(true)
        setDeletingReportId(null)
        setReportToDelete(null)
        return
      }

      // Check if report status allows deletion (must be resolved or dismissed)
      if (reportToDeleteObj.status !== 'resolved' && reportToDeleteObj.status !== 'dismissed') {
        setShowDeleteConfirmModal(false)
        setDeleteErrorMessage(`Cannot delete report with status "${reportToDeleteObj.status}". Only resolved or dismissed reports can be deleted.`)
        setShowDeleteErrorModal(true)
        setDeletingReportId(null)
        setReportToDelete(null)
        return
      }

      // Verify current user is admin and get session
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setShowDeleteConfirmModal(false)
        setDeleteErrorMessage('Authentication error. Please log in again.')
        setShowDeleteErrorModal(true)
        setDeletingReportId(null)
        setReportToDelete(null)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError)
        setShowDeleteConfirmModal(false)
        setDeleteErrorMessage('Unable to verify your permissions. Please try again.')
        setShowDeleteErrorModal(true)
        setDeletingReportId(null)
        setReportToDelete(null)
        return
      }

      if (profile.role !== 'admin' && profile.role !== 'superadmin') {
        setShowDeleteConfirmModal(false)
        setDeleteErrorMessage('You do not have permission to delete reports. Admin access required.')
        setShowDeleteErrorModal(true)
        setDeletingReportId(null)
        setReportToDelete(null)
        return
      }

      // Log debug info
      console.log('Attempting to delete report:', {
        reportId: reportToDelete,
        reportStatus: reportToDeleteObj.status,
        userId: user.id,
        userRole: profile.role
      })

      // Attempt deletion
      const { data, error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportToDelete)
        .select()

      if (error) {
        console.error('Error deleting report:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // Provide more specific error message based on error code
        let errorMsg = error.message || 'Failed to delete report'
        if (error.code === '42501') {
          errorMsg = 'Permission denied. Please ensure you are logged in as an admin and the report status is "resolved" or "dismissed".'
        } else if (error.code === 'PGRST116') {
          errorMsg = 'Report not found. It may have already been deleted.'
        }
        
        setShowDeleteConfirmModal(false)
        setDeleteErrorMessage(errorMsg)
        setShowDeleteErrorModal(true)
        setDeletingReportId(null)
        setReportToDelete(null)
        return
      }

      // Verify deletion was successful
      if (!data || data.length === 0) {
        console.error('No rows deleted - RLS policy may be blocking deletion')
        console.error('Report details:', reportToDeleteObj)
        setShowDeleteConfirmModal(false)
        setDeleteErrorMessage('Failed to delete report. The deletion was blocked by security policy. Please ensure: 1) Report status is "resolved" or "dismissed", 2) You have admin/superadmin role.')
        setShowDeleteErrorModal(true)
        setDeletingReportId(null)
        setReportToDelete(null)
        return
      }

      console.log('Successfully deleted report:', data)

      // Successfully deleted - close confirmation modal and remove from local state
      setShowDeleteConfirmModal(false)
      setReports(reports.filter(r => r.id !== reportToDelete))
      
    } catch (error: any) {
      console.error('Error deleting report:', error)
      setShowDeleteConfirmModal(false)
      setDeleteErrorMessage(error.message || 'Failed to delete report. Please try again.')
      setShowDeleteErrorModal(true)
    } finally {
      setDeletingReportId(null)
      setReportToDelete(null)
    }
  }

  async function fetchRevenue() {
    // Fetch all paid tasks
    const { data: paidTasks, error } = await supabase
      .from('tasks')
      .select('id, title, budget, updated_at, payment_status, created_by, assigned_to')
      .eq('payment_status', 'paid')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching revenue:', error)
      return
    }

    if (!paidTasks || paidTasks.length === 0) {
      setRevenue({ tasks: [], totalRevenue: 0, totalServiceFees: 0, totalPlatformFees: 0, totalTasks: 0, dailyRevenue: [] })
      return
    }

    // Get user emails
    const userIds = Array.from(new Set([
      ...paidTasks.map(t => t.created_by).filter(Boolean),
      ...paidTasks.map(t => t.assigned_to).filter(Boolean)
    ]))
    
    let userEmails: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)
      
      if (profiles) {
        userEmails = profiles.reduce((acc, p) => {
          acc[p.id] = p.email
          return acc
        }, {} as Record<string, string>)
      }
    }

    const SERVICE_FEE = 2 // €2 service fee per task
    const PLATFORM_FEE_PERCENT = 10 // 10% platform fee

    const tasksWithRevenue = paidTasks
      .filter(task => task.budget != null && task.budget > 0)
      .map(task => {
        const budget = task.budget || 0
        const platformFee = budget * (PLATFORM_FEE_PERCENT / 100)
        return {
          id: task.id,
          title: task.title,
          budget: budget,
          service_fee: SERVICE_FEE,
          platform_fee: platformFee,
          total_revenue: SERVICE_FEE + platformFee,
          completed_at: task.updated_at,
          tasker_email: task.created_by ? userEmails[task.created_by] || null : null,
          helper_email: task.assigned_to ? userEmails[task.assigned_to] || null : null
        }
      })

    const totalServiceFees = tasksWithRevenue.length * SERVICE_FEE
    const totalPlatformFees = tasksWithRevenue.reduce((sum, t) => sum + t.platform_fee, 0)
    const totalRevenue = totalServiceFees + totalPlatformFees

    // Calculate daily revenue for chart (last 30 days)
    const dailyRevenueMap: Record<string, { revenue: number; tasks: number }> = {}
    const today = new Date()
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dailyRevenueMap[dateStr] = { revenue: 0, tasks: 0 }
    }

    // Fill in actual revenue
    tasksWithRevenue.forEach(task => {
      const dateStr = task.completed_at.split('T')[0]
      if (dailyRevenueMap[dateStr]) {
        dailyRevenueMap[dateStr].revenue += task.total_revenue
        dailyRevenueMap[dateStr].tasks += 1
      }
    })

    const dailyRevenue = Object.entries(dailyRevenueMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, revenue: data.revenue, tasks: data.tasks }))

    setRevenue({
      tasks: tasksWithRevenue,
      totalRevenue,
      totalServiceFees,
      totalPlatformFees,
      totalTasks: tasksWithRevenue.length,
      dailyRevenue
    })
  }

  async function fetchBids() {
    const { data, error } = await supabase
      .from('bids')
      .select('id, task_id, user_id, amount, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bids:', error)
    } else if (data) {
      setBids(data)
    }
  }

  async function fetchReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
    } else if (data) {
      setReviews(data)
    }
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching messages:', error)
    } else if (data) {
      setMessages(data)
    }
  }

  async function fetchTraffic() {
    const data = await getTrafficStats()
    if (data) {
      setTraffic(data)
    }
    // Also fetch daily traffic
    const dailyData = await getDailyTrafficSummary(trafficDays)
    if (dailyData) {
      setDailyTraffic(dailyData)
    }
  }

  async function fetchEmailLogs() {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100) // Limit to last 100 emails

    if (error) {
      console.error('Error fetching email logs:', error)
    } else if (data) {
      setEmailLogs(data)
    }
  }

  async function fetchPlatformSettings() {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value')

    if (error) {
      console.error('Error fetching platform settings:', error)
      // Table might not exist yet, use defaults
    } else if (data) {
      data.forEach((setting: { key: string; value: string }) => {
        if (setting.key === 'platform_fee_percent') {
          setPlatformFeePercent(parseFloat(setting.value) || 10)
        } else if (setting.key === 'tasker_service_fee') {
          setTaskerServiceFee(parseFloat(setting.value) || 2)
        }
      })
      setSettingsLoaded(true)
    }
  }

  async function savePlatformSettings() {
    setSavingSettings(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Update platform fee
      const { error: error1 } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'platform_fee_percent',
          value: platformFeePercent.toString(),
          description: 'Percentage deducted from helper payout (e.g., 10 = 10%)',
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: 'key' })

      if (error1) throw error1

      // Update service fee
      const { error: error2 } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'tasker_service_fee',
          value: taskerServiceFee.toString(),
          description: 'Fixed fee in EUR added to task owner payment (e.g., 2 = €2)',
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: 'key' })

      if (error2) throw error2

      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'Platform fee settings have been saved successfully.',
      })
    } catch (error: any) {
      console.error('Error saving platform settings:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save settings: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setSavingSettings(false)
    }
  }


  async function promoteUser(userId: string, newRole: 'admin' | 'user') {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      console.error('Error promoting user:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating user role: ' + error.message,
      })
    } else {
      fetchUsers()
    }
  }

  async function toggleFeatured(helperId: string, currentStatus: boolean) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/admin/toggle-featured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          helperId,
          isFeatured: !currentStatus
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: result.message || (result.helper?.is_featured ? 'Helper featured successfully' : 'Helper unfeatured successfully'),
        })
        fetchUsers()
      } else {
        throw new Error(result.error || 'Failed to update featured status')
      }
    } catch (error: any) {
      console.error('Error toggling featured status:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating featured status: ' + (error.message || 'Unknown error'),
      })
    }
  }

  async function confirmUserEmail(userId: string, userEmail: string) {
    setConfirmingEmail(userId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/admin/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()

      if (response.ok) {
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: `Email confirmed successfully for ${userEmail}`,
        })
        fetchUsers()
      } else {
        throw new Error(result.error || 'Failed to confirm email')
      }
    } catch (error: any) {
      console.error('Error confirming email:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error confirming email: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setConfirmingEmail(null)
    }
  }

  async function sendProfileCompletionEmail(userId: string, userEmail: string, userName: string) {
    setSendingProfileEmail(userId)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'profile_completion',
          recipientEmail: userEmail,
          recipientName: userName || userEmail,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Email Sent',
          message: `Profile completion email sent successfully to ${userEmail}`,
        })
        fetchEmailLogs() // Refresh email logs
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error: any) {
      console.error('Error sending profile completion email:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error sending email: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setSendingProfileEmail(null)
    }
  }

  async function deleteUser(userId: string) {
    setPendingDeleteUserId(userId)
    setModalConfirmText('Yes, Delete')
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this user? This will permanently delete:\n- All their tasks\n- All their bids\n- All their messages and conversations\n- All their reviews\n- Their profile and account\n\nThis action cannot be undone!',
      onConfirm: () => {
        setModalState({ ...modalState, isOpen: false })
        performDeleteUser(userId)
      },
    })
  }

  async function performDeleteUser(userId: string) {
    setDeletingUserId(userId)
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()

      if (response.ok) {
        const summary = result.deleted_items
          ? `\nDeleted:\n- ${result.deleted_items.tasks} tasks\n- ${result.deleted_items.bids} bids\n- ${result.deleted_items.messages} messages\n- ${result.deleted_items.reviews} reviews`
          : ''
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'User Deleted',
          message: `User deleted successfully!${summary}`,
        })
        fetchUsers()
        fetchTasks() // Refresh tasks in case any were deleted
      } else {
        throw new Error(result.error || 'Failed to delete user')
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error deleting user: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  function openBadgeManager(user?: User) {
    const targetUser = user || (selectedUserIds.size === 1 ? users.find(u => selectedUserIds.has(u.id)) : null)
    if (!targetUser) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Selection Required',
        message: 'Please select exactly one helper to manage badges',
      })
      return
    }
    if (!targetUser.is_helper) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Selection',
        message: 'Selected user is not a helper',
      })
      return
    }
    setManagingBadgesFor(targetUser)
    setSelectedBadges(targetUser.badges || [])
  }

  async function saveBadges() {
    if (!managingBadgesFor) return

    setSavingBadges(true)
    try {
      // Save badges - this will mark them as manually assigned
      // The automatic badge system will preserve manually assigned badges
      const { error } = await supabase
        .from('profiles')
        .update({ badges: selectedBadges.length > 0 ? selectedBadges : null })
        .eq('id', managingBadgesFor.id)

      if (error) throw error

      setManagingBadgesFor(null)
      setSelectedBadges([])
      fetchUsers()
      setShowBadgeSuccessModal(true)
    } catch (error: any) {
      console.error('Error updating badges:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating badges: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setSavingBadges(false)
    }
  }

  function toggleBadge(badgeName: string) {
    setSelectedBadges(prev => 
      prev.includes(badgeName)
        ? prev.filter(b => b !== badgeName)
        : [...prev, badgeName]
    )
  }

  async function sendEmail() {
    if (!emailRecipient || !emailMessage || !emailSubject) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all email fields',
      })
      return
    }

    setSendingEmail(true)
    try {
      // Get recipient name
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('email', emailRecipient)
        .single()

      const recipientName = recipientProfile?.full_name || emailRecipient

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_email',
          recipientEmail: emailRecipient,
          recipientName: recipientName,
          subject: emailSubject,
          message: emailMessage,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setEmailSuccessRecipient(emailRecipient)
        setEmailRecipient('')
        setEmailMessage('')
        setEmailSubject('')
        setSelectedUserForEmail('')
        setShowEmailSuccessModal(true)
        fetchEmailLogs() // Refresh email logs
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error: any) {
      console.error('Error sending email:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error sending email: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setSendingEmail(false)
    }
  }

  // Calculate stats data
  const taskStatusCounts = {
    open: tasks.filter(t => t.status === 'open').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  }

  const userRoleCounts = {
    user: users.filter(u => u.role === 'user').length,
    admin: users.filter(u => u.role === 'admin').length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
  }

  const totalBudget = tasks.reduce((sum, t) => sum + (t.budget || 0), 0)
  const avgBudget = tasks.length > 0 ? totalBudget / tasks.length : 0
  const completedTasksWithBudget = tasks.filter(t => t.status === 'completed' && t.budget)
  const totalSpent = completedTasksWithBudget.reduce((sum, t) => sum + (t.budget || 0), 0)
  const acceptedBids = bids.filter(b => b.status === 'accepted')
  const totalAcceptedBidAmount = acceptedBids.reduce((sum, b) => sum + (b.amount || 0), 0)

  const bidStatusCounts = {
    pending: bids.filter(b => b.status === 'pending').length,
    accepted: bids.filter(b => b.status === 'accepted').length,
    rejected: bids.filter(b => b.status === 'rejected').length,
  }
  const avgBidAmount = bids.length > 0 
    ? bids.reduce((sum, b) => sum + (b.amount || 0), 0) / bids.length 
    : 0
  const avgAcceptedBidAmount = acceptedBids.length > 0
    ? totalAcceptedBidAmount / acceptedBids.length
    : 0

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0
  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  }

  // Calculate language statistics
  const usersWithLanguages = users.filter(u => u.languages && Array.isArray(u.languages) && u.languages.length > 0)
  const languageCounts: Record<string, number> = {}
  usersWithLanguages.forEach(user => {
    if (user.languages && Array.isArray(user.languages)) {
      user.languages.forEach((lang: string) => {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1
      })
    }
  })
  const sortedLanguages = Object.entries(languageCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([lang, count]) => ({ language: lang, count }))

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  const userGrowthData = last30Days.map(date => ({
    date,
    count: users.filter(u => u.created_at <= date).length
  }))

  const taskCreationData = last30Days.map(date => ({
    date,
    count: tasks.filter(t => t.created_at.split('T')[0] === date).length
  }))

  const budgetData = last30Days.map(date => ({
    date,
    total: tasks
      .filter(t => t.created_at.split('T')[0] === date)
      .reduce((sum, t) => sum + (t.budget || 0), 0)
  }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900">Superadmin Dashboard</h1>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2 items-center">
          {(['users', 'tasks', 'reports', 'stats', 'revenue', 'email', 'traffic', 'email_logs', 'settings', 'skills_services'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {t === 'skills_services' ? 'Skills & Services' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <Link
            href="/admin/translations"
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 border border-purple-600 transition-colors"
          >
            Translations
          </Link>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">Users ({users.length})</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={selectAllUsers}
                  className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1"
                >
                  Clear ({selectedUserIds.size})
                </button>
              </div>
            </div>

            {/* Actions Toolbar */}
            {selectedUserIds.size > 0 && (
              <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected:
                  </span>
                  {getSelectedUsers().slice(0, 3).map(u => (
                    <span key={u.id} className="text-xs bg-white px-2 py-1 rounded border">
                      {u.full_name || u.email}
                    </span>
                  ))}
                  {selectedUserIds.size > 3 && (
                    <span className="text-xs text-gray-500">+{selectedUserIds.size - 3} more</span>
                  )}
                  <div className="ml-auto flex gap-2 flex-wrap">
                    {getSelectedUsers().some(u => u.is_helper) && getSelectedUsers().filter(u => u.is_helper).length === 1 && (
                      <button
                        onClick={() => openBadgeManager()}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium"
                      >
                        🏅 Manage Badges
                      </button>
                    )}
                    {getSelectedUsers().some(u => u.is_helper) && (
                      <button
                        onClick={async () => {
                          const selectedHelpers = getSelectedUsers().filter(u => u.is_helper)
                          for (const helper of selectedHelpers) {
                            await toggleFeatured(helper.id, helper.is_featured || false)
                          }
                          clearSelection()
                        }}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium"
                      >
                        ⭐ {getSelectedUsers().filter(u => u.is_helper && u.is_featured).length === getSelectedUsers().filter(u => u.is_helper).length ? 'Unfeature' : 'Feature'} ({getSelectedUsers().filter(u => u.is_helper).length})
                      </button>
                    )}
                    {getSelectedUsers().some(u => u.role === 'user') && (
                      <button
                        onClick={async () => {
                          const selectedUsers = getSelectedUsers().filter(u => u.role === 'user')
                          for (const user of selectedUsers) {
                            await promoteUser(user.id, 'admin')
                          }
                          clearSelection()
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium"
                      >
                        ⬆ Promote to Admin ({getSelectedUsers().filter(u => u.role === 'user').length})
                      </button>
                    )}
                    {getSelectedUsers().some(u => u.role === 'admin') && (
                      <button
                        onClick={async () => {
                          const selectedUsers = getSelectedUsers().filter(u => u.role === 'admin')
                          for (const user of selectedUsers) {
                            await promoteUser(user.id, 'user')
                          }
                          clearSelection()
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium"
                      >
                        ⬇ Demote to User ({getSelectedUsers().filter(u => u.role === 'admin').length})
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const selectedUsers = getSelectedUsers()
                        for (const user of selectedUsers) {
                          await sendProfileCompletionEmail(user.id, user.email, user.full_name || '')
                        }
                        clearSelection()
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium"
                    >
                      ✉ Send Profile Link ({selectedUserIds.size})
                    </button>
                    {getSelectedUsers().some(u => u.role !== 'superadmin') && (
                      <button
                        onClick={async () => {
                          const selectedUsers = getSelectedUsers().filter(u => u.role !== 'superadmin')
                          setPendingBulkDelete(true)
                          setModalState({
                            isOpen: true,
                            type: 'confirm',
                            title: 'Confirm Bulk Deletion',
                            message: `Are you sure you want to delete ${selectedUsers.length} user(s)? This cannot be undone!`,
                            onConfirm: async () => {
                              setModalState({ ...modalState, isOpen: false })
                              for (const user of selectedUsers) {
                                await performDeleteUser(user.id)
                              }
                              clearSelection()
                              setPendingBulkDelete(false)
                            },
                          })
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium"
                      >
                        🗑 Delete ({getSelectedUsers().filter(u => u.role !== 'superadmin').length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto overflow-y-visible -mx-4 sm:mx-0">
              <table className="min-w-full border border-gray-300" style={{ position: 'relative' }}>
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 sm:px-4 py-2 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllUsers()
                          } else {
                            clearSelection()
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Email</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden sm:table-cell">Name</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Role</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Email Status</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell">Helper Badges</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell">Featured</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-gray-50 ${selectedUserIds.has(u.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="border px-2 sm:px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        <div className="truncate max-w-[150px] sm:max-w-none" title={u.email}>{u.email}</div>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden sm:table-cell">{u.full_name || 'N/A'}</td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        <button
                          onClick={() => confirmUserEmail(u.id, u.email)}
                          disabled={confirmingEmail === u.id}
                          className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                            confirmingEmail === u.id
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                          title="Click to confirm user's email"
                        >
                          {confirmingEmail === u.id ? 'Confirming...' : '✓ Confirm Email'}
                        </button>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell">
                        {u.is_helper ? (
                          <div className="flex flex-wrap gap-1">
                            {u.badges && u.badges.length > 0 ? (
                              u.badges.map((badge, idx) => {
                                const getBadgeImage = (badgeName: string) => {
                                  const lowerBadge = badgeName.toLowerCase();
                                  if (lowerBadge.includes('fast') || lowerBadge.includes('responder')) {
                                    return '/images/fast.png';
                                  } else if (lowerBadge.includes('top') || lowerBadge.includes('helper')) {
                                    return '/images/top_helper.png';
                                  } else if (lowerBadge.includes('expert') || lowerBadge.includes('skill')) {
                                    return '/images/expert.png';
                                  }
                                  return null;
                                };
                                const badgeImage = getBadgeImage(badge);
                                return (
                                  <span key={idx} title={badge}>
                                    {badgeImage ? (
                                      <img src={badgeImage} alt={badge} className="h-24 w-24 object-contain" />
                                    ) : (
                                      <span className="text-4xl">🏆</span>
                                    )}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-gray-400">No badges</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not a helper</span>
                        )}
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden lg:table-cell">
                        {u.is_helper ? (
                          <button
                            onClick={() => toggleFeatured(u.id, u.is_featured || false)}
                            className={`px-2 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                              u.is_featured
                                ? 'bg-purple-500 text-white hover:bg-purple-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title={u.is_featured ? 'Click to unfeature' : 'Click to feature'}
                          >
                            {u.is_featured ? '⭐ Featured' : '⭐ Not Featured'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Badge Management Modal */}
        {managingBadgesFor && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            style={{ zIndex: 10000 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setManagingBadgesFor(null)
                setSelectedBadges([])
              }
            }}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">
                Manage Badges for {managingBadgesFor.full_name || managingBadgesFor.email}
              </h2>
              <div className="space-y-3 mb-6">
                {availableBadges.map((badge) => {
                  const getBadgeImage = (badgeName: string) => {
                    const lowerBadge = badgeName.toLowerCase();
                    if (lowerBadge.includes('fast') || lowerBadge.includes('responder')) {
                      return '/images/fast.png';
                    } else if (lowerBadge.includes('top') || lowerBadge.includes('helper')) {
                      return '/images/top_helper.png';
                    } else if (lowerBadge.includes('expert') || lowerBadge.includes('skill')) {
                      return '/images/expert.png';
                    }
                    return null;
                  };
                  const badgeImage = getBadgeImage(badge);
                  const isSelected = selectedBadges.includes(badge);
                  
                  return (
                    <label
                      key={badge}
                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBadge(badge)}
                        className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      {badgeImage && (
                        <img
                          src={badgeImage}
                          alt={badge}
                          className="h-8 w-8 object-contain"
                        />
                      )}
                      <span className="font-medium text-gray-900 flex-1">{badge}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveBadges}
                  disabled={savingBadges}
                  className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingBadges ? 'Saving...' : 'Save Badges'}
                </button>
                <button
                  onClick={() => {
                    setManagingBadgesFor(null)
                    setSelectedBadges([])
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Tasks ({taskSearchTerm ? tasks.filter(t => 
                  t.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                  t.category?.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                  t.status.toLowerCase().includes(taskSearchTerm.toLowerCase())
                ).length : tasks.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRegeocodingPortuguese(true)
                    setRegeocodingResult(null)
                    try {
                      // Get session token for authentication
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) {
                        setRegeocodingResult({ error: 'You must be logged in to re-geocode tasks' })
                        setRegeocodingPortuguese(false)
                        return
                      }

                      const response = await fetch('/api/regeocode-portuguese-tasks', { 
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        }
                      })
                      const data = await response.json()
                      setRegeocodingResult(data)
                      if (data.updated > 0) {
                        // Reload tasks to show updated data
                        setTimeout(() => window.location.reload(), 2000)
                      }
                    } catch (error: any) {
                      setRegeocodingResult({ error: error.message || 'Failed to re-geocode Portuguese tasks' })
                    } finally {
                      setRegeocodingPortuguese(false)
                    }
                  }}
                  disabled={regeocodingPortuguese}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Re-geocode all Portuguese tasks using the new GEO API PT for better accuracy"
                >
                  {regeocodingPortuguese ? 'Re-geocoding...' : '🇵🇹 Re-geocode Portuguese Tasks'}
                </button>
                <button
                  onClick={async () => {
                    setGeocodingTasks(true)
                    setGeocodingResult(null)
                    try {
                      // Get session token for authentication
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) {
                        setGeocodingResult({ error: 'You must be logged in to geocode tasks' })
                        setGeocodingTasks(false)
                        return
                      }

                      const response = await fetch('/api/geocode-tasks', { 
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        }
                      })
                      const data = await response.json()
                      setGeocodingResult(data)
                      if (data.updated > 0) {
                        // Reload tasks to show updated data
                        setTimeout(() => window.location.reload(), 2000)
                      }
                    } catch (error: any) {
                      setGeocodingResult({ error: error.message || 'Failed to geocode tasks' })
                    } finally {
                      setGeocodingTasks(false)
                    }
                  }}
                  disabled={geocodingTasks}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Geocode tasks that have postcodes but no coordinates"
                >
                  {geocodingTasks ? 'Geocoding...' : '📍 Geocode Old Tasks'}
                </button>
                <input
                  type="text"
                  placeholder="Search tasks by title, category, or status..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[300px]"
                />
                {taskSearchTerm && (
                  <button
                    onClick={() => setTaskSearchTerm('')}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {regeocodingResult && (
              <div className={`mb-4 p-4 rounded-md ${
                regeocodingResult.error 
                  ? 'bg-red-50 border border-red-200' 
                  : regeocodingResult.total === 0
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                {regeocodingResult.error ? (
                  <p className="text-red-800">❌ Error: {regeocodingResult.error}</p>
                ) : regeocodingResult.total === 0 ? (
                  <div className="text-blue-800">
                    <p className="font-semibold">ℹ️ No Portuguese Tasks Found</p>
                    <p className="text-sm mt-1">No tasks with Portuguese postcodes were found to re-geocode.</p>
                  </div>
                ) : (
                  <div className="text-blue-800">
                    <p className="font-semibold">✅ Re-geocoding Complete!</p>
                    <p>Total Portuguese tasks: {regeocodingResult.total || 0} | Updated: {regeocodingResult.updated || 0} | Failed: {regeocodingResult.failed || 0}</p>
                    <p className="text-sm mt-1">All Portuguese tasks have been updated to use the new GEO API PT for better accuracy.</p>
                    {regeocodingResult.errors && regeocodingResult.errors.length > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">Errors:</p>
                        <ul className="list-disc list-inside">
                          {regeocodingResult.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {geocodingResult && (
              <div className={`mb-4 p-4 rounded-md ${
                geocodingResult.error 
                  ? 'bg-red-50 border border-red-200' 
                  : geocodingResult.total === 0
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                {geocodingResult.error ? (
                  <p className="text-red-800">❌ Error: {geocodingResult.error}</p>
                ) : geocodingResult.total === 0 ? (
                  <div className="text-blue-800">
                    <p className="font-semibold">ℹ️ No Tasks Need Geocoding</p>
                    {geocodingResult.diagnostics ? (
                      <div className="text-sm mt-1">
                        <p>Tasks with postcodes: {geocodingResult.diagnostics.tasksWithPostcode}</p>
                        <p>Tasks with coordinates: {geocodingResult.diagnostics.tasksWithCoordinates}</p>
                        <p className="mt-2 font-semibold">{geocodingResult.diagnostics.message}</p>
                      </div>
                    ) : (
                      <p className="text-sm mt-1">All tasks with postcodes already have coordinates, or there are no tasks with postcodes.</p>
                    )}
                  </div>
                ) : (
                  <div className="text-green-800">
                    <p className="font-semibold">✅ Geocoding Complete!</p>
                    <p>Total: {geocodingResult.total || 0} | Updated: {geocodingResult.updated || 0} | Failed: {geocodingResult.failed || 0}</p>
                    {geocodingResult.errors && geocodingResult.errors.length > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">Errors:</p>
                        <ul className="list-disc list-inside">
                          {geocodingResult.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Title</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Status</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell">Assigned To</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell">Created</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden sm:table-cell">Visibility</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks
                    .filter(t => {
                      if (!taskSearchTerm) return true
                      const searchLower = taskSearchTerm.toLowerCase()
                      return (
                        t.title.toLowerCase().includes(searchLower) ||
                        t.category?.toLowerCase().includes(searchLower) ||
                        t.status.toLowerCase().includes(searchLower) ||
                        users.find(u => u.id === t.created_by)?.email?.toLowerCase().includes(searchLower) ||
                        users.find(u => u.id === t.assigned_to)?.email?.toLowerCase().includes(searchLower)
                      )
                    })
                    .map(t => (
                    <tr key={t.id} className={`hover:bg-gray-50 ${t.hidden_by_admin ? 'bg-red-50' : ''}`}>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        {t.hidden_by_admin && (
                          <span className="text-red-600 font-semibold mr-2">🔒</span>
                        )}
                        <div className="truncate max-w-[200px] sm:max-w-none" title={t.title}>{t.title}</div>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          t.status === 'completed' ? 'bg-green-100 text-green-800' :
                          t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          t.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell">
                        {t.assigned_to ? (
                          <div className="truncate max-w-[150px]" title={users.find(u => u.id === t.assigned_to)?.email || t.assigned_to}>
                            {users.find(u => u.id === t.assigned_to)?.email || t.assigned_to}
                          </div>
                        ) : (
                          'Unassigned'
                        )}
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden sm:table-cell">
                        {t.hidden_by_admin ? (
                          <span className="text-red-600 text-xs sm:text-sm font-medium">Hidden</span>
                        ) : (
                          <span className="text-green-600 text-xs sm:text-sm font-medium">Visible</span>
                        )}
                        {t.hidden_reason && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]" title={`Reason: ${t.hidden_reason}`}>Reason: {t.hidden_reason}</div>
                        )}
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        {t.hidden_by_admin ? (
                          <button
                            onClick={async () => {
                              try {
                                // Get the current session to include auth token
                                const { data: { session } } = await supabase.auth.getSession()
                                const token = session?.access_token

                                const response = await fetch('/api/admin/hide-task', {
                                  method: 'POST',
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    ...(token && { 'Authorization': `Bearer ${token}` })
                                  },
                                  body: JSON.stringify({ taskId: t.id, hidden: false })
                                })
                                const result = await response.json()
                                if (result.success) {
                                  fetchTasks()
                                  setModalState({
                                    isOpen: true,
                                    type: 'success',
                                    title: 'Success',
                                    message: 'Task unhidden successfully'
                                  })
                                } else {
                                  setModalState({
                                    isOpen: true,
                                    type: 'error',
                                    title: 'Error',
                                    message: result.error || 'Failed to unhide task'
                                  })
                                }
                              } catch (error) {
                                console.error('Error unhiding task:', error)
                                setModalState({
                                  isOpen: true,
                                  type: 'error',
                                  title: 'Error',
                                  message: 'Error unhiding task'
                                })
                              }
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Unhide
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setModalConfirmText('Yes, Hide')
                              setModalState({
                                isOpen: true,
                                type: 'confirm',
                                title: 'Hide Task',
                                message: 'Are you sure you want to hide this task? It will not be visible to regular users. You can unhide it later if needed.',
                                onConfirm: async () => {
                                  try {
                                    // Get the current session to include auth token
                                    const { data: { session } } = await supabase.auth.getSession()
                                    const token = session?.access_token

                                    const response = await fetch('/api/admin/hide-task', {
                                      method: 'POST',
                                      headers: { 
                                        'Content-Type': 'application/json',
                                        ...(token && { 'Authorization': `Bearer ${token}` })
                                      },
                                      body: JSON.stringify({ taskId: t.id, hidden: true, reason: null })
                                    })
                                    const result = await response.json()
                                    if (result.success) {
                                      fetchTasks()
                                      setModalState({
                                        isOpen: true,
                                        type: 'success',
                                        title: 'Success',
                                        message: 'Task hidden successfully'
                                      })
                                    } else {
                                      setModalState({
                                        isOpen: true,
                                        type: 'error',
                                        title: 'Error',
                                        message: result.error || 'Failed to hide task'
                                      })
                                    }
                                  } catch (error) {
                                    console.error('Error hiding task:', error)
                                    setModalState({
                                      isOpen: true,
                                      type: 'error',
                                      title: 'Error',
                                      message: 'Error hiding task'
                                    })
                                  }
                                }
                              })
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Hide
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-2xl font-bold mb-6">Comprehensive Analytics Dashboard</h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-blue-600">{users.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {userRoleCounts.user} users, {userRoleCounts.admin + userRoleCounts.superadmin} admins
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold text-green-600">{tasks.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {taskStatusCounts.completed} completed
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Total Budget</p>
                  <p className="text-3xl font-bold text-purple-600">${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: ${avgBudget.toFixed(2)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600 mb-1">Total Bids</p>
                  <p className="text-3xl font-bold text-orange-600">{bids.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {bidStatusCounts.accepted} accepted ({bids.length > 0 ? ((bidStatusCounts.accepted / bids.length) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-sm text-gray-600 mb-1">Total Spent (Completed)</p>
                  <p className="text-2xl font-bold text-emerald-600">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                  <p className="text-sm text-gray-600 mb-1">Accepted Bid Total</p>
                  <p className="text-2xl font-bold text-teal-600">${totalAcceptedBidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                  <p className="text-sm text-gray-600 mb-1">Avg Accepted Bid</p>
                  <p className="text-2xl font-bold text-cyan-600">${avgAcceptedBidAmount.toFixed(2)}</p>
                </div>
            </div>

            {/* Language Statistics */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-8">
              <h3 className="text-lg font-semibold mb-4 text-indigo-900">User Languages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Users with Languages Set</p>
                  <p className="text-3xl font-bold text-indigo-600">{usersWithLanguages.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {users.length > 0 ? ((usersWithLanguages.length / users.length) * 100).toFixed(1) : 0}% of total users
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Language Distribution</p>
                  {sortedLanguages.length > 0 ? (
                    <div className="space-y-2">
                      {sortedLanguages.map(({ language, count }) => (
                        <div key={language} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                          <span className="font-medium text-gray-700">{language}</span>
                          <span className="text-indigo-600 font-semibold">{count} user{count !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No users have set languages yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row 1: Task Status & User Roles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
                  <div style={{ height: '300px' }}>
                    <Bar
                      data={{
                        labels: ['Open', 'In Progress', 'Completed', 'Cancelled'],
                        datasets: [{
                          label: 'Tasks',
                          data: [
                            taskStatusCounts.open,
                            taskStatusCounts.in_progress,
                            taskStatusCounts.completed,
                            taskStatusCounts.cancelled
                          ],
                          backgroundColor: ['#facc15', '#3b82f6', '#10b981', '#ef4444'],
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">User Role Distribution</h3>
                  <div style={{ height: '300px' }}>
                    <Bar
                      data={{
                        labels: ['Users', 'Admins', 'Superadmins'],
                        datasets: [{
                          label: 'Count',
                          data: [userRoleCounts.user, userRoleCounts.admin, userRoleCounts.superadmin],
                          backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899'],
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </div>
            </div>

            {/* Charts Row 2: Bid Status & Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Bid Status Distribution</h3>
                  <div style={{ height: '300px' }}>
                    <Bar
                      data={{
                        labels: ['Pending', 'Accepted', 'Rejected'],
                        datasets: [{
                          label: 'Bids',
                          data: [bidStatusCounts.pending, bidStatusCounts.accepted, bidStatusCounts.rejected],
                          backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Review Ratings Distribution</h3>
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Average Rating: <span className="font-bold text-lg">{avgRating.toFixed(2)}</span> / 5.0</p>
                  </div>
                  <div style={{ height: '250px' }}>
                    <Bar
                      data={{
                        labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
                        datasets: [{
                          label: 'Reviews',
                          data: [ratingDistribution[5], ratingDistribution[4], ratingDistribution[3], ratingDistribution[2], ratingDistribution[1]],
                          backgroundColor: ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#ef4444'],
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </div>
            </div>

            {/* Time Series Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">User Growth (Last 30 Days)</h3>
                  <div style={{ height: '300px' }}>
                    <Line
                      data={{
                        labels: userGrowthData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                        datasets: [{
                          label: 'Total Users',
                          data: userGrowthData.map(d => d.count),
                          borderColor: '#3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.4,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Task Creation (Last 30 Days)</h3>
                  <div style={{ height: '300px' }}>
                    <Line
                      data={{
                        labels: taskCreationData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                        datasets: [{
                          label: 'Tasks Created',
                          data: taskCreationData.map(d => d.count),
                          borderColor: '#10b981',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          tension: 0.4,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                    />
                  </div>
                </div>
            </div>

            {/* Budget Over Time */}
            <div className="bg-gray-50 p-4 rounded-lg mb-8">
                <h3 className="text-lg font-semibold mb-4">Daily Budget Posted (Last 30 Days)</h3>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: budgetData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                      datasets: [{
                        label: 'Budget ($)',
                        data: budgetData.map(d => d.total),
                        backgroundColor: '#8b5cf6',
                      }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context: any) => `$${context.parsed.y.toLocaleString()}`
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value: any) => `$${value.toLocaleString()}`
                            }
                          }
                        }
                      }}
                    />
                  </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-sm text-gray-600 mb-1">Total Messages</p>
                  <p className="text-2xl font-bold text-indigo-600">{messages.length}</p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                  <p className="text-2xl font-bold text-pink-600">{reviews.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Avg: {avgRating.toFixed(2)}/5</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-gray-600 mb-1">Avg Bid Amount</p>
                  <p className="text-2xl font-bold text-amber-600">${avgBidAmount.toFixed(2)}</p>
                </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {tab === 'revenue' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-2xl font-bold mb-6">Revenue Dashboard</h2>

            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-green-800">€{revenue.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 font-medium">Service Fees (€2/task)</p>
                <p className="text-3xl font-bold text-blue-800">€{revenue.totalServiceFees.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-700 font-medium">Platform Fees (10%)</p>
                <p className="text-3xl font-bold text-purple-800">€{revenue.totalPlatformFees.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium">Paid Tasks</p>
                <p className="text-3xl font-bold text-gray-800">{revenue.totalTasks}</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Revenue Over Last 30 Days</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: revenue.dailyRevenue.map(d => {
                      const date = new Date(d.date)
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }),
                    datasets: [
                      {
                        label: 'Revenue (€)',
                        data: revenue.dailyRevenue.map(d => d.revenue),
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `€${(context.raw as number)?.toFixed(2) || 0}`,
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => `€${value}`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Tasks per Day Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Paid Tasks Per Day</h3>
              <div className="h-64">
                <Line
                  data={{
                    labels: revenue.dailyRevenue.map(d => {
                      const date = new Date(d.date)
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }),
                    datasets: [
                      {
                        label: 'Tasks',
                        data: revenue.dailyRevenue.map(d => d.tasks),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Revenue Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Paid Tasks</h3>
              {revenue.tasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No paid tasks yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tasker</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Helper</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Budget</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Service Fee</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Platform Fee</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {revenue.tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <a 
                              href={`/tasks/${task.id}`}
                              className="text-sm font-medium text-primary-600 hover:underline truncate block max-w-[200px]"
                              target="_blank"
                            >
                              {task.title}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.tasker_email || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {task.helper_email || '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            €{task.budget.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-blue-600">
                            €{task.service_fee.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-purple-600">
                            €{task.platform_fee.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                            €{task.total_revenue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(task.completed_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900" colSpan={3}>Total</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
                          €{revenue.tasks.reduce((sum, t) => sum + t.budget, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                          €{revenue.totalServiceFees.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-purple-700">
                          €{revenue.totalPlatformFees.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-800">
                          €{revenue.totalRevenue.toFixed(2)}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Tab */}
        {tab === 'email' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Send Email</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User
                </label>
                <select
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedUserForEmail}
                  onChange={(e) => {
                    const userId = e.target.value
                    setSelectedUserForEmail(userId)
                    if (userId) {
                      const selectedUser = users.find(u => u.id === userId)
                      if (selectedUser) {
                        setEmailRecipient(selectedUser.email)
                      }
                    } else {
                      setEmailRecipient('')
                    }
                  }}
                >
                  <option value="">-- Select a user --</option>
                  {users
                    .sort((a, b) => {
                      const nameA = (a.full_name || a.email || '').toLowerCase()
                      const nameB = (b.full_name || b.email || '').toLowerCase()
                      return nameA.localeCompare(nameB)
                    })
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={emailRecipient}
                  onChange={(e) => {
                    setEmailRecipient(e.target.value)
                    // Clear user selection if email is manually edited
                    if (e.target.value !== users.find(u => u.id === selectedUserForEmail)?.email) {
                      setSelectedUserForEmail('')
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Email subject"
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  placeholder="Your message here..."
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={8}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                />
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={sendEmail}
                disabled={sendingEmail || !emailRecipient || !emailMessage || !emailSubject}
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        )}

        {/* Traffic Tab */}
        {tab === 'traffic' && (() => {
          // Helper function to format page names for display
          const formatPageName = (page: string): string => {
            const pageMap: Record<string, string> = {
              'home': 'Home Page',
              'tasks': 'Tasks Listing',
              'tasks/new': 'Create New Task',
              'profile': 'User Profile',
              'messages': 'Messages',
              'login': 'Login Page',
              'register': 'Registration',
              'help': 'Help Center',
              'admin': 'Admin Dashboard',
            }
            return pageMap[page] || page.split('/').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' / ')
          }

          // Calculate summary statistics
          const totalVisits = traffic.reduce((sum, t) => sum + t.visits, 0)
          const mostPopularPage = traffic.length > 0 ? traffic[0] : null
          const uniquePages = traffic.length
          
          // Calculate daily statistics
          const todayVisits = dailyTraffic.find(d => d.date === new Date().toISOString().split('T')[0])?.visits || 0
          const yesterdayVisits = dailyTraffic.find(d => {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            return d.date === yesterday.toISOString().split('T')[0]
          })?.visits || 0
          const avgDailyVisits = dailyTraffic.length > 0 
            ? Math.round(dailyTraffic.reduce((sum, d) => sum + d.visits, 0) / dailyTraffic.length)
            : 0
          const maxDailyVisits = dailyTraffic.length > 0
            ? Math.max(...dailyTraffic.map(d => d.visits))
            : 0

          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Page Traffic Analytics</h2>
                  <p className="text-gray-600 text-sm">
                    Track which pages users visit most frequently. Data is collected automatically when users navigate through the site.
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={trafficDays}
                    onChange={(e) => {
                      setTrafficDays(Number(e.target.value))
                      fetchTraffic()
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <button
                    onClick={fetchTraffic}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>

              {traffic.length > 0 ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Total Page Visits</p>
                      <p className="text-3xl font-bold text-blue-600">{totalVisits.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Across all pages</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Most Popular Page</p>
                      <p className="text-lg font-bold text-green-600 truncate" title={mostPopularPage?.page}>
                        {mostPopularPage ? formatPageName(mostPopularPage.page) : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {mostPopularPage ? `${mostPopularPage.visits.toLocaleString()} visits` : ''}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">Pages Tracked</p>
                      <p className="text-3xl font-bold text-purple-600">{uniquePages}</p>
                      <p className="text-xs text-gray-500 mt-1">Unique pages</p>
                    </div>
                  </div>

                  {/* Daily Hits Section */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Daily Hits (Visits Per Day)</h3>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-orange-50 px-3 py-2 rounded border border-orange-200">
                          <p className="text-xs text-gray-600">Today</p>
                          <p className="text-lg font-bold text-orange-600">{todayVisits.toLocaleString()}</p>
                        </div>
                        <div className="bg-indigo-50 px-3 py-2 rounded border border-indigo-200">
                          <p className="text-xs text-gray-600">Yesterday</p>
                          <p className="text-lg font-bold text-indigo-600">{yesterdayVisits.toLocaleString()}</p>
                        </div>
                        <div className="bg-teal-50 px-3 py-2 rounded border border-teal-200">
                          <p className="text-xs text-gray-600">Avg Daily</p>
                          <p className="text-lg font-bold text-teal-600">{avgDailyVisits.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 px-3 py-2 rounded border border-red-200">
                          <p className="text-xs text-gray-600">Peak</p>
                          <p className="text-lg font-bold text-red-600">{maxDailyVisits.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    {dailyTraffic.length > 0 ? (
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <div style={{ width: '100%', height: '400px' }}>
                          <Line
                            data={{
                              labels: dailyTraffic.map(d => {
                                const date = new Date(d.date)
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              }),
                              datasets: [
                                {
                                  label: 'Hits Per Day',
                                  data: dailyTraffic.map(d => d.visits),
                                  borderColor: '#3b82f6',
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                  borderWidth: 3,
                                  fill: true,
                                  tension: 0.4,
                                  pointRadius: 4,
                                  pointHoverRadius: 6,
                                  pointBackgroundColor: '#3b82f6',
                                  pointBorderColor: '#ffffff',
                                  pointBorderWidth: 2,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  display: true,
                                  position: 'top',
                                  labels: {
                                    font: {
                                      family: "'Arial', 'Helvetica', sans-serif",
                                      size: 14,
                                      weight: 'bold',
                                    },
                                    padding: 15,
                                  },
                                },
                                tooltip: {
                                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                  padding: 12,
                                  titleFont: {
                                    size: 14,
                                    weight: 'bold',
                                  },
                                  bodyFont: {
                                    size: 13,
                                  },
                                  callbacks: {
                                    title: (context: any) => {
                                      const index = context[0].dataIndex
                                      const date = new Date(dailyTraffic[index].date)
                                      return date.toLocaleDateString('en-US', { 
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })
                                    },
                                    label: (context: any) => {
                                      const value = context.parsed.y
                                      return `Hits: ${value.toLocaleString()}`
                                    },
                                  },
                                },
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  grid: {
                                    color: 'rgba(0, 0, 0, 0.05)',
                                  },
                                  ticks: {
                                    callback: (value: any) => value.toLocaleString(),
                                    font: {
                                      size: 12,
                                    },
                                    padding: 10,
                                  },
                                  title: {
                                    display: true,
                                    text: 'Number of Hits',
                                    font: {
                                      size: 14,
                                      weight: 'bold',
                                    },
                                    padding: {
                                      bottom: 10,
                                    },
                                  },
                                },
                                x: {
                                  grid: {
                                    display: false,
                                  },
                                  ticks: {
                                    font: {
                                      size: 11,
                                    },
                                    maxRotation: 45,
                                    minRotation: 45,
                                    padding: 8,
                                  },
                                  title: {
                                    display: true,
                                    text: 'Date',
                                    font: {
                                      size: 14,
                                      weight: 'bold',
                                    },
                                    padding: {
                                      top: 10,
                                    },
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-8 rounded-lg text-center">
                        <p className="text-gray-500">No daily traffic data available yet</p>
                        <p className="text-gray-400 text-sm mt-1">Daily tracking starts after the database migration is run</p>
                      </div>
                    )}
                  </div>

                  {/* Traffic Chart */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Page Visits Overview</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div style={{ maxWidth: '100%', height: '400px' }}>
                        <Bar
                          data={{
                            labels: traffic.map(t => formatPageName(t.page)),
                            datasets: [
                              {
                                label: 'Page Visits',
                                data: traffic.map(t => t.visits),
                                backgroundColor: traffic.map((_, i) => {
                                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
                                  return colors[i % colors.length]
                                }),
                                borderColor: traffic.map((_, i) => {
                                  const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2']
                                  return colors[i % colors.length]
                                }),
                                borderWidth: 2,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context: any) => {
                                    const value = context.parsed.y
                                    const percentage = totalVisits > 0 ? ((value / totalVisits) * 100).toFixed(1) : 0
                                    return `${value.toLocaleString()} visits (${percentage}% of total)`
                                  },
                                },
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value: any) => value.toLocaleString(),
                                },
                                title: {
                                  display: true,
                                  text: 'Number of Visits',
                                },
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Page',
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Detailed Page Statistics</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border px-4 py-3 text-left font-semibold">Page Name</th>
                            <th className="border px-4 py-3 text-left font-semibold">Total Visits</th>
                            <th className="border px-4 py-3 text-left font-semibold">Percentage</th>
                            <th className="border px-4 py-3 text-left font-semibold">Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {traffic.map((t, index) => {
                            const percentage = totalVisits > 0 ? ((t.visits / totalVisits) * 100).toFixed(1) : 0
                            return (
                              <tr key={t.page} className="hover:bg-gray-50">
                                <td className="border px-4 py-3 font-medium">
                                  <div className="flex items-center gap-2">
                                    {index === 0 && (
                                      <span className="text-yellow-500" title="Most popular">👑</span>
                                    )}
                                    {formatPageName(t.page)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 font-normal">
                                    /{t.page}
                                  </div>
                                </td>
                                <td className="border px-4 py-3">
                                  <span className="font-semibold text-gray-900">{t.visits.toLocaleString()}</span>
                                </td>
                                <td className="border px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{percentage}%</span>
                                  </div>
                                </td>
                                <td className="border px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-50 text-gray-600'
                                  }`}>
                                    #{index + 1}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-2">No traffic data available yet</p>
                  <p className="text-gray-400 text-sm">
                    Traffic data will appear here once users start visiting pages on your site.
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Email Logs Tab */}
        {tab === 'email_logs' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Email Logs ({emailLogs.length})</h2>
            <div className="mb-4">
              <button
                onClick={fetchEmailLogs}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Refresh Logs
              </button>
            </div>
            {emailLogs.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Date</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell">Recipient</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Subject</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell">Type</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Status</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden xl:table-cell">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <div className="flex flex-col">
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell">
                          <div>
                            <div className="font-medium truncate max-w-[200px]" title={log.recipient_email}>{log.recipient_email}</div>
                            {log.recipient_name && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]" title={log.recipient_name}>{log.recipient_name}</div>
                            )}
                          </div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <div className="truncate max-w-[200px] sm:max-w-none" title={log.subject}>{log.subject}</div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden lg:table-cell">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                            {log.email_type}
                          </span>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.status === 'sent' ? 'bg-green-100 text-green-800' :
                            log.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hidden xl:table-cell">
                          <div className="truncate max-w-[200px]" title={log.error_message || '-'}>{log.error_message || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No email logs found.</p>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {tab === 'reports' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">
                Reports ({reports.length})
              </h2>
              <button
                onClick={fetchReports}
                disabled={loadingReports}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingReports ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loadingReports ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No reports found.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported By</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Target</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Reason</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            report.report_type === 'task' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {report.report_type === 'task' ? 'Task' : 'User'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          <div className="truncate max-w-[120px] sm:max-w-none" title={report.reporter?.full_name || report.reporter?.email || 'Unknown'}>
                            {report.reporter?.full_name || report.reporter?.email || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                          {report.report_type === 'task' ? (
                            report.reported_task ? (
                              <a href={`/tasks/${report.reported_task.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">
                                {report.reported_task.title}
                              </a>
                            ) : 'Task not found'
                          ) : (
                            report.reported_user ? (
                              <a href={`/user/${report.reported_user.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">
                                {report.reported_user.full_name || report.reported_user.email || 'Unknown User'}
                              </a>
                            ) : 'User not found'
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 hidden md:table-cell">
                          <div className="max-w-xs truncate" title={report.reason}>
                            {report.reason}
                          </div>
                          {report.details && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={report.details}>
                              {report.details}
                            </div>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                            report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                          <div className="flex flex-col">
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            <span className="text-xs">{new Date(report.created_at).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <select
                              value={report.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value
                                const { error } = await supabase
                                  .from('reports')
                                  .update({
                                    status: newStatus,
                                    reviewed_by: (await supabase.auth.getUser()).data.user?.id,
                                    reviewed_at: new Date().toISOString()
                                  })
                                  .eq('id', report.id)
                                
                                if (!error) {
                                  fetchReports()
                                }
                              }}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="resolved">Resolved</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                            {(report.status === 'resolved' || report.status === 'dismissed') && (
                              <button
                                onClick={(e) => {
                                  console.log('🔴 [DELETE BUTTON] Raw click event fired')
                                  e.preventDefault()
                                  e.stopPropagation()
                                  e.nativeEvent.stopImmediatePropagation()
                                  handleDeleteClick(report.id, e)
                                }}
                                disabled={deletingReportId === report.id || showDeleteConfirmModal}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete this report"
                                type="button"
                              >
                                {deletingReportId === report.id ? 'Deleting...' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <StandardModal
          isOpen={showDeleteConfirmModal}
          onClose={() => {
            console.log('🔴 [MODAL CLOSE] ========== MODAL CLOSE CALLED ==========')
            console.log('🔴 [MODAL CLOSE] deletingReportId:', deletingReportId)
            console.log('🔴 [MODAL CLOSE] showDeleteConfirmModal:', showDeleteConfirmModal)
            console.log('🔴 [MODAL CLOSE] reportToDelete:', reportToDelete)
            console.trace('🔴 [MODAL CLOSE] Stack trace:')
            
            // Prevent closing during deletion
            if (deletingReportId) {
              console.log('🔴 [MODAL CLOSE] Blocked - deletion in progress')
              return
            }
            
            console.log('🔴 [MODAL CLOSE] Closing modal and resetting state')
            setShowDeleteConfirmModal(false)
            setReportToDelete(null)
          }}
          onConfirm={() => {
            console.log('🔴 [DELETE CONFIRM] ========== CONFIRM BUTTON CLICKED ==========')
            console.log('🔴 [DELETE CONFIRM] deletingReportId:', deletingReportId)
            console.log('🔴 [DELETE CONFIRM] reportToDelete:', reportToDelete)
            console.log('🔴 [DELETE CONFIRM] showDeleteConfirmModal:', showDeleteConfirmModal)
            
            // Prevent multiple clicks during deletion
            if (deletingReportId) {
              console.log('🔴 [DELETE CONFIRM] Blocked - already deleting')
              return
            }
            
            console.log('🔴 [DELETE CONFIRM] Calling handleDeleteConfirm')
            handleDeleteConfirm()
          }}
          type="confirm"
          title="Delete Report"
          message={deletingReportId ? "Deleting report..." : "Are you sure you want to delete this report? This action cannot be undone."}
          confirmText={deletingReportId ? "Deleting..." : "Delete"}
          cancelText="Cancel"
          isLoading={!!deletingReportId}
        />

        {/* Delete Error Modal */}
        <StandardModal
          isOpen={showDeleteErrorModal}
          onClose={() => {
            setShowDeleteErrorModal(false)
            setDeleteErrorMessage('')
          }}
          type="error"
          title="Delete Failed"
          message={deleteErrorMessage || 'Failed to delete report. Please try again.'}
        />

        {/* Skills & Services Tab */}
        {tab === 'skills_services' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Skills & Services</h2>
              <button
                onClick={loadSkillsAndServices}
                disabled={loadingSkillsServices}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingSkillsServices ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>🔄 Refresh</>
                )}
              </button>
            </div>

            {loadingSkillsServices ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading skills and services...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Skills Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Skills ({allSkills.length})
                    </h3>
                    <span className="text-sm text-gray-500">
                      {STANDARD_SKILLS.length} standard + {allSkills.length - STANDARD_SKILLS.length} custom
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {allSkills.map((skill, index) => {
                        const isStandard = STANDARD_SKILLS.includes(skill)
                        return (
                          <div
                            key={index}
                            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                              isStandard
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                          >
                            {isStandard && <span className="text-xs">⭐</span>}
                            <span>{skill}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Services Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Services ({allServices.length})
                    </h3>
                    <span className="text-sm text-gray-500">
                      {STANDARD_SERVICES.length} standard + {allServices.length - STANDARD_SERVICES.length} custom
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {allServices.map((service, index) => {
                        const isStandard = STANDARD_SERVICES.includes(service)
                        return (
                          <div
                            key={index}
                            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                              isStandard
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                          >
                            {isStandard && <span className="text-xs">⭐</span>}
                            <span>{service}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Platform Fee Settings</h2>
            
            <div className="space-y-6">
              {/* Platform Fee (deducted from helper) */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  🏷️ Platform Fee (Taskorilla Commission)
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  This percentage is deducted from the helper's payout when they complete a task.
                  <br />
                  <strong>Example:</strong> If a task pays €100 and platform fee is 10%, the helper receives €90.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                    className="w-24 border border-blue-300 rounded-lg px-3 py-2 text-lg font-semibold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-lg font-semibold text-blue-900">%</span>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Current: Helper receives {100 - platformFeePercent}% of the agreed amount
                </p>
              </div>

              {/* Tasker Service Fee (added to tasker's payment) */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  💳 Service Fee (Charged to Task Owner)
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  This fixed amount is added to the task owner's payment on top of the agreed task amount.
                  <br />
                  <strong>Example:</strong> If task budget is €100 and service fee is €2, task owner pays €102.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-green-900">€</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.50"
                    value={taskerServiceFee}
                    onChange={(e) => setTaskerServiceFee(Number(e.target.value))}
                    className="w-24 border border-green-300 rounded-lg px-3 py-2 text-lg font-semibold text-center focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Current: Task owners pay task amount + €{taskerServiceFee.toFixed(2)} service fee
                </p>
              </div>

              {/* Summary Box */}
              <div className="bg-gray-100 p-6 rounded-lg border border-gray-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Fee Summary Example</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">For a <strong>€100</strong> task:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Task Owner pays: <strong className="text-gray-900">€{(100 + taskerServiceFee).toFixed(2)}</strong> (€100 + €{taskerServiceFee.toFixed(2)} service fee)</li>
                    <li>Helper receives: <strong className="text-gray-900">€{(100 * (1 - platformFeePercent / 100)).toFixed(2)}</strong> (€100 - {platformFeePercent}% platform fee)</li>
                    <li>Taskorilla keeps: <strong className="text-green-600">€{(taskerServiceFee + 100 * platformFeePercent / 100).toFixed(2)}</strong> (€{taskerServiceFee.toFixed(2)} + €{(100 * platformFeePercent / 100).toFixed(2)})</li>
                  </ul>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-4">
                <button
                  onClick={savePlatformSettings}
                  disabled={savingSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingSettings ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>💾 Save Settings</>
                  )}
                </button>
              </div>

              {/* Status */}
              {settingsLoaded && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>✓ Settings loaded from database.</strong> Changes will be saved when you click "Save Settings".
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Success Modal */}
        {showEmailSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              {/* Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Email Sent Successfully!
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 text-center mb-6">
                Your email has been sent to {emailSuccessRecipient}.
              </p>

              {/* Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowEmailSuccessModal(false)
                    setEmailSuccessRecipient('')
                  }}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Standard Modal */}
        <StandardModal
          isOpen={modalState.isOpen}
          onClose={() => {
            setModalState({ ...modalState, isOpen: false })
            setPendingDeleteUserId(null)
            setPendingBulkDelete(false)
          }}
          onConfirm={modalState.onConfirm}
          type={modalState.type}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.type === 'confirm' ? modalConfirmText : 'OK'}
        />
      </div>
    </div>
  )
}

