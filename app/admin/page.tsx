'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
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
import StandardModal from '@/components/StandardModal'
import EmailTemplateManager from '@/components/EmailTemplateManager'
import EmailTemplateEditor from '@/components/EmailTemplateEditor'
import CreateBlogPost from '@/components/CreateBlogPost'
import AdminHelpFeedbackPanel from '@/components/AdminHelpFeedbackPanel'
import { blogs } from '@/lib/blog-data'
import { User } from '@/lib/types'
import { STANDARD_SKILLS, STANDARD_SERVICES } from '@/lib/helper-constants'
import { geocodeAddress } from '@/lib/geocoding'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const EXCLUDED_REVENUE_TASK_IDS = new Set([
  'a8c3c4e2-e594-47b8-89d0-55f6e2cbadd6',
])

const AdminMap = dynamic(() => import('@/components/Map'), { ssr: false })

// AppUser extends User and includes languages and other custom fields
interface AppUser extends User {
  languages?: string[] | null
  role?: string
  is_paused?: boolean
  paused_reason?: string | null
  paused_at?: string | null
  conduct_guide_viewed_at?: string | null
  pause_warning_sent_at?: string | null
  archived_at?: string | null
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
  is_sample_task?: boolean
  hidden_by_admin?: boolean
  hidden_reason?: string | null
  payment_status?: string | null
  updated_at?: string
  location?: string | null
}

