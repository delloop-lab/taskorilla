'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { blogs, getAllCategories, getAllLocations } from '@/lib/blog-data'
import { getOgImageUrl } from '@/lib/blog-image-utils'
import { format } from 'date-fns'

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const categories = getAllCategories()
  const locations = getAllLocations()

  // Filter posts based on selected category and location
  const filteredPosts = useMemo(() => {
    return blogs.filter(post => {
      const matchesCategory = !selectedCategory || post.category === selectedCategory
      const matchesLocation = !selectedLocation || post.location === selectedLocation
      return matchesCategory && matchesLocation
    })
  }, [selectedCategory, selectedLocation])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Taskorilla Blog
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover tips, guides, and insights about local services in the Algarve.
            Find trusted professionals and learn how to get things done.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Category Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Location Filter */}
          {locations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Location</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedLocation(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedLocation === null
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  All Locations
                </button>
                {locations.map(location => (
                  <button
                    key={location}
                    onClick={() => setSelectedLocation(location)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedLocation === location
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredPosts.length === 1
              ? '1 blog post found'
              : `${filteredPosts.length} blog posts found`}
          </p>
        </div>

        {/* Blog Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map(post => {
              const imageUrl = getOgImageUrl(post)
              // Convert absolute URLs to relative paths for Next.js Image component
              // This works for both localhost and production
              const imageSrc = imageUrl.startsWith('http') 
                ? imageUrl.replace('https://taskorilla.com', '').replace('http://localhost:3000', '')
                : imageUrl
              
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
                >
                  {/* Blog Post Image */}
                  <div className="relative w-full h-48 bg-gray-200 overflow-hidden flex items-center justify-center">
                    <Image
                      src={imageSrc || '/images/blog/og/default.png'}
                      alt={post.title}
                      width={1200}
                      height={630}
                      className="w-full h-full object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={imageUrl.startsWith('http') && !imageUrl.includes('taskorilla.com') && !imageUrl.includes('localhost')}
                      onError={(e) => {
                        // Fallback to default image if the image fails to load
                        const target = e.target as HTMLImageElement
                        const defaultImage = '/images/blog/og/default.png'
                        if (!target.src.includes('default.png')) {
                          target.src = defaultImage
                        }
                      }}
                    />
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    {/* Category Badge */}
                    <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full mb-3 self-start">
                      {post.category}
                    </span>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h2>

                    {/* Snippet */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                      {post.snippet}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                      <span>{format(new Date(post.date), 'MMM d, yyyy')}</span>
                      {post.location && (
                        <span className="flex items-center">
                          📍 {post.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No blog posts found matching your filters.</p>
            <button
              onClick={() => {
                setSelectedCategory(null)
                setSelectedLocation(null)
              }}
              className="mt-4 text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
