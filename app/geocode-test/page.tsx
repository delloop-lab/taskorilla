'use client'

import React, { useState } from 'react'

type GeocodeCompareResponse = {
  input: {
    q: string | null
    postcode: string | null
    country: string | null
    normalizedPostcode: string | null
  }
  geoapi: {
    success: boolean
    source: string
    error?: string
    status?: number
    result?: any
  }
  legacy: {
    success: boolean
    source: string
    error?: string
    status?: number
    result?: any
  }
  legacyArea: {
    success: boolean
    source: string
    error?: string
    status?: number
    result?: any
  }
}

export default function GeocodeTestPage() {
  const [input, setInput] = useState('')
  const [country, setCountry] = useState('Portugal')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GeocodeCompareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const params = new URLSearchParams()
      if (input.trim()) {
        params.set('q', input.trim())
      }
      if (country.trim()) {
        params.set('country', country.trim())
      }

      const res = await fetch(`/api/geocode-compare?${params.toString()}`)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const json = (await res.json()) as GeocodeCompareResponse
      setData(json)
    } catch (err: any) {
      setError(err?.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Geocode Debug (GeoAPI.pt vs existing API)</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded border bg-white p-4 shadow-sm">
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Postcode or query
            <input
              type="text"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. 8600-616 or 8600-616, Lagos"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Country (optional)
            <input
              type="text"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="Portugal"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Testing…' : 'Compare providers'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {data && (
        <div className="space-y-4">
          <section className="rounded border bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold">Input</h2>
            <pre className="max-h-48 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
              {JSON.stringify(data.input, null, 2)}
            </pre>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">GeoAPI.pt</h2>
                <span
                  className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${
                    data.geoapi.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  GEOAPI.PT {data.geoapi.success ? '✓' : '✕'}
                </span>
              </div>
              <p className="mb-2 text-xs text-gray-700">
                <span className="font-semibold">Coords:</span>{' '}
                {data.geoapi.result && data.geoapi.result.latitude && data.geoapi.result.longitude
                  ? `${data.geoapi.result.latitude}, ${data.geoapi.result.longitude}`
                  : 'n/a'}
              </p>
              <pre className="max-h-80 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
                {JSON.stringify(data.geoapi, null, 2)}
              </pre>
            </section>

            <section className="rounded border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Existing /api/geocode (full postcode)</h2>
                <span
                  className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${
                    data.legacy.success ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  LEGACY {data.legacy.success ? '✓' : '✕'}
                </span>
              </div>
              <p className="mb-2 text-xs text-gray-700">
                <span className="font-semibold">Coords:</span>{' '}
                {data.legacy.result &&
                (data.legacy.result as any).result &&
                (data.legacy.result as any).result.latitude &&
                (data.legacy.result as any).result.longitude
                  ? `${(data.legacy.result as any).result.latitude}, ${(data.legacy.result as any).result.longitude}`
                  : 'n/a'}
              </p>
              <pre className="max-h-80 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
                {JSON.stringify(data.legacy, null, 2)}
              </pre>
            </section>

            <section className="rounded border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Existing /api/geocode (area code XXXX)</h2>
                <span
                  className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${
                    data.legacyArea.success ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  LEGACY AREA {data.legacyArea.success ? '✓' : '✕'}
                </span>
              </div>
              <p className="mb-2 text-xs text-gray-700">
                <span className="font-semibold">Coords:</span>{' '}
                {data.legacyArea.result &&
                (data.legacyArea.result as any).result &&
                (data.legacyArea.result as any).result.latitude &&
                (data.legacyArea.result as any).result.longitude
                  ? `${(data.legacyArea.result as any).result.latitude}, ${(data.legacyArea.result as any).result.longitude}`
                  : 'n/a'}
              </p>
              <pre className="max-h-80 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
                {JSON.stringify(data.legacyArea, null, 2)}
              </pre>
            </section>
          </div>
        </div>
      )}
    </main>
  )
}

