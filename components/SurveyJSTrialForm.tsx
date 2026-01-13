'use client'

import { useEffect, useState, useRef } from 'react'
import { Model, SurveyError, surveyLocalization } from 'survey-core'
import { Survey } from 'survey-react'
import { supabase } from '@/lib/supabase'
import { Category } from '@/lib/types'
import { createTrialFormModel } from '@/lib/surveyjs-trial-form'
import { loadTheme, initializeTheme, type SurveyJSTheme } from '@/lib/surveyjs-theme-manager'
import { geocodePostcode, isPostcodeComplete, extractTownName } from '@/lib/geocoding'
import { formatPostcodeForCountry } from '@/lib/postcode'
import { formatEuro } from '@/lib/currency'
import { format } from 'date-fns'
import { useLanguage } from '@/lib/i18n'

// Import all SurveyJS theme CSS files upfront
// SurveyJS themes must be imported before use - they don't dynamically load
import 'survey-core/defaultV2.min.css'
import 'survey-core/modern.min.css'
// Note: default and defaultV2 are the same file in v1.12.57

// Import Portuguese localization for SurveyJS UI strings
import 'survey-core/i18n/portuguese'

// Customize localization strings - change "Page" to "Question"
if (surveyLocalization && surveyLocalization.locales) {
  // English localization
  if (surveyLocalization.locales['en']) {
    surveyLocalization.locales['en'].progressText = 'Question {0} of {1}'
    surveyLocalization.locales['en'].previewText = 'Preview Task Before Creating'
  }
  
  // Portuguese localization
  if (surveyLocalization.locales['pt']) {
    surveyLocalization.locales['pt'].progressText = 'Pergunta {0} de {1}'
    surveyLocalization.locales['pt'].previewText = 'Pré-visualizar Tarefa Antes de Criar'
  }
  
  // Default locale fallback
  if (surveyLocalization.locales['default']) {
    surveyLocalization.locales['default'].progressText = 'Question {0} of {1}'
    surveyLocalization.locales['default'].previewText = 'Preview Task Before Creating'
  }
}

