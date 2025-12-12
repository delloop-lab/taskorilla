'use client'

import Rating from './Rating'
import { UserRatingsSummary } from '@/lib/useUserRatings'

interface UserRatingsDisplayProps {
  ratings: UserRatingsSummary | null
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

/**
 * Component to display both Tasker and Helper ratings separately
 */
export default function UserRatingsDisplay({
  ratings,
  size = 'md',
  showLabels = true,
  className = ''
}: UserRatingsDisplayProps) {
  if (!ratings) {
    return (
      <div className={className}>
        {showLabels && <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Ratings</h3>}
        <div className="text-xs sm:text-sm text-gray-500">No ratings available</div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 sm:space-y-3 ${className}`}>
      {showLabels && (
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Ratings</h3>
      )}
      
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Helper Ratings - Show first */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-gray-700 min-w-[50px] sm:min-w-[60px]">Helper:</span>
          <Rating
            rating={ratings.helper_avg_rating}
            reviewCount={ratings.helper_review_count}
            size={size}
            showCount={true}
          />
        </div>

        {/* Tasker Ratings */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-gray-700 min-w-[50px] sm:min-w-[60px]">Tasker:</span>
          <Rating
            rating={ratings.tasker_avg_rating}
            reviewCount={ratings.tasker_review_count}
            size={size}
            showCount={true}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version for cards and lists
 */
export function CompactUserRatingsDisplay({
  ratings,
  size = 'sm',
  className = ''
}: {
  ratings: UserRatingsSummary | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  if (!ratings) {
    return (
      <div className={`text-xs sm:text-sm text-gray-400 ${className}`}>
        No ratings
      </div>
    )
  }

  // Always show both Tasker and Helper ratings, even if they're null/0
  console.log('🎨 Rendering CompactUserRatingsDisplay:', {
    tasker: ratings.tasker_avg_rating,
    taskerCount: ratings.tasker_review_count,
    helper: ratings.helper_avg_rating,
    helperCount: ratings.helper_review_count
  })
  
  return (
    <div className={`flex flex-col gap-1.5 sm:gap-2 items-start ${className}`}>
      {/* Tasker Rating */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">Tasker:</span>
        <Rating
          rating={ratings.tasker_avg_rating}
          reviewCount={ratings.tasker_review_count}
          size={size}
          showCount={true}
        />
      </div>
      
      {/* Helper Rating */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">Helper:</span>
        <Rating
          rating={ratings.helper_avg_rating}
          reviewCount={ratings.helper_review_count}
          size={size}
          showCount={true}
        />
      </div>
    </div>
  )
}

