const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline.html',
  },
  buildExcludes: [
    /app-build-manifest\.json$/,
    /_buildManifest\.js$/,
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
  ],
  publicExcludes: ['!noprecache/**/*'],
  // Exclude build manifest files from precache
  exclude: [
    ({ asset, compilation }) => {
      if (asset.name.includes('_buildManifest') || asset.name.includes('build-manifest')) {
        return true;
      }
      return false;
    },
  ],
  runtimeCaching: [
    // Static assets - highest priority, cache first
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Next.js RSC payloads - must be cached for offline navigation
    {
      urlPattern: ({ url }) => {
        // Match RSC payload requests (?_rsc=...)
        return url.search.includes('_rsc=') || url.search.includes('__rsc_data=');
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'rsc-cache',
        networkTimeoutSeconds: 2,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        matchOptions: {
          ignoreSearch: false, // Include query params in cache key
        },
      },
    },
    // Pages and navigation requests - must come before catch-all
    {
      urlPattern: ({ request, url }) => {
        // Match navigation requests
        if (request.mode === 'navigate' || request.destination === 'document') {
          return true;
        }
        // Match Next.js pages (not API routes, not _next static files, not RSC payloads)
        if (url.pathname.startsWith('/') && 
            !url.pathname.startsWith('/_next') && 
            !url.pathname.startsWith('/api') &&
            !url.search.includes('_rsc=') &&
            !url.search.includes('__rsc_data=') &&
            !url.pathname.match(/\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json)$/)) {
          return true;
        }
        return false;
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Only cache successful responses
              return response && response.status === 200 ? response : null;
            },
          },
        ],
      },
    },
    // Internal API routes - GET requests only
    {
      urlPattern: ({ request, url }) => {
        // Only match GET requests to internal API routes
        if (request.method !== 'GET') {
          return false;
        }
        // Match internal API routes only
        return url.pathname.startsWith('/api/');
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        matchOptions: {
          ignoreSearch: false, // Include query params in cache key
        },
      },
    },
    // Catch-all for other requests
    {
      urlPattern: ({ request, url }) => {
        // Only match GET requests
        if (request.method !== 'GET') {
          return false;
        }
        // Don't match static assets
        if (url.pathname.match(/\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json)$/)) {
          return false;
        }
        // Don't match _next static files
        if (url.pathname.startsWith('/_next/static')) {
          return false;
        }
        // Don't match pages (already handled above)
        if (request.mode === 'navigate' || request.destination === 'document') {
          return false;
        }
        // Don't match RSC payloads (already handled above)
        if (url.search.includes('_rsc=') || url.search.includes('__rsc_data=')) {
          return false;
        }
        // Match everything else
        return true;
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)






