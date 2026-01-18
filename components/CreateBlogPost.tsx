'use client'

import { useState, useEffect } from 'react'
import { ContentBlock, type BlogPost } from '@/lib/blog-data'

// Service types available for blog posts
const SERVICE_TYPES = ['Plumbing', 'Electrical', 'Cleaning', 'Handyman', 'Gardening'] as const

// Algarve cities for location dropdown
const LOCATIONS = [
  'Faro',
  'Lagos',
  'Portimão',
  'Silves',
  'Albufeira',
  'Tavira',
  'Vilamoura',
  'Loulé',
  'Olhão',
  'Carvoeiro'
] as const

// Map service types to blog categories
const SERVICE_TO_CATEGORY: Record<string, string> = {
  'Plumbing': 'Plumbing',
  'Electrical': 'Electrical',
  'Cleaning': 'Cleaning',
  'Handyman': 'Home Maintenance',
  'Gardening': 'Gardening'
}

// Content block interface for form
interface ContentBlockForm {
  heading: string
  paragraph: string
}

interface CreateBlogPostProps {
  initialPost?: BlogPost | null // Optional: if provided, form is in edit mode
  onPostSaved?: (post: BlogPost) => void // Optional: callback when post is saved
}

export default function CreateBlogPost({ initialPost = null, onPostSaved }: CreateBlogPostProps = {}) {
  // Check if we're in edit mode
  const isEditMode = !!initialPost
  
  // Helper to convert ContentBlock[] to ContentBlockForm[]
  const contentBlocksToForm = (blocks: BlogPost['content']): ContentBlockForm[] => {
    if (!blocks) return [{ heading: '', paragraph: '' }]
    if (typeof blocks === 'string') {
      // Simple string content - split into paragraphs
      const paragraphs = blocks.split('\n\n').filter(p => p.trim())
      return paragraphs.map(p => ({ heading: '', paragraph: p.trim() }))
    }
    // ContentBlock[] format - convert H2+P pairs to form format
    const formBlocks: ContentBlockForm[] = []
    let currentHeading = ''
    for (const block of blocks) {
      if (block.type === 'h2' || block.type === 'h1' || block.type === 'h3') {
        if (currentHeading) {
          formBlocks.push({ heading: currentHeading, paragraph: '' })
        }
        currentHeading = block.text
      } else if (block.type === 'p') {
        formBlocks.push({ heading: currentHeading, paragraph: block.text })
        currentHeading = ''
      }
    }
    if (currentHeading) {
      formBlocks.push({ heading: currentHeading, paragraph: '' })
    }
    return formBlocks.length > 0 ? formBlocks : [{ heading: '', paragraph: '' }]
  }
  
  // Helper to get service type from category
  const categoryToServiceType = (category: string): string => {
    const reverseMap: Record<string, string> = {
      'Plumbing': 'Plumbing',
      'Electrical': 'Electrical',
      'Cleaning': 'Cleaning',
      'Home Maintenance': 'Handyman',
      'Gardening': 'Gardening'
    }
    return reverseMap[category] || category
  }
  
  // Initialize form state from initialPost if in edit mode
  // The key prop on the component forces re-mount when switching posts, so this will initialize correctly
  const [serviceType, setServiceType] = useState<string>(initialPost ? categoryToServiceType(initialPost.category) : '')
  const [location, setLocation] = useState<string>(initialPost?.location || '')
  
  // Auto-generated but editable fields
  const [title, setTitle] = useState<string>(initialPost?.title || '')
  const [slug, setSlug] = useState<string>(initialPost?.slug || '')
  // Meta description: use metaDescription if available, otherwise fallback to snippet
  const [metaDescription, setMetaDescription] = useState<string>(initialPost?.metaDescription || initialPost?.snippet || '')
  const [snippet, setSnippet] = useState<string>(initialPost?.snippet || '')
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string>(initialPost?.featuredImageUrl || '')
  const [tags, setTags] = useState<string>(initialPost?.tags?.join(', ') || '')
  const [cta, setCta] = useState<string>(initialPost?.cta || '') // Initialize with existing CTA value
  
  // OG Image Upload
  const [ogImageUpload, setOgImageUpload] = useState<File | null>(null)
  const [ogImageUploadPreview, setOgImageUploadPreview] = useState<string>('')
  const [ogImageUploadPath, setOgImageUploadPath] = useState<string>(initialPost?.ogImageUpload || '')
  const [uploadingImage, setUploadingImage] = useState<boolean>(false)
  const [existingImageUrl, setExistingImageUrl] = useState<string>(initialPost?.ogImageUpload ? (initialPost.ogImageUpload.startsWith('http') ? initialPost.ogImageUpload : `https://taskorilla.com${initialPost.ogImageUpload}`) : '')
  
  // Dynamic content blocks - load from initialPost if editing
  const [contentBlocks, setContentBlocks] = useState<ContentBlockForm[]>(
    initialPost ? contentBlocksToForm(initialPost.content) : [
      { heading: '', paragraph: '' },
      { heading: '', paragraph: '' },
      { heading: '', paragraph: '' }
    ]
  )
  
  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [generatedJson, setGeneratedJson] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  
  // Handle OG image file selection
  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setValidationErrors({
          ...validationErrors,
          ogImageUpload: 'Invalid file type. Only PNG, JPG, JPEG, and WebP are allowed.'
        })
        return
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        setValidationErrors({
          ...validationErrors,
          ogImageUpload: 'File size exceeds 5MB limit'
        })
        return
      }
      
      setOgImageUpload(file)
      setValidationErrors({ ...validationErrors, ogImageUpload: '' })
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setOgImageUploadPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Upload OG image to server
  const handleUploadOgImage = async () => {
    if (!ogImageUpload || !slug.trim()) {
      setValidationErrors({
        ...validationErrors,
        ogImageUpload: 'Please select an image and ensure slug is set'
      })
      return
    }
    
    setUploadingImage(true)
    setValidationErrors({ ...validationErrors, ogImageUpload: '' })
    
    try {
      const formData = new FormData()
      formData.append('file', ogImageUpload)
      formData.append('slug', slug.trim())
      
      const response = await fetch('/api/blog/upload-og-image', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image')
      }
      
      setOgImageUploadPath(data.imagePath)
      setValidationErrors({ ...validationErrors, ogImageUpload: '' })
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setValidationErrors({
        ...validationErrors,
        ogImageUpload: error.message || 'Failed to upload image'
      })
    } finally {
      setUploadingImage(false)
    }
  }
  
  // Remove uploaded image
  const handleRemoveOgImage = () => {
    setOgImageUpload(null)
    setOgImageUploadPreview('')
    setOgImageUploadPath('')
    if (isEditMode) {
      setExistingImageUrl('') // Also clear existing image in edit mode
    }
    setValidationErrors({ ...validationErrors, ogImageUpload: '' })
  }

  // Update all form fields when initialPost changes (for edit mode)
  // This effect runs on mount and whenever initialPost changes
  useEffect(() => {
    if (initialPost) {
      console.log('Loading post data:', {
        title: initialPost.title,
        metaDescription: initialPost.metaDescription,
        cta: initialPost.cta,
        slug: initialPost.slug
      })
      // Update all form fields from initialPost
      setServiceType(categoryToServiceType(initialPost.category))
      setLocation(initialPost.location || '')
      setTitle(initialPost.title || '')
      setSlug(initialPost.slug || '')
      // Meta description - use metaDescription if available, otherwise use snippet
      const metaDesc = initialPost.metaDescription || initialPost.snippet || ''
      setMetaDescription(metaDesc)
      setSnippet(initialPost.snippet || '')
      setFeaturedImageUrl(initialPost.featuredImageUrl || '')
      setTags(initialPost.tags?.join(', ') || '')
      setCta(initialPost.cta || '')
      setOgImageUploadPath(initialPost.ogImageUpload || '')
      // Set existing image URL - handle both absolute and relative paths
      if (initialPost.ogImageUpload) {
        const imagePath = initialPost.ogImageUpload.startsWith('http') 
          ? initialPost.ogImageUpload 
          : initialPost.ogImageUpload.startsWith('/')
          ? (typeof window !== 'undefined' ? window.location.origin : 'https://taskorilla.com') + initialPost.ogImageUpload
          : (typeof window !== 'undefined' ? window.location.origin : 'https://taskorilla.com') + '/' + initialPost.ogImageUpload
        setExistingImageUrl(imagePath)
        console.log('Setting existing image URL:', imagePath, 'from ogImageUpload:', initialPost.ogImageUpload)
      } else {
        setExistingImageUrl('')
        console.log('No ogImageUpload found for post:', initialPost.slug)
      }
      setContentBlocks(contentBlocksToForm(initialPost.content))
      // Clear any new uploads when switching posts
      setOgImageUpload(null)
      setOgImageUploadPreview('')
    } else {
      // Reset form when not in edit mode
      setServiceType('')
      setLocation('')
      setTitle('')
      setSlug('')
      setMetaDescription('')
      setSnippet('')
      setFeaturedImageUrl('')
      setTags('')
      setCta('')
      setOgImageUploadPath('')
      setExistingImageUrl('')
      setContentBlocks([
        { heading: '', paragraph: '' },
        { heading: '', paragraph: '' },
        { heading: '', paragraph: '' }
      ])
      setOgImageUpload(null)
      setOgImageUploadPreview('')
    }
  }, [initialPost?.slug]) // Watch slug - when it changes, the component re-mounts due to key prop, so this ensures sync
  
  // Auto-generate slug from title (only if not in edit mode or slug is empty)
  useEffect(() => {
    if (title && (!isEditMode || !slug)) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(generatedSlug)
    }
  }, [title, isEditMode, slug])

  // Helper function to generate title from service and location
  const generateTitle = (service: string, loc: string): string => {
    return `How to Find a Reliable ${service} in ${loc}`
  }

  // Helper function to generate SEO-optimized meta description
  // Format: Clean, 150-160 characters, no placeholders
  const generateMetaDescription = (service: string, loc: string, snippet?: string): string => {
    const baseDescription = `Find a trusted ${service.toLowerCase()} in ${loc} with Taskorilla's verified professionals.`
    
    // If snippet is provided, enhance the description
    if (snippet && snippet.trim().length > 0) {
      const cleanSnippet = snippet.trim().replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '')
      const enhanced = `${baseDescription} ${cleanSnippet.substring(0, 80)}`
      // Ensure it's 150-160 characters
      if (enhanced.length > 160) {
        return enhanced.substring(0, 157).trim() + '...'
      } else if (enhanced.length < 150) {
        return enhanced + ' Learn more on Taskorilla.'
      }
      return enhanced
    }
    
    // Default description with benefit (ensure 150-160 chars)
    const defaultDesc = `${baseDescription} Get expert tips and connect with reliable local service providers.`
    if (defaultDesc.length > 160) {
      return defaultDesc.substring(0, 157).trim() + '...'
    }
    return defaultDesc
  }

  // Helper function to generate CTA
  const generateCTA = (service: string, loc: string): string => {
    return `Find a verified ${service.toLowerCase()} in ${loc} on Taskorilla`
  }

  // Helper function to generate snippet from content blocks
  const generateSnippet = (blocks: ContentBlockForm[]): string => {
    const firstParagraph = blocks.find(b => b.paragraph.trim())?.paragraph || ''
    return firstParagraph.substring(0, 150) + (firstParagraph.length > 150 ? '...' : '')
  }

  /**
   * AI Generation Simulation
   * TODO: Replace with actual Cursor API call:
   * const response = await fetch('/api/cursor/generate-blog', {
   *   method: 'POST',
   *   body: JSON.stringify({ serviceType, location })
   * })
   */
  const generateBlogContent = async (service: string, loc: string): Promise<ContentBlockForm[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Template-based content generation matching existing blog post patterns
    const templates: Record<string, ContentBlockForm[]> = {
      'Plumbing': [
        {
          heading: 'Step 1: Ask for Recommendations',
          paragraph: `Reach out to friends, neighbours, or local social groups in ${loc} for trusted plumbers. Personal recommendations save time and stress.`
        },
        {
          heading: 'Step 2: Check Online Reviews',
          paragraph: 'Look for reviews on Taskorilla and other platforms. Verified reviews help you avoid unreliable service providers.'
        },
        {
          heading: 'Step 3: Verify Credentials',
          paragraph: 'Ensure the plumber is licensed and insured. Always ask for proof before any work begins.'
        },
        {
          heading: 'Step 4: Compare Quotes',
          paragraph: `Get at least 2–3 quotes from different plumbers in ${loc}. Compare pricing and scope of work to avoid surprises.`
        },
        {
          heading: 'Step 5: Schedule & Communicate',
          paragraph: 'Once you choose a plumber, schedule the work and confirm all details in writing. Clear communication prevents misunderstandings.'
        },
        {
          heading: 'Conclusion',
          paragraph: `Finding a reliable plumber in ${loc} doesn't have to be stressful. Follow these steps and use Taskorilla to connect with verified professionals.`
        }
      ],
      'Electrical': [
        {
          heading: 'Check Qualifications',
          paragraph: 'Ensure the electrician has proper licenses and insurance before any work starts.'
        },
        {
          heading: 'Ask for Recommendations',
          paragraph: `Speak with locals or look at reviews on Taskorilla to find trustworthy professionals in ${loc}.`
        },
        {
          heading: 'Compare Quotes',
          paragraph: 'Get multiple quotes and check the scope of work to avoid surprises.'
        },
        {
          heading: 'Schedule Work',
          paragraph: 'Agree on a schedule and confirm all details in writing to ensure smooth execution.'
        }
      ],
      'Cleaning': [
        {
          heading: 'Ask for Recommendations',
          paragraph: `Ask friends or neighbours for trusted cleaning services in ${loc}.`
        },
        {
          heading: 'Check Reviews',
          paragraph: 'Look at verified reviews on Taskorilla to see past client experiences.'
        },
        {
          heading: 'Compare Prices',
          paragraph: 'Get a few quotes to compare pricing and services included.'
        },
        {
          heading: 'Schedule and Confirm',
          paragraph: 'Set a date and confirm all details in writing to avoid miscommunication.'
        }
      ],
      'Handyman': [
        {
          heading: 'Ask for Recommendations',
          paragraph: `Friends and neighbours often know skilled handymen in ${loc}.`
        },
        {
          heading: 'Check Credentials',
          paragraph: 'Ensure proper licensing and insurance for safety.'
        },
        {
          heading: 'Compare Quotes',
          paragraph: 'Get 2–3 quotes to find fair pricing.'
        }
      ],
      'Gardening': [
        {
          heading: 'Ask for Local Recommendations',
          paragraph: 'Neighbors and friends are often the best source for trustworthy gardeners.'
        },
        {
          heading: 'Check Reviews Online',
          paragraph: 'Use Taskorilla to verify ratings and past client feedback.'
        },
        {
          heading: 'Confirm Services and Pricing',
          paragraph: 'Make sure the gardener provides the services you need and agree on pricing upfront.'
        }
      ]
    }

    // Return template for service type, or default template
    return templates[service] || templates['Handyman']
  }

  /**
   * Generate Blog JSON - Calls AI simulation and fills all auto-generated fields
   */
  const handleGenerate = async () => {
    // Validate required fields
    if (!serviceType || !location) {
      setValidationErrors({
        serviceType: !serviceType ? 'Service type is required' : '',
        location: !location ? 'Location is required' : ''
      })
      return
    }

    setIsGenerating(true)
    setValidationErrors({})

    try {
      // Generate content blocks using AI simulation
      const generatedBlocks = await generateBlogContent(serviceType, location)
      setContentBlocks(generatedBlocks)

      // Auto-generate all fields
      const generatedTitle = generateTitle(serviceType, location)
      const generatedSnippet = generateSnippet(generatedBlocks)
      // Generate meta description after snippet is available for better SEO
      const generatedMeta = generateMetaDescription(serviceType, location, generatedSnippet)
      const generatedCTA = generateCTA(serviceType, location)

      setTitle(generatedTitle)
      setMetaDescription(generatedMeta)
      setSnippet(generatedSnippet)
      setCta(generatedCTA)

      // Generate preview JSON
      updatePreview()
    } catch (error) {
      console.error('Error generating blog content:', error)
      setValidationErrors({ generate: 'Failed to generate content. Please try again.' })
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Add a new content block
   */
  const addContentBlock = () => {
    setContentBlocks([...contentBlocks, { heading: '', paragraph: '' }])
  }

  /**
   * Remove a content block (minimum 1 required)
   */
  const removeContentBlock = (index: number) => {
    if (contentBlocks.length > 1) {
      setContentBlocks(contentBlocks.filter((_, i) => i !== index))
    }
  }

  /**
   * Update content block
   */
  const updateContentBlock = (index: number, field: 'heading' | 'paragraph', value: string) => {
    const updated = [...contentBlocks]
    updated[index] = { ...updated[index], [field]: value }
    setContentBlocks(updated)
  }

  /**
   * Validate form before saving
   * Ensures no placeholders, empty strings, or invalid data
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!serviceType || !serviceType.trim()) {
      errors.serviceType = 'Service type is required'
    }
    if (!location || !location.trim()) {
      errors.location = 'Location is required'
    }
    
    // Validate title: no placeholders, no empty strings
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      errors.title = 'Title is required'
    } else if (cleanTitle.includes('{{') || cleanTitle.includes('[[')) {
      errors.title = 'Title cannot contain placeholders'
    }
    
    // Validate slug
    if (!slug.trim()) {
      errors.slug = 'Slug is required'
    }
    
    // Validate meta description: 150-160 characters, no placeholders
    const cleanMetaDesc = metaDescription.trim()
    if (!cleanMetaDesc) {
      errors.metaDescription = 'Meta description is required (150-160 characters)'
    } else if (cleanMetaDesc.length < 150 || cleanMetaDesc.length > 160) {
      errors.metaDescription = `Meta description must be 150-160 characters (currently ${cleanMetaDesc.length})`
    } else if (cleanMetaDesc.includes('{{') || cleanMetaDesc.includes('[[')) {
      errors.metaDescription = 'Meta description cannot contain placeholders'
    }
    
    // Validate OG image upload: either uploaded image or featured image URL
    if (!ogImageUploadPath && !featuredImageUrl.trim()) {
      // Not required, but warn if neither is provided
      // Will use default image
    } else if (featuredImageUrl.trim()) {
      // Validate featured image URL if provided
      const cleanImageUrl = featuredImageUrl.trim()
      if (cleanImageUrl.includes('{{') || cleanImageUrl.includes('[[') || cleanImageUrl.includes('placeholder')) {
        errors.featuredImageUrl = 'Featured image URL cannot contain placeholders'
      } else {
        // Basic URL validation
        try {
          if (!cleanImageUrl.startsWith('http://') && !cleanImageUrl.startsWith('https://') && !cleanImageUrl.startsWith('/')) {
            errors.featuredImageUrl = 'Featured image URL must be a valid absolute URL or path starting with /'
          }
        } catch {
          errors.featuredImageUrl = 'Featured image URL must be a valid URL'
        }
      }
    }

    // Validate content blocks - at least 1 required, each must have heading and paragraph
    if (contentBlocks.length === 0) {
      errors.contentBlocks = 'At least one content block is required'
    } else {
      contentBlocks.forEach((block, index) => {
        if (!block.heading.trim()) {
          errors[`contentBlock_${index}_heading`] = 'Heading is required'
        }
        if (!block.paragraph.trim()) {
          errors[`contentBlock_${index}_paragraph`] = 'Paragraph is required'
        }
      })
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Update JSON preview
   */
  const updatePreview = () => {
    if (!title || !slug || !serviceType || !location) {
      return
    }

    const category = SERVICE_TO_CATEGORY[serviceType] || serviceType
    // Convert content blocks to ContentBlock[] format (H2 + paragraph pairs)
    const content: ContentBlock[] = contentBlocks
      .filter(block => block.heading.trim() && block.paragraph.trim()) // Only include non-empty blocks
      .flatMap(block => [
        { type: 'h2' as const, text: block.heading.trim() },
        { type: 'p' as const, text: block.paragraph.trim() }
      ])

    // Parse tags from comma-separated string (remove placeholders)
    const tagsArray = tags
      .split(',')
      .map(t => t.trim().replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, ''))
      .filter(t => t.length > 0)

    // Clean title: remove placeholders and duplicates
    const cleanTitleValue = title.trim()
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Clean meta description: ensure 150-160 chars, no placeholders
    let cleanMetaDesc = metaDescription.trim()
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\[[^\]]+\]/g, '')
      .trim()
    
    if (cleanMetaDesc.length > 160) {
      cleanMetaDesc = cleanMetaDesc.substring(0, 157).trim() + '...'
    } else if (cleanMetaDesc.length < 150 && cleanMetaDesc.length > 0) {
      cleanMetaDesc = cleanMetaDesc + ' Learn more on Taskorilla.'
      if (cleanMetaDesc.length > 160) {
        cleanMetaDesc = cleanMetaDesc.substring(0, 157).trim() + '...'
      }
    }

    // Handle OG image: prioritize uploaded image, then featured image URL
    // If ogImageUploadPath is set (new upload), use it. Otherwise, keep existing in edit mode.
    let ogImageUploadPathValue: string | undefined = undefined
    if (ogImageUploadPath && ogImageUploadPath.trim()) {
      // New upload - use the uploaded path
      ogImageUploadPathValue = ogImageUploadPath.trim()
    } else if (isEditMode && initialPost?.ogImageUpload) {
      // Edit mode with no new upload - keep existing
      ogImageUploadPathValue = initialPost.ogImageUpload
    }
    
    let cleanImageUrl = featuredImageUrl.trim()
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\[[^\]]+\]/g, '')
      .trim()
    
    if (cleanImageUrl && !cleanImageUrl.startsWith('http://') && !cleanImageUrl.startsWith('https://') && cleanImageUrl.startsWith('/')) {
      cleanImageUrl = `https://taskorilla.com${cleanImageUrl}`
    }

    const blogPost: BlogPost = {
      title: cleanTitleValue,
      category,
      snippet: snippet.trim() || generateSnippet(contentBlocks),
      date: isEditMode && initialPost?.date ? initialPost.date : new Date().toISOString().split('T')[0], // Keep original date in edit mode
      location,
      slug: slug.trim(),
      content: content.length > 0 ? content : undefined,
      metaDescription: cleanMetaDesc || undefined,
      ogImageUpload: ogImageUploadPathValue, // Always include if set (new upload or existing)
      featuredImageUrl: cleanImageUrl || undefined, // Legacy support
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      cta: cta.trim() || undefined
    }

    setGeneratedJson(JSON.stringify(blogPost, null, 2))
  }

  /**
   * Copy JSON to clipboard
   */
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedJson)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  /**
   * Save blog post - Automatically saves to lib/blog-data.ts
   */
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      // If an image is selected but not yet uploaded, upload it first
      let finalImagePath = ogImageUploadPath
      if (ogImageUpload && !ogImageUploadPath && slug.trim()) {
        try {
          const formData = new FormData()
          formData.append('file', ogImageUpload)
          formData.append('slug', slug.trim())
          
          const uploadResponse = await fetch('/api/blog/upload-og-image', {
            method: 'POST',
            body: formData,
          })
          
          const uploadData = await uploadResponse.json()
          
          if (uploadResponse.ok && uploadData.success) {
            finalImagePath = uploadData.imagePath
            setOgImageUploadPath(uploadData.imagePath) // Update state for UI
            console.log('Image uploaded successfully:', uploadData.imagePath)
          } else {
            throw new Error(uploadData.error || 'Failed to upload image')
          }
        } catch (uploadError: any) {
          console.error('Error auto-uploading image:', uploadError)
          alert(`Warning: Image upload failed: ${uploadError.message}. The post will be saved without the image.`)
          // Continue with save even if image upload fails
        }
      }

      // Update preview first to get the latest JSON
      // Temporarily override ogImageUploadPath for this update if we just uploaded
      const originalPath = ogImageUploadPath
      if (finalImagePath && finalImagePath !== ogImageUploadPath) {
        // Force update the state temporarily
        setOgImageUploadPath(finalImagePath)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      updatePreview()
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100))

      // Parse the generated JSON
      const postToSave = JSON.parse(generatedJson) as BlogPost
      
      // Ensure the image path is included even if state didn't update in time
      if (finalImagePath && finalImagePath.trim()) {
        postToSave.ogImageUpload = finalImagePath.trim()
        console.log('Forcing ogImageUpload in postToSave:', finalImagePath)
      }

      // Save via API (automatically updates lib/blog-data.ts)
      const response = await fetch('/api/blog/save-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postToSave),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save blog post')
      }

      // Call callback if provided
      if (onPostSaved) {
        onPostSaved(postToSave)
      }
      
      // Show success message
      alert(result.message || (isEditMode 
        ? 'Blog post updated successfully!' 
        : 'Blog post created successfully!'))
      
      // If in edit mode, we're done. If creating new, optionally reset form
      if (!isEditMode) {
        // Optionally reset form for new post
        // Uncomment if you want to clear form after saving:
        // setTitle('')
        // setSlug('')
        // setContentBlocks([{ heading: '', paragraph: '' }])
        // ... etc
      }
    } catch (error: any) {
      console.error('Error saving blog post:', error)
      alert(`Error: ${error.message || 'Failed to save blog post. Please try again.'}`)
      setValidationErrors({ save: error.message || 'Failed to save blog post. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Update preview when form fields change
  useEffect(() => {
    if (title && slug && contentBlocks.some(b => b.heading && b.paragraph)) {
      updatePreview()
    }
  }, [title, slug, contentBlocks, snippet, metaDescription, featuredImageUrl, ogImageUploadPath, tags, cta, serviceType, location])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Blog Post' : 'Create Blog Post'}
          </h2>
          {isEditMode && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Editing: {initialPost?.slug}
            </span>
          )}
        </div>

        {/* Service Type - Required */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Type <span className="text-red-500">*</span>
          </label>
          <select
            className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.serviceType ? 'border-red-500' : ''
            }`}
            value={serviceType}
            onChange={(e) => {
              setServiceType(e.target.value)
              setValidationErrors({ ...validationErrors, serviceType: '' })
            }}
          >
            <option value="">-- Select Service Type --</option>
            {SERVICE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {validationErrors.serviceType && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.serviceType}</p>
          )}
        </div>

        {/* Location - Required */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <select
            className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.location ? 'border-red-500' : ''
            }`}
            value={location}
            onChange={(e) => {
              setLocation(e.target.value)
              setValidationErrors({ ...validationErrors, location: '' })
            }}
          >
            <option value="">-- Select Location --</option>
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          {validationErrors.location && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.location}</p>
          )}
        </div>

        {/* Generate Button */}
        <div className="mb-6">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGenerate}
            disabled={isGenerating || !serviceType || !location}
          >
            {isGenerating ? 'Generating...' : 'Generate Blog JSON'}
          </button>
        </div>

        {/* Title - Auto-generated, editable */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.title ? 'border-red-500' : ''
            }`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setValidationErrors({ ...validationErrors, title: '' })
            }}
            placeholder="How to Find a Reliable..."
          />
          {validationErrors.title && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.title}</p>
          )}
        </div>

        {/* Slug - Auto-generated from title, editable */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.slug ? 'border-red-500' : ''
            }`}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setValidationErrors({ ...validationErrors, slug: '' })
            }}
            placeholder="how-to-find-a-reliable..."
          />
          {validationErrors.slug && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.slug}</p>
          )}
        </div>

        {/* Meta Description - Auto-generated, editable, REQUIRED */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description <span className="text-red-500">*</span> (150-160 characters)
          </label>
          <textarea
            className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.metaDescription ? 'border-red-500' : ''
            }`}
            rows={2}
            value={metaDescription}
            onChange={(e) => {
              setMetaDescription(e.target.value)
              setValidationErrors({ ...validationErrors, metaDescription: '' })
            }}
            placeholder="Looking for a trusted..."
          />
          <p className="mt-1 text-xs text-gray-500">{metaDescription.length} characters</p>
          {validationErrors.metaDescription && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.metaDescription}</p>
          )}
        </div>

        {/* CTA - Auto-generated, editable - MOVED UP FOR VISIBILITY */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Call to Action (CTA)
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Find a verified..."
          />
          <p className="mt-1 text-xs text-gray-500">Optional: Call to action text for the blog post</p>
        </div>

        {/* OG Image Upload - Manual upload (highest priority) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OG Image Upload (1200x630 recommended)
          </label>
          {!ogImageUploadPreview && !ogImageUploadPath && !existingImageUrl ? (
            <>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.ogImageUpload ? 'border-red-500' : ''
                }`}
                onChange={handleOgImageUpload}
              />
              <p className="mt-1 text-xs text-gray-500">
                Upload a PNG, JPG, JPEG, or WebP image (max 5MB). Recommended size: 1200x630px for optimal social sharing.
              </p>
              {ogImageUpload && (
                <button
                  type="button"
                  onClick={handleUploadOgImage}
                  disabled={uploadingImage || !slug.trim()}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
              )}
            </>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              {(ogImageUploadPreview || existingImageUrl || ogImageUploadPath) && (
                <div className="mb-3">
                  {(ogImageUploadPreview || existingImageUrl) && (
                    <img
                      src={ogImageUploadPreview || existingImageUrl}
                      alt="OG Image Preview"
                      className="max-w-full h-auto mb-2 rounded border border-gray-300"
                      style={{ maxHeight: '200px' }}
                      onError={(e) => {
                        // If image fails to load, try relative path or default
                        const img = e.target as HTMLImageElement
                        if (existingImageUrl && existingImageUrl.includes('taskorilla.com')) {
                          // Try converting to relative path for localhost
                          const relativePath = existingImageUrl.replace('https://taskorilla.com', '')
                          if (relativePath !== img.src) {
                            img.src = relativePath
                          } else {
                            // Fallback to default
                            img.src = '/images/blog/og/default.png'
                          }
                        } else if (existingImageUrl && !img.src.includes('default.png')) {
                          // Try default image
                          img.src = '/images/blog/og/default.png'
                        }
                      }}
                    />
                  )}
                  <p className="text-xs text-gray-500">
                    {ogImageUploadPreview ? 'New image preview' : existingImageUrl ? 'Current image' : 'Image path set'}
                  </p>
                </div>
              )}
              {ogImageUploadPath && (
                <p className="text-sm text-gray-600 mb-2">
                  ✅ New Upload: <code className="bg-gray-200 px-1 rounded">{ogImageUploadPath}</code>
                </p>
              )}
              {existingImageUrl && !ogImageUploadPath && initialPost?.ogImageUpload && (
                <p className="text-sm text-gray-600 mb-2">
                  📷 Current Image: <code className="bg-gray-200 px-1 rounded">{initialPost.ogImageUpload}</code>
                </p>
              )}
              {!existingImageUrl && !ogImageUploadPath && !ogImageUploadPreview && initialPost?.ogImageUpload && (
                <p className="text-sm text-yellow-600 mb-2">
                  ⚠️ Image path exists but image not found: <code className="bg-gray-200 px-1 rounded">{initialPost.ogImageUpload}</code>
                </p>
              )}
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={handleRemoveOgImage}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  {existingImageUrl && !ogImageUploadPath ? 'Remove Current Image' : 'Remove New Image'}
                </button>
                {existingImageUrl && !ogImageUploadPath && (
                  <>
                    <span className="text-xs text-gray-500">
                      Upload a new image to replace the current one
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      onChange={handleOgImageUpload}
                    />
                  </>
                )}
              </div>
            </div>
          )}
          {validationErrors.ogImageUpload && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.ogImageUpload}</p>
          )}
        </div>

        {/* Featured Image URL - Legacy support (optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Featured Image URL (Optional - Legacy)
          </label>
          <input
            type="url"
            className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.featuredImageUrl ? 'border-red-500' : ''
            }`}
            value={featuredImageUrl}
            onChange={(e) => {
              setFeaturedImageUrl(e.target.value)
              setValidationErrors({ ...validationErrors, featuredImageUrl: '' })
            }}
            placeholder="https://example.com/image.png or /images/path.png"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional: Use if you have an external image URL. Uploaded OG image takes priority.
          </p>
          {validationErrors.featuredImageUrl && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.featuredImageUrl}</p>
          )}
        </div>

        {/* Article Tags - Optional but recommended */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Article Tags (comma-separated)
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="plumbing, faro, home repair, local services"
          />
          <p className="mt-1 text-xs text-gray-500">Separate multiple tags with commas</p>
        </div>

        {/* Snippet - Auto-generated, editable */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Snippet (~150 characters)
          </label>
          <textarea
            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
            placeholder="First 150 characters of content..."
          />
          <p className="mt-1 text-xs text-gray-500">{snippet.length} characters</p>
        </div>

        {/* Content Blocks - Dynamic H2 + Paragraph pairs */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Blocks <span className="text-red-500">*</span> (At least 1 required)
          </label>
          {contentBlocks.map((block, index) => (
            <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Block {index + 1}</span>
                <button
                  type="button"
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => removeContentBlock(index)}
                  disabled={contentBlocks.length === 1}
                >
                  Remove
                </button>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  H2 Heading <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    validationErrors[`contentBlock_${index}_heading`] ? 'border-red-500' : ''
                  }`}
                  value={block.heading}
                  onChange={(e) => updateContentBlock(index, 'heading', e.target.value)}
                  placeholder="Step 1: Ask for Recommendations"
                />
                {validationErrors[`contentBlock_${index}_heading`] && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors[`contentBlock_${index}_heading`]}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Paragraph <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    validationErrors[`contentBlock_${index}_paragraph`] ? 'border-red-500' : ''
                  }`}
                  rows={3}
                  value={block.paragraph}
                  onChange={(e) => updateContentBlock(index, 'paragraph', e.target.value)}
                  placeholder="Enter paragraph text..."
                />
                {validationErrors[`contentBlock_${index}_paragraph`] && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors[`contentBlock_${index}_paragraph`]}</p>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
            onClick={addContentBlock}
          >
            + Add Content Block
          </button>
          {validationErrors.contentBlocks && (
            <p className="mt-1 text-sm text-red-500">{validationErrors.contentBlocks}</p>
          )}
        </div>


        {/* Save Button */}
        <div className="mb-6">
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (isEditMode ? 'Update Blog Post' : 'Save Blog Post')}
          </button>
          {validationErrors.save && (
            <p className="mt-2 text-sm text-red-500">{validationErrors.save}</p>
          )}
          {isSaving && (
            <p className="mt-2 text-sm text-gray-600">
              {isEditMode ? 'Updating blog post...' : 'Saving blog post...'}
            </p>
          )}
        </div>
      </div>

      {/* JSON Preview Section */}
      {generatedJson && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Preview JSON</h3>
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
              onClick={handleCopyToClipboard}
            >
              {copySuccess ? '✓ Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <pre className="bg-gray-50 border border-gray-300 rounded-lg p-4 overflow-auto max-h-96 text-xs">
            <code>{generatedJson}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
