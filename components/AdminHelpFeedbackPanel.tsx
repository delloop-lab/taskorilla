'use client'

import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { supabase } from '@/lib/supabase'

type FeedbackSeriesRow = {
  date: string
  yes: number
  no: number
  total: number
}

type GuideBreakdownRow = {
  guideSlug: string
  guideTitle: string
  yes: number
  no: number
  total: number
  helpfulRate: number
  lastFeedbackAt: string
}

type HelpFeedbackStatsResponse = {
  range: string
  totals: {
    totalVotes: number
    yesVotes: number
    noVotes: number
    helpfulRate: number
  }
  series: FeedbackSeriesRow[]
  guides: GuideBreakdownRow[]
}

export default function AdminHelpFeedbackPanel() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<HelpFeedbackStatsResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch(`/api/admin/help-feedback-stats?range=${range}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to load help feedback stats')
        }
        setStats(payload)
      } catch (err: any) {
        setError(err?.message || 'Failed to load help feedback stats')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [range])

  const chartData = useMemo(() => {
    const series = stats?.series || []
    return {
      labels: series.map((s) =>
        new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'Yes',
          data: series.map((s) => s.yes),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'No',
          data: series.map((s) => s.no),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          tension: 0.35,
          fill: true,
        },
      ],
    }
  }, [stats])

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Help Feedback</h3>
          <p className="text-sm text-gray-600">Was this guide helpful? votes and trends</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as '7d' | '30d' | '90d')}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading help feedback stats...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Total Votes</p>
              <p className="text-2xl font-bold text-blue-700">{stats.totals.totalVotes}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Helpful Rate</p>
              <p className="text-2xl font-bold text-green-700">{stats.totals.helpfulRate}%</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Yes Votes</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.totals.yesVotes}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">No Votes</p>
              <p className="text-2xl font-bold text-red-700">{stats.totals.noVotes}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h4 className="text-lg font-semibold mb-3">Feedback Trend</h4>
            <div style={{ height: '280px' }}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' as const } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700">Guide</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Yes</th>
                  <th className="text-right p-3 font-semibold text-gray-700">No</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Helpful %</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Total</th>
                  <th className="text-right p-3 font-semibold text-gray-700">Last Feedback</th>
                </tr>
              </thead>
              <tbody>
                {stats.guides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No feedback votes yet for this period.
                    </td>
                  </tr>
                ) : (
                  stats.guides.map((row) => (
                    <tr key={row.guideSlug} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-gray-800">{row.guideTitle}</td>
                      <td className="p-3 text-right text-green-700 font-medium">{row.yes}</td>
                      <td className="p-3 text-right text-red-700 font-medium">{row.no}</td>
                      <td className="p-3 text-right text-gray-800">{row.helpfulRate}%</td>
                      <td className="p-3 text-right text-gray-700">{row.total}</td>
                      <td className="p-3 text-right text-gray-600">
                        {new Date(row.lastFeedbackAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

