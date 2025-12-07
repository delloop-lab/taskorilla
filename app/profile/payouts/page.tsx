'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/currency'
import { format } from 'date-fns'

export default function PayoutsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        router.push('/login?redirect=/profile/payouts')
        return
      }

      setUser(authUser)

      // Load profile to check IBAN
      const { data: profileData } = await supabase
        .from('profiles')
        .select('iban, full_name')
        .eq('id', authUser.id)
        .single()

      setProfile(profileData)

      // Load payouts for this helper
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select(`
          *,
          task:tasks (
            id,
            title,
            budget
          )
        `)
        .eq('helper_id', authUser.id)
        .order('created_at', { ascending: false })

      if (payoutsError) throw payoutsError

      setPayouts(payoutsData || [])
    } catch (err: any) {
      console.error('Error loading payouts:', err)
      setError(err.message || 'Error loading payouts')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading payouts...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Payouts</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* IBAN Warning */}
      {!profile?.iban && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">IBAN Required</h3>
              <p className="text-sm text-gray-700 mb-3">
                You need to add your IBAN to receive payouts. Without an IBAN, we cannot transfer funds to your account.
              </p>
              <a
                href="/profile"
                className="inline-block px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Add IBAN to Profile
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Payouts List */}
      {payouts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payouts Yet</h3>
          <p className="text-gray-600">
            When tasks you complete are paid for, payouts will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payout.task?.title || 'Unknown Task'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Task ID: {payout.task_id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatEuro(payout.amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payout.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                      {payout.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          {payout.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(payout.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payout.completed_at 
                        ? format(new Date(payout.completed_at), 'MMM d, yyyy')
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {payouts.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatEuro(payouts.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Total Paid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatEuro(payouts.reduce((sum, p) => sum + (p.status === 'processing' ? p.amount : 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {payouts.length}
              </div>
              <div className="text-sm text-gray-600">Total Payouts</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





