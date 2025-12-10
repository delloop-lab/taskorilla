'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StandardModal from '@/components/StandardModal'
import { Category, Tag, User } from '@/lib/types'
import { geocodePostcode } from '@/lib/geocoding'
import { formatPostcodeForCountry, isPortuguesePostcode } from '@/lib/postcode'
import { STANDARD_PROFESSIONS } from '@/lib/profession-constants'
import { checkForContactInfo } from '@/lib/content-filter'

export default function NewTaskClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [postcode, setPostcode] = useState('')
  const [closestAddress, setClosestAddress] = useState<string | null>(null)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  })
  const [country, setCountry] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([])
  const [taskType, setTaskType] = useState<'helper' | 'professional'>('helper')
  const [requestedHelper, setRequestedHelper] = useState<User | null>(null)
  const [requestedHelperLoading, setRequestedHelperLoading] = useState(false)
  const [helperRequestError, setHelperRequestError] = useState<string | null>(null)
  const [selectedHelperOffering, setSelectedHelperOffering] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const isHelperRequest = Boolean(requestedHelper)

  const helperIdParam = searchParams?.get('helperId')
  const helperOfferingParam = searchParams?.get('offering') || ''

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    category_id: '',
    sub_category_id: '',
    location: '',
    due_date: '',
    latitude: null as number | null,
    longitude: null as number | null,
    willing_to_help: false,
  })

  useEffect(() => {
    checkUser()
    loadCategories()
    loadTags()
    loadUserCountry()
  }, [])

  const loadUserCountry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single()

      if (profile?.country) {
        setCountry(profile.country)
      }
    } catch (error) {
      console.error('Error loading user country:', error)
    }
  }

  useEffect(() => {
    if (tagInput.trim()) {
      const filtered = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTags.some(st => st.id === tag.id)
      )
      setShowTagSuggestions(filtered.length > 0)
    } else {
      setShowTagSuggestions(false)
    }
  }, [tagInput, availableTags, selectedTags])

  useEffect(() => {
    if (requestedHelper) {
      setFormData(prev => ({
        ...prev,
        category_id: '',
        sub_category_id: '',
      }))
      setSelectedTags([])
      setSelectedProfessions([])
      setRequiredSkills([])
      setImageUrls([])
    }
  }, [requestedHelper])

  useEffect(() => {
    if (requestedHelper) {
      setFormData(prev => {
        if (prev.budget) {
          return prev
        }
        const autoBudget = requestedHelper.hourly_rate
          ? requestedHelper.hourly_rate.toString()
          : '0'
        return {
          ...prev,
          budget: autoBudget,
        }
      })
    }
  }, [requestedHelper])

  useEffect(() => {
    if (!helperIdParam) {
      setRequestedHelper(null)
      setHelperRequestError(null)
      setSelectedHelperOffering('')
      return
    }

    let isCancelled = false
    const fetchHelper = async () => {
      setRequestedHelperLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, hourly_rate, professional_offerings, profile_slug, company_name')
        .eq('id', helperIdParam)
        .single()

      if (isCancelled) return

      if (error || !data) {
        console.error('Error loading requested helper:', error)
        setHelperRequestError('Unable to load helper information. You can still post a task without them.')
        setRequestedHelper(null)
        setSelectedHelperOffering('')
      } else {
        setHelperRequestError(null)
        setRequestedHelper(data as User)
        const defaultOffering = helperOfferingParam || data.professional_offerings?.[0] || ''
        setSelectedHelperOffering(defaultOffering)
        const helperName = data.full_name?.split(' ')[0] || 'this helper'
        setFormData(prev => {
          if (prev.title && prev.description) return prev
          const updated = { ...prev }
          if (!prev.title) {
            updated.title = defaultOffering ? `${defaultOffering} with ${helperName}` : `Request ${helperName}`
          }
          if (!prev.description) {
            updated.description = defaultOffering
              ? `Hi ${helperName}, I'd like to hire you for ${defaultOffering}. Please let me know your availability and preferred schedule.`
              : `Hi ${helperName}, I'd like to hire you for a new task. Please let me know your availability and preferred schedule.`
          }
          return updated
        })
      }
      setRequestedHelperLoading(false)
    }

    fetchHelper()
    return () => {
      isCancelled = true
    }
  }, [helperIdParam, helperOfferingParam])

  useEffect(() => {
    if (!requestedHelper || !selectedHelperOffering) return
    setFormData(prev => {
      if (prev.description) return prev
      const helperName = requestedHelper.full_name?.split(' ')[0] || 'there'
      return {
        ...prev,
        description: `Hi ${helperName}, I'd like to hire you for ${selectedHelperOffering}. Please let me know your availability and any prep work needed.`
      }
    })
  }, [requestedHelper, selectedHelperOffering])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
  }

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

  const handleCategoryChange = async (categoryId: string) => {
    setFormData({ ...formData, category_id: categoryId, sub_category_id: '' })
    
    if (categoryId) {
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
    } else {
      setSubCategories([])
    }
  }

  const handleTagInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      await addTag(tagInput.trim())
    } else if (e.key === 'Backspace' && tagInput === '' && selectedTags.length > 0) {
      // Remove last tag if backspace on empty input
      removeTag(selectedTags[selectedTags.length - 1].id)
    }
  }

  const clearRequestedHelper = () => {
    setRequestedHelper(null)
    setSelectedHelperOffering('')
    setHelperRequestError(null)
    setFormData(prev => ({
      ...prev,
      budget: '',
      category_id: '',
      sub_category_id: '',
    }))
    router.replace('/tasks/new')
  }

  const addTag = async (tagName: string) => {
    const normalizedName = tagName.trim().toLowerCase()
    if (!normalizedName) return

    // Check if tag already exists
    let tag: Tag | undefined = availableTags.find(t => t.name.toLowerCase() === normalizedName)
    
    if (!tag) {
      // Create new tag
      const slug = normalizedName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      try {
        const { data, error } = await supabase
          .from('tags')
          .insert({ name: tagName.trim(), slug })
          .select()
          .single()

        if (error) throw error
        if (!data) {
          console.error('Tag creation returned no data')
          return
        }
        tag = data
        if (tag) {
          setAvailableTags([...availableTags, tag])
        }
      } catch (error) {
        console.error('Error creating tag:', error)
        return
      }
    }

    // Add to selected tags if not already selected
    if (tag && !selectedTags.some(t => t.id === tag!.id)) {
      setSelectedTags([...selectedTags, tag])
    }

    setTagInput('')
    setShowTagSuggestions(false)
  }

  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId))
  }

  const selectExistingTag = (tag: Tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag])
    }
    setTagInput('')
    setShowTagSuggestions(false)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || !user || files.length === 0) return

    setImageUploading(true)
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error('You must be logged in to upload an image')
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${authUser.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('images')
          .getPublicUrl(filePath)

        return data.publicUrl
      })

      const newUrls = await Promise.all(uploadPromises)
      setImageUrls(prev => [...prev, ...newUrls])
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error uploading image',
      })
    } finally {
      setImageUploading(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
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
            const derivedAddress = result.closest_address || result.display_name
            setClosestAddress(derivedAddress || null)
            console.log(`✅ Task geocoded "${formattedValue.trim()}" to:`, {
              lat: result.latitude,
              lng: result.longitude,
              display_name: result.display_name
            })
            setFormData(prev => {
              const shouldForceClosestAddress =
                isPortuguesePostcode(formattedValue.trim()) &&
                trimmedCountry.toLowerCase() === 'portugal' &&
                !!derivedAddress
              
              const nextLocation =
                shouldForceClosestAddress
                  ? derivedAddress!
                  : !prev.location && derivedAddress
                    ? derivedAddress
                    : prev.location

              return {
                ...prev,
                latitude: result.latitude,
                longitude: result.longitude,
                location: nextLocation,
              }
            })
          } else {
            setGeocodeError('Postcode not found')
            setClosestAddress(null)
            setFormData(prev => ({
              ...prev,
              latitude: null,
              longitude: null,
              location: '', // Clear location when postcode cannot be decoded
            }))
          }
        } catch (error: any) {
          console.error('Geocoding error:', error)
          setGeocodeError('Postcode not found')
          setClosestAddress(null)
          setFormData(prev => ({
            ...prev,
            latitude: null,
            longitude: null,
            location: '', // Clear location when postcode cannot be decoded
          }))
        } finally {
          setGeocoding(false)
        }
      } else {
        // Postcode is incomplete, clear coordinates but don't show error yet
        setClosestAddress(null)
        setFormData(prev => ({
          ...prev,
          latitude: null,
          longitude: null,
        }))
      }
    } else if (formattedValue.trim() && !trimmedCountry) {
      setGeocodeError('Please set your country in your profile first')
      setFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null,
      }))
    } else {
      setClosestAddress(null)
      setFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Check title and description for contact information (email/phone) - block for safety
    const titleCheck = checkForContactInfo(formData.title)
    if (!titleCheck.isClean) {
      setError(titleCheck.message)
      setLoading(false)
      return
    }

    const descriptionCheck = checkForContactInfo(formData.description)
    if (!descriptionCheck.isClean) {
      setError(descriptionCheck.message)
      setLoading(false)
      return
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('You must be logged in to create a task')

      // Create task first
      // Build task data object with only core fields
      const taskDataToInsert: any = {
        title: formData.title,
        description: formData.description,
        budget: formData.budget && formData.budget.trim() ? parseFloat(formData.budget) : null,
        location: formData.location || null,
        postcode: postcode.trim() || null,
        country: country.trim() || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        due_date: formData.due_date || null,
        image_url: imageUrls[0] || null, // Keep first image for backward compatibility
        created_by: authUser.id,
        status: 'open',
        willing_to_help: formData.willing_to_help,
        assigned_to: requestedHelper ? requestedHelper.id : null,
      }

      // Add category fields only for Helper tasks
      if (taskType === 'helper') {
        taskDataToInsert.category_id = formData.category_id || null
        taskDataToInsert.sub_category_id = formData.sub_category_id || null
      }

      // Try to add optional fields, but handle gracefully if columns don't exist
      let taskData: any = null
      let taskError: any = null

      // First try with all fields
      const fullTaskData: any = { ...taskDataToInsert }
      
      // Only add if we have values (don't add null/empty arrays)
      if (requiredSkills.length > 0) {
        fullTaskData.required_skills = requiredSkills
      }
      // Add professions only for Professional tasks
      if (taskType === 'professional' && selectedProfessions.length > 0) {
        fullTaskData.required_professions = selectedProfessions
      }

      const result = await supabase
        .from('tasks')
        .insert(fullTaskData)
        .select()
        .single()

      taskData = result.data
      taskError = result.error

      // If error is about missing columns, try without them
      if (taskError) {
        const errorMsg = taskError.message || ''
        const errorCode = taskError.code || ''
        
        // Check if error is about missing columns
        if (errorMsg.includes('required_skills') || errorMsg.includes('required_professions') || 
            errorCode === 'PGRST204' || errorCode === '42703') {
          console.warn('Optional columns not found. Creating task without them. Please run migrations:')
          console.warn('- supabase/add_required_skills_and_message_photos.sql')
          console.warn('- supabase/add_required_professions_to_tasks.sql')
          
          // Try without optional fields
          const retryResult = await supabase
            .from('tasks')
            .insert(taskDataToInsert)
            .select()
            .single()
          
          if (retryResult.error) {
            throw retryResult.error
          }
          
          taskData = retryResult.data
          taskError = null
        } else {
          throw taskError
        }
      }

      // Continue with normal flow
      if (!taskData) {
        throw new Error('Failed to create task')
      }
      
      const finalTaskData = taskData

      // Add multiple images if any uploaded
      if (imageUrls.length > 0 && finalTaskData) {
        const taskImageInserts = imageUrls.map((url, index) => ({
          task_id: finalTaskData.id,
          image_url: url,
          display_order: index,
        }))

        const { error: imagesError } = await supabase
          .from('task_images')
          .insert(taskImageInserts)

        if (imagesError) throw imagesError
      }

      // Add tags if any selected
      if (selectedTags.length > 0 && finalTaskData) {
        const taskTagInserts = selectedTags.map(tag => ({
          task_id: finalTaskData.id,
          tag_id: tag.id,
        }))

        const { error: tagsError } = await supabase
          .from('task_tags')
          .insert(taskTagInserts)

        if (tagsError) throw tagsError
      }

      if (requestedHelper && authUser) {
        await notifyHelperOfRequest(
          finalTaskData.id,
          finalTaskData.title,
          authUser.id,
          requestedHelper,
          selectedHelperOffering || finalTaskData.title
        )
      }

      router.push(`/tasks/${finalTaskData.id}`)
    } catch (error: any) {
      setError(error.message || 'An error occurred while creating the task')
    } finally {
      setLoading(false)
    }
  }

  const getOrCreateConversation = async (taskId: string, requesterId: string, helperId: string) => {
    const participant1 = requesterId < helperId ? requesterId : helperId
    const participant2 = requesterId < helperId ? helperId : requesterId

    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('id')
      .eq('task_id', taskId)
      .eq('participant1_id', participant1)
      .eq('participant2_id', participant2)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      return existing.id
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        task_id: taskId,
        participant1_id: participant1,
        participant2_id: participant2,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data.id
  }

  const notifyHelperOfRequest = async (
    taskId: string,
    taskTitle: string,
    requesterId: string,
    helper: User,
    offeringFocus: string
  ) => {
    try {
      const conversationId = await getOrCreateConversation(taskId, requesterId, helper.id)
      const helperFirstName = helper.full_name?.split(' ')[0] || helper.email || 'there'
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '')
      const taskUrl = baseUrl ? `${baseUrl}/tasks/${taskId}` : ''
      const focusText = offeringFocus || taskTitle
      const messageContent = `Hi ${helperFirstName}, I've created a new task request for ${focusText}. ${taskUrl ? `Here is the task: ${taskUrl}` : ''}`.trim()

      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: requesterId,
          receiver_id: helper.id,
          content: messageContent,
        })

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      if (helper.email) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', requesterId)
          .single()

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_message',
            recipientEmail: helper.email,
            recipientName: helper.full_name || helper.email,
            senderName: senderProfile?.full_name || senderProfile?.email || 'Someone',
            messagePreview: messageContent.substring(0, 100),
            conversationId,
          }),
        })
      }
    } catch (error) {
      console.error('Error notifying helper of request:', error)
    }
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Task Type Selector */}
        {!isHelperRequest && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What type of help do you need? <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taskType"
                  value="helper"
                  checked={taskType === 'helper'}
                  onChange={(e) => {
                    setTaskType('helper')
                    // Clear professional fields when switching to helper
                    setSelectedProfessions([])
                    setFormData({ ...formData, category_id: '', sub_category_id: '' })
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">Hire a Helper</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taskType"
                  value="professional"
                  checked={taskType === 'professional'}
                  onChange={(e) => {
                    setTaskType('professional')
                    // Clear category fields when switching to professional
                    setFormData({ ...formData, category_id: '', sub_category_id: '' })
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">Engage a Professional</span>
              </label>
            </div>
          </div>
        )}

        {(requestedHelperLoading || helperRequestError || requestedHelper) && (
          <div className="border border-primary-200 bg-primary-50 rounded-lg p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {requestedHelper?.avatar_url ? (
                <img
                  src={requestedHelper.avatar_url}
                  alt={requestedHelper.full_name || requestedHelper.email || 'Helper'}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-white shadow flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-base sm:text-lg flex-shrink-0">
                  {(requestedHelper?.full_name?.[0] || requestedHelper?.email?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-primary-600 font-semibold">Requesting helper</p>
                {requestedHelper ? (
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                    {requestedHelper.full_name || requestedHelper.email}
                  </p>
                ) : (
                  <p className="text-sm text-gray-700">Loading helper details...</p>
                )}
                <p className="text-xs text-gray-600">
                  This task will be assigned directly to the helper once it's posted.
                </p>
              </div>
              {requestedHelper && (
                <button
                  type="button"
                  onClick={() => router.push(`/helper/${requestedHelper.profile_slug || requestedHelper.id}`)}
                  className="text-xs text-primary-700 hover:text-primary-900 underline self-start sm:self-center"
                >
                  View profile
                </button>
              )}
            </div>

            {helperRequestError && (
              <div className="bg-white border border-red-200 text-red-700 text-xs sm:text-sm rounded-md p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <span className="flex-1">{helperRequestError}</span>
                <button type="button" onClick={clearRequestedHelper} className="text-red-700 font-semibold text-xs sm:text-sm">
                  Clear
                </button>
              </div>
            )}

            {requestedHelper && (
              <>
                {requestedHelper.professional_offerings && requestedHelper.professional_offerings.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">Popular offerings</p>
                    <div className="flex flex-wrap gap-2">
                      {requestedHelper.professional_offerings.map((offering) => (
                        <button
                          key={offering}
                          type="button"
                          onClick={() => setSelectedHelperOffering(offering)}
                          className={`px-3 py-1 rounded-full border text-xs ${
                            selectedHelperOffering === offering
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-primary-700 border-primary-200 hover:bg-primary-50'
                          }`}
                        >
                          {offering}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Focus of this request
                  </label>
                  <input
                    type="text"
                    value={selectedHelperOffering}
                    onChange={(e) => setSelectedHelperOffering(e.target.value)}
                    placeholder="e.g., Weekly therapy sessions"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This helps {requestedHelper.full_name?.split(' ')[0] || 'the helper'} understand what you need. You can expand on it in the task description below.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={clearRequestedHelper}
                    className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Remove helper
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            id="title"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., Need help moving furniture"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            required
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Describe what you need done in detail..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {!isHelperRequest && (
          <div className="border-t border-gray-200 pt-6">
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-3">
              Task Images (Optional) - You can upload multiple images
            </label>
            <div className="space-y-3">
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={url}
                        alt={`Task preview ${index + 1}`}
                        className="w-full h-40 sm:h-48 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-medium hover:bg-red-700 shadow-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-dashed border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {imageUploading ? 'Uploading...' : 'Add Images'}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    className="sr-only"
                  />
                </label>
                {imageUrls.length === 0 && (
                  <p className="text-xs text-gray-500">
                    Add photos to help others understand your task. You can select multiple files.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!isHelperRequest && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                  Budget (€) <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  id="budget"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  If no budget is entered, visitors will see "Quote" on your task.
                  <br />
                  <span className="text-xs text-gray-500">
                  </span>
                </p>
              </div>

              {/* Category - Only show for Helper tasks */}
              {taskType === 'helper' && (
                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    id="category_id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sub-Category - Only show for Helper tasks */}
            {taskType === 'helper' && formData.category_id && (
              <div>
                <label htmlFor="sub_category_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Category (Optional)
                </label>
                <select
                  id="sub_category_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={formData.sub_category_id}
                  onChange={(e) => setFormData({ ...formData, sub_category_id: e.target.value })}
                >
                  <option value="">No sub-category</option>
                  {subCategories.map((subCat) => (
                    <option key={subCat.id} value={subCat.id}>
                      {subCat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Press Enter to add)
              </label>
              <div className="relative">
                <div className="flex flex-wrap gap-2 mb-2 p-2 border border-gray-300 rounded-md min-h-[42px]">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        className="ml-1 text-primary-600 hover:text-primary-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    id="tags"
                    className="flex-1 min-w-[120px] border-0 focus:outline-none focus:ring-0"
                    placeholder={selectedTags.length === 0 ? 'Add tags...' : ''}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onFocus={() => {
                      if (tagInput.trim()) {
                        setShowTagSuggestions(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowTagSuggestions(false), 200)
                    }}
                  />
                </div>
                {showTagSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {availableTags
                      .filter(tag =>
                        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
                        !selectedTags.some(st => st.id === tag.id)
                      )
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => selectExistingTag(tag)}
                        >
                          {tag.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Type a tag name and press Enter to add. Tags help others find your task.
              </p>
            </div>

            {/* Professional Roles Selection - Only show for Professional tasks */}
            {taskType === 'professional' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Professional Roles (Optional)
              </label>
              <div className="space-y-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !selectedProfessions.includes(e.target.value)) {
                      setSelectedProfessions([...selectedProfessions, e.target.value])
                      e.target.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a professional role...</option>
                  {STANDARD_PROFESSIONS.filter(prof => !selectedProfessions.includes(prof)).map((prof) => (
                    <option key={prof} value={prof}>
                      {prof}
                    </option>
                  ))}
                </select>
                {selectedProfessions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedProfessions.map((prof, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                      >
                        {prof}
                        <button
                          type="button"
                          onClick={() => setSelectedProfessions(selectedProfessions.filter((_, i) => i !== index))}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

            <div>
              <label htmlFor="required_skills" className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills (Optional) - Press Enter to add
              </label>
              <div className="flex flex-wrap gap-2 mb-2 p-2 border border-gray-300 rounded-md min-h-[42px]">
                {requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => setRequiredSkills(requiredSkills.filter((_, i) => i !== index))}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  id="required_skills"
                  className="flex-1 min-w-[120px] border-0 focus:outline-none focus:ring-0"
                  placeholder={requiredSkills.length === 0 ? 'e.g., Plumbing, Carpentry...' : ''}
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      e.preventDefault()
                      const skill = skillInput.trim()
                      if (!requiredSkills.includes(skill)) {
                        setRequiredSkills([...requiredSkills, skill])
                      }
                      setSkillInput('')
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Specify skills needed for this task. Helpers with matching skills will see this task prioritized.
              </p>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                // Re-geocode if postcode is already entered
                if (postcode.trim().length >= 4) {
                  handlePostcodeChange(postcode)
                }
              }}
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
            {!country && (
              <p className="mt-1 text-sm text-amber-600">Country is required for accurate location</p>
            )}
          </div>

          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-2">
              Postcode
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="postcode"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                placeholder="e.g., 1000"
                value={postcode}
                onChange={(e) => handlePostcodeChange(e.target.value)}
                disabled={!country.trim()}
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
            {!geocoding && !geocodeError && formData.latitude && formData.longitude && country.trim() && (
              <p className="mt-1 text-sm text-green-600">
                ✓ Location found{closestAddress ? ` — ${closestAddress}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location (Address)
            </label>
            <input
              type="text"
              id="location"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="City, State"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>

        {!isHelperRequest && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="willing_to_help"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              checked={formData.willing_to_help}
              onChange={(e) => setFormData({ ...formData, willing_to_help: e.target.checked })}
            />
            <label htmlFor="willing_to_help" className="ml-2 block text-sm text-gray-700">
              I will help with this task
            </label>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Task'}
          </button>
        </div>
      </form>

      {/* Standard Modal */}
      <StandardModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />
    </>
  )
}