type HelperTaskAllocation = {
  helper_id: string
  first_allocated_at: string | null
  allocated_via: string | null
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
  task_id: string
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

type TrafficRange = 'today' | '7d' | '30d' | 'last_month' | 'custom'

type UserPageVisitRow = {
  id: string
  user_id: string
  page: string
  visited_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

type AnonPageVisitRow = {
  id: string
  visitor_id: string
  page: string
  visited_at: string
}

type PrebidImageMessage = {
  id: string
  conversation_id: string
  image_url: string | null
  content: string | null
  created_at: string
}

type MessageImageReplacementLog = {
  id: string
  message_id: string | null
  conversation_id: string | null
  email_log_id: string | null
  original_image_url: string
  replacement_image_url: string
  reason: string | null
  replaced_by: string | null
  created_at: string
}

const DEFAULT_PREBID_REPLACEMENT_REASON =
  'Contacting or sharing addressed or contact details outside Taskorilla is not permitted until a bid has been accepted. However, you can discuss the general area where you or the task is located. You can also share photos of the task or location to help move things forward.'

function computeTrafficDateRange(
  effectiveRange: TrafficRange,
  effectiveCustomStart: string,
  effectiveCustomEnd: string
): { startDate: string; endDate: string } | null {
  const today = new Date()
  const toDateString = (d: Date) => d.toISOString().split('T')[0]
  let startDate = ''
  let endDate = toDateString(today)

  if (effectiveRange === 'today') {
    startDate = toDateString(today)
    endDate = toDateString(today)
  } else if (effectiveRange === '7d') {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    startDate = toDateString(start)
  } else if (effectiveRange === '30d') {
    const start = new Date(today)
    start.setDate(start.getDate() - 29)
    startDate = toDateString(start)
  } else if (effectiveRange === 'last_month') {
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayPreviousMonth = new Date(firstDayCurrentMonth.getTime() - 24 * 60 * 60 * 1000)
    const firstDayPreviousMonth = new Date(
      lastDayPreviousMonth.getFullYear(),
      lastDayPreviousMonth.getMonth(),
      1
    )
    startDate = toDateString(firstDayPreviousMonth)
    endDate = toDateString(lastDayPreviousMonth)
  } else {
    if (!effectiveCustomStart || !effectiveCustomEnd) return null
    startDate = effectiveCustomStart
    endDate = effectiveCustomEnd
  }
  return { startDate, endDate }
}

type RevenueRange = 'day' | 'week' | 'month' | 'year' | 'all'

type WelcomeEmailAttempt = {
  id: string
  created_at: string
  related_user_id: string | null
  recipient_email: string | null
  template_type: string | null
  source: string
  ok: boolean
  skipped_reason: string | null
  error_reason: string | null
  meta: Record<string, unknown> | null
}

type MissingWelcomeQueueRow = {
  user_id: string
  email: string | null
  user_created_at: string
  email_confirmed_at: string
  latest_scheduled_email_at: string | null
  latest_successful_attempt_at: string | null
  welcome_rows_count: number
}

export default function SuperadminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AppUser[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskAllocationsByTask, setTaskAllocationsByTask] = useState<Record<string, HelperTaskAllocation[]>>({})
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [bids, setBids] = useState<Bid[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [traffic, setTraffic] = useState<Traffic[]>([])
  const [dailyTraffic, setDailyTraffic] = useState<DailyTraffic[]>([])
  const [trafficRange, setTrafficRange] = useState<TrafficRange>('30d')
  const [trafficCustomStart, setTrafficCustomStart] = useState<string>('')
  const [trafficCustomEnd, setTrafficCustomEnd] = useState<string>('')
  const [trafficPage, setTrafficPage] = useState<number>(1)
  const [userPageVisits, setUserPageVisits] = useState<UserPageVisitRow[]>([])
  const [userPageVisitsLoading, setUserPageVisitsLoading] = useState(false)
  const [anonPageVisits, setAnonPageVisits] = useState<AnonPageVisitRow[]>([])
  const [anonPageVisitsLoading, setAnonPageVisitsLoading] = useState(false)
  const [showAllUserTrafficDays, setShowAllUserTrafficDays] = useState(false)
  const [showAllAnonTrafficDays, setShowAllAnonTrafficDays] = useState(false)
  const TRAFFIC_PAGE_SIZE = 20
  const [tab, setTab] = useState<'users' | 'tasks' | 'awaiting_payment' | 'stats' | 'revenue' | 'email' | 'matching' | 'traffic' | 'settings' | 'reports' | 'maps' | 'blog'>('users')
  const [showBidsDrilldown, setShowBidsDrilldown] = useState(false)
  const [showAcceptedBidsDrilldown, setShowAcceptedBidsDrilldown] = useState(false)
  const [showAvgBidAmountDrilldown, setShowAvgBidAmountDrilldown] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string>('')
  const [generatingBlogImages, setGeneratingBlogImages] = useState(false)
  const [blogImageGenerationStatus, setBlogImageGenerationStatus] = useState<string | null>(null)
  const [editingPostSlug, setEditingPostSlug] = useState<string | null>(null)
  
  // Use a ref to track modal state to avoid closure issues
  const showDeleteConfirmModalRef = useRef(false)
  const reportToDeleteRef = useRef<string | null>(null)
  const emailLogsTopScrollRef = useRef<HTMLDivElement | null>(null)
  const emailLogsTableScrollRef = useRef<HTMLDivElement | null>(null)
  const [emailLogsScrollWidth, setEmailLogsScrollWidth] = useState(1)
  
  // Sync refs with state
  useEffect(() => {
    showDeleteConfirmModalRef.current = showDeleteConfirmModal
    reportToDeleteRef.current = reportToDelete
    console.log('🔴 [STATE SYNC] Updated refs - showDeleteConfirmModal:', showDeleteConfirmModal, 'reportToDelete:', reportToDelete)
  }, [showDeleteConfirmModal, reportToDelete])

  useEffect(() => {
    const top = emailLogsTopScrollRef.current
    const bottom = emailLogsTableScrollRef.current
    if (!top || !bottom) return

    const updateWidth = () => {
      setEmailLogsScrollWidth(Math.max(bottom.scrollWidth, 1))
    }

    let syncingFromTop = false
    let syncingFromBottom = false

    const handleTopScroll = () => {
      if (syncingFromBottom) return
      syncingFromTop = true
      bottom.scrollLeft = top.scrollLeft
      syncingFromTop = false
    }

    const handleBottomScroll = () => {
      if (syncingFromTop) return
      syncingFromBottom = true
      top.scrollLeft = bottom.scrollLeft
      syncingFromBottom = false
    }

    const resizeObserver = new ResizeObserver(() => updateWidth())
    resizeObserver.observe(bottom)

    updateWidth()
    top.addEventListener('scroll', handleTopScroll)
    bottom.addEventListener('scroll', handleBottomScroll)
    window.addEventListener('resize', updateWidth)

    return () => {
      resizeObserver.disconnect()
      top.removeEventListener('scroll', handleTopScroll)
      bottom.removeEventListener('scroll', handleBottomScroll)
      window.removeEventListener('resize', updateWidth)
    }
  })

  // Debug logging for modal state
  useEffect(() => {
    console.log('🔴 [MODAL STATE] showDeleteConfirmModal changed to:', showDeleteConfirmModal)
    console.log('🔴 [MODAL STATE] reportToDelete:', reportToDelete)
  }, [showDeleteConfirmModal, reportToDelete])
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [emailMessage, setEmailMessage] = useState('')
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailAttachment, setEmailAttachment] = useState<File | null>(null)
  const emailAttachmentInputRef = useRef<HTMLInputElement>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<string>('')
  const [viewingEmailLog, setViewingEmailLog] = useState<any | null>(null)
  const [prebidReplaceLog, setPrebidReplaceLog] = useState<any | null>(null)
  const [prebidImagesLoading, setPrebidImagesLoading] = useState(false)
  const [prebidImages, setPrebidImages] = useState<PrebidImageMessage[]>([])
  const [selectedPrebidMessageIds, setSelectedPrebidMessageIds] = useState<string[]>([])
  const [replacementReason, setReplacementReason] = useState<string>(DEFAULT_PREBID_REPLACEMENT_REASON)
  const [replacingPrebidImage, setReplacingPrebidImage] = useState(false)
  const [replaceAllConversationImages, setReplaceAllConversationImages] = useState(false)
  const [replacementHistoryLoading, setReplacementHistoryLoading] = useState(false)
  const [replacementHistory, setReplacementHistory] = useState<MessageImageReplacementLog[]>([])
  // Free-form email mode toggle
  const [freeFormEmailMode, setFreeFormEmailMode] = useState(false)
  const [freeFormRecipient, setFreeFormRecipient] = useState<string>('')
  const [freeFormSubject, setFreeFormSubject] = useState('')
  const [freeFormContent, setFreeFormContent] = useState('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [deletingEmailLogId, setDeletingEmailLogId] = useState<string | null>(null)
  const [selectedEmailLogIds, setSelectedEmailLogIds] = useState<string[]>([])
  const [emailTemplates, setEmailTemplates] = useState<Array<{ id: string; template_type: string; subject: string }>>([])
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>('')
  // Email log filters
  const [emailLogFilters, setEmailLogFilters] = useState({
    recipient: '',
    subject: '',
    emailType: '',
  })
  const [showEmailLogsSection, setShowEmailLogsSection] = useState(false)
  const [emailLogsPage, setEmailLogsPage] = useState(1)
  const EMAIL_LOGS_PAGE_SIZE = 25
  const [welcomeAuditLoading, setWelcomeAuditLoading] = useState(false)
  const [welcomeAuditError, setWelcomeAuditError] = useState<string | null>(null)
  const [welcomeAttemptFilter, setWelcomeAttemptFilter] = useState('')
  const [welcomeAttempts, setWelcomeAttempts] = useState<WelcomeEmailAttempt[]>([])
  const [missingWelcomeQueueRows, setMissingWelcomeQueueRows] = useState<MissingWelcomeQueueRow[]>([])

  useEffect(() => {
    setEmailLogsPage(1)
  }, [emailLogFilters.recipient, emailLogFilters.subject, emailLogFilters.emailType, showEmailLogsSection])

  useEffect(() => {
    if (!viewingEmailLog) {
      setReplacementHistory([])
      setReplacementHistoryLoading(false)
      return
    }
    loadReplacementHistoryForLog(viewingEmailLog)
  }, [viewingEmailLog])
  const [smsTestPhone, setSmsTestPhone] = useState('')
  const [smsTestLoading, setSmsTestLoading] = useState(false)
  const [smsTestResult, setSmsTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // SMS Log
  const [smsLogs, setSmsLogs] = useState<any[]>([])
  const [smsLogsLoading, setSmsLogsLoading] = useState(false)

  // Send Task Alert
  const [alertTaskId, setAlertTaskId] = useState('')
  const [alertUserId, setAlertUserId] = useState('')
  const [alertUserSortMode, setAlertUserSortMode] = useState<'latest' | 'alpha'>('latest')
  const [alertViaEmail, setAlertViaEmail] = useState(true)
  const [alertViaSms, setAlertViaSms] = useState(false)
  const [alertSending, setAlertSending] = useState(false)

  const formatAdminDateTime = (value: string | null | undefined) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    const hours = String(d.getUTCHours()).padStart(2, '0')
    const minutes = String(d.getUTCMinutes()).padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${minutes}`
  }

  const formatAdminDate = (value: string | null | undefined) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}/${month}/${year}`
  }

  const formatDuration = (ms: number) => {
    if (!Number.isFinite(ms) || ms <= 0) return '0s'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }
  const [alertMessage, setAlertMessage] = useState<{ ok: boolean; msg: string } | null>(null)
  const [managingBadgesFor, setManagingBadgesFor] = useState<User | null>(null)
  const [selectedBadges, setSelectedBadges] = useState<string[]>([])
  const [savingBadges, setSavingBadges] = useState(false)
  const [showBadgeSuccessModal, setShowBadgeSuccessModal] = useState(false)
  const [showEmailSuccessModal, setShowEmailSuccessModal] = useState(false)
  const [emailSuccessRecipient, setEmailSuccessRecipient] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [modalConfirmText, setModalConfirmText] = useState<string>('OK')
  const [taskSearchTerm, setTaskSearchTerm] = useState<string>('')
  // User sorting and filtering
  const [userSortColumn, setUserSortColumn] = useState<string>('created_at')
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('desc')
  const [registrationDateFilter, setRegistrationDateFilter] = useState<{ start?: string; end?: string }>({})
  const [userNameFilter, setUserNameFilter] = useState<string>('')
  const [userEmailFilter, setUserEmailFilter] = useState<string>('')
  const [userRoleFilter, setUserRoleFilter] = useState<string>('')
  const [userFeaturedFilter, setUserFeaturedFilter] = useState<string>('')
  const [userHelperTaskerFilter, setUserHelperTaskerFilter] = useState<string>('')
  const USERS_PAGE_SIZE = 25
  const [usersListPage, setUsersListPage] = useState(1)
  const [geocodingTasks, setGeocodingTasks] = useState(false)
  const [geocodingResult, setGeocodingResult] = useState<any>(null)
  const [regeocodingPortuguese, setRegeocodingPortuguese] = useState(false)
  const [regeocodingResult, setRegeocodingResult] = useState<any>(null)
  
  // Admin map markers (custom places)
  const [mapMarkers, setMapMarkers] = useState<any[]>([])
  const [loadingMapMarkers, setLoadingMapMarkers] = useState(false)
  const [savingMapMarker, setSavingMapMarker] = useState(false)
  const [mapMarkerError, setMapMarkerError] = useState<string | null>(null)
  const [newMarkerTitle, setNewMarkerTitle] = useState('')
  const [newMarkerAddress, setNewMarkerAddress] = useState('')
  const [newMarkerTooltip, setNewMarkerTooltip] = useState('')
  const [newMarkerLogoUrl, setNewMarkerLogoUrl] = useState('')
  const [newMarkerBusinessUrl, setNewMarkerBusinessUrl] = useState('')
  const [newMarkerVisible, setNewMarkerVisible] = useState(true)
  const [newMarkerPreview, setNewMarkerPreview] = useState<{ latitude: number; longitude: number } | null>(null)
  const [newMarkerLogoFile, setNewMarkerLogoFile] = useState<File | null>(null)
  const [uploadingNewMarkerLogo, setUploadingNewMarkerLogo] = useState(false)

  // Editing existing map markers (title, tooltip, logo)
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const [editingMarkerTitle, setEditingMarkerTitle] = useState('')
  const [editingMarkerTooltip, setEditingMarkerTooltip] = useState('')
  const [editingMarkerLogoUrl, setEditingMarkerLogoUrl] = useState('')
  const [editingMarkerBusinessUrl, setEditingMarkerBusinessUrl] = useState('')
  const [updatingMarker, setUpdatingMarker] = useState(false)
  const [editingMarkerLogoFile, setEditingMarkerLogoFile] = useState<File | null>(null)

  // Skills & Services state
  const [allSkills, setAllSkills] = useState<string[]>([])
  const [allServices, setAllServices] = useState<string[]>([])
  const [loadingSkillsServices, setLoadingSkillsServices] = useState(false)
  
  // Platform fee settings
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(10) // 10% deducted from helper payout
  const [taskerServiceFee, setTaskerServiceFee] = useState<number>(2) // €2 added to task owner's payment
  // Feature flags
  const [helperTaskMatchEnabled, setHelperTaskMatchEnabled] = useState<boolean>(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  // Helper task match preview
  const [previewTaskId, setPreviewTaskId] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<{
    task: any | null
    matches: any[]
    reason?: string
    aiClassification?: { skills: string[]; professions: string[] }
    matchMode?: string
    allocatedCount?: number
    excludedCount?: number
    taskTypeKey?: string
  }>({ task: null, matches: [], reason: undefined })
  const [sendingMatches, setSendingMatches] = useState(false)
  const [sendMatchesMessage, setSendMatchesMessage] = useState<string | null>(null)
  const [sendTaskId, setSendTaskId] = useState('')
  const [sendTaskMatches, setSendTaskMatches] = useState<Array<{ id: string; name: string; email: string; distanceKm?: number; phoneNumber?: string | null; phoneCountryCode?: string | null; smsOptOut?: boolean; compositeScore?: number; semanticScore?: number; distanceScore?: number; professionScore?: number; skillScore?: number; profileScore?: number; isAllocated?: boolean; allocatedAt?: string | null; allocatedVia?: string | null }>>([])
  const [sendTaskMatchesLoading, setSendTaskMatchesLoading] = useState(false)
  const [selectedSendHelperIds, setSelectedSendHelperIds] = useState<Set<string>>(new Set())
  const [overrideExcludedHelperIds, setOverrideExcludedHelperIds] = useState<Set<string>>(new Set())
  const [updatingMatchFeedbackHelperId, setUpdatingMatchFeedbackHelperId] = useState<string | null>(null)
  const [showMatchFeedbackReasonModal, setShowMatchFeedbackReasonModal] = useState(false)
  const [matchFeedbackReasonInput, setMatchFeedbackReasonInput] = useState('wrong_skill')
  const [pendingExcludeFeedbackTarget, setPendingExcludeFeedbackTarget] = useState<{ taskId: string; helperId: string } | null>(null)
  const [sendViaEmail, setSendViaEmail] = useState(true)
  const [sendViaSms, setSendViaSms] = useState(false)
  const [lockMatchTaskSelection, setLockMatchTaskSelection] = useState(true)
  const [scoreBreakdownDetails, setScoreBreakdownDetails] = useState<{
    source: 'preview' | 'send'
    helperName: string
    compositeScore: number | null
    semanticScore: number
    distanceScore: number
    professionScore: number
    skillScore: number
    profileScore: number
  } | null>(null)
  
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
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('month')
  
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
  const bidsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const reviewsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  
  const HELPER_BADGES = ['Founding Helper', 'Fast Responder', 'Top Helper', 'Expert Skills']
  const TASKER_BADGES = ['Founding Tasker']

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

  const sortedAndFilteredUsers = useMemo(() => {
    return [...users]
      .filter(user => {
        if (userNameFilter && !(user.full_name || '').toLowerCase().includes(userNameFilter.toLowerCase())) {
          return false
        }
        if (userEmailFilter && !(user.email || '').toLowerCase().includes(userEmailFilter.toLowerCase())) {
          return false
        }
        if (userFeaturedFilter === 'featured' && !user.is_featured) {
          return false
        }
        if (userFeaturedFilter === 'not_featured' && user.is_featured) {
          return false
        }
        if (userHelperTaskerFilter === 'helper' && !user.is_helper) {
          return false
        }
        if (userHelperTaskerFilter === 'tasker' && !user.is_tasker) {
          return false
        }
        if (userHelperTaskerFilter === 'both' && (!user.is_helper || !user.is_tasker)) {
          return false
        }
        if (userHelperTaskerFilter === 'helper_only' && (user.is_tasker || !user.is_helper)) {
          return false
        }
        if (userHelperTaskerFilter === 'tasker_only' && (user.is_helper || !user.is_tasker)) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        let aVal: string | number
        let bVal: string | number

        switch (userSortColumn) {
          case 'email':
            aVal = (a.email || '').toLowerCase()
            bVal = (b.email || '').toLowerCase()
            break
          case 'name':
            aVal = (a.full_name || '').toLowerCase()
            bVal = (b.full_name || '').toLowerCase()
            break
          case 'role':
            aVal = a.role || ''
            bVal = b.role || ''
            break
          case 'created_at':
            aVal = new Date(a.created_at).getTime()
            bVal = new Date(b.created_at).getTime()
            break
          case 'is_helper':
            aVal = a.is_helper ? 1 : 0
            bVal = b.is_helper ? 1 : 0
            break
          case 'is_featured':
            aVal = a.is_featured ? 1 : 0
            bVal = b.is_featured ? 1 : 0
            break
          default:
            return 0
        }

        if (aVal < bVal) return userSortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return userSortDirection === 'asc' ? 1 : -1
        return 0
      })
  }, [users, userNameFilter, userEmailFilter, userFeaturedFilter, userHelperTaskerFilter, userSortColumn, userSortDirection])

  const usersTotalPages = Math.max(1, Math.ceil(sortedAndFilteredUsers.length / USERS_PAGE_SIZE))

  useEffect(() => {
    setUsersListPage(1)
  }, [userNameFilter, userEmailFilter, userFeaturedFilter, userHelperTaskerFilter])

  useEffect(() => {
    setUsersListPage(p => Math.min(p, usersTotalPages))
  }, [usersTotalPages])

  function selectAllUsers() {
    setSelectedUserIds(new Set(sortedAndFilteredUsers.map(u => u.id)))
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
      // Map markers are loaded lazily when Maps tab is opened
    }
    
    checkRole()
  }, [])

  // (Skills & Services tab removed)

  useEffect(() => {
    if (tab === 'email') {
      fetchEmailTemplates()
      fetchWelcomeEmailObservability()
    }
    if (tab === 'maps' && !loadingMapMarkers && mapMarkers.length === 0) {
      fetchMapMarkers()
    }
  }, [tab, loadingMapMarkers, mapMarkers.length])

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

    bidsChannelRef.current = supabase
      .channel('admin-bids-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bids'
      }, () => {
        fetchBids()
      })
      .subscribe()

    reviewsChannelRef.current = supabase
      .channel('admin-reviews-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews'
      }, () => {
        fetchReviews()
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
      if (bidsChannelRef.current) {
        supabase.removeChannel(bidsChannelRef.current)
        bidsChannelRef.current = null
      }
      if (reviewsChannelRef.current) {
        supabase.removeChannel(reviewsChannelRef.current)
        reviewsChannelRef.current = null
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

  // Load admin-defined map markers (places)
  const fetchMapMarkers = async () => {
    try {
      setLoadingMapMarkers(true)
      setMapMarkerError(null)

      const { data, error } = await supabase
        .from('map_markers')
        .select('id, title, address, tooltip, logo_url, business_url, latitude, longitude, visible, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading map markers:', error)
        setMapMarkerError(error.message || 'Failed to load map markers')
        return
      }

      setMapMarkers(data || [])
    } catch (err: any) {
      console.error('Error loading map markers:', err)
      setMapMarkerError(err.message || 'Failed to load map markers')
    } finally {
      setLoadingMapMarkers(false)
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
      .select('id, email, full_name, phone_number, phone_country_code, role, created_at, is_helper, is_tasker, badges, is_featured, languages, is_paused, paused_reason, paused_at, conduct_guide_viewed_at, pause_warning_sent_at, archived_at')
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
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else if (data) {
      setTasks(data)
      setSelectedTaskIds([])
      await fetchTaskAllocations(data.map((t: Task) => t.id))
    }
  }

  async function fetchTaskAllocations(taskIds: string[]) {
    if (!taskIds.length) {
      setTaskAllocationsByTask({})
      return
    }

    const { data, error } = await supabase
      .from('helper_task_allocations')
      .select('task_id, helper_id, first_allocated_at, allocated_via')
      .in('task_id', taskIds)
      .order('first_allocated_at', { ascending: true })

    if (error) {
      console.error('Error fetching helper task allocations:', error)
      return
    }

    const grouped: Record<string, HelperTaskAllocation[]> = {}
    for (const row of (data || [])) {
      const taskId = (row as any).task_id as string
      if (!grouped[taskId]) grouped[taskId] = []
      grouped[taskId].push({
        helper_id: (row as any).helper_id as string,
        first_allocated_at: (row as any).first_allocated_at ?? null,
        allocated_via: (row as any).allocated_via ?? null,
      })
    }
    setTaskAllocationsByTask(grouped)
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

  const hasSelectedTasks = selectedTaskIds.length > 0

  const handleBulkToggleSample = async () => {
    if (!selectedTaskIds.length) return
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      await Promise.all(
        selectedTaskIds.map((taskId) => {
          const task = tasks.find((t) => t.id === taskId)
          if (!task) return Promise.resolve(null)
          const nextSample = !task.is_sample_task

          return fetch('/api/admin/toggle-sample-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ taskId, isSample: nextSample }),
          })
        })
      )

      await fetchTasks()
      setSelectedTaskIds([])
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Sample status updated for selected tasks',
      })
    } catch (error: any) {
      console.error('Error updating sample status in bulk:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message:
          error.message ||
          'Failed to update sample status for selected tasks. Please try again.',
      })
    }
  }

  const handleBulkToggleHidden = async () => {
    if (!selectedTaskIds.length) return
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      await Promise.all(
        selectedTaskIds.map((taskId) => {
          const task = tasks.find((t) => t.id === taskId)
          if (!task) return Promise.resolve(null)
          const nextHidden = !task.hidden_by_admin

          return fetch('/api/admin/hide-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              taskId,
              hidden: nextHidden,
              reason: null,
            }),
          })
        })
      )

      await fetchTasks()
      setSelectedTaskIds([])
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Selected tasks visibility updated',
      })
    } catch (error: any) {
      console.error('Error toggling hidden status in bulk:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message:
          error.message ||
          'Failed to update visibility for selected tasks. Please try again.',
      })
    }
  }

  const handleBulkUnlockTasks = async () => {
    if (!selectedTaskIds.length) return
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id))
      const lockedTasks = selectedTasks.filter((t) => t.status === 'locked')

      if (!lockedTasks.length) {
        setModalState({
          isOpen: true,
          type: 'info',
          title: 'No locked tasks selected',
          message: 'Select at least one locked task to unlock.',
        })
        return
      }

      await Promise.all(
        lockedTasks.map((task) =>
          fetch('/api/admin/unlock-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ taskId: task.id }),
          })
        )
      )

      await fetchTasks()
      setSelectedTaskIds([])
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: `${lockedTasks.length} locked task${lockedTasks.length === 1 ? '' : 's'} unlocked.`,
      })
    } catch (error: any) {
      console.error('Error unlocking tasks in bulk:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to unlock selected tasks. Please try again.',
      })
    }
  }

  const handleViewTask = () => {
    if (selectedTaskIds.length !== 1) {
      setModalState({
        isOpen: true,
        type: 'info',
        title: 'Select a single task',
        message: 'Please select exactly one task to view.',
      })
      return
    }
    const taskId = selectedTaskIds[0]
    router.push(`/tasks/${taskId}`)
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
      .select('id, title, budget, created_at, updated_at, payment_status, created_by, assigned_to')
      .eq('payment_status', 'paid')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching revenue:', error)
      return
    }

    const includedPaidTasks = (paidTasks || []).filter(
      (task) => !EXCLUDED_REVENUE_TASK_IDS.has(task.id)
    )

    if (includedPaidTasks.length === 0) {
      setRevenue({ tasks: [], totalRevenue: 0, totalServiceFees: 0, totalPlatformFees: 0, totalTasks: 0, dailyRevenue: [] })
      return
    }

    // Get user emails
    const userIds = Array.from(new Set([
      ...includedPaidTasks.map(t => t.created_by).filter(Boolean),
      ...includedPaidTasks.map(t => t.assigned_to).filter(Boolean)
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

    const tasksWithRevenue = includedPaidTasks
      .filter(task => task.budget != null && task.budget > 0)
      .map(task => {
        const budget = task.budget || 0
        const platformFee = budget * (PLATFORM_FEE_PERCENT / 100)
        // Use created_at as the effective completion/revenue date so we don't
        // collapse everything to a recent bulk updated_at timestamp.
        // Fall back to updated_at only if created_at is missing (should be rare).
        const completedAt = task.created_at || task.updated_at
        return {
          id: task.id,
          title: task.title,
          budget: budget,
          service_fee: SERVICE_FEE,
          platform_fee: platformFee,
          total_revenue: SERVICE_FEE + platformFee,
          completed_at: completedAt,
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
      .select('id, task_id, rating, created_at')
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

  async function fetchUserPageVisits(startDate: string, endDate: string) {
    setUserPageVisitsLoading(true)
    const { data, error } = await supabase
      .from('user_page_visits')
      .select('id, user_id, page, visited_at, profiles(full_name, email)')
      .gte('visited_at', `${startDate}T00:00:00.000Z`)
      .lte('visited_at', `${endDate}T23:59:59.999Z`)
      .order('visited_at', { ascending: false })
      .limit(500)

    setUserPageVisitsLoading(false)
    if (error) {
      console.error('Error fetching user_page_visits:', error)
      setUserPageVisits([])
      return
    }
    const rows = (data || []).map((row: any) => {
      const p = row.profiles
      const profile = Array.isArray(p) ? p[0] ?? null : p
      return {
        id: row.id,
        user_id: row.user_id,
        page: row.page,
        visited_at: row.visited_at,
        profiles: profile as { full_name: string | null; email: string | null } | null,
      } as UserPageVisitRow
    })
    setUserPageVisits(rows)
  }

  async function fetchAnonPageVisits(startDate: string, endDate: string) {
    setAnonPageVisitsLoading(true)
    const { data, error } = await supabase
      .from('anon_page_visits')
      .select('id, visitor_id, page, visited_at')
      .gte('visited_at', `${startDate}T00:00:00.000Z`)
      .lte('visited_at', `${endDate}T23:59:59.999Z`)
      .order('visited_at', { ascending: false })
      .limit(500)

    setAnonPageVisitsLoading(false)
    if (error) {
      console.error('Error fetching anon_page_visits:', error)
      setAnonPageVisits([])
      return
    }
    setAnonPageVisits((data || []) as AnonPageVisitRow[])
  }

  async function fetchTraffic(
    rangeParam?: TrafficRange,
    customStartParam?: string,
    customEndParam?: string
  ) {
    const effectiveRange = rangeParam ?? trafficRange
    const effectiveCustomStart = customStartParam ?? trafficCustomStart
    const effectiveCustomEnd = customEndParam ?? trafficCustomEnd

    const bounds = computeTrafficDateRange(effectiveRange, effectiveCustomStart, effectiveCustomEnd)
    if (!bounds) return
    const { startDate, endDate } = bounds

    const { data: rows, error } = await supabase
      .from('traffic_daily')
      .select('page, visit_date, visits')
      .gte('visit_date', startDate)
      .lte('visit_date', endDate)

    if (error) {
      console.error('Error fetching traffic_daily data:', error)
      setUserPageVisits([])
      setAnonPageVisits([])
      return
    }

    const aggregatedByPage: Record<string, number> = {}
    const aggregatedByDate: Record<string, number> = {}
    ;(rows || []).forEach((row: any) => {
      aggregatedByPage[row.page] = (aggregatedByPage[row.page] || 0) + (row.visits || 0)
      aggregatedByDate[row.visit_date] = (aggregatedByDate[row.visit_date] || 0) + (row.visits || 0)
    })

    const byPage = Object.entries(aggregatedByPage)
      .map(([page, visits]) => ({ page, visits }))
      .sort((a, b) => b.visits - a.visits)
    setTraffic(byPage)

    const byDate = Object.entries(aggregatedByDate)
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => a.date.localeCompare(b.date))
    setDailyTraffic(byDate)
    setTrafficPage(1)
    await Promise.all([
      fetchUserPageVisits(startDate, endDate),
      fetchAnonPageVisits(startDate, endDate),
    ])
  }

  async function fetchEmailLogs() {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching email logs:', error)
    } else if (data) {
      setEmailLogs(data)
    }
  }

  async function loadPrebidImagesForConversation(conversationId: string) {
    setPrebidImagesLoading(true)
    setSelectedPrebidMessageIds([])
    setPrebidImages([])

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, image_url, content, created_at')
        .eq('conversation_id', conversationId)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrebidImages((data || []) as PrebidImageMessage[])
    } catch (error: any) {
      console.error('Error loading pre-bid images:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load conversation images: ' + (error?.message || 'Unknown error'),
      })
    } finally {
      setPrebidImagesLoading(false)
    }
  }

  async function openPrebidReplacementPicker(log: any) {
    const conversationId = log?.metadata?.conversationId
    if (!conversationId) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Missing Conversation',
        message: 'This email log does not include a conversation ID, so image replacement cannot be started.',
      })
      return
    }

    setPrebidReplaceLog(log)
    setReplacementReason(DEFAULT_PREBID_REPLACEMENT_REASON)
    setReplaceAllConversationImages(false)
    await loadPrebidImagesForConversation(conversationId)
  }

  async function loadReplacementHistoryForLog(log: any) {
    if (!log?.id) {
      setReplacementHistory([])
      return
    }
    setReplacementHistoryLoading(true)
    try {
      const { data, error } = await supabase
        .from('message_image_replacements')
        .select('id, message_id, conversation_id, email_log_id, original_image_url, replacement_image_url, reason, replaced_by, created_at')
        .eq('email_log_id', log.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReplacementHistory((data || []) as MessageImageReplacementLog[])
    } catch (error: any) {
      console.error('Error loading image replacement history:', error)
      setReplacementHistory([])
    } finally {
      setReplacementHistoryLoading(false)
    }
  }

  async function replaceSelectedPrebidImage() {
    if (!prebidReplaceLog?.id) return
    if (!replaceAllConversationImages && selectedPrebidMessageIds.length === 0) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Select Image(s)',
        message: 'Please select one or more images to replace, or enable "Replace all images in this conversation".',
      })
      return
    }

    setReplacingPrebidImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/replace-prebid-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messageId: selectedPrebidMessageIds[0] || prebidImages[0]?.id || null,
          messageIds: selectedPrebidMessageIds,
          emailLogId: prebidReplaceLog.id,
          reason: replacementReason.trim() || null,
          replaceAllConversationImages: replaceAllConversationImages,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        const details = typeof result?.details === 'string' ? ` (${result.details})` : ''
        throw new Error((result?.error || 'Failed to replace image') + details)
      }

      await fetchEmailLogs()
      await loadPrebidImagesForConversation(prebidReplaceLog.metadata?.conversationId)
      if (viewingEmailLog?.id === prebidReplaceLog.id) {
        await loadReplacementHistoryForLog(prebidReplaceLog)
      }

      setSelectedPrebidMessageIds([])
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Image Replaced',
        message: 'The selected pre-bid image was replaced and the action has been logged.',
      })
    } catch (error: any) {
      console.error('Error replacing pre-bid image:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to replace image: ' + (error?.message || 'Unknown error'),
      })
    } finally {
      setReplacingPrebidImage(false)
    }
  }

  async function fetchWelcomeEmailObservability() {
    setWelcomeAuditLoading(true)
    setWelcomeAuditError(null)

    const attemptsPromise = supabase
      .from('welcome_email_attempts')
      .select('id, created_at, related_user_id, recipient_email, template_type, source, ok, skipped_reason, error_reason, meta')
      .order('created_at', { ascending: false })
      .limit(100)

    const missingPromise = supabase
      .from('confirmed_users_missing_welcome_queue')
      .select('user_id, email, user_created_at, email_confirmed_at, latest_scheduled_email_at, latest_successful_attempt_at, welcome_rows_count')
      .order('email_confirmed_at', { ascending: false })
      .limit(100)

    const [{ data: attemptsData, error: attemptsError }, { data: missingData, error: missingError }] =
      await Promise.all([attemptsPromise, missingPromise])

    if (attemptsError || missingError) {
      setWelcomeAuditError(attemptsError?.message || missingError?.message || 'Failed to load welcome observability data.')
      if (attemptsError) console.error('Error fetching welcome_email_attempts:', attemptsError)
      if (missingError) console.error('Error fetching confirmed_users_missing_welcome_queue:', missingError)
    } else {
      setWelcomeAttempts((attemptsData || []) as WelcomeEmailAttempt[])
      setMissingWelcomeQueueRows((missingData || []) as MissingWelcomeQueueRow[])
    }

    setWelcomeAuditLoading(false)
  }

  function looksLikeEmail(value: string): boolean {
    const s = String(value).trim()
    if (!s || !s.includes('@')) return false
    const parts = s.split('@')
    return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.')
  }

  function resolveUserFullNameByEmail(email: string | null | undefined): string | null {
    if (!email) return null
    const u = users.find((x) => x.email?.toLowerCase() === String(email).toLowerCase())
    return u?.full_name?.trim() || null
  }

  function getEmailLogSenderName(log: any): string {
    const metadata = log?.metadata || {}
    const templateType = String(metadata?.template_type || '')
    const sendKind = String(metadata?.send_kind || '')

    // Automated bid notification templates should always appear as System sender.
    if (
      log?.email_type === 'template_email' &&
      (
        templateType === 'tasker_bid_received' ||
        templateType === 'tasker_bid_updated' ||
        sendKind === 'immediate_bid_event' ||
        sendKind === 'rebid_event' ||
        sendKind === 'scheduled_bid_event'
      )
    ) {
      return 'System'
    }

    const nameHints = [
      metadata.senderName,
      metadata.bidderName,
      metadata.taskerName,
      metadata.helperName,
      metadata.sender,
    ].filter(Boolean) as string[]

    for (const hint of nameHints) {
      const s = String(hint).trim()
      if (!s) continue
      if (looksLikeEmail(s)) {
        const resolved = resolveUserFullNameByEmail(s)
        if (resolved) return resolved
        continue
      }
      return s
    }

    const metaEmails = [
      metadata.senderEmail,
      metadata.bidderEmail,
      metadata.taskerEmail,
      metadata.helperEmail,
    ].filter(Boolean) as string[]

    for (const em of metaEmails) {
      const resolved = resolveUserFullNameByEmail(em)
      if (resolved) return resolved
    }

    if (log?.sent_by) {
      const senderUser = users.find((u) => u.id === log.sent_by)
      if (senderUser?.full_name?.trim()) return senderUser.full_name.trim()
      return 'Member'
    }

    return 'System'
  }

  function renderEmailLogSubject(log: any): string {
    const rawSubject = String(log?.subject || '').trim()
    if (!rawSubject) return '-'

    const metadata = log?.metadata || {}
    const vars = (metadata?.variables && typeof metadata.variables === 'object')
      ? metadata.variables
      : {}
    if (!rawSubject.includes('{{') || !vars || Object.keys(vars).length === 0) {
      return rawSubject
    }

    let rendered = rawSubject
    for (const [key, value] of Object.entries(vars)) {
      const safeValue = value == null ? '' : String(value)
      rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), safeValue)
    }

    return rendered
  }

  function getUserIdByEmailOrName(email?: string | null, name?: string | null): string | null {
    if (email) {
      const matchByEmail = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (matchByEmail?.id) return matchByEmail.id
    }
    if (name) {
      const matchByName = users.find((u) => u.full_name?.toLowerCase() === name.toLowerCase())
      if (matchByName?.id) return matchByName.id
    }
    return null
  }

  function getEmailLogRecipientProfileId(log: any): string | null {
    return (
      log?.related_user_id ||
      getUserIdByEmailOrName(log?.recipient_email, log?.recipient_name)
    )
  }

  function getEmailLogSenderProfileId(log: any): string | null {
    const metadata = log?.metadata || {}
    const hint =
      metadata.senderName ||
      metadata.bidderName ||
      metadata.taskerName ||
      metadata.helperName ||
      null
    const hintStr = hint != null ? String(hint).trim() : ''
    const emailFromMeta =
      metadata.senderEmail ||
      metadata.bidderEmail ||
      metadata.taskerEmail ||
      metadata.helperEmail ||
      (hintStr && looksLikeEmail(hintStr) ? hintStr : null)
    const nameForLookup = hintStr && !looksLikeEmail(hintStr) ? hintStr : null
    return (
      log?.sent_by ||
      getUserIdByEmailOrName(emailFromMeta, nameForLookup)
    )
  }

  async function fetchEmailTemplates() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return
      }

      const response = await fetch('/api/admin/email-templates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setEmailTemplates(result.templates || [])
      }
    } catch (error) {
      console.error('Error fetching email templates:', error)
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
        } else if (setting.key === 'helper_task_match_enabled') {
          setHelperTaskMatchEnabled(setting.value === 'true')
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

      // Update helper task match feature flag
      const { error: error3 } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'helper_task_match_enabled',
          value: helperTaskMatchEnabled ? 'true' : 'false',
          description: 'Enable helper task match system (matching + emails)',
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        }, { onConflict: 'key' })

      if (error3) throw error3

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

  async function previewHelperTaskMatch(taskId: string) {
    try {
      setPreviewError(null)
      setPreviewLoading(true)
      setPreviewResult({ task: null, matches: [], reason: undefined })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/admin/helper-task-match-preview?taskId=${encodeURIComponent(taskId)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || `Failed to load preview (${response.status})`)
      }

      setPreviewResult({
        task: data.task || null,
        matches: data.matches || [],
        reason: data.reason,
        aiClassification: data.aiClassification || undefined,
        matchMode: data.matchMode || undefined,
        allocatedCount: Number(data.allocatedCount || 0),
        excludedCount: Number(data.excludedCount || 0),
        taskTypeKey: data.taskTypeKey || undefined,
      })
      setSelectedSendHelperIds(new Set((data.matches || []).filter((m: any) => !m.isAllocated && !m.isExcluded).map((m: any) => m.id as string)))
      setOverrideExcludedHelperIds(new Set())
      return data
    } catch (error: any) {
      console.error('Error fetching helper task match preview:', error)
      setPreviewError(error.message || 'Failed to load preview')
      return null
    } finally {
      setPreviewLoading(false)
    }
  }

  async function sendHelperTaskMatchSample(taskId: string) {
    try {
      setPreviewError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/helper-task-match-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ taskId }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || `Failed to send sample (${response.status})`)
      }

      setPreviewError(`Sample email sent to ${data.sentTo || 'admin'}.`)
    } catch (error: any) {
      console.error('Error sending helper task match sample:', error)
      setPreviewError(error.message || 'Failed to send sample email')
    }
  }

  async function fetchSendTaskMatches(taskId: string) {
    setSendTaskMatches([])
    setSelectedSendHelperIds(new Set())
    setSendMatchesMessage(null)
    if (!taskId) return
    setSendTaskMatchesLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const response = await fetch(`/api/admin/helper-task-match-preview?taskId=${encodeURIComponent(taskId)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && Array.isArray(data.matches)) {
        setSendTaskMatches(data.matches)
        setSelectedSendHelperIds(new Set(data.matches.filter((m: any) => !m.isAllocated && !m.isExcluded).map((m: any) => m.id as string)))
        setOverrideExcludedHelperIds(new Set())
      }
    } catch (error: any) {
      console.error('Error fetching send task matches:', error)
    } finally {
      setSendTaskMatchesLoading(false)
    }
  }

  function openScoreBreakdown(source: 'preview' | 'send', helper: any) {
    const compositeScore = typeof helper?.compositeScore === 'number' ? helper.compositeScore : null
    setScoreBreakdownDetails({
      source,
      helperName: helper?.name || 'Helper',
      compositeScore,
      semanticScore: Number(helper?.semanticScore ?? 0),
      distanceScore: Number(helper?.distanceScore ?? 0),
      professionScore: Number(helper?.professionScore ?? 0),
      skillScore: Number(helper?.skillScore ?? 0),
      profileScore: Number(helper?.profileScore ?? 0),
    })
  }

  async function sendHelperTaskMatchEmails(taskId: string, helperIds: string[], overrideExcludedIds: string[] = []) {
    try {
      setSendMatchesMessage(null)
      setSendingMatches(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/helper-task-match-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          taskId,
          helperIds,
          overrideExcludedHelperIds: overrideExcludedIds,
          channels: [
            ...(sendViaEmail ? ['email'] : []),
            ...(sendViaSms ? ['sms'] : []),
          ],
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || `Failed to send (${response.status})`)
      }

      const parts: string[] = []
      if (sendViaEmail) parts.push(`${data.sent || 0} email(s)`)
      if (sendViaSms) parts.push(`${data.smsSent || 0} SMS`)
      const skippedAllocated = Number(data.skippedAllocated || 0)
      const skippedExcluded = Number(data.skippedExcluded || 0)
      const overriddenExcludedSent = Number(data.overriddenExcludedSent || 0)
      setSendMatchesMessage(
        `Sent: ${parts.join(', ')}. Skipped ${data.skipped || 0} (already sent/invalid)${skippedAllocated > 0 ? `. ${skippedAllocated} already allocated to this task.` : ''}${skippedExcluded > 0 ? `. ${skippedExcluded} excluded for this task type.` : ''}${overriddenExcludedSent > 0 ? `. ${overriddenExcludedSent} excluded helper(s) were sent by override.` : ''}`
      )
      await fetchTasks()
      if (previewTaskId) {
        await previewHelperTaskMatch(previewTaskId)
      }
    } catch (error: any) {
      console.error('Error sending helper task match emails:', error)
      setSendMatchesMessage(error.message || 'Failed to send helper match emails.')
    } finally {
      setSendingMatches(false)
    }
  }

  async function submitHelperMatchFeedback(
    taskId: string,
    helperId: string,
    action: 'exclude' | 'clear',
    reason: string,
    notes: string
  ) {
    try {
      setPreviewError(null)
      setUpdatingMatchFeedbackHelperId(helperId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/admin/helper-match-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          taskId,
          helperId,
          action,
          reason,
          notes,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `Failed to update feedback (${response.status})`)

      // Optimistic UI update so admin sees immediate state change.
      setPreviewResult((prev) => {
        const updatedMatches = (prev.matches || []).map((m: any) => {
          if (m.id !== helperId) return m
          if (action === 'exclude') {
            return {
              ...m,
              isExcluded: true,
              excludeReason: reason,
              excludeNotes: notes || null,
              excludeCreatedAt: new Date().toISOString(),
            }
          }
          return {
            ...m,
            isExcluded: false,
            excludeReason: null,
            excludeNotes: null,
            excludeCreatedAt: null,
            excludeFeedbackId: null,
          }
        })
        return {
          ...prev,
          matches: updatedMatches,
          excludedCount: updatedMatches.filter((m: any) => m.isExcluded).length,
        }
      })

      setSelectedSendHelperIds((prev) => {
        const next = new Set(prev)
        if (action === 'exclude') next.delete(helperId)
        return next
      })
      if (action === 'clear') {
        setOverrideExcludedHelperIds((prev) => {
          const next = new Set(prev)
          next.delete(helperId)
          return next
        })
      }

      setSendMatchesMessage(action === 'exclude' ? 'Helper marked as excluded for this task type.' : 'Helper exclusion cleared for this task type.')
      const refreshed = await previewHelperTaskMatch(taskId)
      const refreshedHelper = (refreshed?.matches || []).find((m: any) => m.id === helperId)
      if (action === 'exclude' && refreshedHelper && !refreshedHelper.isExcluded) {
        const savedKey = typeof data?.taskTypeKey === 'string' ? data.taskTypeKey : 'unknown'
        const previewKey = typeof refreshed?.taskTypeKey === 'string' ? refreshed.taskTypeKey : 'unknown'
        setPreviewError(
          `This helper did not persist as unsuitable after refresh. helperId=${helperId}, savedKey=${savedKey}, previewKey=${previewKey}`
        )
      }
      if (action === 'clear' && refreshedHelper && refreshedHelper.isExcluded) {
        const savedKey = typeof data?.taskTypeKey === 'string' ? data.taskTypeKey : 'unknown'
        const previewKey = typeof refreshed?.taskTypeKey === 'string' ? refreshed.taskTypeKey : 'unknown'
        setPreviewError(
          `This helper is still marked unsuitable after refresh. helperId=${helperId}, savedKey=${savedKey}, previewKey=${previewKey}`
        )
      }
      router.refresh()
    } catch (error: any) {
      setSendMatchesMessage(error.message || 'Failed to update helper match feedback.')
    } finally {
      setUpdatingMatchFeedbackHelperId(null)
    }
  }

  async function updateHelperMatchFeedback(taskId: string, helperId: string, action: 'exclude' | 'clear') {
    if (action === 'exclude') {
      setPendingExcludeFeedbackTarget({ taskId, helperId })
      setMatchFeedbackReasonInput('wrong_skill')
      setShowMatchFeedbackReasonModal(true)
      return
    }
    await submitHelperMatchFeedback(taskId, helperId, action, 'not_suitable', '')
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

  async function pauseUser(userId: string, currentlyPaused: boolean, reason?: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/pause-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId, pause: !currentlyPaused, reason }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'Failed to update user')
        return
      }
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, is_paused: json.is_paused, paused_reason: reason || null }
          : u
      ))

      if (json.repeat_offender) {
        const readGuide = json.conduct_guide_viewed_at
          ? `They read the Professional Conduct Guide on ${new Date(json.conduct_guide_viewed_at).toLocaleDateString()}.`
          : 'They were sent the Professional Conduct Guide but never read it.'
        setModalState({
          isOpen: true,
          type: 'confirm',
          title: 'Repeat Offender',
          message: `${json.user_name} was previously warned and is being paused again.\n\n${readGuide}\n\nWould you like to archive this user? Their personal data will be anonymized and login disabled, but all messages and activity will be preserved for audit.`,
          onConfirm: () => {
            setModalState(prev => ({ ...prev, isOpen: false }))
            performArchiveUser(userId)
          },
        })
        setModalConfirmText('Archive User')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user')
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

  async function archiveUser(userId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const checkRes = await fetch('/api/admin/archive-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ userId, check: true }),
      })
      const check = await checkRes.json()

      const c = check.counts || {}
      let msg = `This will permanently delete ${check.user_name || 'this user'}'s login and personal information.\n\n`
      msg += `Audit trail: ${c.messages ?? 0} messages, ${c.bids ?? 0} bids, and ${c.tasks ?? 0} tasks will be kept for records but anonymized.\n`

      if (check.has_blockers) {
        msg += `\n⚠️ WARNING — active work detected:\n`
        for (const b of check.blockers) {
          msg += `• ${b}\n`
        }
        msg += `\nYou should finish these jobs or refund the money before archiving. Archive anyway?`
      } else {
        msg += `\nThis cannot be undone. Are you sure?`
      }

      setModalState({
        isOpen: true,
        type: 'confirm',
        title: check.has_blockers ? '⚠️ Archive User — Active Work' : 'Archive User',
        message: msg,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }))
          performArchiveUser(userId, check.has_blockers)
        },
      })
      setModalConfirmText(check.has_blockers ? 'Archive Anyway' : 'Archive User')
    } catch (error: any) {
      alert('Failed to check user status: ' + (error.message || 'Unknown error'))
    }
  }

  async function performArchiveUser(userId: string, force = false) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const response = await fetch('/api/admin/archive-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ userId, force }),
      })
      const result = await response.json()
      if (response.ok) {
        const p = result.preserved_items
        const summary = p
          ? `\nPreserved for audit:\n- ${p.tasks ?? 0} tasks\n- ${p.bids ?? 0} bids\n- ${p.messages ?? 0} messages\n- ${p.reviews ?? 0} reviews`
          : ''
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'User Archived',
          message: `User archived successfully. PII removed, login disabled.${summary}`,
        })
        fetchUsers()
      } else {
        throw new Error(result.error || 'Failed to archive user')
      }
    } catch (error: any) {
      console.error('Error archiving user:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error archiving user: ' + (error.message || 'Unknown error'),
      })
    }
  }

  function openBadgeManager(user?: User) {
    const targetUser = user || (selectedUserIds.size === 1 ? users.find(u => selectedUserIds.has(u.id)) : null)
    if (!targetUser) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Selection Required',
        message: 'Please select exactly one helper or tasker to manage badges',
      })
      return
    }
    if (!targetUser.is_helper && !targetUser.is_tasker) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Selection',
        message: 'Selected user is not a helper or tasker',
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

      // Create FormData if there's an attachment, otherwise use JSON
      let body: FormData | string
      let headers: Record<string, string> = {}

      if (emailAttachment) {
        body = new FormData()
        body.append('type', 'admin_email')
        body.append('recipientEmail', emailRecipient)
        body.append('recipientName', recipientName)
        body.append('subject', emailSubject)
        body.append('message', emailMessage)
        body.append('attachment', emailAttachment)
        // Don't set Content-Type header - browser will set it with boundary for FormData
      } else {
        body = JSON.stringify({
          type: 'admin_email',
          recipientEmail: emailRecipient,
          recipientName: recipientName,
          subject: emailSubject,
          message: emailMessage,
        })
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: headers,
        body: body,
      })

      const result = await response.json()

      if (response.ok) {
        setEmailSuccessRecipient(emailRecipient)
        setEmailRecipient('')
        setEmailMessage('')
        setEmailSubject('')
        setEmailAttachment(null)
        setSelectedUserForEmail('')
        // Reset file input
        if (emailAttachmentInputRef.current) {
          emailAttachmentInputRef.current.value = ''
        }
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

  async function sendWelcomeEmail(userId: string, templateType: string) {
    const user = users.find(u => u.id === userId)
    if (!user) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'User not found',
      })
      return
    }

    setSendingEmail(true)
    try {
      // Get auth token from Supabase client
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'template_email',
          templateType: templateType,
          recipientEmail: user.email,
          recipientName: user.full_name || user.email,
          relatedUserId: userId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Email Sent',
          message: `Email sent successfully to ${user.email}`,
        })
        fetchEmailLogs() // Refresh email logs
        setSelectedUserForEmail('')
        setSelectedEmailTemplate('')
      } else {
        const errorMsg = result.error || 'Failed to send email'
        // Provide helpful message if template doesn't exist
        if (errorMsg.includes('Template not found')) {
          throw new Error(`Template not found. Please create the ${templateType === 'helper_welcome' ? 'Helper Welcome' : 'Tasker Welcome'} template first using the template editor above.`)
        }
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error('Error sending welcome email:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error sending welcome email: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setSendingEmail(false)
    }
  }

  async function sendFreeFormEmail(recipientId?: string, subject?: string, content?: string) {
    const recipient = recipientId || freeFormRecipient
    const emailSubject = subject || freeFormSubject
    const emailContent = content || freeFormContent
    const user = users.find(u => u.id === recipient)
    if (!user) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Please select a recipient',
      })
      return
    }

    if (!emailSubject.trim() || !emailContent.trim()) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in both subject and content',
      })
      return
    }

    setSendingEmail(true)
    try {
      // Get auth token from Supabase client
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Replace variables in content
      let renderedContent = emailContent
        .replace(/\{\{user_name\}\}/g, user.full_name || user.email || '')
        .replace(/\{\{user_email\}\}/g, user.email || '')
      
      // Replace tee_image if present
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.taskorilla.com'
      const imageUrl = `${baseUrl}/images/gorilla-mascot-new-email.png`.replace(/([^:]\/)\/+/g, '$1')
      const mascotImageHtml = `<img src="${imageUrl}" alt="Tee - Taskorilla Mascot" style="height: 150px; display: block; margin: 0; padding: 0;" />`
      renderedContent = renderedContent.replace(/\{\{tee_image\}\}/gi, mascotImageHtml)
      renderedContent = renderedContent.replace(/\{\{mascot\}\}/gi, mascotImageHtml)

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'admin_email',
          recipientEmail: user.email,
          recipientName: user.full_name || user.email,
          subject: emailSubject.trim(),
          message: renderedContent,
          relatedUserId: recipient,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Email Sent',
          message: `Email sent successfully to ${user.email}`,
        })
        fetchEmailLogs() // Refresh email logs
        // Clear form only if called from admin page (no parameters)
        if (!recipientId) {
          setFreeFormSubject('')
          setFreeFormContent('')
          setFreeFormRecipient('')
        }
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error: any) {
      console.error('Error sending free-form email:', error)
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

  async function deleteEmailLog(logId: string | string[]) {
    const idsToDelete = Array.isArray(logId) ? logId : [logId]
    setDeletingEmailLogId(null) // Close modal first
    setSelectedEmailLogIds([]) // Clear selection
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase
        .from('email_logs')
        .delete()
        .in('id', idsToDelete)

      if (error) {
        throw error
      }

      setModalState({
        isOpen: true,
        type: 'success',
        title: idsToDelete.length === 1 ? 'Email Log Deleted' : 'Email Logs Deleted',
        message: `${idsToDelete.length} email log${idsToDelete.length === 1 ? ' has' : 's have'} been deleted successfully.`,
      })

      // Refresh email logs
      fetchEmailLogs()
    } catch (error: any) {
      console.error('Error deleting email log:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete email log: ' + (error.message || 'Unknown error'),
      })
    }
  }

  // Calculate stats data
  const realTasks = tasks.filter(t => t.is_sample_task !== true)
  const realTaskIdSet = new Set(realTasks.map(t => t.id))
  const realBids = bids.filter(b => realTaskIdSet.has(b.task_id))
  const realReviews = reviews.filter(r => realTaskIdSet.has(r.task_id))
  const latestBidByHelperTask = realBids.reduce((acc, bid) => {
    const key = `${bid.task_id}:${bid.user_id}`
    const existing = acc.get(key)
    if (!existing || new Date(bid.created_at).getTime() > new Date(existing.created_at).getTime()) {
      acc.set(key, bid)
    }
    return acc
  }, new Map<string, Bid>())
  const latestRealBids = Array.from(latestBidByHelperTask.values())
  const userById = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  )
  const taskById = useMemo(
    () => new Map(realTasks.map((t) => [t.id, t])),
    [realTasks]
  )

  const taskStatusCounts = {
    open: realTasks.filter(t => t.status === 'open').length,
    pending_payment: realTasks.filter(t => t.status === 'pending_payment').length,
    in_progress: realTasks.filter(t => t.status === 'in_progress').length,
    completed: realTasks.filter(t => t.status === 'completed').length,
    cancelled: realTasks.filter(t => t.status === 'cancelled').length,
  }

  const userRoleCounts = {
    user: users.filter(u => u.role === 'user').length,
    admin: users.filter(u => u.role === 'admin').length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
  }

  const totalBudget = realTasks.reduce((sum, t) => sum + (Number(t.budget) || 0), 0)
  const avgBudget = realTasks.length > 0 ? totalBudget / realTasks.length : 0
  const completedTasksWithBudget = realTasks.filter(t => t.status === 'completed' && Number(t.budget))
  const totalSpent = completedTasksWithBudget.reduce((sum, t) => sum + (Number(t.budget) || 0), 0)
  const acceptedBids = latestRealBids.filter(b => b.status === 'accepted')
  const totalAcceptedBidAmount = acceptedBids.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

  const bidStatusCounts = {
    pending: realBids.filter(b => b.status === 'pending').length,
    accepted: realBids.filter(b => b.status === 'accepted').length,
    rejected: realBids.filter(b => b.status === 'rejected').length,
    withdrawn: realBids.filter(b => b.status === 'withdrawn').length,
  }
  const avgBidBaseBids = realBids.filter((b) => b.status !== 'withdrawn')
  const avgBidAmount = avgBidBaseBids.length > 0
    ? avgBidBaseBids.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) / avgBidBaseBids.length
    : 0
  const avgAcceptedBidAmount = acceptedBids.length > 0
    ? totalAcceptedBidAmount / acceptedBids.length
    : 0

  const avgRating = realReviews.length > 0
    ? realReviews.reduce((sum, r) => sum + r.rating, 0) / realReviews.length
    : 0
  const ratingDistribution = {
    5: realReviews.filter(r => r.rating === 5).length,
    4: realReviews.filter(r => r.rating === 4).length,
    3: realReviews.filter(r => r.rating === 3).length,
    2: realReviews.filter(r => r.rating === 2).length,
    1: realReviews.filter(r => r.rating === 1).length,
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
    count: realTasks.filter(t => t.created_at.split('T')[0] === date).length
  }))

  const bidsByTaskId = realBids.reduce((acc, bid) => {
    if (!acc.has(bid.task_id)) acc.set(bid.task_id, [])
    acc.get(bid.task_id)!.push(bid)
    return acc
  }, new Map<string, typeof realBids>())

  const last30StartDate = new Date(`${last30Days[0]}T00:00:00`)
  const recentRealTasks = realTasks.filter(t => new Date(t.created_at) >= last30StartDate)

  const taskFunnelData = {
    created: recentRealTasks.length,
    withBid: recentRealTasks.filter(t => (bidsByTaskId.get(t.id) || []).length > 0).length,
    acceptedOrPendingPayment: recentRealTasks.filter(t =>
      t.status === 'pending_payment' ||
      t.status === 'in_progress' ||
      t.status === 'completed' ||
      (bidsByTaskId.get(t.id) || []).some(b => b.status === 'accepted')
    ).length,
    paid: recentRealTasks.filter(t => t.payment_status === 'paid').length,
    completed: recentRealTasks.filter(t => t.status === 'completed').length,
  }

  const getMedian = (values: number[]): number | null => {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
    return sorted[mid]
  }

  const medianFirstBidMinutesData = last30Days.map(date => {
    const dayTasks = realTasks.filter(t => t.created_at.split('T')[0] === date)
    const firstBidMinutes = dayTasks
      .map(task => {
        const taskBids = bidsByTaskId.get(task.id) || []
        if (taskBids.length === 0) return null
        const firstBid = taskBids.reduce((earliest, bid) =>
          new Date(bid.created_at) < new Date(earliest.created_at) ? bid : earliest
        )
        const diffMs = new Date(firstBid.created_at).getTime() - new Date(task.created_at).getTime()
        const diffMinutes = diffMs / (1000 * 60)
        return diffMinutes >= 0 ? diffMinutes : null
      })
      .filter((v): v is number => typeof v === 'number')

    return {
      date,
      medianMinutes: getMedian(firstBidMinutes),
    }
  })
  const medianFirstBidHoursData = medianFirstBidMinutesData.map((d) => ({
    date: d.date,
    medianHours: d.medianMinutes == null ? null : d.medianMinutes / 60,
  }))

  const getRevenueRangeStart = (range: RevenueRange, now: Date): Date | null => {
    const start = new Date(now)
    switch (range) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        return start
      case 'week':
        start.setDate(start.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        return start
      case 'month':
        start.setDate(start.getDate() - 29)
        start.setHours(0, 0, 0, 0)
        return start
      case 'year':
        start.setMonth(start.getMonth() - 11, 1)
        start.setHours(0, 0, 0, 0)
        return start
      case 'all':
      default:
        return null
    }
  }

  const now = new Date()
  const revenueRangeStart = getRevenueRangeStart(revenueRange, now)
  const rangeFilteredTasks = revenue.tasks.filter(task => {
    if (!revenueRangeStart) return true
    return new Date(task.completed_at) >= revenueRangeStart
  })
  const revenueSummary = {
    totalRevenue: rangeFilteredTasks.reduce((sum, t) => sum + t.total_revenue, 0),
    totalServiceFees: rangeFilteredTasks.reduce((sum, t) => sum + t.service_fee, 0),
    totalPlatformFees: rangeFilteredTasks.reduce((sum, t) => sum + t.platform_fee, 0),
    totalTasks: rangeFilteredTasks.length,
  }

  const revenueLabelByRange: Record<RevenueRange, string> = {
    day: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    year: 'Last 12 Months',
    all: 'All Time',
  }

  const revenueChartData = (() => {
    type RevenueBucket = { key: string; label: string; revenue: number; tasks: number }
    const buckets = new Map<string, RevenueBucket>()

    if (revenueRange === 'day') {
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(now)
        hourDate.setHours(hour, 0, 0, 0)
        const key = `${hourDate.getFullYear()}-${String(hourDate.getMonth() + 1).padStart(2, '0')}-${String(hourDate.getDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}`
        buckets.set(key, { key, label: `${String(hour).padStart(2, '0')}:00`, revenue: 0, tasks: 0 })
      }
      rangeFilteredTasks.forEach(task => {
        const completed = new Date(task.completed_at)
        const key = `${completed.getFullYear()}-${String(completed.getMonth() + 1).padStart(2, '0')}-${String(completed.getDate()).padStart(2, '0')} ${String(completed.getHours()).padStart(2, '0')}`
        const bucket = buckets.get(key)
        if (bucket) {
          bucket.revenue += task.total_revenue
          bucket.tasks += 1
        }
      })
      return Array.from(buckets.values())
    }

    const useMonthlyBuckets = revenueRange === 'year' || revenueRange === 'all'
    if (useMonthlyBuckets) {
      let startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      if (revenueRange === 'year') {
        startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      } else if (rangeFilteredTasks.length > 0) {
        const earliest = rangeFilteredTasks.reduce((min, task) => {
          const d = new Date(task.completed_at)
          return d < min ? d : min
        }, new Date(rangeFilteredTasks[0].completed_at))
        startMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
      }

      const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const cursor = new Date(startMonth)
      while (cursor <= endMonth) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
        buckets.set(key, {
          key,
          label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue: 0,
          tasks: 0,
        })
        cursor.setMonth(cursor.getMonth() + 1)
      }

      rangeFilteredTasks.forEach(task => {
        const completed = new Date(task.completed_at)
        const key = `${completed.getFullYear()}-${String(completed.getMonth() + 1).padStart(2, '0')}`
        const bucket = buckets.get(key)
        if (bucket) {
          bucket.revenue += task.total_revenue
          bucket.tasks += 1
        }
      })
      return Array.from(buckets.values())
    }

    // week/month => daily buckets
    const days = revenueRange === 'week' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const key = date.toISOString().split('T')[0]
      buckets.set(key, {
        key,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        tasks: 0,
      })
    }
    rangeFilteredTasks.forEach(task => {
      const key = task.completed_at.split('T')[0]
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.revenue += task.total_revenue
        bucket.tasks += 1
      }
    })
    return Array.from(buckets.values())
  })()

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
          {(['users', 'tasks', 'awaiting_payment', 'reports', 'stats', 'revenue', 'email', 'matching', 'traffic', 'settings', 'maps', 'blog'] as const).map((t: typeof tab) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {t === 'awaiting_payment' ? 'Awaiting Payment' : t === 'email' ? 'Comms' : t === 'matching' ? 'Matching' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <Link
            href="/admin/translations"
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 border border-purple-600 transition-colors"
          >
            Translations
          </Link>
          <Link
            href="/admin/posting-manager"
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 transition-colors"
          >
            Posting Manager
          </Link>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (() => {
          const usersPaginated = sortedAndFilteredUsers.slice(
            (usersListPage - 1) * USERS_PAGE_SIZE,
            usersListPage * USERS_PAGE_SIZE
          )
          const allOnPageSelected =
            usersPaginated.length > 0 && usersPaginated.every(u => selectedUserIds.has(u.id))

          const handleSort = (column: string) => {
            if (userSortColumn === column) {
              setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc')
            } else {
              setUserSortColumn(column)
              setUserSortDirection('asc')
            }
          }

          const SortIcon = ({ column }: { column: string }) => {
            if (userSortColumn !== column) return <span className="text-gray-400 ml-1">⇅</span>
            return userSortDirection === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>
          }

          return (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">Users ({sortedAndFilteredUsers.length}{sortedAndFilteredUsers.length !== users.length ? ` of ${users.length}` : ''})</h2>
                {sortedAndFilteredUsers.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Showing {(usersListPage - 1) * USERS_PAGE_SIZE + 1}–
                    {Math.min(usersListPage * USERS_PAGE_SIZE, sortedAndFilteredUsers.length)} of {sortedAndFilteredUsers.length}
                    {usersTotalPages > 1 ? ` · Page ${usersListPage} of ${usersTotalPages}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={selectAllUsers}
                  className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1"
                  title="Select everyone matching current filters"
                >
                  Select all (filtered)
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1"
                >
                  Clear ({selectedUserIds.size})
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by name..."
                    value={userNameFilter}
                    onChange={(e) => setUserNameFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by email..."
                    value={userEmailFilter}
                    onChange={(e) => setUserEmailFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Featured
                  </label>
                  <select
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={userFeaturedFilter}
                    onChange={(e) => setUserFeaturedFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="featured">Featured Only</option>
                    <option value="not_featured">Not Featured</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Helper / Tasker
                  </label>
                  <select
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={userHelperTaskerFilter}
                    onChange={(e) => setUserHelperTaskerFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="helper">Helpers Only</option>
                    <option value="tasker">Taskers Only</option>
                    <option value="both">Both Helper & Tasker</option>
                    <option value="helper_only">Helper Only (not Tasker)</option>
                    <option value="tasker_only">Tasker Only (not Helper)</option>
                  </select>
                </div>
              </div>
              {(userNameFilter || userEmailFilter || userFeaturedFilter || userHelperTaskerFilter) && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setUserNameFilter('')
                      setUserEmailFilter('')
                      setUserFeaturedFilter('')
                      setUserHelperTaskerFilter('')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            {/* Actions Toolbar — always visible; buttons disable when not applicable */}
            {(() => {
              const bulkSelected = getSelectedUsers()
              const helperSelected = bulkSelected.filter(u => u.is_helper)
              const helperCount = helperSelected.length
              const allHelpersFeatured =
                helperCount > 0 && helperSelected.every(h => h.is_featured)
              const canManageBadges =
                selectedUserIds.size === 1 &&
                bulkSelected.length === 1 &&
                !!(bulkSelected[0].is_helper || bulkSelected[0].is_tasker)
              const promoteCount = bulkSelected.filter(u => u.role === 'user').length
              const demoteCount = bulkSelected.filter(u => u.role === 'admin').length
              const deletableCount = bulkSelected.filter(u => u.role !== 'superadmin').length
              const bulkPauseCount = bulkSelected.filter(
                u =>
                  u.role !== 'superadmin' &&
                  !u.archived_at &&
                  !(u as AppUser).is_paused
              ).length

              const btnDisabled = 'disabled:opacity-45 disabled:cursor-not-allowed'
              return (
              <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedUserIds.size === 0
                        ? 'No users selected — use the checkboxes in the table below.'
                        : `${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's' : ''} selected:`}
                    </span>
                    {bulkSelected.slice(0, 3).map(u => (
                      <span key={u.id} className="text-xs bg-white px-2 py-1 rounded border">
                        {u.full_name || u.email}
                      </span>
                    ))}
                    {selectedUserIds.size > 3 && (
                      <span className="text-xs text-gray-500">+{selectedUserIds.size - 3} more</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canManageBadges}
                      title={
                        canManageBadges
                          ? 'Open badge editor for this user'
                          : 'Select exactly one helper or tasker'
                      }
                      onClick={() => openBadgeManager()}
                      className={`bg-amber-500 hover:bg-amber-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium ${btnDisabled}`}
                    >
                      🏅 Manage Badges
                    </button>
                    <button
                      type="button"
                      disabled={helperCount === 0}
                      title={helperCount === 0 ? 'Select one or more helpers to toggle featured' : undefined}
                      onClick={async () => {
                        if (helperCount === 0) return
                        for (const helper of helperSelected) {
                          await toggleFeatured(helper.id, helper.is_featured || false)
                        }
                        clearSelection()
                      }}
                      className={`bg-purple-500 hover:bg-purple-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium ${btnDisabled}`}
                    >
                      ⭐ {allHelpersFeatured ? 'Unfeature' : 'Feature'} ({helperCount})
                    </button>
                    <button
                      type="button"
                      disabled={promoteCount === 0}
                      title={promoteCount === 0 ? 'Select users with role “user” to promote' : undefined}
                      onClick={() => {
                        if (promoteCount === 0) return
                        const selectedUsers = bulkSelected.filter(u => u.role === 'user')
                        const count = selectedUsers.length
                        const nameList = selectedUsers
                          .map(u => (u.full_name || u.email || u.id).trim())
                          .join('\n• ')
                        setModalState({
                          isOpen: true,
                          type: 'confirm',
                          title: 'Grant admin access?',
                          message:
                            `Warning: As superadmin, you are about to grant ADMIN status to ${count} user${count === 1 ? '' : 's'}.\n\n` +
                            `Admins can use most of this dashboard (users, tasks, emails, and other sensitive actions). Only promote people you fully trust.\n\n` +
                            `Users to promote:\n• ${nameList}\n\nContinue?`,
                          onConfirm: async () => {
                            setModalState(prev => ({ ...prev, isOpen: false }))
                            for (const user of selectedUsers) {
                              await promoteUser(user.id, 'admin')
                            }
                            clearSelection()
                          },
                        })
                        setModalConfirmText('Yes, promote to Admin')
                      }}
                      className={`bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium ${btnDisabled}`}
                    >
                      ⬆ Promote to Admin ({promoteCount})
                    </button>
                    <button
                      type="button"
                      disabled={demoteCount === 0}
                      title={demoteCount === 0 ? 'Select admin users to demote' : undefined}
                      onClick={async () => {
                        if (demoteCount === 0) return
                        const toDemote = bulkSelected.filter(u => u.role === 'admin')
                        for (const user of toDemote) {
                          await promoteUser(user.id, 'user')
                        }
                        clearSelection()
                      }}
                      className={`bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium ${btnDisabled}`}
                    >
                      ⬇ Demote to User ({demoteCount})
                    </button>
                    <button
                      type="button"
                      disabled={bulkPauseCount === 0}
                      title={
                        bulkPauseCount === 0
                          ? 'Select users who are not superadmin, not archived, and not already paused'
                          : 'Pause selected users (optional reason applies to all)'
                      }
                      onClick={async () => {
                        if (bulkPauseCount === 0) return
                        const raw = prompt(
                          'Reason for pausing (optional). This will be sent for each user; leave blank if none:'
                        )
                        if (raw === null) return
                        const reason = raw.trim() || undefined
                        const toPause = bulkSelected.filter(
                          u =>
                            u.role !== 'superadmin' &&
                            !u.archived_at &&
                            !(u as AppUser).is_paused
                        )
                        for (const user of toPause) {
                          await pauseUser(user.id, false, reason)
                        }
                        clearSelection()
                      }}
                      className={`bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium ${btnDisabled}`}
                    >
                      ⏸ Pause ({bulkPauseCount})
                    </button>
                    <button
                      type="button"
                      disabled={deletableCount === 0}
                      title={
                        deletableCount === 0
                          ? 'Select non–superadmin users to delete'
                          : undefined
                      }
                      onClick={() => {
                        if (deletableCount === 0) return
                        const selectedUsers = bulkSelected.filter(u => u.role !== 'superadmin')
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
                      className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium ${btnDisabled}`}
                    >
                      🗑 Delete ({deletableCount})
                    </button>
                  </div>
                </div>
              </div>
              )
            })()}

            <div className="overflow-x-auto overflow-y-visible -mx-4 sm:mx-0">
              <table className="min-w-full border border-gray-300" style={{ position: 'relative' }}>
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 sm:px-4 py-2 text-left w-12">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(prev => {
                              const next = new Set(prev)
                              usersPaginated.forEach(u => next.add(u.id))
                              return next
                            })
                          } else {
                            setSelectedUserIds(prev => {
                              const next = new Set(prev)
                              usersPaginated.forEach(u => next.delete(u.id))
                              return next
                            })
                          }
                        }}
                        title="Select or clear all users on this page"
                        className="w-4 h-4"
                      />
                    </th>
                    <th 
                      className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('email')}
                    >
                      <span className="sm:hidden">Name</span>
                      <span className="hidden sm:inline">Email</span> <SortIcon column="email" />
                    </th>
                    <th 
                      className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden sm:table-cell cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('name')}
                    >
                      Name <SortIcon column="name" />
                    </th>
                    <th
                      className="border px-1 py-2 text-left text-[10px] sm:text-xs whitespace-nowrap w-16 max-w-[4.25rem] sm:w-20 sm:max-w-[5rem] cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('created_at')}
                      title="Profile created in Taskorilla"
                    >
                      Reg. <SortIcon column="created_at" />
                    </th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell">
                      Phone
                    </th>
                    <th 
                      className="border px-1 py-2 text-left text-[10px] sm:text-xs w-16 max-w-[4.25rem] sm:max-w-[5rem] cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('role')}
                    >
                      Role <SortIcon column="role" />
                    </th>
                    <th 
                      className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('is_helper')}
                    >
                      User Badges <SortIcon column="is_helper" />
                    </th>
                    <th 
                      className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell cursor-pointer hover:bg-gray-200 select-none"
                      onClick={() => handleSort('is_featured')}
                    >
                      Featured <SortIcon column="is_featured" />
                    </th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersPaginated.map(u => (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-gray-50 ${u.archived_at ? 'bg-gray-100 opacity-60' : (u as any).is_paused ? 'bg-red-50' : selectedUserIds.has(u.id) ? 'bg-blue-50' : ''}`}
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
                        <span className="sm:hidden cursor-default" title={u.full_name || undefined}>
                          {u.full_name || 'N/A'}
                        </span>
                        <span
                          className="hidden sm:inline cursor-default"
                          title={u.email || undefined}
                        >
                          {u.email
                            ? u.email.length > 15
                              ? `${u.email.slice(0, 15)}...`
                              : u.email
                            : '—'}
                        </span>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden sm:table-cell">
                        <Link
                          href={`/user/${u.id}`}
                          target="_blank"
                          className="text-blue-600 hover:underline font-medium"
                          title="View profile"
                        >
                          {u.full_name || 'N/A'}
                        </Link>
                      </td>
                      <td
                        className="border px-1 py-2 text-[10px] sm:text-xs text-gray-700 whitespace-nowrap w-16 max-w-[4.25rem] sm:w-20 sm:max-w-[5rem] overflow-hidden text-ellipsis"
                        title={u.created_at ? new Date(u.created_at).toLocaleString() : undefined}
                      >
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString(undefined, {
                              year: '2-digit',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden lg:table-cell text-gray-600">
                        {(u as any).phone_number ? `${(u as any).phone_country_code || ''} ${(u as any).phone_number}`.trim() : '—'}
                      </td>
                      <td className="border px-1 py-2 w-16 max-w-[4.25rem] sm:max-w-[5rem] overflow-hidden">
                        <span
                          className={`inline-block max-w-full truncate align-middle px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold leading-tight ${
                            u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                            u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                          title={u.role || undefined}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell align-top max-w-[14rem]">
                        {u.is_helper || u.is_tasker ? (
                          u.badges && u.badges.length > 0 ? (
                            <div className="flex flex-wrap gap-0.5">
                              {u.badges.map((badge, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block text-[11px] leading-tight bg-amber-50 text-amber-900 border border-amber-200/80 px-1.5 py-0.5 rounded"
                                  title={badge}
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No badges</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">Not a helper/tasker</span>
                        )}
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden lg:table-cell">
                        {u.is_helper ? (
                          u.is_featured ? (
                            <button
                              type="button"
                              onClick={() => toggleFeatured(u.id, true)}
                              className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-purple-500 text-white hover:bg-purple-600"
                              title="Click to remove featured"
                            >
                              ⭐ Featured
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleFeatured(u.id, false)}
                              className="text-lg leading-none text-gray-300 hover:text-purple-500 transition-colors px-0.5"
                              title="Add to highlighted helpers (same action as bulk Feature)"
                              aria-label="Add helper to highlighted list"
                            >
                              ☆
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        {u.archived_at ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-600 font-semibold text-[11px]">Archived</span>
                            <span className="text-gray-400 text-[10px]">{new Date(u.archived_at).toLocaleDateString()}</span>
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="text-[10px] text-gray-400 hover:text-red-600 underline text-left"
                            >
                              Hard delete (GDPR)
                            </button>
                          </div>
                        ) : (u as any).is_paused ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-red-600 font-semibold text-[11px]">⏸ Paused</span>
                            {(u as any).paused_reason && (
                              <span className="text-gray-500 text-[10px] max-w-[120px] truncate" title={(u as any).paused_reason}>
                                {(u as any).paused_reason}
                              </span>
                            )}
                            {(u.pause_warning_sent_at || u.conduct_guide_viewed_at) && (
                              <div className="flex flex-col gap-0.5">
                                {u.pause_warning_sent_at && (
                                  <span className="text-red-700 bg-red-100 px-1 py-0.5 rounded text-[10px] font-medium" title={`Warning email sent ${new Date(u.pause_warning_sent_at).toLocaleDateString()}`}>
                                    Warned {new Date(u.pause_warning_sent_at).toLocaleDateString()}
                                  </span>
                                )}
                                {u.conduct_guide_viewed_at && (
                                  <span className="text-amber-700 bg-amber-100 px-1 py-0.5 rounded text-[10px] font-medium" title={`Viewed conduct guide on ${new Date(u.conduct_guide_viewed_at).toLocaleDateString()}`}>
                                    Read Guide {new Date(u.conduct_guide_viewed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => pauseUser(u.id, true)}
                                  className="px-2 py-0.5 bg-green-500 hover:bg-green-600 text-white text-[11px] font-medium rounded"
                                >
                                  Unpause
                                </button>
                                {(u.pause_warning_sent_at || u.conduct_guide_viewed_at) && !u.archived_at && (
                                  <button
                                    onClick={() => archiveUser(u.id)}
                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-medium rounded"
                                  >
                                    Archive
                                  </button>
                                )}
                              </div>
                              {(u.pause_warning_sent_at || u.conduct_guide_viewed_at) && (
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  className="text-[10px] text-gray-400 hover:text-red-600 underline text-left"
                                >
                                  Hard delete (GDPR)
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {u.pause_warning_sent_at && !u.conduct_guide_viewed_at && (
                              <span className="text-red-700 bg-red-100 px-1 py-0.5 rounded text-[10px] font-medium" title={`Warning email sent ${new Date(u.pause_warning_sent_at).toLocaleDateString()}`}>
                                Warned (didn&apos;t read guide)
                              </span>
                            )}
                            {u.conduct_guide_viewed_at && (
                              <span className="text-amber-700 bg-amber-100 px-1 py-0.5 rounded text-[10px] font-medium" title={`Viewed conduct guide on ${new Date(u.conduct_guide_viewed_at).toLocaleDateString()}`}>
                                Read Guide
                              </span>
                            )}
                            {!u.pause_warning_sent_at && !u.conduct_guide_viewed_at && (
                              <span className="text-xs text-gray-500">Active</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedAndFilteredUsers.length > USERS_PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-1 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  disabled={usersListPage <= 1}
                  onClick={() => setUsersListPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous {USERS_PAGE_SIZE}
                </button>
                <span className="text-sm text-gray-600 tabular-nums">
                  Page {usersListPage} of {usersTotalPages}
                </span>
                <button
                  type="button"
                  disabled={usersListPage >= usersTotalPages}
                  onClick={() => setUsersListPage(p => Math.min(usersTotalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next {USERS_PAGE_SIZE} →
                </button>
              </div>
            )}
          </div>
          )
        })()}

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
              <h2 className="text-xl font-semibold mb-1">
                Manage Badges for {managingBadgesFor.full_name || managingBadgesFor.email}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Managing {managingBadgesFor.is_helper ? 'helper' : managingBadgesFor.is_tasker ? 'tasker' : 'user'} badges
              </p>
              <div className="space-y-3 mb-6">
                {(managingBadgesFor.is_helper ? HELPER_BADGES : TASKER_BADGES).map((badge) => {
                  const getBadgeImage = (badgeName: string) => {
                    const lowerBadge = badgeName.toLowerCase();
                    if (lowerBadge.includes('founding') && lowerBadge.includes('tasker')) {
                      return '/images/founding_tasker_badge.png';
                    } else if (lowerBadge.includes('founding') && lowerBadge.includes('helper')) {
                      return '/images/founding_helper_badge.png';
                    } else if (lowerBadge.includes('fast') || lowerBadge.includes('responder')) {
                      return '/images/fast.png';
                    } else if (lowerBadge.includes('top helper') || lowerBadge === 'top helper') {
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
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full sm:w-auto sm:min-w-[300px]"
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
            <div className="flex flex-wrap items-center justify-between mb-2 gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                {hasSelectedTasks
                  ? `${selectedTaskIds.length} task${
                      selectedTaskIds.length === 1 ? '' : 's'
                    } selected`
                  : 'No tasks selected'}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!hasSelectedTasks}
                  onClick={handleBulkToggleSample}
                  className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                    hasSelectedTasks
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Type
                </button>
                <button
                  type="button"
                  disabled={selectedTaskIds.length !== 1}
                  onClick={handleViewTask}
                  className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                    selectedTaskIds.length === 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  View
                </button>
                <button
                  type="button"
                  disabled={!hasSelectedTasks}
                  onClick={handleBulkToggleHidden}
                  className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                    hasSelectedTasks
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Hide
                </button>
                <button
                  type="button"
                  disabled={!hasSelectedTasks}
                  onClick={handleBulkUnlockTasks}
                  className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                    hasSelectedTasks
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Unlock
                </button>
                {hasSelectedTasks && (
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds([])}
                    className="px-2 py-1 rounded-md text-xs sm:text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
            <div className="relative overflow-x-auto overflow-y-auto max-h-[750px] -mx-4 sm:mx-0">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="border px-2 sm:px-4 py-2 text-center text-xs sm:text-sm w-8">
                      <input
                        type="checkbox"
                        className="h-3 w-3 sm:h-4 sm:w-4"
                        checked={
                          tasks.length > 0 &&
                          tasks.every((t) => selectedTaskIds.includes(t.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTaskIds(tasks.map((t) => t.id))
                          } else {
                            setSelectedTaskIds([])
                          }
                        }}
                      />
                    </th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Title</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Status</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell">Type</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell">Assigned To</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell">Allocated Helpers</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell">Created</th>
                    <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden sm:table-cell">Visibility</th>
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
                    <tr
                      key={t.id}
                      className={`hover:bg-gray-50 ${
                        t.hidden_by_admin
                          ? 'bg-red-50'
                          : t.is_sample_task
                          ? 'bg-purple-50'
                          : ''
                      }`}
                    >
                      <td className="border px-2 sm:px-4 py-2 text-center text-xs sm:text-sm">
                        <input
                          type="checkbox"
                          className="h-3 w-3 sm:h-4 sm:w-4"
                          checked={selectedTaskIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTaskIds((prev) =>
                                prev.includes(t.id) ? prev : [...prev, t.id]
                              )
                            } else {
                              setSelectedTaskIds((prev) =>
                                prev.filter((id) => id !== t.id)
                              )
                            }
                          }}
                        />
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        <Link
                          href={`/tasks/${t.id}`}
                          target="_blank"
                          className="truncate max-w-[260px] sm:max-w-[320px] text-blue-600 hover:underline font-medium block"
                          title={t.title}
                        >
                          {t.title.length > 20 ? `${t.title.slice(0, 20)}…` : t.title}
                        </Link>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          t.status === 'completed' ? 'bg-green-100 text-green-800' :
                          t.status === 'pending_payment' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          t.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t.status === 'pending_payment' ? 'Awaiting Payment' : t.status}
                        </span>
                      </td>
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell">
                        {t.is_sample_task ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                            Fake
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Real
                          </span>
                        )}
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
                      <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden lg:table-cell">
                        {(() => {
                          const allocations = taskAllocationsByTask[t.id] || []
                          if (!allocations.length) return <span className="text-gray-400">—</span>
                          const helperLabels = allocations.map((a) => {
                            const helper = users.find((u) => u.id === a.helper_id)
                            return helper?.full_name || helper?.email || a.helper_id
                          })
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px] font-semibold">
                                {allocations.length} allocated
                              </span>
                              <div className="truncate max-w-[180px] text-gray-600" title={helperLabels.join(', ')}>
                                {helperLabels.slice(0, 2).join(', ')}{helperLabels.length > 2 ? ` +${helperLabels.length - 2}` : ''}
                              </div>
                            </div>
                          )
                        })()}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Awaiting Payment Tab - Tasks with bid accepted but payment not completed */}
        {tab === 'awaiting_payment' && (() => {
          const awaitingPaymentTasks = tasks.filter(t =>
            (t.status === 'pending_payment' || (t.status === 'in_progress' && t.payment_status === 'pending')) &&
            t.assigned_to != null
          )
          return (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">
              Tasks Awaiting Payment ({awaitingPaymentTasks.length})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              These tasks have an accepted bid but payment has not been completed. They will auto-release after 48 hours if unpaid.
            </p>
            {awaitingPaymentTasks.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">No tasks awaiting payment.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Title</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Budget</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Tasker</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Helper</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Updated</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingPaymentTasks.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <div className="truncate max-w-[200px] sm:max-w-none" title={t.title}>{t.title}</div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          {t.budget != null ? `€${Number(t.budget).toFixed(2)}` : '-'}
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <div className="truncate max-w-[150px]" title={users.find(u => u.id === t.created_by)?.email || t.created_by}>
                            {users.find(u => u.id === t.created_by)?.email || t.created_by}
                          </div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <div className="truncate max-w-[150px]" title={users.find(u => u.id === t.assigned_to)?.email ?? t.assigned_to ?? ''}>
                            {users.find(u => u.id === t.assigned_to)?.email ?? t.assigned_to ?? '-'}
                          </div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-600">
                          {t.updated_at ? new Date(t.updated_at).toLocaleString() : '-'}
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <Link
                            href={`/tasks/${t.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Task
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )
        })()}

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
                  <p className="text-3xl font-bold text-green-600">{realTasks.length}</p>
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
                <button
                  type="button"
                  onClick={() => setShowBidsDrilldown((s) => !s)}
                  className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-left hover:bg-orange-100 transition-colors"
                >
                  <p className="text-sm text-gray-600 mb-1">Total Bids</p>
                  <p className="text-3xl font-bold text-orange-600">{latestRealBids.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {bidStatusCounts.accepted} accepted ({latestRealBids.length > 0 ? ((bidStatusCounts.accepted / latestRealBids.length) * 100).toFixed(1) : 0}%)
                  </p>
                  <p className="text-xs text-orange-700 mt-2 font-medium">
                    {showBidsDrilldown ? 'Hide bid records' : 'Click to view bid records'}
                  </p>
                </button>
            </div>

            {showBidsDrilldown && (
              <div className="mb-8 border border-orange-200 rounded-lg overflow-hidden">
                <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
                  <h3 className="font-semibold text-orange-900">Bid Records</h3>
                  <p className="text-xs text-orange-700 mt-1">Showing latest bid per helper per task.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b">Date</th>
                        <th className="text-left px-3 py-2 border-b">Task</th>
                        <th className="text-left px-3 py-2 border-b">Bidder</th>
                        <th className="text-left px-3 py-2 border-b">Amount</th>
                        <th className="text-left px-3 py-2 border-b">Status</th>
                        <th className="text-left px-3 py-2 border-b">Bid ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestRealBids.map((bid) => {
                        const task = taskById.get(bid.task_id)
                        const bidder = userById.get(bid.user_id)
                        return (
                          <tr key={bid.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border-b whitespace-nowrap">
                              {new Date(bid.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {task ? (
                                <Link href={`/tasks/${task.id}`} className="text-primary-700 hover:underline">
                                  {task.title || task.id}
                                </Link>
                              ) : (
                                <span className="text-gray-500">{bid.task_id}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {bidder?.full_name || bidder?.email || bid.user_id}
                            </td>
                            <td className="px-3 py-2 border-b whitespace-nowrap">
                              ${Number(bid.amount || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-b capitalize">{bid.status}</td>
                            <td className="px-3 py-2 border-b font-mono text-xs">{bid.id}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                <button
                  type="button"
                  onClick={() => setShowAcceptedBidsDrilldown((s) => !s)}
                  className="bg-cyan-50 p-4 rounded-lg border border-cyan-200 text-left hover:bg-cyan-100 transition-colors"
                >
                  <p className="text-sm text-gray-600 mb-1">Avg Accepted Bid</p>
                  <p className="text-2xl font-bold text-cyan-600">${avgAcceptedBidAmount.toFixed(2)}</p>
                  <p className="text-xs text-cyan-700 mt-2 font-medium">
                    {showAcceptedBidsDrilldown ? 'Hide calculation' : 'Click to view how this is calculated'}
                  </p>
                </button>
            </div>

            {showAcceptedBidsDrilldown && (
              <div className="mb-8 border border-cyan-200 rounded-lg overflow-hidden">
                <div className="bg-cyan-50 px-4 py-3 border-b border-cyan-200">
                  <h3 className="font-semibold text-cyan-900">Accepted Bids Used For Average</h3>
                  <p className="text-xs text-cyan-700 mt-1">
                    Formula: {acceptedBids.length} accepted bids, total ${totalAcceptedBidAmount.toFixed(2)} / {acceptedBids.length || 1} = ${avgAcceptedBidAmount.toFixed(2)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b">Date</th>
                        <th className="text-left px-3 py-2 border-b">Task</th>
                        <th className="text-left px-3 py-2 border-b">Bidder</th>
                        <th className="text-left px-3 py-2 border-b">Amount</th>
                        <th className="text-left px-3 py-2 border-b">Bid ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acceptedBids.map((bid) => {
                        const task = taskById.get(bid.task_id)
                        const bidder = userById.get(bid.user_id)
                        return (
                          <tr key={bid.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border-b whitespace-nowrap">
                              {new Date(bid.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {task ? (
                                <Link href={`/tasks/${task.id}`} className="text-primary-700 hover:underline">
                                  {task.title || task.id}
                                </Link>
                              ) : (
                                <span className="text-gray-500">{bid.task_id}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {bidder?.full_name || bidder?.email || bid.user_id}
                            </td>
                            <td className="px-3 py-2 border-b whitespace-nowrap">
                              ${Number(bid.amount || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-b font-mono text-xs">{bid.id}</td>
                          </tr>
                        )
                      })}
                      {acceptedBids.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                            No accepted bids yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                        labels: ['Open', 'Awaiting Payment', 'In Progress', 'Completed', 'Cancelled'],
                        datasets: [{
                          label: 'Tasks',
                          data: [
                            taskStatusCounts.open,
                            taskStatusCounts.pending_payment,
                            taskStatusCounts.in_progress,
                            taskStatusCounts.completed,
                            taskStatusCounts.cancelled
                          ],
                          backgroundColor: ['#facc15', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
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
                        labels: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'],
                        datasets: [{
                          label: 'Bids',
                          data: [bidStatusCounts.pending, bidStatusCounts.accepted, bidStatusCounts.rejected, bidStatusCounts.withdrawn],
                          backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#6b7280'],
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

            {/* Task Funnel + Time-to-First-Bid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Task Funnel Conversion (Last 30 Days)</h3>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: ['Created', 'With Bid', 'Accepted/Pending', 'Paid', 'Completed'],
                      datasets: [{
                        label: 'Tasks',
                        data: [
                          taskFunnelData.created,
                          taskFunnelData.withBid,
                          taskFunnelData.acceptedOrPendingPayment,
                          taskFunnelData.paid,
                          taskFunnelData.completed,
                        ],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6'],
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
                <h3 className="text-lg font-semibold mb-4">Median Time to First Bid (Last 30 Days)</h3>
                <div style={{ height: '300px' }}>
                  <Line
                    data={{
                      labels: medianFirstBidHoursData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                      datasets: [{
                        label: 'Median Hours',
                        data: medianFirstBidHoursData.map(d => d.medianHours),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        tension: 0.35,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              const value = context.parsed.y
                              if (value == null) return 'No bids yet'
                              return `${Number(value).toFixed(1)} h`
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'Hours' },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            <AdminHelpFeedbackPanel />

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-sm text-gray-600 mb-1">Total Messages</p>
                  <p className="text-2xl font-bold text-indigo-600">{messages.length}</p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                  <p className="text-2xl font-bold text-pink-600">{realReviews.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Avg: {avgRating.toFixed(2)}/5</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvgBidAmountDrilldown((s) => !s)}
                  className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-left hover:bg-amber-100 transition-colors"
                >
                  <p className="text-sm text-gray-600 mb-1">Avg Bid Amount</p>
                  <p className="text-2xl font-bold text-amber-600">${avgBidAmount.toFixed(2)}</p>
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    {showAvgBidAmountDrilldown ? 'Hide calculation' : 'Click to view how this is calculated'}
                  </p>
                </button>
            </div>

            {showAvgBidAmountDrilldown && (
              <div className="mb-8 border border-amber-200 rounded-lg overflow-hidden">
                <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
                  <h3 className="font-semibold text-amber-900">All Bids Used For Average Bid Amount</h3>
                  <p className="text-xs text-amber-700 mt-1">
                    Formula: {avgBidBaseBids.length} bids (excluding withdrawn), total ${avgBidBaseBids.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toFixed(2)} / {avgBidBaseBids.length || 1} = ${avgBidAmount.toFixed(2)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b">Date</th>
                        <th className="text-left px-3 py-2 border-b">Task</th>
                        <th className="text-left px-3 py-2 border-b">Bidder</th>
                        <th className="text-left px-3 py-2 border-b">Amount</th>
                        <th className="text-left px-3 py-2 border-b">Status</th>
                        <th className="text-left px-3 py-2 border-b">Bid ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {avgBidBaseBids.map((bid) => {
                        const task = taskById.get(bid.task_id)
                        const bidder = userById.get(bid.user_id)
                        return (
                          <tr key={bid.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border-b whitespace-nowrap">
                              {new Date(bid.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {task ? (
                                <Link href={`/tasks/${task.id}`} className="text-primary-700 hover:underline">
                                  {task.title || task.id}
                                </Link>
                              ) : (
                                <span className="text-gray-500">{bid.task_id}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 border-b">
                              {bidder?.full_name || bidder?.email || bid.user_id}
                            </td>
                            <td className="px-3 py-2 border-b whitespace-nowrap">
                              ${Number(bid.amount || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-b capitalize">{bid.status}</td>
                            <td className="px-3 py-2 border-b font-mono text-xs">{bid.id}</td>
                          </tr>
                        )
                      })}
                      {avgBidBaseBids.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                            No non-withdrawn bids yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue Tab */}
        {tab === 'revenue' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-2xl font-bold">Revenue Dashboard</h2>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' },
                  { id: 'all', label: 'All Time' },
                ] as Array<{ id: RevenueRange; label: string }>).map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setRevenueRange(option.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      revenueRange === option.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">Total Revenue ({revenueLabelByRange[revenueRange]})</p>
                <p className="text-3xl font-bold text-green-800">€{revenueSummary.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 font-medium">Service Fees (€2/task)</p>
                <p className="text-3xl font-bold text-blue-800">€{revenueSummary.totalServiceFees.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-700 font-medium">Platform Fees (10%)</p>
                <p className="text-3xl font-bold text-purple-800">€{revenueSummary.totalPlatformFees.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium">Paid Tasks</p>
                <p className="text-3xl font-bold text-gray-800">{revenueSummary.totalTasks}</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Revenue Over {revenueLabelByRange[revenueRange]}</h3>
              <div className="h-80">
                <Bar
                  data={{
                    labels: revenueChartData.map(d => d.label),
                    datasets: [
                      {
                        label: 'Revenue (€)',
                        data: revenueChartData.map(d => d.revenue),
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
              <h3 className="text-lg font-semibold mb-4">Paid Tasks Over {revenueLabelByRange[revenueRange]}</h3>
              <div className="h-64">
                <Line
                  data={{
                    labels: revenueChartData.map(d => d.label),
                    datasets: [
                      {
                        label: 'Tasks',
                        data: revenueChartData.map(d => d.tasks),
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
              <h3 className="text-lg font-semibold mb-4">Paid Tasks ({revenueLabelByRange[revenueRange]})</h3>
              {rangeFilteredTasks.length === 0 ? (
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
                      {rangeFilteredTasks.map((task) => (
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
                          €{rangeFilteredTasks.reduce((sum, t) => sum + t.budget, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                          €{revenueSummary.totalServiceFees.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-purple-700">
                          €{revenueSummary.totalPlatformFees.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-800">
                          €{revenueSummary.totalRevenue.toFixed(2)}
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
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 w-full space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Welcome Email Observability</h3>
                  <p className="text-xs text-gray-500">
                    View queue attempts and confirmed users still missing a welcome queue row.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchWelcomeEmailObservability}
                  disabled={welcomeAuditLoading}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-xs sm:text-sm rounded-md font-medium text-gray-800"
                >
                  {welcomeAuditLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={welcomeAttemptFilter}
                  onChange={(e) => setWelcomeAttemptFilter(e.target.value)}
                  placeholder="Filter attempts by email or user id..."
                  className="w-full sm:w-96 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 self-center">
                  Attempts: {welcomeAttempts.length} | Missing queue users: {missingWelcomeQueueRows.length}
                </div>
              </div>

              {welcomeAuditError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {welcomeAuditError}
                </p>
              )}

              <div>
                <h4 className="text-xs font-semibold text-gray-800 mb-2">Latest Queue Attempts</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left">When</th>
                        <th className="px-2 py-2 text-left">Recipient</th>
                        <th className="px-2 py-2 text-left">User</th>
                        <th className="px-2 py-2 text-left">Template</th>
                        <th className="px-2 py-2 text-left">Source</th>
                        <th className="px-2 py-2 text-left">Result</th>
                        <th className="px-2 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {welcomeAttempts
                        .filter((row) => {
                          const needle = welcomeAttemptFilter.trim().toLowerCase()
                          if (!needle) return true
                          return (
                            (row.recipient_email || '').toLowerCase().includes(needle) ||
                            (row.related_user_id || '').toLowerCase().includes(needle)
                          )
                        })
                        .map((row) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="px-2 py-2 whitespace-nowrap text-gray-700">{new Date(row.created_at).toLocaleString()}</td>
                            <td className="px-2 py-2 text-gray-900">{row.recipient_email || '—'}</td>
                            <td className="px-2 py-2 text-gray-700 font-mono">{row.related_user_id || '—'}</td>
                            <td className="px-2 py-2 text-gray-700">{row.template_type || '—'}</td>
                            <td className="px-2 py-2 text-gray-700">{row.source || 'unknown'}</td>
                            <td className="px-2 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${row.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {row.ok ? 'ok' : 'failed'}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-gray-700">{row.skipped_reason || row.error_reason || '—'}</td>
                          </tr>
                        ))}
                      {welcomeAttempts.length === 0 && !welcomeAuditLoading && (
                        <tr>
                          <td colSpan={7} className="px-2 py-3 text-center text-gray-500">
                            No welcome email attempt rows found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-800 mb-2">Confirmed Users Missing Welcome Queue</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left">Email</th>
                        <th className="px-2 py-2 text-left">User Id</th>
                        <th className="px-2 py-2 text-left">Confirmed At</th>
                        <th className="px-2 py-2 text-left">User Created</th>
                        <th className="px-2 py-2 text-left">Latest Attempt</th>
                        <th className="px-2 py-2 text-left">Queue Rows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingWelcomeQueueRows.map((row) => (
                        <tr key={row.user_id} className="border-t border-gray-100">
                          <td className="px-2 py-2 text-gray-900">{row.email || '—'}</td>
                          <td className="px-2 py-2 text-gray-700 font-mono">{row.user_id}</td>
                          <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{new Date(row.email_confirmed_at).toLocaleString()}</td>
                          <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{new Date(row.user_created_at).toLocaleString()}</td>
                          <td className="px-2 py-2 text-gray-700 whitespace-nowrap">
                            {row.latest_successful_attempt_at ? new Date(row.latest_successful_attempt_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-2 py-2 text-gray-700">{row.welcome_rows_count}</td>
                        </tr>
                      ))}
                      {missingWelcomeQueueRows.length === 0 && !welcomeAuditLoading && (
                        <tr>
                          <td colSpan={6} className="px-2 py-3 text-center text-gray-500">
                            No confirmed users currently missing a welcome queue row.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SMS Test */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 w-full space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">SMS Gateway Test</h3>
                <p className="text-xs text-gray-500">
                  Send a test SMS via SMSGate to verify your credentials and device are configured correctly.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="tel"
                  value={smsTestPhone}
                  onChange={(e) => { setSmsTestPhone(e.target.value); setSmsTestResult(null) }}
                  placeholder="+351912345678 (E.164 format)"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  disabled={smsTestLoading || !smsTestPhone.trim()}
                  onClick={async () => {
                    setSmsTestLoading(true)
                    setSmsTestResult(null)
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await fetch('/api/admin/test-sms', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({ phone: smsTestPhone.trim() }),
                      })
                      const json = await res.json()
                      if (res.ok) {
                        setSmsTestResult({ ok: true, msg: `Sent! Message ID: ${json.messageId ?? 'n/a'}` })
                      } else {
                        setSmsTestResult({ ok: false, msg: json.error ?? 'Unknown error' })
                      }
                    } catch (err) {
                      setSmsTestResult({ ok: false, msg: err instanceof Error ? err.message : String(err) })
                    } finally {
                      setSmsTestLoading(false)
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md whitespace-nowrap"
                >
                  {smsTestLoading ? 'Sending…' : 'Send Test SMS'}
                </button>
              </div>
              {smsTestResult && (
                <p className={`text-sm font-medium ${smsTestResult.ok ? 'text-green-700' : 'text-red-600'}`}>
                  {smsTestResult.ok ? '✅' : '❌'} {smsTestResult.msg}
                </p>
              )}
            </div>

            {/* Email Logs — shown first */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 w-full flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Email Logs</h3>
                <p className="text-xs text-gray-500">View recently sent emails and filter by recipient, subject, or type.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEmailLogsSection(prev => !prev)
                  if (!showEmailLogsSection && emailLogs.length === 0) {
                    fetchEmailLogs()
                  }
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm rounded-md font-medium text-gray-800"
              >
                {showEmailLogsSection ? 'Hide Email Logs' : 'Show Email Logs'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-6 w-full">
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold mb-2">Email Templates</h2>
                <p className="text-sm text-gray-600">Manage welcome email templates for Helpers and Taskers</p>
              </div>
              
              <EmailTemplateManager 
                onTemplateSent={fetchEmailLogs} 
                onTemplateChange={fetchEmailTemplates}
                users={users}
                emailTemplates={emailTemplates}
                onSendWelcomeEmail={sendWelcomeEmail}
                onSendFreeFormEmail={sendFreeFormEmail}
                sendingEmail={sendingEmail}
              />
            </div>

            {/* REMOVED — Preview + Match sections moved to Matching tab */}
            {false && <><div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Helper Task Match Preview (no emails sent)
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Choose a task below to see which helpers would be matched for "New task near you" emails.
                  This endpoint never sends real emails; it only shows the current matching result.
                </p>
                <label className="mb-2 inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockMatchTaskSelection}
                    onChange={(e) => setLockMatchTaskSelection(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  Keep Preview and Send task selection synced
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <select
                    value={previewTaskId}
                    onChange={(e) => {
                      const nextTaskId = e.target.value
                      setPreviewTaskId(nextTaskId)
                      if (lockMatchTaskSelection) {
                        setSendTaskId(nextTaskId)
                      }
                    }}
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a task…</option>
                    {tasks
                      .slice()
                      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
                      .map(task => (
                        <option key={task.id} value={task.id}>
                          [{task.id.substring(0, 8)}] {task.title} — {task.status}
                          {task.is_sample_task ? ' (sample)' : ''}
                        </option>
                      ))}
                  </select>
                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => previewTaskId && previewHelperTaskMatch(previewTaskId)}
                      disabled={!previewTaskId || previewLoading}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {previewLoading ? 'Loading preview...' : 'Preview helper matches'}
                    </button>
                    <button
                      type="button"
                      onClick={() => previewTaskId && sendHelperTaskMatchSample(previewTaskId)}
                      disabled={!previewTaskId}
                      className="inline-flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white text-xs sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send sample email to admin
                    </button>
                  </div>
                </div>
                {previewError && (
                  <p className="mt-2 text-xs text-red-600">{previewError}</p>
                )}
                {previewResult.task && (
                  <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 space-y-2">
                    <div>
                      <span className="font-semibold">Task:</span>{' '}
                      <Link
                        href={previewResult.task?.id ? `/tasks/${previewResult.task.id}` : '#'}
                        className="text-blue-700 hover:underline"
                      >
                        [{previewResult.task.id?.substring(0, 8) || '—'}]{' '}
                        {previewResult.task.title}
                      </Link>
                    </div>
                    <div className="text-gray-600">
                      <span className="font-semibold text-gray-700">Task details:</span>{' '}
                      ID: {previewResult.task.id || '—'} | Location: {previewResult.task.location || tasks.find(t => t.id === previewTaskId)?.location || '—'}
                    </div>
                    {typeof previewResult.task.amount === 'number' && (
                      <div>
                        <span className="font-semibold">Amount:</span>{' '}
                        €{previewResult.task.amount.toFixed(2)}
                      </div>
                    )}
                    {previewResult.reason && (
                      <div className="text-yellow-800">
                        <span className="font-semibold">Note:</span> {previewResult.reason}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Matched helpers:</span>{' '}
                      {previewResult.matches.length}
                      {Number(previewResult.allocatedCount || 0) > 0 && (
                        <span className="ml-2 text-[11px] text-amber-700">
                          ({Number(previewResult.allocatedCount || 0)} already allocated)
                        </span>
                      )}
                    </div>
                    {previewResult.matches.length > 0 && (
                      <div className="max-h-64 overflow-auto rounded border border-gray-200 bg-white">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Helper</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Email</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Distance (km)</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Max Dist (km)</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Email Pref</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewResult.matches.map((m) => (
                              <tr key={m.id} className="border-t border-gray-100">
                                <td className="px-2 py-1 text-gray-900">{m.name}</td>
                                <td className="px-2 py-1 text-gray-700">{m.email}</td>
                                <td className="px-2 py-1 text-gray-700">
                                  {typeof m.distanceKm === 'number' ? m.distanceKm.toFixed(2) : '—'}
                                </td>
                                <td className="px-2 py-1 text-gray-700">
                                  {typeof m.preferredMaxDistanceKm === 'number' ? m.preferredMaxDistanceKm.toFixed(1) : '—'}
                                </td>
                                <td className="px-2 py-1 text-gray-700">{m.emailPreference || 'instant'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Helper task match sending (uses feature flag) */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Helper Task Match Emails (send for selected task)
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Select a task to see matched helpers, check the ones you want to email, then send.
                  Only checked helpers will receive the "New task near you" email.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-3">
                  <select
                    value={sendTaskId}
                    onChange={(e) => {
                      setSendTaskId(e.target.value)
                      fetchSendTaskMatches(e.target.value)
                    }}
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a task…</option>
                    {tasks
                      .slice()
                      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
                      .map(task => (
                        <option key={task.id} value={task.id}>
                          [{task.id.substring(0, 8)}] {task.title} — {task.status}
                          {task.is_sample_task ? ' (sample)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {sendTaskMatchesLoading && (
                  <p className="text-xs text-gray-500 mb-3">Loading matched helpers…</p>
                )}

                {!sendTaskMatchesLoading && sendTaskId && sendTaskMatches.length === 0 && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-3">
                    No eligible helpers matched for this task.
                  </p>
                )}

                {sendTaskMatches.length > 0 && (
                  <div className="mb-4">
                    {/* Channel selection */}
                    <div className="flex items-center gap-4 mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                      <span className="text-xs font-semibold text-gray-700">Send via:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={sendViaEmail}
                          onChange={(e) => setSendViaEmail(e.target.checked)}
                          className="w-3.5 h-3.5"
                        />
                        ✉️ Email
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={sendViaSms}
                          onChange={(e) => setSendViaSms(e.target.checked)}
                          className="w-3.5 h-3.5"
                        />
                        📱 SMS
                      </label>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {selectedSendHelperIds.size} of {sendTaskMatches.length} helper(s) selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSendHelperIds(new Set(sendTaskMatches.map(m => m.id)))}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSendHelperIds(new Set())}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Deselect all
                      </button>
                    </div>
                    <div className="max-h-56 overflow-auto rounded border border-gray-200 bg-white">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 w-8"></th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-700">Helper</th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-700">Email</th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-700">Phone</th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-700">km</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sendTaskMatches.map((m) => {
                            const hasPhone = !!(m.phoneNumber || '').trim()
                            const optedOut = m.smsOptOut === true
                            return (
                              <tr
                                key={m.id}
                                className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedSendHelperIds.has(m.id) ? 'bg-green-50' : ''}`}
                                onClick={() => {
                                  setSelectedSendHelperIds(prev => {
                                    const next = new Set(prev)
                                    next.has(m.id) ? next.delete(m.id) : next.add(m.id)
                                    return next
                                  })
                                }}
                              >
                                <td className="px-2 py-1 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedSendHelperIds.has(m.id)}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 cursor-pointer"
                                  />
                                </td>
                                <td className="px-2 py-1 text-gray-900">{m.name}</td>
                                <td className="px-2 py-1 text-gray-700">{m.email}</td>
                                <td className="px-2 py-1 text-gray-500">
                                  {optedOut
                                    ? <span title={`Opted out of SMS${m.phoneNumber ? ` · ${m.phoneCountryCode ?? ''}${m.phoneNumber}` : ''}`}>🚫</span>
                                    : hasPhone
                                      ? <span title={`${m.phoneCountryCode ?? ''}${m.phoneNumber}`}>📱</span>
                                      : <span className="text-gray-400" title="No phone on file">—</span>}
                                </td>
                                <td className="px-2 py-1 text-gray-700">
                                  {typeof m.distanceKm === 'number' ? m.distanceKm.toFixed(1) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => sendTaskId && selectedSendHelperIds.size > 0 && (sendViaEmail || sendViaSms) && sendHelperTaskMatchEmails(
                    sendTaskId,
                    Array.from(selectedSendHelperIds),
                    Array.from(overrideExcludedHelperIds).filter((id) => selectedSendHelperIds.has(id))
                  )}
                  disabled={!sendTaskId || selectedSendHelperIds.size === 0 || sendingMatches || (!sendViaEmail && !sendViaSms)}
                  className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMatches
                    ? 'Sending…'
                    : `Send to ${selectedSendHelperIds.size} helper${selectedSendHelperIds.size !== 1 ? 's' : ''}`}
                </button>

                {sendMatchesMessage && (
                  <p className="mt-2 text-xs text-gray-700">{sendMatchesMessage}</p>
                )}
              </div>

            </> }

            {showEmailLogsSection && (() => {
              // Filter email logs based on filters
              const filteredEmailLogs = emailLogs.filter((log) => {
                const recipientMatch = !emailLogFilters.recipient || 
                  log.recipient_email?.toLowerCase().includes(emailLogFilters.recipient.toLowerCase()) ||
                  log.recipient_name?.toLowerCase().includes(emailLogFilters.recipient.toLowerCase())
                const subjectMatch = !emailLogFilters.subject || 
                  renderEmailLogSubject(log).toLowerCase().includes(emailLogFilters.subject.toLowerCase())
                const typeMatch = !emailLogFilters.emailType || 
                  log.email_type === emailLogFilters.emailType
                return recipientMatch && subjectMatch && typeMatch
              })
              const totalPages = Math.max(1, Math.ceil(filteredEmailLogs.length / EMAIL_LOGS_PAGE_SIZE))
              const currentPage = Math.min(emailLogsPage, totalPages)
              const startIdx = (currentPage - 1) * EMAIL_LOGS_PAGE_SIZE
              const endIdx = startIdx + EMAIL_LOGS_PAGE_SIZE
              const paginatedEmailLogs = filteredEmailLogs.slice(startIdx, endIdx)

              return (
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Email Logs ({filteredEmailLogs.length}{filteredEmailLogs.length !== emailLogs.length ? ` of ${emailLogs.length}` : ''})
                  </h2>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-gray-600">
                      Showing {filteredEmailLogs.length === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, filteredEmailLogs.length)} of {filteredEmailLogs.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEmailLogsPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous 25
                      </button>
                      <span className="text-gray-600">Page {currentPage} / {totalPages}</span>
                      <button
                        type="button"
                        onClick={() => setEmailLogsPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next 25
                      </button>
                    </div>
                  </div>
                  
                  {/* Filter Section */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Recipient Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Recipient
                        </label>
                        <input
                          type="text"
                          placeholder="Filter by recipient email or name..."
                          value={emailLogFilters.recipient}
                          onChange={(e) => setEmailLogFilters({ ...emailLogFilters, recipient: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Subject Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          placeholder="Filter by subject..."
                          value={emailLogFilters.subject}
                          onChange={(e) => setEmailLogFilters({ ...emailLogFilters, subject: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Type Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={emailLogFilters.emailType}
                          onChange={(e) => setEmailLogFilters({ ...emailLogFilters, emailType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Types</option>
                          <option value="new_bid">New Bid</option>
                          <option value="bid_updated">Bid Updated</option>
                          <option value="bid_accepted">Bid Accepted</option>
                          <option value="bid_rejected">Bid Rejected</option>
                          <option value="new_message">New Message</option>
                          <option value="message_blocked_pre_bid">Message Blocked (Pre-bid)</option>
                          <option value="task_completed">Task Completed</option>
                          <option value="task_cancelled">Task Cancelled</option>
                          <option value="admin_email">Admin Email</option>
                          <option value="profile_completion">Profile Completion</option>
                          <option value="password_reset">Password Reset</option>
                          <option value="welcome_email">Welcome Email</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bulk actions - above table so visible without scrolling */}
                  {filteredEmailLogs.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={fetchEmailLogs}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm rounded-md font-medium text-gray-800"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => setSelectedEmailLogIds(selectedEmailLogIds.length === filteredEmailLogs.length ? [] : filteredEmailLogs.map((log) => log.id))}
                        className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm rounded-md font-medium"
                      >
                        {selectedEmailLogIds.length === filteredEmailLogs.length ? 'Clear selection' : 'Select all'}
                      </button>
                      {selectedEmailLogIds.length > 0 ? (
                        <button
                          onClick={() => setDeletingEmailLogId('bulk')}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md font-medium flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete selected ({selectedEmailLogIds.length})
                        </button>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-500">Select rows or &quot;Select all&quot; to delete in bulk</span>
                      )}
                    </div>
                  )}

                  {/* Top horizontal scrollbar */}
                  <div ref={emailLogsTopScrollRef} className="overflow-x-auto overflow-y-hidden mb-2">
                    <div style={{ width: `${emailLogsScrollWidth}px`, height: '1px' }} />
                  </div>

                  {/* Logs Table */}
                  <div ref={emailLogsTableScrollRef} className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                            <input
                              type="checkbox"
                              checked={paginatedEmailLogs.length > 0 && paginatedEmailLogs.every((log) => selectedEmailLogIds.includes(log.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmailLogIds(Array.from(new Set([...selectedEmailLogIds, ...paginatedEmailLogs.map((log) => log.id)])))
                                } else {
                                  setSelectedEmailLogIds(selectedEmailLogIds.filter((id) => !paginatedEmailLogs.some((log) => log.id === id)))
                                }
                              }}
                              className="cursor-pointer"
                              title="Select all"
                            />
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sent At
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sender
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recipient
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[240px]">
                            Subject
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedEmailLogs.map((log) => {
                          const isPreBidImage = log.email_type === 'new_message' && log.metadata?.hasImage === true && log.metadata?.bidAccepted !== true
                          const blockedReason = log.email_type === 'message_blocked_pre_bid'
                            ? (log.metadata?.blockedReason || null)
                            : null
                          const senderName = getEmailLogSenderName(log)
                          const senderProfileId = getEmailLogSenderProfileId(log)
                          const recipientProfileId = getEmailLogRecipientProfileId(log)
                          return (
                          <tr key={log.id} className={`${isPreBidImage ? 'bg-red-50 border-l-4 border-red-400' : selectedEmailLogIds.includes(log.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                              <input
                                type="checkbox"
                                checked={selectedEmailLogIds.includes(log.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEmailLogIds([...selectedEmailLogIds, log.id])
                                  } else {
                                    setSelectedEmailLogIds(selectedEmailLogIds.filter((id) => id !== log.id))
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                              {log.created_at ? (
                                <div className="flex flex-col">
                                  <span>{new Date(log.created_at).toLocaleDateString()}</span>
                                  <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 max-w-[22ch]">
                              {senderProfileId && senderName !== 'System' ? (
                                <Link
                                  href={`/user/${senderProfileId}`}
                                  className="text-primary-600 hover:underline block truncate"
                                  title={senderName}
                                >
                                  {senderName}
                                </Link>
                              ) : (
                                <span className="block truncate" title={senderName}>{senderName}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 max-w-[22ch]">
                              {recipientProfileId ? (
                                <Link
                                  href={`/user/${recipientProfileId}`}
                                  className="text-primary-600 hover:underline block truncate"
                                  title={log.recipient_name || 'Unknown Recipient'}
                                >
                                  {log.recipient_name || 'Unknown Recipient'}
                                </Link>
                              ) : (
                                <span className="block truncate" title={log.recipient_name || 'Unknown Recipient'}>
                                  {log.recipient_name || 'Unknown Recipient'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 min-w-[240px]">
                              <div className="break-words">{renderEmailLogSubject(log)}</div>
                              {blockedReason && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded">
                                    BLOCK REASON: {blockedReason}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 max-w-[22ch]">
                              <span className="inline-block max-w-[22ch] truncate align-bottom" title={log.email_type || '-'}>
                                {log.email_type || '-'}
                              </span>
                              {isPreBidImage && (
                                <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                                  📷 IMAGE PRE-BID
                                </span>
                              )}
                              {blockedReason && (
                                <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                  🚫 PRE-BID BLOCKED
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-xs text-gray-700">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingEmailLog(log)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  View
                                </button>
                                {isPreBidImage && log.metadata?.conversationId && (
                                  <button
                                    type="button"
                                    onClick={() => openPrebidReplacementPicker(log)}
                                    className="text-amber-700 hover:text-amber-900"
                                    title="Replace pre-bid image"
                                  >
                                    Replace image
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDeletingEmailLogId(log.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete email log"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Matching Tab */}
        {tab === 'matching' && (
          <div className="space-y-6">

            {/* Send Task Alert */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 w-full space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Send Task Alert</h3>
                <p className="text-xs text-gray-500">
                  Send a task notification to any specific user via email, SMS, or both.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Task</label>
                  <select
                    value={alertTaskId}
                    onChange={(e) => { setAlertTaskId(e.target.value); setAlertMessage(null) }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">— Select a task —</option>
                    {tasks
                      .filter(t => !t.is_sample_task && !t.hidden_by_admin)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.status})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700">User</label>
                    <button
                      type="button"
                      onClick={() => setAlertUserSortMode(prev => prev === 'latest' ? 'alpha' : 'latest')}
                      className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                      title="Toggle user sort mode"
                    >
                      Sort: {alertUserSortMode === 'latest' ? 'Latest' : 'A-Z'}
                    </button>
                  </div>
                  <select
                    value={alertUserId}
                    onChange={(e) => { setAlertUserId(e.target.value); setAlertMessage(null) }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">— Select a user —</option>
                    {users
                      .slice()
                      .sort((a, b) => {
                        if (alertUserSortMode === 'latest') {
                          return (b.created_at || '').localeCompare(a.created_at || '')
                        }
                        const aName = (a.full_name || a.email || '').toLowerCase()
                        const bName = (b.full_name || b.email || '').toLowerCase()
                        return aName.localeCompare(bName)
                      })
                      .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || '(no name)'} — {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border border-gray-200">
                <span className="text-xs font-semibold text-gray-700">Send via:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                  <input type="checkbox" checked={alertViaEmail} onChange={(e) => setAlertViaEmail(e.target.checked)} className="w-3.5 h-3.5" />
                  ✉️ Email
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                  <input type="checkbox" checked={alertViaSms} onChange={(e) => setAlertViaSms(e.target.checked)} className="w-3.5 h-3.5" />
                  📱 SMS
                </label>
              </div>

              <button
                type="button"
                disabled={!alertTaskId || !alertUserId || (!alertViaEmail && !alertViaSms) || alertSending}
                onClick={async () => {
                  setAlertSending(true)
                  setAlertMessage(null)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const res = await fetch('/api/admin/send-user-alert', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                      body: JSON.stringify({
                        taskId: alertTaskId,
                        userId: alertUserId,
                        channels: [...(alertViaEmail ? ['email'] : []), ...(alertViaSms ? ['sms'] : [])],
                      }),
                    })
                    const json = await res.json()
                    if (!res.ok) {
                      setAlertMessage({ ok: false, msg: json.error ?? 'Unknown error' })
                    } else if (json.alreadyAllocated) {
                      setAlertMessage({ ok: true, msg: 'Helper already allocated to this task. No duplicate alert sent.' })
                    } else {
                      const parts: string[] = []
                      if (json.emailSent) parts.push('email sent')
                      if (json.smsSent) parts.push('SMS sent')
                      const warnings = json.errors?.length ? ` (${json.errors.join('; ')})` : ''
                      setAlertMessage({ ok: parts.length > 0, msg: parts.length > 0 ? `${parts.join(' & ')}${warnings}` : `Nothing sent${warnings}` })
                    }
                  } catch (err) {
                    setAlertMessage({ ok: false, msg: err instanceof Error ? err.message : String(err) })
                  } finally {
                    setAlertSending(false)
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md"
              >
                {alertSending ? 'Sending…' : 'Send Alert'}
              </button>

              {alertMessage && (
                <p className={`text-sm font-medium ${alertMessage.ok ? 'text-green-700' : 'text-red-600'}`}>
                  {alertMessage.ok ? '✅' : '❌'} {alertMessage.msg}
                </p>
              )}
            </div>

            {/* Helper Task Match */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 w-full">

              {/* Preview section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Helper Task Match Preview (no emails sent)
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Choose a task below to see which helpers would be matched for "New task near you" emails.
                  This endpoint never sends real emails; it only shows the current matching result.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <select
                    value={previewTaskId}
                    onChange={(e) => setPreviewTaskId(e.target.value)}
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a task…</option>
                    {tasks
                      .slice()
                      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
                      .map(task => (
                        <option key={task.id} value={task.id}>
                          [{task.id.substring(0, 8)}] {task.title} — {task.status}
                          {task.is_sample_task ? ' (sample)' : ''}
                        </option>
                      ))}
                  </select>
                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => previewTaskId && previewHelperTaskMatch(previewTaskId)}
                      disabled={!previewTaskId || previewLoading}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {previewLoading ? 'Loading preview...' : 'Preview helper matches'}
                    </button>
                    <button
                      type="button"
                      onClick={() => previewTaskId && sendHelperTaskMatchSample(previewTaskId)}
                      disabled={!previewTaskId}
                      className="inline-flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white text-xs sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send sample email to admin
                    </button>
                  </div>
                </div>
                {previewError && (
                  <p className="mt-2 text-xs text-red-600">{previewError}</p>
                )}
                {previewResult.task && (
                  <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 space-y-2">
                    <div>
                      <span className="font-semibold">Task:</span>{' '}
                      <span className="text-gray-900">
                        [{previewResult.task.id?.substring(0, 8) || '—'}]{' '}
                        {previewResult.task.title}
                      </span>
                    </div>
                    {typeof previewResult.task.amount === 'number' && (
                      <div>
                        <span className="font-semibold">Amount:</span>{' '}
                        €{previewResult.task.amount.toFixed(2)}
                      </div>
                    )}
                    {previewResult.reason && (
                      <div className="text-yellow-800">
                        <span className="font-semibold">Note:</span> {previewResult.reason}
                      </div>
                    )}
                    {previewResult.aiClassification && (previewResult.aiClassification.skills.length > 0 || previewResult.aiClassification.professions.length > 0) && (
                      <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                        <span className="font-semibold text-blue-800">AI detected:</span>{' '}
                        {previewResult.aiClassification.skills.length > 0 && (
                          <span className="text-blue-700">
                            Skills: {previewResult.aiClassification.skills.join(', ')}
                          </span>
                        )}
                        {previewResult.aiClassification.skills.length > 0 && previewResult.aiClassification.professions.length > 0 && (
                          <span className="text-blue-400 mx-1">|</span>
                        )}
                        {previewResult.aiClassification.professions.length > 0 && (
                          <span className="text-blue-700">
                            Professions: {previewResult.aiClassification.professions.join(', ')}
                          </span>
                        )}
                        {previewResult.matchMode && (
                          <span className="ml-2 text-[10px] text-blue-500">({previewResult.matchMode} matching)</span>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Matched helpers:</span>{' '}
                      {previewResult.matches.length}
                    </div>
                    {Number(previewResult.excludedCount || 0) > 0 && (
                      <div className="text-amber-800">
                        <span className="font-semibold">Excluded for this task type:</span>{' '}
                        {Number(previewResult.excludedCount || 0)}
                      </div>
                    )}
                    {previewResult.matches.length > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-gray-700">
                          {selectedSendHelperIds.size} of {previewResult.matches.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSendHelperIds(new Set(previewResult.matches.filter((m: any) => !m.isAllocated && !m.isExcluded).map((m: any) => m.id)))
                            setOverrideExcludedHelperIds(new Set())
                          }}
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          Select all unallocated
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSendHelperIds(new Set())}
                          className="text-[11px] text-gray-500 hover:underline"
                        >
                          Deselect all
                        </button>
                      </div>
                    )}
                    {previewResult.matches.length > 0 && (
                      <div className="max-h-80 overflow-auto rounded border border-gray-200 bg-white">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-1 w-8">
                                <input
                                  type="checkbox"
                                  checked={
                                    previewResult.matches.filter((m: any) => !m.isAllocated && !m.isExcluded).length > 0 &&
                                    selectedSendHelperIds.size === previewResult.matches.filter((m: any) => !m.isAllocated && !m.isExcluded).length
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSendHelperIds(new Set(previewResult.matches.filter((m: any) => !m.isAllocated && !m.isExcluded).map((m: any) => m.id)))
                                      setOverrideExcludedHelperIds(new Set())
                                    } else {
                                      setSelectedSendHelperIds(new Set())
                                      setOverrideExcludedHelperIds(new Set())
                                    }
                                  }}
                                  className="w-3.5 h-3.5 cursor-pointer"
                                  title="Select or deselect all helpers"
                                />
                              </th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Score</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Helper</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Email</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Phone</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">km</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Max km</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Email Pref</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Allocated</th>
                              <th className="px-2 py-1 text-left font-semibold text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewResult.matches.map((m: any) => {
                              const hasPhone = !!(m.phoneNumber || '').trim()
                              const optedOut = m.smsOptOut === true
                              const score = typeof m.compositeScore === 'number' ? m.compositeScore : null
                              const canSelect = !m.isAllocated && (!m.isExcluded || overrideExcludedHelperIds.has(m.id))
                              const badgeColor = score === null ? 'bg-gray-100 text-gray-500'
                                : score >= 70 ? 'bg-green-100 text-green-800'
                                : score >= 40 ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                              const breakdown = score !== null
                                ? `Semantic: ${Math.round((m.semanticScore ?? 0) * 100)}%\nDistance: ${Math.round((m.distanceScore ?? 0) * 100)}%\nProfession: ${Math.round((m.professionScore ?? 0) * 100)}%\nSkill: ${Math.round((m.skillScore ?? 0) * 100)}%\nProfile: ${Math.round((m.profileScore ?? 0) * 100)}%`
                                : 'Lexical match (no AI scores)'
                              return (
                                <tr
                                  key={m.id}
                                  className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedSendHelperIds.has(m.id) ? 'bg-green-50' : ''} ${m.isAllocated ? 'bg-amber-50/60' : ''}`}
                                  onClick={() => {
                                    if (!canSelect) return
                                    setSelectedSendHelperIds(prev => {
                                      const next = new Set(prev)
                                      next.has(m.id) ? next.delete(m.id) : next.add(m.id)
                                      return next
                                    })
                                  }}
                                >
                                  <td className="px-2 py-1 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedSendHelperIds.has(m.id)}
                                      disabled={!canSelect}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        if (!canSelect) return
                                        setSelectedSendHelperIds(prev => {
                                          const next = new Set(prev)
                                          if (e.target.checked) {
                                            next.add(m.id)
                                          } else {
                                            next.delete(m.id)
                                          }
                                          return next
                                        })
                                      }}
                                      className="w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${badgeColor}`}
                                      title={breakdown}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openScoreBreakdown('preview', m)
                                      }}
                                    >
                                      {score !== null ? score : '—'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1 text-gray-900">
                                    <Link
                                      href={m?.id ? `/user/${m.id}` : '#'}
                                      className="text-blue-700 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {m.name}
                                    </Link>
                                  </td>
                                  <td className="px-2 py-1 text-gray-700">{m.email}</td>
                                  <td className="px-2 py-1 text-gray-500">
                                    {optedOut
                                      ? <span title={`Opted out of SMS${m.phoneNumber ? ` · ${m.phoneCountryCode ?? ''}${m.phoneNumber}` : ''}`}>🚫</span>
                                      : hasPhone
                                        ? <span title={`${m.phoneCountryCode ?? ''}${m.phoneNumber}`}>📱</span>
                                        : <span className="text-gray-400" title="No phone on file">—</span>}
                                  </td>
                                  <td className="px-2 py-1 text-gray-700">
                                    {typeof m.distanceKm === 'number' ? m.distanceKm.toFixed(1) : '—'}
                                  </td>
                                  <td className="px-2 py-1 text-gray-700">
                                    {typeof m.preferredMaxDistanceKm === 'number' ? m.preferredMaxDistanceKm.toFixed(1) : '—'}
                                  </td>
                                  <td className="px-2 py-1 text-gray-700">{m.emailPreference || 'instant'}</td>
                                  <td className="px-2 py-1 text-gray-700">
                                    {m.isAllocated ? (
                                      <span
                                        className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-semibold"
                                        title={`Allocated${m.allocatedAt ? ` on ${new Date(m.allocatedAt).toLocaleString()}` : ''}${m.allocatedVia ? ` via ${m.allocatedVia}` : ''}`}
                                      >
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">No</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-gray-700">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (!previewTaskId) return
                                        updateHelperMatchFeedback(previewTaskId, m.id, m.isExcluded ? 'clear' : 'exclude')
                                      }}
                                      disabled={updatingMatchFeedbackHelperId === m.id}
                                      className={`px-1.5 py-0.5 rounded text-[10px] border disabled:opacity-50 ${
                                        m.isExcluded
                                          ? 'border-red-300 text-red-700 hover:bg-red-50'
                                          : 'border-green-300 text-green-700 hover:bg-green-50'
                                      }`}
                                      title={
                                        m.isExcluded
                                          ? `${m.excludeReason || 'not_suitable'}${m.excludeNotes ? ` · ${m.excludeNotes}` : ''}`
                                          : 'Click to mark this helper as unsuitable'
                                      }
                                    >
                                      {m.isExcluded ? 'Unsuitable' : 'Suitable'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Send section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Send Matches
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  After previewing a task above, review selected helpers below and send.
                </p>
                {!previewTaskId && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-3">
                    Select a task above and click "Preview helper matches" first.
                  </p>
                )}
                {previewTaskId && previewResult.matches.length === 0 && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-3">
                    No eligible helpers matched for the currently previewed task.
                  </p>
                )}

                {previewResult.matches.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-4 mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                      <span className="text-xs font-semibold text-gray-700">Send via:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                        <input type="checkbox" checked={sendViaEmail} onChange={(e) => setSendViaEmail(e.target.checked)} className="w-3.5 h-3.5" />
                        ✉️ Email
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                        <input type="checkbox" checked={sendViaSms} onChange={(e) => setSendViaSms(e.target.checked)} className="w-3.5 h-3.5" />
                        📱 SMS
                      </label>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {selectedSendHelperIds.size} of {previewResult.matches.length} helper(s) selected
                      </span>
                      <button type="button" onClick={() => {
                        setSelectedSendHelperIds(new Set(previewResult.matches.filter((m: any) => !m.isAllocated && !m.isExcluded).map((m: any) => m.id)))
                        setOverrideExcludedHelperIds(new Set())
                      }} className="text-xs text-blue-600 hover:underline">Select all unallocated</button>
                      <button type="button" onClick={() => setSelectedSendHelperIds(new Set())} className="text-xs text-gray-500 hover:underline">Deselect all</button>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Use the single table above to review scores and select helpers to send.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => previewTaskId && selectedSendHelperIds.size > 0 && (sendViaEmail || sendViaSms) && sendHelperTaskMatchEmails(
                    previewTaskId,
                    Array.from(selectedSendHelperIds),
                    Array.from(overrideExcludedHelperIds).filter((id) => selectedSendHelperIds.has(id))
                  )}
                  disabled={!previewTaskId || selectedSendHelperIds.size === 0 || sendingMatches || (!sendViaEmail && !sendViaSms)}
                  className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMatches ? 'Sending…' : `Send to ${selectedSendHelperIds.size} helper${selectedSendHelperIds.size !== 1 ? 's' : ''}`}
                </button>
                {sendMatchesMessage && (
                  <p className="mt-2 text-xs text-gray-700">{sendMatchesMessage}</p>
                )}
              </div>

              {scoreBreakdownDetails && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-semibold">
                      Score breakdown ({scoreBreakdownDetails.source}) - {scoreBreakdownDetails.helperName}
                      {scoreBreakdownDetails.compositeScore !== null ? ` (Total: ${scoreBreakdownDetails.compositeScore})` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => setScoreBreakdownDetails(null)}
                      className="px-2 py-1 rounded bg-white border border-blue-200 hover:bg-blue-100 text-[11px]"
                    >
                      Close
                    </button>
                  </div>
                  {scoreBreakdownDetails.compositeScore === null ? (
                    <p>Lexical fallback result (no AI scoring breakdown available).</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="rounded bg-white border border-blue-100 px-2 py-1">
                        <div className="font-semibold">Semantic</div>
                        <div>{Math.round(scoreBreakdownDetails.semanticScore * 100)}%</div>
                      </div>
                      <div className="rounded bg-white border border-blue-100 px-2 py-1">
                        <div className="font-semibold">Distance</div>
                        <div>{Math.round(scoreBreakdownDetails.distanceScore * 100)}%</div>
                      </div>
                      <div className="rounded bg-white border border-blue-100 px-2 py-1">
                        <div className="font-semibold">Profession</div>
                        <div>{Math.round(scoreBreakdownDetails.professionScore * 100)}%</div>
                      </div>
                      <div className="rounded bg-white border border-blue-100 px-2 py-1">
                        <div className="font-semibold">Skill</div>
                        <div>{Math.round(scoreBreakdownDetails.skillScore * 100)}%</div>
                      </div>
                      <div className="rounded bg-white border border-blue-100 px-2 py-1">
                        <div className="font-semibold">Profile</div>
                        <div>{Math.round(scoreBreakdownDetails.profileScore * 100)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SMS Log */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 w-full">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">SMS Log</h3>
                  <p className="text-xs text-gray-500">All outgoing SMS messages sent via the platform.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setSmsLogsLoading(true)
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await fetch('/api/admin/sms-logs', {
                        headers: { 'Authorization': `Bearer ${session?.access_token}` },
                      })
                      const json = await res.json()
                      if (res.ok) setSmsLogs(json.logs ?? [])
                    } catch {}
                    finally { setSmsLogsLoading(false) }
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm rounded-md font-medium text-gray-800"
                >
                  {smsLogsLoading ? 'Loading…' : 'Load SMS Logs'}
                </button>
              </div>

              {smsLogs.length > 0 && (
                <div className="overflow-auto max-h-96 rounded border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-2 py-1 text-left font-semibold text-gray-700">Recipient</th>
                        <th className="px-2 py-1 text-left font-semibold text-gray-700">Phone</th>
                        <th className="px-2 py-1 text-left font-semibold text-gray-700">Message</th>
                        <th className="px-2 py-1 text-left font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smsLogs.map((log: any) => (
                        <tr key={log.id} className="border-t border-gray-100">
                          <td className="px-2 py-1 text-gray-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-2 py-1 text-gray-700">{log.recipient_name || '—'}</td>
                          <td className="px-2 py-1 text-gray-700 font-mono">{log.recipient_phone}</td>
                          <td className="px-2 py-1 text-gray-700 max-w-xs truncate" title={log.message}>{log.message}</td>
                          <td className="px-2 py-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!smsLogsLoading && smsLogs.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">Click "Load SMS Logs" to view outgoing messages.</p>
              )}
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

          const totalTrafficPages = Math.max(1, Math.ceil(traffic.length / TRAFFIC_PAGE_SIZE))
          const safeTrafficPage = Math.min(Math.max(trafficPage, 1), totalTrafficPages)
          const paginatedTraffic = traffic.slice(
            (safeTrafficPage - 1) * TRAFFIC_PAGE_SIZE,
            safeTrafficPage * TRAFFIC_PAGE_SIZE
          )
          const SESSION_GAP_MS = 30 * 60 * 1000
          const splitIntoSessions = <T extends { visited_at: string }>(items: T[]): T[][] => {
            if (items.length === 0) return []
            const sortedAsc = [...items].sort(
              (a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime()
            )
            const sessions: T[][] = []
            let current: T[] = [sortedAsc[0]]
            for (let i = 1; i < sortedAsc.length; i += 1) {
              const prevTs = new Date(sortedAsc[i - 1].visited_at).getTime()
              const currTs = new Date(sortedAsc[i].visited_at).getTime()
              if (currTs - prevTs > SESSION_GAP_MS) {
                sessions.push(current)
                current = [sortedAsc[i]]
              } else {
                current.push(sortedAsc[i])
              }
            }
            sessions.push(current)
            return sessions
          }
          const userSessions = Object.values(
            userPageVisits.reduce((acc, row) => {
              const key = row.user_id
              if (!acc[key]) {
                acc[key] = {
                  userId: row.user_id,
                  name: row.profiles?.full_name || 'Unknown user',
                  emailOrId: row.profiles?.email || row.user_id,
                  visits: [] as UserPageVisitRow[],
                }
              }
              acc[key].visits.push(row)
              return acc
            }, {} as Record<string, { userId: string; name: string; emailOrId: string; visits: UserPageVisitRow[] }>)
          )
            .flatMap((group) =>
              splitIntoSessions(group.visits).map((session, index) => ({
                key: `${group.userId}-session-${index}`,
                userId: group.userId,
                name: group.name,
                emailOrId: group.emailOrId,
                session,
                start: session[0]?.visited_at,
                end: session[session.length - 1]?.visited_at,
              }))
            )
            .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())

          const anonSessions = Object.values(
            anonPageVisits.reduce((acc, row) => {
              const key = row.visitor_id
              if (!acc[key]) {
                acc[key] = {
                  visitorId: row.visitor_id,
                  visits: [] as AnonPageVisitRow[],
                }
              }
              acc[key].visits.push(row)
              return acc
            }, {} as Record<string, { visitorId: string; visits: AnonPageVisitRow[] }>)
          )
            .flatMap((group) =>
              splitIntoSessions(group.visits).map((session, index) => ({
                key: `${group.visitorId}-session-${index}`,
                visitorId: group.visitorId,
                session,
                start: session[0]?.visited_at,
                end: session[session.length - 1]?.visited_at,
              }))
            )
            .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
          const userSessionsByDay = userSessions.reduce((acc, session) => {
            const dayKey = formatAdminDate(session.start)
            if (!acc[dayKey]) acc[dayKey] = []
            acc[dayKey].push(session)
            return acc
          }, {} as Record<string, typeof userSessions>)
          const anonSessionsByDay = anonSessions.reduce((acc, session) => {
            const dayKey = formatAdminDate(session.start)
            if (!acc[dayKey]) acc[dayKey] = []
            acc[dayKey].push(session)
            return acc
          }, {} as Record<string, typeof anonSessions>)
          const userDayKeys = Object.keys(userSessionsByDay).sort((a, b) => {
            const [ad, am, ay] = a.split('/').map(Number)
            const [bd, bm, by] = b.split('/').map(Number)
            return Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)
          })
          const anonDayKeys = Object.keys(anonSessionsByDay).sort((a, b) => {
            const [ad, am, ay] = a.split('/').map(Number)
            const [bd, bm, by] = b.split('/').map(Number)
            return Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)
          })
          const visibleUserDayKeys = showAllUserTrafficDays ? userDayKeys : userDayKeys.slice(0, 2)
          const visibleAnonDayKeys = showAllAnonTrafficDays ? anonDayKeys : anonDayKeys.slice(0, 2)

          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Page Traffic Analytics</h2>
                  <p className="text-gray-600 text-sm">
                    Track which pages users visit most frequently. Data is collected automatically when users navigate through the site.
                    <span className="block mt-2 text-gray-700">
                      <span className="font-medium">Note:</span> Page views are not counted for users whose profile role is{' '}
                      <span className="font-medium">admin</span> or <span className="font-medium">superadmin</span>, so those
                      sessions are excluded from the totals below.
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 items-center flex-wrap justify-end">
                  <select
                    value={trafficRange}
                    onChange={(e) => {
                      const selectedRange = e.target.value as TrafficRange
                      setTrafficRange(selectedRange)
                      if (selectedRange !== 'custom') {
                        fetchTraffic(selectedRange)
                      }
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="last_month">Last month</option>
                    <option value="custom">Custom dates</option>
                  </select>
                  {trafficRange === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={trafficCustomStart}
                        onChange={(e) => setTrafficCustomStart(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={trafficCustomEnd}
                        onChange={(e) => setTrafficCustomEnd(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => fetchTraffic('custom', trafficCustomStart, trafficCustomEnd)}
                        disabled={!trafficCustomStart || !trafficCustomEnd}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apply Dates
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fetchTraffic()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>

              <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Logged-in page views (detail)</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Session-level view in arrival order. Click a session to expand exact page sequence (no aggregation).
                    Admin and superadmin sessions are not logged.
                  </p>
                </div>
                <div className="p-4 overflow-x-auto">
                  {userPageVisitsLoading ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : userSessions.length === 0 ? (
                    <p className="text-sm text-gray-500">No logged-in visits in this range.</p>
                  ) : (
                    <div className="space-y-2">
                      {visibleUserDayKeys.map((day) => (
                        <div key={day} className="space-y-2 rounded-lg border border-gray-300 bg-gray-50/70 p-3">
                          <div className="text-sm font-bold uppercase tracking-wide text-gray-800">{day}</div>
                          {userSessionsByDay[day].map((item, index) => (
                            <details
                              key={item.key}
                              className={`border border-gray-200 rounded-lg ${index % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}`}
                            >
                              <summary className="cursor-pointer list-none px-3 py-2 hover:bg-gray-50">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-gray-900 font-medium">{item.name}</div>
                                    <div className="text-xs text-gray-500 font-mono break-all">{item.emailOrId}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{formatAdminDateTime(item.start)}</div>
                                  </div>
                                  <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded">
                                    {item.session.length} events
                                  </span>
                                </div>
                              </summary>
                              <div className="px-3 pb-3 overflow-x-auto">
                                <table className="min-w-full table-fixed text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 text-left text-gray-600">
                                      <th className="w-48 py-2 pr-4 font-medium">Time (UTC)</th>
                                      <th className="py-2 pr-4 font-medium">Page</th>
                                      <th className="w-28 py-2 pr-0 font-medium">Time Spent</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.session.map((visit, index) => {
                                      const nextVisit = item.session[index + 1]
                                      const spentMs = nextVisit
                                        ? new Date(nextVisit.visited_at).getTime() - new Date(visit.visited_at).getTime()
                                        : null
                                      return (
                                        <tr
                                          key={visit.id}
                                          className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}`}
                                        >
                                          <td className="w-48 py-2 pr-4 text-gray-800 whitespace-nowrap">{formatAdminDateTime(visit.visited_at)}</td>
                                          <td className="py-2 pr-4 text-gray-800 break-words">{formatPageName(visit.page)}</td>
                                          <td className="w-28 py-2 pr-0 text-gray-700 whitespace-nowrap">{spentMs == null ? '—' : formatDuration(spentMs)}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          ))}
                        </div>
                      ))}
                      {userDayKeys.length > 2 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAllUserTrafficDays((prev) => !prev)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                          >
                            {showAllUserTrafficDays ? 'Show fewer days' : `Show more days (${userDayKeys.length - 2} more)`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Anonymous page views (detail)</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Session-level view in arrival order for anonymous visitors. Click a session to expand exact page sequence.
                  </p>
                </div>
                <div className="p-4 overflow-x-auto">
                  {anonPageVisitsLoading ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : anonSessions.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No anonymous visits found in this range. If this stays empty, run `supabase/add_anon_page_visits.sql`.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {visibleAnonDayKeys.map((day) => (
                        <div key={day} className="space-y-2 rounded-lg border border-gray-300 bg-gray-50/70 p-3">
                          <div className="text-sm font-bold uppercase tracking-wide text-gray-800">{day}</div>
                          {anonSessionsByDay[day].map((item, index) => (
                            <details
                              key={item.key}
                              className={`border border-gray-200 rounded-lg ${index % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}`}
                            >
                              <summary className="cursor-pointer list-none px-3 py-2 hover:bg-gray-50">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-gray-900 font-medium break-all">Visitor {item.visitorId}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{formatAdminDateTime(item.start)}</div>
                                  </div>
                                  <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded">
                                    {item.session.length} events
                                  </span>
                                </div>
                              </summary>
                              <div className="px-3 pb-3 overflow-x-auto">
                                <table className="min-w-full table-fixed text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 text-left text-gray-600">
                                      <th className="w-48 py-2 pr-4 font-medium">Time (UTC)</th>
                                      <th className="py-2 pr-4 font-medium">Page</th>
                                      <th className="w-28 py-2 pr-0 font-medium">Time Spent</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.session.map((visit, index) => {
                                      const nextVisit = item.session[index + 1]
                                      const spentMs = nextVisit
                                        ? new Date(nextVisit.visited_at).getTime() - new Date(visit.visited_at).getTime()
                                        : null
                                      return (
                                        <tr
                                          key={visit.id}
                                          className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}`}
                                        >
                                          <td className="w-48 py-2 pr-4 text-gray-800 whitespace-nowrap">{formatAdminDateTime(visit.visited_at)}</td>
                                          <td className="py-2 pr-4 text-gray-800 break-words">{formatPageName(visit.page)}</td>
                                          <td className="w-28 py-2 pr-0 text-gray-700 whitespace-nowrap">{spentMs == null ? '—' : formatDuration(spentMs)}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          ))}
                        </div>
                      ))}
                      {anonDayKeys.length > 2 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAllAnonTrafficDays((prev) => !prev)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                          >
                            {showAllAnonTrafficDays ? 'Show fewer days' : `Show more days (${anonDayKeys.length - 2} more)`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
                          {paginatedTraffic.map((t, pageIndex) => {
                            const index = (safeTrafficPage - 1) * TRAFFIC_PAGE_SIZE + pageIndex
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
                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm text-gray-600">
                        Showing {traffic.length === 0 ? 0 : (safeTrafficPage - 1) * TRAFFIC_PAGE_SIZE + 1}
                        {' '}to {Math.min(safeTrafficPage * TRAFFIC_PAGE_SIZE, traffic.length)} of {traffic.length} pages
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTrafficPage((p) => Math.max(1, p - 1))}
                          disabled={safeTrafficPage <= 1}
                          className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-700">
                          Page {safeTrafficPage} of {totalTrafficPages}
                        </span>
                        <button
                          onClick={() => setTrafficPage((p) => Math.min(totalTrafficPages, p + 1))}
                          disabled={safeTrafficPage >= totalTrafficPages}
                          className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
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

        {/* Email Logs Tab (legacy, no longer used) */}
        {false && (() => {
          // Filter email logs based on filters
          const filteredEmailLogs = emailLogs.filter((log) => {
            const recipientMatch = !emailLogFilters.recipient || 
              log.recipient_email?.toLowerCase().includes(emailLogFilters.recipient.toLowerCase()) ||
              log.recipient_name?.toLowerCase().includes(emailLogFilters.recipient.toLowerCase())
            const subjectMatch = !emailLogFilters.subject || 
              renderEmailLogSubject(log).toLowerCase().includes(emailLogFilters.subject.toLowerCase())
            const typeMatch = !emailLogFilters.emailType || 
              log.email_type === emailLogFilters.emailType
            return recipientMatch && subjectMatch && typeMatch
          })

          return (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">
              Email Logs ({filteredEmailLogs.length}{filteredEmailLogs.length !== emailLogs.length ? ` of ${emailLogs.length}` : ''})
            </h2>
            
            {/* Filter Section */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Recipient Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Recipient
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by recipient email or name..."
                    value={emailLogFilters.recipient}
                    onChange={(e) => setEmailLogFilters({ ...emailLogFilters, recipient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Subject Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by subject..."
                    value={emailLogFilters.subject}
                    onChange={(e) => setEmailLogFilters({ ...emailLogFilters, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={emailLogFilters.emailType}
                    onChange={(e) => setEmailLogFilters({ ...emailLogFilters, emailType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="new_bid">New Bid</option>
                    <option value="bid_updated">Bid Updated</option>
                    <option value="bid_accepted">Bid Accepted</option>
                    <option value="bid_rejected">Bid Rejected</option>
                    <option value="new_message">New Message</option>
                    <option value="message_blocked_pre_bid">Message Blocked (Pre-bid)</option>
                    <option value="task_completed">Task Completed</option>
                    <option value="task_cancelled">Task Cancelled</option>
                    <option value="admin_email">Admin Email</option>
                    <option value="profile_completion">Profile Completion</option>
                  </select>
                </div>
              </div>
              
              {/* Clear Filters Button */}
              {(emailLogFilters.recipient || emailLogFilters.subject || emailLogFilters.emailType) && (
                <div className="mt-3">
                  <button
                    onClick={() => setEmailLogFilters({ recipient: '', subject: '', emailType: '' })}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4 flex gap-2 flex-wrap">
              <button
                onClick={fetchEmailLogs}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Refresh Logs
              </button>
              {selectedEmailLogIds.length > 0 && (
                <button
                  onClick={() => setDeletingEmailLogId('bulk')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Selected ({selectedEmailLogIds.length})
                </button>
              )}
            </div>
            {filteredEmailLogs.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full border border-gray-300" style={{ tableLayout: 'auto' }}>
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm whitespace-nowrap w-12">
                        <input
                          type="checkbox"
                          checked={selectedEmailLogIds.length === filteredEmailLogs.length && filteredEmailLogs.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmailLogIds(filteredEmailLogs.map(log => log.id))
                            } else {
                              setSelectedEmailLogIds([])
                            }
                          }}
                          className="cursor-pointer"
                          title="Select all visible"
                        />
                      </th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm whitespace-nowrap">Date</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell whitespace-nowrap">Sender</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell whitespace-nowrap">Recipient</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm min-w-[224px]">Subject</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell whitespace-nowrap">Type</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden xl:table-cell whitespace-nowrap">Error</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm whitespace-nowrap md:sticky md:right-[80px] bg-gray-100 z-10">View</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm whitespace-nowrap md:sticky md:right-0 bg-gray-100 z-10">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmailLogs.map((log) => {
                      const recipientProfileId = getEmailLogRecipientProfileId(log)
                      const senderProfileId = getEmailLogSenderProfileId(log)
                      return (
                      <tr key={log.id} className={`hover:bg-gray-50 ${selectedEmailLogIds.includes(log.id) ? 'bg-blue-50' : ''}`}>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <input
                            type="checkbox"
                            checked={selectedEmailLogIds.includes(log.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmailLogIds([...selectedEmailLogIds, log.id])
                              } else {
                                setSelectedEmailLogIds(selectedEmailLogIds.filter(id => id !== log.id))
                              }
                            }}
                            className="cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell max-w-[22ch]">
                          <div className="font-medium truncate max-w-[22ch]" title={getEmailLogSenderName(log)}>
                            {senderProfileId && getEmailLogSenderName(log) !== 'System' ? (
                              <Link href={`/user/${senderProfileId}`} className="text-primary-600 hover:underline block truncate">
                                {getEmailLogSenderName(log)}
                              </Link>
                            ) : (
                              <span>{getEmailLogSenderName(log)}</span>
                            )}
                          </div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell max-w-[22ch]">
                          <div className="font-medium truncate max-w-[22ch]" title={log.recipient_name || 'Unknown Recipient'}>
                            {recipientProfileId ? (
                              <Link href={`/user/${recipientProfileId}`} className="text-primary-600 hover:underline block truncate">
                                {log.recipient_name || 'Unknown Recipient'}
                              </Link>
                            ) : (
                              <span>{log.recipient_name || 'Unknown Recipient'}</span>
                            )}
                          </div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm min-w-[224px]">
                          <div className="break-words" title={renderEmailLogSubject(log)}>{renderEmailLogSubject(log)}</div>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden lg:table-cell max-w-[22ch]">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800 whitespace-nowrap">
                            <span className="inline-block max-w-[22ch] truncate align-bottom" title={log.email_type}>
                              {log.email_type}
                            </span>
                          </span>
                        </td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hidden xl:table-cell">
                          <div className="truncate max-w-[150px]" title={log.error_message || '-'}>{log.error_message || '-'}</div>
                        </td>
                        <td className={`border px-2 sm:px-4 py-2 text-xs sm:text-sm md:sticky md:right-[80px] z-10 ${selectedEmailLogIds.includes(log.id) ? 'bg-blue-50' : 'bg-white'}`}>
                          <button
                            onClick={() => setViewingEmailLog(log)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                            title="View email content"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="hidden sm:inline">View</span>
                          </button>
                        </td>
                        <td className={`border px-2 sm:px-4 py-2 text-xs sm:text-sm md:sticky md:right-0 z-10 ${selectedEmailLogIds.includes(log.id) ? 'bg-blue-50' : 'bg-white'}`}>
                          <button
                            onClick={() => setDeletingEmailLogId(log.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                            title="Delete email log"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">
                {emailLogs.length === 0 
                  ? 'No email logs found.' 
                  : 'No email logs match the current filters.'}
              </p>
            )}
          </div>
          )
        })()}

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

        {/* Maps Tab - manage custom map markers (e.g. supermarkets) */}
        {tab === 'maps' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Marker form + list */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add Map Marker</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newMarkerTitle}
                      onChange={e => setNewMarkerTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Meu Super Estoi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={newMarkerAddress}
                      onChange={e => setNewMarkerAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Rua de Faro, 81, 8005-411 Estoi, Portugal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip</label>
                    <input
                      type="text"
                      value={newMarkerTooltip}
                      onChange={e => setNewMarkerTooltip(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Meu Super your local supermarket"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                    <input
                      type="text"
                      value={newMarkerLogoUrl}
                      onChange={e => setNewMarkerLogoUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="/meusuper-logo.png or leave blank"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      You can paste an existing URL or upload a new image file below.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={e => {
                          const file = e.target.files?.[0] || null
                          setNewMarkerLogoFile(file)
                        }}
                        className="text-xs"
                      />
                    </div>
                    {newMarkerLogoFile && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Selected file: {newMarkerLogoFile.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business URL (optional)</label>
                    <input
                      type="url"
                      value={newMarkerBusinessUrl}
                      onChange={e => setNewMarkerBusinessUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If provided, clicking the marker popup can take users to this website.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="newMarkerVisible"
                      type="checkbox"
                      checked={newMarkerVisible}
                      onChange={e => setNewMarkerVisible(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="newMarkerVisible" className="text-sm text-gray-700">
                      Visible on tasks map
                    </label>
                  </div>

                  {mapMarkerError && (
                    <div className="text-sm text-red-600">{mapMarkerError}</div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setMapMarkerError(null)
                          setNewMarkerPreview(null)
                          const rawAddress = newMarkerAddress.trim()
                          if (!rawAddress) {
                            setMapMarkerError('Please enter an address to geocode.')
                            return
                          }

                          const result = await geocodeAddress(rawAddress)
                          if (!result) {
                            setMapMarkerError('Unable to geocode address. Please check it and try again.')
                            return
                          }

                          setNewMarkerPreview({
                            latitude: result.latitude,
                            longitude: result.longitude,
                          })
                        } catch (err: any) {
                          setMapMarkerError(err.message || 'Failed to geocode address.')
                        }
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium"
                    >
                      Geocode & Preview
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setMapMarkerError(null)
                          if (!newMarkerTitle.trim() || !newMarkerAddress.trim()) {
                            setMapMarkerError('Title and address are required.')
                            return
                          }

                          let latitude = newMarkerPreview?.latitude ?? null
                          let longitude = newMarkerPreview?.longitude ?? null

                          if (!latitude || !longitude) {
                            const rawAddress = newMarkerAddress.trim()
                            const result = await geocodeAddress(rawAddress)
                            if (!result) {
                              setMapMarkerError('Unable to geocode address. Please geocode first.')
                              return
                            }
                            latitude = result.latitude
                            longitude = result.longitude
                            setNewMarkerPreview({ latitude, longitude })
                          }

                          setSavingMapMarker(true)

                          // If a new logo file is selected, upload it and use its URL
                          let logoUrl = newMarkerLogoUrl.trim() || null
                          if (newMarkerLogoFile) {
                            setUploadingNewMarkerLogo(true)
                            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
                            if (authError || !authUser) {
                              throw new Error('You must be logged in to upload a logo image')
                            }

                            const ext = (newMarkerLogoFile.name.split('.').pop() || 'jpg').toLowerCase()
                            const fileName = `marker-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                            const filePath = `${authUser.id}/${fileName}`

                            const { error: uploadError } = await supabase.storage
                              .from('images')
                              .upload(filePath, newMarkerLogoFile, {
                                upsert: true,
                                contentType: newMarkerLogoFile.type || 'image/jpeg',
                              })

                            if (uploadError) {
                              console.error('Error uploading marker logo:', uploadError)
                              throw new Error(uploadError.message || 'Failed to upload marker logo')
                            }

                            const { data } = supabase.storage.from('images').getPublicUrl(filePath)
                            logoUrl = data.publicUrl || null
                          }

                          const { error } = await supabase.from('map_markers').insert({
                            title: newMarkerTitle.trim(),
                            address: newMarkerAddress.trim(),
                            tooltip: newMarkerTooltip.trim() || null,
                            logo_url: logoUrl,
                            business_url: newMarkerBusinessUrl.trim() || null,
                            latitude,
                            longitude,
                            visible: newMarkerVisible,
                          })

                          if (error) {
                            console.error('Error saving map marker:', error)
                            setMapMarkerError(error.message || 'Failed to save marker.')
                            return
                          }

                          // Refresh list and clear form
                          await fetchMapMarkers()
                          setNewMarkerTitle('')
                          setNewMarkerAddress('')
                          setNewMarkerTooltip('')
                          setNewMarkerLogoUrl('')
                          setNewMarkerBusinessUrl('')
                          setNewMarkerVisible(true)
                          setNewMarkerPreview(null)
                          setNewMarkerLogoFile(null)
                        } catch (err: any) {
                          console.error('Error saving map marker:', err)
                          setMapMarkerError(err.message || 'Failed to save marker.')
                        } finally {
                          setSavingMapMarker(false)
                          setUploadingNewMarkerLogo(false)
                        }
                      }}
                      disabled={savingMapMarker}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium"
                    >
                      {savingMapMarker ? 'Saving...' : 'Save Marker'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Existing Markers</h2>
                  <button
                    type="button"
                    onClick={fetchMapMarkers}
                    disabled={loadingMapMarkers}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs sm:text-sm font-medium"
                  >
                    {loadingMapMarkers ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                {loadingMapMarkers ? (
                  <div className="text-sm text-gray-500">Loading markers...</div>
                ) : mapMarkers.length === 0 ? (
                  <div className="text-sm text-gray-500">No markers yet.</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {mapMarkers.map(marker => {
                      const isEditing = editingMarkerId === marker.id
                      return (
                        <div
                          key={marker.id}
                          className="flex items-start justify-between gap-3 border border-gray-100 rounded-md px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="space-y-1">
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    value={editingMarkerTitle}
                                    onChange={e => setEditingMarkerTitle(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {marker.address}
                                </p>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Tooltip
                                  </label>
                                  <input
                                    type="text"
                                    value={editingMarkerTooltip}
                                    onChange={e => setEditingMarkerTooltip(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Logo
                                  </label>
                                  <input
                                    type="text"
                                    value={editingMarkerLogoUrl}
                                    onChange={e => setEditingMarkerLogoUrl(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Existing URL or leave blank"
                                  />
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={e => {
                                      const file = e.target.files?.[0] || null
                                      setEditingMarkerLogoFile(file)
                                    }}
                                    className="mt-1 text-[11px]"
                                  />
                                  {editingMarkerLogoFile && (
                                    <p className="mt-0.5 text-[10px] text-gray-500">
                                      Selected file: {editingMarkerLogoFile.name}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Business URL
                                  </label>
                                  <input
                                    type="url"
                                    value={editingMarkerBusinessUrl}
                                    onChange={e => setEditingMarkerBusinessUrl(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="https://example.com"
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {marker.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {marker.address}
                                </p>
                                {marker.tooltip && (
                                  <p className="text-xs text-gray-400 truncate">
                                    Tooltip: {marker.tooltip}
                                  </p>
                                )}
                                {marker.logo_url && (
                                  <p className="text-[11px] text-gray-400 truncate">
                                    Logo: {marker.logo_url}
                                  </p>
                                )}
                                {marker.business_url && (
                                  <p className="text-[11px] text-blue-600 truncate">
                                    Link: {marker.business_url}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={!!marker.visible}
                                onChange={async e => {
                                  const visible = e.target.checked
                                  try {
                                    const { error } = await supabase
                                      .from('map_markers')
                                      .update({ visible })
                                      .eq('id', marker.id)
                                    if (error) {
                                      console.error('Error updating marker visibility:', error)
                                      return
                                    }
                                    setMapMarkers(prev =>
                                      prev.map(m => (m.id === marker.id ? { ...m, visible } : m))
                                    )
                                  } catch (err) {
                                    console.error('Error updating marker visibility:', err)
                                  }
                                }}
                                className="h-3 w-3 text-blue-600 border-gray-300 rounded"
                              />
                              <span>Visible</span>
                            </label>

                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={updatingMarker}
                                  onClick={async () => {
                                    try {
                                      setUpdatingMarker(true)
                                      let logoUrl = editingMarkerLogoUrl.trim() || null

                                      if (editingMarkerLogoFile) {
                                        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
                                        if (authError || !authUser) {
                                          throw new Error('You must be logged in to upload a logo image')
                                        }

                                        const ext = (editingMarkerLogoFile.name.split('.').pop() || 'jpg').toLowerCase()
                                        const fileName = `marker-${marker.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                                        const filePath = `${authUser.id}/${fileName}`

                                        const { error: uploadError } = await supabase.storage
                                          .from('images')
                                          .upload(filePath, editingMarkerLogoFile, {
                                            upsert: true,
                                            contentType: editingMarkerLogoFile.type || 'image/jpeg',
                                          })

                                        if (uploadError) {
                                          console.error('Error uploading marker logo:', uploadError)
                                          throw new Error(uploadError.message || 'Failed to upload marker logo')
                                        }

                                        const { data } = supabase.storage.from('images').getPublicUrl(filePath)
                                        logoUrl = data.publicUrl || null
                                      }

                                      const payload: any = {
                                        title: editingMarkerTitle.trim() || marker.title,
                                        tooltip: editingMarkerTooltip.trim() || null,
                                        logo_url: logoUrl,
                                        business_url: editingMarkerBusinessUrl.trim() || null,
                                      }
                                      const { error } = await supabase
                                        .from('map_markers')
                                        .update(payload)
                                        .eq('id', marker.id)
                                      if (error) {
                                        console.error('Error updating marker:', error)
                                        setMapMarkerError(error.message || 'Failed to update marker.')
                                        return
                                      }
                                      setMapMarkers(prev =>
                                        prev.map(m =>
                                          m.id === marker.id ? { ...m, ...payload } : m
                                        )
                                      )
                                      setEditingMarkerId(null)
                                      setEditingMarkerBusinessUrl('')
                                      setEditingMarkerLogoFile(null)
                                    } catch (err: any) {
                                      console.error('Error updating marker:', err)
                                      setMapMarkerError(err.message || 'Failed to update marker.')
                                    } finally {
                                      setUpdatingMarker(false)
                                    }
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                  {updatingMarker ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingMarker}
                                  onClick={() => {
                                    setEditingMarkerId(null)
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setMapMarkerError(null)
                                  setEditingMarkerId(marker.id)
                                  setEditingMarkerTitle(marker.title || '')
                                  setEditingMarkerTooltip(marker.tooltip || '')
                                  setEditingMarkerLogoUrl(marker.logo_url || '')
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Edit
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Delete this marker?')) return
                                try {
                                  const { error } = await supabase
                                    .from('map_markers')
                                    .delete()
                                    .eq('id', marker.id)
                                  if (error) {
                                    console.error('Error deleting marker:', error)
                                    return
                                  }
                                  setMapMarkers(prev => prev.filter(m => m.id !== marker.id))
                                  if (editingMarkerId === marker.id) {
                                    setEditingMarkerId(null)
                                  }
                                } catch (err) {
                                  console.error('Error deleting marker:', err)
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Map preview */}
            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Map Preview</h2>
                <p className="text-xs text-gray-500">
                  Showing {mapMarkers.filter(m => m.visible).length} visible markers
                </p>
              </div>
              <div className="flex-1 min-h-[300px]">
                <AdminMap
                  tasks={[]}
                  markers={[
                    ...mapMarkers.filter(m => m.visible),
                    ...(newMarkerPreview && newMarkerAddress && newMarkerTitle
                      ? [{
                          id: 'preview',
                          title: newMarkerTitle,
                          address: newMarkerAddress,
                          tooltip: newMarkerTooltip || newMarkerTitle,
                          logo_url: newMarkerLogoUrl || null,
                          latitude: newMarkerPreview.latitude,
                          longitude: newMarkerPreview.longitude,
                        }]
                      : []),
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Skills & Services Tab (removed from UI, kept for reference) */}
        {false && (
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

        {/* Replace Pre-bid Image Modal */}
        {prebidReplaceLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Replace pre-bid image</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Choose one or more images to replace, or toggle full-conversation replacement.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPrebidReplaceLog(null)
                    setPrebidImages([])
                    setSelectedPrebidMessageIds([])
                    setReplacementReason(DEFAULT_PREBID_REPLACEMENT_REASON)
                    setReplaceAllConversationImages(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  title="Close"
                >
                  ×
                </button>
              </div>

              <div className="p-4 overflow-auto space-y-4">
                {prebidImagesLoading ? (
                  <p className="text-sm text-gray-600">Loading conversation images...</p>
                ) : prebidImages.length === 0 ? (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No message images found for this conversation.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-gray-50 p-2">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={replaceAllConversationImages}
                          onChange={(e) => setReplaceAllConversationImages(e.target.checked)}
                        />
                        Replace all images in this conversation
                      </label>
                      {!replaceAllConversationImages && (
                        <button
                          type="button"
                          onClick={() => {
                            const selectableIds = prebidImages
                              .filter((img) => img.image_url !== '/images/image_replaced_violation.png')
                              .map((img) => img.id)
                            setSelectedPrebidMessageIds(selectableIds)
                          }}
                          className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:bg-white"
                        >
                          Select all shown
                        </button>
                      )}
                    </div>
                    {prebidImages.map((msg) => {
                      const isSelected = selectedPrebidMessageIds.includes(msg.id)
                      const isAlreadyPlaceholder = msg.image_url === '/images/image_replaced_violation.png'
                      return (
                        <label
                          key={msg.id}
                          className={`block rounded-lg border p-3 cursor-pointer ${
                            isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPrebidMessageIds((prev) => Array.from(new Set([...prev, msg.id])))
                                } else {
                                  setSelectedPrebidMessageIds((prev) => prev.filter((id) => id !== msg.id))
                                }
                              }}
                              className="mt-1"
                              disabled={isAlreadyPlaceholder || replaceAllConversationImages}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
                                <span>{new Date(msg.created_at).toLocaleString()}</span>
                                {isAlreadyPlaceholder && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                    Already replaced
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-700 mb-2 break-all">{msg.image_url}</div>
                              {msg.image_url && (
                                <img
                                  src={msg.image_url}
                                  alt="Message attachment preview"
                                  className="max-h-44 rounded border border-gray-200 object-contain bg-gray-50"
                                />
                              )}
                              {msg.content && (
                                <p className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <textarea
                    value={replacementReason}
                    onChange={(e) => setReplacementReason(e.target.value)}
                    rows={3}
                    placeholder="Add an admin note for the replacement log..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrebidReplaceLog(null)
                    setPrebidImages([])
                    setSelectedPrebidMessageIds([])
                    setReplacementReason(DEFAULT_PREBID_REPLACEMENT_REASON)
                    setReplaceAllConversationImages(false)
                  }}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={replaceSelectedPrebidImage}
                  disabled={replacingPrebidImage || (!replaceAllConversationImages && selectedPrebidMessageIds.length === 0)}
                  className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {replacingPrebidImage ? 'Replacing...' : 'Replace with violation image'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Email Log Confirmation Modal */}
        {deletingEmailLogId && (
          <StandardModal
            isOpen={!!deletingEmailLogId}
            onClose={() => setDeletingEmailLogId(null)}
            type="warning"
            title={deletingEmailLogId === 'bulk' ? "Delete Selected Email Logs" : "Delete Email Log"}
            message={
              deletingEmailLogId === 'bulk'
                ? `Are you sure you want to delete ${selectedEmailLogIds.length} email log${selectedEmailLogIds.length === 1 ? '' : 's'}? This action cannot be undone.\n\nThis will permanently remove the selected email log${selectedEmailLogIds.length === 1 ? '' : 's'} from the database.`
                : `Are you sure you want to delete this email log? This action cannot be undone.\n\nThis will permanently remove the email log from the database.`
            }
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={() => {
              if (deletingEmailLogId === 'bulk') {
                deleteEmailLog(selectedEmailLogIds)
              } else {
                deleteEmailLog(deletingEmailLogId)
              }
            }}
          />
        )}

        {/* Settings Tab */}
        {/* Blog Tab */}
        {tab === 'blog' && (
          <div className="space-y-6">
            {/* OG Image Upload Info */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-2xl font-bold mb-4">OG Images</h2>
              <p className="text-gray-600 mb-4">
                Upload OG images manually when creating blog posts. Images are stored at <code className="bg-gray-100 px-1 rounded">/public/images/blog/og/</code>
                <br />
                <span className="text-sm text-gray-500">Recommended size: 1200x630px for optimal social sharing.</span>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> AI image generation has been disabled. Please upload images manually using the form below.
              </p>
            </div>

            {/* Legacy AI Generation Section - DISABLED */}
            {false && (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 opacity-50">
              <h2 className="text-2xl font-bold mb-4">Generate OG Images (DISABLED)</h2>
              <p className="text-gray-600 mb-4">
                This feature has been disabled. Please use manual image uploads instead.
              </p>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={async () => {
                    setGeneratingBlogImages(true)
                    setBlogImageGenerationStatus('🔄 Starting image generation for missing posts...\nThis may take several minutes. Please wait...')
                    try {
                      const controller = new AbortController()
                      const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minutes
                      
                      const response = await fetch('/api/blog/generate-og-image?all=true', {
                        method: 'POST',
                        signal: controller.signal,
                      })
                      
                      clearTimeout(timeoutId)
                      
                      if (!response.ok) {
                        const errorText = await response.text()
                        throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`)
                      }
                      
                      const data = await response.json()
                      
                      if (data.success) {
                        const successCount = data.results?.filter((r: any) => r.success).length || 0
                        const totalCount = data.results?.length || 0
                        const failedCount = totalCount - successCount
                        
                        let statusMessage = `✅ Success! Generated ${successCount} of ${totalCount} images.\n\n`
                        
                        if (data.results && data.results.length > 0) {
                          statusMessage += 'Results:\n'
                          data.results.forEach((result: any) => {
                            if (result.success) {
                              statusMessage += `✅ ${result.title} - ${result.imagePath}\n`
                            } else {
                              statusMessage += `❌ ${result.title} - Error: ${result.error}\n`
                            }
                          })
                        }
                        
                        if (failedCount > 0) {
                          statusMessage += `\n⚠️ ${failedCount} image(s) failed to generate. Check errors above.`
                        }
                        
                        setBlogImageGenerationStatus(statusMessage)
                      } else {
                        setBlogImageGenerationStatus(`❌ Error: ${data.error || 'Failed to generate images'}`)
                      }
                    } catch (error: any) {
                      if (error.name === 'AbortError') {
                        setBlogImageGenerationStatus('⏱️ Request timed out. The generation may still be running on the server. Check the server logs and refresh to see if images were created.')
                      } else {
                        setBlogImageGenerationStatus(`❌ Error: ${error.message || 'Failed to generate images'}\n\nCheck the browser console (F12) and server logs for more details.`)
                        console.error('Image generation error:', error)
                      }
                    } finally {
                      setGeneratingBlogImages(false)
                    }
                  }}
                  disabled={generatingBlogImages}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatingBlogImages ? 'Generating...' : 'Generate Missing Images'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('This will regenerate ALL blog post images, even existing ones. This may take a long time and use API credits. Continue?')) {
                      return
                    }
                    setGeneratingBlogImages(true)
                    setBlogImageGenerationStatus('🔄 Force regenerating ALL images...\nThis may take several minutes. Please wait...')
                    try {
                      const controller = new AbortController()
                      const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minutes
                      
                      const response = await fetch('/api/blog/generate-og-image?all=true&force=true', {
                        method: 'POST',
                        signal: controller.signal,
                      })
                      
                      clearTimeout(timeoutId)
                      
                      if (!response.ok) {
                        const errorText = await response.text()
                        throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`)
                      }
                      
                      const data = await response.json()
                      
                      if (data.success) {
                        const successCount = data.results?.filter((r: any) => r.success).length || 0
                        const totalCount = data.results?.length || 0
                        const failedCount = totalCount - successCount
                        
                        let statusMessage = `✅ Success! Regenerated ${successCount} of ${totalCount} images.\n\n`
                        
                        if (data.results && data.results.length > 0) {
                          statusMessage += 'Results:\n'
                          data.results.forEach((result: any) => {
                            if (result.success) {
                              statusMessage += `✅ ${result.title} - ${result.imagePath}\n`
                            } else {
                              statusMessage += `❌ ${result.title} - Error: ${result.error}\n`
                            }
                          })
                        }
                        
                        if (failedCount > 0) {
                          statusMessage += `\n⚠️ ${failedCount} image(s) failed to generate. Check errors above.`
                        }
                        
                        setBlogImageGenerationStatus(statusMessage)
                      } else {
                        setBlogImageGenerationStatus(`❌ Error: ${data.error || 'Failed to generate images'}`)
                      }
                    } catch (error: any) {
                      if (error.name === 'AbortError') {
                        setBlogImageGenerationStatus('⏱️ Request timed out. The generation may still be running on the server. Check the server logs and refresh to see if images were created.')
                      } else {
                        setBlogImageGenerationStatus(`❌ Error: ${error.message || 'Failed to generate images'}\n\nCheck the browser console (F12) and server logs for more details.`)
                        console.error('Image generation error:', error)
                      }
                    } finally {
                      setGeneratingBlogImages(false)
                    }
                  }}
                  disabled={generatingBlogImages}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatingBlogImages ? 'Regenerating...' : 'Force Regenerate All'}
                </button>
              </div>
              {blogImageGenerationStatus && (
                <div className={`mt-4 p-4 rounded-lg max-h-96 overflow-y-auto ${
                  blogImageGenerationStatus?.includes('✅') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : blogImageGenerationStatus?.includes('❌')
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap font-mono">{blogImageGenerationStatus}</p>
                </div>
              )}
              {generatingBlogImages && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600">Generating images... This may take several minutes. Please don't close this page.</p>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Blog Posts List */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-2xl font-bold mb-4">All Blog Posts</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {blogs.map((post) => (
                  <div
                    key={post.slug}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{post.title}</h3>
                      <p className="text-sm text-gray-500">
                        {post.category} {post.location ? `• ${post.location}` : ''} • {post.date}
                      </p>
                      {post.ogImageUpload && (
                        <p className="text-xs text-green-600 mt-1">✓ Has OG image</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingPostSlug(post.slug)}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Create/Edit Blog Post Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingPostSlug ? 'Edit Blog Post' : 'Create Blog Post'}
                </h2>
                {editingPostSlug && (
                  <button
                    onClick={() => setEditingPostSlug(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <CreateBlogPost
                key={editingPostSlug || 'new-post'} // Force re-render when switching posts
                initialPost={editingPostSlug ? blogs.find(p => p.slug === editingPostSlug) || null : null}
                onPostSaved={(post) => {
                  // Post is automatically saved to lib/blog-data.ts via API
                  // Reload the page to see updated post list
                  setTimeout(() => {
                    window.location.reload()
                  }, 1500)
                }}
              />
            </div>
          </div>
        )}

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

              {/* Helper Task Match Feature Flag */}
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  📨 Helper Task Match Emails (Feature Flag)
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Control whether the helper task matching system is live. When disabled, Taskorilla will not send
                  "New task near you" notification emails to helpers, even if matching logic is configured.
                </p>
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={helperTaskMatchEnabled}
                      onChange={(e) => setHelperTaskMatchEnabled(e.target.checked)}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      helperTaskMatchEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      helperTaskMatchEnabled ? 'translate-x-5' : ''
                    }`} />
                  </div>
                  <span className="text-sm text-gray-900">
                    {helperTaskMatchEnabled ? 'Enabled – helpers can receive task match emails' : 'Disabled – no helper task match emails will be sent'}
                  </span>
                </label>
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

        {/* View Email Modal - Full Screen for Better Email Viewing */}
        {viewingEmailLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">{renderEmailLogSubject(viewingEmailLog)}</h2>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p><strong>From:</strong> {getEmailLogSenderName(viewingEmailLog)}</p>
                    <p><strong>To:</strong> {viewingEmailLog.recipient_email}</p>
                    <p><strong>Date:</strong> {new Date(viewingEmailLog.created_at).toLocaleString()}</p>
                    <p><strong>Type:</strong> {viewingEmailLog.email_type} | <strong>Status:</strong> <span className={`${
                      viewingEmailLog.status === 'sent' ? 'text-green-600' :
                      viewingEmailLog.status === 'failed' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>{viewingEmailLog.status}</span></p>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  {viewingEmailLog.email_type === 'new_message' &&
                    viewingEmailLog.metadata?.hasImage === true &&
                    viewingEmailLog.metadata?.bidAccepted !== true &&
                    viewingEmailLog.metadata?.conversationId && (
                      <button
                        type="button"
                        onClick={() => openPrebidReplacementPicker(viewingEmailLog)}
                        className="px-3 py-1.5 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-semibold"
                      >
                        Replace pre-bid image
                      </button>
                    )}
                  <button
                    onClick={() => setViewingEmailLog(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Replacement History */}
              <div className="px-6 pt-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Image replacement log</h3>
                  {replacementHistoryLoading ? (
                    <p className="text-xs text-gray-500">Loading replacement history...</p>
                  ) : replacementHistory.length === 0 ? (
                    <p className="text-xs text-gray-500">No image replacement logged for this email yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {replacementHistory.map((entry) => (
                        <div key={entry.id} className="rounded border border-gray-200 bg-white p-2 text-xs text-gray-700">
                          <p><strong>When:</strong> {new Date(entry.created_at).toLocaleString()}</p>
                          <p><strong>Original:</strong> <span className="break-all">{entry.original_image_url}</span></p>
                          <p><strong>Replaced with:</strong> <span className="break-all">{entry.replacement_image_url}</span></p>
                          <div className="mt-2">
                            <img
                              src={entry.replacement_image_url}
                              alt="Replacement moderation image"
                              className="max-h-28 rounded border border-gray-200 bg-gray-50 object-contain"
                            />
                          </div>
                          {entry.reason && <p><strong>Reason:</strong> {entry.reason}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Content */}
              <div className="flex-1 overflow-auto p-6 bg-gray-50">
                {(() => {
                  // Extract body content from full HTML if it's a full HTML document
                  let htmlContent = viewingEmailLog.metadata?.html_content || ''
                  
                  if (htmlContent) {
                    // If it's a full HTML document, extract just the body content
                    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i)
                    if (bodyMatch) {
                      htmlContent = bodyMatch[1]
                    }
                    // Also check for rendered_content if available
                    if (!htmlContent && viewingEmailLog.metadata?.rendered_content) {
                      htmlContent = viewingEmailLog.metadata.rendered_content
                    }
                  }
                  
                  if (htmlContent) {
                    return (
                      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div 
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                          className="email-preview"
                          style={{ 
                            fontFamily: 'Arial, sans-serif', 
                            lineHeight: '1.6', 
                            color: '#333',
                            maxWidth: '100%'
                          }}
                        />
                      </div>
                    )
                  } else if (viewingEmailLog.metadata?.messageContent || viewingEmailLog.metadata?.message || viewingEmailLog.metadata?.messagePreview) {
                    const textContent =
                      viewingEmailLog.metadata?.messageContent ||
                      viewingEmailLog.metadata?.message ||
                      viewingEmailLog.metadata?.messagePreview
                    return (
                      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="whitespace-pre-wrap">{textContent}</div>
                      </div>
                    )
                  } else if (viewingEmailLog.subject) {
                    return (
                      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
                        <p className="font-semibold mb-2 text-yellow-800">⚠️ Email HTML content not stored in log</p>
                        <p className="text-gray-700"><strong>Subject:</strong> {renderEmailLogSubject(viewingEmailLog)}</p>
                        <p className="mt-2 text-sm text-gray-600">This email was sent but the HTML content was not saved to the log.</p>
                        {viewingEmailLog.metadata && Object.keys(viewingEmailLog.metadata).length > 0 && (
                          <div className="mt-4 text-sm">
                            <p className="font-semibold mb-2">Available Metadata:</p>
                            <pre className="bg-white p-3 rounded text-xs overflow-auto border border-gray-200 mt-2">
                              {JSON.stringify(viewingEmailLog.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    return (
                      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 text-center text-gray-500">
                        <p>No email content available in log</p>
                      </div>
                    )
                  }
                })()}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setViewingEmailLog(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
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

        {/* Match Feedback Reason Modal */}
        {showMatchFeedbackReasonModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowMatchFeedbackReasonModal(false)
              setPendingExcludeFeedbackTarget(null)
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Mark Helper as Unsuitable</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Choose a reason code for this exclusion.</p>
              <input
                type="text"
                value={matchFeedbackReasonInput}
                onChange={(e) => setMatchFeedbackReasonInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="wrong_skill"
              />
              <div className="flex justify-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowMatchFeedbackReasonModal(false)
                    setPendingExcludeFeedbackTarget(null)
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!pendingExcludeFeedbackTarget || !!updatingMatchFeedbackHelperId}
                  onClick={async () => {
                    if (!pendingExcludeFeedbackTarget) return
                    const target = pendingExcludeFeedbackTarget
                    const reason = (matchFeedbackReasonInput || '').trim() || 'not_suitable'
                    setShowMatchFeedbackReasonModal(false)
                    setPendingExcludeFeedbackTarget(null)
                    await submitHelperMatchFeedback(target.taskId, target.helperId, 'exclude', reason, '')
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
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

