/**
 * Internal URL shortener — stores short codes in the `short_links` Supabase table.
 * Links are served via /go/[code] which does a server-side redirect.
 */

const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const CODE_LENGTH = 6

function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

/**
 * Shorten a URL using the internal short_links table.
 * Pass the server-side Supabase client so inserts have the right auth context.
 * Falls back to the original URL on any error.
 */
export async function shortenUrl(url: string, supabase: any): Promise<string> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, '')}`
      : null) ||
    'http://localhost:3000'
  ).replace(/\/$/, '')

  try {
    // Try up to 3 times in the unlikely event of a code collision
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateCode()

      const { error } = await supabase
        .from('short_links')
        .insert({ code, url })

      if (!error) {
        return `${baseUrl}/go/${code}`
      }

      // If it's not a uniqueness violation, bail out immediately
      if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
        console.warn('url-shortener: insert failed:', error.message)
        return url
      }
    }

    return url
  } catch (err) {
    console.warn('url-shortener: unexpected error:', err)
    return url
  }
}
