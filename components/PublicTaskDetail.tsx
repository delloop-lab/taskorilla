'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PublicTaskSummary } from '@/lib/public-task-seo'

type Props = {
  task: PublicTaskSummary
  isCanonical: boolean
  budgetLabel: string
  locationLabel: string
  loginUrl: string
  registerUrl: string
  seoDebug?: {
    taskId: string
    taskTitle: string
    seoTitle: string
    seoDescription: string
    canonicalUrl: string
    slug: string
    jsonLd: any
  } | null
}

export default function PublicTaskDetail({
  task,
  isCanonical,
  budgetLabel,
  locationLabel,
  loginUrl,
  registerUrl,
  seoDebug,
}: Props) {
  const [showLoginModal, setShowLoginModal] = useState(false)

  const shortDescription = (task.description || '').trim()
  const truncatedDescription =
    shortDescription.length > 600 ? `${shortDescription.slice(0, 580).trimEnd()}...` : shortDescription

  const handleInteractionClick = () => {
    setShowLoginModal(true)
  }

  return (
    <>
      {/* Login Required Modal for interactions */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Login Required</h2>
              <p className="text-gray-600 mb-6">
                You need to log in or create a free Taskorilla account to bid on this task, send messages, or manage it.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href={loginUrl}
                  className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-md text-center hover:bg-primary-700 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  href={registerUrl}
                  className="flex-1 bg-white text-primary-600 px-4 py-3 rounded-md text-center border border-primary-200 hover:border-primary-400 hover:bg-primary-50 font-medium transition-colors"
                >
                  Sign Up Free
                </Link>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/tasks"
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Back to tasks
          </Link>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Left column: images (same structure as private view, using safe public URLs) */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                {task.images && task.images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="w-full sm:w-64 sm:h-64 md:w-80 md:h-80 h-48 sm:h-auto bg-gray-100 rounded-lg overflow-hidden mx-auto sm:mx-0">
                      <img
                        src={task.images[0].image_url}
                        alt={task.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    {task.images.length > 1 && (
                      <div className="grid grid-cols-3 gap-2">
                        {task.images.slice(1, 4).map((img, index) => (
                          <div key={img.id} className="w-full h-16 sm:h-20 bg-gray-100 rounded overflow-hidden">
                            <img
                              src={img.image_url}
                              alt={`${task.title} ${index + 2}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        ))}
                        {task.images.length > 4 && (
                          <div className="w-full h-16 sm:h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">
                            +{task.images.length - 4} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full sm:w-64 sm:h-64 md:w-80 md:h-80 h-48 sm:h-auto bg-gray-100 rounded-lg overflow-hidden mx-auto sm:mx-0">
                    <img
                      src={
                        task.image_url ||
                        (task.required_professions && task.required_professions.length > 0
                          ? '/default_task_image_pro.png'
                          : '/default_task_image.png')
                      }
                      alt={task.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
              </div>

              {/* Right column: main task info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">
                      {task.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {locationLabel}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 text-xs sm:text-sm font-medium rounded flex-shrink-0 self-start bg-green-100 text-green-800"
                  >
                    {task.status === 'open'
                      ? 'Open'
                      : task.status === 'in_progress'
                      ? 'In progress'
                      : task.status === 'completed'
                      ? 'Completed'
                      : task.status}
                  </span>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Description</h2>
                  {truncatedDescription ? (
                    <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">
                      {truncatedDescription}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No public description was provided for this task.
                    </p>
                  )}
                </div>

                {/* Primary public CTAs – mimic private layout but gated */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleInteractionClick}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    Message Tasker
                  </button>
                  <button
                    onClick={handleInteractionClick}
                    className="border border-primary-200 bg-white text-primary-700 px-4 py-2 rounded-md text-sm font-medium hover:border-primary-400 hover:bg-primary-50"
                  >
                    Submit a Bid
                  </button>
                </div>

                {/* Budget summary (location already shown under title) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Budget</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary-600">{budgetLabel}</p>
                  </div>
                </div>

                {/* Required skills chips, same style as private page */}
                {task.required_skills && task.required_skills.length > 0 && (
                  <div className="mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Required Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {task.required_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-gray-600 text-center">
              To see full details, bids, and messages or to manage this task, please log in or create a free
              Taskorilla account.
            </p>

            {!isCanonical && (
              <p className="mt-4 text-xs text-gray-400">
                You are viewing a non-canonical URL for this task.
              </p>
            )}
          </div>

          {/* Development-only SEO debug panel */}
          {seoDebug && (
            <details className="mt-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-700">
              <summary className="cursor-pointer font-semibold text-gray-800 mb-2">
                SEO Debug (development only)
              </summary>
              <div className="mt-2 space-y-2">
                <p><strong>Task ID:</strong> {seoDebug.taskId}</p>
                <p><strong>Slug:</strong> {seoDebug.slug}</p>
                <p><strong>Canonical URL:</strong> {seoDebug.canonicalUrl}</p>
                <p><strong>AI SEO Title:</strong> {seoDebug.seoTitle}</p>
                <p><strong>AI SEO Description:</strong> {seoDebug.seoDescription}</p>
                <div className="mt-3">
                  <p className="font-semibold mb-1">JSON-LD:</p>
                  <pre className="whitespace-pre-wrap break-words bg-white border border-gray-200 rounded-md p-3 max-h-80 overflow-auto">
{JSON.stringify(seoDebug.jsonLd, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </>
  )
}

