'use client'

import Rating from './Rating'
import { UserRatingsSummary } from '@/lib/useUserRatings'

interface CompactUserRatingsDisplayProps {
  ratings: UserRatingsSummary | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showTasker?: boolean
  showHelper?: boolean
  /** When true and ratings is null, show nothing instead of "No ratings" (avoids flashing before ratings load) */
  loading?: boolean
}

/**
 * Compact version of user ratings display for cards and lists
 * Shows both Tasker and Helper ratings in a compact format
 */
export default function CompactUserRatingsDisplay({
  ratings,
  size = 'sm',
  className = '',
  showTasker = true,
  showHelper = true,
  loading = false,
}: CompactUserRatingsDisplayProps) {
  if (!ratings) {
    if (loading) return null
    return (
      <div className={`text-xs sm:text-sm text-gray-400 ${className}`}>
        No ratings
      </div>
    )
  }

  const hasTaskerRating = ratings.tasker_avg_rating !== null && ratings.tasker_review_count > 0
  const hasHelperRating = ratings.helper_avg_rating !== null && ratings.helper_review_count > 0

  const showTaskerBlock = showTasker && hasTaskerRating
  const showHelperBlock = showHelper && hasHelperRating

  return (
    <div className={`flex flex-col gap-1.5 sm:gap-2 items-start ${className}`}>
      {/* Tasker Rating */}
      {showTaskerBlock && (
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">Tasker:</span>
          <Rating
            rating={ratings.tasker_avg_rating}
            reviewCount={ratings.tasker_review_count}
            size={size}
            showCount={true}
          />
        </div>
      )}
      
      {/* Helper Rating */}
      {showHelperBlock && (
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">Helper:</span>
          <Rating
            rating={ratings.helper_avg_rating}
            reviewCount={ratings.helper_review_count}
            size={size}
            showCount={true}
          />
        </div>
      )}

      {/* Show message if no ratings at all */}
      {(!showTaskerBlock && !showHelperBlock) && (
        <div className="text-xs sm:text-sm text-gray-400">
          No ratings
        </div>
      )}
    </div>
  )
}













