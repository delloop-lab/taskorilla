'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StandardModal from '@/components/StandardModal'
import { Category, Tag } from '@/lib/types'
import { geocodePostcode } from '@/lib/geocoding'
import { formatPostcodeForCountry, isPortuguesePostcode } from '@/lib/postcode'
import { checkForContactInfo } from '@/lib/content-filter'
import { sortCategoriesByDisplayOrder } from '@/lib/category-order'
import { User as UserIcon } from 'lucide-react'
import { compressTaskImage } from '@/lib/image-utils'
import { useUserRatings } from '@/lib/useUserRatings'
import CompactUserRatingsDisplay from '@/components/CompactUserRatingsDisplay'

export default function EditTaskPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const { users: userRatings } = useUserRatings()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
  const [existingImageIds, setExistingImageIds] = useState<string[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('Portugal')
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
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [showAddSubCategory, setShowAddSubCategory] = useState(false)
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [addingSubCategory, setAddingSubCategory] = useState(false)

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
  
  // Task type: 'helper' or 'professional'
  const [taskType, setTaskType] = useState<'helper' | 'professional'>('helper')
  
  // Professional task fields
  const [professions, setProfessions] = useState<string[]>([])
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([])
  
  // Bids/Professionals who applied
  const [bids, setBids] = useState<any[]>([])
  const [loadingBids, setLoadingBids] = useState(false)

  useEffect(() => {
    checkUser()
    loadCategories()
    loadTags()
    loadProfessions()
    loadTask()
  }, [])

  // Load bids when task type is professional
  useEffect(() => {
    if (taskType === 'professional' && taskId) {
      loadBids()
    } else {
      setBids([])
    }
  }, [taskType, taskId])

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

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
  }

  const loadTask = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      // Load task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError

      if (!taskData) {
        setError('Task not found')
        return
      }

      // Check if user is the task owner
      if (taskData.created_by !== authUser.id) {
        setError('You can only edit tasks you created')
        router.push(`/tasks/${taskId}`)
        return
      }

      // Check if task can be edited (only open tasks can be edited)
      if (taskData.status !== 'open') {
        setError('Only open tasks can be edited. Tasks that are in progress or completed cannot be modified.')
        router.push(`/tasks/${taskId}`)
        return
      }

      // Load existing tags
      const { data: taskTagsData } = await supabase
        .from('task_tags')
        .select('tag_id, tags(*)')
        .eq('task_id', taskId)

      const existingTags = (taskTagsData || [])
        .map((tt: any) => tt.tags)
        .filter(Boolean) as Tag[]

      setSelectedTags(existingTags)
      
      // Load existing images from task_images table
      const { data: taskImagesData } = await supabase
        .from('task_images')
        .select('id, image_url, display_order')
        .eq('task_id', taskId)
        .order('display_order', { ascending: true })

      if (taskImagesData && taskImagesData.length > 0) {
        setImageUrls(taskImagesData.map(img => img.image_url))
        setExistingImageIds(taskImagesData.map(img => img.id))
      } else if (taskData.image_url) {
        // Fallback to legacy image_url field
        setImageUrls([taskData.image_url])
      }

      // Load sub-categories if category is set
      if (taskData.category_id) {
        await handleCategoryChange(taskData.category_id, false)
      }

      // Determine task type: if required_professions exists, it's a professional task
      // Otherwise, if category_id exists, it's a helper task
      const isProfessional = taskData.required_professions && 
                            Array.isArray(taskData.required_professions) && 
                            taskData.required_professions.length > 0
      setTaskType(isProfessional ? 'professional' : 'helper')

      // Load required professions if set
      if (taskData.required_professions && Array.isArray(taskData.required_professions)) {
        setSelectedProfessions(taskData.required_professions)
      }

      // Populate form
      setPostcode(taskData.postcode || '')
      setCountry(taskData.country || 'Portugal')
      setFormData({
        title: taskData.title || '',
        description: taskData.description || '',
        budget: taskData.budget?.toString() || '',
        category_id: taskData.category_id || '',
        sub_category_id: taskData.sub_category_id || '',
        location: taskData.location || '',
        due_date: taskData.due_date ? new Date(taskData.due_date).toISOString().split('T')[0] : '',
        latitude: taskData.latitude || null,
        longitude: taskData.longitude || null,
        willing_to_help: taskData.willing_to_help || false,
      })
    } catch (error: any) {
      console.error('Error loading task:', error)
      setError(error.message || 'Error loading task')
    } finally {
      setLoading(false)
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

  const loadProfessions = async () => {
    try {
      // Import standard professions
      const { STANDARD_PROFESSIONS } = await import('@/lib/profession-constants')
      
      // Start with standard professions
      const allProfessions = new Set<string>(STANDARD_PROFESSIONS)
      
      // Also fetch professions from database
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
    }
  }

  const loadBids = async () => {
    if (!taskId) return
    setLoadingBids(true)
    try {
      const { data: bidsData, error } = await supabase
        .from('bids')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch profiles and ratings for bidders
      if (bidsData && bidsData.length > 0) {
        const bidderIds = Array.from(new Set(bidsData.map(b => b.user_id)))
        const [profilesResult, reviewsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, is_helper, profile_slug, badges, professions')
            .in('id', bidderIds),
          supabase
            .from('reviews')
            .select('reviewee_id, rating')
            .in('reviewee_id', bidderIds)
        ])

        const profilesData = profilesResult.data || []
        const reviewsData = reviewsResult.data || []

        // Calculate average ratings for each bidder
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

        // Map profiles and ratings to bids
        const bidsWithProfiles = bidsData.map(bid => {
          const user = profilesData.find(p => p.id === bid.user_id)
          const rating = ratingsByUser[bid.user_id]
          return {
            ...bid,
            user: user ? { 
              ...user, 
              rating: rating ? rating.avg : null, 
              reviewCount: rating?.count || 0
            } : undefined
          }
        })

        setBids(bidsWithProfiles)
      } else {
        setBids([])
      }
    } catch (error) {
      console.error('Error loading bids:', error)
      setBids([])
    } finally {
      setLoadingBids(false)
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

  const handleCategoryChange = async (categoryId: string, updateForm = true) => {
    if (updateForm) {
      setFormData({ ...formData, category_id: categoryId, sub_category_id: '' })
    }
    setShowAddSubCategory(false)
    setNewSubCategoryName('')
    
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

  const handleAddSubCategory = async () => {
    if (!formData.category_id || !newSubCategoryName.trim()) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select a category and enter a sub-category name',
      })
      return
    }

    setAddingSubCategory(true)
    try {
      // Generate slug from name
      const slug = newSubCategoryName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newSubCategoryName.trim(),
          slug: slug,
          parent_id: formData.category_id
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setModalState({
            isOpen: true,
            type: 'warning',
            title: 'Duplicate Category',
            message: 'A sub-category with this name already exists',
          })
        } else {
          throw error
        }
        return
      }

      // Reload sub-categories and select the new one
      await handleCategoryChange(formData.category_id, false)
      setFormData({ ...formData, sub_category_id: data.id })
      setNewSubCategoryName('')
      setShowAddSubCategory(false)
    } catch (error: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error creating sub-category',
      })
    } finally {
      setAddingSubCategory(false)
    }
  }

  const handleTagInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      await addTag(tagInput.trim())
    } else if (e.key === 'Backspace' && tagInput === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1].id)
    }
  }

  const addTag = async (tagName: string) => {
    const normalizedName = tagName.trim().toLowerCase()
    if (!normalizedName) return

    let tag: Tag | undefined = availableTags.find(t => t.name.toLowerCase() === normalizedName)
    
    if (!tag) {
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
        // Compress image before upload (1200x1200 max, ~100-200KB instead of 3-5MB)
        const compressedImage = await compressTaskImage(file)
        
        // Use appropriate extension based on whether compression succeeded
        const isCompressed = compressedImage.type === 'image/jpeg'
        const ext = isCompressed ? 'jpg' : (file.name.split('.').pop() || 'jpg')
        const fileName = `${taskId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
        const filePath = `${authUser.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, compressedImage, { 
            upsert: true,
            contentType: compressedImage.type || 'image/jpeg'
          })

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
    // Also remove from existingImageIds if it was an existing image
    if (index < existingImageIds.length) {
      setExistingImageIds(prev => prev.filter((_, i) => i !== index))
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
            const derivedAddress = result.closest_address || result.display_name
            setClosestAddress(derivedAddress || null)
            console.log(`✅ Task edit geocoded "${formattedValue.trim()}" to:`, {
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
      setGeocodeError('Please select a country first')
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

  const handleCountryChange = async (value: string) => {
    setCountry(value)
    setGeocodeError(null)
    
    // Re-geocode postcode if it's already entered
    if (postcode.trim().length >= 4 && value.trim()) {
      handlePostcodeChange(postcode)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Check title and description for contact information (email/phone) - block for safety
    const titleCheck = checkForContactInfo(formData.title)
    if (!titleCheck.isClean) {
      setError(titleCheck.message)
      setSaving(false)
      return
    }

    const descriptionCheck = checkForContactInfo(formData.description)
    if (!descriptionCheck.isClean) {
      setError(descriptionCheck.message)
      setSaving(false)
      return
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('You must be logged in to edit a task')

      // Update task
      // Build update object based on task type
      const updateData: any = {
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
        willing_to_help: formData.willing_to_help,
      }

      // Set fields based on task type
      if (taskType === 'professional') {
        // Professional task: use required_professions, clear category
        updateData.required_professions = selectedProfessions.length > 0 ? selectedProfessions : null
        updateData.category_id = null
        updateData.sub_category_id = null
      } else {
        // Helper task: use category, clear required_professions
        updateData.category_id = formData.category_id || null
        updateData.sub_category_id = formData.sub_category_id || null
        updateData.required_professions = null
      }

      const { error: taskError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('created_by', authUser.id) // Extra security check

      if (taskError) throw taskError

      // Update images - remove all existing, then add new ones
      const { error: deleteImagesError } = await supabase
        .from('task_images')
        .delete()
        .eq('task_id', taskId)

      if (deleteImagesError) throw deleteImagesError

      if (imageUrls.length > 0) {
        const taskImageInserts = imageUrls.map((url, index) => ({
          task_id: taskId,
          image_url: url,
          display_order: index,
        }))

        const { error: imagesError } = await supabase
          .from('task_images')
          .insert(taskImageInserts)

        if (imagesError) throw imagesError
      }

      // Update tags - remove all existing, then add new ones
      const { error: deleteTagsError } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId)

      if (deleteTagsError) throw deleteTagsError

      if (selectedTags.length > 0) {
        const taskTagInserts = selectedTags.map(tag => ({
          task_id: taskId,
          tag_id: tag.id,
        }))

        const { error: tagsError } = await supabase
          .from('task_tags')
          .insert(taskTagInserts)

        if (tagsError) throw tagsError
      }

      router.push(`/tasks/${taskId}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred while updating the task')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading task...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Task</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
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

        <div>
          <label htmlFor="taskType" className="block text-sm font-medium text-gray-700 mb-2">
            Task Type *
          </label>
          <select
            id="taskType"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            value={taskType}
            onChange={(e) => {
              const newType = e.target.value as 'helper' | 'professional'
              setTaskType(newType)
              // Clear fields that don't apply to the new type
              if (newType === 'professional') {
                // Switching to professional - clear category
                setFormData({ ...formData, category_id: '', sub_category_id: '' })
              } else {
                // Switching to helper - clear required professions
                setSelectedProfessions([])
              }
            }}
          >
            <option value="helper">Hire a Helper</option>
            <option value="professional">Engage a Professional</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {taskType === 'helper' 
              ? 'Helpers can do general tasks. Select a category below.'
              : 'Professionals have specific skills. Add required professions below.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              Enter your budget. If you leave it blank, visitors will see "Quote" instead.
            </p>
          </div>

          {/* Category - only show for helper tasks */}
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
                {sortCategoriesByDisplayOrder(categories).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the category that best fits your task.
              </p>
            </div>
          )}
        </div>

        {formData.category_id && (
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
            <div className="mt-2">
              {!showAddSubCategory ? (
                <button
                  type="button"
                  onClick={() => setShowAddSubCategory(true)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + Add New Sub-Category
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Sub-category name"
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubCategory}
                    disabled={addingSubCategory || !newSubCategoryName.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {addingSubCategory ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubCategory(false)
                      setNewSubCategoryName('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Required Professions - only show for professional tasks */}
        {taskType === 'professional' && (
          <div>
            <label htmlFor="professions" className="block text-sm font-medium text-gray-700 mb-2">
              Required Professions (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Select professions that are required for this task. You can select multiple. Leave empty if any professional can do it.
            </p>
            
            {/* Dropdown to select from available professions */}
            <div className="mb-3">
              <select
                id="profession-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value=""
                onChange={(e) => {
                  const selectedProf = e.target.value
                  if (selectedProf && !selectedProfessions.includes(selectedProf)) {
                    setSelectedProfessions([...selectedProfessions, selectedProf])
                  }
                  e.target.value = '' // Reset dropdown
                }}
              >
                <option value="">Select a profession from the list...</option>
                {professions
                  .filter(p => !selectedProfessions.includes(p))
                  .map((profession, index) => (
                    <option key={index} value={profession}>
                      {profession}
                    </option>
                  ))}
              </select>
            </div>

            {/* Display selected professions as removable tags */}
            {selectedProfessions.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                {selectedProfessions.map((profession, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800"
                  >
                    {profession}
                    <button
                      type="button"
                      onClick={() => setSelectedProfessions(selectedProfessions.filter((_, i) => i !== index))}
                      className="ml-2 text-purple-600 hover:text-purple-800 font-bold"
                      aria-label={`Remove ${profession}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Professionals who have applied - only show for professional tasks */}
        {taskType === 'professional' && (
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Professionals Who Applied ({bids.length})
            </label>
            {loadingBids ? (
              <div className="text-center py-4 text-gray-500">Loading professionals...</div>
            ) : bids.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
                No professionals have applied yet.
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <div
                    key={bid.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {bid.user?.avatar_url ? (
                          <img
                            src={bid.user.avatar_url}
                            alt={bid.user.full_name || 'Professional'}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {bid.user?.full_name || 'Unknown Professional'}
                            </h4>
                            {bid.user?.userRatings && (
                              <CompactUserRatingsDisplay 
                                ratings={bid.user.userRatings} 
                                size="sm"
                                className="ml-2"
                              />
                            )}
                          </div>
                          {bid.user?.professions && bid.user.professions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {bid.user.professions.slice(0, 3).map((prof: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                                >
                                  {prof}
                                </span>
                              ))}
                            </div>
                          )}
                          {bid.message && (
                            <p className="text-sm text-gray-600 mb-2">{bid.message}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-primary-600">
                              {bid.amount ? `€${bid.amount.toFixed(2)}` : 'Quote'}
                            </span>
                            <span className="text-gray-500">
                              Status: <span className={`font-medium ${
                                bid.status === 'accepted' ? 'text-green-600' :
                                bid.status === 'rejected' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      {bid.user?.profile_slug && (
                        <a
                          href={`/profiles/${bid.user.profile_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 rounded-md hover:bg-primary-50 transition-colors"
                        >
                          View Profile
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags (Optional) <span className="text-gray-500 font-normal">Press Enter to add</span>
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
                placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
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
            Add keywords that describe your task. Press Enter after each tag. Tags help helpers find your task faster.
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
            Task Images (Optional)
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Upload images to make your task stand out. Multiple images are allowed.
          </p>
          <div className="space-y-3">
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`Task preview ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      disabled={imageUploading}
                      className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 shadow-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <label
                htmlFor="image-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              id="country"
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

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push(`/tasks/${taskId}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
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
    </div>
  )
}

