import { NextRequest, NextResponse } from 'next/server'

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/'
const FILENAME = 'taskorilla-profile-qr.png'

/**
 * GET /api/qr-download?data=<url>
 * Proxies the QR code image and returns it with Content-Disposition: attachment
 * so the browser downloads the file instead of opening it in a new tab.
 */
export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get('data')
  if (!data || typeof data !== 'string') {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
  }

  try {
    const qrUrl = `${QR_API}?size=200x200&data=${encodeURIComponent(data)}`
    const res = await fetch(qrUrl, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 502 })
    }
    const blob = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${FILENAME}"`,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('[qr-download] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch QR image' }, { status: 500 })
  }
}
