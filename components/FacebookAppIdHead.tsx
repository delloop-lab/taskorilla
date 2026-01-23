/**
 * Server component to inject fb:app_id meta tag in App Router
 * This ensures the tag is in the static HTML for Facebook's crawler
 * Must be a server component (no 'use client' directive)
 */
export default function FacebookAppIdHead() {
  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

  if (!fbAppId) return null

  return (
    <>
      <meta property="fb:app_id" content={fbAppId} />
    </>
  )
}
