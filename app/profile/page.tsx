'use client'

import { useEffect, useState, ChangeEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Review } from '@/lib/types'
import Link from 'next/link'
import { format } from 'date-fns'
import { User as UserIcon } from 'lucide-react'
import { geocodePostcode } from '@/lib/geocoding'
import { isProfileComplete, getMissingFields } from '@/lib/profile-utils'
import { STANDARD_SKILLS, STANDARD_SERVICES } from '@/lib/helper-constants'
import { STANDARD_PROFESSIONS } from '@/lib/profession-constants'
import { PROFESSION_CATEGORIES, ALL_PROFESSIONS } from '@/lib/profession-categories'
import { getPendingReviews } from '@/lib/review-utils'
import { formatPostcodeForCountry } from '@/lib/postcode'
import { useUserRatings, getUserRatingsById } from '@/lib/useUserRatings'
import UserRatingsDisplay from '@/components/UserRatingsDisplay'

// AppUser interface that extends User and includes all properties used in this component
interface AppUser extends User {
  languages?: string[] | null
}

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setupRequired = searchParams.get('setup') === 'required'
  const { users: userRatings } = useUserRatings()
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRatingsSummary, setUserRatingsSummary] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [closestAddress, setClosestAddress] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [isTasker, setIsTasker] = useState(true)
  const [isHelper, setIsHelper] = useState(false)
  const [isProfessional, setIsProfessional] = useState(false)
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [servicesOffered, setServicesOffered] = useState<string[]>([])
  const [professionalOfferings, setProfessionalOfferings] = useState<string[]>([])
  const [qualifications, setQualifications] = useState<string[]>([])
  const [professions, setProfessions] = useState<string[]>([])
  const [badges, setBadges] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [iban, setIban] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [newService, setNewService] = useState('')
  const [newProfessionalOffering, setNewProfessionalOffering] = useState('')
  const [newQualification, setNewQualification] = useState('')
  const [selectedProfessionCategory, setSelectedProfessionCategory] = useState<string>('')
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [earnings, setEarnings] = useState<{
    tasks: Array<{
      id: string
      title: string
      budget: number
      completed_at: string
      payout_status: string | null
      earning: number
    }>
    totalEarnings: number
    paidEarnings: number
    pendingEarnings: number
    totalTasks: number
  }>({ tasks: [], totalEarnings: 0, paidEarnings: 0, pendingEarnings: 0, totalTasks: 0 })
  const [earningsExpanded, setEarningsExpanded] = useState(false)
  
  // Payments state for taskers
  const [payments, setPayments] = useState<{
    tasks: Array<{
      id: string
      title: string
      budget: number
      service_fee: number
      total_paid: number
      completed_at: string
      payment_status: string | null
      helper_name: string | null
    }>
    totalPaid: number
    totalTasks: number
  }>({ tasks: [], totalPaid: 0, totalTasks: 0 })
  const [paymentsExpanded, setPaymentsExpanded] = useState(false)
  
  // Share and QR code state
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [showQrCode, setShowQrCode] = useState(false)
  const [showShareSuccess, setShowShareSuccess] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])
  
  // Generate QR code when profile loads
  useEffect(() => {
    if (profile && profile.profile_slug) {
      const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/user/${profile.profile_slug || profile.id}`
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`)
    }
  }, [profile])

  // Update ratings when userRatings finish loading
  useEffect(() => {
    if (!user || !profile || userRatings.length === 0) return
    
    // Get user ratings from SQL function
    // The SQL function returns 'reviewee_id' as the user identifier
    console.log('📊 Profile: Loading ratings for user:', user.id)
    console.log('📊 Profile: Available ratings:', userRatings.length)
    const ratingsMap = new Map(userRatings.map((r: any) => [r.reviewee_id, r]))
    console.log('📊 Profile: Ratings map keys:', Array.from(ratingsMap.keys()))
    const userRating = getUserRatingsById(user.id, ratingsMap)
    console.log('📊 Profile: Found rating:', userRating)
    setUserRatingsSummary(userRating)
  }, [userRatings, user, profile])

  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        // Preserve setup=required parameter when redirecting to login
        const redirectUrl = setupRequired 
          ? '/login?redirect=/profile?setup=required'
          : '/login?redirect=/profile'
        router.push(redirectUrl)
        return
      }

      setUser(authUser)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) throw error
      setProfile(data)
      setFullName(data?.full_name || '')
      setCompanyName(data?.company_name || '')
      setPostcode(data?.postcode || '')
      setCountry(data?.country || '')
      setPhoneCountryCode(data?.phone_country_code || '')
      setPhoneNumber(data?.phone_number || '')
      setAvatarUrl(data?.avatar_url || null)
      setIsTasker(data?.is_tasker ?? true)
      setIsHelper(data?.is_helper ?? false)
      setBio(data?.bio || '')
      setSkills(data?.skills || [])
      setServicesOffered(data?.services_offered || [])
      setProfessionalOfferings(data?.professional_offerings || [])
      setQualifications(data?.qualifications || [])
      setProfessions(data?.professions || [])
      // Set isProfessional based on whether they have professions
      setIsProfessional((data?.professions?.length || 0) > 0)
      setBadges(data?.badges || [])
      setHourlyRate(data?.hourly_rate?.toString() || '')
      setLanguages(data?.languages ?? [])
      setIban(data?.iban || '')

      // Load reviews for this user
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (reviewsData && reviewsData.length > 0) {
        const reviewerIds = Array.from(new Set(reviewsData.map(r => r.reviewer_id)))
        const { data: reviewerProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', reviewerIds)

        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          reviewer: reviewerProfiles?.find(p => p.id === review.reviewer_id)
        }))

        setReviews(reviewsWithProfiles)
        const avg = reviewsWithProfiles.reduce((sum, r) => sum + r.rating, 0) / reviewsWithProfiles.length
        setAverageRating(avg)
      } else {
        setReviews([])
        setAverageRating(null)
      }

      // Ratings will be loaded in a separate useEffect when userRatings finish loading

      // Check if profile is complete and show modal if needed
      if (data && !isProfileComplete(data)) {
        setShowSetupModal(true)
        // Auto-enable editing if setup is required
        if (setupRequired) {
          setEditing(true)
        }
      }

      // Load pending reviews
      if (authUser) {
        const reviews = await getPendingReviews(authUser.id)
        setPendingReviews(reviews)
      }

      // Load earnings for helpers (completed tasks where user was assigned)
      if (authUser && data?.is_helper) {
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('id, title, budget, updated_at, payout_status')
          .eq('assigned_to', authUser.id)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })

        if (completedTasks && completedTasks.length > 0) {
          // Filter out tasks without budgets and calculate earnings (budget - 10% platform fee)
          const platformFeePercent = 10
          const tasksWithBudgets = completedTasks.filter(task => task.budget != null && task.budget > 0)
          const tasksWithEarnings = tasksWithBudgets.map(task => ({
            id: task.id,
            title: task.title,
            budget: task.budget || 0,
            completed_at: task.updated_at,
            payout_status: task.payout_status,
            earning: (task.budget || 0) * (1 - platformFeePercent / 100)
          }))
          
          // Calculate paid vs pending earnings
          const paidTasks = tasksWithEarnings.filter(t => 
            t.payout_status === 'completed' || t.payout_status === 'simulated'
          )
          const pendingTasks = tasksWithEarnings.filter(t => 
            t.payout_status !== 'completed' && t.payout_status !== 'simulated'
          )
          
          const paidEarnings = paidTasks.reduce((sum, t) => sum + t.earning, 0)
          const pendingEarnings = pendingTasks.reduce((sum, t) => sum + t.earning, 0)
          const totalEarnings = paidEarnings + pendingEarnings
          
          setEarnings({
            tasks: tasksWithEarnings,
            totalEarnings,
            paidEarnings,
            pendingEarnings,
            totalTasks: tasksWithEarnings.length
          })
        }
      }

      // Load payments for taskers (tasks they created and paid for)
      if (authUser && data?.is_tasker) {
        console.log('[Profile] Loading payments for tasker:', authUser.email)
        
        const { data: paidTasks, error: paidTasksError } = await supabase
          .from('tasks')
          .select('id, title, budget, updated_at, payment_status, assigned_to')
          .eq('created_by', authUser.id)
          .eq('payment_status', 'paid')
          .order('updated_at', { ascending: false })

        console.log('[Profile] Paid tasks query result:', { paidTasks, error: paidTasksError })

        if (paidTasks && paidTasks.length > 0) {
          // Get helper names for assigned tasks
          const helperIds = paidTasks.map(t => t.assigned_to).filter(Boolean)
          let helperNames: Record<string, string> = {}
          
          if (helperIds.length > 0) {
            const { data: helpers } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', helperIds)
            
            if (helpers) {
              helperNames = helpers.reduce((acc, h) => {
                acc[h.id] = h.full_name || 'Unknown'
                return acc
              }, {} as Record<string, string>)
            }
          }

          const SERVICE_FEE = 2 // €2 service fee
          const tasksWithPayments = paidTasks
            .filter(task => task.budget != null && task.budget > 0)
            .map(task => ({
              id: task.id,
              title: task.title,
              budget: task.budget || 0,
              service_fee: SERVICE_FEE,
              total_paid: (task.budget || 0) + SERVICE_FEE,
              completed_at: task.updated_at,
              payment_status: task.payment_status,
              helper_name: task.assigned_to ? helperNames[task.assigned_to] || null : null
            }))
          
          const totalPaid = tasksWithPayments.reduce((sum, t) => sum + t.total_paid, 0)
          
          console.log('[Profile] Setting payments:', { totalPaid, count: tasksWithPayments.length })
          
          setPayments({
            tasks: tasksWithPayments,
            totalPaid,
            totalTasks: tasksWithPayments.length
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostcodeChange = async (value: string) => {
    const trimmedCountry = country.trim()
    const formattedValue = formatPostcodeForCountry(value, trimmedCountry)
    setPostcode(formattedValue)
    setGeocodeError(null)
    if (!formattedValue.trim()) {
      setClosestAddress(null)
    }
    
    // Only geocode if postcode is complete (not while typing)
    if (formattedValue.trim() && trimmedCountry) {
      // Check if postcode is complete using the helper function
      const { isPostcodeComplete } = await import('@/lib/geocoding')
      
      if (isPostcodeComplete(formattedValue.trim(), trimmedCountry)) {
        setGeocoding(true)
        try {
          const result = await geocodePostcode(formattedValue.trim(), trimmedCountry)
          if (result) {
            setClosestAddress(result.closest_address || result.display_name || null)
          } else {
            setGeocodeError('Could not find location for this postcode and country')
            setClosestAddress(null)
          }
        } catch (error: any) {
          console.error('Geocoding error:', error)
          setGeocodeError('Error geocoding postcode')
          setClosestAddress(null)
        } finally {
          setGeocoding(false)
        }
      }
      // If postcode is incomplete, don't show error yet - user is still typing
    } else if (formattedValue.trim() && !trimmedCountry) {
      setGeocodeError('Please select a country first')
      setClosestAddress(null)
    }
  }

  const handleCountryChange = async (value: string) => {
    const trimmedValue = value.trim()
    setCountry(value)
    setGeocodeError(null)
    setClosestAddress(null)
    
    if (postcode) {
      const formatted = formatPostcodeForCountry(postcode, trimmedValue)
      if (formatted !== postcode) {
        setPostcode(formatted)
      }
    }
    
    // Re-geocode postcode if it's already entered
    const formattedPostcode = formatPostcodeForCountry(postcode.trim(), trimmedValue)
    if (formattedPostcode.trim().length >= 4 && trimmedValue) {
      setGeocoding(true)
      try {
        const result = await geocodePostcode(formattedPostcode.trim(), trimmedValue)
        if (result) {
          setClosestAddress(result.closest_address || result.display_name || null)
        } else {
          setGeocodeError('Could not find location for this postcode and country')
          setClosestAddress(null)
        }
      } catch (error: any) {
        console.error('Geocoding error:', error)
        setGeocodeError('Error geocoding postcode')
        setClosestAddress(null)
      } finally {
        setGeocoding(false)
      }
    }
  }

  // Auto-save role changes immediately
  const handleRoleChange = async (role: 'tasker' | 'helper', value: boolean) => {
    if (!user) return

    // Validate at least one role is enabled
    if (role === 'tasker' && !value && !isHelper) {
      setErrorMessage('You must enable at least one role (Tasker or Helper)')
      return
    }
    if (role === 'helper' && !value && !isTasker) {
      setErrorMessage('You must enable at least one role (Tasker or Helper)')
      return
    }

    try {
      setErrorMessage(null)
      const updateData: any = {
        is_tasker: role === 'tasker' ? value : isTasker,
        is_helper: role === 'helper' ? value : isHelper,
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.error('Error updating role:', error)
        setErrorMessage('Failed to update role. Please try again.')
        // Revert the state change on error
        if (role === 'tasker') {
          setIsTasker(!value)
        } else {
          setIsHelper(!value)
        }
        return
      }

      // Update local state
      if (role === 'tasker') {
        setIsTasker(value)
      } else {
        setIsHelper(value)
      }

      // Update profile state
      if (profile) {
        setProfile({
          ...profile,
          is_tasker: updateData.is_tasker,
          is_helper: updateData.is_helper,
        })
      }

      // Show success message briefly
      setStatusMessage(`${role === 'tasker' ? 'Tasker' : 'Helper'} role ${value ? 'enabled' : 'disabled'} successfully.`)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err: any) {
      console.error('Error updating role:', err)
      setErrorMessage('Failed to update role. Please try again.')
      // Revert the state change on error
      if (role === 'tasker') {
        setIsTasker(!value)
      } else {
        setIsHelper(!value)
      }
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return

    // Validate required fields
    if (!fullName.trim()) {
      setErrorMessage('Full name is required')
      return
    }

    try {
      setErrorMessage(null)
      setStatusMessage(null)

      // Validate required fields
      if (!country.trim()) {
        setErrorMessage('Country is required')
        return
      }
      if (!phoneCountryCode.trim() || !phoneNumber.trim()) {
        setErrorMessage('Phone number with country code is required')
        return
      }
      // Validate at least one role is enabled
      if (!isTasker && !isHelper) {
        setErrorMessage('You must enable at least one role (Tasker or Helper)')
        return
      }

      // Validate postcode is required
      if (!postcode.trim()) {
        setErrorMessage('Postcode is required')
        return
      }

      // Validate languages (I speak) is required
      if (!languages || languages.length === 0) {
        setErrorMessage('Please select at least one language you speak')
        return
      }

      // Validate bio is required and at least 50 characters
      const trimmedBio = bio.trim()
      if (!trimmedBio) {
        setErrorMessage('Bio is required')
        return
      }
      if (trimmedBio.length < 50) {
        setErrorMessage('Bio must be at least 50 characters long')
        return
      }

      const trimmedCountryValue = country.trim()
      const sanitizedPostcode = formatPostcodeForCountry(postcode.trim(), trimmedCountryValue)
      const normalizedPostcode = sanitizedPostcode.trim()

      // Geocode postcode if provided - ALWAYS re-geocode to ensure accuracy
      let latitude = null
      let longitude = null
      if (normalizedPostcode.length >= 4 && trimmedCountryValue) {
        const result = await geocodePostcode(normalizedPostcode, trimmedCountryValue)
        if (result) {
          latitude = result.latitude
          longitude = result.longitude
          console.log(`✅ Profile geocoded "${normalizedPostcode}" to:`, {
            lat: latitude,
            lng: longitude,
            display_name: result.display_name
          })
        } else {
          console.error(`❌ Failed to geocode postcode "${normalizedPostcode}"`)
        }
      }

      // Generate or update profile slug for ALL users (helpers and taskers)
      let profileSlug = profile?.profile_slug
      
      // Check if name has changed (need to regenerate slug)
      const nameChanged = profile?.full_name?.trim() !== fullName.trim()
      
      // Generate slug for all users if they have a name
      if (fullName.trim()) {
        // Generate slug from full name
        const baseSlug = fullName.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
        
        if (baseSlug) {
          // If slug doesn't exist or name has changed, regenerate it
          if (!profileSlug || nameChanged) {
            // Check if slug exists, if so append number
            let slug = baseSlug
            let counter = 0
            while (true) {
              const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('profile_slug', slug)
                .neq('id', user.id)
                .maybeSingle()
              
              if (!existing) break
              counter++
              slug = `${baseSlug}-${counter}`
            }
            profileSlug = slug
          }
        }
      }
      // Note: We generate slugs for ALL users (helpers and taskers) so profiles are shareable

      // Parse hourly rate safely
      let hourlyRateValue = null
      if (hourlyRate && hourlyRate.trim()) {
        const parsed = parseFloat(hourlyRate.trim())
        if (!isNaN(parsed) && parsed >= 0) {
          hourlyRateValue = parsed
        }
      }

      const updateData: any = { 
        full_name: fullName.trim(),
        company_name: companyName.trim() || null,
        postcode: normalizedPostcode || null,
        country: trimmedCountryValue || null,
        phone_country_code: phoneCountryCode.trim() || null,
        phone_number: phoneNumber.trim() || null,
        latitude: latitude,
        longitude: longitude,
        is_tasker: isTasker,
        is_helper: isHelper,
        bio: bio.trim() || null,
        // If user is professional, clear skills and services; otherwise clear professions and professional offerings
        skills: isProfessional ? [] : (skills.length > 0 ? skills : []),
        services_offered: isProfessional ? [] : (servicesOffered.length > 0 ? servicesOffered : []),
    professional_offerings: professionalOfferings.length > 0 ? professionalOfferings : [],
        badges: badges.length > 0 ? badges : [],
        hourly_rate: hourlyRateValue,
        profile_slug: profileSlug || null,
        languages: languages.length > 0 ? languages : [],
        iban: iban.trim() || null,
      }

      // Only include qualifications and professions if they exist in the schema
      // These fields may not exist if migrations haven't been run yet
      try {
        // Try to update with all fields first
        updateData.qualifications = qualifications.length > 0 ? qualifications : []
        // Only include professions and professional offerings if user is professional
        updateData.professions = isProfessional ? (professions.length > 0 ? professions : []) : []
        updateData.professional_offerings = isProfessional ? (professionalOfferings.length > 0 ? professionalOfferings : []) : []
      } catch (e) {
        // If fields don't exist, they'll be excluded below
      }

      // Remove null/undefined values for arrays to avoid issues
      if (updateData.skills.length === 0) updateData.skills = []
      if (updateData.services_offered.length === 0) updateData.services_offered = []
  if (updateData.professional_offerings.length === 0) updateData.professional_offerings = []
      if (updateData.badges.length === 0) updateData.badges = []

      let { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      // If error is about missing columns, retry without them
      if (error && (error.message?.includes('qualifications') || error.message?.includes('professions'))) {
        console.warn('Some columns may not exist, retrying without qualifications/professions:', error.message)
        delete updateData.qualifications
        delete updateData.professions
        
        const { error: retryError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id)
        
        if (retryError) {
          console.error('Profile update error:', retryError)
          throw retryError
        }
      } else if (error) {
        console.error('Profile update error:', error)
        throw error
      }

      // Reload profile to get updated data
      const { data: updatedData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (updatedData) {
        setProfile(updatedData)
        setFullName(updatedData.full_name || '')
        setCompanyName(updatedData.company_name || '')
        setPostcode(updatedData.postcode || '')
        setCountry(updatedData.country || '')
        setPhoneCountryCode(updatedData.phone_country_code || '')
        setPhoneNumber(updatedData.phone_number || '')
        setAvatarUrl(updatedData.avatar_url || null)
        setIsTasker(updatedData.is_tasker ?? true)
        setIsHelper(updatedData.is_helper ?? false)
        setBio(updatedData.bio || '')
        setSkills(updatedData.skills || [])
        setServicesOffered(updatedData.services_offered || [])
        setProfessionalOfferings(updatedData.professional_offerings || [])
        setQualifications(updatedData.qualifications || [])
        setProfessions(updatedData.professions || [])
        setBadges(updatedData.badges || [])
        setHourlyRate(updatedData.hourly_rate?.toString() || '')
        setIban(updatedData.iban || '')

          setEditing(false)
          setStatusMessage('Profile updated successfully.')
          setShowSuccessModal(true)

          // Check if profile is now complete and close modal
          if (isProfileComplete(updatedData)) {
            setShowSetupModal(false)
            // If they came from setup flow, redirect to tasks after a short delay
            if (setupRequired) {
              setTimeout(() => {
                router.push('/tasks')
                router.refresh()
              }, 1500)
            }
          } else {
            // Profile still incomplete - show modal again if setup is required
            if (setupRequired) {
              setShowSetupModal(true)
            }
          }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error updating profile')
    }
  }

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setAvatarUploading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      // Verify user is authenticated
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error('You must be logged in to upload an avatar')
      }

      console.log('Uploading avatar for user:', authUser.id)
      console.log('File path will be:', `${authUser.id}/${Date.now()}.${file.name.split('.').pop()}`)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${authUser.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev))
      setStatusMessage('Avatar updated successfully.')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      setErrorMessage(error.message || 'Error uploading avatar')
    } finally {
      setAvatarUploading(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user) return

    setAvatarUploading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (error) throw error

      setAvatarUrl(null)
      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev))
      setStatusMessage('Avatar removed.')
    } catch (error: any) {
      console.error('Error removing avatar:', error)
      setErrorMessage(error.message || 'Error removing avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading profile...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const missingFields = getMissingFields(profile)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Setup Required Modal - Cannot be dismissed if setup is required */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
              {!setupRequired && (
                <button
                  onClick={() => setShowSetupModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                {setupRequired 
                  ? "To use the system, you must complete your profile with the following required information:"
                  : "Your profile is missing some required information. Please complete the following fields:"}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              {setupRequired && (
                <p className="text-sm text-gray-500 italic">
                  You cannot access other parts of the system until your profile is complete.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (!setupRequired) {
                    setShowSetupModal(false)
                  } else {
                    // Close modal and enable editing so user can fill in the form
                    setShowSetupModal(false)
                    setEditing(true)
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {setupRequired ? 'Complete Profile' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        {profile && profile.profile_slug && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!profile) return
                const profileUrl = `${window.location.origin}/user/${profile.profile_slug || profile.id}`
                navigator.clipboard.writeText(profileUrl)
                setShowShareSuccess(true)
                setTimeout(() => setShowShareSuccess(false), 3000)
              }}
              className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {showShareSuccess ? 'Copied!' : 'Share'}
            </button>
            {qrCodeUrl && (
              <button
                onClick={() => setShowQrCode(!showQrCode)}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR Code
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* QR Code Modal */}
      {showQrCode && qrCodeUrl && profile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6" onClick={() => setShowQrCode(false)}>
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Scan QR Code</h3>
            <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4" />
            <p className="text-sm text-gray-600 text-center mb-4">Share this profile with others</p>
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500 mb-1">Profile Link:</p>
              <p className="text-sm text-gray-900 break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/user/{profile.profile_slug || profile.id}
              </p>
            </div>
            <button
              onClick={() => setShowQrCode(false)}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Pending Reviews Reminder */}
      {pendingReviews.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
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
                {pendingReviews.slice(0, 2).map((review) => (
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
                {pendingReviews.length > 2 && (
                  <Link
                    href="/tasks?filter=my_tasks&pending_reviews=true"
                    className="block text-center text-sm text-amber-700 hover:text-amber-800 font-medium pt-2"
                  >
                    View all {pendingReviews.length} pending reviews →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        {(statusMessage || errorMessage) && (
          <div className="mb-4">
            {statusMessage && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-green-700">
                {statusMessage}
              </div>
            )}
            {errorMessage && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-6">
              <div 
                className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 aspect-square rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 min-w-[64px] min-h-[64px]"
                style={{ aspectRatio: '1 / 1' }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${profile.full_name || user.email}'s avatar`}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Profile Photo</p>
                {!avatarUrl && (
                  <p className="text-sm text-gray-500 mb-3">
                    Upload a square image (recommended 256x256). Supported formats: JPG, PNG.
                  </p>
                )}
                <div className="flex items-center space-x-3">
                  <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={avatarUploading}
                    />
                    {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      type="button"
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={avatarUploading}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              {editing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your full name"
                />
              ) : (
                <input
                  type="text"
                  value={profile.full_name || 'Not set'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name (Optional)
              </label>
              {editing ? (
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter company name (optional)"
                />
              ) : (
                <input
                  type="text"
                  value={profile.company_name || 'Not set'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              {editing ? (
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a country</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Spain">Spain</option>
                  <option value="France">France</option>
                  <option value="Germany">Germany</option>
                  <option value="Italy">Italy</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="Belgium">Belgium</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Austria">Austria</option>
                  <option value="Poland">Poland</option>
                  <option value="Czech Republic">Czech Republic</option>
                  <option value="Sweden">Sweden</option>
                  <option value="Norway">Norway</option>
                  <option value="Denmark">Denmark</option>
                  <option value="Finland">Finland</option>
                  <option value="Greece">Greece</option>
                  <option value="Romania">Romania</option>
                  <option value="Hungary">Hungary</option>
                  <option value="Australia">Australia</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Mexico">Mexico</option>
                  <option value="South Africa">South Africa</option>
                  <option value="India">India</option>
                  <option value="China">China</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Israel">Israel</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Egypt">Egypt</option>
                  <option value="Morocco">Morocco</option>
                  <option value="Tunisia">Tunisia</option>
                  <option value="Algeria">Algeria</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={profile.country || 'Not set'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postcode (for distance calculations)
              </label>
              {editing ? (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => handlePostcodeChange(e.target.value)}
                      placeholder="e.g., 1000"
                      disabled={!country.trim()}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    />
                    {geocoding && (
                      <span className="flex items-center text-sm text-gray-500">Geocoding...</span>
                    )}
                  </div>
                  {!country.trim() && (
                    <p className="mt-1 text-sm text-amber-600">Please select a country first</p>
                  )}
                  {geocodeError && (
                    <p className="mt-1 text-sm text-red-600">{geocodeError}</p>
                  )}
                  {!geocodeError && closestAddress && !geocoding && (
                    <p className="mt-1 text-sm text-green-600">
                      ✓ Postcode recognized — {closestAddress}
                    </p>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={profile.postcode || 'Not set'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              {editing ? (
                <div className="flex gap-2">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    required
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Code</option>
                    <option value="+351">+351 (PT)</option>
                    <option value="+34">+34 (ES)</option>
                    <option value="+33">+33 (FR)</option>
                    <option value="+49">+49 (DE)</option>
                    <option value="+39">+39 (IT)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+353">+353 (IE)</option>
                    <option value="+31">+31 (NL)</option>
                    <option value="+32">+32 (BE)</option>
                    <option value="+41">+41 (CH)</option>
                    <option value="+43">+43 (AT)</option>
                    <option value="+48">+48 (PL)</option>
                    <option value="+420">+420 (CZ)</option>
                    <option value="+46">+46 (SE)</option>
                    <option value="+47">+47 (NO)</option>
                    <option value="+45">+45 (DK)</option>
                    <option value="+358">+358 (FI)</option>
                    <option value="+30">+30 (GR)</option>
                    <option value="+40">+40 (RO)</option>
                    <option value="+36">+36 (HU)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+64">+64 (NZ)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+55">+55 (BR)</option>
                    <option value="+54">+54 (AR)</option>
                    <option value="+52">+52 (MX)</option>
                    <option value="+27">+27 (ZA)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+86">+86 (CN)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+82">+82 (KR)</option>
                    <option value="+65">+65 (SG)</option>
                    <option value="+66">+66 (TH)</option>
                    <option value="+63">+63 (PH)</option>
                    <option value="+62">+62 (ID)</option>
                    <option value="+60">+60 (MY)</option>
                    <option value="+84">+84 (VN)</option>
                    <option value="+971">+971 (AE)</option>
                    <option value="+966">+966 (SA)</option>
                    <option value="+972">+972 (IL)</option>
                    <option value="+90">+90 (TR)</option>
                    <option value="+20">+20 (EG)</option>
                    <option value="+212">+212 (MA)</option>
                    <option value="+216">+216 (TN)</option>
                    <option value="+213">+213 (DZ)</option>
                    <option value="+234">+234 (NG)</option>
                    <option value="+254">+254 (KE)</option>
                    <option value="+233">+233 (GH)</option>
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="Phone number"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={profile.phone_country_code && profile.phone_number 
                    ? `${profile.phone_country_code} ${profile.phone_number}` 
                    : 'Not set'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              )}
            </div>

            {/* Languages Spoken */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I speak basic: <span className="text-red-500">*</span>
              </label>
              {editing ? (
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={languages.includes('English')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLanguages([...languages.filter(l => l !== 'English'), 'English'])
                        } else {
                          setLanguages(languages.filter(l => l !== 'English'))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">English</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={languages.includes('Portuguese')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLanguages([...languages.filter(l => l !== 'Portuguese'), 'Portuguese'])
                        } else {
                          setLanguages(languages.filter(l => l !== 'Portuguese'))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Portuguese</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={languages.includes('German')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLanguages([...languages.filter(l => l !== 'German'), 'German'])
                        } else {
                          setLanguages(languages.filter(l => l !== 'German'))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">German</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={languages.includes('French')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLanguages([...languages.filter(l => l !== 'French'), 'French'])
                        } else {
                          setLanguages(languages.filter(l => l !== 'French'))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">French</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={languages.includes('Italian')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLanguages([...languages.filter(l => l !== 'Italian'), 'Italian'])
                        } else {
                          setLanguages(languages.filter(l => l !== 'Italian'))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Italian</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={languages.includes('Greek')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLanguages([...languages.filter(l => l !== 'Greek'), 'Greek'])
                        } else {
                          setLanguages(languages.filter(l => l !== 'Greek'))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Greek</span>
                  </label>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {languages.length > 0 ? (
                    languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {lang}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="text-gray-500 text-sm">Not set</span>
                      {!editing && (
                        <span className="text-xs text-gray-400 italic">
                          (Click "Edit" above to select languages)
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bio - Always visible for all users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio / About Me <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">(minimum 50 characters)</span>
              </label>
              {editing ? (
                <div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    required
                    minLength={50}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Tell others about yourself, your experience, and what makes you unique..."
                  />
                  <p className={`mt-1 text-xs ${bio.trim().length < 50 ? 'text-red-600' : 'text-gray-500'}`}>
                    {bio.trim().length}/50 characters {bio.trim().length < 50 && `(${50 - bio.trim().length} more required)`}
                  </p>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-line">
                  {profile.bio || 'No bio added yet'}
                </p>
              )}
            </div>

            {/* IBAN for Payouts */}
            {isHelper && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN (for receiving payouts)
                </label>
                {editing ? (
                  <div>
                    <input
                      type="text"
                      value={iban}
                      onChange={(e) => {
                        // Remove spaces and convert to uppercase as user types
                        const cleaned = e.target.value.replace(/\s/g, '').toUpperCase()
                        setIban(cleaned)
                      }}
                      placeholder="e.g., PT50001234567890123456789"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Your IBAN is required to receive payouts when tasks are completed. Format: 2 letters + 2 digits + up to 30 alphanumeric characters.
                    </p>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={profile.iban || 'Not set'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                )}
              </div>
            )}

            {/* Payments Section - For Taskers */}
            {isTasker && payments.totalTasks > 0 && (
              <div className="border-t pt-6 mt-6">
                {/* Clickable Header */}
                <button 
                  onClick={() => setPaymentsExpanded(!paymentsExpanded)}
                  className="w-full flex items-center justify-between text-left mb-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-blue-700">€{payments.totalPaid.toFixed(2)}</span>
                    <span className="text-sm text-gray-500">({payments.totalTasks} tasks)</span>
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform ${paymentsExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expandable Content */}
                {paymentsExpanded && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-blue-700 font-medium">Total Paid</p>
                        <p className="text-2xl font-bold text-blue-800">€{payments.totalPaid.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-700 font-medium">Tasks Paid</p>
                        <p className="text-2xl font-bold text-gray-800">{payments.totalTasks}</p>
                      </div>
                    </div>

                    {/* Payments Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Helper</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Fee</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {payments.tasks.map((task: any) => (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <a 
                                  href={`/tasks/${task.id}`}
                                  className="text-sm font-medium text-primary-600 hover:underline truncate block max-w-[180px]"
                                >
                                  {task.title}
                                </a>
                                <p className="text-xs text-gray-500">
                                  {new Date(task.completed_at).toLocaleDateString()}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {task.helper_name || '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">
                                €{(task.budget || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-500">
                                €{task.service_fee.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                                €{task.total_paid.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                          <tr>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900" colSpan={2}>Total</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              €{payments.tasks.reduce((sum: number, t: any) => sum + (t.budget || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-500">
                              €{(payments.totalTasks * 2).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">
                              €{payments.totalPaid.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Earnings Section - Only for Helpers */}
            {isHelper && earnings.totalTasks > 0 && (
              <div className="border-t pt-6 mt-6">
                {/* Clickable Header */}
                <button 
                  onClick={() => setEarningsExpanded(!earningsExpanded)}
                  className="w-full flex items-center justify-between text-left mb-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Earnings</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-700">€{earnings.paidEarnings.toFixed(2)}</span>
                    {earnings.pendingEarnings > 0 && (
                      <span className="text-sm text-amber-600">(+€{earnings.pendingEarnings.toFixed(2)} pending)</span>
                    )}
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform ${earningsExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expandable Content */}
                {earningsExpanded && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-green-700 font-medium">Paid</p>
                        <p className="text-2xl font-bold text-green-800">€{earnings.paidEarnings.toFixed(2)}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-amber-700 font-medium">Pending</p>
                        <p className="text-2xl font-bold text-amber-800">€{earnings.pendingEarnings.toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-blue-700 font-medium">Tasks</p>
                        <p className="text-2xl font-bold text-blue-800">{earnings.totalTasks}</p>
                      </div>
                    </div>

                    {/* Earnings Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Budget</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Earned</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {earnings.tasks.map((task: any) => (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <a 
                                  href={`/tasks/${task.id}`}
                                  className="text-sm font-medium text-primary-600 hover:underline truncate block max-w-[200px]"
                                >
                                  {task.title}
                                </a>
                                <p className="text-xs text-gray-500">
                                  {new Date(task.completed_at).toLocaleDateString()}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">
                                €{(task.budget || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                                €{(task.earning || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                  task.payout_status === 'completed' || task.payout_status === 'simulated'
                                    ? 'bg-green-100 text-green-800'
                                    : task.payout_status === 'processing'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : task.payout_status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {task.payout_status === 'completed' || task.payout_status === 'simulated' 
                                    ? 'Paid' 
                                    : task.payout_status === 'processing'
                                    ? 'Processing'
                                    : task.payout_status === 'failed'
                                    ? 'Failed'
                                    : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                          <tr>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              €{earnings.tasks.reduce((sum: number, t: any) => sum + (t.budget || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              <span className="font-bold text-green-700">€{earnings.paidEarnings.toFixed(2)}</span>
                              {earnings.pendingEarnings > 0 && (
                                <span className="text-amber-600 ml-1">(+€{earnings.pendingEarnings.toFixed(2)})</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-500">
                              (10% fee)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* No Earnings Yet - for helpers with no completed tasks */}
            {isHelper && earnings.totalTasks === 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Earnings</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-2">No earnings yet</p>
                  <p className="text-sm text-gray-500">Complete tasks to start earning!</p>
                  <a 
                    href="/tasks" 
                    className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Browse Tasks
                  </a>
                </div>
              </div>
            )}

            {/* Role Settings */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Roles</h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose how you want to use Taskorilla. You can enable both roles to post tasks and bid on tasks.
              </p>
              
              <div className="space-y-4">
                {/* Tasker Role */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-base font-medium text-gray-900">Tasker</h4>
                      {isTasker && (
                        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Post tasks and hire helpers to complete them
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTasker}
                      onChange={(e) => {
                        const newValue = e.target.checked
                        setIsTasker(newValue) // Update UI immediately for better UX
                        handleRoleChange('tasker', newValue) // Auto-save to database
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Helper Role */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-base font-medium text-gray-900">Helper</h4>
                      {isHelper && (
                        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Browse tasks and submit bids to earn money
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHelper}
                      onChange={(e) => {
                        const newValue = e.target.checked
                        setIsHelper(newValue) // Update UI immediately for better UX
                        handleRoleChange('helper', newValue) // Auto-save to database
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {!isTasker && !isHelper && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      ⚠️ You must enable at least one role. Enable Tasker to post tasks or Helper to bid on tasks.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Helper Profile Settings */}
            {isHelper && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Helper Profile</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Customize your helper profile to showcase your skills and attract taskers.
                </p>

                {/* Professional Toggle */}
                {editing && (
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isProfessional}
                        onChange={(e) => {
                          const newValue = e.target.checked
                          setIsProfessional(newValue)
                          // If unchecking professional, clear professions and professional offerings
                          if (!newValue) {
                            setProfessions([])
                            setProfessionalOfferings([])
                            setSelectedProfessionCategory('')
                          }
                          // If checking professional, clear skills and services
                          if (newValue) {
                            setSkills([])
                            setServicesOffered([])
                          }
                        }}
                        className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-base font-semibold text-gray-900">I am a Professional</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Check this if you provide professional services. You'll manage Professions and Professional Offerings instead of Skills and Services.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="space-y-4">

                  {/* Hourly Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate (€)
                    </label>
                    {editing ? (
                      <>
                        <input
                          type="number"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., 25.00"
                        />
                        {(editing ? isProfessional : (profile.professions?.length || 0) > 0) && (
                          <p className="mt-1 text-xs text-gray-500">
                            If no amount is entered, visitors will see "Ask About Fees" on your profile.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-700">
                        {profile.hourly_rate ? `€${profile.hourly_rate}/hr` : 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Skills - Only show if user is not a professional */}
                  {isHelper && !(editing ? isProfessional : (profile.professions?.length || 0) > 0) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Skills
                    </label>
                    {editing ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {skills.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                                className="text-primary-600 hover:text-primary-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="space-y-2">
                          {/* Standard Skills Dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              const selectedSkill = e.target.value
                              if (selectedSkill && !skills.includes(selectedSkill)) {
                                setSkills([...skills, selectedSkill])
                                e.target.value = ''
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            <option value="">Select a standard skill...</option>
                            {STANDARD_SKILLS
                              .filter(skill => !skills.includes(skill))
                              .map((skill) => (
                                <option key={skill} value={skill}>
                                  {skill}
                                </option>
                              ))}
                          </select>
                          {/* Custom Skill Input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (newSkill.trim() && !skills.includes(newSkill.trim())) {
                                    setSkills([...skills, newSkill.trim()])
                                    setNewSkill('')
                                  }
                                }
                              }}
                              placeholder="Or add a custom skill and press Enter"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newSkill.trim() && !skills.includes(newSkill.trim())) {
                                  setSkills([...skills, newSkill.trim()])
                                  setNewSkill('')
                                }
                              }}
                              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.skills && profile.skills.length > 0 ? (
                          profile.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">No skills added</span>
                        )}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Services Offered - Only show if user is not a professional */}
                  {isHelper && !(editing ? isProfessional : (profile.professions?.length || 0) > 0) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Services Offered
                    </label>
                    {editing ? (
                      <div className="space-y-2">
                        <ul className="list-disc list-inside space-y-1 mb-2">
                          {servicesOffered.map((service, index) => (
                            <li key={index} className="flex items-center justify-between text-gray-700">
                              <span>{service}</span>
                              <button
                                type="button"
                                onClick={() => setServicesOffered(servicesOffered.filter((_, i) => i !== index))}
                                className="text-red-600 hover:text-red-800 ml-2"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="space-y-2">
                          {/* Standard Services Dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              const selectedService = e.target.value
                              if (selectedService && !servicesOffered.includes(selectedService)) {
                                setServicesOffered([...servicesOffered, selectedService])
                                e.target.value = ''
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            <option value="">Select a standard service...</option>
                            {STANDARD_SERVICES
                              .filter(service => !servicesOffered.includes(service))
                              .map((service) => (
                                <option key={service} value={service}>
                                  {service}
                                </option>
                              ))}
                          </select>
                          {/* Custom Service Input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newService}
                              onChange={(e) => setNewService(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (newService.trim() && !servicesOffered.includes(newService.trim())) {
                                    setServicesOffered([...servicesOffered, newService.trim()])
                                    setNewService('')
                                  }
                                }
                              }}
                              placeholder="Or add a custom service and press Enter"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newService.trim() && !servicesOffered.includes(newService.trim())) {
                                  setServicesOffered([...servicesOffered, newService.trim()])
                                  setNewService('')
                                }
                              }}
                              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {profile.services_offered && profile.services_offered.length > 0 ? (
                          profile.services_offered.map((service, index) => (
                            <li key={index}>{service}</li>
                          ))
                        ) : (
                          <li className="text-gray-500">No services listed</li>
                        )}
                      </ul>
                )}
              </div>
              )}

              {/* Professional Offerings (Professionals only) */}
              {isHelper && (editing ? isProfessional : (profile.professions?.length || 0) > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Offerings
                  </label>
                  {editing ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        List the professional services you provide (e.g., Therapy Sessions, Podcast Production, CFO Advisory).
                      </p>
                      <ul className="list-disc list-inside space-y-1 mb-2">
                        {professionalOfferings.map((offering, index) => (
                          <li key={index} className="flex items-center justify-between text-gray-700">
                            <span>{offering}</span>
                            <button
                              type="button"
                              onClick={() => setProfessionalOfferings(professionalOfferings.filter((_, i) => i !== index))}
                              className="text-red-600 hover:text-red-800 ml-2"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProfessionalOffering}
                          onChange={(e) => setNewProfessionalOffering(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (newProfessionalOffering.trim() && !professionalOfferings.includes(newProfessionalOffering.trim())) {
                                setProfessionalOfferings([...professionalOfferings, newProfessionalOffering.trim()])
                                setNewProfessionalOffering('')
                              }
                            }
                          }}
                          placeholder="e.g., Therapy Sessions"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newProfessionalOffering.trim() && !professionalOfferings.includes(newProfessionalOffering.trim())) {
                              setProfessionalOfferings([...professionalOfferings, newProfessionalOffering.trim()])
                              setNewProfessionalOffering('')
                            }
                          }}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {profile.professional_offerings && profile.professional_offerings.length > 0 ? (
                        profile.professional_offerings.map((offering, index) => (
                          <li key={index}>{offering}</li>
                        ))
                      ) : (
                        <li className="text-gray-500">No professional offerings listed</li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              {/* Professions */}
                  {isHelper && (editing ? isProfessional : (profile.professions?.length || 0) > 0) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Professions *
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Select your professional roles. If you select any profession, Skills and Services will be hidden.
                      </p>
                      {editing ? (
                        <div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {professions.map((profession, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                              >
                                {profession}
                                <button
                                  type="button"
                                  onClick={() => setProfessions(professions.filter((_, i) => i !== index))}
                                  className="text-purple-600 hover:text-purple-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          {/* Category-based profession selection */}
                          <div className="space-y-4">
                            {/* First, select a category */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Profession Category
                              </label>
                              <select
                                value={selectedProfessionCategory}
                                onChange={(e) => {
                                  setSelectedProfessionCategory(e.target.value)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white"
                              >
                                <option value="">Choose a category...</option>
                                {PROFESSION_CATEGORIES.map((category) => (
                                  <option key={category.name} value={category.name}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Then, show professions for the selected category */}
                            {selectedProfessionCategory && (
                              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-800">
                                    {PROFESSION_CATEGORIES.find(c => c.name === selectedProfessionCategory)?.name}
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProfessionCategory('')}
                                    className="text-sm text-gray-600 hover:text-gray-800"
                                  >
                                    Change Category
                                  </button>
                                </div>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const selectedProfession = e.target.value
                                    if (selectedProfession && !professions.includes(selectedProfession)) {
                                      setProfessions([...professions, selectedProfession])
                                      e.target.value = ''
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white"
                                >
                                  <option value="">Select a profession...</option>
                                  {PROFESSION_CATEGORIES
                                    .find(c => c.name === selectedProfessionCategory)
                                    ?.subs
                                    .filter(profession => !professions.includes(profession))
                                    .map((profession) => (
                                      <option key={profession} value={profession}>
                                        {profession}
                                      </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                  You can select multiple professions. After selecting one, choose another category or select more from this category.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {profile.professions && profile.professions.length > 0 ? (
                            profile.professions.map((profession, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                              >
                                {profession}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">No professions listed</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Qualifications */}
                  {isHelper && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qualifications & Certifications
                      </label>
                      {editing ? (
                        <div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {qualifications.map((qualification, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                              >
                                {qualification}
                                <button
                                  type="button"
                                  onClick={() => setQualifications(qualifications.filter((_, i) => i !== index))}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newQualification}
                              onChange={(e) => setNewQualification(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (newQualification.trim() && !qualifications.includes(newQualification.trim())) {
                                    setQualifications([...qualifications, newQualification.trim()])
                                    setNewQualification('')
                                  }
                                }
                              }}
                              placeholder="e.g., Carpentry Certification, Plumbing License"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newQualification.trim() && !qualifications.includes(newQualification.trim())) {
                                  setQualifications([...qualifications, newQualification.trim()])
                                  setNewQualification('')
                                }
                              }}
                              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {profile.qualifications && profile.qualifications.length > 0 ? (
                            profile.qualifications.map((qualification, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                                <span className="text-gray-900 text-sm">{qualification}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No qualifications listed</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profile Link */}
                  {profile.profile_slug && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Helper Profile Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/user/${profile.profile_slug}`}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/user/${profile.profile_slug}`
                            navigator.clipboard.writeText(url)
                            setStatusMessage('Profile link copied to clipboard!')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {editing && (
              <div className="flex space-x-3 pt-4 border-t mt-6">
                <button
                  onClick={handleUpdateProfile}
                  disabled={!isTasker && !isHelper}
                  className="bg-primary-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setFullName(profile.full_name || '')
                    setCompanyName(profile.company_name || '')
                    setPostcode(profile.postcode || '')
                    setCountry(profile.country || '')
                    setPhoneCountryCode(profile.phone_country_code || '')
                    setPhoneNumber(profile.phone_number || '')
                    setIsTasker(profile.is_tasker ?? true)
                    setIsHelper(profile.is_helper ?? false)
                    setBio(profile.bio || '')
                    setSkills(profile.skills || [])
                    setServicesOffered(profile.services_offered || [])
                    setProfessionalOfferings(profile.professional_offerings || [])
                    setQualifications(profile.qualifications || [])
                    setProfessions(profile.professions || [])
                    setIsProfessional((profile.professions?.length || 0) > 0)
                    setSelectedProfessionCategory('')
                    setBadges(profile.badges || [])
                    setHourlyRate(profile.hourly_rate?.toString() || '')
                    setLanguages(profile.languages ?? [])
                    setIban(profile.iban || '')
                    setNewSkill('')
                    setNewService('')
                    setNewProfessionalOffering('')
                    setNewQualification('')
                    setGeocodeError(null)
                    setEditing(false)
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Created</h2>
          <p className="text-gray-600">
            {new Date(profile.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ratings</h2>
          {userRatingsSummary ? (
            <UserRatingsDisplay 
              ratings={userRatingsSummary} 
              size="md"
              showLabels={false}
            />
          ) : (
            <div className="text-sm text-gray-500">Loading ratings...</div>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Reviews</h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {review.reviewer?.avatar_url ? (
                        <img
                          src={review.reviewer.avatar_url}
                          alt={review.reviewer.full_name || review.reviewer.email}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {review.reviewer?.full_name || review.reviewer?.email || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-amber-600 font-semibold text-xs sm:text-sm">
                      {'★'.repeat(review.rating)}
                      <span className="text-gray-300">
                        {'★'.repeat(5 - review.rating)}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 text-sm mt-2">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 mx-4">
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
              Profile Updated Successfully!
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 text-center mb-6">
              Your profile has been saved and updated. Your changes are now live.
            </p>

            {/* Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ProfilePageContent />
    </Suspense>
  )
}


