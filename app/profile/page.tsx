'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Review } from '@/lib/types'
import { format } from 'date-fns'
import { geocodePostcode } from '@/lib/geocoding'
import { isProfileComplete, getMissingFields } from '@/lib/profile-utils'

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setupRequired = searchParams.get('setup') === 'required'
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
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

      // Check if profile is complete and show modal if needed
      if (data && !isProfileComplete(data)) {
        setShowSetupModal(true)
        // Auto-enable editing if setup is required
        if (setupRequired) {
          setEditing(true)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostcodeChange = async (value: string) => {
    setPostcode(value)
    setGeocodeError(null)
    
    // Only geocode if postcode is complete (not while typing)
    if (value.trim() && country.trim()) {
      // Check if postcode is complete using the helper function
      const { isPostcodeComplete } = await import('@/lib/geocoding')
      
      if (isPostcodeComplete(value.trim(), country.trim())) {
        setGeocoding(true)
        try {
          const result = await geocodePostcode(value.trim(), country.trim())
          if (result) {
            // Postcode is valid, will be saved with lat/lng
          } else {
            setGeocodeError('Could not find location for this postcode and country')
          }
        } catch (error: any) {
          console.error('Geocoding error:', error)
          setGeocodeError('Error geocoding postcode')
        } finally {
          setGeocoding(false)
        }
      }
      // If postcode is incomplete, don't show error yet - user is still typing
    } else if (value.trim() && !country.trim()) {
      setGeocodeError('Please select a country first')
    }
  }

  const handleCountryChange = async (value: string) => {
    setCountry(value)
    setGeocodeError(null)
    
    // Re-geocode postcode if it's already entered
    if (postcode.trim().length >= 4 && value.trim()) {
      setGeocoding(true)
      try {
        const result = await geocodePostcode(postcode.trim(), value.trim())
        if (result) {
          // Postcode is valid
        } else {
          setGeocodeError('Could not find location for this postcode and country')
        }
      } catch (error: any) {
        console.error('Geocoding error:', error)
        setGeocodeError('Error geocoding postcode')
      } finally {
        setGeocoding(false)
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

      // Geocode postcode if provided - ALWAYS re-geocode to ensure accuracy
      let latitude = null
      let longitude = null
      if (postcode.trim().length >= 4 && country.trim()) {
        const result = await geocodePostcode(postcode.trim(), country.trim())
        if (result) {
          latitude = result.latitude
          longitude = result.longitude
          console.log(`✅ Profile geocoded "${postcode}" to:`, {
            lat: latitude,
            lng: longitude,
            display_name: result.display_name
          })
        } else {
          console.error(`❌ Failed to geocode postcode "${postcode}"`)
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName.trim(),
          company_name: companyName.trim() || null,
          postcode: postcode.trim() || null,
          country: country.trim() || null,
          phone_country_code: phoneCountryCode.trim() || null,
          phone_number: phoneNumber.trim() || null,
          latitude: latitude,
          longitude: longitude,
        })
        .eq('id', user.id)

      if (error) throw error

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

          setEditing(false)
          setStatusMessage('Profile updated successfully.')

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

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
              <div className="h-24 w-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-2xl font-semibold text-gray-500">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${profile.full_name || user.email}'s avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile.full_name?.[0] || user.email?.[0] || '?').toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Profile Photo</p>
                <p className="text-sm text-gray-500 mb-3">
                  Upload a square image (recommended 256x256). Supported formats: JPG, PNG.
                </p>
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
                  {!geocodeError && postcode.trim().length >= 4 && country.trim() && !geocoding && (
                    <p className="mt-1 text-sm text-green-600">✓ Postcode will be saved</p>
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

            {editing && (
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={handleUpdateProfile}
                  className="bg-primary-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
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

        {averageRating !== null && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rating</h2>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-amber-600">
                ★ {averageRating.toFixed(1)}
              </span>
              <span className="text-gray-600">
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </div>
        )}

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
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          {(review.reviewer?.full_name?.[0] || review.reviewer?.email?.[0] || '?').toUpperCase()}
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
                    <div className="text-amber-600 font-semibold">
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
    </div>
  )
}


