'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if user has a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      // Check for error params first
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      if (errorParam || errorDescription) {
        setError(errorDescription || errorParam || 'Invalid or expired reset link')
        setSessionError(true)
        setCheckingSession(false)
        return
      }

      // Check URL hash for tokens (Supabase sends tokens in hash fragment)
      const hash = window.location.hash
      if (hash) {
        // Parse hash parameters
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        if (accessToken && type === 'recovery') {
          // Set the session using the tokens from the hash
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })
          
          if (data.session && !sessionError) {
            // Clear the hash from URL for cleaner display
            window.history.replaceState(null, '', window.location.pathname)
            setSessionError(false)
            setCheckingSession(false)
            return
          } else {
            console.error('Session error:', sessionError)
            setError('Failed to verify reset link. Please try again.')
            setSessionError(true)
            setCheckingSession(false)
            return
          }
        }
      }

      // Check if we already have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // We have a valid session, user can reset password
        setSessionError(false)
        setCheckingSession(false)
      } else {
        // No valid session found
        setError('Your password reset link has expired or is invalid. Please request a new one.')
        setSessionError(true)
        setCheckingSession(false)
      }
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) {
          setSessionError(false)
          setError(null)
          setCheckingSession(false)
        }
      }
    })

    checkSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error('Password update error:', error)
        if (error.message.includes('session')) {
          setError('Your reset link has expired. Please request a new one.')
          setSessionError(true)
        } else {
          setError(error.message || 'An error occurred. Please try again.')
        }
        return
      }

      setSuccess(true)
      
      // Sign out the user so they can log in with their new password
      await supabase.auth.signOut()
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login?reset=success')
      }, 3000)
    } catch (error: any) {
      console.error('Unexpected error:', error)
      setError(error.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Password updated!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully reset. You'll be redirected to the login page shortly.
            </p>
          </div>
          <div className="text-center">
            <Link
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Go to sign in now
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="text-gray-600">Verifying your reset link...</p>
        </div>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Link expired
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error || 'Your password reset link has expired or is invalid.'}
            </p>
          </div>
          <div className="text-center space-y-4">
            <Link
              href="/forgot-password"
              className="inline-block w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Request a new reset link
            </Link>
            <Link
              href="/login"
              className="inline-block font-medium text-primary-600 hover:text-primary-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                New password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="relative">
              <label htmlFor="confirm-password" className="sr-only">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}


