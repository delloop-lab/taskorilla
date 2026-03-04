import { NextRequest, NextResponse } from 'next/server'
import { normalizePortuguesePostcode, isPortugueseCountry } from '@/lib/postcode'

type GeoApiPtResult = {
  success: boolean
  source: 'geoapi.pt'
  error?: string
  status?: number
  result?: {
    latitude: number
    longitude: number
    postcode: string
    closest_address: string
  }
  raw?: unknown
}

type LegacyGeocodeResult = {
  success: boolean
  source: 'legacy-api' | 'legacy-area'
  error?: string
  status?: number
  result?: unknown
}

async function fetchFromGeoApiPt(postcode: string): Promise<GeoApiPtResult> {
  try {
    const url = `https://json.geoapi.pt/codigo_postal/${encodeURIComponent(postcode)}?json=1`
    const res = await fetch(url)

    if (!res.ok) {
      return {
        success: false,
        source: 'geoapi.pt',
        status: res.status,
        error: `HTTP ${res.status} from geoapi.pt`,
      }
    }

    const data: any = await res.json()

    const centro = data.centro || data.centroide
    if (!Array.isArray(centro) || centro.length < 2) {
      return {
        success: false,
        source: 'geoapi.pt',
        error: 'Missing centro/centroide in geoapi.pt response',
        raw: data,
      }
    }

    const [latRaw, lonRaw] = centro
    const latitude = Number(latRaw)
    const longitude = Number(lonRaw)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return {
        success: false,
        source: 'geoapi.pt',
        error: 'Invalid coordinates in geoapi.pt response',
        raw: data,
      }
    }

    const locality = data.Localidade ?? data.localidade ?? null
    const concelho = data.Concelho ?? data.concelho ?? null
    const distrito = data.Distrito ?? data.distrito ?? null

    const closestParts = [
      locality,
      concelho,
      distrito,
      postcode,
      'Portugal',
    ].filter(Boolean)

    const closest_address = closestParts.join(', ')

    return {
      success: true,
      source: 'geoapi.pt',
      result: {
        latitude,
        longitude,
        postcode,
        closest_address,
      },
      raw: data,
    }
  } catch (error: any) {
    return {
      success: false,
      source: 'geoapi.pt',
      error: error?.message ?? 'Unknown geoapi.pt error',
    }
  }
}

async function fetchFromLegacyGeocode(
  requestUrl: URL,
  originalParams: URLSearchParams,
  normalizedPostcode: string | null
): Promise<LegacyGeocodeResult> {
  try {
    const legacyParams = new URLSearchParams()
    const keys = ['q', 'postcode', 'country']

    keys.forEach((key) => {
      const value = originalParams.get(key)
      if (value) {
        legacyParams.set(key, value)
      }
    })

    // For testing: if we detected a valid Portuguese postcode from the input
    // but no explicit postcode param was provided, pass it through so that
    // the legacy /api/geocode can apply its strict postcode logic.
    if (!legacyParams.get('postcode') && normalizedPostcode) {
      legacyParams.set('postcode', normalizedPostcode)
    }

    const legacyUrl = `${requestUrl.origin}/api/geocode?${legacyParams.toString()}`

    const res = await fetch(legacyUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return {
        success: false,
        source: 'legacy-api',
        status: res.status,
        error: `HTTP ${res.status} from /api/geocode`,
      }
    }

    const data = await res.json()

    return {
      success: true,
      source: 'legacy-api',
      result: data,
      status: res.status,
    }
  } catch (error: any) {
    return {
      success: false,
      source: 'legacy-api',
      error: error?.message ?? 'Unknown legacy geocode error',
    }
  }
}

async function fetchFromLegacyAreaFallback(
  requestUrl: URL,
  originalParams: URLSearchParams,
  areaCode: string | null
): Promise<LegacyGeocodeResult> {
  if (!areaCode) {
    return {
      success: false,
      source: 'legacy-area',
      error: 'Not attempted (no area code derived from postcode)',
    }
  }

  try {
    const params = new URLSearchParams()
    const country = originalParams.get('country')
    const q = originalParams.get('q')

    if (q) {
      params.set('q', q)
    }
    if (country) {
      params.set('country', country)
    }

    // Force postcode to area code (e.g. 8600)
    params.set('postcode', areaCode)

    const urlWithArea = `${requestUrl.origin}/api/geocode?${params.toString()}`

    const res = await fetch(urlWithArea, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      return {
        success: false,
        source: 'legacy-area',
        status: res.status,
        error: `HTTP ${res.status} from /api/geocode (area fallback)`,
      }
    }

    const data = await res.json()

    return {
      success: true,
      source: 'legacy-area',
      result: data,
      status: res.status,
    }
  } catch (error: any) {
    return {
      success: false,
      source: 'legacy-area',
      error: error?.message ?? 'Unknown legacy area fallback error',
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const searchParams = url.searchParams

  const rawQ = searchParams.get('q')?.trim() || null
  const postcodeParam = searchParams.get('postcode')?.trim() || null
  const countryParam = searchParams.get('country')?.trim() || null

  const q = rawQ || postcodeParam || null

  let normalizedPostcode: string | null = null
  if (postcodeParam) {
    normalizedPostcode = normalizePortuguesePostcode(postcodeParam)
  }

  if (!normalizedPostcode && q) {
    normalizedPostcode = normalizePortuguesePostcode(q)
  }

  const isPortugalCountry =
    !countryParam || isPortugueseCountry(countryParam)

  const shouldAttemptGeoApi = !!normalizedPostcode && isPortugalCountry
  const areaCode = normalizedPostcode ? normalizedPostcode.split('-')[0] : null

  const legacyPromise = fetchFromLegacyGeocode(url, searchParams, normalizedPostcode)
  const legacyAreaPromise = fetchFromLegacyAreaFallback(url, searchParams, areaCode)
  const geoApiPromise = shouldAttemptGeoApi
    ? fetchFromGeoApiPt(normalizedPostcode as string)
    : Promise.resolve<GeoApiPtResult>({
        success: false,
        source: 'geoapi.pt',
        error: normalizedPostcode
          ? 'Not attempted (country is not Portugal)'
          : 'Not attempted (no valid Portuguese postcode detected)',
      })

  const [legacy, legacyArea, geoapi] = await Promise.all([legacyPromise, legacyAreaPromise, geoApiPromise])

  return NextResponse.json({
    input: {
      q,
      postcode: postcodeParam,
      country: countryParam,
      normalizedPostcode,
    },
    geoapi,
    legacy,
    legacyArea,
  })
}