export default function SurveyJSTrialForm() {
  const { t, language } = useLanguage()
  const [surveyModel, setSurveyModel] = useState<Model | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [professions, setProfessions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submittedData, setSubmittedData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentTheme, setCurrentTheme] = useState<SurveyJSTheme>('default')
  const [userCountry, setUserCountry] = useState<string>('')
  const [geocoding, setGeocoding] = useState(false)
  const geocodingRef = useRef(false) // Ref to track geocoding state for validation callbacks
  const lastGeocodedValueRef = useRef<string>('') // Track last geocoded value to prevent duplicates
  const indicatorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Debounce indicator updates
  const formDataRef = useRef<any>({}) // Ref to store form data as user fills it out
  const previewImageUrlRef = useRef<string | null>(null) // Stable image URL for preview to prevent flashing
  const previewGeneratedRef = useRef(false) // Flag to prevent regenerating preview multiple times
  const previewGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Debounce preview generation
  const lastPreviewHtmlRef = useRef<string>('') // Store last generated HTML to prevent unnecessary updates
  const previousUserRef = useRef<any>(null) // Track previous user to detect login without causing re-renders
  const authListenerSetupRef = useRef(false) // Flag to prevent setting up multiple auth listeners
  const [imageUploading, setImageUploading] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [imagePreviewDataUrl, setImagePreviewDataUrl] = useState<string | null>(null) // Local preview before upload completes
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null) // Store file for upload after login
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewCardHtml, setPreviewCardHtml] = useState<string>('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingTaskData, setPendingTaskData] = useState<any>(null) // Store form data while waiting for login
  const [user, setUser] = useState<any>(null) // Track current user

  useEffect(() => {
    // Always use default theme
    initializeTheme('default')
    setCurrentTheme('default')
    
    // Check current user
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      
      // If user is logged in and we have pending task data in localStorage, restore it
      if (user) {
        try {
          const storedData = localStorage.getItem('pendingTaskData')
          if (storedData) {
            const parsedData = JSON.parse(storedData)
            
            // Check if this task was already created (to prevent duplicates)
            const taskCreatedFlag = localStorage.getItem('taskCreatedFromPending')
            if (taskCreatedFlag === 'true') {
              console.log('[Task Creation] Task already created, skipping')
              localStorage.removeItem('pendingTaskData')
              localStorage.removeItem('pendingImageDataUrl')
              localStorage.removeItem('taskCreatedFromPending')
              return
            }
            
            // Restore image preview if available
            const storedImageDataUrl = localStorage.getItem('pendingImageDataUrl')
            if (storedImageDataUrl) {
              setImagePreviewDataUrl(storedImageDataUrl)
            }
            
            // Mark that we're creating the task
            localStorage.setItem('taskCreatedFromPending', 'true')
            
            // Create task with stored data
            await createTaskFromData(parsedData)
            
            // Clean up after successful creation
            localStorage.removeItem('pendingTaskData')
            localStorage.removeItem('pendingImageDataUrl')
            localStorage.removeItem('taskCreatedFromPending')
            setPendingTaskData(null)
          }
        } catch (error) {
          console.error('Error restoring pending task data:', error)
          // Clean up on error
          localStorage.removeItem('taskCreatedFromPending')
        }
      }
    })
    
    // Load user's country from profile
    loadUserCountry()
    
    // Load both categories and professions, then set loading to false
    Promise.all([loadCategories(), loadProfessions()]).then(() => {
      setLoading(false)
    }).catch((error) => {
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Separate effect to handle auth state changes and pending task creation
  useEffect(() => {
    // Prevent setting up multiple listeners
    if (authListenerSetupRef.current) {
      return
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[EFFECT: Auth State] Setting up auth listener', 'background: blue; color: white')
    }
    authListenerSetupRef.current = true
    
    // Get initial user state
    supabase.auth.getUser().then(({ data: { user: initialUser } }) => {
      previousUserRef.current = initialUser
      setUser(initialUser)
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Ignore INITIAL_SESSION events to prevent infinite loops
      if (_event === 'INITIAL_SESSION') {
        const currentUser = session?.user ?? null
        previousUserRef.current = currentUser
        setUser(currentUser)
        return
      }
      
      console.log('%c[AUTH STATE CHANGE]', 'background: blue; color: white', {
        event: _event,
        hasSession: !!session,
        hasUser: !!session?.user,
        timestamp: new Date().toISOString()
      })
      
      const previousUser = previousUserRef.current
      const currentUser = session?.user ?? null
      previousUserRef.current = currentUser
      setUser(currentUser)
      
      // If user just logged in (was null, now has user)
      if (currentUser && !previousUser) {
        // Upload pending image if any
        if (pendingImageFile && session?.user) {
          try {
            setImageUploading(true)
            const fileExt = pendingImageFile.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${session.user.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(filePath, pendingImageFile, { upsert: true })

            if (!uploadError) {
              const { data } = supabase.storage
                .from('images')
                .getPublicUrl(filePath)
              setUploadedImageUrl(data.publicUrl)
              formDataRef.current.image = data.publicUrl
              if (surveyModel) {
                surveyModel.setValue('image', data.publicUrl)
              }
            }
            setPendingImageFile(null)
            setImageUploading(false)
          } catch (error) {
            console.error('Error uploading pending image:', error)
            setImageUploading(false)
          }
        }
        
        // If we have pending task data, create the task
        if (pendingTaskData) {
          // Check if task was already created to prevent duplicates
          const taskCreatedFlag = localStorage.getItem('taskCreatedFromPending')
          if (taskCreatedFlag === 'true') {
            console.log('[Task Creation] Task already created via localStorage flow, skipping')
            setPendingTaskData(null)
            setShowLoginModal(false)
            localStorage.removeItem('taskCreatedFromPending')
            return
          }
          
          // Mark that we're creating the task
          localStorage.setItem('taskCreatedFromPending', 'true')
          
          await createTaskFromData(pendingTaskData)
          
          // Clean up
          setPendingTaskData(null)
          setShowLoginModal(false)
          localStorage.removeItem('pendingTaskData')
          localStorage.removeItem('pendingImageDataUrl')
          localStorage.removeItem('taskCreatedFromPending')
        }
      }
    })
    
    return () => {
      authListenerSetupRef.current = false
      subscription.unsubscribe()
    }
  }, [pendingTaskData, pendingImageFile, surveyModel]) // Removed 'user' from dependencies to prevent infinite loop

  const loadUserCountry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', user.id)
          .single()
        
        if (profile?.country) {
          setUserCountry(profile.country)
        }
      }
    } catch (error) {
      // Error loading user country - will use default
    }
  }

  // Handle theme change
  const handleThemeChange = (theme: SurveyJSTheme) => {
    // Update state immediately
    setCurrentTheme(theme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('surveyjs-theme', theme)
    }
    
    // Update data-theme attribute for CSS scoping
    loadTheme(theme)
    
    // Recreate the model with the new theme
    // This will trigger the useEffect above to recreate the model
    if (surveyModel && !loading) {
      try {
        const newModel = createTrialFormModel(categories, professions, theme, t)
        // Set the locale based on current language
        newModel.locale = language === 'pt' ? 'pt' : 'en'
        
        newModel.onComplete.add((sender) => {
          const data = sender.data
          setSubmittedData(data)
        })
        
        // Add geocoding handlers
        newModel.onValueChanged.add((sender, options) => {
          if (options.name === 'postcode') {
            if (options.value) {
              handlePostcodeGeocode(options.value, newModel)
            } else {
              newModel.setValue('location', '')
              updateGeocodingIndicator(newModel, false, false)
            }
          }
          if (options.name === 'taskType') {
            updateLocationQuestionTitle(newModel, options.value)
          }
        })
        
        setSurveyModel(newModel)
      } catch (err) {
        // Error recreating model
      }
    }
  }

  // Store reference to current language for the model
  const currentLanguageRef = useRef<string>(language)
  
  // Update ref when language changes
  useEffect(() => {
    currentLanguageRef.current = language
  }, [language])

  useEffect(() => {
    // Wait for categories and professions to finish loading (even if empty)
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[EFFECT: Create SurveyModel] Running', 'background: red; color: white', {
        loading,
        categoriesCount: categories.length,
        professionsCount: professions.length,
        currentTheme,
        language,
        timestamp: new Date().toISOString()
      })
    }
    
    // Check if translations are loaded - if t() returns the key, translations aren't ready yet
    const testTranslation = t('surveyForm.title')
    const translationsReady = testTranslation !== 'surveyForm.title'
    
    if (!loading && translationsReady) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('%c[EFFECT: Create SurveyModel] Creating new model...', 'background: red; color: white', {
            language,
            testTranslation
          })
        }
        const model = createTrialFormModel(categories, professions, currentTheme, t)
        
        // Set the locale based on current language (en or pt)
        model.locale = language === 'pt' ? 'pt' : 'en'
        if (process.env.NODE_ENV === 'development') {
          console.log(`[SurveyJS] Setting locale to: ${model.locale}, language: ${language}`)
        }
        
        // Handle form completion
        model.onComplete.add((sender) => {
          const data = sender.data
          setSubmittedData(data)
          // Clear image preview state after form completion
          setImagePreviewDataUrl(null)
          setUploadedImageUrl(null)
        })
        
        // Set default due date to today if not already set
        const dueDateQuestion = model.getQuestionByName('dueDate')
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        if (dueDateQuestion) {
          // Always set default value to ensure it's set
          if (!dueDateQuestion.value) {
            model.setValue('dueDate', today)
            formDataRef.current.dueDate = today
          }
        }
        
        // Also set it when the due date page is shown
        model.onCurrentPageChanged.add((sender) => {
          if (sender.currentPage?.name === 'dueDatePage') {
            setTimeout(() => {
              const dueDateQuestion = sender.getQuestionByName('dueDate')
              if (dueDateQuestion && !dueDateQuestion.value) {
                const today = new Date().toISOString().split('T')[0]
                sender.setValue('dueDate', today)
                formDataRef.current.dueDate = today
                const input = document.querySelector('input[name="dueDate"]') as HTMLInputElement
                if (input && !input.value) {
                  input.value = today
                }
              }
            }, 100)
          }
        })
        
        // Handle image upload to Supabase
        const handleImageUpload = async (file: File) => {
          if (!file) return
          setImageUploading(true)
          
          try {
            // Check authentication
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
            if (authError || !authUser) {
              // Not logged in - store file for later upload
              console.log('[Image Upload] User not logged in, storing file for later')
              setPendingImageFile(file)
              setImageUploading(false)
              
              // Update status to show it will be uploaded after login
              const status = document.getElementById('survey-upload-status')
              if (status) {
                status.textContent = '✓ Image ready (will upload after login)'
                status.style.color = '#3b82f6'
              }
              return
            }

            // Upload to Supabase
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${authUser.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(filePath, file, { upsert: true })

            if (uploadError) {
              throw uploadError
            }

            // Get public URL
            const { data } = supabase.storage
              .from('images')
              .getPublicUrl(filePath)

            const imageUrl = data.publicUrl
            
            // Store the URL
            setUploadedImageUrl(imageUrl)
            formDataRef.current.image = imageUrl
            model.setValue('image', imageUrl)
            
            // Also update the local preview to use the server URL
            setImagePreviewDataUrl(imageUrl)
            
            // Update preview image ref to use the uploaded URL
            previewImageUrlRef.current = imageUrl
            
            // Update status to show success (using new element IDs)
            const status = document.getElementById('survey-upload-status')
            
            if (status) {
              status.textContent = '✓ Image uploaded successfully!'
              status.style.color = '#10b981'
            }
            // Don't update preview image DOM directly - React state handles it
            // The imagePreviewDataUrl state will be updated above, which React will render
            
          } catch (error: any) {
            // Show error state (using new element IDs)
            const placeholder = document.getElementById('survey-upload-placeholder')
            const preview = document.getElementById('survey-upload-preview')
            const status = document.getElementById('survey-upload-status')
            
            if (preview) preview.style.display = 'none'
            if (placeholder) placeholder.style.display = 'block'
            if (status) {
              status.textContent = error?.message || 'Upload failed - click to try again'
              status.style.color = '#ef4444'
            }
          } finally {
            setImageUploading(false)
          }
        }
        
        // Expose the upload handler globally so the HTML onchange can call it
        ;(window as any).handleSurveyImageUpload = (input: HTMLInputElement) => {
          const file = input.files?.[0]
          if (file) {
            // Create local preview using FileReader and set to React state
            const reader = new FileReader()
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string
              setImagePreviewDataUrl(dataUrl)
              formDataRef.current.image = dataUrl
              // Only set value once to prevent re-render loops
              // Don't call model.setValue here - let the upload handler set it after upload completes
            }
            reader.readAsDataURL(file)
            
            // Upload to server
            handleImageUpload(file)
          }
        }

        // Restore form values from ref when page changes (for editing)
        model.onCurrentPageChanged.add((sender) => {
          // Replace "Page" with "Question" in progress text
          setTimeout(() => {
            const progressTextElements = document.querySelectorAll('.sv-progress__text, .sd-progress__text, .sv-progress-text, .sd-progress-text')
            progressTextElements.forEach((el) => {
              if (el.textContent) {
                el.textContent = el.textContent.replace(/Page (\d+) of (\d+)/gi, 'Question $1 of $2')
                el.textContent = el.textContent.replace(/Page (\d+)\s*\/\s*(\d+)/gi, 'Question $1 of $2')
              }
            })
          }, 50)
          
          // Set up image upload click handler when image page is shown
          setTimeout(() => {
            const uploadArea = document.getElementById('survey-upload-area')
            const fileInput = document.getElementById('survey-image-input')
            if (uploadArea && fileInput) {
              // Remove existing event listeners by cloning
              const newUploadArea = uploadArea.cloneNode(true) as HTMLElement
              uploadArea.parentNode?.replaceChild(newUploadArea, uploadArea)
              
              // Add click handler to trigger file input
              newUploadArea.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                const input = document.getElementById('survey-image-input') as HTMLInputElement
                if (input) {
                  input.click()
                }
              }, { capture: true })
            }
          }, 200)
          
          // Skip restoration if in preview mode (we handle that separately)
          if (sender.state === 'preview') {
            return
          }
          
          // Restore all saved values to ensure they're visible when editing
          const savedData = formDataRef.current
          
          // Restore immediately
          Object.keys(savedData).forEach(key => {
            // Skip image field to prevent flashing - it's handled separately via React state
            if (key === 'image') return
            
            const value = savedData[key]
            // Restore all values, including empty strings (but not null/undefined)
            if (value !== undefined && value !== null) {
              sender.setValue(key, value)
            }
          })
          
          // Use setTimeout to ensure page has fully changed before restoring again
          setTimeout(() => {
            Object.keys(savedData).forEach(key => {
              // Skip image field to prevent flashing
              if (key === 'image') return
              
              const value = savedData[key]
              if (value !== undefined && value !== null) {
                const currentValue = sender.getValue(key)
                // Always restore if different (including empty strings)
                if (currentValue !== value) {
                  sender.setValue(key, value)
                }
              }
            })
            // Force render to ensure UI updates
            sender.render()
          }, 50)
          
          // Also restore after a longer delay to catch any race conditions
          setTimeout(() => {
            Object.keys(savedData).forEach(key => {
              // Skip image field to prevent flashing
              if (key === 'image') return
              
              const value = savedData[key]
              if (value !== undefined && value !== null) {
                const currentValue = sender.getValue(key)
                if (currentValue !== value) {
                  sender.setValue(key, value)
                }
              }
            })
            sender.render()
          }, 200)
        })
        
        // Also restore on page render to catch any cases where onCurrentPageChanged doesn't fire
        model.onAfterRenderPage.add((sender) => {
          // Only restore if not in preview mode
          if (sender.state !== 'preview') {
            const savedData = formDataRef.current
            setTimeout(() => {
              Object.keys(savedData).forEach(key => {
                // Skip image field to prevent flashing - it's handled separately
                if (key === 'image') return
                
                const value = savedData[key]
                if (value !== undefined && value !== null) {
                  const currentValue = sender.getValue(key)
                  if (currentValue !== value) {
                    sender.setValue(key, value)
                  }
                }
              })
            }, 100)
          }
          
          // Replace "Page" with "Question" in progress text
          setTimeout(() => {
            const progressTextElements = document.querySelectorAll('.sv-progress__text, .sd-progress__text, .sv-progress-text, .sd-progress-text')
            progressTextElements.forEach((el) => {
              if (el.textContent) {
                el.textContent = el.textContent.replace(/Page (\d+) of (\d+)/gi, 'Question $1 of $2')
                el.textContent = el.textContent.replace(/Page (\d+)\s*\/\s*(\d+)/gi, 'Question $1 of $2')
              }
            })
          }, 50)
          
          // Ensure image upload label click handler works
          setTimeout(() => {
            const uploadArea = document.getElementById('survey-upload-area')
            const fileInput = document.getElementById('survey-image-input')
            if (uploadArea && fileInput) {
              // Remove any existing click handlers by cloning and replacing
              const existingOnClick = uploadArea.getAttribute('onclick')
              if (!existingOnClick || !existingOnClick.includes('survey-image-input')) {
                // Add click handler to trigger file input
                uploadArea.addEventListener('click', (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const input = document.getElementById('survey-image-input') as HTMLInputElement
                  if (input) {
                    input.click()
                  }
                }, { once: false, capture: true })
              }
            }
          }, 100)
          
        })
        
        // Also replace on page change
        model.onCurrentPageChanged.add((sender) => {
          setTimeout(() => {
            const progressTextElements = document.querySelectorAll('.sv-progress__text, .sd-progress__text, .sv-progress-text, .sd-progress-text')
            progressTextElements.forEach((el) => {
              if (el.textContent) {
                el.textContent = el.textContent.replace(/Page (\d+) of (\d+)/gi, 'Question $1 of $2')
                el.textContent = el.textContent.replace(/Page (\d+)\s*\/\s*(\d+)/gi, 'Question $1 of $2')
              }
            })
          }, 50)
        })

        // Handle postcode geocoding - trigger immediately when value changes
        model.onValueChanged.add((sender, options) => {
          // Store all form data in ref as user fills it out
          formDataRef.current[options.name] = options.value
          
          // DEBUG: Log all value changes to help diagnose input issues
          console.log('%c[SurveyJS onValueChanged]', 'background: #222; color: #bada55', { 
            name: options.name, 
            value: options.value,
            type: typeof options.value,
            timestamp: new Date().toISOString()
          })
          
          if (options.name === 'postcode') {
            const postcodeValue = options.value || ''
            const trimmedValue = postcodeValue.trim()
            
            if (!trimmedValue) {
              // Clear location when postcode is cleared
              model.setValue('location', '')
              model.setValue('latitude', '')
              model.setValue('longitude', '')
              updateGeocodingIndicator(model, false, false)
              setGeocoding(false)
              geocodingRef.current = false
              lastGeocodedValueRef.current = ''
            } else {
              // Trigger geocoding immediately when postcode has value
              handlePostcodeGeocode(trimmedValue, model)
            }
          }
          
          // Update location question title based on taskType
          if (options.name === 'taskType') {
            updateLocationQuestionTitle(model, options.value)
          }
        })
        
        // Note: Postcode input handling is now done in the restrictPostcodeInput function
        // to avoid multiple event listeners and prevent re-renders

        // Add validation before page change to ensure postcode is geocoded
        model.onValidateQuestion.add((sender, options) => {
          console.log('[SurveyJS onValidateQuestion]', {
            name: options.name,
            value: options.question?.value,
            error: options.error
          })
          
          if (options.name === 'postcode') {
            const postcode = model.getValue('postcode')
            const location = model.getValue('location')
            const latitude = model.getValue('latitude')
            
            // Check if geocoding is in progress using ref (accessible in closure)
            if (geocodingRef.current) {
              // Geocoding in progress - show friendly message
              options.error = 'Please wait for the location to be found...'
              return
            }
            
            // Check if geocoding is in progress by checking if location is empty but postcode is complete
            const postcodeComplete = postcode && postcode.trim().length >= 7
            const isGeocodingInProgress = postcodeComplete && !location && !latitude
            
            if (isGeocodingInProgress) {
              // Geocoding in progress - show friendly message
              options.error = 'Please wait for the location to be found...'
              return
            }
            
            if (postcode && (!location || !latitude || location.includes('Please set') || location.includes('not found') || location.includes('Error'))) {
              // Postcode entered but not geocoded yet or geocoding failed
              if (location.includes('not found') || location.includes('Error')) {
                options.error = 'Please check the postcode and try again'
              } else {
                options.error = 'Please wait for the location to be found before continuing'
              }
            }
          }
        })

        // Update location question title on initial load
        if (model.getValue('taskType')) {
          updateLocationQuestionTitle(model, model.getValue('taskType'))
        }

        // Customize preview page to show Task Card
        // Use a more aggressive approach: watch for preview content and replace it
        let previewReplaced = false
        
        const replacePreviewWithCard = () => {
          // Check if we're actually in preview mode
          const isInPreviewState = model.state === 'preview' || model.currentPage?.isPreviewPage
          
          if (previewReplaced && isInPreviewState) {
            return true
          }
          
          if (!isInPreviewState) {
            return false
          }
          
          // Try multiple selectors to find the preview container
          // SurveyJS uses both .sv- and .sd- prefixes (sd- is newer)
          let bodyContainer: Element | null = document.querySelector('.sd-body') || 
                                             document.querySelector('.sv-body')
          if (!bodyContainer) {
            bodyContainer = document.querySelector('.sd-body__page') || 
                           document.querySelector('.sv-body__page')
          }
          if (!bodyContainer) {
            bodyContainer = document.querySelector('.sd-root') || 
                           document.querySelector('.sv-root')
          }
          if (!bodyContainer) {
            bodyContainer = document.querySelector('.sd-preview') || 
                           document.querySelector('.sv-preview')
          }
          if (!bodyContainer) {
            bodyContainer = document.querySelector('[data-name="preview-page"]')
          }
          if (!bodyContainer) {
            // Try to find any container with survey questions (check both sd- and sv-)
            const question = document.querySelector('.sd-question') || 
                           document.querySelector('.sv-question')
            if (question) {
              bodyContainer = question.closest('.sd-body') || 
                            question.closest('.sv-body') ||
                            question.closest('.sd-root') ||
                            question.closest('.sv-root') ||
                            question.closest('.sd-page') ||
                            (question.parentElement?.parentElement?.parentElement || null)
            }
          }
          
          // Log all available survey-related elements for debugging
          if (!bodyContainer) {
            const allSvElements = document.querySelectorAll('[class*="sv-"], [class*="sd-"]')
            
            // Also check for preview questions (both sd- and sv-)
            const previewQuestions = document.querySelectorAll('.sd-question, .sv-question, .sd-preview-question, .sv-preview-question, [data-name]')
            if (previewQuestions.length > 0) {
              const firstQuestion = previewQuestions[0] as Element
              // Use the root container or find the page container
              // Look for common SurveyJS container classes
              bodyContainer = firstQuestion.closest('.sd-root') || 
                           firstQuestion.closest('.sv-root') ||
                           firstQuestion.closest('.sd-body') ||
                           firstQuestion.closest('.sv-body') ||
                           firstQuestion.closest('.sd-page') ||
                           firstQuestion.closest('.sv-page') ||
                           firstQuestion.closest('.sd-container') ||
                           firstQuestion.closest('.sv-container') ||
                           // Fallback: use the page row's parent
                           firstQuestion.closest('.sd-page__row')?.parentElement ||
                           firstQuestion.closest('.sv-page__row')?.parentElement ||
                           (firstQuestion.parentElement?.parentElement?.parentElement || null)
            }
          }
          
          if (!bodyContainer) {
            return
          }
          
          // Check if we're in preview mode
          // First, check document level for preview questions (they might not be in bodyContainer)
          const allQuestionsDoc = document.querySelectorAll('.sd-question, .sv-question')
          const previewQuestionsDoc = document.querySelectorAll('.sd-question--preview, .sv-question--preview, .sd-preview-question, .sv-preview-question')
          
          // Also check within the container
          const allQuestions = bodyContainer.querySelectorAll('.sd-question, .sv-question')
          const hasPreviewQuestions = bodyContainer.querySelectorAll('.sd-question--preview, .sv-question--preview, .sd-preview-question, .sv-preview-question').length > 0
          const hasPreviewContainer = document.querySelector('.sd-preview, .sv-preview') !== null
          
          // Use document-level count if container count is 0
          const questionCount = allQuestions.length > 0 ? allQuestions.length : allQuestionsDoc.length
          const previewQuestionCount = previewQuestionsDoc.length
          
          // Check if any question has the preview class
          const hasPreviewClass = previewQuestionCount > 0 || Array.from(allQuestions.length > 0 ? allQuestions : allQuestionsDoc).some(q => 
            q.classList.contains('sd-question--preview') || 
            q.classList.contains('sv-question--preview')
          )
          
          // Only detect preview if we have preview classes - don't trigger on regular form pages
          const isPreviewMode = hasPreviewQuestions || hasPreviewContainer || hasPreviewClass
          
          // Additional check: if we see questions from different pages (e.g., taskType, category, postcode all visible)
          // BUT only if they have preview classes - don't trigger on regular form pages
          const questionsToCheck = allQuestions.length > 0 ? allQuestions : allQuestionsDoc
          const questionNames = Array.from(questionsToCheck).map(q => q.getAttribute('data-name')).filter(Boolean)
          
          // Only consider it preview if we have preview classes AND multiple questions from different pages
          const hasMultiplePageQuestions = (hasPreviewClass || hasPreviewQuestions) && questionCount > 1 && 
            Array.from(questionsToCheck).some(q => {
              const name = q.getAttribute('data-name')
              return name === 'taskType' || name === 'category' || name === 'profession' || name === 'postcode' || name === 'dueDate' || name === 'title' || name === 'description' || name === 'budget'
            })
          
          
          // Only replace if we're actually in preview mode (has preview classes)
          if ((isPreviewMode || hasMultiplePageQuestions) && questionCount > 0) {
            // Try multiple ways to get the data - model.data might be empty initially
            let data = model.data
            if (!data || Object.keys(data).length === 0) {
              // Try getAllValues() method
              try {
                data = model.getAllValues() as any
              } catch (e) {
                // Fallback: get values individually
                data = {
                  taskType: model.getValue('taskType') || formDataRef.current.taskType || '',
                  category: model.getValue('category') || formDataRef.current.category || '',
                  requiredProfession: model.getValue('requiredProfession') || formDataRef.current.requiredProfession || '',
                  title: model.getValue('title') || formDataRef.current.title || '',
                  description: model.getValue('description') || formDataRef.current.description || '',
                  budget: model.getValue('budget') || formDataRef.current.budget || '',
                  postcode: model.getValue('postcode') || formDataRef.current.postcode || '',
                  location: model.getValue('location') || formDataRef.current.location || '',
                  dueDate: model.getValue('dueDate') || formDataRef.current.dueDate || '',
                  image: model.getValue('image') || formDataRef.current.image || uploadedImageUrl || null
                }
              }
            }
            // Merge with ref data to ensure we have all values, including image
            // Prioritize: model data > formDataRef > uploadedImageUrl state > local preview
            // Use stable ref value if available, otherwise calculate and store it
            let imageValue = previewImageUrlRef.current
            if (!imageValue) {
              imageValue = data.image || formDataRef.current.image || uploadedImageUrl || imagePreviewDataUrl || null
              // Store stable value to prevent flashing
              previewImageUrlRef.current = imageValue
            }
            
            // Only regenerate preview if it hasn't been generated yet or data actually changed
            if (previewGeneratedRef.current && previewCardHtml) {
              return true // Preview already generated, don't regenerate
            }
            
            console.log('[Preview] Image sources:', {
              'data.image': data.image,
              'formDataRef.current.image': formDataRef.current.image,
              'uploadedImageUrl': uploadedImageUrl,
              'imagePreviewDataUrl': imagePreviewDataUrl,
              'finalImageValue': imageValue,
              'previewImageUrlRef.current': previewImageUrlRef.current
            })
            data = { 
              ...formDataRef.current, 
              ...data,
              image: imageValue
            }
            console.log('[Preview] Final data for card:', data)
            
            // Debounce preview generation to prevent rapid updates
            previewGenerationTimeoutRef.current = setTimeout(() => {
              const previewHtml = createPreviewTaskCard(data, model)
              
              // Only update if HTML actually changed
              if (previewHtml !== lastPreviewHtmlRef.current) {
                lastPreviewHtmlRef.current = previewHtml
                
                // If we have a bodyContainer, use it. Otherwise, try to find the survey root
                let containerToReplace: Element | null = bodyContainer
                if (!containerToReplace || allQuestions.length === 0) {
                  // Try to find the survey root or the container that holds all the preview questions
                  const firstPreviewQuestion = previewQuestionsDoc.length > 0 ? previewQuestionsDoc[0] as Element : 
                                             (allQuestionsDoc.length > 0 ? allQuestionsDoc[0] as Element : null)
                  if (firstPreviewQuestion) {
                    containerToReplace = firstPreviewQuestion.closest('.sd-root') ||
                                       firstPreviewQuestion.closest('.sv-root') ||
                                       firstPreviewQuestion.closest('.sd-body') ||
                                       firstPreviewQuestion.closest('.sv-body') ||
                                       firstPreviewQuestion.closest('.sd-page') ||
                                       firstPreviewQuestion.closest('.sv-page') ||
                                       firstPreviewQuestion.closest('.surveyjs-form-wrapper') ||
                                       // Find the common parent of all preview questions
                                       (firstPreviewQuestion.parentElement?.parentElement?.parentElement || null)
                  }
                }
                
                // Show preview in modal instead of replacing inline
                setPreviewCardHtml(previewHtml)
                setShowPreviewModal(true)
                previewReplaced = true
                previewGeneratedRef.current = true
              }
            }, 100) // Small delay to debounce rapid calls
            
            // Hide the SurveyJS preview questions so user only sees the modal
            setTimeout(() => {
              const previewContainer = document.querySelector('.sd-body, .sv-body')
              if (previewContainer) {
                const previewQuestions = previewContainer.querySelectorAll('.sd-question, .sv-question')
                previewQuestions.forEach((q: Element) => {
                  (q as HTMLElement).style.display = 'none'
                })
              }
            }, 100)
            
            return true
          }
          return false
        }
        
        // NOTE: MutationObserver was removed - it was causing input refresh issues when logged in
        // because it fired on every DOM change including when typing in input fields
        // Preview detection is now handled only through onCurrentPageChanged and onAfterRenderPage callbacks
        
        // Also use onCurrentPageChanged to detect when preview might be shown
        model.onCurrentPageChanged.add((sender) => {
          // onCurrentPageChanged triggered
          previewReplaced = false // Reset flag when page changes
          // Don't reset previewGeneratedRef here - only reset when modal closes
          
          // Try to replace immediately
          setTimeout(() => {
            replacePreviewWithCard()
          }, 100)
        })
        
        // Use onAfterRenderPage as additional backup - but ONLY if it's the preview page
        model.onAfterRenderPage.add((sender, options) => {
          // onAfterRenderPage triggered
          // Only trigger if this is actually the preview page
          if (options.page?.name === 'preview-page' || options.page?.name === 'preview') {
            // Add a delay to ensure data is populated
            setTimeout(() => {
              replacePreviewWithCard()
            }, 500)
          }
        })
        
        // Also intercept when user clicks the complete button (which triggers preview)
        const originalDoComplete = model.doComplete.bind(model)
        model.doComplete = function(isCompleteOnTrigger?: boolean, completeTrigger?: any) {
          // doComplete called - preview should appear soon
          // Call original to trigger preview
          const result = originalDoComplete(isCompleteOnTrigger, completeTrigger)
          
          // Reset preview replaced flag so we can detect preview again
          previewReplaced = false
          // Reset preview generation flag to allow regeneration
          previewGeneratedRef.current = false
          // Reset image URL ref to allow recalculation
          previewImageUrlRef.current = null
          // Clear last preview HTML
          lastPreviewHtmlRef.current = ''
          
          // Clear any pending preview generation
          if (previewGenerationTimeoutRef.current) {
            clearTimeout(previewGenerationTimeoutRef.current)
            previewGenerationTimeoutRef.current = null
          }
          
          // Then replace preview content - use a single delayed call instead of multiple
          setTimeout(() => {
            replacePreviewWithCard()
          }, 500)
          
          return result
        }

        // Replace "Page" with "Question" in progress text
        // NOTE: MutationObserver was removed - it was causing input refresh issues when logged in
        // because it fired on every DOM change including when typing in input fields
        const replacePageWithQuestion = () => {
          const progressTextElements = document.querySelectorAll('.sv-progress__text, .sd-progress__text, .sv-progress-text, .sd-progress-text, [class*="progress"]')
          progressTextElements.forEach((el) => {
            if (el.textContent && el.textContent.includes('Page')) {
              el.textContent = el.textContent.replace(/Page (\d+) of (\d+)/gi, 'Question $1 of $2')
              el.textContent = el.textContent.replace(/Page (\d+)\s*\/\s*(\d+)/gi, 'Question $1 of $2')
            }
          })
        }
        
        // Run once on load - no continuous observation needed
        setTimeout(() => {
          replacePageWithQuestion()
        }, 100)

        if (process.env.NODE_ENV === 'development') {
          console.log('%c[EFFECT: Create SurveyModel] Setting surveyModel state', 'background: red; color: white')
        }
        setSurveyModel(model)
      } catch (err) {
        console.error('[EFFECT: Create SurveyModel] Error:', err)
        setError('Failed to create form. Please try again.')
      }
    }
    // NOTE: userCountry is intentionally NOT in the dependency array
    // Adding it caused the surveyModel to be recreated when the user's country loaded,
    // which cleared form inputs and caused the "refresh on keystroke" bug for logged-in users
    // We include language and t to recreate model when translations change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, professions, loading, currentTheme, language, t])

  const updateLocationQuestionTitle = (model: Model, taskType: string) => {
    const locationQuestion = model.getQuestionByName('postcode')
    if (locationQuestion) {
      const typeText = taskType === 'helper' ? 'helper' : 'professional'
      locationQuestion.title = `Where is the ${typeText} needed?`
    }
  }

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    if (!text) return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Create Preview Task Card HTML - matches Browse Tasks design
  const createPreviewTaskCard = (data: any, model: Model): string => {
    
    const taskType = data.taskType || 'helper'
    const title = data.title || 'Untitled Task'
    const description = data.description || 'No description provided'
    const budget = data.budget ? formatEuro(parseFloat(data.budget), false) : 'Quote'
    
    // Look up category name from ID
    let categoryName = ''
    if (data.category) {
      const categoryObj = categories.find(cat => cat.id === data.category)
      categoryName = categoryObj ? categoryObj.name : data.category
    } else if (data.requiredProfession) {
      categoryName = data.requiredProfession
    }
    
    const location = data.location || 'Location not specified'
    const dueDate = data.dueDate ? format(new Date(data.dueDate), 'MMM d, yyyy') : 'Not specified'
    const postcode = data.postcode || ''
    
    // Get the image URL - use stable ref value if available, otherwise calculate from data
    // This prevents flashing by using a consistent image URL
    const finalImageUrl = previewImageUrlRef.current || data.image || uploadedImageUrl || imagePreviewDataUrl || null
    // Update ref if we calculated a new value
    if (finalImageUrl && !previewImageUrlRef.current) {
      previewImageUrlRef.current = finalImageUrl
    }
    
    // Extract city from location (similar to Browse Tasks)
    const extractCity = (loc: string): string => {
      if (!loc || loc === 'Location not specified') return 'Location not specified'
      const parts = loc.split(',').map(p => p.trim())
      // For Portuguese addresses, city is usually first part
      const hasPortuguesePostcode = parts.some(p => /^\d{4}-\d{3}$/.test(p))
      if (hasPortuguesePostcode && parts.length >= 3) {
        const firstPart = parts[0].toLowerCase()
        const looksLikeStreet = /\d|street|avenue|road|rua|avenida|rua da|rua do|rua de/i.test(firstPart)
        if (looksLikeStreet && parts.length >= 4) {
          return parts[2] || parts[0]
        }
        return parts[0]
      }
      return parts[0] || loc
    }
    
    const city = extractCity(location)
    
    return `
      <div style="background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); padding: 24px; display: flex; flex-direction: column; position: relative; max-width: 100%;">
        <!-- Header: Image, Title, Status, Price -->
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
          ${finalImageUrl ? `
            <!-- Uploaded image (left side) - matches w-32 h-32 -->
            <div style="flex-shrink: 0; width: 128px; height: 128px; background: #f3f4f6; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              <img src="${escapeHtml(finalImageUrl)}" alt="${escapeHtml(title)}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : `
            <!-- Placeholder for image (left side) - matches w-32 h-32 -->
            <div style="flex-shrink: 0; width: 128px; height: 128px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              <div style="color: #9ca3af; font-size: 14px; text-align: center; padding: 8px;">No Image</div>
            </div>
          `}
          
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 8px;">
              <div style="flex: 1; padding-right: 12px;">
                <h3 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px 0; line-height: 1.2;">${escapeHtml(title)}</h3>
                <p style="font-size: 30px; font-weight: 700; color: #2563eb; margin: 0;">${budget}</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <span style="padding: 4px 10px; font-size: 12px; font-weight: 500; border-radius: 4px; background: #d1fae5; color: #065f46; white-space: nowrap;">
                  open
                </span>
              </div>
            </div>
            
            <p style="color: #4b5563; font-size: 14px; margin: 0 0 12px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(description)}</p>
            
            <!-- Poster Info -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  <div style="width: 100%; height: 100%; background: #d1d5db;"></div>
                </div>
                <span style="font-size: 14px; font-weight: 500; color: #2563eb;">by You</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Divider - matches mb-4 pb-4 border-b border-gray-200 -->
        <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;"></div>
        
        <!-- Metadata: Category, Location, Due Date - matches gap-3 text-sm -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 14px;">
          ${city && city !== 'Location not specified' ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #6b7280;">📍</span>
              <span style="color: #374151; font-weight: 500;">${escapeHtml(city)}</span>
            </div>
          ` : ''}
          ${categoryName ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #6b7280;">Category:</span>
              <span style="color: #374151; font-weight: 500; background: #f3f4f6; padding: 4px 10px; border-radius: 4px;">${escapeHtml(categoryName)}</span>
            </div>
          ` : ''}
          ${dueDate && dueDate !== 'Not specified' ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #6b7280;">📅</span>
              <span style="color: #374151; font-weight: 400;">Due: ${escapeHtml(dueDate)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }

  // Helper function to setup postcode input directly (called from multiple places)
  // REMOVED: setupPostcodeInputDirectly - duplicate handler removed

  const updateGeocodingIndicator = (model: Model, isGeocoding: boolean, success: boolean = false) => {
    // Clear any pending updates to prevent duplicates
    if (indicatorUpdateTimeoutRef.current) {
      clearTimeout(indicatorUpdateTimeoutRef.current)
      indicatorUpdateTimeoutRef.current = null
    }
    
    // Debounce rapid calls - only execute the latest one
    indicatorUpdateTimeoutRef.current = setTimeout(() => {
      updateGeocodingIndicatorImmediate(model, isGeocoding, success)
    }, 10)
  }
  
  const updateGeocodingIndicatorImmediate = (model: Model, isGeocoding: boolean, success: boolean = false) => {
    // First, remove ALL existing indicators to prevent duplicates
    const removeAllIndicators = () => {
      // Remove ALL indicators with our class or data attribute - be very aggressive
      const allIndicators = document.querySelectorAll(
        '.geocoding-indicator, .geocoding-indicator-quick, [data-geocoding-indicator="true"]'
      )
      allIndicators.forEach((indicator) => {
        indicator.remove()
      })
      
      // Also try to find and remove any spinners near postcode inputs
      const postcodeInput = document.querySelector('[data-name="postcode"] input') as HTMLInputElement ||
                            document.querySelector('input[data-postcode-listener]') as HTMLInputElement ||
                            document.querySelector('input[name="postcode"]') as HTMLInputElement
      
      if (postcodeInput && postcodeInput.parentElement) {
        const siblings = Array.from(postcodeInput.parentElement.children)
        siblings.forEach((sibling) => {
          if (sibling !== postcodeInput && 
              (sibling.classList.contains('geocoding-indicator') || 
               sibling.classList.contains('geocoding-indicator-quick') ||
               sibling.getAttribute('data-geocoding-indicator') === 'true')) {
            if (sibling && sibling.parentNode) {
              try {
                sibling.remove()
              } catch (e) {
                // Element might have already been removed
              }
            }
          }
        })
      }
    }
    
    // Helper function to find postcode input - try synchronously first
    const findPostcodeInput = (): HTMLInputElement | null => {
      // Try multiple selectors to find the postcode input - more comprehensive search
      let postcodeInput = document.querySelector('input[name="postcode"]') as HTMLInputElement
      
      if (!postcodeInput) {
        postcodeInput = document.querySelector('.sv-input[type="text"][name="postcode"]') as HTMLInputElement
      }
      
      if (!postcodeInput) {
        // Try finding by ID or data attribute
        postcodeInput = document.querySelector('[data-name="postcode"]') as HTMLInputElement ||
                       document.querySelector('#postcode') as HTMLInputElement
      }
      
      if (!postcodeInput) {
        // Search all inputs for one with name="postcode"
        const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
        postcodeInput = allInputs.find(
          (el: Element) => {
            const input = el as HTMLInputElement
            return input.name === 'postcode' || 
                   input.id === 'postcode' ||
                   input.getAttribute('data-name') === 'postcode'
          }
        ) as HTMLInputElement
      }
      
      return postcodeInput || null
    }
    
    // Remove all existing indicators first to prevent duplicates
    removeAllIndicators()
    
    // Try to find element immediately (synchronous)
    let postcodeInput = findPostcodeInput()
    
    // If not showing anything, just return after cleanup
    if (!isGeocoding && !success) {
      return
    }
    
    // If not found and we're showing spinner, retry quickly
    let retryCount = 0
    const maxRetries = 20 // Reduced retries, faster interval
    const retryInterval = isGeocoding ? 10 : 100 // Faster retry when showing spinner
    
    const tryUpdate = () => {
      // Re-find input if not already found
      if (!postcodeInput) {
        postcodeInput = findPostcodeInput()
      }
      
      if (!postcodeInput) {
        retryCount++
        if (retryCount < maxRetries) {
          setTimeout(tryUpdate, retryInterval)
        }
        return
      }
      
      // Continue with the rest of the function...

      // Find the question container - try multiple selectors
      let questionContainer = postcodeInput.closest('.sv-question')
      
      if (!questionContainer) {
        questionContainer = postcodeInput.closest('.sv-row')
      }
      
      if (!questionContainer) {
        questionContainer = postcodeInput.closest('[class*="question"]')
      }
      
      if (!questionContainer) {
        questionContainer = postcodeInput.closest('.sv-question__content')
      }
      
      if (!questionContainer) {
        questionContainer = postcodeInput.parentElement?.parentElement as HTMLElement
      }

      if (!questionContainer) {
        if (retryCount < maxRetries) {
          setTimeout(tryUpdate, 100)
        } else {
          // Fallback: try to insert directly after the input
          insertIndicatorAfterInput(postcodeInput, isGeocoding, success, model)
        }
        return
      }

      // Find or create the status indicator container - ensure only ONE exists
      // First, remove ALL existing indicators (both regular and quick)
      const allExistingIndicators = (questionContainer as HTMLElement).querySelectorAll(
        '.geocoding-indicator, .geocoding-indicator-quick, [data-geocoding-indicator="true"]'
      )
      allExistingIndicators.forEach(indicator => {
        if (indicator && indicator.parentNode) {
          try {
            indicator.remove()
          } catch (e) {
            // Element might have already been removed
          }
        }
      })
      
      // Also check and remove any indicators near the input
      if (postcodeInput.parentElement) {
        const siblings = Array.from(postcodeInput.parentElement.children)
        siblings.forEach(sibling => {
          if (sibling !== postcodeInput && 
              (sibling.classList.contains('geocoding-indicator') || 
               sibling.classList.contains('geocoding-indicator-quick') ||
               sibling.getAttribute('data-geocoding-indicator') === 'true')) {
            if (sibling && sibling.parentNode) {
              try {
                sibling.remove()
              } catch (e) {
                // Element might have already been removed
              }
            }
          }
        })
      }
      
      // Now create a SINGLE fresh indicator
      const statusContainer = document.createElement('div')
      statusContainer.className = 'geocoding-indicator'
      statusContainer.setAttribute('data-geocoding-indicator', 'true')
      
      // Enhanced styling for better visibility
      statusContainer.style.display = 'flex'
      statusContainer.style.alignItems = 'center'
      statusContainer.style.gap = '10px'
      statusContainer.style.marginTop = '12px'
      statusContainer.style.marginBottom = '8px'
      statusContainer.style.fontSize = '0.875rem'
      statusContainer.style.minHeight = '28px'
      statusContainer.style.width = '100%'
      statusContainer.style.justifyContent = 'flex-start'
      statusContainer.style.padding = '6px 12px'
      statusContainer.style.borderRadius = '6px'
      statusContainer.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
      statusContainer.style.transition = 'all 0.3s ease'
      
      // Insert after the input field - try multiple locations
      const inputContainer = postcodeInput.closest('.sv-question__content') || 
                             postcodeInput.closest('.sv-question__input') ||
                             postcodeInput.closest('.sv-row') ||
                             postcodeInput.parentElement
      
      if (inputContainer) {
        inputContainer.appendChild(statusContainer)
      } else {
        // Fallback: insert after postcode input
        const parent = postcodeInput.parentElement as HTMLElement | null
        if (parent) {
          if (postcodeInput.nextSibling) {
            parent.insertBefore(statusContainer, postcodeInput.nextSibling)
          } else {
            parent.appendChild(statusContainer)
          }
        } else {
          // Last resort: insert after the input itself
          postcodeInput.insertAdjacentElement('afterend', statusContainer)
        }
      }
      
      // Update the indicator content
      if (isGeocoding) {
        statusContainer.innerHTML = `
          <div class="geocoding-spinner" style="width: 20px; height: 20px; border: 3px solid #3b82f6; border-top-color: transparent; border-right-color: rgba(59, 130, 246, 0.3); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; flex-shrink: 0;"></div>
          <span style="color: #3b82f6; font-weight: 600; font-size: 0.9rem;">Finding location...</span>
        `
        statusContainer.style.display = 'flex'
        statusContainer.style.color = '#3b82f6'
        statusContainer.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
        statusContainer.style.border = '1px solid rgba(59, 130, 246, 0.2)'
      } else if (success) {
        const location = model.getValue('location')
        if (location && !location.includes('Please set') && !location.includes('not found') && !location.includes('Error')) {
          statusContainer.innerHTML = `
            <svg style="width: 20px; height: 20px; color: #10b981; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span style="color: #10b981; font-weight: 600; font-size: 0.9rem;">Location found! ✓</span>
          `
          statusContainer.style.display = 'flex'
          statusContainer.style.color = '#10b981'
          statusContainer.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
          statusContainer.style.border = '1px solid rgba(16, 185, 129, 0.2)'
        } else {
          statusContainer.style.display = 'none'
        }
      } else {
        statusContainer.style.display = 'none'
      }
    }
    
    // Helper function for fallback insertion
    const insertIndicatorAfterInput = (input: HTMLInputElement, isGeocoding: boolean, success: boolean, model: Model) => {
      // Remove ALL existing indicators first (including any in parent)
      const allIndicators = document.querySelectorAll(
        '.geocoding-indicator, .geocoding-indicator-quick, [data-geocoding-indicator="true"]'
      )
      allIndicators.forEach(indicator => {
        if (indicator && indicator.parentNode) {
          try {
            indicator.remove()
          } catch (e) {
            // Element might have already been removed
          }
        }
      })
      
      // Also remove siblings
      if (input.parentElement) {
        const siblings = Array.from(input.parentElement.children)
        siblings.forEach(sibling => {
          if (sibling !== input && 
              (sibling.classList.contains('geocoding-indicator') || 
               sibling.classList.contains('geocoding-indicator-quick') ||
               sibling.getAttribute('data-geocoding-indicator') === 'true')) {
            if (sibling && sibling.parentNode) {
              try {
                sibling.remove()
              } catch (e) {
                // Element might have already been removed
              }
            }
          }
        })
      }
      
      // Create SINGLE fresh indicator
      const statusContainer = document.createElement('div')
      statusContainer.className = 'geocoding-indicator'
      statusContainer.setAttribute('data-geocoding-indicator', 'true')
      statusContainer.style.display = 'flex'
      statusContainer.style.alignItems = 'center'
      statusContainer.style.gap = '10px'
      statusContainer.style.marginTop = '12px'
      statusContainer.style.fontSize = '0.875rem'
      statusContainer.style.minHeight = '28px'
      statusContainer.style.width = '100%'
      statusContainer.style.justifyContent = 'flex-start'
      statusContainer.style.padding = '6px 12px'
      statusContainer.style.borderRadius = '6px'
      
      input.insertAdjacentElement('afterend', statusContainer)
      
      if (isGeocoding) {
        statusContainer.innerHTML = `
          <div class="geocoding-spinner" style="width: 20px; height: 20px; border: 3px solid #3b82f6; border-top-color: transparent; border-right-color: rgba(59, 130, 246, 0.3); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; flex-shrink: 0;"></div>
          <span style="color: #3b82f6; font-weight: 600; font-size: 0.9rem;">Finding location...</span>
        `
        statusContainer.style.display = 'flex'
        statusContainer.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
        statusContainer.style.border = '1px solid rgba(59, 130, 246, 0.2)'
      } else if (success) {
        const location = model.getValue('location')
        if (location && !location.includes('Please set') && !location.includes('not found') && !location.includes('Error')) {
          statusContainer.innerHTML = `
            <svg style="width: 20px; height: 20px; color: #10b981; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span style="color: #10b981; font-weight: 600; font-size: 0.9rem;">Location found! ✓</span>
          `
          statusContainer.style.display = 'flex'
          statusContainer.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
          statusContainer.style.border = '1px solid rgba(16, 185, 129, 0.2)'
        } else {
          statusContainer.style.display = 'none'
        }
      } else {
        statusContainer.style.display = 'none'
      }
    }
    
    tryUpdate()
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (indicatorUpdateTimeoutRef.current) {
        clearTimeout(indicatorUpdateTimeoutRef.current)
      }
    }
  }, [])

  const handlePostcodeGeocode = async (postcodeValue: string, model: Model) => {
    const trimmedValue = postcodeValue.trim()
    
    console.log('[handlePostcodeGeocode] Called with:', trimmedValue)
    
    // Prevent duplicate geocoding calls for the same value
    if (lastGeocodedValueRef.current === trimmedValue && geocodingRef.current) {
      console.log('[handlePostcodeGeocode] Skipping duplicate call')
      return
    }
    
    // Clear location immediately when postcode is cleared
    if (!trimmedValue) {
      lastGeocodedValueRef.current = ''
      model.setValue('location', '')
      model.setValue('latitude', '')
      model.setValue('longitude', '')
      updateGeocodingIndicator(model, false, false)
      return
    }

    // Get country - use cached value or try to get from profile
    let country = userCountry
    
    console.log('[handlePostcodeGeocode] Country:', country)
    
    // Check if we have enough digits to trigger geocoding (5+ digits or Portuguese format)
    const digitsOnly = trimmedValue.replace(/\D/g, '')
    const isPortugueseFormat = trimmedValue.includes('-') && 
                               trimmedValue.length === 8 && 
                               trimmedValue.match(/^\d{4}-\d{3}$/) !== null &&
                               digitsOnly.length === 7
    
    console.log('[handlePostcodeGeocode] Validation:', { digitsOnly, isPortugueseFormat, length: trimmedValue.length })
    
    // Only show spinner if postcode looks complete (Portuguese format or 5+ digits)
    // But don't trigger actual geocoding until it's fully validated
    const looksComplete = isPortugueseFormat || digitsOnly.length >= 7
    
    if (!looksComplete) {
      console.log('[handlePostcodeGeocode] Not complete yet, returning')
      // Not complete yet, hide spinner and clear location
      model.setValue('location', '')
      updateGeocodingIndicator(model, false, false)
      setGeocoding(false)
      geocodingRef.current = false
      return
    }

    // Now get country if needed (async) - but don't wait if we already have it
    if (!country) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('country')
            .eq('id', user.id)
            .single()
          
          if (profile?.country) {
            country = profile.country
            setUserCountry(country)
          }
        }
      } catch (error) {
        // Error loading country
      }
    }

    if (!country) {
      // Default to Portugal for non-logged-in users or users without country set
      country = 'Portugal'
      console.log('[handlePostcodeGeocode] Using default country: Portugal')
    }

    const formattedPostcode = formatPostcodeForCountry(postcodeValue, country)
    
    console.log('[handlePostcodeGeocode] Formatted postcode:', formattedPostcode)
    
    // Check if postcode is actually complete (proper validation)
    const isComplete = isPostcodeComplete(formattedPostcode, country)
    
    console.log('[handlePostcodeGeocode] Is complete?', isComplete)
    
    if (!isComplete) {
      console.log('[handlePostcodeGeocode] Not complete, clearing and returning')
      // Postcode incomplete, clear location but don't show error yet
      model.setValue('location', '')
      updateGeocodingIndicator(model, false, false)
      setGeocoding(false)
      geocodingRef.current = false
      // Remove visual feedback from input
      const postcodeInput = document.querySelector('input[name="postcode"]') as HTMLInputElement
      if (postcodeInput) {
        postcodeInput.style.borderColor = ''
        postcodeInput.style.boxShadow = ''
      }
      return
    }

    console.log('[handlePostcodeGeocode] Starting geocoding...')
    
    // Ensure spinner is still showing (in case it wasn't shown earlier)
    if (!geocoding) {
      setGeocoding(true)
      geocodingRef.current = true
      updateGeocodingIndicator(model, true, false)
    }
    
    // Mark this value as being geocoded
    lastGeocodedValueRef.current = trimmedValue
    
    try {
      console.log('[handlePostcodeGeocode] Calling geocodePostcode API...')
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Geocoding timeout after 10 seconds')), 10000)
      })
      
      const geocodePromise = geocodePostcode(formattedPostcode, country)
      
      const result = await Promise.race([geocodePromise, timeoutPromise])
      console.log('[handlePostcodeGeocode] API result:', result)
      
      if (result) {
        const address = result.closest_address || result.display_name
        model.setValue('location', address)
        model.setValue('latitude', result.latitude)
        model.setValue('longitude', result.longitude)
        console.log('[handlePostcodeGeocode] Success! Address:', address)
        // Show success indicator
        updateGeocodingIndicator(model, false, true)
        // Hide success indicator after 3 seconds
        setTimeout(() => {
          updateGeocodingIndicator(model, false, false)
        }, 3000)
      } else {
        console.log('[handlePostcodeGeocode] No result returned')
        model.setValue('location', 'Postcode not found. Please check and try again.')
        model.setValue('latitude', '')
        model.setValue('longitude', '')
        updateGeocodingIndicator(model, false, false)
      }
    } catch (error) {
      console.error('[handlePostcodeGeocode] Error:', error)
      model.setValue('location', 'Error geocoding postcode. Please try again.')
      model.setValue('latitude', '')
      model.setValue('longitude', '')
      updateGeocodingIndicator(model, false, false)
    } finally {
      console.log('[handlePostcodeGeocode] Cleanup - hiding spinner')
      setGeocoding(false)
      geocodingRef.current = false // Update ref for validation callbacks
      // Remove visual feedback from input
      setTimeout(() => {
        const postcodeInput = document.querySelector('input[name="postcode"]') as HTMLInputElement
        if (postcodeInput) {
          postcodeInput.style.borderColor = ''
          postcodeInput.style.boxShadow = ''
        }
      }, 100)
    }
  }

  // Handle Enter key to trigger Continue button
  useEffect(() => {
    if (!surveyModel) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Enter key
      if (event.key !== 'Enter') return

      const target = event.target as HTMLElement

      // Don't trigger if user is typing in a textarea (description field)
      if (target.tagName === 'TEXTAREA') {
        // Allow Enter in textarea for multi-line input
        return
      }

      // If user is in a dropdown (SELECT), allow Enter to proceed after selection
      // The dropdown selection will be handled by the browser, then we proceed
      if (target.tagName === 'SELECT') {
        const select = target as HTMLSelectElement
        // Wait a moment for the dropdown selection to complete, then proceed
        setTimeout(() => {
          event.preventDefault()
          if (surveyModel.currentPageNo < surveyModel.pageCount - 1) {
            if (surveyModel.currentPage.validate(true)) {
              surveyModel.nextPage()
            }
          } else {
            // On last page, complete the survey (show preview)
            if (surveyModel.currentPage.validate(true)) {
              surveyModel.doComplete()
            }
          }
        }, 50)
        return
      }

      // Prevent default form submission
      event.preventDefault()

      // Check if we can go to next page
      if (surveyModel.currentPageNo < surveyModel.pageCount - 1) {
        // Validate current page before moving forward
        if (surveyModel.currentPage.validate(true)) {
          surveyModel.nextPage()
        }
      } else {
        // On last page, try to complete the survey (show preview)
        if (surveyModel.currentPage.validate(true)) {
          surveyModel.doComplete()
        }
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [surveyModel])

  // Restore postcode input handling for geocoding (without blocking numeric input)
  useEffect(() => {
    if (!surveyModel) return

    const setupPostcodeInput = () => {
      // Try multiple selectors to find the postcode input
      let postcodeInput = document.querySelector('input[name="postcode"]') as HTMLInputElement
      
      if (!postcodeInput) {
        postcodeInput = document.querySelector('.sv-input[name="postcode"]') as HTMLInputElement
      }
      
      if (!postcodeInput) {
        const questionElement = document.querySelector('[data-name="postcode"]')
        if (questionElement) {
          postcodeInput = questionElement.querySelector('input') as HTMLInputElement
        }
      }
      
      if (!postcodeInput) {
        const allInputs = document.querySelectorAll('input[type="text"], input:not([type])')
        postcodeInput = Array.from(allInputs).find(input => {
          const htmlInput = input as HTMLInputElement
          const questionContainer = htmlInput.closest('[data-name="postcode"]')
          return questionContainer !== null || htmlInput.name === 'postcode'
        }) as HTMLInputElement
      }
      
      if (postcodeInput && !postcodeInput.hasAttribute('data-geocoding-attached')) {
        postcodeInput.setAttribute('data-geocoding-attached', 'true')
        
        // Handle input with auto-formatting for Portuguese postcodes
        // Use passive listener to avoid blocking input
        postcodeInput.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement
          let value = target.value
          
          // Remove all non-digit characters
          const digitsOnly = value.replace(/\D/g, '')
          
          // Limit to 7 digits
          const limitedDigits = digitsOnly.slice(0, 7)
          
          // Auto-format Portuguese postcode: xxxx-xxx
          let formattedValue = limitedDigits
          if (limitedDigits.length > 4) {
            // Insert dash after 4 digits
            formattedValue = limitedDigits.slice(0, 4) + '-' + limitedDigits.slice(4)
          }
          
          // Update the input value
          target.value = formattedValue
          
          // Set cursor to end (simplest approach - no complex cursor logic)
          const newPos = formattedValue.length
          target.setSelectionRange(newPos, newPos)
          
          // Update SurveyJS model (this triggers onValueChanged which fires geocoding)
          if (surveyModel) {
            const question = surveyModel.getQuestionByName('postcode')
            if (question) {
              question.value = formattedValue
              formDataRef.current.postcode = formattedValue
            }
          }
        }, { passive: true })
        
        // Also sync on blur for safety
        postcodeInput.addEventListener('blur', (e) => {
          const target = e.target as HTMLInputElement
          let value = target.value.trim()
          
          // Format on blur as well
          const digitsOnly = value.replace(/\D/g, '')
          if (digitsOnly.length === 7) {
            value = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`
          } else if (digitsOnly.length > 7) {
            value = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 7)}`
          } else if (digitsOnly.length > 0) {
            value = digitsOnly
          }
          
          if (target.value !== value) {
            target.value = value
          }
          
          if (surveyModel) {
            const question = surveyModel.getQuestionByName('postcode')
            if (question && value) {
              question.value = value
              formDataRef.current.postcode = value
            }
          }
        })
      }
    }

    // Setup budget input to only accept numeric values (digits and decimal point)
    const setupBudgetInput = () => {
      let budgetInput = document.querySelector('input[name="budget"]') as HTMLInputElement
      
      if (!budgetInput) {
        budgetInput = document.querySelector('.sv-input[name="budget"]') as HTMLInputElement
      }
      
      if (!budgetInput) {
        const questionElement = document.querySelector('[data-name="budget"]')
        if (questionElement) {
          budgetInput = questionElement.querySelector('input') as HTMLInputElement
        }
      }
      
      if (budgetInput && !budgetInput.hasAttribute('data-budget-attached')) {
        budgetInput.setAttribute('data-budget-attached', 'true')
        
        // Handle input - only allow digits and one decimal point
        budgetInput.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement
          let value = target.value
          
          // Remove all characters except digits and decimal point
          let filtered = value.replace(/[^0-9.]/g, '')
          
          // Ensure only one decimal point
          const parts = filtered.split('.')
          if (parts.length > 2) {
            filtered = parts[0] + '.' + parts.slice(1).join('')
          }
          
          // Limit to 2 decimal places
          if (parts.length === 2 && parts[1].length > 2) {
            filtered = parts[0] + '.' + parts[1].slice(0, 2)
          }
          
          // Update the input value if it changed
          if (target.value !== filtered) {
            target.value = filtered
          }
          
          // Update SurveyJS model
          if (surveyModel) {
            const question = surveyModel.getQuestionByName('budget')
            if (question) {
              question.value = filtered
              formDataRef.current.budget = filtered
            }
          }
        }, { passive: true })
      }
    }

    // Initial setup
    setTimeout(setupPostcodeInput, 100)
    setTimeout(setupBudgetInput, 100)

    // Also setup when survey model changes pages
    if (surveyModel) {
      surveyModel.onCurrentPageChanged.add(() => {
        setTimeout(setupPostcodeInput, 100)
        setTimeout(setupBudgetInput, 100)
      })
    }

    // REMOVED: MutationObserver - it was too aggressive and caused input blocking when logged in
    // const observer = new MutationObserver(() => {
    //   setTimeout(setupPostcodeInput, 100)
    // })
    // observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      // observer.disconnect()
    }
  }, [surveyModel])

  // REMOVED: Budget input restrictions - SurveyJS handles this natively with inputType: 'number'

  // DISABLED: Auto-expand input fields - this was interfering with numeric input when logged in
  // The feature tried to dynamically resize input fields as users typed,
  // but the event listeners were preventing numeric input in the Budget field
  /*
  useEffect(() => {
    if (!surveyModel) return

    const expandInputDISABLED = (input: HTMLInputElement) => {
      // Create a temporary span to measure text width accurately
      const measure = document.createElement('span')
      const inputStyles = window.getComputedStyle(input)
      
      // Copy all relevant styles to the measurement element
      measure.style.visibility = 'hidden'
      measure.style.position = 'absolute'
      measure.style.whiteSpace = 'pre'
      measure.style.fontSize = inputStyles.fontSize
      measure.style.fontFamily = inputStyles.fontFamily
      measure.style.fontWeight = inputStyles.fontWeight
      measure.style.fontStyle = inputStyles.fontStyle
      measure.style.letterSpacing = inputStyles.letterSpacing
      measure.style.textTransform = inputStyles.textTransform
      
      // Use the actual value, or placeholder, or a minimum character
      const textToMeasure = input.value || input.placeholder || 'M'
      measure.textContent = textToMeasure
      
      document.body.appendChild(measure)

      // Get the measured width of the text content
      const textWidth = measure.offsetWidth
      
      // Get padding and border widths
      const paddingLeft = parseFloat(inputStyles.paddingLeft) || 0
      const paddingRight = parseFloat(inputStyles.paddingRight) || 0
      const borderLeft = parseFloat(inputStyles.borderLeftWidth) || 0
      const borderRight = parseFloat(inputStyles.borderRightWidth) || 0
      const totalPadding = paddingLeft + paddingRight + borderLeft + borderRight
      
      // Calculate width with min and max constraints
      const minWidth = 200 // Minimum width in pixels
      const maxWidth = 800 // Maximum width in pixels (increased significantly)
      // Add padding and extra buffer to ensure text doesn't get cut off
      const buffer = 20
      const newWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + totalPadding + buffer))

      input.style.width = `${newWidth}px`
      input.style.minWidth = `${newWidth}px`
      
      document.body.removeChild(measure)
    }

    const expandTextareaDISABLED = (textarea: HTMLTextAreaElement) => {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto'
      // Set height based on scrollHeight (content height)
      const minHeight = 100 // Minimum height in pixels
      const newHeight = Math.max(minHeight, textarea.scrollHeight)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = 'hidden' // Hide scrollbar, let it expand instead
    }

    const handleInputDISABLED = (event: Event) => {
      const target = event.target as HTMLElement
      
      if (target.tagName === 'INPUT' && (target instanceof HTMLInputElement) && (target.type === 'text' || target.type === 'number')) {
        expandInputDISABLED(target)
      } else if (target.tagName === 'TEXTAREA' && target instanceof HTMLTextAreaElement) {
        expandTextareaDISABLED(target)
      }
    }

    const setupInputsDISABLED = () => {
      // Attach event listeners to all text inputs
      const inputs = document.querySelectorAll('.sv-input[type="text"], .sv-input[type="number"]')
      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement
        
        // Skip if already set up (prevent duplicate listeners)
        if (htmlInput.hasAttribute('data-expand-listener')) return
        htmlInput.setAttribute('data-expand-listener', 'true')
        
        // Use passive event listeners and ensure they don't interfere with input
        htmlInput.addEventListener('input', handleInputDISABLED, { passive: true })
        htmlInput.addEventListener('keyup', handleInputDISABLED, { passive: true })
        // Expand on initial load if there's a value
        if (htmlInput.value) {
          expandInputDISABLED(htmlInput)
        }
        // Also expand when focused to show placeholder if needed
        htmlInput.addEventListener('focus', () => {
          setTimeout(() => expandInputDISABLED(htmlInput), 10)
        }, { passive: true })
      })

      // Attach event listeners to all textareas
      const textareas = document.querySelectorAll('.sv-textarea, textarea.sv-input')
      textareas.forEach((textarea) => {
        const htmlTextarea = textarea as HTMLTextAreaElement
        
        // Skip if already set up (prevent duplicate listeners)
        if (htmlTextarea.hasAttribute('data-expand-listener')) return
        htmlTextarea.setAttribute('data-expand-listener', 'true')
        
        // Use passive event listeners
        htmlTextarea.addEventListener('input', handleInputDISABLED, { passive: true })
        htmlTextarea.addEventListener('keyup', handleInputDISABLED, { passive: true })
        // Expand on initial load if there's a value
        if (htmlTextarea.value) {
          expandTextareaDISABLED(htmlTextarea)
        }
        // Also expand when focused
        htmlTextarea.addEventListener('focus', () => {
          setTimeout(() => expandTextareaDISABLED(htmlTextarea), 10)
        }, { passive: true })
      })
    }

    // Initial setup
    setTimeout(setupInputsDISABLED, 100)

    // Also setup when survey model changes pages
    if (surveyModel) {
      surveyModel.onCurrentPageChanged.add(() => {
        setTimeout(setupInputsDISABLED, 200)
      })
    }

    // REMOVED: MutationObserver - it was too aggressive and caused input blocking when logged in
    // const observer = new MutationObserver(() => {
    //   setTimeout(setupInputs, 100)
    // })
    // observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      // observer.disconnect()
    }
  }, [surveyModel])
  */

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
      setCategories([])
    }
  }

  const loadProfessions = async () => {
    try {
      // Import STANDARD_PROFESSIONS
      const { STANDARD_PROFESSIONS } = await import('@/lib/profession-constants')
      
      // Start with standard professions
      const allProfessions = new Set<string>(STANDARD_PROFESSIONS)
      
      // Also fetch professions from database (from profiles who are helpers)
      const { data: helpersData, error } = await supabase
        .from('profiles')
        .select('professions')
        .eq('is_helper', true)
        .not('professions', 'is', null)

      if (!error && helpersData) {
        // Add professions from database
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
      // Fallback to just standard professions
      const { STANDARD_PROFESSIONS } = await import('@/lib/profession-constants')
      setProfessions(STANDARD_PROFESSIONS)
    }
  }

  // Function to create task from form data
  const createTaskFromData = async (data: any) => {
    try {
      setError(null)
      
      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error('You must be logged in to create a task')
      }

      // If we have a pending image file, upload it first
      if (pendingImageFile && !uploadedImageUrl) {
        try {
          setImageUploading(true)
          const fileExt = pendingImageFile.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${authUser.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, pendingImageFile, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('images')
              .getPublicUrl(filePath)
            setUploadedImageUrl(urlData.publicUrl)
            data.image = urlData.publicUrl
            formDataRef.current.image = urlData.publicUrl
          }
          setPendingImageFile(null)
          setImageUploading(false)
        } catch (error) {
          console.error('Error uploading pending image:', error)
          setImageUploading(false)
        }
      }

      // Find category ID from category name or ID
      let categoryId = null
      let subCategoryId = null
      console.log('[createTaskFromData] Category debug:', {
        'data.category': data.category,
        'categoriesCount': categories.length,
        'categories': categories.map(c => ({ id: c.id, name: c.name }))
      })
      if (data.category) {
        const category = categories.find(c => c.name === data.category || c.id === data.category)
        console.log('[createTaskFromData] Found category:', category)
        if (category) {
          categoryId = category.id
        }
      }
      console.log('[createTaskFromData] Final categoryId:', categoryId)

      // Build task data object
      const taskDataToInsert: any = {
        title: data.title || 'Untitled Task',
        description: data.description || '',
        budget: data.budget && data.budget.toString().trim() ? parseFloat(data.budget.toString()) : null,
        category_id: categoryId,
        sub_category_id: subCategoryId,
        location: data.location || null,
        postcode: data.postcode?.trim() || null,
        country: data.country?.trim() || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        image_url: data.image || uploadedImageUrl || null,
        created_by: authUser.id,
        status: 'open',
      }
      
      console.log('%c[createTaskFromData] Task data to insert:', 'background: purple; color: white', taskDataToInsert)

      // Add required professions if task type is professional
      if (data.taskType === 'professional' && data.requiredProfession) {
        const professionArray = Array.isArray(data.requiredProfession) 
          ? data.requiredProfession 
          : [data.requiredProfession]
        if (professionArray.length > 0) {
          taskDataToInsert.required_professions = professionArray
        }
      }

      // Create task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert(taskDataToInsert)
        .select()
        .single()

      if (taskError) {
        // If error is about missing columns, try without them
        const errorMsg = taskError.message || ''
        const errorCode = taskError.code || ''
        
        if (errorMsg.includes('required_professions') || errorCode === 'PGRST204' || errorCode === '42703') {
          // Try without optional fields
          const { data: retryData, error: retryError } = await supabase
            .from('tasks')
            .insert({
              ...taskDataToInsert,
              required_professions: undefined
            })
            .select()
            .single()
          
          if (retryError) {
            throw retryError
          }
          
          if (retryData) {
            // Redirect to task page
            window.location.href = `/tasks/${retryData.id}`
            return
          }
        } else {
          throw taskError
        }
      }

      if (!taskData) {
        throw new Error('Failed to create task')
      }

      // Add image to task_images table if we have an image
      if (data.image || uploadedImageUrl) {
        const imageUrl = data.image || uploadedImageUrl
        await supabase
          .from('task_images')
          .insert({
            task_id: taskData.id,
            image_url: imageUrl,
            display_order: 0,
          })
      }

      // Redirect to task page
      window.location.href = `/tasks/${taskData.id}`
    } catch (error: any) {
      console.error('Error creating task:', error)
      setError(error.message || 'An error occurred while creating the task')
    }
  }

  // Handle Create Task button click
  const handleCreateTask = async () => {
    const model = surveyModel || (window as any).surveyModelInstance
    if (!model) return

    // Get all form data
    let data = model.data
    if (!data || Object.keys(data).length === 0) {
      data = formDataRef.current
    } else {
      // Merge with ref data to ensure we have all values
      data = { ...formDataRef.current, ...data }
    }

    // Check if user is logged in
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      // User not logged in - show login modal and store data
      // Store in both state and localStorage so it persists across page navigation
      setPendingTaskData(data)
      try {
        localStorage.setItem('pendingTaskData', JSON.stringify(data))
        if (pendingImageFile) {
          // Store image file as data URL for persistence
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) {
              localStorage.setItem('pendingImageDataUrl', e.target.result as string)
            }
          }
          reader.readAsDataURL(pendingImageFile)
        }
      } catch (error) {
        console.error('Error saving pending task data:', error)
      }
      setShowLoginModal(true)
      setShowPreviewModal(false)
      return
    }

    // User is logged in - create task
    await createTaskFromData(data)
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold">Error: {error}</p>
      </div>
    )
  }

  if (loading || !surveyModel) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SurveyJS form...</p>
          <p className="mt-2 text-sm text-gray-500">
            Categories: {categories.length} • Professions: {professions.length}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* SurveyJS Form Container - Distinctive Styling */}
      {/* Hide the form container when preview modal is showing to avoid showing SurveyJS preview underneath */}
      <div 
        className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 shadow-lg rounded-xl p-4 border-2 border-purple-200"
        style={{ display: showPreviewModal ? 'none' : 'block', paddingTop: '20px' }}
      >
        <div 
          className="surveyjs-form-wrapper" 
          style={{ marginTop: 0, paddingTop: 0 }}
          data-theme={currentTheme}
        >
          <Survey model={surveyModel} />
        </div>
        
        {/* React-controlled Image Preview - persists even if SurveyJS re-renders */}
        {imagePreviewDataUrl && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Image Preview:</p>
            <img 
              src={imagePreviewDataUrl} 
              alt="Upload preview" 
              className="max-w-full max-h-[300px] rounded-lg shadow-sm mx-auto"
              style={{ display: 'block' }}
            />
            {uploadedImageUrl ? (
              <p className="text-sm text-green-600 mt-2 text-center">✓ Image uploaded successfully</p>
            ) : imageUploading ? (
              <p className="text-sm text-blue-600 mt-2 text-center">Uploading to server...</p>
            ) : null}
          </div>
        )}
      </div>

      {submittedData && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submitted Form Data:</h3>
          <pre className="bg-white p-4 rounded border border-gray-300 overflow-auto text-sm">
            {JSON.stringify(submittedData, null, 2)}
          </pre>
          <p className="mt-4 text-sm text-gray-600">
            This is a preview. In production, this data would be used to create a task.
          </p>
        </div>
      )}

      {/* Preview Modal - matches task card size and shape */}
      {showPreviewModal && previewCardHtml && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            // Close modal if clicking on backdrop - same as X button
            if (e.target === e.currentTarget) {
              setShowPreviewModal(false)
              // Reset preview flags when closing
              previewGeneratedRef.current = false
              previewImageUrlRef.current = null
              lastPreviewHtmlRef.current = ''
              // Clear any pending preview generation
              if (previewGenerationTimeoutRef.current) {
                clearTimeout(previewGenerationTimeoutRef.current)
                previewGenerationTimeoutRef.current = null
              }
              const model = surveyModel || (window as any).surveyModelInstance
              if (model) {
                const savedData = { ...formDataRef.current }
                if (typeof model.cancelPreview === 'function') {
                  model.cancelPreview()
                }
                // Navigate to last form page so they can edit or submit
                const lastFormPageIndex = model.pages.length > 1 ? model.pages.length - 2 : 0
                model.currentPageNo = lastFormPageIndex
                setTimeout(() => {
                  Object.keys(savedData).forEach(key => {
                    const value = savedData[key]
                    if (value !== undefined && value !== null) {
                      model.setValue(key, value)
                    }
                  })
                  model.render()
                }, 100)
              }
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] p-6 relative max-h-[90vh] overflow-y-auto" style={{ maxWidth: '900px' }}>
            {/* Close button */}
            <button
              onClick={() => {
                setShowPreviewModal(false)
                // Reset preview flags when closing
                previewGeneratedRef.current = false
                previewImageUrlRef.current = null
                lastPreviewHtmlRef.current = ''
                // Clear any pending preview generation
                if (previewGenerationTimeoutRef.current) {
                  clearTimeout(previewGenerationTimeoutRef.current)
                  previewGenerationTimeoutRef.current = null
                }
                const model = surveyModel || (window as any).surveyModelInstance
                if (model) {
                  const savedData = { ...formDataRef.current }
                  
                  // Exit preview mode
                  if (typeof model.cancelPreview === 'function') {
                    model.cancelPreview()
                  }
                  
                  // Navigate to the last form page (image page) so they can edit or submit
                  const lastFormPageIndex = model.pages.length > 1 ? model.pages.length - 2 : 0
                  model.currentPageNo = lastFormPageIndex
                  
                  // Restore all values
                  setTimeout(() => {
                    Object.keys(savedData).forEach(key => {
                      const value = savedData[key]
                      if (value !== undefined && value !== null) {
                        model.setValue(key, value)
                      }
                    })
                    model.render()
                  }, 100)
                }
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Close preview"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Preview Card - matches task card styling (same as Browse Tasks) */}
            <div 
              className="bg-white rounded-lg shadow-md p-6 flex flex-col relative"
              style={{ width: '100%' }}
              dangerouslySetInnerHTML={{ __html: previewCardHtml }}
            />
            
            {/* Action buttons */}
            <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  // Reset preview flags when closing
                  previewGeneratedRef.current = false
                  previewImageUrlRef.current = null
                  lastPreviewHtmlRef.current = ''
                  // Clear any pending preview generation
                  if (previewGenerationTimeoutRef.current) {
                    clearTimeout(previewGenerationTimeoutRef.current)
                    previewGenerationTimeoutRef.current = null
                  }
                  const model = surveyModel || (window as any).surveyModelInstance
                  if (model) {
                    const savedData = { ...formDataRef.current }
                    if (typeof model.cancelPreview === 'function') {
                      model.cancelPreview()
                    }
                    // Go to first page to edit
                    model.currentPageNo = 0
                    setTimeout(() => {
                      Object.keys(savedData).forEach(key => {
                        const value = savedData[key]
                        if (value !== undefined && value !== null) {
                          model.setValue(key, value)
                        }
                      })
                      model.render()
                    }, 100)
                  }
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                ← Edit Task
              </button>
              <button
                onClick={handleCreateTask}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                ✓ Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('modal.loginRequired')}</h2>
              <p className="text-gray-600 mb-6">
                {t('modal.loginRequiredCreateTask')}
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/login?redirect=/tasks/new"
                  className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-md text-center hover:bg-primary-700 font-medium transition-colors"
                >
                  {t('modal.login')}
                </a>
                <a
                  href="/register?redirect=/tasks/new"
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-md text-center hover:bg-gray-300 font-medium transition-colors"
                >
                  {t('modal.signUp')}
                </a>
                <button
                  onClick={() => {
                    setShowLoginModal(false)
                    setPendingTaskData(null)
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  {t('modal.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

