'use client'

export default function DebugEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  const hasUrl = !!supabaseUrl
  const hasKey = !!supabaseKey
  const urlLength = supabaseUrl?.length || 0
  const keyLength = supabaseKey?.length || 0

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Environment Variables Debug</h1>
        
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Supabase Configuration</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">NEXT_PUBLIC_SUPABASE_URL</label>
                <div className={`mt-1 p-3 rounded ${hasUrl ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {hasUrl ? (
                    <>
                      <span className="text-green-700 font-mono text-sm">{supabaseUrl}</span>
                      <span className="text-green-600 text-xs ml-2">({urlLength} characters)</span>
                    </>
                  ) : (
                    <span className="text-red-700 font-semibold">❌ MISSING</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
                <div className={`mt-1 p-3 rounded ${hasKey ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {hasKey ? (
                    <>
                      <span className="text-green-700 font-mono text-sm">
                        {supabaseKey?.substring(0, 30)}...
                      </span>
                      <span className="text-green-600 text-xs ml-2">({keyLength} characters)</span>
                    </>
                  ) : (
                    <span className="text-red-700 font-semibold">❌ MISSING</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">NEXT_PUBLIC_SITE_URL</label>
                <div className={`mt-1 p-3 rounded ${siteUrl ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  {siteUrl ? (
                    <span className="text-green-700 font-mono text-sm">{siteUrl}</span>
                  ) : (
                    <span className="text-yellow-700">⚠️ Optional (not set)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            {hasUrl && hasKey ? (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-green-800 font-semibold">✅ All required environment variables are set!</p>
                <p className="text-green-700 text-sm mt-2">
                  If you're still seeing errors, make sure you restarted your dev server after adding these variables.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800 font-semibold">❌ Missing required environment variables</p>
                <div className="text-red-700 text-sm mt-2 space-y-1">
                  {!hasUrl && <p>• NEXT_PUBLIC_SUPABASE_URL is missing</p>}
                  {!hasKey && <p>• NEXT_PUBLIC_SUPABASE_ANON_KEY is missing</p>}
                </div>
                <div className="mt-4 p-3 bg-white rounded border border-red-200">
                  <p className="text-sm font-semibold mb-2">To fix:</p>
                  <ol className="text-sm list-decimal list-inside space-y-1">
                    <li>Create/update <code className="bg-gray-100 px-1 rounded">.env.local</code> in your project root</li>
                    <li>Add the missing variables</li>
                    <li>Restart your dev server (Ctrl+C then npm run dev)</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Quick Fix</h2>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <p className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
{`# Add to .env.local file in project root:

NEXT_PUBLIC_SUPABASE_URL=https://pcvfemhakrqzeiegzusn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Then restart server:
# npm run dev`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

